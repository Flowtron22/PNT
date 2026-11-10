import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {MatchSimulation}=await import('../simulation.mjs');
const {localSnapshot}=await import('../../src/pnt/multiplayer.js');
const players=()=>['thief','pumpkin','raptor','racer'].map((costume,id)=>({sessionId:'p'+id,name:'P'+id,costume,loadout:['hammer','banana'],bot:true}));
test('Splash Area authoritative bots paint, refill and finish; host restore preserves the complete continuation',async()=>{
 const roster=players(),sim=await MatchSimulation.create('grassfield',roster,'splash');sim.round.startRemaining=0;
 try{assert.ok(sim.actors.every(a=>a.tools.length===0));for(let i=0;i<900;i++)sim.step();assert.ok(sim.round.actors.every(a=>a.shots>30));const snapshot=JSON.parse(JSON.stringify(sim.snapshot())),restored=await MatchSimulation.restore(snapshot,roster);
 try{assert.deepEqual(restored.round.paintCover,sim.round.paintCover);for(let i=0;i<300;i++){sim.step();restored.step();}assert.equal(restored.round.paint,sim.round.paint);assert.deepEqual(restored.round.paintShots,sim.round.paintShots);assert.deepEqual(restored.round.paintCounts,sim.round.paintCounts);const guest=localSnapshot(sim.snapshot(),roster,'p2');assert.equal(guest.round.actors[0].paintSeat,2);assert.equal(guest.round.paint,sim.round.paint);sim.round.remaining=.01;sim.step();assert.equal(sim.round.phase,'finished');}finally{restored.dispose();}}
 finally{sim.dispose();}
});
test('Steam slot actions route to ink abilities and cannot spawn classic tools',async()=>{const sim=await MatchSimulation.create('grassfield',players(),'splash');try{sim.round.startRemaining=0;assert.ok(sim.tool(0,0));assert.equal(sim.round.actors[0].diving,true);assert.ok(sim.tool(0,1));assert.equal(sim.round.paintShots[0].can,true);assert.equal(sim.round.actors[0].effect,null);assert.equal(sim.hazards.length,0);assert.equal(sim.tool(0,2),false);}finally{sim.dispose();}});
