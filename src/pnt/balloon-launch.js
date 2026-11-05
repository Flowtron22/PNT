import * as THREE from '../../vendor/three/build/three.module.js';
import {BALLOON_HEIGHT} from './balloon-rules.js';
export const BALLOON_LAUNCH_SECONDS=2.2;
// Presentation only: never move authoritative positions or change elimination.
export function updateBalloonLaunch(actor,state,dt,{fx,camera,reduced=false,play,shake}={}){
 if(!state.eliminated)return;
 if(!actor.popLaunch){
  const feet=[];actor.model.traverse(node=>{if(node.isBone&&/bip001[lr]foot/.test(node.name.replace(/[_\- ]/g,'').toLowerCase()))feet.push(node);});
  const emitters=Array.from({length:2},(_,i)=>{const nozzle=new THREE.Object3D();actor.group.add(nozzle);return {group:actor.group,jetpackNozzle:nozzle,foot:feet[i],side:i?1:-1};});
  actor.popLaunch={age:0,baseY:actor.model.position.y,emitters};actor.heldJetpack?.removeFromParent();
  actor.anim.mixer?.stopAllAction();actor.anim.play('idle',{restart:true,fade:0});
  actor.anim.actions?.idle?.stopFading();actor.anim.actions?.idle?.setEffectiveWeight(1);actor.anim.update(0);
  fx?.balloonPop?.(actor.group.position.clone().setY(actor.group.position.y+BALLOON_HEIGHT));shake?.(1.15);play?.(actor);actor.hammerImpact=0;actor.ring.visible=false;actor.shadow.visible=false;actor.seatMarker.visible=false;
 }
 const launch=actor.popLaunch;launch.age+=Math.max(0,Math.min(.1,dt));
 actor.group.visible=launch.age<BALLOON_LAUNCH_SECONDS;
 if(!actor.group.visible)return;
 actor.model.position.y=launch.baseY+3*launch.age+5*launch.age*launch.age;
 // Hold the standing pose; jet clips include a horizontal flying tilt.
 actor.anim.update(0);actor.group.userData.animation='idle';actor.group.updateWorldMatrix(true,true);
 for(const emitter of launch.emitters){
  const p=emitter.foot?actor.group.worldToLocal(emitter.foot.getWorldPosition(new THREE.Vector3())):new THREE.Vector3(emitter.side*.18,actor.model.position.y-launch.baseY+.04,0);
  emitter.jetpackNozzle.position.copy(p);emitter.jetpackNozzle.position.y-=.08;
  // Socket has no bone rotation: exhaust points straight down the Y axis.
  fx?.jetpack(emitter,{effect:'rocket',effectTime:1,caught:false,captureRemaining:0},dt,camera,{reduced,longTrail:true,vertical:true});
 }
}
