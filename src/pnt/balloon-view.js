import * as THREE from 'three';
import {BALLOON_ARENA_RADIUS,BALLOON_RADIUS,BALLOON_HEIGHT,BALLOON_SPHERE_RADIUS,BALLOON_MAX_SPHERES,BALLOON_COUNT} from './balloon-rules.js';
import {PLAYER_COLORS} from './diretide-rules.js';

const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,metalness:0,roughness:.3,...extra});
function groundAO(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');
 // Immutable AO-only bake: neutral white centre, soft border contact occlusion.
 const shade=ctx.createRadialGradient(256,256,0,256,256,256);
 shade.addColorStop(0,'#ffffff');shade.addColorStop(.87,'#ffffff');shade.addColorStop(.95,'#dedede');shade.addColorStop(1,'#888888');
 ctx.fillStyle=shade;ctx.fillRect(0,0,512,512);
 const texture=new THREE.CanvasTexture(canvas);texture.channel=1;texture.colorSpace=THREE.NoColorSpace;return texture;
}
function balloonGeometry(){
 const geometry=new THREE.SphereGeometry(BALLOON_RADIUS,24,16),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),t=y/BALLOON_RADIUS,taper=t<0?1+t*.3:1;p.setXYZ(i,p.getX(i)*taper,y*(t<0?1.45:1.1),p.getZ(i)*taper);}
 geometry.computeVertexNormals();return geometry;
}
function arena(root){
 const ao=groundAO(),floorMaterial=material(0xedb85c,{aoMap:ao,aoMapIntensity:.85}),geometry=new THREE.CylinderGeometry(BALLOON_ARENA_RADIUS,BALLOON_ARENA_RADIUS,.48,64);
 const uv=geometry.attributes.uv.clone(),p=geometry.attributes.position;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/(BALLOON_ARENA_RADIUS*2)+.5,p.getZ(i)/(BALLOON_ARENA_RADIUS*2)+.5);geometry.setAttribute('uv1',uv);
 const floor=new THREE.Mesh(geometry,floorMaterial);floor.name='BalloonSandGround';floor.position.y=-.29;floor.receiveShadow=true;root.add(floor);
 const flowTime={value:0};floorMaterial.onBeforeCompile=shader=>{
  shader.uniforms.sandFlowTime=flowTime;
  shader.vertexShader='varying vec2 sandUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   sandUv=position.xz/${(BALLOON_ARENA_RADIUS*2).toFixed(2)}+vec2(0.5);
  `);
  shader.fragmentShader='uniform float sandFlowTime;\nvarying vec2 sandUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 sandP=sandUv-vec2(0.5);
   float sandR=length(sandP);
   float sandAngle=atan(sandP.y,sandP.x);
   float sandPhase=sandR*110.0+sandFlowTime*2.6+sin(sandAngle*5.0+sandR*12.0)*0.55;
   float sandBands=sin(sandPhase)*0.16+sin(sandPhase*2.13+sandAngle*9.0)*0.045;
   diffuseColor.rgb*=1.0+sandBands*smoothstep(0.015,0.07,sandR);
  `);
  // Keep Mall diffuse lighting and shadows, but suppress specular glare on sand.
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
   reflectedLight.directSpecular=vec3(0.0);
   reflectedLight.indirectSpecular=vec3(0.0);
  `);
 };floorMaterial.customProgramCacheKey=()=> 'balloon-inward-matte-sand-v2';
 const colors=[0xff9f43,0xffd166,0x36c9c6,0xef638c,0x8c6ddd,0x62d07b];const borderGeometry=new THREE.BoxGeometry(2.74,1.05,.72),borderMaterials=colors.map(color=>material(color));
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2,block=new THREE.Mesh(borderGeometry,borderMaterials[i%colors.length]);block.position.set(Math.sin(a)*(BALLOON_ARENA_RADIUS+.34),.22,Math.cos(a)*(BALLOON_ARENA_RADIUS+.34));block.rotation.y=a;block.castShadow=block.receiveShadow=true;root.add(block);}
 return {ao,flowTime};
}
function balloonSet(root,id,geometry,knotGeometry,stringGeometry){
 const color=PLAYER_COLORS[id],group=new THREE.Group();
 const skin=material(color),balloon=new THREE.Mesh(geometry,skin);balloon.castShadow=true;group.add(balloon);
 const knot=new THREE.Mesh(knotGeometry,skin);knot.position.y=-1.04;knot.rotation.z=Math.PI;group.add(knot);
 const string=new THREE.Line(stringGeometry,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.75}));group.add(string);root.add(group);
 return {group,pop:0,intact:null};
}
export function createBalloonView(parent){
 const root=new THREE.Group(),stage=arena(root),geometry=balloonGeometry(),knotGeometry=new THREE.ConeGeometry(.11,.18,10);
 const stringGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-1.1,0),new THREE.Vector3(0,-1.5,0)]);
 const sets=Array.from({length:4},(_,i)=>Array.from({length:BALLOON_COUNT},()=>balloonSet(root,i,geometry,knotGeometry,stringGeometry)));
 const sphereGeometry=new THREE.SphereGeometry(BALLOON_SPHERE_RADIUS,20,14);
 const sphereMaterials=[0x9d5549,0x4e6184,0x447571,0x747746,0x735d7f,0x9b6741].map(color=>material(color,{roughness:.8}));
 const spheres=Array.from({length:BALLOON_MAX_SPHERES},()=>{const mesh=new THREE.Mesh(sphereGeometry,sphereMaterials[0]);mesh.visible=false;root.add(mesh);return mesh;});
 parent.add(root);let time=0;
 return {root,update(round,dt,avatars,onPop){
  time+=dt;stage.flowTime.value=time;
  for(const state of round.actors){
   const actor=avatars?.[state.id],position=actor?.group.position;if(!position)continue;
   const pair=sets[state.seat??state.id];
   for(const [slot,set] of pair.entries()){
    const intact=slot<state.balloons;
    set.group.position.set(position.x+(slot-.5)*1.44,position.y+BALLOON_HEIGHT+Math.sin(time*3.2+state.id+slot)*.065,position.z);
    if(set.intact&&!intact){set.pop=.22;if(!state.eliminated)onPop?.(set.group.position);}
    set.intact=intact;
    set.pop=Math.max(0,set.pop-dt);
    set.group.visible=intact||set.pop>0;
    set.group.scale.setScalar(intact?1:1+(1-set.pop/.22)*.65);
   }
  }
  for(const [index,mesh] of spheres.entries()){
   const sphere=round.spheres[index];mesh.visible=!!sphere;if(!sphere)continue;
   mesh.material=sphereMaterials[(sphere.id-1)%sphereMaterials.length];
   if(mesh.userData.sphereId!==sphere.id){mesh.userData.sphereId=sphere.id;mesh.position.set(sphere.x,sphere.y,sphere.z);}
   else if(dt>0){const blend=1-Math.exp(-35*dt);mesh.position.x+=(sphere.x-mesh.position.x)*blend;mesh.position.y+=(sphere.y-mesh.position.y)*blend;mesh.position.z+=(sphere.z-mesh.position.z)*blend;}
  }
 },hammer(){},dispose(){
  root.removeFromParent();stage.ao.dispose();
  const geometries=new Set(),materials=new Set(sphereMaterials);
  root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});
  for(const resource of [...geometries,...materials])resource.dispose();
 }};
}
