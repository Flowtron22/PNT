export const MAPS=[
 {id:'mall',name:'MALL',available:true,description:'Mall · money heist · 5 minutes'},
 {id:'sunken',name:'SUNKEN',available:true,description:'Money heist · 5 minutes'},
 {id:'iceberg',name:'ICEBERG',available:true,description:'Money heist · 5 minutes'},
];
export const EVENT_MAPS=[{id:'grassfield',name:'GRASSFIELD',available:true,description:'Patty Prowl · 4-player free-for-all',image:'grassfield.png'}];
export const TILE_EVENT_MAPS=[{id:'grassfield',name:'TUMBLE GARDEN',available:true,description:'Tile Tumble · last player standing',image:'tiletide.svg'}];
export const STRIKER_EVENT_MAPS=[{id:'slipperystriker',name:'SLIPPERY SHOOTS',available:true,description:'Slippery Shoots · 2v2 ice rink',image:'slipperystriker.svg'}];
export const BALLOON_EVENT_MAPS=[{id:'grassfield',name:'SAND RING',available:true,description:'Balloon Bash · last balloon standing',image:'balloonbash.png'}];
export const lobbyMaps=room=>room?.gameMode==='diretide'?EVENT_MAPS:room?.gameMode==='tiletide'?TILE_EVENT_MAPS:room?.gameMode==='strikers'?STRIKER_EVENT_MAPS:room?.gameMode==='balloon'?BALLOON_EVENT_MAPS:MAPS;
export const BOTS=[{name:'Bot Anas',costume:'pumpkin'},{name:'Bot Min',costume:'raptor'},{name:'Bot Amim',costume:'racer'}];
export const PREFERENCES=['none','chaser','runner'];
export function createLobby(costume='thief',gameMode='classic'){
 return {phase:'waiting',mode:'practice',gameMode,map:0,preference:'none',countdown:0,players:[{name:'YOU',costume,bot:false}]};
}
export function addBot(room){if(room.phase!=='waiting'||room.players.length>=4)return false;room.players.push({...BOTS[room.players.length-1],bot:true});return true;}
export function removeBot(room){if(room.phase!=='waiting'||room.players.length<=1)return false;room.players.pop();return true;}
export function canStartLobby(room){return room.phase==='waiting'&&room.players.length===4&&!!lobbyMaps(room)[room.map]?.available;}
export function beginCountdown(room){if(!canStartLobby(room))return false;room.phase='countdown';room.countdown=3;return true;}
export function cancelCountdown(room){if(room.phase==='countdown'){room.phase='waiting';room.countdown=0;return true;}return false;}
export function stepLobby(room,dt){if(room.phase!=='countdown')return false;const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;room.countdown=Math.max(0,room.countdown-elapsed);if(room.countdown<.00001){room.countdown=0;room.phase='loading';return true;}return false;}
export function cycleMap(room,direction){if(room.phase!=='waiting')return false;const maps=lobbyMaps(room);room.map=(room.map+direction+maps.length)%maps.length;return true;}
export function resolveRole(preference,random=Math.random){return preference==='none'?(random()<.25?'chaser':'runner'):preference;}
export function validateRoomCode(value){return /^[A-Z0-9]{6}$/.test(value.trim().toUpperCase());}
export function startHint(room){return room.players.length<4?'Add bots to fill the four-player crew.':'The crew is ready. Start training!';}
