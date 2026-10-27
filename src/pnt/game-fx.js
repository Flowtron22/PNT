import * as THREE from 'three';
const smokeGeometry=new THREE.SphereGeometry(1,10,7),smokeMaterials=[0xe8e9ec,0xd9dce2,0xc5cbd4,0xf4f4f5].map(color=>new THREE.MeshLambertMaterial({color,flatShading:true}));
const starShape=new THREE.Shape();
for(let i=0;i<10;i++){const angle=Math.PI/2+i*Math.PI/5,r=i%2?.45:1;starShape[i?'lineTo':'moveTo'](Math.cos(angle)*r,Math.sin(angle)*r);}starShape.closePath();
const heartShape=new THREE.Shape();heartShape.moveTo(0,.5);heartShape.bezierCurveTo(-.5,1.2,-1.2,.6,-.9,0);heartShape.bezierCurveTo(-.7,-.4,-.2,-.8,0,-1);heartShape.bezierCurveTo(.2,-.8,.7,-.4,.9,0);heartShape.bezierCurveTo(1.2,.6,.5,1.2,0,.5);
const starGeometry=new THREE.ShapeGeometry(starShape),heartGeometry=new THREE.ShapeGeometry(heartShape);
starGeometry.name='jet-star';heartGeometry.name='jet-heart';
const jetColors=[0xff80bc,0x8cecff,0xffdb70,0xc3a0ff,0x9af5c4];
export function createToonSmoke(size=1,count=12){const cloud=new THREE.Group();for(let i=0;i<count;i++){const puff=new THREE.Mesh(smokeGeometry,smokeMaterials[i%smokeMaterials.length]),angle=i*2.39996,radius=(.3+Math.random()*.8)*size;const scale=(.4+Math.random()*.65)*size;puff.position.set(Math.cos(angle)*radius,(Math.random()-.35)*size,Math.sin(angle)*radius);puff.scale.set(scale,scale*(.8+Math.random()*.4),scale);puff.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);cloud.add(puff);}return cloud;}
export function createGameFX(scene){
 const ring=new THREE.RingGeometry(.84,1,40),items=[],pool=[],MAX=100;
 let jetTimers=new WeakMap();
 function jetpack(actor,state,dt,camera){
  if(state.effect!=='rocket'||state.effectTime<=0||state.caught||state.captureRemaining>0){jetTimers.delete(actor);return;}
  let remaining=(jetTimers.get(actor)||0)-Math.max(0,dt);
  if(remaining<=0){remaining+=.12;const angle=actor.group.rotation.y;
   const p=actor.group.position.clone().add(new THREE.Vector3(-Math.sin(angle)*.35,.45,-Math.cos(angle)*.35));
   for(const kind of ['jetSmoke','jetStar','jetHeart']){const item=emit(kind,p,.65+Math.random()*.2,kind==='jetSmoke'?.16:.13,jetColors[Math.floor(Math.random()*jetColors.length)]);
    item.v.set(-Math.sin(angle)*.6+(Math.random()-.5)*.6,-.5-Math.random()*.4,-Math.cos(angle)*.6+(Math.random()-.5)*.6);
    if(kind!=='jetSmoke'){if(camera)item.mesh.quaternion.copy(camera.quaternion);else item.mesh.rotation.set(0,0,0);item.mesh.rotateZ((Math.random()-.5)*1.2);item.spin=(Math.random()-.5)*2;}
   }
  }jetTimers.set(actor,Math.max(0,remaining));
 }
 function emit(kind,p,life,size,color){let item=pool.pop();if(!item){item={mesh:new THREE.Mesh(smokeGeometry,new THREE.MeshLambertMaterial({flatShading:true})),v:new THREE.Vector3()};scene.add(item.mesh);}if(items.length>=MAX){const old=items.shift();old.mesh.visible=false;pool.push(old);}const mesh=item.mesh;mesh.geometry=kind==='ring'?ring:kind==='jetStar'?starGeometry:kind==='jetHeart'?heartGeometry:smokeGeometry;mesh.material.side=THREE.DoubleSide;item.spin=0;mesh.material.color.set(color);const transparent=kind==='ring'||kind==='impactSmoke'||kind.startsWith('jet');if(mesh.material.transparent!==transparent){mesh.material.transparent=transparent;mesh.material.needsUpdate=true;}mesh.material.depthWrite=!transparent;mesh.material.opacity=1;mesh.position.copy(p);mesh.rotation.set(kind==='ring'?-Math.PI/2:Math.random()*6,Math.random()*6,Math.random()*6);if(kind==='ring')mesh.rotation.set(-Math.PI/2,0,0);mesh.visible=true;item.kind=kind;item.life=item.total=life;item.size=size;item.v.set((Math.random()-.5)*.3,.25+Math.random()*.4,(Math.random()-.5)*.3);mesh.scale.setScalar(size);items.push(item);return item;}
 return {jetpack,run(actor){const p=actor.group.position;if(actor.speed<.2||!actor.grounded){actor.lastDustPosition=null;return;}if(!actor.lastDustPosition){actor.lastDustPosition=p.clone();return;}if(p.distanceTo(actor.lastDustPosition)<1.7)return;actor.lastDustPosition.copy(p);for(let i=0;i<2;i++){const at=p.clone().add(new THREE.Vector3(-Math.sin(actor.group.rotation.y)*(.35+i*.08)+(Math.random()-.5)*.15,.13+i*.07,-Math.cos(actor.group.rotation.y)*(.35+i*.08)));emit('dust',at,.55+i*.08,.11+Math.random()*.12,i%2?0xe9e9e7:0xcfd3d9);}},hammer(position){const p=position.clone().add(new THREE.Vector3(0,.08,0));emit('ring',p,.42,.25,0xffd267);for(let i=0;i<16;i++){const angle=i/16*Math.PI*2,item=emit('impactSmoke',p,.7+Math.random()*.25,.2+Math.random()*.23,[0xe8e9ec,0xd9dce2,0xc5cbd4,0xf4f4f5][i%4]);const speed=1.6+Math.random()*1.4;item.v.set(Math.cos(angle)*speed,.25+Math.random()*.5,Math.sin(angle)*speed);}},update(dt){for(let i=items.length-1;i>=0;i--){const a=items[i];a.life-=dt;if(a.life<=0){a.mesh.visible=false;items.splice(i,1);pool.push(a);continue;}const t=1-a.life/a.total;a.mesh.material.opacity=a.kind==='ring'?(1-t):a.kind==='impactSmoke'||a.kind.startsWith('jet')?Math.min(1,(1-t)*2):1;a.mesh.position.addScaledVector(a.v,dt);if(a.spin)a.mesh.rotateZ(a.spin*dt);a.mesh.scale.setScalar(a.kind==='ring'?.25+t*2.2:a.size*(1+Math.min(t,.5))*Math.min(1,(1-t)*3));}},clear(){jetTimers=new WeakMap();for(const a of items){a.mesh.visible=false;pool.push(a);}items.length=0;}};
}
