import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createCouchLobby,joinCouch,prepareCouchMatch,syncCouchConnections,couchCommand} from '../../src/pnt/couch-state.js';
// Exercise the real application handlers without WebGL or physical devices.
// These transitions were missed by state-only and rendered-markup tests.
const source=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8');
const controllerHandler=source.slice(source.indexOf('function updateCouchControllers('),source.indexOf('async function hostLobby('));
const keyboardHandler=source.slice(source.indexOf('function handleCouchLobbyKey('),source.indexOf("addEventListener('keydown',handleCouchLobbyKey,true);"));
function frame(index,buttons=[]){return {index,connected:true,pressed:new Set(buttons),held:new Set(),x:0,z:0,direction:null};}
function fixture(pads=[frame(0),frame(1)]){
 const room=createCouchLobby('thief',['hammer','rocket']);joinCouch(room,0);joinCouch(room,1);room.players[0].ready=room.players[1].ready=true;prepareCouchMatch(room);room.phase='playing';
 const calls=[],context=vm.createContext({room,paused:false,busy:false,document:{hidden:false},ui:{lobby:{hidden:true,contains:()=>true},hud:{hidden:true},results:{hidden:false}},round:{phase:'finished',actors:Array.from({length:4},()=>({effectTime:0}))},couchControllers:{poll:()=>pads,rumble(){}},couchInputs:new Map(),syncCouchConnections,joinCouch,gameAudio:{prepare:async()=>{}},refreshLobby(){},pauseGame(){},resume(){},controllerMenu:(_,command)=>calls.push(command),phoneLandscape:{blocked:false},settings:{haptics:false},useTool:(...args)=>calls.push(args)});
 context.couchLobbyCommand=(id,command)=>{calls.push([id,command]);couchCommand(context.room,id,command);};
 vm.runInContext(controllerHandler+keyboardHandler,context);
 return {context,calls,poll:()=>vm.runInContext('updateCouchControllers(1,.016)',context),key:(code,button)=>{const event={code,repeat:false,target:{matches:()=>false,closest:()=>button?{}:null},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};context.handleCouchLobbyKey(event);return event;}};
}
test('focused lobby buttons retain native Enter and Space without changing P1 readiness',()=>{
 for(const key of ['Enter','Space']){const f=fixture();f.context.room.phase='waiting';f.context.room.players[0].controller=null;f.context.room.players[0].cursor=3;f.context.ui.lobby.hidden=false;const event=f.key(key,true);assert.equal(event.prevented,undefined);assert.equal(event.stopped,undefined);assert.equal(f.context.room.players[0].ready,true);assert.equal(f.calls.length,0);}
});
test('unfocused lobby shortcuts still operate P1 and reserve the keyboard host',()=>{
 const f=fixture();f.context.room.phase='waiting';f.context.room.players[0].controller=null;f.context.room.players[0].cursor=3;f.context.ui.lobby.hidden=false;assert.equal(f.key('Enter',false).prevented,true);assert.equal(f.context.room.players[0].ready,false);assert.equal(f.context.room.keyboardHost,true);assert.equal(f.key('Space',false).prevented,true);assert.equal(f.context.room.players[0].ready,true);
});
test('a new-index controller reclaims disconnected P1 on results and can then navigate',()=>{
 const frames=[frame(7,[0]),frame(1)],f=fixture(frames);f.poll();assert.equal(f.context.room.players[0].controller,7);assert.equal(f.context.room.players[0].connected,true);assert.deepEqual(f.calls,[],'joining must consume the initial press');frames[0]=frame(7);f.poll();frames[0]=frame(7,[0]);f.poll();assert.deepEqual(f.calls,['accept']);
});
test('selecting Main Menu on results ends dispatch before another connected pad reads room',()=>{
 const f=fixture([frame(0,[0]),frame(1)]);f.context.controllerMenu=()=>{f.context.room=null;};assert.doesNotThrow(f.poll);assert.equal(f.context.room,null);
});
test('returning to couch lobby discards remaining input captured on the results screen',()=>{
 const f=fixture([frame(0,[0]),frame(1,[2])]);f.context.controllerMenu=()=>{f.context.round=null;f.context.ui.results.hidden=true;f.context.ui.lobby.hidden=false;f.context.room.phase='waiting';f.context.room.players[1].ready=false;};f.poll();assert.equal(f.context.room.players[1].ready,false);assert.deepEqual(f.calls,[]);
});
test('resuming via the pause button discards other pads stale tool presses',()=>{
 const f=fixture([frame(0,[0]),frame(1,[2])]);f.context.paused=true;f.context.round.phase='playing';f.context.ui.results.hidden=true;f.context.controllerMenu=()=>{f.context.paused=false;};f.poll();assert.deepEqual(f.calls,[]);assert.equal(f.context.couchInputs.size,0);
});
