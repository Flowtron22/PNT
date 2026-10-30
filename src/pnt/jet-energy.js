import * as THREE from 'three';
import {assetURL} from './asset-url.js';

const CAPACITY=192,PALETTE=[0xf321ed,0xa346ff,0xff54cf,0x8cfaff];
const VERT=`attribute vec3 color;attribute float age;attribute float kind;
varying vec2 vUv;varying vec3 vColor;varying float vAge;varying float vKind;
void main(){vUv=uv;vColor=color;vAge=age;vKind=kind;
gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FRAG=`uniform sampler2D atlas;uniform sampler2D flow;uniform float time;
varying vec2 vUv;varying vec3 vColor;varying float vAge;varying float vKind;
float frameMask(float frame,vec2 uv){
 vec2 cell=vec2(mod(frame,4.),3.-floor(frame/4.));
 vec3 masks=texture2D(atlas,(cell+clamp(uv,vec2(.035),vec2(.965)))/4.).rgb;
 return vKind<.5?masks.r:vKind<1.5?masks.g:masks.b;
}
void main(){
 vec3 noise=texture2D(flow,vUv*1.6+vec2(time*.18,-time*.63)).rgb;
 float mask;
 if(vKind>2.5){mask=1.;}
 else{
  vec2 uv=vUv+(noise.rg-.5)*.045;
  float frame=clamp(vAge*15.,0.,15.);
  mask=mix(frameMask(floor(frame),uv),frameMask(min(15.,floor(frame)+1.),uv),fract(frame));
  float erosion=smoothstep(.55,1.,vAge)*.85;
  mask*=smoothstep(erosion,erosion+.16,noise.b);
 }
 float fade=smoothstep(0.,.08,vAge)*(1.-smoothstep(.62,1.,vAge));
 float alpha=mask*fade;if(alpha<.035)discard;
 vec3 hot=mix(vColor,vec3(1.,.94,1.),smoothstep(.77,1.,mask)*.8);
 gl_FragColor=vec4(hot,alpha);
 #include <colorspace_fragment>
}`;
let textures;
function energyTextures(){
 if(textures)return textures;
 const fallback=()=>{if(typeof document!=='undefined'){const t=new THREE.Texture();t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;}const t=new THREE.DataTexture(new Uint8Array([180,180,180,255]),1,1);t.needsUpdate=true;return t;};
 textures={atlas:fallback(),flow:fallback()};
 textures.flow.wrapS=textures.flow.wrapT=THREE.RepeatWrapping;
 if(typeof document!=='undefined'){
  const loader=new THREE.TextureLoader();
  loader.load(assetURL('../../assets/pnt/vfx/jet-energy-flipbook.png',import.meta.url),t=>{textures.atlas.image=t.image;textures.atlas.needsUpdate=true;t.dispose();},undefined,()=>{});
  loader.load(assetURL('../../assets/pnt/vfx/jet-energy-noise.png',import.meta.url),t=>{textures.flow.image=t.image;textures.flow.needsUpdate=true;t.dispose();},undefined,()=>{});
 }
 // Keep stable texture references when the image decodes asynchronously.
 return textures;
}

export class JetEnergy{
 constructor(root){
  this.root=root;this.cursor=0;this.time=0;this.emitters=new Map();
  this.items=Array.from({length:CAPACITY},()=>({life:0,total:1,owner:null,p:new THREE.Vector3(),v:new THREE.Vector3(),axis:new THREE.Vector3(),color:new THREE.Color(),kind:0,size:0,angle:0,spin:0}));
  const geometry=this.geometry=new THREE.BufferGeometry();
  for(const [name,size] of [['position',3],['uv',2],['color',3],['age',1],['kind',1]])geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(CAPACITY*6*size),size).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0,0);
  const maps=energyTextures();
  this.material=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,uniforms:{atlas:{value:maps.atlas},flow:{value:maps.flow},time:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.name='jet-energy-flipbook';this.mesh.frustumCulled=false;this.mesh.visible=false;
  this.group=new THREE.Group();this.group.name='jet-energy-vfx';this.group.add(this.mesh);root.add(this.group);
  this.center=new THREE.Vector3();this.axis=new THREE.Vector3();this.worldRotation=new THREE.Quaternion();this.rotation=new THREE.Quaternion();this.parentRotation=new THREE.Quaternion();this.inverse=new THREE.Matrix4();
  this.right=new THREE.Vector3();this.up=new THREE.Vector3();this.across=new THREE.Vector3();this.along=new THREE.Vector3();this.corner=new THREE.Vector3();
 }
 emit(actor,p,axis,kind){
  const item=this.items.find(x=>x.life<=0)||this.items[this.cursor++%CAPACITY];
  item.owner=actor;item.kind=kind;item.life=item.total=kind===0?.26:kind===1?.36:kind===2?.24:.3+Math.random()*.22;
  item.size=kind===0?.3:kind===1?.28:kind===2?.65:.035+Math.random()*.045;
  item.p.copy(p);item.axis.copy(axis);item.v.copy(axis).multiplyScalar(kind===0?2.6:kind===1?1.1:kind===2?.2:2.4);
  if(kind===3){item.v.x+=(Math.random()-.5)*3.4;item.v.y+=(Math.random()-.5)*1.7;item.v.z+=(Math.random()-.5)*2.4;item.p.addScaledVector(item.v,.12);}
  if(kind===0)item.p.addScaledVector(axis,.66);
  item.angle=Math.random()*Math.PI*2;item.spin=kind===1?(Math.random()>.5?2:-2):kind===3?2:0;
  item.color.set(kind===0?0xff2cdd:kind===2?0xffa6f7:PALETTE[Math.floor(Math.random()*PALETTE.length)]);
 }
 clearActor(actor){for(const item of this.items)if(item.owner===actor){item.life=0;item.owner=null;}this.emitters.delete(actor);}
 actor(actor,state,dt,{reduced=false}={}){
  if(reduced||state.caught||state.captureRemaining>0){this.clearActor(actor);return;}
  if(state.effect!=='rocket'||!(state.effectTime>0)){this.emitters.delete(actor);return;}
  this.root.updateWorldMatrix(true,false);this.inverse.copy(this.root.matrixWorld).invert();
  const nozzle=actor.jetpackNozzle;
  if(nozzle){nozzle.getWorldPosition(this.center).applyMatrix4(this.inverse);nozzle.getWorldQuaternion(this.worldRotation);this.axis.set(0,-1,0).applyQuaternion(this.worldRotation).transformDirection(this.inverse);}
  else{actor.group.getWorldPosition(this.center).applyMatrix4(this.inverse);this.center.y+=.65;const angle=actor.group.rotation.y;this.axis.set(-Math.sin(angle)*.4,-1,-Math.cos(angle)*.4).normalize();}
  let emitter=this.emitters.get(actor);
  if(emitter&&(!Number.isFinite(dt)||dt>.2||emitter.last.distanceToSquared(this.center)>9)){this.clearActor(actor);emitter=null;}
  if(!emitter){emitter={next:0,births:0,last:this.center.clone()};this.emitters.set(actor,emitter);this.emit(actor,this.center,this.axis,2);}
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;emitter.next-=step;
  for(let n=0;emitter.next<=0&&n<3;n++,emitter.next+=.065){
   const fraction=step?THREE.MathUtils.clamp(1+emitter.next/step,0,1):1;
   this.corner.copy(emitter.last).lerp(this.center,fraction);
   if(emitter.births++%2===0){this.emit(actor,this.corner,this.axis,0);this.emit(actor,this.corner,this.axis,1);for(let i=0;i<3;i++)this.emit(actor,this.corner,this.axis,3);}
  }
  emitter.last.copy(this.center);
 }
 update(dt,camera){
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;this.time=(this.time+step)%1000;this.material.uniforms.time.value=this.time;
  if(camera){camera.getWorldQuaternion(this.rotation);this.root.getWorldQuaternion(this.parentRotation).invert();this.rotation.premultiply(this.parentRotation);}
  this.right.set(1,0,0).applyQuaternion(this.rotation);this.up.set(0,1,0).applyQuaternion(this.rotation);
  const a=this.geometry.attributes;let count=0;
  for(const item of this.items){
   if(item.life<=0)continue;item.life=Math.max(0,item.life-step);if(!item.life){item.owner=null;continue;}
   const age=1-item.life/item.total;item.p.addScaledVector(item.v,step);item.angle+=item.spin*step;
   let width=item.size*(item.kind===1?1+age*2:item.kind===2?1+age*.8:1-age*.35),height=width;
   if(item.kind===0){height*=2.1;const x=item.axis.dot(this.right),y=item.axis.dot(this.up),length=Math.hypot(x,y);if(length>.05){this.along.copy(this.right).multiplyScalar(-x/length).addScaledVector(this.up,-y/length);this.across.copy(this.right).multiplyScalar(-y/length).addScaledVector(this.up,x/length);}else{this.along.copy(this.up);this.across.copy(this.right);}}
   else{const c=Math.cos(item.angle),s=Math.sin(item.angle);this.across.copy(this.right).multiplyScalar(c).addScaledVector(this.up,s);this.along.copy(this.up).multiplyScalar(c).addScaledVector(this.right,-s);}
   for(const [u,v] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]){
    this.corner.copy(item.p).addScaledVector(this.across,(u-.5)*width*2).addScaledVector(this.along,(v-.5)*height*2);
    a.position.setXYZ(count,this.corner.x,this.corner.y,this.corner.z);a.uv.setXY(count,u,v);a.color.setXYZ(count,item.color.r,item.color.g,item.color.b);a.age.setX(count,age);a.kind.setX(count,item.kind);count++;
   }
  }
  for(const attr of Object.values(a))attr.needsUpdate=true;this.geometry.setDrawRange(0,count);this.mesh.visible=count>0;
 }
 clear(){for(const item of this.items){item.life=0;item.owner=null;}this.emitters.clear();this.geometry.setDrawRange(0,0);this.mesh.visible=false;}
}
