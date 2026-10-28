import * as THREE from 'three';
export function matteMall(arena){arena.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material]){if(!material||material.isMeshBasicMaterial)continue;material.roughness=1;material.metalness=0;material.roughnessMap=null;material.metalnessMap=null;material.needsUpdate=true;}});}
const receivers={mall:new Set(['sm_mainfloor','sm_boutiqeuA_floor','sm_cafeA_floor','sm_cafeB_floor','SM_bridge2']),sunken:new Set(['SunkenShip']),iceberg:new Set(['sm_ib_icefloor'])};
const contactMaps=new Map();
export const ARENA_SATURATION=1.2;
function saturateArena(arena){
 const materials=new Set();arena.traverse(object=>{if(object.isMesh)for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);});
 for(const material of materials){const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>',`#include <colorspace_fragment>
   float arenaLuma = dot( gl_FragColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
   gl_FragColor.rgb = clamp( mix( vec3( arenaLuma ), gl_FragColor.rgb, ${ARENA_SATURATION.toFixed(2)} ), 0.0, 1.0 );`);};
  material.customProgramCacheKey=()=>key+'-arena-saturation-120';material.needsUpdate=true;
 }
}
export async function bakedArena(arena,id){
 if(arena.userData.bakedLighting)return;
 if(!receivers[id])throw new Error('Unknown contact AO arena: '+id);
 if(!contactMaps.has(id))contactMaps.set(id,new THREE.TextureLoader().loadAsync(`assets/pnt/arenas/${id}-contact-ao.png?v=contact-1`).then(texture=>{texture.flipY=false;texture.channel=1;texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=2;return texture;}).catch(error=>{contactMaps.delete(id);throw error;}));
 const aoMap=await contactMaps.get(id),materials=new Map();
 arena.traverse(object=>{if(!object.isMesh||!object.geometry.attributes.uv1)return;
  let receiver=false;for(let node=object;node&&node!==arena;node=node.parent)if(receivers[id].has(node.name))receiver=true;
  if(!receiver)return;
  const convert=source=>{if(materials.has(source))return materials.get(source);const material=source.clone();material.aoMap=aoMap;material.aoMapIntensity=1;material.name=source.name+' · ground contact';
   // A short contact-shadow mask must remain visible under direct lights too.
   // Replace the ambient-only AO application so the mask is applied once.
   material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>','').replace('#include <opaque_fragment>',`#ifdef USE_AOMAP
    float groundContact = texture2D( aoMap, vAoMapUv ).r;
    outgoingLight *= pow( clamp( groundContact, 0.0, 1.0 ), 2.3 );
    #endif
    #include <opaque_fragment>`);};
   material.customProgramCacheKey=()=> 'arena-ground-contact-v4';materials.set(source,material);return material;};
  object.material=Array.isArray(object.material)?object.material.map(convert):convert(object.material);
 });saturateArena(arena);arena.userData.bakedLighting=true;
}
