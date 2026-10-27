import * as THREE from 'three';
export const ANIMATION_PLAY_RATE=1.3;
export function makeAnimator(model,clips,role){
 const mixer=new THREE.AnimationMixer(model),actions={};
 const bones=new Map();model.traverse(o=>{if(o.isBone)bones.set(o.name.replace(/[_\- ]/g,'').toLowerCase(),o.name);});
 for(const [name,clip]of Object.entries(clips)){
  const tracks=clip.tracks.flatMap(track=>{
   const p=THREE.PropertyBinding.parseTrackName(track.name),target=bones.get(p.nodeName.replace(/[_\- ]/g,'').toLowerCase());
   if(!target)return [];const result=track.clone();result.name=target+'.'+p.propertyName;return [result];
  });
  if(!tracks.length)throw new Error(`No ${name} animation bones match this costume`);
  actions[name]=mixer.clipAction(new THREE.AnimationClip(name,clip.duration,tracks));
 }
 let current=null;
 const api={mixer,actions,role,current:null,
  play(name,{loop=true,fade=.12,restart=false,rate=1}={}){
   if(!actions[name])name='idle';actions[name].setEffectiveTimeScale(ANIMATION_PLAY_RATE*rate);if(current===name&&!restart)return;
   const previous=actions[current],next=actions[name];next.reset();next.enabled=true;next.clampWhenFinished=!loop;next.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);next.setEffectiveWeight(1);next.play();
   if(previous){previous.fadeOut(fade);next.fadeIn(fade);}current=name;api.current=name;
  },
  update(dt){mixer.update(dt);},
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);}
 };api.play('idle');return api;
}
export function animationFor(actor,moving,airborne){
 if(actor.caught)return actor.caughtTime<.5?(airborne?'airStunned':'busted'):'bustedIdle';
 if(actor.effectTime>0)return actor.effect;
 return moving?(actor.role==='chaser'?'policeRun':'thiefRun'):'idle';
}
