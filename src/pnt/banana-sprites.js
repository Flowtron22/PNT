import * as THREE from 'three';

const CAPACITY=32,PALETTE=[0xe28cff,0xb65cff,0x65edff,0xff9bdc,0xffe58a];
function roundedStar(){
 const corners=Array.from({length:10},(_,i)=>{const angle=Math.PI/2+i*Math.PI/5,r=i%2?.64:1;return new THREE.Vector2(Math.cos(angle)*r,Math.sin(angle)*r);}),shape=new THREE.Shape();
 for(let i=0;i<10;i++){const corner=corners[i],before=corner.clone().lerp(corners[(i+9)%10],.24),after=corner.clone().lerp(corners[(i+1)%10],.24);if(i===0)shape.moveTo(before.x,before.y);else shape.lineTo(before.x,before.y);shape.quadraticCurveTo(corner.x,corner.y,after.x,after.y);}shape.closePath();
 const geometry=new THREE.ShapeGeometry(shape,4),flat=geometry.index?geometry.toNonIndexed():geometry,vertices=flat.getAttribute('position').array.slice();if(flat!==geometry)flat.dispose();geometry.dispose();return vertices;
}
const STAR=roundedStar();
const GLITCH=new Float32Array([-.9,-.25,0,.25,-.25,0,.25,.15,0,-.9,-.25,0,.25,.15,0,-.9,.15,0, -.15,.25,0,.9,.25,0,.9,.55,0,-.15,.25,0,.9,.55,0,-.15,.55,0, .3,-.65,0,.7,-.65,0,.7,-.4,0,.3,-.65,0,.7,-.4,0,.3,-.4,0]);

// Opaque camera-facing shapes pop/shrink away; one reusable batch for every seat.
export class BananaSprites{
 constructor(root){
  this.root=root;this.cursor=0;this.items=Array.from({length:CAPACITY},()=>({life:0,total:1,owner:null,kind:0,p:new THREE.Vector3(),v:new THREE.Vector3(),color:new THREE.Color(),size:0,angle:0,spin:0,seed:0}));
  this.emitters=Array.from({length:4},()=>({actor:null,next:0,births:0,last:new THREE.Vector3()}));
  this.geometry=new THREE.BufferGeometry();for(const name of ['position','color'])this.geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(CAPACITY*STAR.length),3).setUsage(THREE.DynamicDrawUsage));this.geometry.setDrawRange(0,0);
  this.material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.name='banana-cartoon-sprites';this.mesh.visible=false;this.mesh.frustumCulled=false;this.group=new THREE.Group();this.group.name='banana-sprite-vfx';this.group.add(this.mesh);root.add(this.group);
  this.inverse=new THREE.Matrix4();this.center=new THREE.Vector3();this.right=new THREE.Vector3();this.up=new THREE.Vector3();this.across=new THREE.Vector3();this.along=new THREE.Vector3();this.rotation=new THREE.Quaternion();this.parentRotation=new THREE.Quaternion();
 }
 clearActor(actor){for(const item of this.items)if(item.owner===actor){item.life=0;item.owner=null;}for(const emitter of this.emitters)if(emitter.actor===actor)emitter.actor=null;}
 emit(actor,center,kind){
  const item=this.items.find(p=>p.life<=0)||this.items[this.cursor++%CAPACITY],angle=Math.random()*Math.PI*2,radius=.4+Math.random()*.35;
  item.owner=actor;item.kind=kind;item.life=item.total=kind?.18+Math.random()*.12:.4+Math.random()*.24;item.size=kind?.08+Math.random()*.07:.09+Math.pow(Math.random(),1.5)*.17;
  item.p.copy(center);item.p.x+=Math.cos(angle)*radius;item.p.z+=Math.sin(angle)*radius;item.p.y+=.45+Math.random()*.85;
  item.v.set(Math.cos(angle)*(.6+Math.random()*.7),.7+Math.random()*.9,Math.sin(angle)*(.6+Math.random()*.7));item.angle=Math.random()*6.28;item.spin=(Math.random()-.5)*7;item.seed=Math.random()*20;item.color.set(PALETTE[Math.floor(Math.random()*PALETTE.length)]);
 }
 actor(actor,state,dt,{reduced=false}={}){
  if(reduced||state.caught||state.captureRemaining>0){this.clearActor(actor);return;}
  let emitter=this.emitters.find(e=>e.actor===actor);
  if(state.effect!=='banana'||!(state.effectTime>0)){if(emitter)emitter.actor=null;return;}
  this.root.updateWorldMatrix(true,false);this.inverse.copy(this.root.matrixWorld).invert();actor.group.getWorldPosition(this.center).applyMatrix4(this.inverse);
  if(emitter&&(!Number.isFinite(dt)||dt>.15||this.center.distanceToSquared(emitter.last)>9)){this.clearActor(actor);emitter=null;}
  if(!emitter){emitter=this.emitters.find(e=>!e.actor);if(!emitter)return;emitter.actor=actor;emitter.next=.12;emitter.births=0;this.emit(actor,this.center,0);this.emit(actor,this.center,0);}
  else{emitter.next-=Math.max(0,Math.min(.1,dt));if(emitter.next<=0){this.emit(actor,this.center,++emitter.births%3===0?1:0);emitter.next+=.12+Math.random()*.06;}}
  emitter.last.copy(this.center);
 }
 update(dt,camera){
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  if(camera){camera.getWorldQuaternion(this.rotation);this.root.getWorldQuaternion(this.parentRotation).invert();this.rotation.premultiply(this.parentRotation);}
  this.right.set(1,0,0).applyQuaternion(this.rotation);this.up.set(0,1,0).applyQuaternion(this.rotation);
  const positions=this.geometry.getAttribute('position'),colors=this.geometry.getAttribute('color');let count=0;
  for(const item of this.items){if(item.life<=0)continue;item.life=Math.max(0,item.life-step);if(!item.life){item.owner=null;continue;}const age=item.total-item.life;
   item.v.y-=2.5*step;item.p.addScaledVector(item.v,step);item.angle+=item.spin*step;
   const size=item.size*Math.min(1,age/.045,item.life/.1),cos=Math.cos(item.angle),sin=Math.sin(item.angle);this.across.copy(this.right).multiplyScalar(cos).addScaledVector(this.up,sin);this.along.copy(this.up).multiplyScalar(cos).addScaledVector(this.right,-sin);
   const jitter=item.kind?Math.sin(Math.floor(age*22)+item.seed)*.07:0,vertices=item.kind?GLITCH:STAR;
   for(let i=0;i<vertices.length;i+=3){const x=vertices[i]*size+jitter,y=vertices[i+1]*size;positions.setXYZ(count,item.p.x+this.across.x*x+this.along.x*y,item.p.y+this.across.y*x+this.along.y*y,item.p.z+this.across.z*x+this.along.z*y);colors.setXYZ(count,item.color.r,item.color.g,item.color.b);count++;}

  }
  positions.needsUpdate=colors.needsUpdate=true;this.geometry.setDrawRange(0,count);this.mesh.visible=count>0;
 }
 clear(){for(const item of this.items){item.life=0;item.owner=null;}for(const emitter of this.emitters)emitter.actor=null;this.geometry.setDrawRange(0,0);this.mesh.visible=false;}
}
