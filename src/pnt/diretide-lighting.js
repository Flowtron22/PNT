// Imported custom normals point across faces on several scenery meshes, producing
// white specular triangles. Face normals preserve this low-poly map's geometry/UVs.
import {bakedArena} from './arena-appearance.js';
export async function applyDiretideGroundAO(arena){
 arena.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){material.flatShading=true;material.needsUpdate=true;}});
 await bakedArena(arena,'grassfield');
}
