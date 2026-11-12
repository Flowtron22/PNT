import {createGalahRound,placeGalahPlayer,beginGalahTick,finishGalahTick,galahBotInput} from '../src/pnt/galah-rules.js';
import {sampleGround} from '../src/pnt/motion.js';
import {createSplashRound,createSplashArenaData,stepSplash,splashAction,splashFire,splashBotInput,SPLASH_SPAWNS,splashCoverage,SPLASH_COLORS} from '../src/pnt/splash-rules.js';
import {modeLoadout} from '../src/pnt/loadout.js';
import {randomUUID,randomInt} from 'node:crypto';
import * as THREE from '../vendor/three/build/three.module.js';
import {createRound,stepRound,canAct,activateTool,detectThiefAt,harvest,rescue,cancelInteraction,INTERACT_RADIUS,updateSmokeCoverage} from '../src/pnt/rules.js';
import {advanceActor,movementSpeed,MOVEMENT_VERSION} from '../src/pnt/player-motion.js';
import {applyPose} from '../src/pnt/netcode.js';
import {shipTilt} from '../src/pnt/environment.js';
import {findPath} from '../src/pnt/navigation.js';
import {hasSight} from '../src/pnt/sight.js';
import {rollSpinDirection} from '../src/pnt/action-state.js';
import {createMallPhysics} from '../src/pnt/mall-physics.js';
import {loadArenaData,groundSpot} from './arena.mjs';
import {createDiretideRound,stepDiretide,collectEventCandy,eventTarget,eventInteract,eventBotGoal,spillOnStun,EVENT_HAMMER_RADIUS,EVENT_BANANA_SECONDS,EVENT_STUN_SECONDS} from '../src/pnt/diretide-rules.js';
import {createTiletideRound,stepTiletide,tileBotGoal,tileStageContains,TILE_SPAWNS,TILE_STUN_SECONDS,TILE_BANANA_SECONDS} from '../src/pnt/tiletide-rules.js';
import {createStrikersRound,stepStrikers,strikerShoot,strikerBotGoal,strikerBotWantsShot,updateStrikerPossession,resetStrikerPlayers,strikerKickoffAngle,GOAL_RESET_SECONDS,STRIKER_HAMMER_STUN_SECONDS,STRIKER_SPAWNS} from '../src/pnt/strikers-rules.js';
import {createBalloonRound,stepBalloon,resolveBalloonHammer,balloonBotGoal,createBalloonArenaData,BALLOON_SPAWNS,BALLOON_BANANA_SECONDS} from '../src/pnt/balloon-rules.js';
export class MatchSimulation {
 static async create(map,players,gameMode){const instance=new MatchSimulation(map,players,gameMode==='splash'?createSplashArenaData():gameMode==='balloon'?createBalloonArenaData():await loadArenaData(map),gameMode);if(map==='mall'){const arena=instance.data.template.clone(true);instance.root.add(arena);instance.root.updateMatrixWorld(true);instance.physics=await createMallPhysics(arena,instance.root,instance.grid);}return instance;}
 static async restore(snapshot,players){
  const simulation=await MatchSimulation.create(snapshot.map,players,snapshot.round.mode);
  try{
   const round={...snapshot.round};
   // Patty Prowl keeps its static spawn candidates out of network snapshots.
   if(simulation.round.spawnPoints){
    Object.defineProperty(round,'spawnPoints',{value:simulation.round.spawnPoints});
   }
   Object.assign(simulation,{round,time:snapshot.time,tick:snapshot.tick,events:snapshot.events,
    eventId:snapshot.events.at(-1)?.id||0,hazardId:snapshot.hazardId});
   simulation.hazards=snapshot.hazards.map(h=>({...h,time:h.time===-1?Infinity:h.time,position:new THREE.Vector3(...h.position)}));
   for(const pose of snapshot.poses){
    const actor=simulation.actors[pose.id];
    applyPose(actor,pose);
    actor.warp=pose.warp;
    actor.processedInput=pose.ack;
    actor.input.seq=pose.received;
    const marker=simulation.hazards.find(h=>h.type==='marker'&&h.owner===pose.id&&h.time>0);
    actor.mark=marker?.position.clone()||null;
   }
   for(const item of snapshot.furniture){
    const furniture=simulation.physics?.furniture.find(f=>f.mesh.name===item.name);
    if(!furniture)continue;
    const {body,mesh,offset}=furniture;
    mesh.position.fromArray(item.position);
    mesh.quaternion.fromArray(item.rotation);
    body.setTranslation(offset.clone().applyQuaternion(mesh.quaternion).add(mesh.position),true);
    body.setRotation(mesh.quaternion,true);
    body.setLinvel(item.linearVelocity,true);
    body.setAngvel(item.angularVelocity,true);
   }
   simulation.physics?.world.propagateModifiedBodyPositionsToColliders();
   return simulation;
  }catch(error){simulation.dispose();throw error;}
 }
 constructor(map,players,data,gameMode){
  this.map=map;this.players=players;this.data=data;this.grid=data.grid;this.root=new THREE.Group();this.physics=null;this.round=createRound('runner',data.metadata.caches);if(gameMode==='galah')this.round=createGalahRound(this.round);else if(gameMode==='splash')this.round=createSplashRound(this.round);else if(gameMode==='tiletide')this.round=createTiletideRound(this.round);else if(gameMode==='strikers')this.round=createStrikersRound(this.round);else if(gameMode==='balloon')this.round=createBalloonRound(this.round);else if(gameMode==='diretide'||map==='grassfield')this.round=createDiretideRound(this.round,data.metadata);this.round.profileId=randomUUID();this.time=0;this.tick=0;this.eventId=0;this.hazardId=0;this.events=[];this.hazards=[];
  const preferred=players.map((p,i)=>p.preference==='chaser'?i:-1).filter(i=>i>=0),neutral=players.map((p,i)=>p.preference!=='runner'?i:-1).filter(i=>i>=0),pool=preferred.length?preferred:neutral.length?neutral:[0,1,2,3],cop=pool[randomInt(pool.length)];
  this.actors=players.map((player,id)=>{this.round.actors[id].role=['diretide','tiletide','strikers','balloon','splash','galah'].includes(this.round.mode)?'runner':id===cop?'chaser':'runner';const group=new THREE.Group(),spawn=this.round.mode==='splash'?SPLASH_SPAWNS[id]:this.round.mode==='tiletide'?TILE_SPAWNS[id]:this.round.mode==='strikers'?STRIKER_SPAWNS[id]:this.round.mode==='balloon'?BALLOON_SPAWNS[id]:data.metadata.spawns[id];group.position.copy(groundSpot(this.grid,spawn[0],spawn[2]));if(this.round.mode==='strikers')group.rotation.y=strikerKickoffAngle(group.position);if(['balloon','splash'].includes(this.round.mode))group.rotation.y=Math.atan2(-group.position.x,-group.position.z);return {id,group,spawn:group.position.clone(),tools:modeLoadout(this.round.mode,player.loadout),grounded:true,vx:0,vz:0,velocity:0,speed:0,input:{seq:0,x:0,z:0,interact:false},lastInput:0,inputQueue:[],framed:false,processedInput:0,mark:null};});
  if(this.round.mode==='galah')for(const actor of this.actors)placeGalahPlayer(actor,this.round.actors[actor.id],(x,z)=>sampleGround(this.grid,x,z));
 }
 input(id,message){
  const actor=this.actors[id];if(!actor||!message||typeof message!=='object')return false;
  if(Array.isArray(message.frames)){
   if(!message.frames.length||message.frames.length>12||actor.inputQueue.length+message.frames.length>120)return false;
   let last=actor.input.seq;const frames=[];
   for(const frame of message.frames){if(!frame||!Number.isSafeInteger(frame.seq)||!Number.isFinite(frame.x)||!Number.isFinite(frame.z))return false;if(frame.seq<=last)continue;last=frame.seq;frames.push({seq:last,x:Math.max(-1,Math.min(1,frame.x)),z:Math.max(-1,Math.min(1,frame.z)),interact:frame.interact===true});}
   if(!frames.length)return false;actor.framed=true;actor.input=frames.at(-1);actor.inputQueue.push(...frames);if(actor.inputQueue.length>8)actor.inputQueue.splice(0,actor.inputQueue.length-8);actor.lastInput=this.time;return true;
  }
  if(actor.framed||!Number.isSafeInteger(message.seq)||message.seq<=actor.input.seq||!Number.isFinite(message.x)||!Number.isFinite(message.z))return false;
  actor.input={seq:message.seq,x:Math.max(-1,Math.min(1,message.x)),z:Math.max(-1,Math.min(1,message.z)),interact:message.interact===true};actor.lastInput=this.time;return true;
 }

 event(type,values){this.events.push({id:++this.eventId,type,...values});if(this.events.length>64)this.events.shift();}
 sight(p,q,smoke=true,stop=.35){return hasSight(this.grid,p,q,this.hazards,smoke,stop);}
 effect(state,name,time){spillOnStun(this.round,state.id,name,this.actors[state.id].group.position.toArray());state.effect=name;state.effectTime=time;if(name==='banana'){state.spinDirection=rollSpinDirection();state.spinTurn=.35;}}
 addHazard(type,actor,time,position){const hazard={id:++this.hazardId,type,owner:actor.id,role:this.round.actors[actor.id].role,time,position:position.clone()};this.hazards.push(hazard);const max=type==='banana'?5:type==='smoke'?3:1,all=this.hazards.filter(h=>h.owner===actor.id&&h.type===type);for(const h of all.slice(0,Math.max(0,all.length-max)))h.time=0;return hazard;}
 smokeCoverage(){updateSmokeCoverage(this.round,this.actors.map(a=>a.group.position),this.hazards.filter(h=>h.type==='smoke'));}
 tool(id,slot){
  if(this.round.mode==='galah')return false;
  if(this.round.mode==='splash'){const actor=this.actors[id];const used=!!actor&&splashAction(this.round,id,slot,actor.group.position,actor.group.rotation.y);if(used)this.event('paint-action',{actor:id,slot});return used;}
  this.smokeCoverage();
  const actor=this.actors[id],state=this.round.actors[id];if(!actor||![0,1].includes(slot)||!canAct(this.round,id)||state.inSmoke)return false;const tool=actor.tools[slot],p=actor.group.position;
  if(['diretide','tiletide','strikers','balloon','splash'].includes(this.round.mode)&&!['hammer','banana'].includes(tool))return false;
  if(tool==='rewind'&&!actor.mark&&state.toolCooldowns[slot]<=0){actor.mark=p.clone();this.addHazard('marker',actor,Infinity,p);this.event('tool',{actor:id,tool:'rewind-mark',position:p.toArray()});return true;}
  if(!activateTool(this.round,id,slot,tool))return false;
  if(tool==='hammer'){this.effect(state,'hammer',.48);state.hammerWindup=.18/1.3;}
  if(tool==='banana')this.addHazard('banana',actor,15,p.clone().add(new THREE.Vector3(-Math.sin(actor.group.rotation.y)*.7,.03,-Math.cos(actor.group.rotation.y)*.7)));
  if(tool==='smoke'){this.addHazard('smoke',actor,20,p);this.smokeCoverage();}
  if(tool==='rocket'){this.effect(state,'rocket',5);actor.velocity=4.5;actor.grounded=false;}
  if(tool==='rewind'&&actor.mark){p.copy(groundSpot(this.grid,actor.mark.x,actor.mark.z));actor.warp=(actor.warp||0)+1;actor.velocity=actor.vx=actor.vz=0;actor.mark=null;for(const h of this.hazards)if(h.owner===id&&h.type==='marker')h.time=0;}
  this.event('tool',{actor:id,tool,position:p.toArray(),angle:actor.group.rotation.y});return true;
 }
 botInput(actor,dt){
  if(this.round.mode==='galah')return galahBotInput(this.round,actor.id,this.actors);
  if(this.round.mode==='splash')return splashBotInput(this.round,actor.id,actor.group.position);
  if(this.round.mode==='strikers'){
   const positions=this.actors.map(a=>a.group.position),p=actor.group.position,target=new THREE.Vector3(...strikerBotGoal(this.round,actor.id,positions)),state=this.round.actors[actor.id],rival=this.actors.find(a=>this.round.actors[a.id].team!==state.team&&a.group.position.distanceTo(p)<2.4);if(rival&&state.toolCooldowns[0]<=0)this.tool(actor.id,0);const x=target.x-p.x,z=target.z-p.z,d=Math.hypot(x,z);return {x:d>.15?x/d:0,z:d>.15?z/d:0,interact:true};
  }
  if(this.round.mode==='tiletide'){
   const p=actor.group.position,state=this.round.actors[actor.id];if(state.eliminated)return {x:0,z:0,interact:false};const target=new THREE.Vector3(...tileBotGoal(this.round,actor.id));
   const rival=this.actors.find(a=>a.id!==actor.id&&!this.round.actors[a.id].eliminated&&a.group.position.distanceTo(p)<EVENT_HAMMER_RADIUS*.8);if(rival&&this.round.tileClock<2.4)this.tool(actor.id,0);
   const x=target.x-p.x,z=target.z-p.z,d=Math.hypot(x,z);return {x:d>.12?x/d:0,z:d>.12?z/d:0,interact:false};
  }
  if(this.round.mode==='balloon'){
   const state=this.round.actors[actor.id],positions=this.actors.map(a=>a.group.position);if(state.eliminated)return {x:0,z:0,interact:false};const target=new THREE.Vector3(...balloonBotGoal(this.round,actor.id,positions)),p=actor.group.position;
   const rival=this.actors.find(a=>a.id!==actor.id&&!this.round.actors[a.id].eliminated&&a.group.position.distanceTo(p)<2.8);if(rival&&state.toolCooldowns[0]<=0)this.tool(actor.id,0);else if(rival&&state.toolCooldowns[1]<=0&&rival.group.position.distanceTo(p)<1.35)this.tool(actor.id,1);
   const x=target.x-p.x,z=target.z-p.z,d=Math.hypot(x,z);return {x:d>.12?x/d:0,z:d>.12?z/d:0,interact:false};
  }
  if(this.round.mode==='diretide'){
   const p=actor.group.position,state=this.round.actors[actor.id];if(state.eliminated)return {x:0,z:0,interact:false};
   const target=new THREE.Vector3(...eventBotGoal(this.round,actor.id,p));
   const rival=this.actors.find(a=>a.id!==actor.id&&!this.round.actors[a.id].eliminated&&a.group.position.distanceTo(p)<EVENT_HAMMER_RADIUS*.9);if(rival)this.tool(actor.id,0);
   if(p.distanceTo(target)<((state.candy>=8||state.depositWell!==null||state.candy>0&&this.round.remaining<10)&&['sleeping','returning'].includes(this.round.boss.stage)?1.5:.18))return {x:0,z:0,interact:true};
   actor.routeTime=(actor.routeTime||0)-dt;if(actor.routeTime<=0||!actor.routeGoal||actor.routeGoal.distanceToSquared(target)>1){actor.route=findPath(this.grid,p,target);actor.routeGoal=target.clone();actor.routeTime=.6;}
   while(actor.route.length&&Math.hypot(actor.route[0].x-p.x,actor.route[0].z-p.z)<.25)actor.route.shift();const next=actor.route[0]||target,x=next.x-p.x,z=next.z-p.z,d=Math.hypot(x,z);return {x:d>.06?x/d:0,z:d>.06?z/d:0,interact:true};
  }
  const state=this.round.actors[actor.id],p=actor.group.position,cop=this.actors.find(a=>this.round.actors[a.id].role==='chaser'),danger=p.distanceTo(cop.group.position);let target,interact=false;
  if(state.role==='chaser'){const runners=this.actors.filter(a=>this.round.actors[a.id].role==='runner'&&!this.round.actors[a.id].caught&&this.sight(p,a.group.position)).sort((a,b)=>p.distanceToSquared(a.group.position)-p.distanceToSquared(b.group.position));target=runners[0]?.group.position;if(target&&p.distanceTo(target)<1.8)this.tool(actor.id,0);}
  else{
   const friend=this.actors.filter(a=>this.round.actors[a.id].caught&&this.round.actors[a.id].releaseCooldown<=0&&(this.round.actors[a.id].rescuer===null||this.round.actors[a.id].rescuer===actor.id)).sort((a,b)=>p.distanceToSquared(a.group.position)-p.distanceToSquared(b.group.position))[0];
   if(danger<3.5&&this.sight(p,cop.group.position)){if(state.toolCooldowns[0]<=0)this.tool(actor.id,0);else this.tool(actor.id,1);const caches=this.round.caches.filter(c=>c.remaining>0).sort((a,b)=>new THREE.Vector3(...b.position).distanceToSquared(cop.group.position)-new THREE.Vector3(...a.position).distanceToSquared(cop.group.position));target=caches[0]?new THREE.Vector3(...caches[0].position):p.clone();if(danger<2)return {x:p.x-cop.group.position.x,z:p.z-cop.group.position.z,interact:false};}
   else if(friend){target=friend.group.position;interact=true;}
   else{const caches=this.round.caches.filter(c=>c.remaining>0).sort((a,b)=>p.distanceToSquared(new THREE.Vector3(...a.position))-p.distanceToSquared(new THREE.Vector3(...b.position)));if(caches[0]){target=new THREE.Vector3(...caches[0].position);interact=true;}}
  }
  if(!target)target=new THREE.Vector3(...this.round.caches[Math.floor(this.time/5)%this.round.caches.length].position);
  if(interact&&Math.hypot(target.x-p.x,target.z-p.z)<1.5)return {x:0,z:0,interact};
  actor.routeTime=(actor.routeTime||0)-dt;if(actor.routeTime<=0||!actor.routeGoal||actor.routeGoal.distanceToSquared(target)>1){actor.route=findPath(this.grid,p,target);actor.routeGoal=target.clone();actor.routeTime=.6;}
  while(actor.route.length&&Math.hypot(actor.route[0].x-p.x,actor.route[0].z-p.z)<.25)actor.route.shift();const next=actor.route[0]||target,x=next.x-p.x,z=next.z-p.z,length=Math.hypot(x,z);return {x:length>.06?x/length:0,z:length>.06?z/length:0,interact};
 }
 interaction(id){if(this.round.mode==='diretide'){const p=this.actors[id].group.position,t=eventTarget(this.round,id,p,q=>this.sight(p,new THREE.Vector3(...q),false,1.1));return t?{...t,id:t.target.id,d:Math.hypot(p.x-t.position[0],p.z-t.position[2])}:null;}const actor=this.actors[id],p=actor.group.position,state=this.round.actors[id];if(!canAct(this.round,id)||state.role!=='runner')return null;
  const friends=this.actors.filter(a=>this.round.actors[a.id].caught&&a.id!==id&&this.round.actors[a.id].releaseCooldown<=0&&(this.round.actors[a.id].rescuer===null||this.round.actors[a.id].rescuer===id)).sort((a,b)=>p.distanceToSquared(a.group.position)-p.distanceToSquared(b.group.position));
  for(const friend of friends){const d=p.distanceTo(friend.group.position);if(d<INTERACT_RADIUS&&this.sight(p,friend.group.position,false,1.1))return {type:'rescue',id:friend.id,d};}
  if(state.inSmoke)return null;const caches=this.round.caches.filter(c=>c.remaining>0).sort((a,b)=>p.distanceToSquared(new THREE.Vector3(...a.position))-p.distanceToSquared(new THREE.Vector3(...b.position)));
  for(const cache of caches){const q=new THREE.Vector3(...cache.position),d=Math.hypot(q.x-p.x,q.z-p.z);if(d<INTERACT_RADIUS&&Math.abs(p.y-q.y)<2&&this.sight(p,q,false,1.1))return {type:'cache',id:cache.id,d};}return null;
 }
 resolveHammer(state){
  const p=this.actors[state.id].group.position;
  if(this.round.mode==='balloon'){const result=resolveBalloonHammer(this.round,state.id,this.actors.map(a=>a.group.position),this.actors.map(a=>a.group.rotation.y));if(result)this.event(result.blocked?'balloon-block':'balloon-pop',{actor:state.id,target:result.target,remaining:this.round.actors[result.target].balloons,position:this.actors[result.target].group.position.toArray()});return;}
  for(const other of this.round.actors){const event=['diretide','tiletide','strikers','balloon','splash'].includes(this.round.mode),friendly=this.round.mode==='strikers'?other.team===state.team:other.id===state.id;if((event?friendly:other.role===state.role)||other.caught||other.inSmoke)continue;const target=this.actors[other.id];if(p.distanceTo(target.group.position)<EVENT_HAMMER_RADIUS&&this.sight(p,target.group.position,false)){this.effect(other,target.grounded?'stunned':'airStunned',this.round.mode==='tiletide'?TILE_STUN_SECONDS:this.round.mode==='strikers'?STRIKER_HAMMER_STUN_SECONDS:event?EVENT_STUN_SECONDS:2);state.stuns=(state.stuns||0)+1;}}
 }
 step(dt=1/60){
  if(this.round.phase!=='playing')return;this.time+=dt;this.tick++;const starting=this.round.startRemaining>0||this.round.resetClock>0;if(this.round.mode==='galah')beginGalahTick(this.round,dt);else if(this.round.mode==='splash')stepSplash(this.round,dt,this.actors.map(a=>a.group.position));else if(this.round.mode==='diretide')stepDiretide(this.round,dt);else if(this.round.mode==='tiletide')stepTiletide(this.round,dt,this.actors.map(a=>a.group.position));else if(this.round.mode==='strikers')stepStrikers(this.round,dt,this.actors.map(a=>a.group.position));else if(this.round.mode==='balloon')stepBalloon(this.round,dt);else stepRound(this.round,dt);if(this.round.phase!=='playing')return;if(this.round.resetClock===GOAL_RESET_SECONDS)resetStrikerPlayers(this.actors);if(starting||this.round.resetClock>0){for(const actor of this.actors){actor.inputQueue.length=0;actor.processedInput=actor.input.seq;actor.input={seq:actor.input.seq,x:0,z:0,interact:false};}return;}this.smokeCoverage();const tilt=this.map==='sunken'?shipTilt(300-this.round.remaining):0,wishes=[];
  for(const state of this.round.actors){
   if(!(state.hammerWindup>0))continue;
   state.hammerWindup=Math.max(0,state.hammerWindup-dt);
   if(!state.hammerWindup&&state.effect==='hammer'&&state.effectTime>0&&!state.caught&&!state.inSmoke)this.resolveHammer(state);
  }
  for(const actor of this.actors){const state=this.round.actors[actor.id];state.interacting=false;let input=this.players[actor.id].bot?this.botInput(actor,dt):actor.framed?(actor.inputQueue.shift()||{x:0,z:0,interact:false}):this.time-actor.lastInput<.4?actor.input:{x:0,z:0,interact:false};if(input.seq)actor.processedInput=input.seq;let {x,z}=input;
   if(state.caught){x=z=0;actor.mark=null;for(const h of this.hazards)if(h.owner===actor.id&&h.type==='marker')h.time=0;}
   if(state.effect==='banana'&&state.effectTime>0){state.spinTurn-=dt;if(state.spinTurn<=0){state.spinDirection=rollSpinDirection();state.spinTurn=.35;}x=state.spinDirection.x;z=state.spinDirection.z;}
   const flying=state.effect==='rocket'&&state.effectTime>0;if(flying&&Math.hypot(x,z)<.1){x=Math.sin(actor.group.rotation.y);z=Math.cos(actor.group.rotation.y);}
   const botEdge=this.round.mode==='tiletide'&&this.players[actor.id].bot&&state.effect!=='banana'?actor.group.position.clone():null;advanceActor(actor,state,x,z,dt,{map:this.map,grid:this.grid,tilt,speed:state.caught?0:movementSpeed(state.role,this.map,!this.players[actor.id].bot,flying),furniture:this.physics,respawn:actor.spawn});if(botEdge&&!tileStageContains(this.round,actor.group.position)){actor.group.position.copy(botEdge);actor.vx=actor.vz=actor.slideX=actor.speed=0;}
   wishes.push({id:actor.id,wants:input.interact===true});
  }
  if(this.round.mode==='galah'){finishGalahTick(this.round,this.actors,dt,(x,z)=>sampleGround(this.grid,x,z));return;}
  this.physics?.step(dt,this.actors);
  for(const hazard of this.hazards)hazard.time-=dt;this.smokeCoverage();for(const hazard of this.hazards){if(hazard.type==='banana'&&hazard.time>0)for(const state of this.round.actors){const event=['diretide','tiletide','strikers','balloon','splash'].includes(this.round.mode),friendly=this.round.mode==='strikers'?state.team===this.round.actors[hazard.owner]?.team:state.id===hazard.owner;if((event?friendly:state.role===hazard.role)||state.caught||state.inSmoke||state.effectTime>0)continue;if(this.actors[state.id].group.position.distanceTo(hazard.position)<.8){this.effect(state,'banana',this.round.mode==='tiletide'?TILE_BANANA_SECONDS:this.round.mode==='balloon'?BALLOON_BANANA_SECONDS:event?EVENT_BANANA_SECONDS:2);hazard.time=0;break;}}}this.hazards=this.hazards.filter(h=>h.time>0);
  this.smokeCoverage();const cop=this.actors.find(a=>this.round.actors[a.id].role==='chaser');for(const state of this.round.actors.filter(a=>!['diretide','tiletide','strikers','balloon','splash'].includes(this.round.mode)&&a.role==='runner')){const p=cop.group.position,q=this.actors[state.id].group.position;if(detectThiefAt(this.round,cop.id,state.id,dt,p,q,this.sight(p,q))){cop.vx=cop.vz=cop.slideX=cop.speed=0;this.event('capture',{actor:state.id,position:q.toArray(),policePosition:p.toArray()});this.actors[state.id].mark=null;}}
  if(this.round.mode==='strikers')updateStrikerPossession(this.round,this.actors.map(a=>a.group),dt);
  for(const cache of this.round.caches)cache.harvester=null;for(const wish of wishes){if(this.round.mode==='splash'){const a=this.actors[wish.id];splashFire(this.round,wish.id,a.group.position,a.group.rotation.y,wish.wants);continue;}if(this.round.mode==='strikers'){const group=this.actors[wish.id].group;if(wish.wants&&(!this.players[wish.id].bot||strikerBotWantsShot(this.round,wish.id,group.position,group.rotation.y)))strikerShoot(this.round,wish.id);continue;}const target=wish.wants?this.interaction(wish.id):null,actor=this.actors[wish.id],key=target?`${target.type}:${target.id}`:null;if(actor.interactionKey!==key||!target)cancelInteraction(this.round,wish.id);actor.interactionKey=key;if(this.round.mode==='diretide'&&target)eventInteract(this.round,wish.id,target,dt,target.d);if(target?.type==='cache')harvest(this.round,wish.id,target.id,dt,target.d);if(target?.type==='rescue')rescue(this.round,wish.id,target.id,dt,target.d);}
  if(this.round.mode==='diretide')collectEventCandy(this.round,this.actors.map(a=>a.group.position),(p,q)=>this.sight(p,new THREE.Vector3(...q),false,1.1));
 }
 snapshot(){return {movementVersion:MOVEMENT_VERSION,inputFrames:true,tick:this.tick,time:this.time,worldTime:this.round.elapsed??300-this.round.remaining,map:this.map,round:this.round,poses:this.actors.map(a=>({id:a.id,position:a.group.position.toArray(),angle:a.group.rotation.y,vx:a.vx,vz:a.vz,slideX:a.slideX||0,velocity:a.velocity,grounded:a.grounded,flightFloor:a.flightFloor||0,wasFlying:!!a.wasFlying,flightLanding:a.flightLanding||null,speed:a.speed,ack:a.processedInput,warp:a.warp||0,received:a.input.seq})),hazardId:this.hazardId,hazards:this.hazards.map(h=>({...h,position:h.position.toArray(),time:Number.isFinite(h.time)?h.time:-1})),furniture:this.physics?.furniture.map(f=>({name:f.mesh.name,position:f.mesh.position.toArray(),rotation:f.mesh.quaternion.toArray(),linearVelocity:f.body.linvel(),angularVelocity:f.body.angvel()}))||[],events:this.events};}
 dispose(){this.physics?.dispose();this.physics=null;}
}
