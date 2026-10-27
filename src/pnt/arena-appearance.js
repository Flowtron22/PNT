import * as THREE from 'three';
export function matteMall(arena){arena.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material]){if(!material||material.isMeshBasicMaterial)continue;material.roughness=1;material.metalness=0;material.roughnessMap=null;material.metalnessMap=null;material.needsUpdate=true;}});}
let mallLight;
export async function bakedMall(arena){
 if(arena.userData.bakedLighting)return;
 mallLight??=new THREE.TextureLoader().loadAsync('assets/pnt/arenas/mall-lightmap.png?v=bake-1').then(texture=>{texture.flipY=false;texture.channel=1;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;return texture;});
 const lightMap=await mallLight,materials=new Map();
 arena.traverse(object=>{if(!object.isMesh||!object.geometry.attributes.uv1)return;
  const convert=source=>{if(materials.has(source))return materials.get(source);const material=new THREE.MeshBasicMaterial({color:source.color,map:source.map,lightMap,lightMapIntensity:Math.PI*1.6,vertexColors:source.vertexColors,side:source.side,transparent:source.transparent,opacity:source.opacity,alphaTest:source.alphaTest,alphaMap:source.alphaMap,depthWrite:source.depthWrite,fog:source.fog});material.name=source.name+' · baked';materials.set(source,material);return material;};
  object.material=Array.isArray(object.material)?object.material.map(convert):convert(object.material);
 });arena.userData.bakedLighting=true;
}
