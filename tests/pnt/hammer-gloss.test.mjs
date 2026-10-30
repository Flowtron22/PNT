import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {HammerGloss}=await import('../../src/pnt/hammer-gloss.js');
const {createGameFX}=await import('../../src/pnt/game-fx.js');

test('Gloss adds an independent impact batch while retaining the existing hammer components',()=>{
 const scene=new THREE.Group(),fx=createGameFX(scene),impact=new THREE.Vector3(3,2,-4);
 fx.hammer(impact);fx.update(.05,new THREE.PerspectiveCamera());
 const added=scene.getObjectByName('hammer-gloss-flipbook');assert.ok(added.visible);
 assert.equal(scene.children.filter(m=>m.isMesh&&m.visible).length,17);
 assert.equal(scene.children.filter(m=>m.geometry?.name==='hammer-smoke-cluster').length,16);
 assert.ok(scene.getObjectByName('comic-hammer-splash').visible);
 assert.equal(added.geometry.drawRange.count,9*6);
 const pos=added.geometry.attributes.position;
 assert.ok(Math.abs(pos.getY(0)-2.095)<1e-6,'fans are placed just above the original impact height');
 fx.clear();assert.equal(added.visible,false);assert.equal(added.geometry.drawRange.count,0);
 fx.hammer(impact,{reduced:true});fx.update(.05);
 assert.equal(added.visible,false);assert.ok(scene.getObjectByName('comic-hammer-splash').visible,'reduced motion preserves the existing smash');
});

test('floor layers stay coplanar in a tilted arena while sparkles face the world camera',()=>{
 const root=new THREE.Group();root.rotation.set(.18,.3,-.2);root.position.set(2,3,-1);
 const fx=new HammerGloss(root),point=new THREE.Vector3(1,.4,-2),camera=new THREE.PerspectiveCamera();camera.position.set(3,7,10);camera.lookAt(0,0,0);
 fx.hit(point);fx.update(.08,camera);root.updateMatrixWorld(true);
 const pos=fx.geometry.attributes.position;
 for(let i=0;i<6;i++)assert.ok(Math.abs(pos.getY(i)-.415)<1e-6);
 for(let i=6;i<12;i++)assert.ok(Math.abs(pos.getY(i)-.425)<1e-6);
 const world=i=>new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(root.matrixWorld);
 const x=world(13).sub(world(12)),y=world(14).sub(world(13));
 const normal=x.cross(y).normalize(),cameraForward=new THREE.Vector3(0,0,1).applyQuaternion(camera.quaternion);
 assert.ok(Math.abs(normal.dot(cameraForward))>.999999);
});

test('overlapping smashes reuse one fixed allocation and all added layers expire',()=>{
 const fx=new HammerGloss(new THREE.Group()),allocation=fx.geometry.attributes.position.array;
 for(let n=0;n<50;n++){fx.hit(new THREE.Vector3(n%4,0,0));fx.update(.001);}
 assert.equal(fx.items.length,96);assert.equal(fx.group.children.length,1);
 assert.ok(fx.geometry.drawRange.count<=96*6);assert.equal(fx.geometry.attributes.position.array,allocation);
 for(let n=0;n<10;n++)fx.update(.1);
 assert.ok(fx.items.every(item=>item.life===0));assert.equal(fx.mesh.visible,false);
 assert.equal(fx.geometry.drawRange.count,0);
 fx.hit(new THREE.Vector3());fx.update(NaN);assert.ok(Array.from(allocation).every(Number.isFinite));
 fx.clear();assert.equal(fx.mesh.visible,false);
});

test('added layer lifetimes are stable at 30, 60 and 144 FPS without altering impact position',()=>{
 for(const fps of [30,60,144]){
  const fx=new HammerGloss(new THREE.Group()),point=new THREE.Vector3(4,1,3);fx.hit(point);
  for(let n=0;n<Math.ceil(fps*.8);n++)fx.update(1/fps);
  assert.equal(fx.mesh.visible,false);assert.deepEqual(point.toArray(),[4,1,3]);
 }
});
