import * as THREE from 'three';
import {BananaSprites} from './banana-sprites.js';

const PLAYERS=4,STRANDS=2,STEP=1/60,LIFE=.34*3,SAMPLES=Math.ceil(LIFE/STEP)+2;
// Hand-mounted ribbons share one small dynamic mesh. History lives in map-local
// space, so moving/spinning avatars leave a trail rather than dragging a ring.
export class BananaTrails{
 constructor(root){
  this.root=root;this.sprites=new BananaSprites(root);this.slots=Array.from({length:PLAYERS},()=>({actor:null,active:false,next:0,hands:[],strands:Array.from({length:STRANDS},()=>({head:0,count:0,previous:new THREE.Vector3(),current:new THREE.Vector3(),points:Array.from({length:SAMPLES},()=>({p:new THREE.Vector3(),age:0}))}))}));
  this.geometry=new THREE.BufferGeometry();
  for(const [name,size]of [['position',3],['uv',2],['fade',1],['strand',1]])this.geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(PLAYERS*STRANDS*SAMPLES*2*size),size).setUsage(THREE.DynamicDrawUsage));
  const indices=[];for(let strip=0;strip<PLAYERS*STRANDS;strip++)for(let i=0;i<SAMPLES-1;i++){const a=(strip*SAMPLES+i)*2;indices.push(a,a+1,a+2,a+2,a+1,a+3);}this.geometry.setIndex(indices);this.geometry.setDrawRange(0,0);
  this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.NormalBlending,toneMapped:false,uniforms:{time:{value:0}},
   vertexShader:`uniform float time;attribute float fade;attribute float strand;varying vec2 vUv;varying float vFade;varying float vStrand;
    void main(){vUv=uv;vFade=fade;vStrand=strand;vec3 p=position;p.y+=sin(uv.x*13.0-time*12.0+strand*3.141593)*0.09*sin(uv.x*3.141593)*fade;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
   fragmentShader:`uniform float time;varying vec2 vUv;varying float vFade;varying float vStrand;
    void main(){
     float ripple=sin(vUv.x*23.0-time*19.0+vStrand*2.0)*0.13*sin(vUv.x*3.141593);
     float across=abs((vUv.y-0.5)*2.0+ripple);
     float edge=1.0-smoothstep(0.78,1.0,across);
     float core=1.0-smoothstep(0.06,0.34,across);
     vec3 purple=mix(vec3(0.12,0.002,0.65),vec3(0.42,0.008,1.0),1.0-vUv.x);
     vec3 color=mix(purple,vec3(0.66,0.10,1.0),core*0.9);
     float alpha=edge*vFade*0.95;if(alpha<0.008)discard;
     gl_FragColor=vec4(color,alpha);
     #include <colorspace_fragment>
    }`});
  this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.name='banana-spin-light-trails';this.mesh.frustumCulled=false;this.mesh.visible=false;this.group=new THREE.Group();this.group.name='banana-spin-vfx';this.group.add(this.mesh);root.add(this.group);
  this.inverse=new THREE.Matrix4();this.camera=new THREE.Vector3();this.tangent=new THREE.Vector3();this.view=new THREE.Vector3();this.side=new THREE.Vector3();this.sample=new THREE.Vector3();
 }
 reset(slot){slot.actor=null;slot.active=false;slot.next=0;slot.hands.length=0;for(const strand of slot.strands)strand.count=0;}
 push(strand,p,age=0){strand.head=(strand.head+1)%SAMPLES;const point=strand.points[strand.head];point.p.copy(p);point.age=age;strand.count=Math.min(SAMPLES,strand.count+1);}
 actor(actor,state,dt,{reduced=false}={}){
  this.sprites.actor(actor,state,dt,{reduced});
  let slot=this.slots.find(s=>s.actor===actor);
  const active=state.effect==='banana'&&state.effectTime>0&&!state.caught&&!(state.captureRemaining>0);
  if(reduced||state.caught||state.captureRemaining>0){if(slot)this.reset(slot);return;}
  if(!active){if(slot)slot.active=false;return;}
  if(!slot){slot=this.slots.find(s=>!s.actor);if(!slot)return;slot.actor=actor;actor.model?.traverse(node=>{if(!node.isBone)return;const name=node.name.replace(/[_\- ]/g,'').toLowerCase();if(name==='bip001lhand')slot.hands[0]=node;if(name==='bip001rhand')slot.hands[1]=node;});}
  actor.group.updateWorldMatrix(true,true);this.root.updateWorldMatrix(true,false);this.inverse.copy(this.root.matrixWorld).invert();
  for(let i=0;i<STRANDS;i++){const strand=slot.strands[i],hand=slot.hands[i];if(hand)hand.getWorldPosition(strand.current).applyMatrix4(this.inverse);else{strand.current.set(i?-.55:.55,.9,0);actor.group.localToWorld(strand.current).applyMatrix4(this.inverse);}}
  const gap=!slot.active||!Number.isFinite(dt)||dt>.15||slot.strands.some(s=>s.current.distanceToSquared(s.previous)>9);
  if(gap){for(const strand of slot.strands){strand.count=0;strand.previous.copy(strand.current);this.push(strand,strand.current);}slot.next=STEP;slot.active=true;return;}
  const elapsed=Math.max(0,Math.min(.1,dt));slot.next-=elapsed;
  for(let births=0;slot.next<=1e-8&&births<6;births++,slot.next+=STEP){
   const fraction=elapsed?THREE.MathUtils.clamp(1+slot.next/elapsed,0,1):1;
   // The shared update below ages these samples to their actual birth times.
   for(const strand of slot.strands){this.sample.lerpVectors(strand.previous,strand.current,fraction);this.push(strand,this.sample,-slot.next-elapsed);}
  }
  for(const strand of slot.strands)strand.previous.copy(strand.current);
 }
 update(dt,camera){
  this.sprites.update(dt,camera);
  const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;this.material.uniforms.time.value=(this.material.uniforms.time.value+elapsed)%1000;
  this.root.updateWorldMatrix(true,false);this.inverse.copy(this.root.matrixWorld).invert();if(camera)camera.getWorldPosition(this.camera).applyMatrix4(this.inverse);else this.camera.set(0,5,10);
  const positions=this.geometry.getAttribute('position'),uv=this.geometry.getAttribute('uv'),fade=this.geometry.getAttribute('fade'),strands=this.geometry.getAttribute('strand');let strip=0;
  for(const slot of this.slots){if(!slot.actor)continue;let alive=false;
   for(let k=0;k<STRANDS;k++){const strand=slot.strands[k],pointAt=i=>strand.points[(strand.head-i+SAMPLES)%SAMPLES];
    for(let i=0;i<strand.count;i++)pointAt(i).age+=elapsed;
    while(strand.count&&pointAt(strand.count-1).age>=LIFE)strand.count--;
    if(strand.count)alive=true;if(strand.count<2)continue;
    for(let i=0;i<SAMPLES;i++){
     const index=Math.min(i,strand.count-1),point=pointAt(index),u=index/(strand.count-1),strength=i<strand.count?THREE.MathUtils.clamp(1-point.age/LIFE,0,1):0;
     this.tangent.subVectors(pointAt(Math.max(0,index-1)).p,pointAt(Math.min(strand.count-1,index+1)).p);this.view.subVectors(this.camera,point.p);this.side.crossVectors(this.tangent,this.view);
     if(this.side.lengthSq()<1e-10)this.side.set(0,1,0);else this.side.normalize();
     // A broad .9-unit band reads as about half the 1.55-unit avatar height.
     // Age fades opacity; only the final third tapers the physical thickness.
     const width=.45*(1-THREE.MathUtils.smoothstep(u,.65,1));
     for(let edge=0;edge<2;edge++){const n=(strip*SAMPLES+i)*2+edge,sign=edge?1:-1;positions.setXYZ(n,point.p.x+this.side.x*width*sign,point.p.y+this.side.y*width*sign,point.p.z+this.side.z*width*sign);uv.setXY(n,u,edge);fade.setX(n,strength);strands.setX(n,k);}
    }strip++;
   }if(!alive)this.reset(slot);
  }
  for(const attribute of [positions,uv,fade,strands])attribute.needsUpdate=true;this.geometry.setDrawRange(0,strip*(SAMPLES-1)*6);this.mesh.visible=strip>0;
 }
 clear(){this.sprites.clear();for(const slot of this.slots)this.reset(slot);this.geometry.setDrawRange(0,0);this.mesh.visible=false;}
}
