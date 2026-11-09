// Shared authoritative rules for Balloon Bash. Positions are Y-up metres.
export const BALLOON_VERSION=12;
export const BALLOON_ARENA_RADIUS=10.296;
export const BALLOON_RADIUS=.68;
export const BALLOON_HEIGHT=2.95;
export const BALLOON_COUNT=2;
export const BALLOON_HAMMER_RANGE=3;
export const BALLOON_HAMMER_ARC=Math.PI*.43;
export const BALLOON_SPHERE_RADIUS=.75;
export const BALLOON_SPAWNS=[[-4.25,0,-2.4],[4.25,0,-2.4],[4.25,0,2.4],[-4.25,0,2.4]];

// Small flat grid shared by the procedural client arena and Steam authority.
// No Grassfield scenery, baked textures or exported collision data are needed.
export function createBalloonArenaData(){
 const step=.5,extent=16,nx=65,nz=65;
 return {metadata:{id:'grassfield',name:'SAND RING',origin:[0,0,0],spawns:BALLOON_SPAWNS,caches:[]},grid:{step,nx,nz,minX:-extent,minZ:-extent,heights:new Float32Array(nx*nz),blocked:new Uint8Array(nx*nz),edges:new Uint8Array(nx*nz)}};
}

const point=p=>Array.isArray(p)?{x:p[0],z:p[2]}:p;
const alive=round=>round.actors.filter(actor=>!actor.eliminated);
function finish(round){
 const survivors=alive(round);round.phase='finished';round.winnerId=survivors.length===1?survivors[0].id:null;
 round.winner=survivors.length===1?'runner':null;round.reason=survivors.length===1?'last-standing':'draw';
}
const DROP_INTERVAL=7,SINK_RADIUS=.95;
export const BALLOON_MAX_SPHERES=14;
function random(round){
 round.sphereSeed=(Math.imul(round.sphereSeed,1664525)+1013904223)>>>0;
 return round.sphereSeed/4294967296;
}
function dropSphere(round,angle){
 const radius=3.6+random(round)*5.1;
 round.spheres.push({id:++round.sphereId,x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,y:5+random(round)*4,speed:0,phase:'falling'});
}
export function createBalloonRound(base,{seed=Math.floor(Math.random()*4294967296)}={}){
 return {...base,mode:'balloon',eventVersion:BALLOON_VERSION,playerRole:'runner',winner:null,winnerId:null,reason:null,
  elapsed:0,caches:[],totalMoney:0,collected:0,spheres:[],sphereSeed:seed>>>0,sphereId:0,sphereClock:DROP_INTERVAL,
  actors:base.actors.map(actor=>({...actor,role:'runner',caught:false,eliminated:false,balloons:BALLOON_COUNT,pops:0,blocks:0,money:0}))};
}
function sphereRadius(sphere){
 if(sphere.phase==='falling')return 0;
 const depth=Math.min(0,sphere.y);
 return Math.sqrt(Math.max(0,BALLOON_SPHERE_RADIUS**2-depth**2));
}
function updateSpheres(round,dt){
 if(!round.sphereId){
  const count=5+Math.floor(random(round)*6),offset=random(round)*Math.PI*2;
  for(let i=0;i<count;i++)dropSphere(round,offset+(i+.3*random(round))*Math.PI*2/count);
 }
 round.sphereClock-=dt;
 if(round.sphereClock<=0){
  round.sphereClock+=DROP_INTERVAL;
  const count=1+Math.floor(random(round)*3);
  for(let i=0;i<count&&round.spheres.length<BALLOON_MAX_SPHERES;i++)dropSphere(round,random(round)*Math.PI*2);
 }
 for(const sphere of round.spheres){
  if(sphere.phase==='falling'){
   sphere.speed+=12*dt;sphere.y=Math.max(BALLOON_SPHERE_RADIUS,sphere.y-sphere.speed*dt);
   if(sphere.y===BALLOON_SPHERE_RADIUS)sphere.phase='rolling';
   continue;
  }
  if(sphere.phase==='sinking'){sphere.y-=.55*dt;continue;}
  const radius=Math.hypot(sphere.x,sphere.z);
  if(radius<=SINK_RADIUS){sphere.phase='sinking';continue;}
  const travel=Math.min(radius,.48*dt),from={x:sphere.x,z:sphere.z},to={x:sphere.x*(1-travel/radius),z:sphere.z*(1-travel/radius)};
  const neighbors=round.spheres.filter(other=>other!==sphere).map(other=>[other.x,other.z,sphereRadius(other)]).filter(([, , r])=>r>0);
  slideCircles(from,to,neighbors,BALLOON_SPHERE_RADIUS,BALLOON_ARENA_RADIUS-BALLOON_SPHERE_RADIUS);
  sphere.x=to.x;sphere.z=to.z;
 }
 round.spheres=round.spheres.filter(sphere=>sphere.y>-BALLOON_SPHERE_RADIUS);
 const colliders=round.spheres.map(sphere=>[sphere.x,sphere.z,sphereRadius(sphere)]).filter(([, , radius])=>radius>0);
 for(const actor of round.actors)actor.sphereColliders=colliders;
}
export function stepBalloon(round,dt){
 if(round.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;const step=Math.min(.1,dt);
 if(round.startRemaining>0){round.startRemaining=Math.max(0,round.startRemaining-step);if(round.startRemaining<1e-8)round.startRemaining=0;return;}
 round.elapsed+=step;
 updateSpheres(round,step);
 for(const actor of round.actors){
  actor.toolCooldowns=actor.toolCooldowns.map(time=>Math.max(0,time-step));
  actor.effectTime=Math.max(0,(actor.effectTime||0)-step);if(actor.effectTime<1e-8){actor.effectTime=0;actor.effect=null;}
  actor.immune=Math.max(0,(actor.immune||0)-step);actor.captureLock=Math.max(0,(actor.captureLock||0)-step);
 }
 if(alive(round).length<=1)finish(round);
}

// Find the closest non-overlapping point, including where adjacent contact
// circles meet. Unlike ignoring overlaps, this permits escape without allowing
// movement through the far side of a sphere or through another chain link.
function clearCirclePoint(p,circles,arenaLimit){
 const valid=q=>Math.hypot(q.x,q.z)<=arenaLimit+1e-7&&circles.every(([x,z,r])=>Math.hypot(q.x-x,q.z-z)>=r-1e-7);
 if(valid(p))return p;
 const candidates=[];
 for(const [x,z,r] of circles){const dx=p.x-x,dz=p.z-z,d=Math.hypot(dx,dz);if(d>1e-9)candidates.push({x:x+dx/d*r,z:z+dz/d*r});else for(let i=0;i<8;i++)candidates.push({x:x+Math.cos(i*Math.PI/4)*r,z:z+Math.sin(i*Math.PI/4)*r});}
 const boundary=[0,0,arenaLimit],all=[...circles,boundary],length=Math.hypot(p.x,p.z);
 if(length>0)candidates.push({x:p.x/length*arenaLimit,z:p.z/length*arenaLimit});
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
  const [x,z,r]=all[i],[bx,bz,br]=all[j],dx=bx-x,dz=bz-z,d=Math.hypot(dx,dz);
  if(d<1e-9||d>r+br||d<Math.abs(r-br))continue;
  const a=(r*r-br*br+d*d)/(2*d),h=Math.sqrt(Math.max(0,r*r-a*a)),cx=x+dx/d*a,cz=z+dz/d*a;
  candidates.push({x:cx-dz/d*h,z:cz+dx/d*h},{x:cx+dz/d*h,z:cz-dx/d*h});
 }
 let best=null,distance=Infinity;for(const q of candidates)if(valid(q)){const d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<distance){distance=d;best=q;}}
 return best||p;
}
function slideCircles(from,to,colliders,bodyRadius,arenaLimit){
 const circles=colliders.map(([x,z,r])=>[x,z,r+bodyRadius+.0002]);
 const start=clearCirclePoint({x:from.x,z:from.z},circles,arenaLimit);
 const dx=to.x-from.x,dz=to.z-from.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.06));let p=start;
 for(let i=0;i<steps;i++)p=clearCirclePoint({x:p.x+dx/steps,z:p.z+dz/steps},circles,arenaLimit);
 to.x=p.x;to.z=p.z;
}
export function slideBalloonSpheres(state,from,to){slideCircles(from,to,state.sphereColliders||[],.32,BALLOON_ARENA_RADIUS-.42);}
function distanceToSegment(p,a,b){
 const vx=b.x-a.x,vz=b.z-a.z,den=vx*vx+vz*vz;if(den<1e-8)return {distance:Math.hypot(p.x-a.x,p.z-a.z),t:0};
 const t=Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.z-a.z)*vz)/den)),x=a.x+vx*t,z=a.z+vz*t;
 return {distance:Math.hypot(p.x-x,p.z-z),t};
}
export function balloonHammerTarget(round,attackerId,positions,angles){
 const attacker=round.actors[attackerId],origin=point(positions[attackerId]);if(!attacker||attacker.eliminated||!origin)return null;
 const angle=angles[attackerId]||0,fx=Math.sin(angle),fz=Math.cos(angle);
 const candidates=round.actors.filter(target=>target.id!==attackerId&&!target.eliminated).map(target=>{
  const targetPoint=point(positions[target.id]),dx=targetPoint.x-origin.x,dz=targetPoint.z-origin.z,d=Math.hypot(dx,dz);
  const facing=d>1e-6?Math.acos(Math.max(-1,Math.min(1,(dx*fx+dz*fz)/d))):0;return {target,targetPoint,d,facing};
 }).filter(item=>item.d<=BALLOON_HAMMER_RANGE&&item.facing<=BALLOON_HAMMER_ARC).sort((a,b)=>a.d-b.d||a.target.id-b.target.id);
 const item=candidates[0];if(!item)return null;
 for(const sphere of round.spheres){
  const radius=sphereRadius(sphere);if(!radius)continue;
  const hit=distanceToSegment(sphere,origin,item.targetPoint);
  if(hit.t<.92&&hit.distance<=radius+.26)return {target:item.target.id,blocked:true};
 }
 return {target:item.target.id,blocked:false};
}
export function resolveBalloonHammer(round,attackerId,positions,angles){
 if(round.phase!=='playing')return null;const result=balloonHammerTarget(round,attackerId,positions,angles);if(!result)return null;
 const attacker=round.actors[attackerId];if(result.blocked){attacker.blocks=(attacker.blocks||0)+1;return result;}
 const target=round.actors[result.target];target.balloons--;
 if(!target.balloons){target.eliminated=true;target.caught=true;target.effect=null;target.effectTime=0;}
 attacker.pops=(attacker.pops||0)+1;if(alive(round).length<=1)finish(round);return result;
}
export function balloonBotGoal(round,id,positions){
 const self=point(positions[id]),targets=round.actors.filter(actor=>actor.id!==id&&!actor.eliminated).sort((a,b)=>{
  const pa=point(positions[a.id]),pb=point(positions[b.id]);return Math.hypot(self.x-pa.x,self.z-pa.z)-Math.hypot(self.x-pb.x,self.z-pb.z);
 });
 if(!targets[0])return [0,0,0];const target=point(positions[targets[0].id]);
 const dx=target.x-self.x,dz=target.z-self.z,d=Math.hypot(dx,dz)||1,side=id%2?1:-1;
 const goal={x:target.x-dx/d*1.55-dz/d*side*.7,z:target.z-dz/d*1.55+dx/d*side*.7};
 for(const [x,z,radius] of round.actors[id].sphereColliders||[]){
  if(distanceToSegment({x,z},self,goal).distance>=radius+.45)continue;
  const distance=Math.hypot(x-self.x,z-self.z)||1,clearance=radius+.8;
  return [x-(z-self.z)/distance*side*clearance,0,z+(x-self.x)/distance*side*clearance];
 }
 return [goal.x,0,goal.z];
}
