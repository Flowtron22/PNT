import * as THREE from 'three';
export const COLOR_COSTUMES=['thief','police','pingu','raptor'];
export const OUTFIT_COLORS=[{id:'original',name:'Original'},{id:'midnight',name:'Midnight',color:'#303746'},{id:'mint',name:'Mint',color:'#55d9aa'},{id:'violet',name:'Violet',color:'#a16aef'}];
export const SKIN_COLORS=[{id:'original',name:'Face colour 1',color:'#dfb49d'},{id:'dark',name:'Face colour 2',color:'#74452f'}];
export function normalizeCostumeAppearance(value){return {outfit:OUTFIT_COLORS.some(c=>c.id===value?.outfit)?value.outfit:'original',skin:SKIN_COLORS.some(c=>c.id===value?.skin)?value.skin:'original'};}
export function loadCostumeAppearances(storage){let raw;try{raw=JSON.parse(storage.getItem('pnt-costume-appearances-v1'));}catch{}return Object.fromEntries(COLOR_COSTUMES.map(id=>[id,normalizeCostumeAppearance(raw?.[id])]));}
export function saveCostumeAppearances(storage,value){try{storage.setItem('pnt-costume-appearances-v1',JSON.stringify(Object.fromEntries(COLOR_COSTUMES.map(id=>[id,normalizeCostumeAppearance(value?.[id])]))));}catch{}}
const PARTS={
 thief:{M_rn_head:[1,.035],M_rn_body:[2,.5]},
 police:{M_ch_head:[3,.085],M_ch_body:[3,.085]},
 pingu:{M_cs_pingu_head:[3,.075],M_cs_pingu_body:[3,.075]},
 raptor:{m_cs_raptor_head:[4,.28],m_cs_raptor_body:[4,.28]},
};
const uniforms=`uniform vec3 uCostumeOutfit;uniform vec3 uCostumeSkin;
uniform float uCostumeMode;uniform float uCostumeBase;uniform float uCostumeFace;`;
const recolor=`
vec3 costumeSource=diffuseColor.rgb;
float costumeMax=max(max(costumeSource.r,costumeSource.g),max(costumeSource.b,.0001));
float costumeMin=min(min(costumeSource.r,costumeSource.g),costumeSource.b);
float costumeMask=0.;
// Thief hood and light vest; the dark trousers, tie and gloves stay intact.
if(uCostumeMode>.5&&uCostumeMode<1.5)costumeMask=1.;
if(uCostumeMode>1.5&&uCostumeMode<2.5)costumeMask=smoothstep(.13,.23,costumeMax)*(1.-smoothstep(.10,.25,(costumeMax-costumeMin)/costumeMax));
// Police blue uniform/cap and Pingu blue feathers. Gold, red and white stay intact.
if(uCostumeMode>2.5&&uCostumeMode<3.5)costumeMask=smoothstep(.30,.55,(costumeSource.b-costumeSource.r)/max(costumeSource.b,.0001))*smoothstep(.04,.18,(costumeSource.b-costumeSource.g)/max(costumeSource.b,.0001));
// Raptor green scales retain their painted spots; cream belly and orange spikes stay intact.
if(uCostumeMode>3.5)costumeMask=smoothstep(.08,.24,(costumeSource.g-costumeSource.r)/max(costumeSource.g,.0001))*smoothstep(.2,.4,(costumeSource.g-costumeSource.b)/max(costumeSource.g,.0001));
float costumeDetail=clamp(dot(costumeSource,vec3(.2126,.7152,.0722))/max(uCostumeBase,.001),.15,1.4);
diffuseColor.rgb=mix(costumeSource,uCostumeOutfit*costumeDetail,costumeMask);
if(uCostumeFace>.5){
 // Warm skin only, excluding whites/pupils, dark brows/hair and Pingu's yellow beak.
 float faceMask=smoothstep(.08,.18,costumeSource.r)*smoothstep(.3,.46,costumeSource.g/max(costumeSource.r,.0001))*smoothstep(.28,.48,costumeSource.b/max(costumeSource.g,.0001))*smoothstep(.12,.22,(costumeSource.r-costumeSource.b)/max(costumeSource.r,.0001));
 vec3 faceDetail=costumeSource/vec3(.7835,.4564,.3372);
 diffuseColor.rgb=mix(diffuseColor.rgb,uCostumeSkin*faceDetail,faceMask);
}
`;
// Own only the changed materials. Textures, geometry and skeletons stay shared.
export function applyCostumeAppearance(model,id,value){
 const appearance=normalizeCostumeAppearance(value),materials=[];
 if(!COLOR_COSTUMES.includes(id))return {dispose(){}};
 const replacements=new Map();
 function convert(source){
  if(!source)return source;if(replacements.has(source))return replacements.get(source);
  const part=PARTS[id][source.name],outfit=part&&appearance.outfit!=='original';
  const face=appearance.skin!=='original'&&(/_(skin|eye)$/i.test(source.name)||(id==='pingu'&&source.name==='M_cs_pingu_head'));
  if(!outfit&&!face)return source;
  const material=source.clone(),compile=source.onBeforeCompile,key=source.customProgramCacheKey();materials.push(material);replacements.set(source,material);
  material.onBeforeCompile=function(shader,renderer){
   compile.call(this,shader,renderer);
   Object.assign(shader.uniforms,{uCostumeOutfit:{value:new THREE.Color(OUTFIT_COLORS.find(c=>c.id===appearance.outfit)?.color||'#ffffff')},uCostumeSkin:{value:new THREE.Color('#74452f')},uCostumeMode:{value:outfit?part[0]:0},uCostumeBase:{value:part?.[1]||1},uCostumeFace:{value:face?1:0}});
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+uniforms).replace('#include <map_fragment>','#include <map_fragment>\n'+recolor);
  };
  material.customProgramCacheKey=()=>`${key}-costume-v1-${id}-${outfit?part[0]:0}-${face?1:0}`;
  return material;
 }
 model.traverse(mesh=>{if(mesh.isMesh)mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);});
 return {dispose(){for(const material of materials)material.dispose();}};
}
