import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {TOOLS} from '../../src/pnt/catalog.js';
import {modeLoadout} from '../../src/pnt/loadout.js';
const source=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8');
function harness(){
 const nodes=new Map(),connections=[];
 const $=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,value:'',innerHTML:'',dataset:{},classList:{toggle(){}},insertAdjacentHTML(){},focus(){}});return nodes.get(id);};
 const context=vm.createContext({TOOLS,modeLoadout,$,pntDesktop:{steam:{}},ready:true,busy:false,room:null,round:null,online:null,onlineRevision:0,resultPortrait:null,avatars:[],preview:null,returnToLobby:false,selectedMode:'classic',activePage:'home',loadout:['rocket','smoke'],selectedTool:'rocket',costume:'thief',costumeAppearances:{},profile:{name:'Tester'},ui:{lobby:{hidden:true},menu:{dataset:{},classList:{toggle(){}}}},uiEffects:{sounds:{play(){}}},document:{querySelectorAll:()=>[],body:{classList:{toggle(){}}}},actionMarkup:()=>'',hostCouchLobby(){},hostLobby(){},labels(){},previewModel(){},show(){},clearStageVerdict(){},restoreMenuArena(){},clearLobbyDisplays(){},clearInput(){},clearHazards(){},beginLoading(){context.busy=true;},endLoading(){context.busy=false;},onlineNotice(){},receiveOnlineLobby(){},receiveOnlineSnapshot(){},receiveOnlineTool(){},progress(){},MultiplayerConnection:class {constructor(callbacks){this.callbacks=callbacks;connections.push(this);}async connect(mode,profile,code){this.request={mode,profile,code};}leave(){}}});
 for(const [start,end] of [['function menu(){','function previewModel('],['function goBack(){','function clearLobbyDisplays('],['function choice(','function actionLabel('],['function onlineProfile(){','async function ensureRoster('],['async function connectOnline(','function refreshOnlineLobby(']])vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),context);
 return {context,$,connections};
}
test('backing out of Pattytide restores the full classic Tools catalog and saved kit',()=>{
 const {context:c,$}=harness();c.openPage('events');$('#diretide-event').onclick();assert.equal(c.selectedMode,'diretide');c.goBack();assert.equal(c.activePage,'events');assert.equal(c.selectedMode,'diretide');c.goBack();assert.equal(c.activePage,'home');assert.equal(c.selectedMode,'classic');c.openPage('tools');for(const tool of TOOLS)assert.ok($('#page-content').innerHTML.includes('data-choice="'+tool.id+'"'));assert.doesNotMatch($('#page-content').innerHTML,/id="equip-slot2"[^>]*disabled/);assert.deepEqual(c.loadout,['rocket','smoke']);
});
for(const gameMode of ['classic','diretide'])for(const status of ['expired','disconnected'])test(`${gameMode} ${status} recovery preserves room mode and submits its saved room code`,async()=>{
 const {context:c,$,connections}=harness();c.selectedMode=gameMode;await c.connectOnline('host');c.room={code:'ABC2345',gameMode};connections[0].callbacks.onConnection(status);assert.equal(c.activePage,'join');assert.equal(c.selectedMode,gameMode);assert.equal($('#join-code').value,'ABC2345');$('#join-code-form').onsubmit({preventDefault(){}});assert.equal(connections[1].request.mode,'join');assert.equal(connections[1].request.code,'ABC2345');assert.equal(connections[1].request.profile.gameMode,gameMode);assert.deepEqual(c.loadout,['rocket','smoke']);
});
