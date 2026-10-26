import test from 'node:test';
import assert from 'node:assert/strict';
import {createLobby,addBot,removeBot,canStartLobby,beginCountdown,cancelCountdown,stepLobby,cycleMap,resolveRole,validateRoomCode,MAPS} from '../../src/psx/lobby-state.js';
const fullRoom=()=>{const room=createLobby('oyen');for(let i=0;i<3;i++)addBot(room);return room;};
test('hosting creates one local player, and bot controls preserve the host and capacity',()=>{
 const room=createLobby('police');assert.equal(room.mode,'practice');assert.equal(room.players.length,1);assert.equal(room.players[0].costume,'police');assert.equal(removeBot(room),false);assert.equal(beginCountdown(room),false);
 for(let i=0;i<3;i++)assert.equal(addBot(room),true);assert.equal(addBot(room),false);assert.equal(room.players.length,4);assert.equal(room.players.filter(p=>p.bot).length,3);assert.equal(removeBot(room),true);assert.equal(room.players[0].bot,false);assert.equal(canStartLobby(room),false);
});
test('unavailable map previews cannot launch a Mall match under the wrong name',()=>{
 const room=fullRoom();assert.equal(canStartLobby(room),true);cycleMap(room,1);assert.equal(MAPS[room.map].id,'sunken');assert.equal(canStartLobby(room),false);assert.equal(beginCountdown(room),false);cycleMap(room,1);assert.equal(beginCountdown(room),false);cycleMap(room,1);assert.equal(MAPS[room.map].id,'mall');assert.equal(canStartLobby(room),true);
});
test('full lobby counts down once, prevents roster/map changes, and transitions to loading',()=>{
 const room=fullRoom();assert.equal(beginCountdown(room),true);assert.equal(addBot(room),false);assert.equal(removeBot(room),false);assert.equal(cycleMap(room,1),false);assert.equal(beginCountdown(room),false);for(let i=0;i<40;i++)stepLobby(room,.1);assert.equal(room.phase,'loading');assert.equal(room.countdown,0);assert.equal(stepLobby(room,.1),false);
});
test('countdown uses wall time under throttled rendering without advancing on invalid elapsed time',()=>{const room=fullRoom();beginCountdown(room);stepLobby(room,NaN);stepLobby(room,-1);assert.equal(room.countdown,3);stepLobby(room,1.2);assert.equal(room.countdown,1.8);stepLobby(room,1);assert.equal(room.countdown,.8);assert.equal(stepLobby(room,.8),true);assert.equal(room.phase,'loading');});
test('canceling a countdown leaves the same crew and preferences in a reusable lobby',()=>{
 const room=fullRoom();room.preference='chaser';beginCountdown(room);stepLobby(room,.1);assert.equal(cancelCountdown(room),true);assert.equal(room.phase,'waiting');assert.equal(room.players[0].costume,'oyen');assert.equal(room.players.length,4);assert.equal(room.preference,'chaser');assert.equal(beginCountdown(room),true);
});
test('role preference is independent of costumes, and no preference may choose either role',()=>{
 assert.equal(resolveRole('runner'),'runner');assert.equal(resolveRole('chaser'),'chaser');assert.equal(resolveRole('none',()=>.1),'chaser');assert.equal(resolveRole('none',()=>.8),'runner');
});
test('room code validation accepts six alphanumeric characters and rejects malformed input',()=>{
 assert.equal(validateRoomCode('abc123'),true);assert.equal(validateRoomCode(' 7PX6GG '),true);for(const value of ['','abc','ABC1234','ABC!23','AB C12'])assert.equal(validateRoomCode(value),false);
});
