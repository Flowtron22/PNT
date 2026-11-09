import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const {MatchSimulation}=await import('../simulation.mjs');
const players=()=>['thief','pumpkin','raptor','racer'].map((costume,id)=>({name:'P'+(id+1),costume,loadout:['hammer','banana'],preference:'none',bot:false}));

test('authoritative Hammer consumes one balloon per impact and respects shared cover',async()=>{
 const sim=await MatchSimulation.create('grassfield',players(),'balloon');
 try{
  sim.round.startRemaining=0;
  sim.round.sphereId=1;
  sim.actors[0].group.position.set(0,0,0);sim.actors[0].group.rotation.y=0;
  sim.actors[1].group.position.set(0,0,2.2);
  sim.round.spheres=[{id:1,x:0,y:.75,z:1.2,phase:'rolling',speed:0}];
  sim.resolveHammer(sim.round.actors[0]);
  assert.equal(sim.round.actors[1].balloons,2);
  assert.equal(sim.round.actors[1].effectTime,0);
  sim.round.spheres=[];
  for(const remaining of [1,0]){
   sim.round.actors[0].toolCooldowns[0]=0;
   sim.round.actors[0].effectTime=0;
   assert.equal(sim.tool(0,0),true);
   for(let i=0;i<12;i++)sim.step();
   assert.equal(sim.round.actors[1].balloons,remaining);
   assert.equal(sim.round.actors[1].eliminated,remaining===0);
   assert.ok(sim.events.some(event=>event.type==='balloon-pop'&&event.target===1&&event.remaining===remaining));
  }
 }finally{sim.dispose();}
});

test('host restore keeps the remaining balloons, active spheres and next seeded drop',async()=>{
 const sim=await MatchSimulation.create('grassfield',players(),'balloon');
 try{
  sim.round.startRemaining=0;
  sim.round.actors[1].balloons=1;
  assert.ok(sim.actors.every(actor=>actor.tools.join(',')==='hammer,banana'));
  for(let i=0;i<400;i++)sim.step();
  const restored=await MatchSimulation.restore(JSON.parse(JSON.stringify(sim.snapshot())),players());
  try{
   assert.equal(restored.round.actors[1].balloons,1);
   assert.ok(restored.round.spheres.length>=5);
   const lastId=restored.round.sphereId;
   for(let i=0;i<60;i++){sim.step();restored.step();}
   assert.ok(restored.round.sphereId>lastId);
   assert.deepEqual(restored.round.spheres,sim.round.spheres);
   assert.deepEqual(restored.round.actors[0].sphereColliders,sim.round.actors[0].sphereColliders);
  }finally{restored.dispose();}
 }finally{sim.dispose();}
});
