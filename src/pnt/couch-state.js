import {createLobby,BOTS,MAPS} from './lobby-state.js';
import {normalizeCostume,normalizeLoadout,equipTool} from './loadout.js';
import {COSTUMES,TOOLS} from './catalog.js';
export function createCouchLobby(costume,loadout,name='Player 1'){
 const room=createLobby(costume);return {...room,mode:'couch',keyboardHost:false,players:[{name,costume:normalizeCostume(costume),loadout:normalizeLoadout(loadout),bot:false,controller:null,connected:true,ready:false,cursor:0,picker:null},null,null,null]};
}
export function joinCouch(room,index){
 const assigned=room.players.findIndex(p=>p&&!p.bot&&p.controller===index);if(assigned>=0)return assigned;
 const missing=room.players.findIndex(p=>p&&!p.bot&&!p.connected);if(missing>=0){Object.assign(room.players[missing],{controller:index,connected:true,ready:false});return missing;}if(room.phase!=='waiting')return -1;
 let slot=room.players[0].controller===null&&!room.keyboardHost?0:room.players.findIndex((p,i)=>i>0&&(!p||p.bot));if(slot<0)return -1;
 const existing=room.players[slot];room.players[slot]={name:existing&&!existing.bot?existing.name:'Player '+(slot+1),costume:existing&&!existing.bot?existing.costume:['thief','oyen','police','pingu'][slot],loadout:normalizeLoadout(existing?.loadout),bot:false,controller:index,connected:true,ready:false,cursor:0,picker:null};return slot;
}
export function syncCouchConnections(room,pads){let lost=false,changed=false;for(const p of room.players){if(!p||p.bot||p.controller===null)continue;const connected=!!pads.find(pad=>pad.index===p.controller&&pad.connected);if(p.connected!==connected){changed=true;p.connected=connected;p.ready=false;if(!connected)lost=true;}}if(lost&&room.phase==='countdown'){room.phase='waiting';room.countdown=0;}return {lost,changed};}
export function canStartCouch(room){const humans=room.players.filter(p=>p&&!p.bot);return room.phase==='waiting'&&humans.length>=2&&humans.every(p=>p.connected&&p.ready&&!p.picker)&&!!MAPS[room.map]?.available;}
export function prepareCouchMatch(room){if(!canStartCouch(room))return false;room.players=room.players.map((p,i)=>p||{...BOTS[Math.max(0,i-1)],bot:true,loadout:['hammer','banana'],ready:true});return true;}
export function couchCommand(room,slot,command){
 const p=room.players[slot];if(!p||p.bot||!p.connected||room.phase!=='waiting')return false;
 if(command==='ready'){if(!p.picker)p.ready=!p.ready;return true;}
 if(p.picker){const options=p.picker.type==='costume'?COSTUMES:TOOLS;if(['up','down','left','right'].includes(command)){const delta={up:-3,down:3,left:-1,right:1}[command];p.picker.index=(p.picker.index+delta+options.length)%options.length;return true;}if(command==='back'){p.picker=null;return true;}if(command==='accept'){const id=options[p.picker.index].id;if(p.picker.type==='costume')p.costume=id;else p.loadout=equipTool(p.loadout,id,p.picker.type);p.picker=null;p.ready=false;return true;}return false;}
 if(command==='up'||command==='down'){p.cursor=(p.cursor+(command==='up'?-1:1)+4)%4;return true;}
 if(command==='accept'){if(p.cursor===3)p.ready=!p.ready;else {const type=p.cursor===0?'costume':p.cursor-1,options=type==='costume'?COSTUMES:TOOLS,id=type==='costume'?p.costume:p.loadout[type];p.picker={type,index:options.findIndex(o=>o.id===id)};}return true;}return false;
}
export function couchHuman(room,id){return room?.mode==='couch'&&!!room.players[id]&&!room.players[id].bot;}
// Keyboard and pointer always belong to P1. Every other player reads only the
// frame assigned to their own controller; bots never receive local input.
export function couchInputFor(room,id,frames,{keyboard={x:0,z:0},touch={x:0,z:0},interact=false}={}){
 if(!couchHuman(room,id))return {x:0,z:0,interact:false};const pad=frames.get(id)||{x:0,z:0},host=id===0;return {x:(pad.x||0)+(host?keyboard.x+touch.x:0),z:(pad.z||0)+(host?keyboard.z-touch.z:0),interact:!!pad.interact||host&&interact};
}
