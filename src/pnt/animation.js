import * as THREE from 'three';
import {KICK_DURATION,KICK_WINDUP} from './strikers-rules.js';
export const ANIMATION_PLAY_RATE=1.3;
const flightLean=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/6);
function kickClip(model,idle){
 model.updateWorldMatrix(true,true);
 const lateral=new THREE.Vector3(1,0,0).applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion()));
 const tracks=[];
 for(const [suffix,angles] of [['R-Thigh',[0,.56,-1.12,-.62,0]],['R-Calf',[0,.95,.05,.24,0]]]){
  const bone=model.getObjectByName('Bip001-'+suffix);
  if(!bone)continue;
  const base=idle.tracks.find(track=>track.name===bone.name+'.quaternion');
  if(!base)continue;
  const axis=lateral.clone().applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  const pose=new THREE.Quaternion().fromArray(base.values),delta=new THREE.Quaternion();
  const values=angles.flatMap(angle=>delta.setFromAxisAngle(axis,angle).multiply(pose).toArray());
  const contact=KICK_WINDUP*ANIMATION_PLAY_RATE,end=KICK_DURATION*ANIMATION_PLAY_RATE;
  tracks.push(new THREE.QuaternionKeyframeTrack(base.name,[0,contact*.72,contact,contact+.16,end],values));
 }
 const root=model.getObjectByName('Bip001'),base=idle.tracks.find(track=>track.name===root?.name+'.quaternion');
 if(base&&root.parent){
  const axis=new THREE.Vector3(0,1,0).applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion()))
   .applyQuaternion(root.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  const pose=new THREE.Quaternion().fromArray(base.values),turn=new THREE.Quaternion();
  const angles=[0,-.38,0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2];
  const times=[0,KICK_WINDUP*.72,KICK_WINDUP,.43,.54,.65,KICK_DURATION].map(time=>time*ANIMATION_PLAY_RATE);
  const values=angles.flatMap(angle=>turn.setFromAxisAngle(axis,angle).multiply(pose).toArray());
  tracks.push(new THREE.QuaternionKeyframeTrack(base.name,times,values));
 }
 return new THREE.AnimationClip('kick',KICK_DURATION*ANIMATION_PLAY_RATE,tracks);
}
export function makeAnimator(model,clips,role){
 const mixer=new THREE.AnimationMixer(model),actions={};
 const bones=new Map();model.traverse(o=>{if(o.isBone)bones.set(o.name.replace(/[_\- ]/g,'').toLowerCase(),o.name);});
 for(const [name,clip]of Object.entries(clips)){
  const tracks=clip.tracks.flatMap(track=>{
   const p=THREE.PropertyBinding.parseTrackName(track.name),target=bones.get(p.nodeName.replace(/[_\- ]/g,'').toLowerCase());
   if(!target)return [];const result=track.clone();result.name=target+'.'+p.propertyName;
   // Add forward pitch to the authored flight root keys. Clip blending restores
   // the standing pose without tilting gameplay coordinates or collision shapes.
   if(['rocket','jet'].includes(name)&&target.replace(/[_\- ]/g,'').toLowerCase()==='bip001'&&p.propertyName==='quaternion'){
    const q=new THREE.Quaternion();for(let i=0;i<result.values.length;i+=4)q.fromArray(result.values,i).premultiply(flightLean).normalize().toArray(result.values,i);
   }
   return [result];
  });
  if(!tracks.length)throw new Error(`No ${name} animation bones match this costume`);
  actions[name]=mixer.clipAction(new THREE.AnimationClip(name,clip.duration,tracks));
 }
 if(actions.idle){
  const kick=kickClip(model,actions.idle.getClip());
  if(kick.tracks.length)actions.kick=mixer.clipAction(kick);
 }
 const defaultClip=actions.idle?'idle':Object.keys(actions)[0];
 let current=null;
 const api={mixer,actions,role,current:null,
  play(name,{loop=true,fade=.12,restart=false,rate=1}={}){
   if(!actions[name])name=defaultClip;actions[name].setEffectiveTimeScale(ANIMATION_PLAY_RATE*rate);if(current===name&&!restart)return;
   const previous=actions[current],next=actions[name];next.reset();next.enabled=true;next.clampWhenFinished=!loop;next.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);next.setEffectiveWeight(1);next.play();
   if(previous){previous.fadeOut(fade);next.fadeIn(fade);}current=name;api.current=name;
  },
  update(dt){mixer.update(dt);},
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);}
 };api.play(defaultClip);return api;
}
export function animationFor(actor,moving,airborne){
 if(actor.caught)return actor.caughtTime<.5?(airborne?'airStunned':'busted'):'bustedIdle';
 if(actor.captureLock>0)return 'idle';
 if(actor.effectTime>0)return actor.effect;
 return moving?(actor.role==='chaser'?'policeRun':'thiefRun'):'idle';
}
