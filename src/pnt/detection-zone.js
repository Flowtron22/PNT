import * as THREE from 'three';
import {DETECTION_RADIUS,DETECTION_HEIGHT,DETECTION_GRACE,ROUND_SECONDS,canAct} from './rules.js';
// Use current contact, not the decaying capture meter: leaving the range must
// hide the area immediately even while the thief's capture progress drains.
export function hasDetectedThief(round,avatars,policeId,clear=()=>true){
 const police=round.actors[policeId],p=avatars[policeId]?.group.position;
 if(!p||police?.role!=='chaser'||!canAct(round,policeId)||police.inSmoke||ROUND_SECONDS-round.remaining<=DETECTION_GRACE+1e-8)return false;
 return round.actors.some(thief=>{if(thief.role!=='runner'||thief.caught||thief.captureRemaining>0||thief.immune>0||thief.inSmoke)return false;const q=avatars[thief.id]?.group.position;return !!q&&Math.hypot(p.x-q.x,p.z-q.z)<=DETECTION_RADIUS&&Math.abs(p.y-q.y)<DETECTION_HEIGHT&&clear(p,q);});
}
export function createDetectionZone(){
 const group=new THREE.Group();group.visible=false;group.position.y=.06;
 const material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
 const disk=new THREE.Mesh(new THREE.CircleGeometry(DETECTION_RADIUS,64),material(0x999999,.16));
 const rim=new THREE.Mesh(new THREE.RingGeometry(DETECTION_RADIUS-.035,DETECTION_RADIUS,64),material(0xbbbbbb,.22));
 for(const mesh of [disk,rim]){mesh.rotation.x=-Math.PI/2;group.add(mesh);}rim.position.y=.005;
 return {group,update(detected,active=true){group.visible=active&&detected===true;},dispose(){for(const mesh of [disk,rim]){mesh.geometry.dispose();mesh.material.dispose();}group.removeFromParent();}};
}
