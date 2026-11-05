import {DIRETIDE_VERSION} from './diretide-rules.js';
import {TILETIDE_VERSION} from './tiletide-rules.js';
import {STRIKERS_VERSION} from './strikers-rules.js';
export function deadline(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]).finally(()=>clearTimeout(timer));}
let steamLeave=Promise.resolve();
async function connectSteamRoom(steam,mode,profile,code){
 await steamLeave;
 const key=crypto.randomUUID(),handlers=new Map();
 let open=true,sessionId;
 const leave=()=>{
  if(!open)return steamLeave;
  open=false;unsubscribe();
  steamLeave=Promise.resolve().then(()=>steam.leave(key)).catch(error=>console.warn('Steam lobby cleanup failed:',error));
  return steamLeave;
 };
 const unsubscribe=steam.onRoomEvent(message=>{
  if(open&&message.key===key)handlers.get(message.type)?.(message.data);
 });
 try{
  sessionId=await deadline(steam.connect(key,mode,profile,code),30000,'Steam did not respond. Check that Steam is online and try again.');
 }catch(error){await leave();throw error;}
 return {
  sessionId,leave,invite:()=>steam.invite(key),connection:{get isOpen(){return open;}},
  send:(type,data)=>steam.send(key,type,data),
  onMessage:(type,handler)=>handlers.set(type,handler),
  onLeave:handler=>handlers.set('disconnect',()=>{leave();handler();})
 };
}
export function localSnapshot(snapshot,players,sessionId){
 const self=players.findIndex(p=>p.sessionId===sessionId);if(self<0)throw Error('Your seat is no longer in this match.');const ids=[self,...players.map((_,i)=>i).filter(i=>i!==self)],remap=id=>id===null||id===undefined?null:ids.indexOf(id);
 const freeForAll=['diretide','tiletide'].includes(snapshot.round.mode),eventFields=freeForAll?{winnerId:remap(snapshot.round.winnerId)}:{};if(snapshot.round.mode==='strikers')eventFields.ball={...snapshot.round.ball,carrier:remap(snapshot.round.ball.carrier),lastTouch:remap(snapshot.round.ball.lastTouch)};if(snapshot.round.mode==='diretide')eventFields.wells=snapshot.round.wells.map(w=>({...w,seat:w.owner,owner:remap(w.owner)}));
 return {...snapshot,round:{...snapshot.round,playerRole:snapshot.round.actors[self].role,...eventFields,caches:snapshot.round.caches.map(c=>({...c,harvester:remap(c.harvester)})),actors:ids.map((id,i)=>({...snapshot.round.actors[id],id:i,seat:id,rescuer:remap(snapshot.round.actors[id].rescuer)}))},poses:ids.map((id,i)=>({...snapshot.poses[id],id:i})),hazards:snapshot.hazards.map(h=>({...h,owner:remap(h.owner)})),events:snapshot.events.map(e=>({...e,actor:remap(e.actor)}))};
}
export class MultiplayerConnection {
 constructor({onLobby,onSnapshot,onNotice,onConnection,onTool=()=>{},onProgress=()=>{}}){Object.assign(this,{onLobby,onSnapshot,onNotice,onConnection,onTool,onProgress});this.room=null;this.closed=false;this.players=[];this.sequence=0;this.lastSend=0;}
 async connect(mode,profile,code){
  const options={...profile,protocol:1,eventVersion:DIRETIDE_VERSION,tileVersion:TILETIDE_VERSION,strikersVersion:STRIKERS_VERSION,public:mode==='public',gameMode:['diretide','tiletide','strikers'].includes(profile.gameMode)?profile.gameMode:'classic'};
  const steam=globalThis.pntDesktop?.steam;
  if(!steam)throw Error('Online play requires the Steam desktop build.');
  this.onProgress(8,'Connecting to Steam…');
  const room=this.room=await connectSteamRoom(steam,mode,options,code);this.onProgress(76,'Joining the crew…');
  const first=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('The server did not send the lobby.')),12000);this.firstLobby=()=>{clearTimeout(timer);resolve();};this.failLobby=error=>{clearTimeout(timer);reject(error);};});
  room.onMessage('lobby',data=>{if(this.closed)return;this.players=data.players;const self=data.players.find(p=>p.sessionId===room.sessionId),ordered=self?[self,...data.players.filter(p=>p!==self)]:data.players;if(data.gameMode==='diretide'&&data.eventVersion!==DIRETIDE_VERSION){this.leave();this.failLobby?.(Error('The server needs the Pattytide update before this mode can be played online.'));this.firstLobby=null;return;}if(data.gameMode==='tiletide'&&data.tileVersion!==TILETIDE_VERSION){this.leave();this.failLobby?.(Error('The server needs the Tile Tumble update before this mode can be played online.'));this.firstLobby=null;return;}if(data.gameMode==='strikers'&&data.strikersVersion!==STRIKERS_VERSION){this.leave();this.failLobby?.(Error('The server needs the Slippery Shoots update before this mode can be played online.'));this.firstLobby=null;return;}this.onLobby({...data,seats:data.players,selfId:room.sessionId,players:ordered,preference:self?.preference||'none',canHost:data.host===room.sessionId,match:data.match?localSnapshot(data.match,this.players,room.sessionId):undefined});this.firstLobby?.();this.firstLobby=null;});
  room.onMessage('snapshot',snapshot=>{if(!this.closed&&this.players.length===4)this.onSnapshot(localSnapshot(snapshot,this.players,room.sessionId));});
  room.onMessage('tool-event',({profileId,event})=>{
   const self=this.players.findIndex(player=>player.sessionId===room.sessionId);
   if(this.closed||self<0||!event)return;
   const seats=[self,...this.players.map((_,i)=>i).filter(i=>i!==self)];
   this.onTool({...event,actor:seats.indexOf(event.actor)},profileId);
  });
  room.onMessage('notice',notice=>this.onNotice(notice.message));
  room.onMessage('migrating',()=>{if(!this.closed)this.onConnection('reconnecting');});
  room.onMessage('migrated',()=>{if(!this.closed){this.lastSend=0;this.onConnection('connected');}});
  room.onMessage('reject',message=>this.failLobby?.(Error(message)));
  room.onLeave(()=>{if(this.closed)return;if(this.firstLobby){this.failLobby(Error('The lobby closed before you could join.'));return;}this.closed=true;this.onConnection('disconnected');});room.send('hello');await first;
 }
 connectionError(code,message){
  if(this.closed)return;
  if(code===524||/seat reservation expired|reconnection token.*expired|failed to reconnect/i.test(message||'')){this.leave();this.onConnection('expired');return;}
  if(!this.room?.reconnection.isReconnecting)this.onNotice(message||'Multiplayer connection error.');
 }
 send(type,data){if(this.room&&!this.closed&&this.room.connection.isOpen)this.room.send(type,data);}
 input(x,z,interact,now=performance.now(),force=false){if(!force&&now-this.lastSend<50)return;this.lastSend=now;this.send('input',{seq:++this.sequence,x,z,interact});}
 flushPrediction(prediction,now=performance.now()){if(now-this.lastSend<1000/30-1||!this.room?.connection.isOpen)return;const frames=prediction.outgoing();if(!frames.length)return;this.lastSend=now;this.send('input',{frames});}
 control(action,direction){this.send('control',{action,direction});}
 invite(){this.room?.invite?.();}
 leave(){this.closed=true;this.room?.leave();this.room=null;}
}
