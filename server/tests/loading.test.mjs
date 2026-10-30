import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {GameRoom}=await import('../game-room.mjs');
const {MatchSimulation}=await import('../simulation.mjs');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const published=[],room=Object.create(GameRoom.prototype);
 Object.assign(room,{phase:'countdown',map:0,loadRevision:0,sim:null,players:[{bot:false,ready:false}],lock:async()=>{},unlock(){},broadcast(){},sendLobby(){published.push(this.sim);}});
 return {room,published};
}
function simulation(){return {disposed:0,dispose(){this.disposed++;}};}

for(const order of ['old-first','new-first'])test(`aborted loads cannot publish or replace a new match (${order})`,async t=>{
 const old=deferred(),next=deferred(),stale=simulation(),fresh=simulation(),{room,published}=fixture();
 let calls=0;t.mock.method(MatchSimulation,'create',()=>++calls===1?old.promise:next.promise);
 const first=room.loadMatch();await flush();room.abortLoading('Player left');room.phase='countdown';room.map=1;
 const second=room.loadMatch();await flush();assert.equal(room.sim,null);
 if(order==='old-first'){old.resolve(stale);await first;assert.equal(room.sim,null);next.resolve(fresh);await second;}
 else{next.resolve(fresh);await second;old.resolve(stale);await first;}
 assert.equal(room.sim,fresh);assert.equal(stale.disposed,1);assert.equal(fresh.disposed,0);assert.ok(!published.includes(stale));assert.equal(room.phase,'loading');
});

test('a stale loading rejection cannot abort a newer loading attempt',async t=>{
 const old=deferred(),next=deferred(),{room}=fixture();let calls=0;
 t.mock.method(MatchSimulation,'create',()=>++calls===1?old.promise:next.promise);
 const first=room.loadMatch();await flush();room.abortLoading('Player left');room.phase='countdown';const second=room.loadMatch();await flush();
 old.reject(Error('Old load failed'));await first;assert.equal(room.phase,'loading');const fresh=simulation();next.resolve(fresh);await second;assert.equal(room.sim,fresh);
});

test('disposing a room retires pending preparation and disposes its late result',async t=>{
 const pending=deferred(),{room}=fixture();t.mock.method(MatchSimulation,'create',()=>pending.promise);
 const loading=room.loadMatch();await flush();room.onDispose();const stale=simulation();pending.resolve(stale);await loading;assert.equal(stale.disposed,1);assert.equal(room.sim,null);
});

test('preparation timeout retires an unfinished load before a simulation exists',async t=>{
 const pending=deferred(),{room}=fixture();t.mock.method(MatchSimulation,'create',()=>pending.promise);
 const loading=room.loadMatch();await flush();assert.ok(room.loadDeadline>0);room.loadDeadline=Date.now()-1;room.update(1/60);assert.equal(room.phase,'waiting');
 const stale=simulation();pending.resolve(stale);await loading;assert.equal(stale.disposed,1);assert.equal(room.sim,null);
});
