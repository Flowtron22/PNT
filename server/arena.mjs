import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three/build/three.module.js';
import {GLTFLoader} from '../vendor/three/jsm/loaders/GLTFLoader.js';
import {sampleGround} from '../src/pnt/motion.js';
import {cellIndex} from '../src/pnt/collision.js';
import {landingMask} from '../src/pnt/landing.js';
const cache=new Map(),base=new URL('../assets/pnt/arenas/',import.meta.url);
export async function loadArenaData(id){
 if(!['mall','sunken','iceberg'].includes(id))throw Error('Invalid map');
 if(!cache.has(id))cache.set(id,(async()=>{
  const [metadata,nav,collision]=await Promise.all([`${id}.json`,`${id}.nav.json`,`${id}.collision.json`].map(async p=>JSON.parse(await readFile(new URL(p,base),'utf8'))));
  const grid={...nav,...collision,heights:Float32Array.from(collision.groundHeights||nav.heights,v=>v===null?NaN:v)};let template=null;
  if(id==='mall'){const b=await readFile(new URL('mall.glb',base)),len=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+len));delete json.images;delete json.textures;json.materials=json.materials.map(m=>({name:m.name}));const chunk=Buffer.from(JSON.stringify(json)),pad=Buffer.alloc((4-chunk.length%4)%4,32),header=Buffer.from(b.subarray(0,20)),tail=b.subarray(20+len);header.writeUInt32LE(20+chunk.length+pad.length+tail.length,8);header.writeUInt32LE(chunk.length+pad.length,12);const bytes=Buffer.concat([header,chunk,pad,tail]);template=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'')).scene;template.position.fromArray(metadata.origin.map(v=>-v));}
  grid.landingMask=landingMask(grid,metadata.spawns);return {metadata,grid,template};
 })());return cache.get(id);
}
export function groundSpot(grid,x,z){
 const h=sampleGround(grid,x,z),cell=cellIndex(grid,x,z);if(Number.isFinite(h)&&cell>=0&&!grid.blocked[cell])return new THREE.Vector3(x,h,z);
 let best=null,distance=Infinity;for(let i=0;i<grid.heights.length;i++){if(!Number.isFinite(grid.heights[i])||grid.blocked[i])continue;const px=grid.minX+i%grid.nx*grid.step,pz=grid.minZ+Math.floor(i/grid.nx)*grid.step,d=(px-x)**2+(pz-z)**2;if(d<distance){distance=d;best=new THREE.Vector3(px,grid.heights[i],pz);}}
 if(!best)throw Error('No playable ground');return best;
}
