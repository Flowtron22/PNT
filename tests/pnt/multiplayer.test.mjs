import test from 'node:test';import assert from 'node:assert/strict';
import {localSnapshot,multiplayerEndpoint} from '../../src/pnt/multiplayer.js';
import {createRound} from '../../src/pnt/rules.js';
test('each client sees its own seat first without changing server IDs or teammates',()=>{
 const round=createRound('chaser',[{id:'cash',amount:2000}]);round.actors[3].rescuer=2;round.caches[0].harvester=2;const players=Array.from({length:4},(_,i)=>({sessionId:`p${i}`})),snapshot={round,poses:players.map((_,id)=>({id,position:[id,0,0]})),hazards:[{id:7,owner:2}],events:[{id:8,actor:0}]},guest=localSnapshot(snapshot,players,'p2');
 assert.equal(guest.round.playerRole,'runner');assert.deepEqual(guest.poses.map(p=>p.position[0]),[2,0,1,3]);assert.equal(guest.round.actors[1].role,'chaser');assert.equal(guest.round.actors[3].rescuer,0);assert.equal(guest.round.caches[0].harvester,0);assert.equal(guest.hazards[0].owner,0);assert.equal(guest.events[0].actor,1);assert.equal(round.actors[3].rescuer,2);assert.equal(round.caches[0].harvester,2);assert.throws(()=>localSnapshot(snapshot,players,'missing'));
});
test('local testing discovers same-computer and Wi-Fi servers, production needs explicit configuration',()=>{
 assert.equal(multiplayerEndpoint({hostname:'localhost',protocol:'http:'}),'http://localhost:2567');assert.equal(multiplayerEndpoint({hostname:'192.168.1.10',protocol:'http:'}),'http://192.168.1.10:2567');assert.equal(multiplayerEndpoint({hostname:'police-n-thief.vercel.app',protocol:'https:'}),'');
});
