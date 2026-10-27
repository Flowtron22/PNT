import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/build/three.module.js';
function inspect(file){
 const bytes=fs.readFileSync(file),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length),entries=[];
 function visit(index,parent){const node=json.nodes[index],matrix=new THREE.Matrix4();if(node.matrix)matrix.fromArray(node.matrix);else matrix.compose(new THREE.Vector3().fromArray(node.translation||[0,0,0]),new THREE.Quaternion().fromArray(node.rotation||[0,0,0,1]),new THREE.Vector3().fromArray(node.scale||[1,1,1]));matrix.premultiply(parent);
  if(node.mesh!==undefined){const box=new THREE.Box3(),mesh=json.meshes[node.mesh];const materialCounts={};let triangles=0;for(const p of mesh.primitives){const a=json.accessors[p.attributes.POSITION],v=json.bufferViews[a.bufferView];assert.equal(a.componentType,5126);const stride=v.byteStride||12;for(let i=0;i<a.count;i++){const offset=(v.byteOffset||0)+(a.byteOffset||0)+i*stride;box.expandByPoint(new THREE.Vector3(bin.readFloatLE(offset),bin.readFloatLE(offset+4),bin.readFloatLE(offset+8)).applyMatrix4(matrix));}const count=(p.indices!==undefined?json.accessors[p.indices].count:a.count)/3;triangles+=count;const materialName=json.materials[p.material].name.replace(/\.\d+$/,'');materialCounts[materialName]=(materialCounts[materialName]||0)+count;}entries.push({name:node.name,box,triangles,materialCounts,primitives:mesh.primitives});}
  for(const child of node.children||[])visit(child,matrix);
 }for(const root of json.scenes[json.scene||0].nodes)visit(root,new THREE.Matrix4());return entries;
}
const arena=process.argv[2]||'mall',metadata=JSON.parse(fs.readFileSync(`assets/pnt/arenas/${arena}-contact-ao.json`));
const original=inspect(`assets/pnt/arenas/${arena}.glb`),baked=inspect(`assets/pnt/arenas/${arena}-lit.glb`);
assert.equal(baked.length,original.length);
for(const a of original){const name=a.name;const b=baked.find(b=>(b.name===name||name==='StaticMesh'&&/^StaticMesh\.\d+$/.test(b.name))&&a.box.min.distanceTo(b.box.min)<.001);assert.ok(b,`Missing ${name}`);assert.equal(b.triangles,a.triangles,`${name} triangles`);assert.ok(a.box.min.distanceTo(b.box.min)<.001&&a.box.max.distanceTo(b.box.max)<.001,`${name} transformed bounds changed`);
 assert.deepEqual(b.materialCounts,a.materialCounts,`${name} material triangle assignments`);const needsUV=arena==='mall'?!/^BP_Coffee(Chair|Table)/.test(name):metadata.receivers.includes(name);assert.ok(b.primitives.every(p=>(p.attributes.TEXCOORD_1!==undefined)===needsUV),`${name} lightmap UV assignment`);
}
console.log(`Verified ${arena}: ${baked.length} mesh placements, triangle/material counts and receiver UV1 assignment.`);
