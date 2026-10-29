import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {GLTFLoader}=await import('../../vendor/three/jsm/loaders/GLTFLoader.js');
const {makeAnimator}=await import('../../src/pnt/animation.js');
const {createPlayerMirage,animatePlayerMirage,disposePlayerMirage}=await import('../../src/pnt/player-mirage.js');
const {syncOnlineHazards}=await import('../../src/pnt/online-presentation.js');
const {attachHazardTelegraph}=await import('../../src/pnt/game-fx.js');
const loader=new GLTFLoader();loader.register(()=>({name:'geometry-only',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const data=JSON.parse(readFileSync(new URL('../../assets/pnt/animations/clips.json',import.meta.url))),clips=Object.fromEntries(Object.entries(data.clips).map(([n,c])=>[n,THREE.AnimationClip.parse(c)]));
async function actor(file){
 const b=readFileSync(new URL('../../assets/pnt/'+file,import.meta.url));
 const model=(await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene,group=new THREE.Group();
 const box=new THREE.Box3().setFromObject(model);model.scale.multiplyScalar(1.55/(box.max.y-box.min.y));group.add(model);
 const anim=makeAnimator(model,clips,'runner');anim.play('thiefRun',{fade:0});anim.update(.17);return {group,model,anim};
}

test('B2B bakes the actual costume pose into a frozen hologram without tools or live skeletons',async()=>{
 for(const file of ['thief.glb','police.glb',...readdirSync(new URL('../../assets/pnt/costumes/',import.meta.url)).map(n=>'costumes/'+n)]){
  const a=await actor(file);a.group.position.set(7,2,-3);a.group.rotation.y=.7;
  const tool=new THREE.Group();tool.name='Jetpack_SpineMount';tool.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));a.model.getObjectByName('Bip001-Spine1').add(tool);
  const hologram=createPlayerMirage(a),meshes=[];a.model.traverse(m=>{if(m.isMesh&&m.parent!==tool)meshes.push(m);});
  assert.equal(hologram.children.length,meshes.length);assert.ok(hologram.children.every(m=>!m.isSkinnedMesh));
  assert.ok(hologram.quaternion.angleTo(a.group.quaternion)<1e-6);
  const inverse=a.group.matrixWorld.clone().invert(),point=new THREE.Vector3();
  for(let k=0;k<meshes.length;k++){
   const source=meshes[k],copy=hologram.children[k],positions=copy.geometry.getAttribute('position');
   assert.notEqual(copy.geometry,source.geometry);assert.notEqual(copy.material,source.material);
   for(const i of [0,Math.floor(positions.count/2),positions.count-1]){
    point.fromBufferAttribute(source.geometry.getAttribute('position'),i);if(source.isSkinnedMesh)source.applyBoneTransform(i,point);
    point.applyMatrix4(source.matrixWorld).applyMatrix4(inverse);
    assert.ok(point.distanceTo(new THREE.Vector3().fromBufferAttribute(positions,i))<1e-5,file);
   }
  }
  const first=hologram.children[0],frozen=Array.from(first.geometry.getAttribute('position').array);
  a.anim.update(.3);a.group.position.x+=10;animatePlayerMirage(hologram,.05);
  assert.deepEqual(Array.from(first.geometry.getAttribute('position').array),frozen);assert.equal(hologram.position.length(),0);
  assert.equal(first.material.uniforms.time.value,.05);assert.equal(first.material.depthWrite,false);
  assert.equal(new Set(hologram.children.map(m=>m.material)).size,1);
  let disposed=0,sourceDisposed=0,ringDisposed=0;
  for(const m of hologram.children)m.geometry.addEventListener('dispose',()=>disposed++);
  meshes[0].geometry.addEventListener('dispose',()=>sourceDisposed++);
  const ring=attachHazardTelegraph(hologram,'rewind');ring.geometry.addEventListener('dispose',()=>ringDisposed++);
  disposePlayerMirage(hologram);disposePlayerMirage(hologram);
  assert.equal(disposed,meshes.length);assert.equal(sourceDisposed,0);assert.equal(ringDisposed,0,'shared telegraph stays valid');a.anim.dispose();
 }
});

test('online B2B markers use the owner model, remain frozen across snapshots and clean up on return',async()=>{
 const a=await actor('costumes/raptor.glb'),root=new THREE.Group(),hazards=[],h={id:3,type:'marker',owner:1,time:-1,position:[2,0,4]};
 const context={root,hazards,actors:[null,a],prop(){assert.fail('B2B must never request the old box prop');},dispose(h){disposePlayerMirage(h.mesh);h.mesh.removeFromParent();}};
 syncOnlineHazards([h],context);assert.equal(hazards.length,1);const mesh=hazards[0].mesh;
 assert.equal(mesh.name,'B2B_PlayerMirage');assert.deepEqual(mesh.position.toArray(),h.position);assert.equal(hazards[0].time,Infinity);
 const quaternion=mesh.quaternion.clone();a.group.rotation.y=2;a.anim.update(.2);syncOnlineHazards([h],context);
 assert.equal(hazards.length,1);assert.equal(hazards[0].mesh,mesh);assert.ok(mesh.quaternion.angleTo(quaternion)<1e-6);
 syncOnlineHazards([],context);assert.equal(hazards.length,0);assert.equal(root.children.length,0);assert.equal(mesh.userData.playerMirage,undefined);
 context.actors=[];syncOnlineHazards([h],context);assert.equal(hazards.length,0,'wait for the owner roster instead of making a box');a.anim.dispose();
});
