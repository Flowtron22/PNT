// Re-sample only the elevated boom footprint. Invisible UCX volumes and water
// are excluded; deck clearance and edge sweeps use visible 3D capsule collision.
import {readFileSync,writeFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {GLTFLoader}=await import('../vendor/three/jsm/loaders/GLTFLoader.js');
const {Octree}=await import('../vendor/three/jsm/math/Octree.js');
const {Capsule}=await import('../vendor/three/jsm/math/Capsule.js');
const {solidForGameplay}=await import('../src/pnt/world-navigation.js');
const path='assets/pnt/arenas/sunken.collision.json',grid=JSON.parse(readFileSync(path)),metadata=JSON.parse(readFileSync('assets/pnt/arenas/sunken.json'));
for(const old of grid.overheadRepair?.original||[]){grid.groundHeights[old.i]=old.h;grid.blocked[old.i]=old.b;grid.edges[old.i]=old.e;}delete grid.overheadRepair;
const original={heights:[...grid.groundHeights],blocked:[...grid.blocked],edges:[...grid.edges]};
const loader=new GLTFLoader();loader.register(()=>({name:'geometry-only',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const bytes=readFileSync('assets/pnt/arenas/sunken-lit.glb'),root=(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
root.position.fromArray(metadata.origin.map(v=>-v));root.updateMatrixWorld(true);
const meshes=[],collisionRoot=new THREE.Group();root.traverse(mesh=>{
 if(!mesh.isMesh||!solidForGameplay(mesh))return;
 const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];if(materials.every(m=>m.opacity<.05||/transparent/i.test(m.name)))return;
 meshes.push(mesh);const copy=new THREE.Mesh(mesh.geometry,new THREE.MeshBasicMaterial());copy.matrix.copy(mesh.matrixWorld);copy.matrixAutoUpdate=false;collisionRoot.add(copy);
});
const octree=new Octree().fromGraphNode(collisionRoot),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),changed=new Set();
const point=i=>({x:grid.minX+(i%grid.nx)*grid.step,z:grid.minZ+Math.floor(i/grid.nx)*grid.step});
function clear(x,y,z){const radius=.28,capsule=new Capsule(new THREE.Vector3(x,y+radius+.06,z),new THREE.Vector3(x,y+1.50-radius+.06,z),radius),hit=octree.capsuleIntersect(capsule);return !hit||hit.depth<.01;}
for(let i=0;i<grid.groundHeights.length;i++){
 const h=grid.groundHeights[i],{x,z}=point(i);
 if(h===null||h<1.1||grid.blocked[i]||x< -1||x>5.8||z< -4||z>12)continue;
 ray.set(new THREE.Vector3(x,.9,z),down);ray.far=5;
 const floor=ray.intersectObjects(meshes,false).find(hit=>hit.point.y<-.9&&hit.point.y> -3.3&&hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y>.75);
 if(!floor||h-floor.point.y<2)continue;
 grid.groundHeights[i]=Math.round(floor.point.y*10000)/10000;grid.blocked[i]=clear(x,grid.groundHeights[i],z)?0:1;changed.add(i);
}
const touched=new Set(changed),directions=[[1,1,0],[2,-1,0],[4,0,1],[8,0,-1]];
for(const i of changed)for(const [,dx,dz]of directions){const x=i%grid.nx+dx,z=Math.floor(i/grid.nx)+dz;if(x>=0&&z>=0&&x<grid.nx&&z<grid.nz)touched.add(z*grid.nx+x);}
for(const i of touched)for(const [bit,dx,dz]of directions){
 const x=i%grid.nx+dx,z=Math.floor(i/grid.nx)+dz,j=z*grid.nx+x;if(!changed.has(i)&&!changed.has(j))continue;
 let blocked=x<0||z<0||x>=grid.nx||z>=grid.nz||grid.blocked[i]||grid.blocked[j]||grid.groundHeights[i]===null||grid.groundHeights[j]===null||Math.abs(grid.groundHeights[i]-grid.groundHeights[j])>.6;
 if(!blocked){const a=point(i),b=point(j);for(let step=0;step<=6;step++){const t=step/6;if(!clear(a.x+(b.x-a.x)*t,grid.groundHeights[i]+(grid.groundHeights[j]-grid.groundHeights[i])*t,a.z+(b.z-a.z)*t)){blocked=true;break;}}}
 grid.edges[i]=blocked?grid.edges[i]|bit:grid.edges[i]&~bit;
}
grid.overheadRepair={version:1,source:'Visible Sunken deck below the hanging boom; 0.28m radius / 1.56m height capsule clearance',cells:[...changed],original:[...touched].map(i=>({i,h:original.heights[i],b:original.blocked[i],e:original.edges[i]}))};
writeFileSync(path,JSON.stringify(grid));console.log(JSON.stringify({resampled:changed.size,walkable:[...changed].filter(i=>!grid.blocked[i]).length,examples:[...changed].filter(i=>!grid.blocked[i]).slice(0,8).map(i=>({i,...point(i),old:original.heights[i],floor:grid.groundHeights[i]}))},null,2));

