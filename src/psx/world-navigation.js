import * as THREE from 'three';
export function solidForGameplay(mesh){for(let o=mesh;o;o=o.parent)if(/water|blackinning|frozendeep|bgr_|ocean/i.test(o.name))return false;const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];return !materials.every(m=>/water|transparent/i.test(m?.name||''));}
export function buildWalkGrid(meshes,bounds,step=.38){
 const size=bounds.getSize(new THREE.Vector3()),nx=Math.ceil(size.x/step)+1,nz=Math.ceil(size.z/step)+1,heights=new Float32Array(nx*nz).fill(NaN),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){ray.set(new THREE.Vector3(bounds.min.x+x*step,bounds.max.y+3,bounds.min.z+z*step),down);ray.far=25;const hit=ray.intersectObjects(meshes,true).find(h=>h.face&&h.face.normal.clone().transformDirection(h.object.matrixWorld).y>.55);if(hit)heights[z*nx+x]=hit.point.y;}
 return {nx,nz,step,heights,minX:bounds.min.x,minZ:bounds.min.z};
}
export function arenaBounds(root,data){const bounds=new THREE.Box3().setFromObject(root),points=[...data.spawns,...data.caches.map(c=>c.position)];bounds.min.x=Math.max(bounds.min.x,Math.min(...points.map(p=>p[0]))-5);bounds.max.x=Math.min(bounds.max.x,Math.max(...points.map(p=>p[0]))+5);bounds.min.z=Math.max(bounds.min.z,Math.min(...points.map(p=>p[2]))-5);bounds.max.z=Math.min(bounds.max.z,Math.max(...points.map(p=>p[2]))+5);bounds.min.y=-12;bounds.max.y=3;return bounds;}
