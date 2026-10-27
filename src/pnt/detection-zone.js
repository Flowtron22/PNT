import * as THREE from 'three';
import {DETECTION_RADIUS,CAPTURE_SECONDS} from './rules.js';
export function createDetectionZone(){
 const group=new THREE.Group(),segments=96;
 const material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
 const disk=new THREE.Mesh(new THREE.CircleGeometry(DETECTION_RADIUS,segments),material(0x419dff,.09));
 const rim=new THREE.Mesh(new THREE.RingGeometry(DETECTION_RADIUS-.13,DETECTION_RADIUS,segments),material(0x74caff,.8));
 const fill=new THREE.Mesh(new THREE.RingGeometry(DETECTION_RADIUS-.36,DETECTION_RADIUS-.16,segments,1,Math.PI/2),material(0xffa12e,.95));
 for(const mesh of [disk,rim,fill]){mesh.rotation.x=-Math.PI/2;group.add(mesh);}rim.position.y=.005;fill.position.y=.01;group.position.y=.06;
 return {group,update(actors,active=true){group.visible=active;const progress=Math.max(0,...actors.filter(a=>a.role==='runner'&&!a.caught).map(a=>(a.detectionProgress||0)/CAPTURE_SECONDS));fill.geometry.setDrawRange(0,Math.floor(Math.min(1,progress)*segments)*6);},dispose(){for(const mesh of [disk,rim,fill]){mesh.geometry.dispose();mesh.material.dispose();}group.removeFromParent();}};
}
