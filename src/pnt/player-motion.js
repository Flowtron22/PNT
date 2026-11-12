import {EVENT_SPEED_MULTIPLIER,pattySpeedMultiplier} from './diretide-rules.js';
import {strikerInsidePitch,strikerSpeedMultiplier} from './strikers-rules.js';
import {environmentVelocity} from './environment.js';
import {sampleGround} from './motion.js';
import {canTraverse,icebergGroundPathClear} from './collision.js';
import {safeLandingCell,nearestLanding} from './landing.js';
import {BALLOON_ARENA_RADIUS,slideBalloonSpheres} from './balloon-rules.js';
import {slideSplashCover} from './splash-rules.js';
import {galahCanMove,galahRunnerActive} from './galah-rules.js';
export const MOVEMENT_VERSION=10;
export function movementSpeed(role,map,human=true,flying=false){return (role==='chaser'?3.65:3.4)*1.15*(map==='iceberg'?1.5:(map==='grassfield'||map==='slipperystriker')?EVENT_SPEED_MULTIPLIER:1)*(human?1.08:1)*(flying?1.8:1);}
// Map-local movement shared by authoritative server, practice and client prediction.
export function advanceActor(actor,state,dx,dz,dt,{grid,map,tilt=0,speed,furniture=null,respawn=null}){
 if(state.galahRole){
  if(state.galahRole!=='runner')speed*=.84;
  else if(!galahRunnerActive(state))speed=0;
 }
 if(map==='grassfield'||map==='slipperystriker')speed*=state.team===0||state.team===1?strikerSpeedMultiplier(state):pattySpeedMultiplier(state.candy);
 if(state.ink!==undefined)speed*=state.submerged?1.35:state.diving?.55:1;
 if(state.balloons!==undefined)speed*=.87;
 const p=actor.group.position,previous=p.clone(),magnitude=Math.hypot(dx,dz),flying=state.effect==='rocket'&&state.effectTime>0,locked=speed===0||state.captureLock>0||state.caught||state.captureRemaining>0||state.effectTime>0&&!['rocket','banana'].includes(state.effect);
 if(actor.wasFlying&&!flying){const landing=actor.flightLanding||nearestLanding(grid,p.x,p.z);if(landing){p.x=landing.x;p.z=landing.z;p.y=Math.max(p.y,landing.y);actor.vx=actor.vz=actor.slideX=0;}else if(respawn)p.copy(typeof respawn==='function'?respawn():respawn);actor.flightLanding=null;previous.copy(p);}
 if(flying&&!actor.wasFlying){actor.flightFloor=p.y;actor.flightLanding=null;}actor.wasFlying=flying;
 if(state.effectTime>0&&['stunned','airStunned','kick'].includes(state.effect))actor.vx=actor.vz=actor.slideX=0;
 environmentVelocity(actor,dx,dz,speed,dt,{map,grounded:actor.grounded,flying,locked,tilt});const nx=p.x+(actor.vx+(actor.slideX||0))*dt,nz=p.z+actor.vz*dt;
 const at=(x,z)=>sampleGround(grid,x,z),ground=at(p.x,p.z),walkY=Number.isFinite(ground)?ground:p.y,walkable=(x,z)=>{const h=at(x,z);return Number.isFinite(h)&&h-walkY<.5&&walkY-h<1.2;};let moved=false;
 const inside=(x,z)=>state.galahRole?galahCanMove(state.galahRole,x,z):state.team==null||strikerInsidePitch(x,z,.28);
 const canMove=(x,z)=>flying||(inside(x,z)&&icebergGroundPathClear(grid,p.x,p.z,x,z)&&walkable(x,z)&&canTraverse(grid,p.x,p.z,x,z));
 if(Math.hypot(actor.vx+(actor.slideX||0),actor.vz)>.01){if(canMove(nx,p.z)){p.x=nx;moved=true;}else actor.vx=actor.slideX=0;if(canMove(p.x,nz)){p.z=nz;moved=true;}else actor.vz=0;}
 if(flying){const margin=grid.step*1.1;p.x=Math.max(grid.minX+margin,Math.min(grid.minX+(grid.nx-1)*grid.step-margin,p.x));p.z=Math.max(grid.minZ+margin,Math.min(grid.minZ+(grid.nz-1)*grid.step-margin,p.z));if(state.effectTime<=.5){actor.flightLanding??=nearestLanding(grid,p.x,p.z);if(actor.flightLanding){const blend=Math.min(1,dt/Math.max(dt,state.effectTime));p.x+=(actor.flightLanding.x-p.x)*blend;p.z+=(actor.flightLanding.z-p.z)*blend;}}}
 if(moved&&furniture&&!flying){furniture.move(actor,previous,p,dt);if(!canTraverse(grid,previous.x,previous.z,p.x,p.z)||!walkable(p.x,p.z)){p.copy(previous);actor.vx=actor.vz=0;}moved=Math.hypot(p.x-previous.x,p.z-previous.z)>.001;}
 if(state.balloons&&!state.caught&&!flying){const radius=Math.hypot(p.x,p.z);if(radius>.12){const pull=.95+.45*Math.min(1,radius/BALLOON_ARENA_RADIUS);p.x-=p.x/radius*pull*dt;p.z-=p.z/radius*pull*dt;}const after=Math.hypot(p.x,p.z),limit=BALLOON_ARENA_RADIUS-.42;if(after>limit){p.x*=limit/after;p.z*=limit/after;actor.vx=actor.vz=actor.slideX=0;}}
 if(state.balloons&&!state.caught&&!flying){slideBalloonSpheres(state,previous,p);const radius=Math.hypot(p.x,p.z),limit=BALLOON_ARENA_RADIUS-.42;if(radius>limit){p.x*=limit/radius;p.z*=limit/radius;}moved=Math.hypot(p.x-previous.x,p.z-previous.z)>.001;}
 if(state.paintCover){slideSplashCover(state,previous,p);moved=Math.hypot(p.x-previous.x,p.z-previous.z)>.001;}
 if(!locked&&magnitude>.06&&moved&&Math.hypot(actor.vx,actor.vz)>.01){const angle=Math.atan2(actor.vx,actor.vz);actor.group.rotation.y+=Math.atan2(Math.sin(angle-actor.group.rotation.y),Math.cos(angle-actor.group.rotation.y))*Math.min(1,dt*14);}
 const rawGround=at(p.x,p.z),h=rawGround;
 if(flying){if(!Number.isFinite(actor.flightFloor)||safeLandingCell(grid,p.x,p.z))actor.flightFloor=Number.isFinite(rawGround)?rawGround:p.y;const base=actor.flightLanding?.y??actor.flightFloor??p.y,target=base+1.8*Math.min(1,state.effectTime/.5),blend=actor.flightLanding?Math.min(1,dt/Math.max(dt,state.effectTime)):1-Math.exp(-6*dt);p.y+=(target-p.y)*blend;actor.velocity=0;}else{actor.velocity=(actor.velocity||0)-16*dt;p.y+=actor.velocity*dt;}
 if(!flying&&Number.isFinite(h)&&(p.y<=h||actor.grounded&&Math.abs(p.y-h)<.55)){p.y+=(h-p.y)*(1-Math.exp(-30*dt));actor.velocity=0;actor.grounded=true;}else actor.grounded=false;
 if(p.y< -15&&respawn){actor.warp=(actor.warp||0)+1;p.copy(typeof respawn==='function'?respawn():respawn);actor.velocity=0;actor.vx=actor.vz=actor.slideX=0;}
 if(state.captureLock>0)actor.speed=0;actor.speed=(actor.speed||0)+((moved?1:0)-(actor.speed||0))*(1-Math.exp(-10*dt));return moved;
}
