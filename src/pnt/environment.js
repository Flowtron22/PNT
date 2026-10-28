// Pure simulation settings, shared by local play and a future authoritative server.
// Iceberg keeps a distinct glide, but responds and stops sooner than the original
// high-drift tuning so direction changes remain controllable during a chase.
export const ICE={acceleration:9,steering:2.2,braking:3.2};
export const SHIP={peak:5*Math.PI/180,push:3.8,maxSlide:1.8,drag:2.4};
export function shipTilt(seconds){
 const cycle=Math.floor(Math.max(0,seconds)/10),t=Math.max(0,seconds)%10;
 // Original Rotate curve: (0,0), (3,5), (5,0), (10,0); alternate direction.
 return (cycle%2?-1:1)*SHIP.peak*(t<3?t/3:t<5?(5-t)/2:0);
}
export function environmentVelocity(actor,dx,dz,speed,dt,{map='mall',grounded=true,flying=false,locked=false,tilt=0}={}){
 if(locked){actor.vx=actor.vz=actor.slideX=0;return;}
 const magnitude=Math.hypot(dx,dz),moving=magnitude>.01,limit=Math.max(1,magnitude);dx/=limit;dz/=limit;
 let vx=actor.vx||0,vz=actor.vz||0;
 if(map==='iceberg'&&grounded&&!flying){
  if(moving){const blend=1-Math.exp(-ICE.steering*dt);vx+=(dx*speed-vx)*blend;vz+=(dz*speed-vz)*blend;const length=Math.hypot(vx,vz),target=speed*Math.min(1,magnitude),gain=Math.min(Math.max(0,target-length),ICE.acceleration*dt);if(length>.001){vx+=vx/length*gain;vz+=vz/length*gain;}}
  else{const length=Math.hypot(vx,vz),scale=length?Math.max(0,length-ICE.braking*dt)/length:0;vx*=scale;vz*=scale;}
 }else{const blend=1-Math.exp(-dt*(moving?16:22));vx+=(dx*speed-vx)*blend;vz+=(dz*speed-vz)*blend;}
 actor.vx=vx;actor.vz=vz;
 const desired=map==='sunken'&&grounded&&!flying?Math.max(-SHIP.maxSlide,Math.min(SHIP.maxSlide,-Math.sin(tilt)/Math.sin(SHIP.peak)*SHIP.push/SHIP.drag)):0;
 actor.slideX=(actor.slideX||0)+(desired-(actor.slideX||0))*(1-Math.exp(-SHIP.drag*dt));
 // Flat deck and flight must not retain a hidden ship-push velocity.
 if(Math.abs(tilt)<1e-6||map!=='sunken'||flying||!grounded)actor.slideX=0;
}
