import * as THREE from 'three';

const palette=[0xffce35,0xff62a7,0x35dfff,0x9b80ff,0x78ef83,0xff8c35];
const corners=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];

// Confetti, launch trails and firework rays share one dynamic batch/draw call.
// Fixed particle and delayed-burst limits keep simultaneous celebrations bounded.
export class CelebrationVFX{
 constructor(root,{capacity=256}={}){
  this.root=root;this.capacity=capacity;this.cursor=0;this.pending=[];
  this.items=Array.from({length:capacity},()=>({life:0,total:1,p:new THREE.Vector3(),v:new THREE.Vector3(),color:new THREE.Color(),rotation:new THREE.Euler(),spin:0,size:0,kind:0}));
  this.geometry=new THREE.BufferGeometry();
  for(const [name,size] of [['position',3],['color',3],['alpha',1],['kind',1],['uv',2]])this.geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(capacity*6*size),size).setUsage(THREE.DynamicDrawUsage));
  const uv=this.geometry.getAttribute('uv');for(let i=0;i<capacity;i++)corners.forEach(([x,y],j)=>uv.setXY(i*6+j,(x+1)/2,(y+1)/2));
  this.geometry.setDrawRange(0,0);
  this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
   vertexShader:`attribute vec3 color;attribute float alpha;attribute float kind;varying vec3 vColor;varying float vAlpha;varying float vKind;varying vec2 vUv;
    void main(){vColor=color;vAlpha=alpha;vKind=kind;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
   fragmentShader:`varying vec3 vColor;varying float vAlpha;varying float vKind;varying vec2 vUv;
    void main(){float edge=1.0;vec3 color=vColor;if(vKind>.5){vec2 p=abs(vUv-.5);edge=(1.0-smoothstep(.2,.5,p.x))*(1.0-smoothstep(.25,.5,p.y));color=mix(vColor,vec3(1.0),pow(1.0-p.y*2.0,5.0)*.7);}gl_FragColor=vec4(color,vAlpha*edge);if(gl_FragColor.a<.01)discard;
    #include <colorspace_fragment>
   }`});
  this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.name='celebration-particle-batch';this.mesh.frustumCulled=false;
  this.group=new THREE.Group();this.group.name='celebration-vfx';this.group.visible=false;this.group.add(this.mesh);root.add(this.group);
  this.cameraRotation=new THREE.Quaternion();this.q=new THREE.Quaternion();this.right=new THREE.Vector3(1,0,0);this.up=new THREE.Vector3(0,1,0);this.across=new THREE.Vector3();this.along=new THREE.Vector3();
 }
 emit(kind,p,v,life,size,color){
  const item=this.items.find(x=>x.life<=0)||this.items[this.cursor++%this.capacity];
  item.life=item.total=life;item.p.copy(p);item.v.copy(v);item.kind=kind;item.size=size;item.color.set(color);
  item.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);item.spin=(Math.random()-.5)*14;return item;
 }
 celebrate(position,{gold=false}={}){
  const p=position.clone();p.y+=.35;
  for(let i=0;i<26;i++){
   const angle=i/26*Math.PI*2,speed=.8+Math.random()*1.4;
   this.emit(0,p,new THREE.Vector3(Math.cos(angle)*speed,2.5+Math.random()*2.2,Math.sin(angle)*speed),1.05+Math.random()*.4,.055+Math.random()*.035,gold&&i%2===0?0xffce35:palette[i%palette.length]);
  }
  for(let i=0;i<2;i++){
   const delay=.18+i*.17,base=p.clone();base.x+=(i?1:-1)*.42;
   const launch=this.emit(1,base,new THREE.Vector3(0,4,0),delay,.025,i?0x35dfff:0xffce35);
   const peak=base.clone();peak.y+=4*delay-.5*1.2*delay*delay;
   if(this.pending.length>=16)this.pending.shift();this.pending.push({time:delay,position:peak,color:palette[(i+(gold?0:1))%palette.length]});
   launch.rotation.set(0,0,0);
  }
  this.group.visible=true;
 }
 firework(position,color){
  for(let i=0;i<18;i++){
   const angle=i/18*Math.PI*2,speed=1.7+Math.random()*.8;
   const velocity=this.right.clone().multiplyScalar(Math.cos(angle)*speed).addScaledVector(this.up,Math.sin(angle)*speed);
   this.emit(1,position,velocity,.42+Math.random()*.23,.025,i%4===0?0xffffff:color);
  }
 }
 update(dt,camera){
  dt=Math.min(Math.max(dt||0,0),.1);
  if(camera){camera.getWorldQuaternion(this.cameraRotation);this.root.getWorldQuaternion(this.q).invert();this.cameraRotation.premultiply(this.q);}
  if(!this.group.visible)return;
  this.right.set(1,0,0).applyQuaternion(this.cameraRotation);this.up.set(0,1,0).applyQuaternion(this.cameraRotation);
  const ready=[];for(const burst of this.pending){burst.time-=dt;if(burst.time<=0)ready.push(burst);}
  this.pending=this.pending.filter(b=>b.time>0);
  const positions=this.geometry.getAttribute('position'),colors=this.geometry.getAttribute('color'),alphas=this.geometry.getAttribute('alpha'),kinds=this.geometry.getAttribute('kind');
  let count=0;
  for(const item of this.items){
   if(item.life<=0)continue;item.life=Math.max(0,item.life-dt);if(!item.life)continue;
   const age=1-item.life/item.total;item.v.y-=(item.kind?1.2:4.5)*dt;item.v.x*=Math.exp(-dt*.55);item.v.z*=Math.exp(-dt*.55);item.p.addScaledVector(item.v,dt);
   if(item.kind){
    let x=item.v.dot(this.right),y=item.v.dot(this.up),length=Math.hypot(x,y);if(length<.001){x=0;y=1;length=1;}
    this.along.copy(this.right).multiplyScalar(x/length).addScaledVector(this.up,y/length).multiplyScalar(.07+Math.min(length,4)*.025);
    this.across.copy(this.right).multiplyScalar(-y/length).addScaledVector(this.up,x/length).multiplyScalar(item.size);
   }else{
    item.rotation.x+=item.spin*dt;item.rotation.y+=dt*2;item.rotation.z+=item.spin*.6*dt;this.q.setFromEuler(item.rotation);
    this.across.set(item.size,0,0).applyQuaternion(this.q);this.along.set(0,item.size*.55,0).applyQuaternion(this.q);
   }
   const alpha=item.kind?Math.pow(1-age,.7):Math.min(1,item.life/.3);
   for(let j=0;j<6;j++){
    const n=count*6+j,[x,y]=corners[j];positions.setXYZ(n,item.p.x+this.across.x*x+this.along.x*y,item.p.y+this.across.y*x+this.along.y*y,item.p.z+this.across.z*x+this.along.z*y);
    colors.setXYZ(n,item.color.r,item.color.g,item.color.b);alphas.setX(n,alpha);kinds.setX(n,item.kind);
   }count++;
  }
  for(const burst of ready)this.firework(burst.position,burst.color);
  for(const attribute of [positions,colors,alphas,kinds])attribute.needsUpdate=true;
  this.geometry.setDrawRange(0,count*6);this.group.visible=count>0||this.pending.length>0||ready.length>0;
 }
 clear(){for(const item of this.items)item.life=0;this.pending.length=0;this.geometry.setDrawRange(0,0);this.group.visible=false;}
}

// Numeric snapshots avoid mutable-round aliasing and repeated empty-cache bursts.
export class CacheCompletionTracker{
 constructor(){this.remaining=new Map();}
 update(caches,onEmpty,{initial=false}={}){
  const ids=new Set(caches.map(c=>c.id));for(const id of this.remaining.keys())if(!ids.has(id))this.remaining.delete(id);
  for(const cache of caches){const before=this.remaining.get(cache.id);this.remaining.set(cache.id,cache.remaining);if(!initial&&before>0&&cache.remaining<=0)onEmpty(cache);}
 }
 clear(){this.remaining.clear();}
}
