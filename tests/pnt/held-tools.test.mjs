import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {GLTFLoader}=await import('../../vendor/three/jsm/loaders/GLTFLoader.js');
const {makeAnimator}=await import('../../src/pnt/animation.js');
const {attachHeldHammer}=await import('../../src/pnt/held-tools.js');
const {presentOnlineEvent}=await import('../../src/pnt/online-presentation.js');
const loader=new GLTFLoader();loader.register(()=>({name:'geometry-only',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
async function load(file){const b=readFileSync(new URL('../../assets/pnt/'+file,import.meta.url));return (await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;}
const data=JSON.parse(readFileSync(new URL('../../assets/pnt/animations/clips.json',import.meta.url))),clips=Object.fromEntries(Object.entries(data.clips).map(([n,c])=>[n,THREE.AnimationClip.parse(c)]));
const hammer=await load('props/SM_TL_Hammer.glb');
function prop(){const object=hammer.clone(true),box=new THREE.Box3().setFromObject(object);object.scale.multiplyScalar(1.25/Math.max(...box.getSize(new THREE.Vector3()).toArray()));object.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(object),center=b.getCenter(new THREE.Vector3());object.position.add(new THREE.Vector3(-center.x,-b.min.y,-center.z));const root=new THREE.Group();root.add(object);return root;}
async function avatar(file){const model=await load(file);let box=new THREE.Box3().setFromObject(model);model.scale.multiplyScalar(1.55/(box.max.y-box.min.y));model.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));const group=new THREE.Group();group.add(model);return {model,group};}
test('hammer grip stays inside the animated right hand on all nine normalized costumes',async()=>{
 for(const file of ['thief.glb','police.glb',...readdirSync(new URL('../../assets/pnt/costumes/',import.meta.url)).map(n=>'costumes/'+n)]){
  const actor=await avatar(file),visual=prop(),box=new THREE.Box3().setFromObject(visual),grip=new THREE.Object3D();grip.position.set(0,box.min.y+(box.max.y-box.min.y)*.88,0);visual.add(grip);
  const socket=attachHeldHammer(actor,visual);assert.ok(socket,file);assert.equal(socket.parent.name,'Bip001-R-Hand');
  const anim=makeAnimator(actor.model,clips,'runner');anim.play('hammer',{loop:false,fade:0});let previous=null,travel=0;
  for(const time of [0,.08,.14,.22,.32,.4]){anim.mixer.setTime(time);actor.group.updateMatrixWorld(true);const p=socket.getWorldPosition(new THREE.Vector3());assert.ok(p.distanceTo(grip.getWorldPosition(new THREE.Vector3()))<1e-6,file+': handle must remain at the grip');const local=socket.parent.worldToLocal(p.clone());assert.ok(local.distanceTo(socket.position)<1e-6);const scale=socket.getWorldScale(new THREE.Vector3());assert.ok(Math.abs(scale.x-1)<1e-5&&Math.abs(scale.y-1)<1e-5&&Math.abs(scale.z-1)<1e-5,file+': costume scale must not shrink hammer');if(previous)travel+=p.distanceTo(previous);previous=p;}
  assert.ok(travel>.5,file+': hammer must follow the swing, not float at actor offset');socket.removeFromParent();assert.equal(socket.parent,null);anim.dispose();
 }
});
test('multiplayer tool events use the same hand attachment and existing cleanup lifetime',async()=>{
 const actor=await avatar('police.glb'),hazards=[];presentOnlineEvent({type:'tool',tool:'hammer',actor:0},{actors:[actor],root:new THREE.Group(),hazards,prop});assert.equal(hazards.length,1);assert.equal(hazards[0].mesh.parent.name,'Bip001-R-Hand');assert.equal(hazards[0].time,.48);
});
