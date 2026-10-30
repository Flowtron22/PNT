import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {JetEnergy}=await import('../../src/pnt/jet-energy.js');
function actorIn(root){const group=new THREE.Group(),jetpackNozzle=new THREE.Object3D();root.add(group);group.add(jetpackNozzle);jetpackNozzle.position.set(0,.7,-.2);return {group,jetpackNozzle};}
const flying={effect:'rocket',effectTime:4};

test('energy comes from the animated nozzle in transformed arenas, with a separate bounded batch',()=>{
 const root=new THREE.Group();root.position.set(3,-2,4);root.rotation.set(.2,.4,-.15);
 const fx=new JetEnergy(root),actor=actorIn(root);actor.group.rotation.y=1;
 root.updateMatrixWorld(true);fx.actor(actor,flying,0);
 const expected=actor.jetpackNozzle.getWorldPosition(new THREE.Vector3());root.worldToLocal(expected);
 const flash=fx.items.find(i=>i.kind===2&&i.life>0);assert.ok(flash.p.distanceTo(expected)<1e-9);
 const axis=new THREE.Vector3(0,-1,0).applyQuaternion(actor.jetpackNozzle.getWorldQuaternion(new THREE.Quaternion())).transformDirection(root.matrixWorld.clone().invert());
 assert.ok(flash.axis.distanceTo(axis)<1e-9);
 const camera=new THREE.PerspectiveCamera();camera.position.set(3,5,8);camera.lookAt(0,1,0);fx.update(1/60,camera);
 assert.equal(fx.group.children.length,1);assert.equal(fx.material.depthWrite,false);
 const positions=fx.geometry.attributes.position;assert.ok(Array.from(positions.array).every(Number.isFinite));
 assert.ok(fx.geometry.drawRange.count>0);assert.equal(root.children.filter(o=>o.isMesh).length,0);
});

test('four players remain within the fixed particle allocation at 30/60/144 FPS and stop cleanly',()=>{
 const counts=[];
 for(const fps of [30,60,144]){
  const root=new THREE.Group(),fx=new JetEnergy(root),actors=Array.from({length:4},()=>actorIn(root));
  const allocation=fx.geometry.attributes.position.array;
  for(let frame=0;frame<fps*3;frame++){
   for(const [i,actor] of actors.entries()){actor.group.position.set(i*2,1,frame/fps);fx.actor(actor,flying,1/fps);}
   fx.update(1/fps);assert.ok(fx.geometry.drawRange.count<=192*6);
  }
  counts.push(fx.items.filter(i=>i.life>0).length);assert.equal(fx.geometry.attributes.position.array,allocation);
  for(const actor of actors)fx.actor(actor,{effectTime:0},1/fps);
  for(let n=0;n<12;n++)fx.update(.1);
  assert.equal(fx.emitters.size,0);assert.equal(fx.mesh.visible,false);assert.equal(fx.geometry.drawRange.count,0);
 }
 assert.ok(Math.max(...counts)-Math.min(...counts)<=20,'cadence is independent of frame rate');
});

test('reduced motion, capture, teleports and clear do not leave stale emitter trails',()=>{
 const root=new THREE.Group(),fx=new JetEnergy(root),actor=actorIn(root);
 fx.actor(actor,flying,.05);fx.update(.01);assert.ok(fx.mesh.visible);
 fx.actor(actor,flying,.01,{reduced:true});fx.update(0);assert.equal(fx.mesh.visible,false);
 fx.actor(actor,flying,.05);fx.actor(actor,{...flying,caught:true},.01);fx.update(0);assert.equal(fx.mesh.visible,false);
 fx.actor(actor,flying,.05);actor.group.position.x=100;fx.actor(actor,flying,.016);
 assert.ok(fx.items.filter(i=>i.life>0).every(i=>i.p.x>98),'teleport never bridges old and new positions');
 fx.clear();assert.equal(fx.emitters.size,0);assert.equal(fx.geometry.drawRange.count,0);assert.ok(fx.items.every(i=>i.life===0&&i.owner===null));
 fx.actor(actor,flying,.05);fx.update(.01);assert.ok(fx.mesh.visible,'pool works after a new match');
});

test('sprite age advances through the baked atlas independently for staggered births',()=>{
 const root=new THREE.Group(),fx=new JetEnergy(root),actor=actorIn(root);
 // Energy births occur every other 65ms tick; advance to the next birth.
 fx.actor(actor,flying,0);fx.update(.1);fx.actor(actor,flying,.065);fx.update(.065);fx.actor(actor,flying,.065);fx.update(.01);
 const ages=Array.from(fx.geometry.attributes.age.array.slice(0,fx.geometry.drawRange.count));
 assert.ok(ages.every(a=>a>=0&&a<=1));assert.ok(Math.max(...ages)-Math.min(...ages)>.2);
 fx.actor(actor,flying,NaN);fx.update(NaN);
 assert.ok(Array.from(fx.geometry.attributes.position.array).every(Number.isFinite));
});
