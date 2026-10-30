import {randomUUID,randomInt} from 'node:crypto';
import * as THREE from '../vendor/three/build/three.module.js';
import {createRound,stepRound,canAct,activateTool,detectThiefAt,harvest,rescue,cancelInteraction,INTERACT_RADIUS,updateSmokeCoverage} from '../src/pnt/rules.js';
import {advanceActor,movementSpeed,MOVEMENT_VERSION} from '../src/pnt/player-motion.js';
import {shipTilt} from '../src/pnt/environment.js';
import {findPath} from '../src/pnt/navigation.js';
import {hasSight} from '../src/pnt/sight.js';
import {rollSpinDirection} from '../src/pnt/action-state.js';
import {createMallPhysics} from '../src/pnt/mall-physics.js';
import {loadArenaData,groundSpot} from './arena.mjs';
export class MatchSimulation {
 static async create(map,players){const instance=new MatchSimulation(map,players,await loadArenaData(map));if(map==='mall'){const arena=instance.data.template.clone(true);instance.root.add(arena);instance.root.updateMatrixWorld(true);instance.physics=await createMallPhysics(arena,instance.root,instance.grid);}return instance;}
 constructor(map,players,data){
  this.map=map;this.players=players;this.data=data;this.grid=data.grid;this.root=new THREE.Group();this.physics=null;this.round=createRound('runner',data.metadata.caches);this.round.profileId=randomUUID();this.time=0;this.tick=0;this.eventId=0;this.hazardId=0;this.events=[];this.hazards=[];
  const preferred=players.map((p,i)=>p.preference==='chaser'?i:-1).filter(i=>i>=0),neutral=players.map((p,i)=>p.preference!=='runner'?i:-1).filter(i=>i>=0),pool=preferred.length?preferred:neutral.length?neutral:[0,1,2,3],cop=pool[randomInt(pool.length)];
  this.actors=players.map((player,id)=>{this.round.actors[id].role=id===cop?'chaser':'runner';const group=new THREE.Group(),spawn=data.metadata.spawns[id];group.position.copy(groundSpot(this.grid,spawn[0],spawn[2]));return {id,group,spawn:group.position.clone(),tools:player.loadout,grounded:true,vx:0,vz:0,velocity:0,speed:0,input:{seq:0,x:0,z:0,interact:false},lastInput:0,inputQueue:[],framed:false,processedInput:0,mark:null};});
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
 effect(state,name,time){state.effect=name;state.effectTime=time;if(name==='banana'){state.spinDirection=rollSpinDirection();state.spinTurn=.35;}}
 addHazard(type,actor,time,position){const hazard={id:++this.hazardId,type,owner:actor.id,role:this.round.actors[actor.id].role,time,position:position.clone()};this.hazards.push(hazard);const max=type==='banana'?5:type==='smoke'?3:1,all=this.hazards.filter(h=>h.owner===actor.id&&h.type===type);for(const h of all.slice(0,Math.max(0,all.length-max)))h.time=0;return hazard;}
 smokeCoverage(){updateSmokeCoverage(this.round,this.actors.map(a=>a.group.position),this.hazards.filter(h=>h.type==='smoke'));}
 tool(id,slot){
  this.smokeCoverage();
  const actor=this.actors[id],state=this.round.actors[id];if(!actor||![0,1].includes(slot)||!canAct(this.round,id)||state.inSmoke)return false;const tool=actor.tools[slot],p=actor.group.position;
  if(tool==='rewind'&&!actor.mark&&state.toolCooldowns[slot]<=0){actor.mark=p.clone();this.addHazard('marker',actor,Infinity,p);return true;}
  if(!activateTool(this.round,id,slot,tool))return false;
  if(tool==='hammer'){this.effect(state,'hammer',.48);for(const other of this.round.actors){if(other.role===state.role||other.caught||other.inSmoke)continue;const target=this.actors[other.id];if(p.distanceTo(target.group.position)<2&&this.sight(p,target.group.position,false)){this.effect(other,target.grounded?'stunned':'airStunned',2);state.stuns=(state.stuns||0)+1;}}}
  if(tool==='banana')this.addHazard('banana',actor,15,p.clone().add(new THREE.Vector3(-Math.sin(actor.group.rotation.y)*.7,.03,-Math.cos(actor.group.rotation.y)*.7)));
  if(tool==='smoke'){this.addHazard('smoke',actor,20,p);this.smokeCoverage();}
  if(tool==='rocket'){this.effect(state,'rocket',5);actor.velocity=4.5;actor.grounded=false;}
  if(tool==='rewind'&&actor.mark){p.copy(groundSpot(this.grid,actor.mark.x,actor.mark.z));actor.warp=(actor.warp||0)+1;actor.velocity=actor.vx=actor.vz=0;actor.mark=null;for(const h of this.hazards)if(h.owner===id&&h.type==='marker')h.time=0;}
  this.event('tool',{actor:id,tool,position:p.toArray(),angle:actor.group.rotation.y});return true;
 }
 botInput(actor,dt){
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
 interaction(id){const actor=this.actors[id],p=actor.group.position,state=this.round.actors[id];if(!canAct(this.round,id)||state.role!=='runner')return null;
  const friends=this.actors.filter(a=>this.round.actors[a.id].caught&&a.id!==id&&this.round.actors[a.id].releaseCooldown<=0&&(this.round.actors[a.id].rescuer===null||this.round.actors[a.id].rescuer===id)).sort((a,b)=>p.distanceToSquared(a.group.position)-p.distanceToSquared(b.group.position));
  for(const friend of friends){const d=p.distanceTo(friend.group.position);if(d<INTERACT_RADIUS&&this.sight(p,friend.group.position,false,1.1))return {type:'rescue',id:friend.id,d};}
  if(state.inSmoke)return null;const caches=this.round.caches.filter(c=>c.remaining>0).sort((a,b)=>p.distanceToSquared(new THREE.Vector3(...a.position))-p.distanceToSquared(new THREE.Vector3(...b.position)));
  for(const cache of caches){const q=new THREE.Vector3(...cache.position),d=Math.hypot(q.x-p.x,q.z-p.z);if(d<INTERACT_RADIUS&&Math.abs(p.y-q.y)<2&&this.sight(p,q,false,1.1))return {type:'cache',id:cache.id,d};}return null;
 }
 step(dt=1/60){
  if(this.round.phase!=='playing')return;this.time+=dt;this.tick++;const starting=this.round.startRemaining>0;stepRound(this.round,dt);if(this.round.phase!=='playing')return;if(starting){for(const actor of this.actors){actor.inputQueue.length=0;actor.processedInput=actor.input.seq;actor.input={seq:actor.input.seq,x:0,z:0,interact:false};}return;}this.smokeCoverage();const tilt=this.map==='sunken'?shipTilt(300-this.round.remaining):0,wishes=[];
  for(const actor of this.actors){const state=this.round.actors[actor.id];state.interacting=false;let input=this.players[actor.id].bot?this.botInput(actor,dt):actor.framed?(actor.inputQueue.shift()||{x:0,z:0,interact:false}):this.time-actor.lastInput<.4?actor.input:{x:0,z:0,interact:false};if(input.seq)actor.processedInput=input.seq;let {x,z}=input;
   if(state.caught){x=z=0;actor.mark=null;for(const h of this.hazards)if(h.owner===actor.id&&h.type==='marker')h.time=0;}
   if(state.effect==='banana'&&state.effectTime>0){state.spinTurn-=dt;if(state.spinTurn<=0){state.spinDirection=rollSpinDirection();state.spinTurn=.35;}x=state.spinDirection.x;z=state.spinDirection.z;}
   const flying=state.effect==='rocket'&&state.effectTime>0;if(flying&&Math.hypot(x,z)<.1){x=Math.sin(actor.group.rotation.y);z=Math.cos(actor.group.rotation.y);}
   advanceActor(actor,state,x,z,dt,{map:this.map,grid:this.grid,tilt,speed:state.caught?0:movementSpeed(state.role,this.map,!this.players[actor.id].bot,flying),furniture:this.physics,respawn:actor.spawn});
   wishes.push({id:actor.id,wants:input.interact===true});
  }
  this.physics?.step(dt,this.actors);
  for(const hazard of this.hazards)hazard.time-=dt;this.smokeCoverage();for(const hazard of this.hazards){if(hazard.type==='banana'&&hazard.time>0)for(const state of this.round.actors){if(state.role===hazard.role||state.caught||state.inSmoke||state.effectTime>0)continue;if(this.actors[state.id].group.position.distanceTo(hazard.position)<.8){this.effect(state,'banana',2);hazard.time=0;break;}}}this.hazards=this.hazards.filter(h=>h.time>0);
  this.smokeCoverage();const cop=this.actors.find(a=>this.round.actors[a.id].role==='chaser');for(const state of this.round.actors.filter(a=>a.role==='runner')){const p=cop.group.position,q=this.actors[state.id].group.position;if(detectThiefAt(this.round,cop.id,state.id,dt,p,q,this.sight(p,q))){cop.vx=cop.vz=cop.slideX=cop.speed=0;this.event('capture',{actor:state.id,position:q.toArray(),policePosition:p.toArray()});this.actors[state.id].mark=null;}}
  for(const cache of this.round.caches)cache.harvester=null;for(const wish of wishes){const target=wish.wants?this.interaction(wish.id):null,actor=this.actors[wish.id],key=target?`${target.type}:${target.id}`:null;if(actor.interactionKey!==key||!target)cancelInteraction(this.round,wish.id);actor.interactionKey=key;if(target?.type==='cache')harvest(this.round,wish.id,target.id,dt,target.d);if(target?.type==='rescue')rescue(this.round,wish.id,target.id,dt,target.d);}
 }
 snapshot(){return {movementVersion:MOVEMENT_VERSION,inputFrames:true,tick:this.tick,time:this.time,worldTime:300-this.round.remaining,map:this.map,round:this.round,poses:this.actors.map(a=>({id:a.id,position:a.group.position.toArray(),angle:a.group.rotation.y,vx:a.vx,vz:a.vz,slideX:a.slideX||0,velocity:a.velocity,grounded:a.grounded,flightFloor:a.flightFloor||0,wasFlying:!!a.wasFlying,flightLanding:a.flightLanding||null,speed:a.speed,ack:a.processedInput,warp:a.warp||0,received:a.input.seq})),hazards:this.hazards.map(h=>({...h,position:h.position.toArray(),time:Number.isFinite(h.time)?h.time:-1})),furniture:this.physics?.furniture.map(f=>({name:f.mesh.name,position:f.mesh.position.toArray(),rotation:f.mesh.quaternion.toArray()}))||[],events:this.events};}
 dispose(){this.physics?.dispose();this.physics=null;}
}
