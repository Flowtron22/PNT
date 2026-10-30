import * as THREE from 'three';
import {createSmokeNormalField} from './smoke-normals.js';
import {BananaTrails} from './banana-trails.js';
import {mergeGeometries,mergeVertices} from '../../vendor/three/jsm/utils/BufferGeometryUtils.js';
import {displaceSmokeLobe} from './smoke-displacement.js';
import {CelebrationVFX,CacheCompletionTracker} from './celebration-vfx.js';
import {CaptureSmokeVFX,CAPTURE_CELEBRATION_DELAY} from './capture-smoke.js';
import {WonderVFX,attachHazardTelegraph,animateHazardTelegraph,animateBananaHazard} from './wonder-vfx.js';
export {attachHazardTelegraph,animateHazardTelegraph,animateBananaHazard};
const smokeGeometry=new THREE.SphereGeometry(1,10,7),smokeMaterials=[0xe8e9ec,0xd9dce2,0xc5cbd4,0xf4f4f5].map(color=>new THREE.MeshLambertMaterial({color,flatShading:false}));
// Nine noise-displaced lobes become one reusable geometry/draw per cloud.
// The satellites stay attached while the whole puff billows and moves outward.
export function createHammerSmokeGeometry(){
 const parts=[displaceSmokeLobe(smokeGeometry.clone()).scale(.64,.6,.64)];
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,radius=i%2?.38:.43,part=displaceSmokeLobe(smokeGeometry.clone(),i+1);part.scale(radius,radius*(i%2?.9:1.05),radius);part.translate(Math.cos(angle)*.55,i%2?.2:-.08,Math.sin(angle)*.55);parts.push(part);}
 const merged=mergeGeometries(parts);
 // UV/normal splits at sphere seams must be welded before recalculating smooth
 // lighting. The smoke material is untextured, so neither attribute is needed.
 merged.deleteAttribute('uv');merged.deleteAttribute('normal');
 const geometry=mergeVertices(merged);geometry.computeVertexNormals();
 geometry.name='hammer-smoke-cluster';geometry.userData.spheres=9;
 geometry.userData.displacementMap='assets/pnt/vfx/hammer-smoke-noise.png';
 for(const part of parts)part.dispose();merged.dispose();return geometry;
}
const hammerSmokeGeometry=createHammerSmokeGeometry();
const starShape=new THREE.Shape();
for(let i=0;i<10;i++){const angle=Math.PI/2+i*Math.PI/5,r=i%2?.45:1;starShape[i?'lineTo':'moveTo'](Math.cos(angle)*r,Math.sin(angle)*r);}starShape.closePath();
const heartShape=new THREE.Shape();heartShape.moveTo(0,.5);heartShape.bezierCurveTo(-.5,1.2,-1.2,.6,-.9,0);heartShape.bezierCurveTo(-.7,-.4,-.2,-.8,0,-1);heartShape.bezierCurveTo(.2,-.8,.7,-.4,.9,0);heartShape.bezierCurveTo(1.2,.6,.5,1.2,0,.5);
const starGeometry=new THREE.ShapeGeometry(starShape),heartGeometry=new THREE.ShapeGeometry(heartShape);
starGeometry.name='jet-star';heartGeometry.name='jet-heart';
const jetColors=[0xff80bc,0x8cecff,0xffdb70,0xc3a0ff,0x9af5c4];
export function createToonSmoke(size=1,count=12){const cloud=new THREE.Group();for(let i=0;i<count;i++){const puff=new THREE.Mesh(smokeGeometry,smokeMaterials[i%smokeMaterials.length]),angle=i*2.39996,radius=(.3+Math.random()*.8)*size;const scale=(.4+Math.random()*.65)*size;puff.position.set(Math.cos(angle)*radius,(Math.random()-.35)*size,Math.sin(angle)*radius);puff.scale.set(scale,scale*(.8+Math.random()*.4),scale);puff.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);cloud.add(puff);}return cloud;}
export function animateSmokeBomb(root,dt){
 const cloud=root.children.find(child=>child.userData.smokeBomb);if(!cloud)return;
 const data=cloud.userData.smokeBomb;data.time+=Math.min(dt,.1);const time=data.time;
 cloud.rotation.y=time*.14;
 cloud.children.forEach((puff,i)=>{const base=data.puffs[i],phase=time*.9+i*1.7;puff.position.copy(base.position);puff.position.x+=Math.sin(phase)*.16;puff.position.z+=Math.cos(phase*.83)*.16;puff.position.y+=Math.sin(phase*1.2)*.18;puff.scale.copy(base.scale).multiplyScalar(1+Math.sin(phase)*.12);puff.rotation.y+=dt*(i%2?-.22:.22);});
 data.normalField.update();
}
export function smokeBombCloud(){const cloud=createToonSmoke(1.2,14);cloud.position.y=.9;cloud.userData.smokeBomb={time:0,normalField:createSmokeNormalField(cloud),puffs:cloud.children.map(puff=>({position:puff.position.clone(),scale:puff.scale.clone()}))};return cloud;}
export function disposeSmokeBomb(root){root.children.find(child=>child.userData.smokeBomb)?.userData.smokeBomb.normalField.dispose();}
export function createGameFX(scene){
 const ring=new THREE.RingGeometry(.84,1,40),items=[],pool=[],MAX=100;
 const wonder=new WonderVFX(scene),bananaTrails=new BananaTrails(scene);
 const celebrations=new CelebrationVFX(scene),cacheCompletions=new CacheCompletionTracker();
 const captureSmoke=new CaptureSmokeVFX(scene,smokeGeometry),captureCelebrations=[];
 let jetTimers=new WeakMap();
 function jetpack(actor,state,dt,camera){
  const previous=jetTimers.get(actor);if(state.effect!=='rocket'||state.effectTime<=0||state.caught||state.captureRemaining>0){if(previous?.active)wonder.jetLand(actor.group.position);jetTimers.delete(actor);return;}
  const angle=actor.group.rotation.y,p=new THREE.Vector3();
  if(actor.jetpackNozzle){actor.jetpackNozzle.getWorldPosition(p);scene.worldToLocal(p);}
  else p.copy(actor.group.position).add(new THREE.Vector3(-Math.sin(angle)*.25,.65,-Math.cos(angle)*.25));
  const timer=previous||{remaining:0,active:false,position:p.clone(),accents:0};
  if(!timer.active){wonder.jetLaunch(actor.group.position);timer.active=true;}
  const elapsed=Math.min(Math.max(dt,0),.1);timer.remaining-=elapsed;
  if(timer.position.distanceToSquared(p)>9)timer.position.copy(p);
  // Fixed cadence with interpolated birth points keeps the trail continuous at
  // low FPS. Short lives bound the number of clouds, including four-player play.
  for(let count=0;timer.remaining<=0&&count<3;count++,timer.remaining+=.035){
   const fraction=elapsed?THREE.MathUtils.clamp(1+timer.remaining/elapsed,0,1):1;
   const at=timer.position.clone().lerp(p,fraction);
   const smoke=emit('jetSmoke',at,.24+Math.random()*.1,.18+Math.random()*.07,[0xe8e9ec,0xd9dce2,0xf4f4f5][Math.floor(Math.random()*3)]);
   smoke.v.set(-Math.sin(angle)*.9+(Math.random()-.5)*.3,-.3-Math.random()*.2,-Math.cos(angle)*.9+(Math.random()-.5)*.3);
   if(timer.accents++%4===0)for(const kind of ['jetStar','jetHeart']){
    const item=emit(kind,at,.18+Math.random()*.08,.1,jetColors[Math.floor(Math.random()*jetColors.length)]);
    item.v.copy(smoke.v);if(camera)item.mesh.quaternion.copy(camera.quaternion);else item.mesh.rotation.set(0,0,0);
    item.mesh.rotateZ((Math.random()-.5)*1.2);item.spin=(Math.random()-.5)*2;
   }
  }
  timer.position.copy(p);jetTimers.set(actor,timer);
 }
 function emit(kind,p,life,size,color){let item=pool.pop();if(!item){item={mesh:new THREE.Mesh(smokeGeometry,new THREE.MeshLambertMaterial({flatShading:false})),v:new THREE.Vector3()};scene.add(item.mesh);}if(items.length>=MAX){const old=items.shift();old.mesh.visible=false;pool.push(old);}const mesh=item.mesh;mesh.geometry=kind==='impactSmoke'||kind==='jetSmoke'?hammerSmokeGeometry:kind==='ring'?ring:kind==='jetStar'?starGeometry:kind==='jetHeart'?heartGeometry:smokeGeometry;mesh.material.side=THREE.DoubleSide;item.spin=0;item.visualScale=1;mesh.material.color.set(color);const transparent=kind==='ring'||kind==='impactSmoke'||kind.startsWith('jet');if(mesh.material.transparent!==transparent){mesh.material.transparent=transparent;mesh.material.needsUpdate=true;}mesh.material.depthWrite=!transparent;mesh.material.opacity=1;mesh.position.copy(p);mesh.rotation.set(kind==='ring'?-Math.PI/2:Math.random()*6,Math.random()*6,Math.random()*6);if(kind==='ring')mesh.rotation.set(-Math.PI/2,0,0);mesh.visible=true;item.kind=kind;item.life=item.total=life;item.size=size;item.v.set((Math.random()-.5)*.3,.25+Math.random()*.4,(Math.random()-.5)*.3);mesh.scale.setScalar(size);items.push(item);return item;}
 return {jetpack,bananaSpin:(actor,state,dt,options)=>bananaTrails.actor(actor,state,dt,options),hammerSwing:actor=>wonder.hammerSwing(actor),capture:(position,policePosition)=>{captureSmoke.burst(position,policePosition);if(captureCelebrations.length>=8)captureCelebrations.shift();captureCelebrations.push({position:position.clone(),time:CAPTURE_CELEBRATION_DELAY});},syncCaches(caches,positionFor=c=>new THREE.Vector3(...c.position),initial=false){cacheCompletions.update(caches,c=>celebrations.celebrate(positionFor(c),{gold:true}),{initial});},rescue:position=>wonder.rescue(position),smokeDeploy:position=>wonder.smokeDeploy(position),bananaDeploy:position=>wonder.bananaDeploy(position),rewind:position=>wonder.rewind(position),run(actor){const p=actor.group.position;if(actor.speed<.2||!actor.grounded){actor.lastDustPosition=null;return;}if(!actor.lastDustPosition){actor.lastDustPosition=p.clone();return;}if(p.distanceTo(actor.lastDustPosition)<1.7)return;actor.lastDustPosition.copy(p);for(let i=0;i<2;i++){const at=p.clone().add(new THREE.Vector3(-Math.sin(actor.group.rotation.y)*(.35+i*.08)+(Math.random()-.5)*.15,.13+i*.07,-Math.cos(actor.group.rotation.y)*(.35+i*.08)));emit('dust',at,.55+i*.08,.11+Math.random()*.12,i%2?0xe9e9e7:0xcfd3d9);}},hammer(position){const p=position.clone().add(new THREE.Vector3(0,.08,0));wonder.hammerImpact(p);const ring=emit('ring',p,.42,.25,0xffd267);ring.visualScale=1.5;ring.mesh.scale.multiplyScalar(1.5);ring.v.multiplyScalar(1.5);for(let i=0;i<16;i++){const angle=i/16*Math.PI*2,item=emit('impactSmoke',p,.7+Math.random()*.25,.2+Math.random()*.23,[0xe8e9ec,0xd9dce2,0xc5cbd4,0xf4f4f5][i%4]);const speed=2.2+Math.random()*1.4;item.v.set(Math.cos(angle)*speed,.25+Math.random()*.5,Math.sin(angle)*speed).multiplyScalar(1.5);item.visualScale=1.5;item.mesh.scale.multiplyScalar(1.5);}},update(dt,camera,context){for(let i=items.length-1;i>=0;i--){const a=items[i];a.life-=dt;if(a.life<=0){a.mesh.visible=false;items.splice(i,1);pool.push(a);continue;}const t=1-a.life/a.total;a.mesh.material.opacity=a.kind==='ring'?(1-t):a.kind==='impactSmoke'||a.kind.startsWith('jet')?Math.min(1,(1-t)*2):1;if(a.kind==='impactSmoke'){const drag=Math.exp(-1.4*dt);a.v.x*=drag;a.v.z*=drag;a.mesh.rotation.x+=dt*1.1;a.mesh.rotation.z+=dt*.7;}a.mesh.position.addScaledVector(a.v,dt);if(a.spin)a.mesh.rotateZ(a.spin*dt);a.mesh.scale.setScalar((a.kind==='ring'?.25+t*2.2:a.size*(1+Math.min(t,.5))*Math.min(1,(1-t)*3))*a.visualScale);}wonder.update(dt,camera,context);bananaTrails.update(dt,camera);captureSmoke.update(dt);celebrations.update(dt,camera);for(let i=captureCelebrations.length-1;i>=0;i--){const cue=captureCelebrations[i];cue.time-=Math.min(Math.max(dt||0,0),.1);if(cue.time<=0){celebrations.celebrate(cue.position);captureCelebrations.splice(i,1);}}},clear(){bananaTrails.clear();jetTimers=new WeakMap();for(const a of items){a.mesh.visible=false;pool.push(a);}items.length=0;wonder.clear();celebrations.clear();cacheCompletions.clear();captureSmoke.clear();captureCelebrations.length=0;}};
}
