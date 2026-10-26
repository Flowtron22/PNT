export const MAPS=[
 {id:'mall',name:'MALL',available:true,description:'Mall promenade · 60-second chase'},
 {id:'sunken',name:'SUNKEN',available:false,description:'Map preview · web stage not available yet'},
 {id:'iceberg',name:'ICEBERG',available:false,description:'Map preview · web stage not available yet'},
];
export const BOTS=[{name:'Bot Anas',costume:'pumpkin'},{name:'Bot Min',costume:'raptor'},{name:'Bot Amim',costume:'racer'}];
export const PREFERENCES=['none','chaser','runner'];
export function createLobby(costume='thief'){
 return {phase:'waiting',mode:'practice',map:0,preference:'none',countdown:0,players:[{name:'YOU',costume,bot:false}]};
}
export function addBot(room){if(room.phase!=='waiting'||room.players.length>=4)return false;room.players.push({...BOTS[room.players.length-1],bot:true});return true;}
export function removeBot(room){if(room.phase!=='waiting'||room.players.length<=1)return false;room.players.pop();return true;}
export function canStartLobby(room){return room.phase==='waiting'&&room.players.length===4&&MAPS[room.map]?.available;}
export function beginCountdown(room){if(!canStartLobby(room))return false;room.phase='countdown';room.countdown=3;return true;}
export function cancelCountdown(room){if(room.phase==='countdown'){room.phase='waiting';room.countdown=0;return true;}return false;}
export function stepLobby(room,dt){if(room.phase!=='countdown')return false;const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;room.countdown=Math.max(0,room.countdown-elapsed);if(room.countdown<.00001){room.countdown=0;room.phase='loading';return true;}return false;}
export function cycleMap(room,direction){if(room.phase!=='waiting')return false;room.map=(room.map+direction+MAPS.length)%MAPS.length;return true;}
export function resolveRole(preference,random=Math.random){return preference==='none'?(random()<.25?'chaser':'runner'):preference;}
export function validateRoomCode(value){return /^[A-Z0-9]{6}$/.test(value.trim().toUpperCase());}
export function startHint(room){return !MAPS[room.map].available?'This stage is a preview. Select Mall to play.':room.players.length<4?'Add bots to fill the four-player crew.':'The crew is ready. Start a practice chase!';}
