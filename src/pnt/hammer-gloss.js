import * as THREE from 'three';

const CAPACITY=96,CORNERS=[[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]];
const VERT=`attribute float age;attribute float kind;varying vec2 vUv;varying float vAge;varying float vKind;
void main(){vUv=uv;vAge=age;vKind=kind;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FRAG=`uniform sampler2D atlas;uniform sampler2D flow;
varying vec2 vUv;varying float vAge;varying float vKind;
float sampleFrame(float f,vec2 uv){vec2 cell=vec2(mod(f,4.),3.-floor(f/4.));
 vec3 mask=texture2D(atlas,(cell+clamp(uv,vec2(.025),vec2(.975)))/4.).rgb;
 return vKind<.5?mask.r:vKind<1.5?mask.g:mask.b;}
void main(){
 vec3 noise=texture2D(flow,vUv*1.8+vec2(vAge*.13,-vAge*.27)).rgb;
 // A very small warp keeps the authored hard corners legible.
 vec2 uv=vUv+(noise.rg-.5)*.012;
 float f=clamp(vAge*15.,0.,15.);
 float mask=mix(sampleFrame(floor(f),uv),sampleFrame(min(15.,floor(f)+1.),uv),fract(f));
 float erosion=smoothstep(.65,1.,vAge)*.82;
 float coverage=vKind>.5&&vKind<1.5?mask:smoothstep(.06,.27,mask);
 float alpha=coverage*smoothstep(erosion,erosion+.13,noise.b);
 float fade=smoothstep(0.,.035,vAge)*(1.-smoothstep(.56,1.,vAge));
 vec3 pink=vec3(.96,.075,.43),lemon=vec3(1.,.96,.24),mint=vec3(.08,.91,.3);
 vec3 color=vKind<.5?mix(pink,lemon,smoothstep(.78,.96,mask)):
  vKind<1.5?mix(mint,vec3(.36,1.,.72),mask):mix(lemon,mint,smoothstep(.75,.97,mask));
 if(vKind>.5&&vKind<1.5)alpha*=.38;
 alpha*=fade;if(alpha<.025)discard;gl_FragColor=vec4(color,alpha);
 #include <colorspace_fragment>
}`;
let textures;
function maps(){
 if(textures)return textures;
 const texture=()=>{if(typeof document!=='undefined')return new THREE.Texture();const t=new THREE.DataTexture(new Uint8Array([180,180,180,255]),1,1);t.needsUpdate=true;return t;};
 textures={atlas:texture(),flow:texture()};
 for(const t of Object.values(textures)){t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;}
 textures.flow.wrapS=textures.flow.wrapT=THREE.RepeatWrapping;
 if(typeof document!=='undefined'){
  const loader=new THREE.TextureLoader();
  for(const [key,path] of [['atlas','hammer-gloss-flipbook.png'],['flow','jet-energy-noise.png']])loader.load(new URL(`../../assets/pnt/vfx/${path}`,import.meta.url).href,t=>{textures[key].image=t.image;textures[key].needsUpdate=true;t.dispose();},undefined,()=>{});
 }
 return textures;
}

// Ground petals/fans and camera-facing sparkles share one independent batch.
export class HammerGloss{
 constructor(root){
  this.root=root;this.cursor=0;
  this.items=Array.from({length:CAPACITY},()=>({life:0,total:1,p:new THREE.Vector3(),v:new THREE.Vector3(),kind:0,size:0,angle:0,spin:0}));
  this.geometry=new THREE.BufferGeometry();
  for(const [name,size] of [['position',3],['uv',2],['age',1],['kind',1]])this.geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(CAPACITY*6*size),size).setUsage(THREE.DynamicDrawUsage));
  this.geometry.setDrawRange(0,0);const textures=maps();
  this.material=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,uniforms:{atlas:{value:textures.atlas},flow:{value:textures.flow}},transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.name='hammer-gloss-flipbook';this.mesh.visible=false;this.mesh.frustumCulled=false;this.mesh.renderOrder=3;
  this.group=new THREE.Group();this.group.name='hammer-gloss-vfx';this.group.add(this.mesh);root.add(this.group);
  this.rotation=new THREE.Quaternion();this.parentRotation=new THREE.Quaternion();this.right=new THREE.Vector3();this.up=new THREE.Vector3();this.across=new THREE.Vector3();this.along=new THREE.Vector3();this.corner=new THREE.Vector3();
 }
 emit(position,kind,size,life,angle){
  const item=this.items.find(i=>i.life<=0)||this.items[this.cursor++%CAPACITY];
  item.p.copy(position);item.p.y+=kind===1?.015:kind===0?.025:.12;
  item.kind=kind;item.size=size;item.life=item.total=life;item.angle=angle;item.spin=kind>=2?(Math.random()-.5)*1.8:0;item.v.set(0,0,0);return item;
 }
 hit(position,{reduced=false}={}){
  if(reduced)return;
  const angle=Math.random()*Math.PI*2;
  // Draw background first, then the hollow pink petals, then sparkles.
  this.emit(position,1,3.65,.59,angle);
  this.emit(position,0,3.8,.66,angle);
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7+angle,r=1.3+Math.random()*.7;
   const item=this.emit(position,2,.19+Math.random()*.13,.4+Math.random()*.23,Math.random()*.5);
   item.p.x+=Math.cos(a)*r;item.p.z+=Math.sin(a)*r;
   item.v.set(Math.cos(a)*(1.2+Math.random()),1.5+Math.random()*1.2,Math.sin(a)*(1.2+Math.random()));
  }
 }
 update(dt,camera){
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  if(camera){camera.getWorldQuaternion(this.rotation);this.root.getWorldQuaternion(this.parentRotation).invert();this.rotation.premultiply(this.parentRotation);}
  this.right.set(1,0,0).applyQuaternion(this.rotation);this.up.set(0,1,0).applyQuaternion(this.rotation);
  const a=this.geometry.attributes;let count=0;
  for(const item of this.items){
   if(item.life<=0)continue;item.life=Math.max(0,item.life-step);if(!item.life)continue;
   const age=1-item.life/item.total;item.angle+=item.spin*step;
   if(item.kind>=2){item.v.y-=2.4*step;item.p.addScaledVector(item.v,step);}
   const c=Math.cos(item.angle),s=Math.sin(item.angle);
   if(item.kind<2){this.across.set(c,0,-s);this.along.set(-s,0,-c);}
   else{this.across.copy(this.right).multiplyScalar(c).addScaledVector(this.up,s);this.along.copy(this.up).multiplyScalar(c).addScaledVector(this.right,-s);}
   const size=item.size*(item.kind>=2?Math.min(1,age/.08)*(1-age*.3):1);
   for(const [u,v] of CORNERS){
    this.corner.copy(item.p).addScaledVector(this.across,(u-.5)*size*2).addScaledVector(this.along,(v-.5)*size*2);
    a.position.setXYZ(count,this.corner.x,this.corner.y,this.corner.z);a.uv.setXY(count,u,v);a.age.setX(count,age);a.kind.setX(count,item.kind);count++;
   }
  }
  for(const attr of Object.values(a))attr.needsUpdate=true;this.geometry.setDrawRange(0,count);this.mesh.visible=count>0;
 }
 clear(){for(const item of this.items)item.life=0;this.geometry.setDrawRange(0,0);this.mesh.visible=false;}
}
