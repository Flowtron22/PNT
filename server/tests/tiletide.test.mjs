import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {MatchSimulation}=await import('../simulation.mjs');
const players=()=>Array.from({length:4},(_,i)=>({name:'P'+i,bot:true,loadout:['rocket','smoke']}));

test('authoritative Tile Tumble simulation uses its rules and fixed kit',async()=>{
 const sim=await MatchSimulation.create('grassfield',players(),'tiletide');try{assert.equal(sim.round.mode,'tiletide');assert.ok(sim.actors.every(a=>a.tools.join(',')==='hammer,banana'));assert.ok(sim.round.actors.every(a=>a.role==='runner'));}finally{sim.dispose();}
});

test('four Tile Tumble bots reach a last-player result',async()=>{
 const sim=await MatchSimulation.create('grassfield',players(),'tiletide');try{for(let i=0;i<60*180&&sim.round.phase==='playing';i++)sim.step();assert.equal(sim.round.phase,'finished');assert.ok(Number.isInteger(sim.round.winnerId));assert.equal(sim.round.actors.filter(a=>!a.eliminated).length,1);}finally{sim.dispose();}
});
