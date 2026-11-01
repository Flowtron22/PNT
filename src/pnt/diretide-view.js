import {candySpawnMotion,candyHammerMotion} from './diretide-motion.js';
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {PLAYER_COLORS,CANDY_SIZES,candyDropPose,fullestWell} from './diretide-rules.js';
// Presentation consumes shared/server state; it never decides who gets hit.
export function createDiretideView(parent,bossAsset,metadata,burgerAsset){
 if(!burgerAsset?.scene)throw Error('Missing burger pickup asset');
 const root=new THREE.Group();root.name='Diretide';parent.add(root);const owned=[],wells=new Map(),pickups=new Map(),drops=new Map(),hammerPulses=[];
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
 function mesh(geometry,mat){const m=new THREE.Mesh(geometry,mat);owned.push(m);return m;}
 burgerAsset.scene.updateMatrixWorld(true);const burgerHalfHeight=new THREE.Box3().setFromObject(burgerAsset.scene).getSize(new THREE.Vector3()).y/2;
 function burger(radius,name){const object=burgerAsset.scene.clone(true);object.name=name;object.scale.multiplyScalar(radius);return object;}
 for(const w of metadata.wells){
  const group=new THREE.Group();group.position.fromArray(w.position);root.add(group);
  const base=mesh(new THREE.CylinderGeometry(.9,1.05,.65,20,true),material(PLAYER_COLORS[w.owner],{side:THREE.DoubleSide}));base.position.y=.34;group.add(base);
  const rim=mesh(new THREE.TorusGeometry(.9,.12,8,24),material('#e9d8ff'));rim.rotation.x=Math.PI/2;rim.position.y=.7;group.add(rim);
  const pile=new THREE.Group();group.add(pile);for(let i=0;i<3;i++){const patty=burger(.45,'KrabbyPattyWell');patty.position.set(i===1?-.16:i===2?.16:0,.82+.45*burgerHalfHeight+i*.22,0);patty.rotation.y=i*.9;pile.add(patty);}
  const ring=mesh(new THREE.RingGeometry(1.12,1.25,32),new THREE.MeshBasicMaterial({color:PLAYER_COLORS[w.owner],side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;group.add(ring);wells.set(w.id,{group,base,pile,ring});
 }
 const shadowMaterial=new THREE.MeshBasicMaterial({color:'#171126',transparent:true,opacity:.17,depthWrite:false}),shadowGeometry=new THREE.CircleGeometry(1,16);
 function sweet(size){const group=new THREE.Group(),visual=new THREE.Group(),radius=CANDY_SIZES[size].radius;group.add(visual);root.add(group);
  visual.add(burger(radius,'KrabbyPattyPickup'));
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.scale.setScalar(radius*1.25);shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;group.add(shadow);return {group,visual,shadow};
 }
 function syncCandies(items,objects,round,scattered){
  const ids=new Set(items.map(c=>c.id));for(const [id,item]of objects)if(!ids.has(id)){item.group.removeFromParent();objects.delete(id);}
  for(const c of items){if(!objects.has(c.id))objects.set(c.id,sweet(c.size));const item=objects.get(c.id),radius=CANDY_SIZES[c.size].radius,halfHeight=radius*burgerHalfHeight;item.group.position.fromArray(c.position);
   const age=visualElapsed-c.born,pose=scattered?candyDropPose(c,visualElapsed):c.position,spawn=scattered?{height:0,scale:[1,1,1],tilt:0}:candySpawnMotion(age,halfHeight),wiggle=candyHammerMotion(c.position,hammerPulses,time);item.visual.position.set(pose[0]-c.position[0],pose[1]-c.position[1]+halfHeight+.16+spawn.height+wiggle.height+(scattered||age<.85?0:.07*Math.sin(time*2+c.id)),pose[2]-c.position[2]);
   item.visual.rotation.set(scattered?Math.min(age/c.flight,1)*Math.PI*2:0,time*(scattered?3:1),(scattered?Math.sin(age*8)*.25:Math.PI/8)+spawn.tilt+wiggle.tilt);
   item.visual.scale.set(spawn.scale[0],spawn.scale[1]*(1+wiggle.stretch),spawn.scale[2]);item.group.visible=c.time>1.5||Math.floor(c.time*8)%2===0;
   const height=Math.max(0,pose[1]-c.position[1]+spawn.height+wiggle.height);item.shadow.material=shadowMaterial;item.shadow.scale.setScalar(radius*1.25*(1+height*.2));item.shadow.position.x=pose[0]-c.position[0];item.shadow.position.z=pose[2]-c.position[2];
  }
 }
 const model=clone(bossAsset.scene),boss=new THREE.Group();model.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(model);model.scale.multiplyScalar(4.2/box.getSize(new THREE.Vector3()).y);model.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));boss.add(model);root.add(boss);model.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
 const shadow=mesh(new THREE.CircleGeometry(1.3,32),new THREE.MeshBasicMaterial({color:'#171126',transparent:true,opacity:.3,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;boss.add(shadow);
 const mixer=new THREE.AnimationMixer(model),actions=new Map(bossAsset.animations.map(c=>[c.name,mixer.clipAction(c)]));let clip=null,time=0,visualElapsed=0;
 return {root,boss,hammer(position){hammerPulses.push({position:position.toArray(),started:time});if(hammerPulses.length>16)hammerPulses.shift();},update(round,dt){time+=dt;visualElapsed=Math.max(round.elapsed,Math.min(round.elapsed+.1,visualElapsed+dt));while(hammerPulses.length&&time-hammerPulses[0].started>1.1)hammerPulses.shift();const b=round.boss;boss.position.fromArray(b.position);const goal=b.stage==='sleeping'?fullestWell(round.wells)?.position:b.stage==='returning'?b.home:b.target!==null?round.wells.find(w=>w.id===b.target)?.position:null;if(goal){const dx=goal[0]-b.position[0],dz=goal[2]-b.position[2];if(Math.hypot(dx,dz)>.05)boss.rotation.y=Math.atan2(dx,dz);}
  const next=b.stage==='walking'||b.stage==='returning'?'walk':b.stage==='smashing'?'smash':'jumpingJack';if(clip!==next){actions.get(clip)?.fadeOut(.12);const action=actions.get(next);action?.reset().fadeIn(.12).play();if(next==='smash'){action?.setLoop(THREE.LoopOnce,1);if(action)action.clampWhenFinished=true;}clip=next;}mixer.update(dt);if(next==='smash'&&actions.get('smash'))actions.get('smash').time=b.clock;
  const jack=actions.get('jumpingJack'),lift=next==='jumpingJack'&&jack?Math.sin(jack.time/jack.getClip().duration*Math.PI*2)**2:0;shadow.scale.setScalar(1-lift*.18);shadow.material.opacity=.3-lift*.08;
  for(const w of round.wells){const visual=wells.get(w.id);visual.group.visible=w.hearts>0;visual.base.material.color.set(PLAYER_COLORS[w.owner]);visual.pile.visible=w.candy>0;visual.pile.children.forEach((patty,i)=>{patty.visible=i<Math.min(3,1+Math.floor(w.candy/10));});visual.ring.material.color.set(b.target===w.id?'#ff3657':PLAYER_COLORS[w.owner]);visual.ring.scale.setScalar(b.target===w.id?1+.1*Math.sin(time*10):1);}
  syncCandies(round.pickups,pickups,round,false);syncCandies(round.drops,drops,round,true);
 },dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});for(const m of owned){m.geometry.dispose();m.material.dispose();}shadowGeometry.dispose();shadowMaterial.dispose();root.removeFromParent();}};
}
