import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {MatchSimulation}=await import('../simulation.mjs');
const {groundSpot}=await import('../arena.mjs');
const {LocalPrediction}=await import('../../src/pnt/netcode.js');
const {safeLandingCell}=await import('../../src/pnt/landing.js');
const players=()=>Array.from({length:4},(_,i)=>({sessionId:`player${i}`,name:`Player ${i}`,costume:'thief',preference:i===0?'chaser':'runner',loadout:['hammer','rocket'],bot:false}));

test('batched input acknowledges simulated frames only and cannot accelerate the authoritative clock',async()=>{
 const sim=await MatchSimulation.create('sunken',players());try{
  const frames=Array.from({length:6},(_,i)=>({seq:i+1,x:1,z:0,interact:false}));assert.equal(sim.input(0,{frames}),true);
  assert.equal(sim.snapshot().poses[0].ack,0);sim.step();assert.equal(sim.snapshot().poses[0].ack,1);assert.equal(sim.actors[0].inputQueue.length,5);
  assert.equal(sim.input(0,{frames}),false);assert.equal(sim.input(0,{frames:[{seq:7,x:NaN,z:0}]}),false);assert.equal(sim.input(0,{frames:Array(13).fill({seq:7,x:1,z:0})}),false);
  for(let i=0;i<5;i++)sim.step();assert.equal(sim.snapshot().poses[0].ack,6);sim.step();assert.equal(sim.snapshot().poses[0].ack,6);assert.equal(sim.tick,7);assert.ok(Math.abs(sim.time-7/60)<1e-8);
  assert.equal(sim.input(0,{seq:8,x:1,z:0}),false);assert.equal(sim.snapshot().inputFrames,true);
 }finally{sim.dispose();}
});
test('network stalls cannot leave seconds of obsolete movement queued on the server',async()=>{
 const sim=await MatchSimulation.create('iceberg',players());try{for(let batch=0;batch<10;batch++)assert.equal(sim.input(0,{frames:Array.from({length:12},(_,i)=>({seq:batch*12+i+1,x:batch<9?1:-1,z:0}))}),true);assert.equal(sim.actors[0].inputQueue.length,8);sim.step();assert.equal(sim.snapshot().poses[0].ack,113);assert.equal(sim.actors[0].inputQueue[0].x,-1);assert.equal(sim.tick,1);}finally{sim.dispose();}
});
test('prediction and authoritative movement stay smooth with 200ms round trips and packet jitter',()=>{
 const grid={minX:-50,minZ:-50,nx:101,nz:101,step:1,heights:Array(10201).fill(0),blocked:new Uint8Array(10201)},sim=new MatchSimulation('iceberg',players(),{grid,metadata:{spawns:[[30,0,30],[0,0,0],[-30,0,30],[-30,0,-30]],caches:[{id:'cash',position:[35,0,-35],amount:8000}]}});
 const initial=sim.snapshot(),prediction=new LocalPrediction(sim.actors[1],initial.poses[1],initial.round.actors[1],0,{grid,map:'iceberg'}),inputs=[],snapshots=[];let previous=0,maxReverse=0,maxJump=0;
 try{for(let frame=0;frame<720;frame++){
  prediction.advance(1/120,{x:frame<360?1:0,z:0});
  if(frame%6===0){const frames=prediction.outgoing();if(frames.length)inputs.push({at:frame+12+[0,4,2,6][frame/6%4],frames});}
  inputs.sort((a,b)=>a.at-b.at);while(inputs.length&&inputs[0].at<=frame)sim.input(1,{frames:inputs.shift().frames});
  if(frame%2===0){sim.step();if(frame%6===0)snapshots.push({at:frame+12+[2,6,0,4][frame/6%4],snapshot:structuredClone(sim.snapshot())});}
  snapshots.sort((a,b)=>a.at-b.at);while(snapshots.length&&snapshots[0].at<=frame){const s=snapshots.shift().snapshot;prediction.reconcile(s.poses[1],s.round.actors[1],s.time);}
  const x=prediction.render().position.x;maxReverse=Math.max(maxReverse,previous-x);maxJump=Math.max(maxJump,x-previous);previous=x;
 }
 assert.ok(maxReverse<.005,`backward correction ${maxReverse}`);assert.ok(maxJump<.08,`frame jump ${maxJump}`);assert.ok(Math.abs(prediction.actor.group.position.x-sim.actors[1].group.position.x)<.05);assert.ok(prediction.pending.length<30);
 }finally{sim.dispose();}
});
test('server capture requires continuous 1.6-second detection, and escape resets it',async()=>{
 const sim=await MatchSimulation.create('iceberg',players());try{sim.time=2;sim.actors[1].group.position.copy(sim.actors[0].group.position);for(let i=0;i<60;i++)sim.step();assert.equal(sim.round.actors[1].caught,false);assert.ok(sim.round.actors[1].detectionProgress>.9);sim.actors[1].group.position.copy(sim.actors[2].group.position);sim.step();assert.equal(sim.round.actors[1].detectionProgress,0);sim.actors[1].group.position.copy(sim.actors[0].group.position);for(let i=0;i<96;i++)sim.step();assert.equal(sim.round.actors[1].caught,true);assert.ok(sim.events.some(e=>e.type==='capture'&&e.actor===1));}finally{sim.dispose();}
});
test('authoritative jetpack landing rejects blocked spots on all three authored maps',async()=>{
 for(const map of ['mall','sunken','iceberg']){const sim=await MatchSimulation.create(map,players());try{assert.ok(sim.grid.landingMask.some(Boolean));const actor=sim.actors[1],state=sim.round.actors[1],blocked=sim.grid.blocked.findIndex(Boolean);actor.group.position.set(sim.grid.minX+blocked%sim.grid.nx*sim.grid.step,2,sim.grid.minZ+Math.floor(blocked/sim.grid.nx)*sim.grid.step);actor.wasFlying=true;state.effectTime=0;state.effect=null;sim.step();assert.ok(safeLandingCell(sim.grid,actor.group.position.x,actor.group.position.z),map+' safe landing');assert.ok(actor.group.position.toArray().every(Number.isFinite));}finally{sim.dispose();}}
});
test('a complete jetpack flight descends to the main floor on Sunken and Iceberg without a fall/reset',async()=>{
 for(const map of ['sunken','iceberg']){const sim=await MatchSimulation.create(map,players());try{const a=sim.actors[0],state=sim.round.actors[0],spawn=a.group.position.clone();assert.ok(sim.grid.landingMask.reduce((sum,n)=>sum+n,0)>1000);state.effect='rocket';state.effectTime=5;let largestStep=0,lowest=Infinity;for(let i=0;i<390;i++){sim.input(0,{seq:i+1,x:0,z:1});const before=a.group.position.clone();sim.step();largestStep=Math.max(largestStep,a.group.position.distanceTo(before));lowest=Math.min(lowest,a.group.position.y);}assert.ok(safeLandingCell(sim.grid,a.group.position.x,a.group.position.z));assert.equal(a.grounded,true);assert.ok(a.group.position.y<-.9,map+' returned to floor');assert.ok(lowest>-5);assert.ok(largestStep<1.5,map+' no teleport: '+largestStep);assert.equal(a.warp||0,0);assert.ok(a.group.position.distanceTo(spawn)>.5);}finally{sim.dispose();}}
});
test('server validates input sequence and tool actions, and exports all Mall furniture',async()=>{
 const sim=await MatchSimulation.create('mall',players());try{assert.equal(sim.snapshot().furniture.length,15);assert.equal(sim.input(0,{seq:1,x:NaN,z:0}),false);assert.equal(sim.input(0,{seq:1,x:100,z:0}),true);assert.equal(sim.actors[0].input.x,1);assert.equal(sim.input(0,{seq:1,x:-1,z:0}),false);assert.equal(sim.tool(0,3),false);assert.equal(sim.tool(0,0),true);assert.equal(sim.tool(0,0),false);for(let i=0;i<60;i++)sim.step();assert.equal(sim.round.actors[0].effectTime,0);assert.ok(sim.round.actors[0].toolCooldowns[0]>8);assert.ok(sim.snapshot().furniture.every(f=>f.position.every(Number.isFinite)));}finally{sim.dispose();}
});
test('server stealing and rescue use actual positions, ownership and held interaction',async()=>{
 const sim=await MatchSimulation.create('sunken',players());try{const cache=sim.round.caches[0];sim.actors[1].group.position.copy(groundSpot(sim.grid,cache.position[0],cache.position[2]));sim.input(1,{seq:1,x:0,z:0,interact:true});for(let i=0;i<10;i++)sim.step();assert.ok(sim.round.collected>10);const collected=sim.round.collected;sim.input(1,{seq:2,x:0,z:0,interact:false});sim.step();assert.equal(sim.round.actors[1].interacting,false);assert.equal(sim.round.collected,collected);
  sim.round.actors[2].caught=true;sim.round.actors[2].releaseCooldown=0;sim.actors[2].group.position.copy(sim.actors[1].group.position);for(let i=0;i<100;i++){sim.input(1,{seq:3+i,x:0,z:0,interact:true});sim.step();}assert.equal(sim.round.actors[2].caught,false);assert.ok(sim.round.actors[2].immune>0);
 }finally{sim.dispose();}
});
