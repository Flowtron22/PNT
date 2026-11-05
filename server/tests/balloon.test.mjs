import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const {MatchSimulation}=await import('../simulation.mjs');
const players=()=>['thief','pumpkin','raptor','racer'].map((costume,id)=>({name:'P'+(id+1),costume,loadout:['hammer','banana'],preference:'none',bot:false}));

test('blocked Balloon hammer applies no stun and leaves the defender playable',async()=>{
 const sim=await MatchSimulation.create('grassfield',players(),'balloon');try{
  sim.round.startRemaining=0;sim.actors[0].group.position.set(0,0,0);sim.actors[0].group.rotation.y=0;sim.actors[1].group.position.set(0,0,2.2);
  sim.round.actors[1].guards=[[0,1.25],[0,2.9],[0,3.7],[0,4.5]];
  sim.resolveHammer(sim.round.actors[0]);
  assert.equal(sim.round.actors[1].balloonIntact,true);assert.equal(sim.round.actors[1].effectTime,0);assert.equal(sim.round.actors[1].effect,null);assert.equal(sim.round.actors[0].stuns,0);
 }finally{sim.dispose();}
});

test('authoritative Balloon Bash uses the circle spawns, fixed kit and replicated guards',async()=>{
 const sim=await MatchSimulation.create('grassfield',players(),'balloon');try{assert.equal(sim.round.mode,'balloon');assert.ok(sim.actors.every(actor=>actor.tools.join(',')==='hammer,banana'));assert.ok(sim.round.actors.every(actor=>actor.guards.length===4));for(let i=0;i<30;i++)sim.step();assert.ok(sim.snapshot().round.actors.every(actor=>actor.guards.length===4));}finally{sim.dispose();}
});

test('authoritative hammer pops an exposed balloon and records the event',async()=>{
 const sim=await MatchSimulation.create('grassfield',players(),'balloon');try{sim.round.startRemaining=0;sim.actors[0].group.position.set(0,0,0);sim.actors[0].group.rotation.y=0;sim.actors[1].group.position.set(0,0,2.2);sim.round.actors[1].guards=[[1.6,2.4],[2.2,2.8],[2.8,3.2],[3.4,3.6]];assert.equal(sim.tool(0,0),true);for(let i=0;i<12;i++)sim.step();assert.equal(sim.round.actors[1].eliminated,true);assert.equal(sim.round.actors[0].pops,1);assert.ok(sim.events.some(event=>event.type==='balloon-pop'&&event.target===1));}finally{sim.dispose();}
});
