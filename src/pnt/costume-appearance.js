import * as THREE from 'three';
export const COLOR_COSTUMES=['thief','police','pingu','raptor'];
export const OUTFIT_COLORS=[{id:'original',name:'Original'},{id:'midnight',name:'Midnight',color:'#303746'},{id:'mint',name:'Mint',color:'#55d9aa'},{id:'violet',name:'Violet',color:'#a16aef'}];
const SPECIAL_OUTFITS={
 police:[OUTFIT_COLORS[0],OUTFIT_COLORS[1],{id:'security',name:'Mall security',color:'#eeeeea',swatch:'linear-gradient(#eeeeea 0 50%,#20232a 50% 100%)'},{id:'khaki',name:'Khaki',color:'#b4a27a'}],
 pingu:[...OUTFIT_COLORS.slice(0,3),{id:'red',name:'Red',color:'#dc343d'}],
 thief:[...OUTFIT_COLORS.slice(0,2),{id:'urban',name:'Urban camo',color:'#22242a',swatch:'linear-gradient(#17191e 0 50%,#dededc 50% 65%,#555860 65% 80%,#ededeb 80% 100%)'},{id:'camo',name:'Army camo',color:'#69724c',swatch:'radial-gradient(ellipse at 20% 30%,#282d1e 0 22%,transparent 24%),radial-gradient(ellipse at 80% 65%,#b0a57c 0 28%,transparent 30%),#69724c'}],
};
export function outfitColors(id){return SPECIAL_OUTFITS[id]||OUTFIT_COLORS;}
export const SKIN_COLORS=[{id:'original',name:'Face colour 1',color:'#dfb49d'},{id:'dark',name:'Face colour 2',color:'#74452f'}];
export function normalizeCostumeAppearance(value,id){
 const migrations={police:{mint:'security',violet:'khaki'},pingu:{violet:'red'},thief:{mint:'urban',violet:'camo'}};
 const outfit=migrations[id]?.[value?.outfit]||value?.outfit;
 return {outfit:outfitColors(id).some(c=>c.id===outfit)?outfit:'original',skin:SKIN_COLORS.some(c=>c.id===value?.skin)?value.skin:'original'};
}
export function loadCostumeAppearances(storage){let raw;try{raw=JSON.parse(storage.getItem('pnt-costume-appearances-v1'));}catch{}return Object.fromEntries(COLOR_COSTUMES.map(id=>[id,normalizeCostumeAppearance(raw?.[id],id)]));}
export function saveCostumeAppearances(storage,value){try{storage.setItem('pnt-costume-appearances-v1',JSON.stringify(Object.fromEntries(COLOR_COSTUMES.map(id=>[id,normalizeCostumeAppearance(value?.[id],id)]))));}catch{}}
const PARTS={
 thief:{M_rn_head:[1,.035],M_rn_body:[2,.5]},
 police:{M_ch_head:[3,.085],M_ch_body:[3,.085]},
 pingu:{M_cs_pingu_head:[3,.075],M_cs_pingu_body:[3,.075]},
 raptor:{m_cs_raptor_head:[4,.28],m_cs_raptor_body:[4,.28]},
};
const uniforms=`uniform vec3 uCostumeOutfit;uniform vec3 uCostumeSkin;
uniform float uCostumeMode;uniform float uCostumeBase;uniform float uCostumeFace;
uniform float uCostumeStyle;uniform float uCostumeBody;varying vec3 vCostumeRest;
float armyHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float armyNoise(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(armyHash(i),armyHash(i+vec3(1,0,0)),f.x),mix(armyHash(i+vec3(0,1,0)),armyHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(armyHash(i+vec3(0,0,1)),armyHash(i+vec3(1,0,1)),f.x),mix(armyHash(i+vec3(0,1,1)),armyHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}`;
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
vec3 costumeTarget=uCostumeOutfit;
if(uCostumeStyle>.5&&uCostumeStyle<1.5){
 // Rest-space waist split stays attached to the uniform during all animations.
 costumeTarget=vec3(.014,.017,.022);
 if(uCostumeBody>.5&&vCostumeRest.y>.79)costumeTarget=vec3(.88,.88,.85);
}
if(uCostumeStyle>1.5){
 vec3 p=vCostumeRest*(uCostumeStyle>2.5?20.:12.);p+=vec3(armyNoise(p*.65+2.))*1.8;
 float armyPatch=armyNoise(p),overlay=armyNoise(p*.82+vec3(8.,3.,5.));
 if(uCostumeStyle<2.5){
 costumeTarget=mix(vec3(.13,.17,.075),vec3(.38,.34,.21),smoothstep(.45,.49,armyPatch));
 costumeTarget=mix(costumeTarget,vec3(.055,.075,.032),smoothstep(.54,.58,overlay));
 costumeTarget=mix(costumeTarget,vec3(.014,.02,.009),smoothstep(.69,.73,armyPatch));
 }else{
  costumeTarget=vec3(.008,.009,.011);
  // Thief trousers stop above the boots and below the original dark belt.
  if(uCostumeBody>.5&&vCostumeRest.y>.30&&vCostumeRest.y<.735&&abs(vCostumeRest.x)<.37){
   costumeMask=1.;
   costumeDetail=clamp(dot(costumeSource,vec3(.2126,.7152,.0722))/.025,.35,1.3);
   costumeTarget=mix(vec3(.18),vec3(.76),smoothstep(.48,.53,armyPatch));
   costumeTarget=mix(costumeTarget,vec3(.012,.014,.018),smoothstep(.52,.57,overlay));
  }
 }
}
diffuseColor.rgb=mix(costumeSource,costumeTarget*costumeDetail,costumeMask);
if(uCostumeFace>.5){
 // Warm skin only, excluding whites/pupils, dark brows/hair and Pingu's yellow beak.
 float faceMask=smoothstep(.08,.18,costumeSource.r)*smoothstep(.3,.46,costumeSource.g/max(costumeSource.r,.0001))*smoothstep(.28,.48,costumeSource.b/max(costumeSource.g,.0001))*smoothstep(.12,.22,(costumeSource.r-costumeSource.b)/max(costumeSource.r,.0001));
 vec3 faceDetail=costumeSource/vec3(.7835,.4564,.3372);
 diffuseColor.rgb=mix(diffuseColor.rgb,uCostumeSkin*faceDetail,faceMask);
}
`;
// Own only the changed materials. Textures, geometry and skeletons stay shared.
export function applyCostumeAppearance(model,id,value){
 const appearance=normalizeCostumeAppearance(value,id),materials=[];
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
   Object.assign(shader.uniforms,{uCostumeOutfit:{value:new THREE.Color(outfitColors(id).find(c=>c.id===appearance.outfit)?.color||'#ffffff')},uCostumeSkin:{value:new THREE.Color('#74452f')},uCostumeMode:{value:outfit?part[0]:0},uCostumeBase:{value:part?.[1]||1},uCostumeFace:{value:face?1:0},uCostumeStyle:{value:outfit?(appearance.outfit==='security'?1:appearance.outfit==='camo'?2:appearance.outfit==='urban'?3:0):0},uCostumeBody:{value:/_body$/i.test(source.name)?1:0}});
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCostumeRest;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCostumeRest=position;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+uniforms).replace('#include <map_fragment>','#include <map_fragment>\n'+recolor);
  };
  material.customProgramCacheKey=()=>`${key}-costume-v3-${id}-${outfit?part[0]:0}-${face?1:0}`;
  return material;
 }
 model.traverse(mesh=>{if(mesh.isMesh)mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);});
 return {dispose(){for(const material of materials)material.dispose();}};
}
