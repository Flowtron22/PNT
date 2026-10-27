import {advanceActor,movementSpeed} from './player-motion.js';
import {shipTilt} from './environment.js';
export const NETWORK_STEP=1/60;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function applyPose(actor,pose){actor.group.position.fromArray(pose.position);actor.group.rotation.y=pose.angle;for(const key of ['vx','vz','slideX','velocity','grounded','speed'])actor[key]=pose[key]??0;}
export function predictInput(actor,state,input,time,options){
 let {x,z}=input;const flying=state.effect==='rocket'&&state.effectTime>0;
 if(state.effect==='banana'&&state.effectTime>0){x=state.spinDirection?.x||0;z=state.spinDirection?.z||0;}
 if(flying&&Math.hypot(x,z)<.1){x=Math.sin(actor.group.rotation.y);z=Math.cos(actor.group.rotation.y);}
 advanceActor(actor,state,x,z,NETWORK_STEP,{...options,tilt:options.map==='sunken'?shipTilt(time):0,speed:state.caught?0:movementSpeed(state.role,options.map,true,flying)});
}
// The simulation position is independent of the rendered mesh. Rewind to the
// acknowledged server tick, then replay only commands it has not processed.
export class LocalPrediction {
 constructor(actor,pose,state,time,options){this.actor={group:{position:actor.group.position.clone(),rotation:{y:0}}};this.options=options;this.pending=[];this.seq=Math.max(pose.ack||0,pose.received||0);this.sent=this.seq;this.accumulator=0;this.offset=actor.group.position.clone().set(0,0,0);this.angleOffset=0;this.reset(pose,state,time);}
 reset(pose,state,time){applyPose(this.actor,pose);this.state={...state};this.time=time;this.previous=this.actor.group.position.clone();this.previousAngle=pose.angle;}
 simulate(input){this.previous.copy(this.actor.group.position);this.previousAngle=this.actor.group.rotation.y;this.time+=NETWORK_STEP;this.state.effectTime=Math.max(0,(this.state.effectTime||0)-NETWORK_STEP);predictInput(this.actor,this.state,input,this.time,this.options);}
 advance(elapsed,input){this.accumulator+=Math.min(.1,Math.max(0,elapsed));while(this.accumulator+1e-9>=NETWORK_STEP){this.accumulator-=NETWORK_STEP;if(this.pending.length>=180)continue;const frame={seq:++this.seq,x:input.x,z:input.z,interact:input.interact===true};this.pending.push(frame);this.simulate(frame);}const decay=Math.exp(-14*elapsed);this.offset.multiplyScalar(decay);this.angleOffset*=decay;}
 outgoing(){const frames=this.pending.filter(frame=>frame.seq>this.sent).slice(0,12);if(frames.length)this.sent=frames.at(-1).seq;return frames;}
 render(){const alpha=Math.max(0,Math.min(1,this.accumulator/NETWORK_STEP));return {position:this.previous.clone().lerp(this.actor.group.position,alpha).add(this.offset),angle:this.previousAngle+angleDelta(this.previousAngle,this.actor.group.rotation.y)*alpha+this.angleOffset};}
 reconcile(pose,state,time){const before=this.render();this.pending=this.pending.filter(frame=>frame.seq>pose.ack);this.reset(pose,state,time);for(const frame of this.pending)this.simulate(frame);const after=this.render();this.offset.add(before.position.sub(after.position));this.angleOffset+=angleDelta(after.angle,before.angle);if(this.offset.length()>2.5){this.offset.set(0,0,0);this.angleOffset=0;}}
}
// Render remote actors/props between two known server states, rather than
// repeatedly easing toward whichever packet happened to arrive last.
export class SnapshotBuffer {
 constructor(){this.frames=[];this.time=null;this.delay=.1;}
 push(snapshot){if(this.frames.length&&snapshot.tick<=this.frames.at(-1).tick)return false;this.frames.push(snapshot);if(this.frames.length>32)this.frames.shift();if(this.time===null||snapshot.time-this.time>.6)this.time=snapshot.time-this.delay;return true;}
 advance(dt){if(!this.frames.length)return null;const latest=this.frames.at(-1),target=latest.time-this.delay,error=target-this.time;this.time+=Math.min(.1,Math.max(0,dt))*(1+Math.max(-.05,Math.min(.05,error*.5)));this.time=Math.min(this.time,latest.time+.1);while(this.frames.length>2&&this.frames[1].time<this.time)this.frames.shift();const a=this.frames[0],b=this.frames.find(frame=>frame.time>=this.time)||latest;return {a,b,alpha:a===b?1:Math.max(0,Math.min(1,(this.time-a.time)/(b.time-a.time))),extra:Math.max(0,Math.min(.1,this.time-b.time))};}
}
export function interpolatePose(a,b,alpha,extra=0){
 const teleport=Math.hypot(...a.position.map((value,i)=>b.position[i]-value))>2.5;
 const position=teleport?[...b.position]:a.position.map((value,i)=>value+(b.position[i]-value)*alpha);
 if(!teleport&&extra){position[0]+=(b.vx+(b.slideX||0))*extra;position[2]+=b.vz*extra;}
 return {...b,position,angle:teleport?b.angle:a.angle+angleDelta(a.angle,b.angle)*alpha,speed:a.speed+(b.speed-a.speed)*alpha};
}
