import {environmentVelocity} from './environment.js';
import {sampleGround} from './motion.js';
import {canTraverse} from './collision.js';
export function movementSpeed(role,map,human=true,flying=false){return (role==='chaser'?3.65:3.4)*1.15*(map==='iceberg'?1.5:1)*(human?1.08:1)*(flying?1.8:1);}
// Map-local movement shared by authoritative server, practice and client prediction.
export function advanceActor(actor,state,dx,dz,dt,{grid,map,tilt=0,speed,furniture=null,respawn=null}){
 const p=actor.group.position,previous=p.clone(),magnitude=Math.hypot(dx,dz),flying=state.effect==='rocket'&&state.effectTime>0,locked=speed===0||state.caught||state.captureRemaining>0||state.effectTime>0&&!['rocket','banana'].includes(state.effect);
 environmentVelocity(actor,dx,dz,speed,dt,{map,grounded:actor.grounded,flying,locked,tilt});const nx=p.x+(actor.vx+(actor.slideX||0))*dt,nz=p.z+actor.vz*dt;
 const at=(x,z)=>sampleGround(grid,x,z),ground=at(p.x,p.z),walkY=Number.isFinite(ground)?ground:p.y,walkable=(x,z)=>{const h=at(x,z);return Number.isFinite(h)&&h-walkY<.5&&walkY-h<1.2;};let moved=false;
 if(Math.hypot(actor.vx+(actor.slideX||0),actor.vz)>.01){if(walkable(nx,p.z)&&canTraverse(grid,p.x,p.z,nx,p.z)){p.x=nx;moved=true;}else actor.vx=actor.slideX=0;if(walkable(p.x,nz)&&canTraverse(grid,p.x,p.z,p.x,nz)){p.z=nz;moved=true;}else actor.vz=0;}
 if(moved&&furniture){furniture.move(actor,previous,p,dt);if(!canTraverse(grid,previous.x,previous.z,p.x,p.z)||!walkable(p.x,p.z)){p.copy(previous);actor.vx=actor.vz=0;}moved=Math.hypot(p.x-previous.x,p.z-previous.z)>.001;}
 if(magnitude>.06&&moved){const angle=Math.atan2(actor.vx,actor.vz);actor.group.rotation.y+=Math.atan2(Math.sin(angle-actor.group.rotation.y),Math.cos(angle-actor.group.rotation.y))*Math.min(1,dt*14);}
 const h=at(p.x,p.z);if(flying&&Number.isFinite(h)){p.y+=(h+1.8-p.y)*(1-Math.exp(-6*dt));actor.velocity=0;}else{actor.velocity=(actor.velocity||0)-16*dt;p.y+=actor.velocity*dt;}
 if(!flying&&Number.isFinite(h)&&(p.y<=h||actor.grounded&&Math.abs(p.y-h)<.55)){p.y+=(h-p.y)*(1-Math.exp(-30*dt));actor.velocity=0;actor.grounded=true;}else actor.grounded=false;
 if(p.y< -15&&respawn){p.copy(typeof respawn==='function'?respawn():respawn);actor.velocity=0;actor.vx=actor.vz=actor.slideX=0;}
 actor.speed=(actor.speed||0)+((moved?1:0)-(actor.speed||0))*(1-Math.exp(-10*dt));return moved;
}
