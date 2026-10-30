import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {BananaTrails}=await import('../../src/pnt/banana-trails.js');
const {createGameFX}=await import('../../src/pnt/game-fx.js');
const {makeAnimator}=await import('../../src/pnt/animation.js');
const {GLTFLoader}=await import('../../vendor/three/jsm/loaders/GLTFLoader.js');
const state={effect:'banana',effectTime:2,caught:false,captureRemaining:0};
function actor(root,id=0){const group=new THREE.Group(),model=new THREE.Group(),hands=[new THREE.Bone(),new THREE.Bone()];hands[0].name='Bip001-L-Hand';hands[1].name='Bip001-R-Hand';group.add(model);model.add(...hands);root.add(group);group.position.x=id*2;return {id,group,model,hands};}
function pose(a,time){a.group.rotation.y=time*12;a.hands.forEach((hand,i)=>hand.position.set(i?.58:-.58,.9+Math.sin(time*8+i)*.1,0));a.group.position.z=time*.5;}

test('banana spin creates tapered bright ribbons from moving hand bones, with no new geometry per frame',()=>{
 const root=new THREE.Group(),fx=new BananaTrails(root),a=actor(root),camera=new THREE.PerspectiveCamera();camera.position.set(0,5,8);
 const geometry=fx.geometry,material=fx.material,positions=geometry.getAttribute('position').array;
 fx.actor(a,{...state,effect:'rocket'},1/60);fx.update(1/60,camera);assert.equal(fx.mesh.visible,false);
 for(let i=0;i<45;i++){pose(a,i/60);fx.actor(a,state,1/60);fx.update(1/60,camera);}
 assert.equal(fx.mesh.visible,true);assert.equal(fx.geometry,geometry);assert.equal(fx.material,material);assert.equal(fx.geometry.getAttribute('position').array,positions);assert.ok([...positions].every(Number.isFinite));assert.equal(material.depthWrite,false);assert.equal(material.depthTest,true);assert.equal(material.blending,THREE.NormalBlending);
 assert.ok(geometry.getAttribute('fade').array.some(value=>value>.9));assert.ok(geometry.getAttribute('fade').array.some(value=>value>0&&value<.4));
 const slot=fx.slots.find(s=>s.actor===a),head=slot.strands[0].points[slot.strands[0].head].p;root.updateMatrixWorld(true);assert.ok(head.distanceTo(root.worldToLocal(a.hands[0].getWorldPosition(new THREE.Vector3())))<.015);
 fx.actor(a,{...state,effectTime:0},1/60);for(let i=0;i<24;i++)fx.update(1/60,camera);assert.equal(fx.mesh.visible,true,'the extended tail persists beyond the previous .34-second life');for(let i=0;i<44;i++)fx.update(1/60,camera);assert.equal(fx.mesh.visible,false);assert.equal(fx.geometry.drawRange.count,0);assert.ok(fx.slots.every(s=>s.actor===null));
});

test('map tilt does not offset the hand anchors and teleports never connect distant ribbon histories',()=>{
 const root=new THREE.Group();root.rotation.z=.18;root.position.set(3,2,-4);const fx=new BananaTrails(root),a=actor(root);
 for(let i=0;i<12;i++){pose(a,i/60);fx.actor(a,state,1/60);fx.update(1/60);}
 let strand=fx.slots[0].strands[0];const expected=root.worldToLocal(a.hands[0].getWorldPosition(new THREE.Vector3()));assert.ok(expected.distanceTo(strand.points[strand.head].p)<.015);
 a.group.position.x+=12;fx.actor(a,state,1/60);fx.update(1/60);strand=fx.slots[0].strands[0];assert.equal(strand.count,1);assert.equal(fx.mesh.visible,false);
 pose(a,.3);fx.actor(a,state,.5);fx.update(.1);assert.equal(fx.slots[0].strands[0].count,1);
});

test('30/60/144 FPS have bounded histories and four players share one mesh throughout repeated uses',()=>{
 const counts=[];
 for(const fps of [30,60,144]){const root=new THREE.Group(),fx=new BananaTrails(root),actors=Array.from({length:4},(_,i)=>actor(root,i));
  for(let frame=0;frame<fps*2;frame++){for(const a of actors){pose(a,frame/fps);fx.actor(a,state,1/fps);}fx.update(1/fps);}
  counts.push(fx.slots[0].strands[0].count);assert.equal(root.getObjectByName('banana-spin-vfx').children.length,1);const capacity=fx.geometry.getAttribute('position').count/(4*2*2);assert.ok(fx.geometry.drawRange.count<=4*2*(capacity-1)*6);assert.ok(fx.slots.every(s=>s.strands.every(r=>r.count<=capacity)));
  fx.clear();assert.equal(fx.mesh.visible,false);assert.ok(fx.slots.every(s=>s.actor===null));
 }assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
});

test('capture, reduced motion and gameFX cleanup immediately suppress ribbons without affecting gameplay',()=>{
 const root=new THREE.Group(),fx=createGameFX(root),a=actor(root),original={...state};
 for(let i=0;i<20;i++){pose(a,i/60);fx.bananaSpin(a,state,1/60);fx.update(1/60);}
 const mesh=root.getObjectByName('banana-spin-light-trails');assert.equal(mesh.visible,true);fx.bananaSpin(a,{...state,caught:true},1/60);fx.update(1/60);assert.equal(mesh.visible,false);
 for(let i=0;i<20;i++){pose(a,i/60);fx.bananaSpin(a,state,1/60,{reduced:true});fx.update(1/60);}assert.equal(mesh.visible,false);assert.deepEqual(state,original);
 for(let i=0;i<20;i++){pose(a,i/60);fx.bananaSpin(a,state,1/60);fx.update(1/60);}assert.equal(mesh.visible,true);fx.clear();assert.equal(mesh.visible,false);
});

test('all nine actual costume hand bones generate finite ribbons through the banana animation',async()=>{
 const loader=new GLTFLoader();loader.register(()=>({name:'geometry-only',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 const data=JSON.parse(readFileSync(new URL('../../assets/pnt/animations/clips.json',import.meta.url))),clips=Object.fromEntries(Object.entries(data.clips).map(([name,c])=>[name,THREE.AnimationClip.parse(c)]));
 for(const file of ['thief.glb','police.glb',...['oyen','pingu','pumpkin','boney','purple','racer','raptor'].map(n=>'costumes/'+n+'.glb')]){
  const bytes=readFileSync(new URL('../../assets/pnt/'+file,import.meta.url)),model=(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);model.scale.multiplyScalar(1.55/(box.max.y-box.min.y));const root=new THREE.Group(),group=new THREE.Group();root.add(group);group.add(model);
  const fx=new BananaTrails(root),a={group,model},anim=makeAnimator(model,clips,'runner');anim.play('banana',{fade:0});
  for(let i=0;i<30;i++){anim.update(1/60);fx.actor(a,state,1/60);fx.update(1/60);}
  assert.equal(fx.slots[0].hands.filter(Boolean).length,2,file);assert.equal(fx.mesh.visible,true,file);assert.ok([...fx.geometry.getAttribute('position').array].every(Number.isFinite),file);anim.dispose();fx.clear();
 }
});
