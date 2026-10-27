import {MULTIPLAYER_URL} from './network-config.js';
export function multiplayerEndpoint(location=globalThis.location){if(MULTIPLAYER_URL)return MULTIPLAYER_URL;if(['localhost','127.0.0.1'].includes(location.hostname)||/^(192\.168\.|10\.)/.test(location.hostname))return `${location.protocol}//${location.hostname}:2567`;return '';}
export function localSnapshot(snapshot,players,sessionId){
 const self=players.findIndex(p=>p.sessionId===sessionId);if(self<0)throw Error('Your seat is no longer in this match.');const ids=[self,...players.map((_,i)=>i).filter(i=>i!==self)],remap=id=>id===null||id===undefined?null:ids.indexOf(id);
 return {...snapshot,round:{...snapshot.round,playerRole:snapshot.round.actors[self].role,caches:snapshot.round.caches.map(c=>({...c,harvester:remap(c.harvester)})),actors:ids.map((id,i)=>({...snapshot.round.actors[id],id:i,rescuer:remap(snapshot.round.actors[id].rescuer)}))},poses:ids.map((id,i)=>({...snapshot.poses[id],id:i})),hazards:snapshot.hazards.map(h=>({...h,owner:remap(h.owner)})),events:snapshot.events.map(e=>({...e,actor:remap(e.actor)}))};
}
export class MultiplayerConnection {
 constructor({onLobby,onSnapshot,onNotice,onConnection}){Object.assign(this,{onLobby,onSnapshot,onNotice,onConnection});this.room=null;this.closed=false;this.players=[];this.sequence=0;this.lastSend=0;}
 async connect(mode,profile,code){const endpoint=multiplayerEndpoint();if(!endpoint)throw Error('The online game server has not been deployed yet. Local practice is available.');const {Client}=await import('../../vendor/colyseus/sdk.mjs');this.client=new Client(endpoint);const options={...profile,protocol:1,public:mode==='public'};
  this.room=mode==='join'?await this.client.joinById(code,options):mode==='public'?await this.client.joinOrCreate('pnt',options):await this.client.create('pnt',options);const room=this.room;room.reconnection.minUptime=0;room.reconnection.minDelay=300;room.reconnection.maxDelay=2000;room.reconnection.maxRetries=10;
  const first=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('The server did not send the lobby.')),12000);this.firstLobby=()=>{clearTimeout(timer);resolve();};});
  room.onMessage('lobby',data=>{if(this.closed)return;this.players=data.players;const self=data.players.find(p=>p.sessionId===room.sessionId),ordered=self?[self,...data.players.filter(p=>p!==self)]:data.players;this.onLobby({...data,players:ordered,preference:self?.preference||'none',canHost:data.host===room.sessionId,match:data.match?localSnapshot(data.match,this.players,room.sessionId):undefined});this.firstLobby?.();this.firstLobby=null;});
  room.onMessage('snapshot',snapshot=>{if(!this.closed&&this.players.length===4)this.onSnapshot(localSnapshot(snapshot,this.players,room.sessionId));});
  room.onMessage('notice',notice=>this.onNotice(notice.message));room.onError((_code,message)=>this.onNotice(message||'Multiplayer connection error.'));
  room.onDrop(()=>this.onConnection('reconnecting'));room.onReconnect(()=>{this.lastSend=0;this.onConnection('connected');room.send('hello');});room.onLeave(()=>{if(!this.closed)this.onConnection('disconnected');});room.send('hello');await first;
 }
 send(type,data){if(this.room&&!this.closed&&this.room.connection.isOpen)this.room.send(type,data);}
 input(x,z,interact,now=performance.now(),force=false){if(!force&&now-this.lastSend<50)return;this.lastSend=now;this.send('input',{seq:++this.sequence,x,z,interact});}
 control(action,direction){this.send('control',{action,direction});}
 leave(){this.closed=true;this.room?.leave();this.room=null;}
}
