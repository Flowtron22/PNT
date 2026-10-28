import {MULTIPLAYER_URL} from './network-config.js';
export function multiplayerEndpoint(location=globalThis.location){if(MULTIPLAYER_URL)return MULTIPLAYER_URL;if(['localhost','127.0.0.1'].includes(location.hostname)||/^(192\.168\.|10\.)/.test(location.hostname))return `${location.protocol}//${location.hostname}:2567`;return '';}
export function deadline(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]).finally(()=>clearTimeout(timer));}
export async function wakeMultiplayerServer(endpoint,{fetcher=globalThis.fetch,timeout=35000}={}){if(!fetcher)return;await deadline(fetcher(`${endpoint.replace(/\/$/,'')}/health`,{cache:'no-store',mode:'no-cors'}),timeout,'The game server is taking too long to wake up. Please try again.');}
export function localSnapshot(snapshot,players,sessionId){
 const self=players.findIndex(p=>p.sessionId===sessionId);if(self<0)throw Error('Your seat is no longer in this match.');const ids=[self,...players.map((_,i)=>i).filter(i=>i!==self)],remap=id=>id===null||id===undefined?null:ids.indexOf(id);
 return {...snapshot,round:{...snapshot.round,playerRole:snapshot.round.actors[self].role,caches:snapshot.round.caches.map(c=>({...c,harvester:remap(c.harvester)})),actors:ids.map((id,i)=>({...snapshot.round.actors[id],id:i,rescuer:remap(snapshot.round.actors[id].rescuer)}))},poses:ids.map((id,i)=>({...snapshot.poses[id],id:i})),hazards:snapshot.hazards.map(h=>({...h,owner:remap(h.owner)})),events:snapshot.events.map(e=>({...e,actor:remap(e.actor)}))};
}
export class MultiplayerConnection {
 constructor({onLobby,onSnapshot,onNotice,onConnection,onProgress=()=>{}}){Object.assign(this,{onLobby,onSnapshot,onNotice,onConnection,onProgress});this.room=null;this.closed=false;this.players=[];this.sequence=0;this.lastSend=0;}
 async connect(mode,profile,code){const endpoint=multiplayerEndpoint();if(!endpoint)throw Error('The online game server has not been deployed yet. Training is available from the main menu.');const {Client}=await import('../../vendor/colyseus/sdk.mjs');this.client=new Client(endpoint);const options={...profile,protocol:1,public:mode==='public'};
  this.onProgress(8,'Waking the game server…');await wakeMultiplayerServer(endpoint);this.onProgress(48,'Opening a secure connection…');const pending=mode==='join'?this.client.joinById(code,options):mode==='public'?this.client.joinOrCreate('pnt',options):this.client.create('pnt',options);
  try{this.room=await deadline(pending,20000,'The game server did not accept the connection. Please try again.');}catch(error){pending.then(room=>room.leave()).catch(()=>{});throw error;}const room=this.room;room.reconnection.minUptime=0;room.reconnection.minDelay=300;room.reconnection.maxDelay=2000;room.reconnection.maxRetries=60;this.onProgress(76,'Joining the crew…');
  const first=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('The server did not send the lobby.')),12000);this.firstLobby=()=>{clearTimeout(timer);resolve();};});
  room.onMessage('lobby',data=>{if(this.closed)return;this.players=data.players;const self=data.players.find(p=>p.sessionId===room.sessionId),ordered=self?[self,...data.players.filter(p=>p!==self)]:data.players;this.onLobby({...data,players:ordered,preference:self?.preference||'none',canHost:data.host===room.sessionId,match:data.match?localSnapshot(data.match,this.players,room.sessionId):undefined});this.firstLobby?.();this.firstLobby=null;});
  room.onMessage('snapshot',snapshot=>{if(!this.closed&&this.players.length===4)this.onSnapshot(localSnapshot(snapshot,this.players,room.sessionId));});
  room.onMessage('notice',notice=>this.onNotice(notice.message));room.onError((code,message)=>this.connectionError(code,message));
  room.onDrop(()=>{if(!this.closed)this.onConnection('reconnecting');});room.onReconnect(()=>{if(this.closed)return;this.lastSend=0;this.onConnection('connected');room.send('hello');});room.onLeave(()=>{if(!this.closed){this.closed=true;this.onConnection('disconnected');}});room.send('hello');await first;
 }
 connectionError(code,message){
  if(this.closed)return;
  if(code===524||/seat reservation expired|reconnection token.*expired|failed to reconnect/i.test(message||'')){this.leave();this.onConnection('expired');return;}
  if(!this.room?.reconnection.isReconnecting)this.onNotice(message||'Multiplayer connection error.');
 }
 send(type,data){if(this.room&&!this.closed&&this.room.connection.isOpen)this.room.send(type,data);}
 input(x,z,interact,now=performance.now(),force=false){if(!force&&now-this.lastSend<50)return;this.lastSend=now;this.send('input',{seq:++this.sequence,x,z,interact});}
 flushPrediction(prediction,now=performance.now()){if(now-this.lastSend<50||!this.room?.connection.isOpen)return;const frames=prediction.outgoing();if(!frames.length)return;this.lastSend=now;this.send('input',{frames});}
 control(action,direction){this.send('control',{action,direction});}
 leave(){this.closed=true;this.room?.leave();this.room=null;}
}
