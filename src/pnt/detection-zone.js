import * as THREE from 'three';
import {DETECTION_RADIUS,CAPTURE_SECONDS} from './rules.js';
export function createDetectionZone(){
 const group=new THREE.Group(),segments=96;let displayed=0;
 const material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
 const disk=new THREE.Mesh(new THREE.CircleGeometry(DETECTION_RADIUS,segments),material(0x419dff,.09));
 const rim=new THREE.Mesh(new THREE.RingGeometry(DETECTION_RADIUS-.16,DETECTION_RADIUS,segments),material(0x74caff,.8));
 const fill=new THREE.Mesh(new THREE.RingGeometry(DETECTION_RADIUS-.55,DETECTION_RADIUS-.19,segments,1,Math.PI/2),material(0xffa12e,.95));
 const caps=[0,1].map(()=>new THREE.Mesh(new THREE.CircleGeometry(.18,20),material(0xffa12e,.95)));
 for(const mesh of [disk,rim,fill,...caps]){mesh.rotation.x=-Math.PI/2;group.add(mesh);}rim.position.y=.005;fill.position.y=.01;group.position.y=.06;for(const cap of caps){cap.position.y=.01;cap.visible=false;}
 return {group,update(actors,active=true,dt=null){group.visible=active;const progress=Math.max(0,...actors.filter(a=>a.role==='runner'&&!a.caught).map(a=>(a.detectionProgress||0)/CAPTURE_SECONDS));displayed=dt===null?progress:displayed+(progress-displayed)*(1-Math.exp(-18*dt));const count=Math.floor(Math.min(1,displayed)*segments);fill.geometry.setDrawRange(0,count*6);caps.forEach((cap,i)=>{cap.visible=count>0;const angle=Math.PI/2+(i?count/segments*Math.PI*2:0),radius=DETECTION_RADIUS-.37;cap.position.x=Math.cos(angle)*radius;cap.position.z=-Math.sin(angle)*radius;});},dispose(){for(const mesh of [disk,rim,fill,...caps]){mesh.geometry.dispose();mesh.material.dispose();}group.removeFromParent();}};
}
