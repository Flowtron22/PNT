import {SPLASH_VERSION} from '../src/pnt/splash-rules.js';
import {DIRETIDE_VERSION} from '../src/pnt/diretide-rules.js';
import {TILETIDE_VERSION} from '../src/pnt/tiletide-rules.js';
import {STRIKERS_VERSION} from '../src/pnt/strikers-rules.js';
import {BALLOON_VERSION} from '../src/pnt/balloon-rules.js';
import {modeLoadout,normalizeCostume} from '../src/pnt/loadout.js';
import {startCountdown} from '../src/pnt/rules.js';
import {COLOR_COSTUMES,normalizeCostumeAppearance} from '../src/pnt/costume-appearance.js';
import {normalizeOyenAppearance} from '../src/pnt/oyen-appearance.js';
import {MatchSimulation} from './simulation.mjs';
const MAPS=['mall','sunken','iceberg'],BOT_COSTUMES=['pumpkin','raptor','racer'];
const name=value=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f]/g,'').slice(0,20)||'Player':'Player';
const preference=value=>['none','chaser','runner'].includes(value)?value:'none';
function outfit(options){
 const costume=normalizeCostume(options.costume);
 const appearance=costume==='oyen'?normalizeOyenAppearance(options.appearance):COLOR_COSTUMES.includes(costume)?normalizeCostumeAppearance(options.appearance,costume):null;
 return {costume,appearance};
}
export class MatchRoom {
 async onCreate(options){
  this.gameMode=['diretide','tiletide','strikers','balloon','splash'].includes(options.gameMode)?options.gameMode:'classic';this.players=[];this.phase='waiting';this.map=0;this.host=null;this.sim=null;this.loadRevision=0;this.public=options.public===true;this.countdown=0;this.accumulator=0;this.publishTime=0;
  await this.setMetadata({public:this.public,gameMode:this.gameMode,map:this.gameMode==='strikers'?'slipperystriker':this.gameMode!=='classic'?'grassfield':MAPS[this.map]});
  this.onMessage('hello',client=>{this.sendLobby(client);if(this.sim&&this.phase!=='loading')client.send('snapshot',this.sim.snapshot());});
  this.onMessage('input',(client,payload)=>{const id=this.players.findIndex(p=>p.sessionId===client.sessionId);if(this.phase==='playing'&&payload&&typeof payload==='object')this.sim.input(id,payload);});
  this.onMessage('tool',(client,payload)=>{const id=this.players.findIndex(p=>p.sessionId===client.sessionId);if(this.phase==='playing'&&Number.isInteger(payload?.slot)&&this.sim.tool(id,payload.slot))this.broadcast('tool-event',{profileId:this.sim.round.profileId,event:this.sim.events.at(-1)});});
  this.onMessage('profile',(client,payload)=>{if(this.phase!=='waiting'||!payload||typeof payload!=='object')return;const player=this.players.find(p=>p.sessionId===client.sessionId);if(!player)return;Object.assign(player,outfit(payload),{name:name(payload.name),loadout:modeLoadout(this.gameMode,payload.loadout),preference:preference(payload.preference)});this.sendLobby();});
  this.onMessage('control',(client,payload)=>{if(client.sessionId!==this.host||!payload)return;this.control(payload.action,payload.direction);});
  this.onMessage('ready',client=>{if(this.phase!=='loading')return;const player=this.players.find(p=>p.sessionId===client.sessionId);if(player)player.ready=true;this.tryPlay();});
  this.onMessage('load-error',()=>{if(this.phase==='loading')this.abortLoading('A player could not load the map. Try starting again.');});
  this.setSimulationInterval(delta=>this.update(delta/1000),1000/60);
 }
 onAuth(client,options){if((['diretide','tiletide','strikers','balloon','splash'].includes(options.gameMode)?options.gameMode:'classic')!==this.gameMode)throw new Error('This room is for a different game mode. Open the matching mode before joining.');if(this.gameMode==='diretide'&&options.eventVersion!==DIRETIDE_VERSION)throw new Error('Please refresh the game to load the updated candy rules.');if(this.gameMode==='tiletide'&&options.tileVersion!==TILETIDE_VERSION)throw new Error('Please refresh the game to load Tile Tumble.');if(this.gameMode==='strikers'&&options.strikersVersion!==STRIKERS_VERSION)throw new Error('Please refresh the game to load Slippery Shoots.');if(this.gameMode==='splash'&&options.splashVersion!==SPLASH_VERSION)throw new Error('Please update to Splash Area.');if(this.gameMode==='balloon'&&options.balloonVersion!==BALLOON_VERSION)throw new Error('Please refresh the game to load Balloon Bash.');if(options.protocol!==1)throw new Error('Please refresh the game before joining.');return true;}
 onJoin(client,options){
  if(this.phase!=='waiting')throw new Error('This match has already started.');const bot=this.players.findIndex(p=>p.bot);if(this.players.length>=4&&bot<0)throw new Error('This room is full.');
  const player={sessionId:client.sessionId,name:name(options.name),...outfit(options),loadout:modeLoadout(this.gameMode,options.loadout),preference:preference(options.preference),bot:false,connected:true,ready:false};if(bot>=0)this.players[bot]=player;else this.players.push(player);if(!this.host)this.host=client.sessionId;this.sendLobby();
 }
 onLeave(client){
  this.clearInput(client);const index=this.players.findIndex(p=>p.sessionId===client.sessionId);if(index<0)return;
  if(['playing','finished'].includes(this.phase)){this.players[index].bot=true;this.players[index].connected=false;this.players[index].name+=' (bot)';this.players[index].sessionId=null;}
  else{this.players.splice(index,1);if(this.phase==='countdown')this.control('cancel');if(this.phase==='loading')this.abortLoading('A player left before the match was ready.');}
  if(this.host===client.sessionId)this.host=this.players.find(p=>!p.bot)?.sessionId||null;this.sendLobby();
 }
 clearInput(client){const id=this.players.findIndex(p=>p.sessionId===client.sessionId);if(this.sim?.actors[id])this.sim.actors[id].input={...this.sim.actors[id].input,x:0,z:0,interact:false};if(this.sim?.actors[id])this.sim.actors[id].inputQueue.length=0;}
 info(){return {code:this.roomId,mode:'online',gameMode:this.gameMode,eventVersion:this.gameMode==='diretide'?DIRETIDE_VERSION:undefined,tileVersion:this.gameMode==='tiletide'?TILETIDE_VERSION:undefined,strikersVersion:this.gameMode==='strikers'?STRIKERS_VERSION:undefined,splashVersion:this.gameMode==='splash'?SPLASH_VERSION:undefined,balloonVersion:this.gameMode==='balloon'?BALLOON_VERSION:undefined,public:this.public,phase:this.phase,map:this.map,host:this.host,countdown:this.countdown,players:this.players,match:this.phase==='loading'?this.sim?.snapshot():undefined};}
 sendLobby(client){const info=this.info();if(client)client.send('lobby',info);else this.broadcast('lobby',info);}
 control(action,direction){
  if(action==='cancel'&&this.phase==='countdown'){this.phase='waiting';this.countdown=0;this.sendLobby();return;}
  if(action==='rematch'&&this.phase==='finished'){this.sim?.dispose();this.sim=null;this.phase='waiting';for(const p of this.players)p.ready=false;this.unlock();this.sendLobby();return;}
  if(this.phase!=='waiting')return;
  if(action==='map'&&this.gameMode==='classic'){this.map=(this.map+(direction===-1?-1:1)+3)%3;this.setMetadata({public:this.public,map:MAPS[this.map]});}
  if(action==='add-bot'&&this.players.length<4){const index=this.players.filter(p=>p.bot).length;this.players.push({sessionId:null,name:['Bot Anas','Bot Min','Bot Amim'][index%3],costume:BOT_COSTUMES[index%3],loadout:modeLoadout(this.gameMode,index%2?['banana','smoke']:['hammer','rocket']),preference:'none',bot:true,connected:true,ready:true});}
  if(action==='remove-bot'){const index=this.players.findLastIndex(p=>p.bot);if(index>=0)this.players.splice(index,1);}
  if(action==='start'&&this.players.length===4&&this.players.every(p=>p.bot||p.connected)){this.phase='countdown';this.countdown=3;}
  this.sendLobby();
 }
 async loadMatch(){
  if(this.phase!=='countdown')return;
  const revision=++this.loadRevision;this.phase='loading';this.loadDeadline=Date.now()+60000;
  const current=()=>this.loadRevision===revision&&this.phase==='loading';
  try{
   await this.lock();if(!current())return;
   this.sim?.dispose();this.sim=null;for(const p of this.players)p.ready=p.bot;this.sendLobby();
   const prepared=await MatchSimulation.create(this.gameMode==='strikers'?'slipperystriker':this.gameMode!=='classic'?'grassfield':MAPS[this.map],this.players,this.gameMode);
   // An aborted attempt may complete after a newer load has already started.
   if(!current()){prepared.dispose();return;}
   this.sim=prepared;this.sendLobby();this.tryPlay();
  }catch(error){if(!current())return;console.error('Match preparation failed:',error);this.abortLoading('The server could not prepare this map. Please try again.');}
 }
 tryPlay(){if(this.phase==='loading'&&this.sim&&this.players.every(p=>p.ready)){startCountdown(this.sim.round);this.phase='playing';this.accumulator=0;this.sendLobby();this.broadcast('snapshot',this.sim.snapshot());}}
 abortLoading(message){this.loadRevision++;this.phase='waiting';this.loadDeadline=0;this.sim?.dispose();this.sim=null;this.unlock();this.broadcast('notice',{message});this.sendLobby();}
 update(dt){
  if(this.phase==='countdown'){this.countdown=Math.max(0,this.countdown-dt);if(this.countdown<=0){void this.loadMatch();return;}this.publishTime+=dt;if(this.publishTime>.2){this.publishTime=0;this.sendLobby();}return;}
  if(this.phase==='loading'){if(this.loadDeadline&&Date.now()>this.loadDeadline)this.abortLoading('Loading timed out. Please start again.');return;}
  if(this.phase!=='playing'||!this.sim)return;
  this.accumulator+=Math.min(.25,dt);while(this.accumulator>=1/60&&this.sim.round.phase==='playing'){this.sim.step(1/60);this.accumulator-=1/60;}
  this.publishTime+=dt;if(this.publishTime>=1/30-1e-8||this.sim.round.phase==='finished'){this.publishTime=Math.max(0,this.publishTime-1/30);this.broadcast('snapshot',this.sim.snapshot());}
  if(this.sim.round.phase==='finished'){this.phase='finished';this.sendLobby();}
 }
 onDispose(){this.loadRevision++;this.sim?.dispose();this.sim=null;}
}
