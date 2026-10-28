import * as THREE from 'three';
export const OYEN_COATS=[{id:'original',name:'Original orange'},{id:'black',name:'Midnight black'},{id:'spots',name:'White & yellow spots'},{id:'stripes',name:'Tiger stripes'}];
export const OYEN_SKINS=[{id:'original',name:'Original face'},{id:'dark',name:'Dark skin'}];
export function normalizeOyenAppearance(value){return {coat:OYEN_COATS.some(c=>c.id===value?.coat)?value.coat:'original',skin:OYEN_SKINS.some(s=>s.id===value?.skin)?value.skin:'original'};}
export function loadOyenAppearance(storage){try{return normalizeOyenAppearance(JSON.parse(storage.getItem('pnt-oyen-appearance')));}catch{return normalizeOyenAppearance();}}
export function saveOyenAppearance(storage,value){try{storage.setItem('pnt-oyen-appearance',JSON.stringify(normalizeOyenAppearance(value)));}catch{}}
const fragment=`
varying vec3 vOyenRest;
varying float vOyenFabric;
uniform float uOyenCoat;
uniform float uOyenHead;
uniform vec3 uOyenBlack;
uniform vec3 uOyenWhite;
uniform vec3 uOyenYellow;
uniform vec3 uOyenOrange;
float oyenHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float oyenNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(oyenHash(i),oyenHash(i+vec3(1,0,0)),f.x),mix(oyenHash(i+vec3(0,1,0)),oyenHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(oyenHash(i+vec3(0,0,1)),oyenHash(i+vec3(1,0,1)),f.x),mix(oyenHash(i+vec3(0,1,1)),oyenHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
const recolor=`
vec3 oyenSource=diffuseColor.rgb;
float oyenR=max(oyenSource.r,0.0001);
// Warm orange fabric; neutral skin/eyes and cool gloves/shoes are excluded.
float oyenOrangeMask=smoothstep(0.35,0.55,(oyenSource.r-oyenSource.b)/oyenR)*(1.0-smoothstep(0.50,0.62,oyenSource.g/oyenR))*(1.0-smoothstep(0.30,0.58,oyenSource.b/max(oyenSource.g,0.0001)));
float oyenWarmFabric=smoothstep(0.02,0.12,(oyenSource.r-oyenSource.b)/oyenR);
float oyenDarkFabric=(1.0-smoothstep(0.06,0.10,oyenR))*max(uOyenHead,smoothstep(1.03,1.15,vOyenRest.y));
float oyenEarPink=smoothstep(0.55,0.82,oyenSource.b/max(oyenSource.g,0.0001))*smoothstep(0.12,0.25,oyenR);
float oyenMask=max(oyenWarmFabric,oyenDarkFabric)*(1.0-oyenEarPink)*vOyenFabric;
float oyenDetail=mix(0.90,clamp(oyenSource.r/0.57,0.75,1.20),smoothstep(0.10,0.30,oyenR));
vec3 oyenTarget=uOyenBlack;
if(uOyenCoat>1.5&&uOyenCoat<2.5){float spotAmount=smoothstep(0.57,0.64,oyenNoise(vOyenRest*8.0+vec3(4.2,0.7,2.1)));oyenTarget=mix(uOyenWhite,uOyenYellow,spotAmount);}
if(uOyenCoat>2.5){float band=sin(vOyenRest.y*39.0+vOyenRest.x*10.0+sin(vOyenRest.z*9.0)*1.4);float stripe=smoothstep(0.28,0.48,band);oyenTarget=mix(uOyenOrange,uOyenBlack,stripe);}
diffuseColor.rgb=mix(oyenSource,oyenTarget*oyenDetail,oyenMask);
`;
// Per-avatar material/geometry clones. The original GLB, maps and skeleton stay shared.
// Pattern coordinates are read before skinning, so the cloth never swims during animation.
export function applyOyenAppearance(model,value){
 const appearance=normalizeOyenAppearance(value),materials=[],geometries=[];
 model.traverse(mesh=>{
  if(!mesh.isMesh||Array.isArray(mesh.material))return;
  const source=mesh.material,name=source.name;
  const cloth=['m_cs_oyen_head','m_cs_oyen_body'].includes(name)&&appearance.coat!=='original',face=name==='m_cs_oyen_skin'&&appearance.skin==='dark';
  if(!cloth&&!face)return;
  const material=source.clone();materials.push(material);mesh.material=material;
  if(cloth){
   const geometry=mesh.geometry.clone(),count=geometry.attributes.position.count,fabric=new Float32Array(count).fill(1);geometries.push(geometry);mesh.geometry=geometry;
   if(name==='m_cs_oyen_head'){
    const joints=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
    const head=new Set(mesh.skeleton.bones.map((b,i)=>/head/i.test(b.name)?i:-1).filter(i=>i>=0));
    for(let i=0;i<count;i++){let weight=0;for(let k=0;k<4;k++)if(head.has(joints.getComponent(i,k)))weight+=weights.getComponent(i,k);fabric[i]=weight>.99?1:0;}
   }
   geometry.setAttribute('aOyenFabric',new THREE.BufferAttribute(fabric,1));
   material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{uOyenHead:{value:name==='m_cs_oyen_head'?1:0},uOyenCoat:{value:{black:1,spots:2,stripes:3}[appearance.coat]},uOyenBlack:{value:new THREE.Color('#252a32')},uOyenWhite:{value:new THREE.Color('#f6f1e7')},uOyenYellow:{value:new THREE.Color('#ffd13b')},uOyenOrange:{value:new THREE.Color('#edaa48')}});
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aOyenFabric;varying float vOyenFabric;varying vec3 vOyenRest;').replace('#include <begin_vertex>','#include <begin_vertex>\nvOyenRest=position;vOyenFabric=aOyenFabric;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+fragment).replace('#include <map_fragment>','#include <map_fragment>\n'+recolor);
   };
  }else{
   material.onBeforeCompile=shader=>{
    shader.uniforms.uOyenSkin={value:new THREE.Color('#74452f')};shader.uniforms.uOyenSkinBase={value:new THREE.Color('#dfb49d')};
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uOyenSkin;uniform vec3 uOyenSkinBase;').replace('#include <map_fragment>',`#include <map_fragment>
     vec3 oyenFace=diffuseColor.rgb;float warmth=(oyenFace.r-oyenFace.b)/max(oyenFace.r,0.0001);float skinMask=smoothstep(0.12,0.25,warmth)*smoothstep(0.03,0.10,oyenFace.r);diffuseColor.rgb=mix(oyenFace,uOyenSkin*(oyenFace/uOyenSkinBase),skinMask);`);
   };
  }
  material.customProgramCacheKey=()=>`oyen-test-v1-${cloth?appearance.coat:'skin'}`;
 });
 return {dispose(){for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();}};
}


