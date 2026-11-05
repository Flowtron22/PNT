import {registerHooks} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';

const threeURL=new URL('../vendor/three/build/three.module.js',import.meta.url);
registerHooks({resolve(s,c,next){return s==='three'?{url:threeURL.href,shortCircuit:true}:next(s,c);}});
const THREE=await import(threeURL);
const {FBXLoader}=await import('../vendor/three/jsm/loaders/FBXLoader.js');
const {GLTFExporter}=await import('../vendor/three/jsm/exporters/GLTFExporter.js');
THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
globalThis.FileReader=class {
 readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend();});}
};
const source=process.argv[2];
if(!source)throw Error('Supply the slipperystriker.fbx path.');
const file=readFileSync(source);
const model=new FBXLoader().parse(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
model.updateMatrixWorld(true);
if(process.argv.includes('--inspect')){
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const box=new THREE.Box3().setFromObject(mesh,true);
  console.log(mesh.name,box.min.toArray().map(v=>+v.toFixed(3)),box.max.toArray().map(v=>+v.toFixed(3)),
   [mesh.material].flat().map(m=>[m.name,!!m.map]));
 });
 process.exit(0);
}
const ice=model.getObjectByName('airhockey_ice_Ground');
const iceBounds=new THREE.Box3().setFromObject(ice,true);
const center=iceBounds.getCenter(new THREE.Vector3());
center.y=iceBounds.max.y;
const scale=.008;
const arena=new THREE.Group();
arena.scale.setScalar(scale);
arena.position.copy(center).multiplyScalar(-scale);
arena.add(model);
const material=new THREE.MeshStandardMaterial({name:'Air hockey atlas',roughness:.7,metalness:0,side:THREE.DoubleSide});
model.traverse(mesh=>{
 if(!mesh.isMesh)return;
 const uv=mesh.geometry.attributes.uv;
 if(!uv)throw Error('Missing UVs on '+mesh.name);
 for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));
 mesh.material=material;
});
arena.updateMatrixWorld(true);
const bounds=name=>new THREE.Box3().setFromObject(model.getObjectByName(name),true);
const rink=bounds('airhockey_ice_Ground'),red=bounds('red_goal'),blue=bounds('blue_goal');
console.log({ice:[rink.min.toArray(),rink.max.toArray()],red:[red.min.toArray(),red.max.toArray()],blue:[blue.min.toArray(),blue.max.toArray()]});
const output=new URL('../assets/pnt/arenas/',import.meta.url);
const glb=Buffer.from(await new GLTFExporter().parseAsync(arena,{binary:true}));
const jsonLength=glb.readUInt32LE(12),json=JSON.parse(glb.toString('utf8',20,20+jsonLength));
const geometry=glb.subarray(28+jsonLength);
const png=readFileSync(join(dirname(source),'bgr_airhockey_tex.png'));
json.images=[{mimeType:'image/png',bufferView:json.bufferViews.length}];
json.bufferViews.push({buffer:0,byteOffset:geometry.length,byteLength:png.length});
json.textures=[{source:0}];
json.materials[0].pbrMetallicRoughness.baseColorTexture={index:0};
json.buffers[0].byteLength=geometry.length+png.length;
const pad=(data,fill)=>Buffer.concat([data,Buffer.alloc((4-data.length%4)%4,fill)]);
const manifest=pad(Buffer.from(JSON.stringify(json)),32),bin=pad(Buffer.concat([geometry,png]),0);
const chunk=(data,type)=>{const header=Buffer.alloc(8);header.writeUInt32LE(data.length);header.writeUInt32LE(type,4);return Buffer.concat([header,data]);};
const header=Buffer.from(glb.subarray(0,12));
header.writeUInt32LE(28+manifest.length+bin.length,8);
writeFileSync(new URL('slipperystriker-lit.glb',output),Buffer.concat([header,chunk(manifest,0x4e4f534a),chunk(bin,0x004e4942)]));

const step=.25,minX=-9,minZ=-11,nx=73,nz=89,heights=[],blocked=[];
const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
 ray.set(new THREE.Vector3(minX+x*step,2,minZ+z*step),down);
 const floor=ray.intersectObject(ice,false)[0]?.point.y;
 heights.push(floor===undefined?null:+floor.toFixed(4));
 blocked.push(floor===undefined?1:0);
}
const spawns=[[-2.4,0,5.6],[2.4,0,5.6],[-2.4,0,-5.6],[2.4,0,-5.6]];
for(const [suffix,data] of [['',{id:'slipperystriker',name:'SLIPPERY SHOOTS',origin:[0,0,0],spawns,caches:[]}],
 ['.nav',{step,minX,minZ,nx,nz,heights}],['.collision',{blocked,edges:Array(nx*nz).fill(0)}]]){
 writeFileSync(new URL('slipperystriker'+suffix+'.json',output),JSON.stringify(data)+'\n');
}
