import test from 'node:test';import assert from 'node:assert/strict';
import {localSnapshot,multiplayerEndpoint,MultiplayerConnection,deadline,wakeMultiplayerServer} from '../../src/pnt/multiplayer.js';
import {createRound} from '../../src/pnt/rules.js';
test('each client sees its own seat first without changing server IDs or teammates',()=>{
 const round=createRound('chaser',[{id:'cash',amount:2000}]);round.actors[3].rescuer=2;round.caches[0].harvester=2;const players=Array.from({length:4},(_,i)=>({sessionId:`p${i}`})),snapshot={round,poses:players.map((_,id)=>({id,position:[id,0,0]})),hazards:[{id:7,owner:2}],events:[{id:8,actor:0}]},guest=localSnapshot(snapshot,players,'p2');
 assert.equal(guest.round.playerRole,'runner');assert.deepEqual(guest.poses.map(p=>p.position[0]),[2,0,1,3]);assert.equal(guest.round.actors[1].role,'chaser');assert.equal(guest.round.actors[3].rescuer,0);assert.equal(guest.round.caches[0].harvester,0);assert.equal(guest.hazards[0].owner,0);assert.equal(guest.events[0].actor,1);assert.equal(round.actors[3].rescuer,2);assert.equal(round.caches[0].harvester,2);assert.throws(()=>localSnapshot(snapshot,players,'missing'));
});
test('local testing discovers same-computer and Wi-Fi servers, production needs explicit configuration',()=>{
 assert.equal(multiplayerEndpoint({hostname:'localhost',protocol:'http:'}),'http://localhost:2567');assert.equal(multiplayerEndpoint({hostname:'192.168.1.10',protocol:'http:'}),'http://192.168.1.10:2567');assert.equal(multiplayerEndpoint({hostname:'police-n-thief.vercel.app',protocol:'https:'}),'');
});
test('expired reconnect leaves the stale room once and temporary reconnect errors stay quiet',()=>{
 const events=[],notices=[];let leaves=0;
 const connection=new MultiplayerConnection({onConnection:state=>events.push(state),onNotice:message=>notices.push(message)});
 connection.room={reconnection:{isReconnecting:true},leave:()=>{leaves++;}};
 connection.connectionError(1006,'Network unavailable');assert.deepEqual(notices,[]);assert.equal(leaves,0);
 connection.connectionError(524,'seat reservation expired.');connection.connectionError(524,'seat reservation expired.');
 assert.equal(leaves,1);assert.equal(connection.room,null);assert.equal(connection.closed,true);assert.deepEqual(events,['expired']);assert.deepEqual(notices,[]);
 const active=new MultiplayerConnection({onConnection:()=>{},onNotice:message=>notices.push(message)});active.room={reconnection:{isReconnecting:false}};active.connectionError(400,'Invalid action');assert.deepEqual(notices,['Invalid action']);
});
test('server wake-up probes health and connection waits have a clear deadline',async()=>{let request;await wakeMultiplayerServer('https://game.example/',{fetcher:async(url,options)=>{request={url,options};},timeout:20});assert.equal(request.url,'https://game.example/health');assert.equal(request.options.mode,'no-cors');await assert.rejects(deadline(new Promise(()=>{}),5,'too slow'),/too slow/);});
