import * as THREE from 'three';
export function matteMall(arena){arena.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material]){if(!material||material.isMeshBasicMaterial)continue;material.roughness=1;material.metalness=0;material.roughnessMap=null;material.metalnessMap=null;material.needsUpdate=true;}});}
const floorReceiver=name=>/^(sm_mainfloor|sm_boutiqeuA_floor|sm_cafeA_floor|sm_cafeB_floor|SM_bridge2)$/.test(name);
let mallLight;
export async function bakedMall(arena){
 if(arena.userData.bakedLighting)return;
 mallLight??=new THREE.TextureLoader().loadAsync('assets/pnt/arenas/mall-contact-ao.png?v=contact-1').then(texture=>{texture.flipY=false;texture.channel=1;texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=2;return texture;});
 const aoMap=await mallLight,materials=new Map();
 arena.traverse(object=>{if(!object.isMesh||!object.geometry.attributes.uv1)return;
  let receiver=false;for(let node=object;node&&node!==arena;node=node.parent)if(floorReceiver(node.name))receiver=true;
  if(!receiver)return;
  const convert=source=>{if(materials.has(source))return materials.get(source);const material=source.clone();material.aoMap=aoMap;material.aoMapIntensity=1;material.name=source.name+' · ground contact';materials.set(source,material);return material;};
  object.material=Array.isArray(object.material)?object.material.map(convert):convert(object.material);
 });arena.userData.bakedLighting=true;
}
