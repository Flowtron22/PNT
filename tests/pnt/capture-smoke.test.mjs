import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {createGameFX}=await import('../../src/pnt/game-fx.js');
const {CAPTURE_CELEBRATION_DELAY}=await import('../../src/pnt/capture-smoke.js');
const {presentOnlineEvent}=await import('../../src/pnt/online-presentation.js');

test('restored capture cloud covers both characters with neutral smooth spheres',()=>{
 const scene=new THREE.Group(),fx=createGameFX(scene),hazards=[];
 presentOnlineEvent({type:'capture',actor:0,position:[2,0,3],policePosition:[0,0,3]},{actors:[{group:new THREE.Group()}],root:scene,hazards,fx});
 assert.equal(hazards.length,0);const smoke=scene.getObjectByName('capture-smoke'),cloud=smoke.children.find(p=>p.visible);
 assert.equal(cloud.children.length,16);assert.equal(new Set(cloud.children.map(p=>p.geometry)).size,1);
 assert.ok(cloud.position.distanceTo(new THREE.Vector3(1,.8,3))<1e-8);
 for(const puff of cloud.children){assert.equal(puff.geometry.type,'SphereGeometry');assert.equal(puff.material.flatShading,false);const c=puff.material.color;assert.ok(Math.abs(c.r-c.g)<.1&&Math.abs(c.g-c.b)<.1);}
 const bounds=new THREE.Box3().setFromObject(cloud);assert.ok(bounds.min.x<0&&bounds.max.x>2);assert.ok(bounds.min.y<0&&bounds.max.y>1.55);
 for(let i=0;i<11;i++)fx.update(.1);assert.equal(cloud.visible,false);fx.clear();
});

test('capture celebration always starts after smoke has finished at 30/60/144 FPS',()=>{
 for(const fps of [30,60,144]){
  const scene=new THREE.Group(),fx=createGameFX(scene),point=new THREE.Vector3(4,0,2);fx.capture(point);point.set(100,100,100);
  const smoke=scene.getObjectByName('capture-smoke'),celebration=scene.getObjectByName('celebration-vfx');let firstCelebration=null;
  for(let frame=1;frame<=fps*1.5;frame++){
   fx.update(1/fps);const liveSmoke=smoke.children.some(p=>p.visible);
   assert.ok(!(liveSmoke&&celebration.visible),'smoke and celebration must not overlap');
   if(celebration.visible&&firstCelebration===null)firstCelebration=frame/fps;
  }
  assert.ok(firstCelebration>=CAPTURE_CELEBRATION_DELAY-1e-8&&firstCelebration<CAPTURE_CELEBRATION_DELAY+2/fps);
  const position=celebration.children[0].geometry.getAttribute('position');assert.ok(position.getX(0)<10,'effect stays at the captured location');fx.clear();
 }
});

test('capture effects recycle a bounded smoke pool and clear cancels deferred celebrations',()=>{
 const scene=new THREE.Group(),fx=createGameFX(scene),smoke=scene.getObjectByName('capture-smoke');
 for(let i=0;i<100;i++)fx.capture(new THREE.Vector3(i%3,0,0));assert.equal(smoke.children.length,4);
 const geometry=smoke.children[0].children[0].geometry;fx.update(.1);fx.clear();for(let i=0;i<20;i++)fx.update(.1);
 assert.ok(smoke.children.every(p=>!p.visible));assert.equal(scene.getObjectByName('celebration-vfx').visible,false);
 fx.capture(new THREE.Vector3());assert.equal(smoke.children[0].children[0].geometry,geometry);fx.clear();
});
