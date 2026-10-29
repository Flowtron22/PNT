// Cosmetic locomotion only. The actor root, velocity, collisions and gameplay
// facing are read-only; deformation lives on a separate feet-level visual pivot.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function createTurnMotion(pivot){
 let previous=null,lean=0,twist=0,pulse=0,cooldown=0,compression=0;
 function reset(){previous=null;lean=twist=pulse=cooldown=compression=0;pivot.rotation.set(0,0,0);pivot.scale.set(1,1,1);}
 function update(actor,state,elapsed,{enabled=true,reduced=false}={}){
  if(!enabled||reduced||state.caught||state.captureRemaining>0||state.effectTime>0||actor.grounded===false){reset();return;}
  if(!Number.isFinite(elapsed)||elapsed<=0)return;
  if(elapsed>.15){reset();return;}const dt=Math.min(.05,elapsed),p=actor.group.position,yaw=actor.group.rotation.y,vx=actor.vx||0,vz=actor.vz||0,speed=Math.hypot(vx,vz);
  const sample={x:p.x,z:p.z,yaw,heading:speed>.25?Math.atan2(vx,vz):null};
  if(!previous){previous=sample;return;}
  const distance=Math.hypot(sample.x-previous.x,sample.z-previous.z),turn=angleDelta(previous.yaw,yaw);
  if(distance>Math.max(1.25,speed*dt*4+.25)||Math.abs(turn)>2.2){reset();previous=sample;return;}
  cooldown=Math.max(0,cooldown-dt);pulse*=Math.exp(-11*dt);
  const moving=distance>dt*.12&&speed>.3&&(actor.speed??1)>.12;
  const rate=moving?clamp(turn/dt,-10,10):0;
  const headingTurn=moving&&previous.heading!==null&&sample.heading!==null?Math.abs(angleDelta(previous.heading,sample.heading)):0;
  if(moving&&cooldown<=0&&(headingTurn>1.1||Math.abs(rate)>5)){
   pulse=Math.max(pulse,headingTurn>2?.14:.095);cooldown=.24;
  }
  const blend=1-Math.exp(-20*dt),leanTarget=-clamp(rate*.025,-.16,.16),twistTarget=-clamp(rate*.012,-.08,.08);
  lean+=(leanTarget-lean)*blend;twist+=(twistTarget-twist)*blend;
  const squashTarget=moving?Math.max(pulse,Math.abs(lean)*.18):0;compression+=(squashTarget-compression)*(1-Math.exp(-28*dt));
  const height=1-compression,width=1/Math.sqrt(height);pivot.scale.set(width,height,width);pivot.rotation.set(0,twist,lean);previous=sample;
 }
 return {update,reset};
}
