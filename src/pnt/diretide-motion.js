import {CANDY_SPAWN_FLIGHT,EVENT_HAMMER_RADIUS} from './diretide-rules.js';
// Analytic animation ages keep late online snapshots on the same motion phase.
export function candySpawnMotion(age,radius){
 if(age>=CANDY_SPAWN_FLIGHT)return {height:0,scale:[1,1,1],tilt:0};
 age=Math.max(0,age);const base=radius+.16;
 if(age<.1){const t=age/.1;return {height:-base*(1-t),scale:[1.25,.35+.15*t,1.25],tilt:0};}
 if(age<.7){const t=(age-.1)/.6,stretch=Math.max(0,1-t*3);return {height:Math.sin(t*Math.PI)*1.8,scale:[1-.22*stretch,1+.45*stretch,1-.22*stretch],tilt:Math.sin(t*Math.PI)*.4};}
 const t=(age-.7)/.15,squash=1-t;return {height:-.16*squash+Math.sin(t*Math.PI)*.14,scale:[1+.35*squash,1-.45*squash,1+.35*squash],tilt:0};
}
export function candyHammerMotion(position,pulses,time){
 let height=0,tilt=0,stretch=0;const radius=EVENT_HAMMER_RADIUS*1.65;
 for(const pulse of pulses){const distance=Math.hypot(position[0]-pulse.position[0],position[2]-pulse.position[2]),age=time-pulse.started-distance/14;if(distance>=radius||age<0||age>.7)continue;
  const t=age/.7,falloff=(1-distance/radius)*(1-t)**2;height+=Math.sin(t*Math.PI)*.85*falloff;tilt+=Math.sin(age*48)*.42*falloff;stretch+=Math.sin(age*34)*.18*falloff;
 }
 return {height,tilt,stretch};
}
