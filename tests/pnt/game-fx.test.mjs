import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import * as THREE from '../../vendor/three/build/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {createGameFX,createToonSmoke,smokeBombCloud,animateSmokeBomb,attachHazardTelegraph,animateHazardTelegraph,animateBananaHazard}=await import('../../src/pnt/game-fx.js');
const legacy=scene=>scene.children.filter(node=>node.isMesh);

test('jet exhaust follows the animated nozzle in tilted maps and interpolates births between frames',()=>{
 const scene=new THREE.Group();scene.rotation.z=.2;scene.position.set(3,2,1);
 const actor={group:new THREE.Group(),jetpackNozzle:new THREE.Object3D()};scene.add(actor.group);actor.group.add(actor.jetpackNozzle);actor.jetpackNozzle.position.set(0,.9,-.2);
 const fx=createGameFX(scene),state={effect:'rocket',effectTime:4};fx.jetpack(actor,state,0);
 const first=legacy(scene).find(m=>m.geometry.name==='hammer-smoke-cluster');
 assert.ok(first.position.distanceTo(new THREE.Vector3(0,.9,-.2))<1e-6);
 actor.group.position.x=.8;fx.jetpack(actor,state,.1);
 const births=legacy(scene).filter(m=>m.geometry.name==='hammer-smoke-cluster');assert.equal(births.length,3);
 assert.ok(births[1].position.x>.2&&births[1].position.x<.4);
 assert.ok(births[2].position.x>.5&&births[2].position.x<.7);
 assert.ok(births.every(m=>Math.abs(m.position.y-.9)<1e-6));fx.clear();
});

test('jet exhaust cadence is stable at 30/60/144 FPS and four players stay within the particle pool',()=>{
 const counts=[];
 for(const fps of [30,60,144]){
  const scene=new THREE.Scene(),fx=createGameFX(scene),actor={group:new THREE.Group()};
  for(let i=0;i<fps;i++)fx.jetpack(actor,{effect:'rocket',effectTime:5},1/fps);
  counts.push(legacy(scene).filter(m=>m.geometry.name==='hammer-smoke-cluster').length);fx.clear();
 }
 assert.ok(Math.max(...counts)-Math.min(...counts)<=1);assert.ok(counts.every(n=>n>=28&&n<=30));
 const scene=new THREE.Scene(),fx=createGameFX(scene),actors=Array.from({length:4},()=>({group:new THREE.Group()}));
 for(let i=0;i<600;i++){for(const actor of actors)fx.jetpack(actor,{effect:'rocket',effectTime:5},1/60);fx.update(1/60);assert.ok(legacy(scene).filter(m=>m.visible).length<80);}
 fx.update(.35);assert.ok(legacy(scene).every(m=>!m.visible));fx.clear();
});

test('smoke displacement changes the silhouette without tessellation or sphere seams',async()=>{
 const {displaceSmokeLobe}=await import('../../src/pnt/smoke-displacement.js');
 const {createHammerSmokeGeometry}=await import('../../src/pnt/game-fx.js');
 const base=new THREE.SphereGeometry(1,10,7),a=displaceSmokeLobe(base.clone()),b=displaceSmokeLobe(base.clone(),3);
 assert.equal(a.index.count,base.index.count);
 assert.equal(a.getAttribute('position').count,base.getAttribute('position').count);
 const pos=a.getAttribute('position'),other=b.getAttribute('position'),radii=[];
 let different=0;
 for(let i=0;i<pos.count;i++){
  const radius=Math.hypot(pos.getX(i),pos.getY(i),pos.getZ(i));
  radii.push(radius);assert.ok(radius>.64&&radius<1.36);
  if(Math.abs(pos.getX(i)-other.getX(i))>.001)different++;
 }
 assert.ok(Math.max(...radii)-Math.min(...radii)>.1,'noise visibly changes the lobe outline');
 assert.ok(different>20,'attached lobes sample different parts of the map');
 const cloud=createHammerSmokeGeometry(),normal=cloud.getAttribute('normal');
 assert.equal(cloud.index.count,base.index.count*9);
 assert.equal(normal.count,62*9,'seam and pole duplicates are welded for smooth lighting');
 for(let i=0;i<normal.count;i++)assert.ok(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-5);
 assert.ok(cloud.userData.displacementMap.endsWith('hammer-smoke-noise.png'));
 for(const geometry of [base,a,b,cloud])geometry.dispose();
});
test('jetpack emits short-lived cloud smoke with occasional coloured stars/hearts and stops after flight',()=>{
 const scene=new THREE.Scene(),fx=createGameFX(scene),actor={group:new THREE.Group()},state={effect:'rocket',effectTime:5},camera=new THREE.PerspectiveCamera();camera.rotation.set(-.5,.8,0);
 fx.jetpack(actor,state,1/60,camera);assert.equal(legacy(scene).length,3);
 assert.ok(legacy(scene).some(m=>m.geometry.name==='jet-star'));assert.ok(legacy(scene).some(m=>m.geometry.name==='jet-heart'));assert.ok(legacy(scene).some(m=>m.geometry.name==='hammer-smoke-cluster'));
 const palette=new Set([0xff80bc,0x8cecff,0xffdb70,0xc3a0ff,0x9af5c4]);for(const mesh of legacy(scene)){assert.ok((mesh.geometry.type==='ShapeGeometry'?palette:new Set([0xe8e9ec,0xd9dce2,0xf4f4f5])).has(mesh.material.color.getHex()));assert.equal(mesh.material.transparent,true);if(mesh.geometry.type==='ShapeGeometry')assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(mesh.quaternion).distanceTo(new THREE.Vector3(0,0,1).applyQuaternion(camera.quaternion))<1e-6);}
 fx.jetpack(actor,state,1/60,camera);assert.equal(legacy(scene).length,3);fx.jetpack(actor,state,.1,camera);assert.equal(legacy(scene).length,6);
 state.effectTime=0;fx.jetpack(actor,state,.2,camera);assert.equal(legacy(scene).length,6);fx.update(.35);assert.ok(legacy(scene).every(m=>!m.visible));
 state.effectTime=5;fx.jetpack(actor,state,1/60,camera);assert.equal(legacy(scene).length,6,'reuse particles');fx.clear();assert.ok(legacy(scene).every(m=>!m.visible));
 state.caught=true;fx.jetpack(actor,state,.2,camera);assert.ok(legacy(scene).every(m=>!m.visible));
});
test('hammer impact emits a green-yellow comic splash and reuses bounded particle pools',()=>{const scene=new THREE.Scene(),fx=createGameFX(scene);fx.hammer(new THREE.Vector3(1,0,2));assert.equal(legacy(scene).filter(m=>m.visible).length,17);const ring=legacy(scene).find(m=>m.geometry.type==='RingGeometry'),splash=scene.getObjectByName('comic-hammer-splash');assert.ok(splash?.visible);assert.match(splash.material.fragmentShader,/dot/);const initial=ring.scale.x,splashHeight=splash.scale.y;fx.update(.1);assert.ok(ring.scale.x>initial);assert.ok(splash.scale.y>splashHeight);for(let i=0;i<20;i++)fx.update(.05);assert.ok(legacy(scene).every(m=>!m.visible));assert.equal(splash.visible,false);for(let i=0;i<60;i++)fx.hammer(new THREE.Vector3());assert.ok(legacy(scene).length<=101);assert.ok(legacy(scene).filter(m=>m.visible).length<=100);fx.clear();assert.ok(legacy(scene).every(m=>!m.visible));});
test('toon run trails are opaque, distance-spaced clusters rather than continuous exhaust',()=>{const scene=new THREE.Scene(),fx=createGameFX(scene),actor={group:new THREE.Group(),speed:1,grounded:false};fx.run(actor,.1);assert.equal(legacy(scene).length,0);actor.grounded=true;fx.run(actor,.1);actor.group.position.x=.4;fx.run(actor,.1);assert.equal(legacy(scene).length,0);actor.group.position.x=.9;fx.run(actor,.1);assert.equal(legacy(scene).length,0);actor.group.position.x=1.8;fx.run(actor,.1);assert.equal(legacy(scene).filter(m=>m.visible).length,2);for(const puff of legacy(scene)){assert.equal(puff.material.transparent,false);assert.equal(puff.material.opacity,1);}for(let i=0;i<10;i++)fx.run(actor,.1);assert.equal(legacy(scene).length,2);fx.update(1);assert.equal(legacy(scene).filter(m=>m.visible).length,0);});
test('smoke clusters reuse opaque sphere geometry with varied sizes and orientations',()=>{const cloud=createToonSmoke(.7,16);assert.equal(cloud.children.length,16);assert.ok(new Set(cloud.children.map(p=>p.scale.x)).size>1);assert.ok(new Set(cloud.children.map(p=>p.rotation.x)).size>1);for(const puff of cloud.children){assert.equal(puff.geometry.type,'SphereGeometry');assert.equal(puff.material.transparent,false);assert.equal(puff.material.depthWrite,true);}});

test('hammer smoke uses the toon sphere mesh, spreads from ground impact and fades away',()=>{const scene=new THREE.Scene(),fx=createGameFX(scene),impact=new THREE.Vector3(4,2,-3);fx.hammer(impact);const puffs=legacy(scene).filter(m=>m.geometry.name==='hammer-smoke-cluster');assert.equal(puffs.length,16);for(const p of puffs){assert.equal(p.position.y,2.08);assert.equal(p.material.opacity,1);assert.equal(p.material.transparent,true);}fx.update(.55);assert.ok(puffs.every(p=>Math.hypot(p.position.x-4,p.position.z+3)>.8));assert.ok(puffs.some(p=>p.material.opacity<1));fx.update(1);assert.ok(puffs.every(p=>!p.visible));});

test('Wonder Wave world VFX stay pooled, distinctly colored and cover arcs, puffs, rescue and Sunken spray',()=>{const scene=new THREE.Scene(),fx=createGameFX(scene),camera=new THREE.PerspectiveCamera(),actor={group:new THREE.Group()};fx.hammerSwing(actor);fx.smokeDeploy(new THREE.Vector3());fx.capture(new THREE.Vector3(1,0,0));fx.rescue(new THREE.Vector3(-1,0,0));const root=scene.getObjectByName('wonder-wave-vfx');assert.ok(root);assert.ok(root.children.some(node=>node.visible&&node.type==='Group'),'hammer arc should be live');for(let i=0;i<6;i++)fx.update(.05,camera,{map:'sunken',bounds:new THREE.Box3(new THREE.Vector3(-4,0,-3),new THREE.Vector3(4,2,3))});const visible=[];root.traverse(node=>{if(node.isMesh&&node.visible&&node.material?.color)visible.push(node);});assert.ok(visible.some(node=>node.geometry.type==='ShapeGeometry'),'bursts use graphic spark shapes rather than extra spheres');assert.ok(visible.some(node=>node.geometry.type==='SphereGeometry'),'smoke uses lit toon puffs');assert.ok(new Set(visible.map(node=>node.material.color.getHex())).size>=4,'effects retain their event palettes');assert.ok(visible.every(node=>node.material.color.getHex()!==0),'no particle falls back to black');const count=root.children.length;fx.clear();assert.equal(root.children.length,count,'fixed pools are reused');assert.ok(root.children.filter(node=>/wonder-vfx-.*-pool/.test(node.name)).every(node=>!node.visible));});

test('smoke and rewind retain radius telegraphs while banana uses squash and stretch instead',()=>{for(const [type,radius] of [['smoke',2.6],['rewind',1.05]]){const root=new THREE.Group(),ring=attachHazardTelegraph(root,type);assert.equal(ring.geometry.parameters.outerRadius,radius);const count=root.children.length,scale=ring.scale.x;animateHazardTelegraph(root,.2);assert.equal(root.children.length,count);assert.notEqual(ring.scale.x,scale);assert.equal(attachHazardTelegraph(root,type),null);}const banana=new THREE.Group();banana.scale.setScalar(.65);banana.position.y=.03;assert.equal(attachHazardTelegraph(banana,'banana'),null);assert.equal(banana.children.length,0);const before=banana.scale.clone();let maxChange=0;for(let i=0;i<15;i++){animateBananaHazard(banana,.1);maxChange=Math.max(maxChange,banana.scale.distanceTo(before));}assert.ok(maxChange>.02);assert.ok(banana.position.y>=.03);});

test('smoke bombs billow without moving the gameplay center or creating extra meshes',()=>{const root=new THREE.Group(),cloud=smokeBombCloud();root.add(cloud);const before=cloud.children.map(p=>p.position.clone()),count=cloud.children.length;for(let i=0;i<600;i++)animateSmokeBomb(root,1/60);assert.equal(cloud.children.length,count);assert.equal(root.position.length(),0);assert.ok(cloud.children.some((p,i)=>p.position.distanceTo(before[i])>.1));for(const puff of cloud.children){assert.ok(puff.position.length()<2);assert.ok(puff.scale.x>0);assert.equal(puff.material.flatShading,false);}});

test('restored hammer splash and impact particles are 1.5x without enlarging other events',async()=>{const {WonderVFX}=await import('../../src/pnt/wonder-vfx.js'),original=Math.random;Math.random=()=>.5;try{const point=new THREE.Vector3(3,0,2),base=new WonderVFX(new THREE.Group()),larger=new WonderVFX(new THREE.Group());base.splashes.hit(point);base.burst(point,0x76df3c,1.15);larger.hammerImpact(point);for(let i=0;i<10;i++){base.update(1/60);larger.update(1/60);const a=base.splashes.items[0].mesh.scale,b=larger.splashes.items[0].mesh.scale;assert.ok(Math.abs(b.x/a.x-1.5)<1e-10);assert.ok(Math.abs(b.y/a.y-1.5)<1e-10);}const a=base.blobs.items[0],b=larger.blobs.items[0];assert.ok(Math.abs(b.size/a.size-1.5)<1e-10);assert.ok(Math.abs(larger.rings.items[0].size/base.rings.items[0].size-1.5)<1e-10);assert.equal(base.splashes.items[0].life,larger.splashes.items[0].life);larger.clear();larger.capture(point);assert.equal(larger.blobs.items[0].size,base.blobs.items[0].size*.85/1.15);base.clear();larger.clear();}finally{Math.random=original;}});

test('hammer smoke is a shared smooth nine-sphere cluster that expands radially from impact centre',()=>{const scene=new THREE.Scene(),fx=createGameFX(scene),impact=new THREE.Vector3(4,0,-3);fx.hammer(impact);const clouds=legacy(scene).filter(m=>m.geometry.name==='hammer-smoke-cluster');assert.equal(clouds.length,16);assert.equal(new Set(clouds.map(c=>c.geometry)).size,1);assert.equal(clouds[0].geometry.userData.spheres,9);assert.ok(clouds[0].geometry.getAttribute('normal').count>500);const size=clouds[0].scale.x;for(const cloud of clouds){assert.equal(cloud.material.flatShading,false);assert.ok(Math.hypot(cloud.position.x-4,cloud.position.z+3)<1e-9);}for(let i=0;i<12;i++)fx.update(1/60);const before=clouds.map(c=>Math.hypot(c.position.x-4,c.position.z+3));assert.ok(before.every(d=>d>.5));assert.ok(clouds[0].scale.x>size);for(let i=0;i<12;i++)fx.update(1/60);assert.ok(clouds.every((c,i)=>Math.hypot(c.position.x-4,c.position.z+3)>before[i]));for(let i=0;i<60;i++)fx.update(1/60);assert.ok(clouds.every(c=>!c.visible));fx.clear();});

test('hammer emits no isolated coloured sphere puffs while retaining clustered grey smoke',()=>{const scene=new THREE.Scene(),fx=createGameFX(scene);fx.hammer(new THREE.Vector3());fx.update(.05);const steam=scene.getObjectByName('wonder-vfx-steam-pool');assert.ok(steam.children.every(p=>!p.visible));const clouds=legacy(scene).filter(p=>p.geometry.name==='hammer-smoke-cluster');assert.equal(clouds.length,16);for(const p of clouds){const c=p.material.color;assert.ok(Math.abs(c.r-c.g)<.08&&Math.abs(c.g-c.b)<.08);}assert.ok(scene.getObjectByName('comic-hammer-splash').visible);fx.clear();fx.capture(new THREE.Vector3());fx.update(.05);assert.ok(steam.children.some(p=>p.visible),'other effects retain their puffs');fx.clear();});
