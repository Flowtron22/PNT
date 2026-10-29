import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {CelebrationVFX,CacheCompletionTracker}=await import('../../src/pnt/celebration-vfx.js');
const {createGameFX}=await import('../../src/pnt/game-fx.js');
const {presentOnlineEvent}=await import('../../src/pnt/online-presentation.js');
const {createRound,harvest}=await import('../../src/pnt/rules.js');

test('celebration uses colourful tumbling confetti and two delayed radial fireworks in one bounded draw',()=>{
 const root=new THREE.Group(),fx=new CelebrationVFX(root),camera=new THREE.PerspectiveCamera();camera.position.set(2,6,8);camera.lookAt(0,0,0);
 root.rotation.z=.15;fx.celebrate(new THREE.Vector3(3,0,2));
 assert.equal(fx.items.filter(p=>p.life>0&&p.kind===0).length,26);assert.equal(fx.pending.length,2);
 assert.equal(fx.group.children.length,1);assert.equal(fx.mesh.material.depthWrite,false);
 assert.ok(new Set(fx.items.filter(p=>p.life>0).map(p=>p.color.getHex())).size>=6);
 const confetti=fx.items.find(p=>p.kind===0&&p.life>0),start=confetti.p.clone(),rotation=confetti.rotation.clone();
 fx.update(.1,camera);assert.ok(confetti.p.y>start.y);assert.notDeepEqual(confetti.rotation.toArray(),rotation.toArray());
 fx.update(.1,camera);assert.equal(fx.pending.length,1);assert.ok(fx.items.filter(p=>p.life>0&&p.kind===1).length>=18);
 for(let i=0;i<3;i++)fx.update(.05,camera);assert.equal(fx.pending.length,0);
 assert.ok(fx.geometry.drawRange.count>0&&fx.geometry.drawRange.count<=256*6);
 assert.ok([...fx.geometry.getAttribute('position').array].every(Number.isFinite));
 assert.ok([...fx.geometry.getAttribute('color').array].some(v=>v>.8));
 for(let i=0;i<25;i++)fx.update(.1,camera);assert.equal(fx.geometry.drawRange.count,0);assert.equal(fx.group.visible,false);
});

test('simultaneous celebrations recycle fixed geometry and clear all pending fireworks',()=>{
 const fx=new CelebrationVFX(new THREE.Group()),geometry=fx.geometry,material=fx.material;
 for(let i=0;i<100;i++)fx.celebrate(new THREE.Vector3(i%4,0,0));
 assert.equal(fx.items.length,256);assert.equal(fx.pending.length,16);
 for(let i=0;i<10;i++){fx.update(.05);assert.ok(fx.geometry.drawRange.count<=256*6);}
 assert.equal(fx.geometry,geometry);assert.equal(fx.material,material);fx.clear();
 assert.equal(fx.pending.length,0);assert.ok(fx.items.every(p=>p.life===0));assert.equal(fx.group.visible,false);
 fx.update(.1);assert.equal(fx.geometry.drawRange.count,0);
});

test('cache completion fires once on positive-to-zero transitions and suppresses initial/repeated snapshots',()=>{
 const tracker=new CacheCompletionTracker(),events=[],caches=[{id:'a',remaining:10},{id:'b',remaining:0}];
 tracker.update(caches,c=>events.push(c.id));assert.deepEqual(events,[]);
 caches[0].remaining=0;tracker.update(caches,c=>events.push(c.id));tracker.update(caches,c=>events.push(c.id));
 assert.deepEqual(events,['a'],'copied numeric state survives mutable local rounds');
 tracker.update([{id:'a',remaining:10}],c=>events.push(c.id),{initial:true});
 tracker.update([{id:'a',remaining:0}],c=>events.push(c.id),{initial:true});assert.deepEqual(events,['a']);
 tracker.clear();tracker.update([{id:'a',remaining:0}],c=>events.push(c.id));assert.deepEqual(events,['a']);
});

test('actual cache harvest and online capture presentation both trigger the celebration batch',()=>{
 const root=new THREE.Group(),fx=createGameFX(root),round=createRound('runner',[{id:'cache',amount:1,position:[3,0,4]}]);
 const batch=root.getObjectByName('celebration-vfx');fx.syncCaches(round.caches);assert.equal(batch.visible,false);
 harvest(round,0,'cache',.1,0);assert.equal(round.phase,'finished');fx.syncCaches(round.caches);fx.update(.05,new THREE.PerspectiveCamera());
 assert.equal(batch.visible,true);assert.ok(batch.children[0].geometry.drawRange.count>0);
 fx.clear();fx.syncCaches(round.caches);assert.equal(batch.visible,false,'joining an already empty cache is silent');
 presentOnlineEvent({type:'capture',actor:0,position:[1,0,2]},{actors:[{group:new THREE.Group()}],root,hazards:[],fx});
 fx.update(.05,new THREE.PerspectiveCamera());assert.equal(batch.visible,false,'capture celebration waits for smoke');for(let i=0;i<24;i++)fx.update(.05,new THREE.PerspectiveCamera());assert.equal(batch.visible,true);fx.clear();assert.equal(batch.visible,false);
});
