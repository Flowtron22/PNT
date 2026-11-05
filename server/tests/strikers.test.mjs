import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {MatchSimulation}=await import('../simulation.mjs');
const {FIELD}=await import('../../src/pnt/strikers-rules.js');
const players=()=>Array.from({length:4},(_,id)=>({name:'Bot '+id,costume:'thief',loadout:['rocket','smoke'],preference:'none',bot:true}));
test('player movement stops at the edge of the ice rink',async()=>{
 const sim=await MatchSimulation.create('slipperystriker',players().map(player=>({...player,bot:false})),'strikers');
 try{
  const position=sim.actors[0].group.position;
  position.set(FIELD.maxX-.6,0,0);
  for(let i=1;i<=60;i++){sim.input(0,{seq:i,x:1,z:0});sim.step();}
  assert.ok(position.x>FIELD.maxX-.6);
  assert.ok(position.x<=FIELD.maxX-.28);
 }finally{sim.dispose();}
});
test('authoritative Slippery Shoots uses two teams, fixed tools and a physical ball',async()=>{const sim=await MatchSimulation.create('slipperystriker',players(),'strikers');try{assert.equal(sim.round.mode,'strikers');assert.deepEqual(sim.round.actors.map(a=>a.team),[0,0,1,1]);assert.ok(sim.actors.every(a=>a.tools.join(',')==='hammer,banana'));const before=sim.round.ball.position.slice();for(let i=0;i<360;i++)sim.step();assert.notDeepEqual(sim.round.ball.position,before);}finally{sim.dispose();}});
test('authoritative Interact shoots and goals finish with a team result',async()=>{const sim=await MatchSimulation.create('slipperystriker',players(),'strikers');try{sim.round.startRemaining=0;const actor=sim.actors[0];actor.group.position.set(0,0,-1);actor.group.rotation.y=0;sim.input(0,{seq:1,x:0,z:0,interact:true});sim.players[0].bot=false;sim.step();assert.equal(sim.round.actors[0].effect,'kick');for(let i=0;i<20;i++)sim.step();assert.equal(sim.round.ball.lastTouch,0);assert.ok(sim.round.ball.velocity[2]>0);sim.round.remaining=.001;sim.step();assert.equal(sim.round.phase,'finished');assert.equal(sim.round.reason,'draw');}finally{sim.dispose();}});
