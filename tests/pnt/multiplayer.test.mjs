import test from 'node:test';import assert from 'node:assert/strict';
import {localSnapshot,MultiplayerConnection,deadline} from '../../src/pnt/multiplayer.js';
import {createRound} from '../../src/pnt/rules.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('each client sees its own seat first without changing server IDs or teammates',()=>{
 const round=createRound('chaser',[{id:'cash',amount:2000}]);round.actors[3].rescuer=2;Object.assign(round.actors[2],{captures:2,rescues:2,stuns:3});round.caches[0].harvester=2;const players=Array.from({length:4},(_,i)=>({sessionId:`p${i}`})),snapshot={round,poses:players.map((_,id)=>({id,position:[id,0,0]})),hazards:[{id:7,owner:2}],events:[{id:8,actor:0}]},guest=localSnapshot(snapshot,players,'p2');
 assert.equal(guest.round.playerRole,'runner');assert.deepEqual([guest.round.actors[0].captures,guest.round.actors[0].rescues,guest.round.actors[0].stuns],[2,2,3]);assert.deepEqual(guest.poses.map(p=>p.position[0]),[2,0,1,3]);assert.equal(guest.round.actors[1].role,'chaser');assert.equal(guest.round.actors[3].rescuer,0);assert.equal(guest.round.caches[0].harvester,0);assert.equal(guest.hazards[0].owner,0);assert.equal(guest.events[0].actor,1);assert.equal(round.actors[3].rescuer,2);assert.equal(round.caches[0].harvester,2);assert.throws(()=>localSnapshot(snapshot,players,'missing'));
});
test('multiplayer connection waits have a clear deadline',async()=>{
 await assert.rejects(deadline(new Promise(()=>{}),5,'too slow'),/too slow/);
});
test('online play requires the Steam desktop bridge',async()=>{
 const connection=new MultiplayerConnection({});
 await assert.rejects(connection.connect('host',{gameMode:'classic'}),/Steam desktop build/);
});
test('guest lobby keeps the host seat order while gameplay addresses the local player first',async()=>{
 const players=[{sessionId:'host',costume:'thief'},{sessionId:'guest',costume:'oyen',appearance:{coat:'stripes',skin:'dark'}}];
 let emit,lobby;
 globalThis.pntDesktop={steam:{
  onRoomEvent:listener=>{emit=listener;return ()=>{};},connect:async()=>'guest',
  send:(key,type)=>{if(type==='hello')emit({key,type:'lobby',data:{players,host:'host'}});},
  leave(){}
 }};
 try{
  const connection=new MultiplayerConnection({onLobby:data=>{lobby=data;}});
  await connection.connect('join',{gameMode:'classic'},'ABC2345');
  assert.deepEqual(lobby.seats,players);
  assert.equal(lobby.selfId,'guest');
  assert.equal(lobby.players[0],players[1]);
  connection.leave();
 }finally{delete globalThis.pntDesktop;}
});
test('an abandoned map load cannot report failure to the next host',async()=>{
 const source=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8');
 let rejectArena,startArena;
 const arena=new Promise((_,reject)=>{rejectArena=reject;});
 const started=new Promise(resolve=>{startArena=resolve;});
 const sent=[],errors=[];
 const context=vm.createContext({
  online:{send:type=>sent.push(type)},onlineLoading:false,onlineRevision:0,
  returnToLobby:false,resultPortrait:null,clearStageVerdict(){},beginLoading(){},clearLobbyDisplays(){},
  ensureRoster:async()=>{},loadArena:()=>{startArena();return arena;},loadError:error=>errors.push(error)
 });
 vm.runInContext(source.slice(source.indexOf('async function beginOnlineMatch('),source.indexOf('function receiveOnlineSnapshot(')),context);
 const loading=context.beginOnlineMatch({map:'grassfield'});
 await started;
 context.onlineRevision++;
 rejectArena(new Error('Canceled arena load'));
 await loading;
 assert.deepEqual(sent,[]);
 assert.deepEqual(errors,[]);
});
