import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {MatchSimulation}=await import('../simulation.mjs');
const {groundSpot}=await import('../arena.mjs');
const players=()=>Array.from({length:4},(_,i)=>({sessionId:`player${i}`,name:`Player ${i}`,costume:'thief',preference:i===0?'chaser':'runner',loadout:['hammer','rocket'],bot:false}));
test('server capture requires continuous 1.6-second detection, and escape resets it',async()=>{
 const sim=await MatchSimulation.create('iceberg',players());try{sim.time=2;sim.actors[1].group.position.copy(sim.actors[0].group.position);for(let i=0;i<60;i++)sim.step();assert.equal(sim.round.actors[1].caught,false);assert.ok(sim.round.actors[1].detectionProgress>.9);sim.actors[1].group.position.copy(sim.actors[2].group.position);sim.step();assert.equal(sim.round.actors[1].detectionProgress,0);sim.actors[1].group.position.copy(sim.actors[0].group.position);for(let i=0;i<96;i++)sim.step();assert.equal(sim.round.actors[1].caught,true);assert.ok(sim.events.some(e=>e.type==='capture'&&e.actor===1));}finally{sim.dispose();}
});
test('server validates input sequence and tool actions, and exports all Mall furniture',async()=>{
 const sim=await MatchSimulation.create('mall',players());try{assert.equal(sim.snapshot().furniture.length,15);assert.equal(sim.input(0,{seq:1,x:NaN,z:0}),false);assert.equal(sim.input(0,{seq:1,x:100,z:0}),true);assert.equal(sim.actors[0].input.x,1);assert.equal(sim.input(0,{seq:1,x:-1,z:0}),false);assert.equal(sim.tool(0,3),false);assert.equal(sim.tool(0,0),true);assert.equal(sim.tool(0,0),false);for(let i=0;i<60;i++)sim.step();assert.equal(sim.round.actors[0].effectTime,0);assert.ok(sim.round.actors[0].toolCooldowns[0]>8);assert.ok(sim.snapshot().furniture.every(f=>f.position.every(Number.isFinite)));}finally{sim.dispose();}
});
test('server stealing and rescue use actual positions, ownership and held interaction',async()=>{
 const sim=await MatchSimulation.create('sunken',players());try{const cache=sim.round.caches[0];sim.actors[1].group.position.copy(groundSpot(sim.grid,cache.position[0],cache.position[2]));sim.input(1,{seq:1,x:0,z:0,interact:true});for(let i=0;i<10;i++)sim.step();assert.ok(sim.round.collected>10);const collected=sim.round.collected;sim.input(1,{seq:2,x:0,z:0,interact:false});sim.step();assert.equal(sim.round.actors[1].interacting,false);assert.equal(sim.round.collected,collected);
  sim.round.actors[2].caught=true;sim.round.actors[2].releaseCooldown=0;sim.actors[2].group.position.copy(sim.actors[1].group.position);for(let i=0;i<100;i++){sim.input(1,{seq:3+i,x:0,z:0,interact:true});sim.step();}assert.equal(sim.round.actors[2].caught,false);assert.ok(sim.round.actors[2].immune>0);
 }finally{sim.dispose();}
});
