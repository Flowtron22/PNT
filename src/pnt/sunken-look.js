import * as THREE from 'three';

// Sunken-only material/light experiment. Every override can be restored in place.
export function createSunkenLook({renderer,scene,sunlight,fill,hemisphere,bounds,quality='balanced',enabled=true}){
 const records=new Map(),materials=new Map();let active=false,disposed=false;
 const saved={sunColor:sunlight.color.clone(),sunPosition:sunlight.position.clone(),sunIntensity:sunlight.intensity,target:sunlight.target.position.clone(),targetParent:sunlight.target.parent,fillColor:fill.color.clone(),fillIntensity:fill.intensity,sky:hemisphere.color.clone(),ground:hemisphere.groundColor.clone(),hemiIntensity:hemisphere.intensity,exposure:renderer.toneMappingExposure,shadows:renderer.shadowMap.enabled,shadowType:renderer.shadowMap.type,cast:sunlight.castShadow,map:sunlight.shadow.map,mapSize:sunlight.shadow.mapSize.clone(),camera:sunlight.shadow.camera.clone(),bias:sunlight.shadow.bias,normalBias:sunlight.shadow.normalBias};
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.z)*.65+5;
 function convert(source){
  if(!source?.isMeshStandardMaterial||source.opacity<.05||/transparent/i.test(source.name))return source;
  if(materials.has(source))return materials.get(source);
  const material=source.clone(),previous=source.onBeforeCompile,key=source.customProgramCacheKey(),water=/water/i.test(source.name);
  material.roughness=water?.85:1;material.metalness=0;material.roughnessMap=null;material.metalnessMap=null;
  material.onBeforeCompile=function(shader,r){
   previous.call(this,shader,r);
   // Retain Three's physically based lights/shadows but soften the diffuse terminator.
   const lights=THREE.ShaderChunk.lights_physical_pars_fragment.replace('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );','float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + 0.18 ) / 1.18 );');
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_pars_fragment>',lights).replace('#include <colorspace_fragment>',`#include <colorspace_fragment>
    float sunkenLuma=dot(gl_FragColor.rgb,vec3(0.2126,0.7152,0.0722));
    gl_FragColor.rgb=mix(vec3(sunkenLuma),gl_FragColor.rgb,0.88)*vec3(1.025,1.005,0.965);
    ${water?'gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(0.14,0.60,0.65)*(0.65+sunkenLuma*0.55),0.90*smoothstep(0.08,0.30,gl_FragColor.b-gl_FragColor.r));':''}
    gl_FragColor.rgb=clamp(gl_FragColor.rgb,0.0,1.0);`);
  };
  material.customProgramCacheKey=()=>key+'-sunken-soft-v2-'+(water?'water':'solid');material.needsUpdate=true;materials.set(source,material);return material;
 }
 function apply(mesh,record){mesh.material=active?record.styled:record.original;mesh.castShadow=active?record.opaque:record.cast;mesh.receiveShadow=active?record.opaque:record.receive;for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(m)m.needsUpdate=true;}
 function register(root){root.traverse(mesh=>{
  if(!mesh.isMesh||records.has(mesh))return;
  const list=Array.isArray(mesh.material)?mesh.material:[mesh.material],opaque=list.some(m=>m?.isMeshStandardMaterial&&m.opacity>=.95&&!m.transparent&&!/water|transparent/i.test(m.name));
  const record={original:mesh.material,styled:Array.isArray(mesh.material)?list.map(convert):convert(mesh.material),cast:mesh.castShadow,receive:mesh.receiveShadow,opaque};records.set(mesh,record);apply(mesh,record);
 });}
 function unregister(root){root.traverse(mesh=>{const r=records.get(mesh);if(!r)return;mesh.material=r.original;mesh.castShadow=r.cast;mesh.receiveShadow=r.receive;records.delete(mesh);});}
 function setQuality(value){const pixels=value==='battery'?512:1024;sunlight.shadow.mapSize.set(pixels,pixels);sunlight.shadow.needsUpdate=true;}
 function setEnabled(value){
  if(disposed)return;active=!!value;
  renderer.shadowMap.enabled=active||saved.shadows;renderer.shadowMap.type=active?THREE.PCFSoftShadowMap:saved.shadowType;sunlight.castShadow=active||saved.cast;
  if(active){
   sunlight.color.set('#ffe1b3');sunlight.intensity=2.35;sunlight.position.set(center.x-18,30,center.z+14);sunlight.target.position.set(center.x,0,center.z);if(!sunlight.target.parent)scene.add(sunlight.target);
   const c=sunlight.shadow.camera;c.left=c.bottom=-radius;c.right=c.top=radius;c.near=1;c.far=110;c.updateProjectionMatrix();sunlight.shadow.bias=-.00025;sunlight.shadow.normalBias=.035;
   fill.color.set('#c5e8ee');fill.intensity=.9;hemisphere.color.set('#fff1dd');hemisphere.groundColor.set('#809aa4');hemisphere.intensity=2.1;renderer.toneMappingExposure=1.12;
  }else{
   sunlight.color.copy(saved.sunColor);sunlight.position.copy(saved.sunPosition);sunlight.intensity=saved.sunIntensity;sunlight.target.position.copy(saved.target);
   fill.color.copy(saved.fillColor);fill.intensity=saved.fillIntensity;hemisphere.color.copy(saved.sky);hemisphere.groundColor.copy(saved.ground);hemisphere.intensity=saved.hemiIntensity;renderer.toneMappingExposure=saved.exposure;
  }
  sunlight.target.updateMatrixWorld();sunlight.shadow.needsUpdate=true;for(const [mesh,record]of records)apply(mesh,record);
 }
 setQuality(quality);setEnabled(enabled);
 return {register,unregister,setEnabled,setQuality,get enabled(){return active;},dispose(){
  if(disposed)return;setEnabled(false);disposed=true;for(const mesh of [...records.keys()])unregister(mesh);for(const material of materials.values())material.dispose();materials.clear();
  if(!saved.targetParent)sunlight.target.removeFromParent();sunlight.shadow.camera.copy(saved.camera);sunlight.shadow.mapSize.copy(saved.mapSize);sunlight.shadow.bias=saved.bias;sunlight.shadow.normalBias=saved.normalBias;
  if(sunlight.shadow.map!==saved.map){sunlight.shadow.map?.dispose();sunlight.shadow.map=saved.map;}
 }};
}
