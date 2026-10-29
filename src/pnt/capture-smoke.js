import * as THREE from 'three';
import {CAPTURE_SMOKE_SECONDS} from './capture-timing.js';
export {CAPTURE_SMOKE_SECONDS,CAPTURE_CELEBRATION_DELAY} from './capture-timing.js';
// Restored smooth sphere-cloud style, enlarged around both capture participants.
// Neutral shared materials replace every orange puff in the old capture effect.
export class CaptureSmokeVFX{
 constructor(root,geometry){
  this.group=new THREE.Group();this.group.name='capture-smoke';root.add(this.group);this.cursor=0;
  const materials=[0xe8e9ec,0xd9dce2,0xc5cbd4,0xf4f4f5].map(color=>new THREE.MeshLambertMaterial({color,flatShading:false}));
  this.items=Array.from({length:4},()=>{
   const cloud=new THREE.Group();cloud.visible=false;this.group.add(cloud);
   for(let i=0;i<16;i++)cloud.add(new THREE.Mesh(geometry,materials[i%4]));
   return {cloud,life:0,radius:1,phase:0,handed:1,rotation:new THREE.Euler(),puffs:cloud.children.map(mesh=>({mesh,position:new THREE.Vector3(),scale:new THREE.Vector3(),rotation:new THREE.Euler()}))};
  });
 }
 burst(position,policePosition=position){
  const item=this.items.find(p=>p.life<=0)||this.items[this.cursor++%this.items.length];item.life=CAPTURE_SMOKE_SECONDS;
  item.cloud.position.copy(position).add(policePosition).multiplyScalar(.5);item.cloud.position.y+=.8;
  item.radius=Math.max(1.3,Math.hypot(position.x-policePosition.x,position.z-policePosition.z)*.5+.75);
  item.phase=Math.random()*Math.PI*2;item.handed=Math.random()<.5?-1:1;
  for(let i=0;i<16;i++){
   const puff=item.cloud.children[i],angle=i*2.39996,radius=(.25+Math.random()*.45)*item.radius;
   puff.position.set(Math.cos(angle)*radius,(Math.random()-.5)*.7,Math.sin(angle)*radius);
   const size=(.45+Math.random()*.3)*item.radius;puff.scale.set(size,size*(.85+Math.random()*.2),size);
   puff.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
   const base=item.puffs[i];base.position.copy(puff.position);base.scale.copy(puff.scale);base.rotation.copy(puff.rotation);
  }
  item.cloud.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);item.cloud.scale.setScalar(1);item.cloud.visible=true;
  item.rotation.copy(item.cloud.rotation);
 }
 update(dt){
  dt=Math.min(Math.max(dt||0,0),.1);
  for(const item of this.items){
   if(item.life<=0)continue;item.life=Math.max(0,item.life-dt);if(item.life<1e-8){item.life=0;item.cloud.visible=false;continue;}
   const t=CAPTURE_SMOKE_SECONDS-item.life,age=t/CAPTURE_SMOKE_SECONDS,phase=item.phase;
   // A fast multi-axis tumble with continuous angular jolts, rather than a slow
   // uniform orbit. Evaluate from age so low/high FPS have the same motion.
   const jolt=(rate,offset)=>Math.sin(t*rate+phase+offset)-Math.sin(phase+offset);
   item.cloud.rotation.set(item.rotation.x+t*16*item.handed+jolt(37,0)*.3,item.rotation.y-t*24*item.handed+jolt(43,1)*.35,item.rotation.z+t*19+jolt(31,2)*.3);
   const scale=(1+age*.12)*Math.min(1,item.life/.22),squash=Math.sin(t*42)*.11;
   item.cloud.scale.set(scale*(1+squash),scale*(1-squash*.75),scale*(1+squash*.45));
   for(let i=0;i<item.puffs.length;i++){
    const base=item.puffs[i],puff=base.mesh,wobble=Math.sin(t*32+phase+i*2.4),counter=i%2?1:-1;
    puff.position.copy(base.position);puff.position.x*=1+wobble*.13;puff.position.z*=1-wobble*.13;puff.position.y+=Math.sin(t*39+i)*.09;
    puff.scale.copy(base.scale).multiplyScalar(1+wobble*.13);
    puff.rotation.set(base.rotation.x+t*9*counter,base.rotation.y-t*13*counter,base.rotation.z+t*7);
   }
  }
 }
 clear(){for(const item of this.items){item.life=0;item.cloud.visible=false;}}
}
