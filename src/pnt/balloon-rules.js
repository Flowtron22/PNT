// Shared authoritative rules for Balloon Bash. Positions are Y-up metres.
export const BALLOON_VERSION=10;
export const BALLOON_ARENA_RADIUS=10.296;
export const BALLOON_RADIUS=.9;
export const BALLOON_HEIGHT=2.95;
export const BALLOON_HAMMER_RANGE=3;
export const BALLOON_HAMMER_ARC=Math.PI*.43;
export const BALLOON_GUARD_RADIUS=.75;
export const BALLOON_GUARD_SPACING=1.3;
export const BALLOON_GUARD_MAX_STRETCH=1.04;
export const BALLOON_GUARD_COUNT=4;
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
function initialGuards(id){
 const spawn=BALLOON_SPAWNS[id],length=Math.hypot(spawn[0],spawn[2])||1,dx=spawn[0]/length,dz=spawn[2]/length;
 return Array.from({length:BALLOON_GUARD_COUNT},(_,i)=>[spawn[0]+dx*BALLOON_GUARD_SPACING*(i+1),spawn[2]+dz*BALLOON_GUARD_SPACING*(i+1)]);
}
export function createBalloonRound(base){
 return {...base,mode:'balloon',eventVersion:BALLOON_VERSION,playerRole:'runner',winner:null,winnerId:null,reason:null,
  elapsed:0,caches:[],totalMoney:0,collected:0,actors:base.actors.map(actor=>({...actor,role:'runner',caught:false,eliminated:false,
   balloonIntact:true,guards:initialGuards(actor.id),pops:0,blocks:0,money:0}))};
}
export function stepBalloon(round,dt){
 if(round.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;const step=Math.min(.1,dt);
 if(round.startRemaining>0){round.startRemaining=Math.max(0,round.startRemaining-step);if(round.startRemaining<1e-8)round.startRemaining=0;return;}
 round.elapsed+=step;
 for(const actor of round.actors){
  actor.toolCooldowns=actor.toolCooldowns.map(time=>Math.max(0,time-step));
  actor.effectTime=Math.max(0,(actor.effectTime||0)-step);if(actor.effectTime<1e-8){actor.effectTime=0;actor.effect=null;}
  actor.immune=Math.max(0,(actor.immune||0)-step);actor.captureLock=Math.max(0,(actor.captureLock||0)-step);
 }
 if(alive(round).length<=1)finish(round);
}
export function updateBalloonGuards(round,positions,dt){
 if(round?.mode!=='balloon'||!Number.isFinite(dt)||dt<=0)return;
 const count=Math.ceil(Math.min(dt,.1)*120),step=Math.min(dt,.1)/count;
 for(const actor of round.actors){
  if(actor.eliminated)continue;const head=point(positions[actor.id]);if(!head)continue;
  actor.guards??=initialGuards(actor.id);actor.guardVelocities??=actor.guards.map(()=>[0,0]);
  for(let tick=0;tick<count;tick++){
   let leader=head;
   for(let i=0;i<actor.guards.length;i++){
    const guard=actor.guards[i],velocity=actor.guardVelocities[i],dx=guard[0]-leader.x,dz=guard[1]-leader.z,d=Math.hypot(dx,dz)||.001;
    const before={x:guard[0],z:guard[1]};
    // Low-drag spring links retain momentum after the head stops or turns.
    const force=(d-BALLOON_GUARD_SPACING)*11,drag=Math.exp(-.9*step);
    velocity[0]=(velocity[0]-dx/d*force*step)*drag;velocity[1]=(velocity[1]-dz/d*force*step)*drag;
    const speed=Math.hypot(...velocity);if(speed>7){velocity[0]*=7/speed;velocity[1]*=7/speed;}
    guard[0]+=velocity[0]*step;guard[1]+=velocity[1]*step;
    const linkX=guard[0]-leader.x,linkZ=guard[1]-leader.z,link=Math.hypot(linkX,linkZ),maxLink=BALLOON_GUARD_SPACING*BALLOON_GUARD_MAX_STRETCH;
    if(link>maxLink){guard[0]=leader.x+linkX/link*maxLink;guard[1]=leader.z+linkZ/link*maxLink;const out=(velocity[0]*linkX+velocity[1]*linkZ)/link;if(out>0){velocity[0]-=linkX/link*out;velocity[1]-=linkZ/link*out;}}
    const limit=BALLOON_ARENA_RADIUS-BALLOON_GUARD_RADIUS,radius=Math.hypot(...guard);
    if(radius>limit){const nx=guard[0]/radius,nz=guard[1]/radius,out=velocity[0]*nx+velocity[1]*nz;guard[0]=nx*limit;guard[1]=nz*limit;if(out>0){velocity[0]-=nx*out*1.6;velocity[1]-=nz*out*1.6;}}
    // A moving guard must not sweep through a stationary opponent either.
    const opponents=round.actors.filter(other=>other.id!==actor.id&&!other.eliminated).map(other=>{const p=point(positions[other.id]);return [p.x,p.z,.32];});
    const resolved={x:guard[0],z:guard[1]};slideCircles(before,resolved,opponents,BALLOON_GUARD_RADIUS,limit);
    if(Math.hypot(resolved.x-guard[0],resolved.z-guard[1])>.001){velocity[0]*=.5;velocity[1]*=.5;}guard[0]=resolved.x;guard[1]=resolved.z;
    leader={x:guard[0],z:guard[1]};
   }
  }
 }
 for(const actor of round.actors)actor.guardColliders=round.actors.filter(other=>!other.eliminated&&other.id!==actor.id).flatMap(other=>other.guards.map(guard=>[guard[0],guard[1],BALLOON_GUARD_RADIUS]));
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
export function slideBalloonGuards(state,from,to){slideCircles(from,to,state.guardColliders||[],.32,BALLOON_ARENA_RADIUS-.42);}
// Swept circles stop fast movement tunnelling through a guard; overlapping
// players may move outward so a moving snake cannot trap them in place.
export function balloonGuardPathClear(state,fromX,fromZ,toX,toZ){
 for(const [x,z,radius] of state.guardColliders||[]){
  const limit=radius+.32,start=Math.hypot(fromX-x,fromZ-z),end=Math.hypot(toX-x,toZ-z);
  if(start<limit&&end>=start)continue;
  if(distanceToSegment({x,z},{x:fromX,z:fromZ},{x:toX,z:toZ}).distance<limit)return false;
 }
 return true;
}
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
 for(const guard of item.target.guards||[]){const hit=distanceToSegment({x:guard[0],z:guard[1]},origin,item.targetPoint);if(hit.t<.92&&hit.distance<=BALLOON_GUARD_RADIUS+.26)return {target:item.target.id,blocked:true,guard};}
 return {target:item.target.id,blocked:false};
}
export function resolveBalloonHammer(round,attackerId,positions,angles){
 if(round.phase!=='playing')return null;const result=balloonHammerTarget(round,attackerId,positions,angles);if(!result)return null;
 const attacker=round.actors[attackerId];if(result.blocked){attacker.blocks=(attacker.blocks||0)+1;return result;}
 const target=round.actors[result.target];target.balloonIntact=false;target.eliminated=true;target.caught=true;target.effect=null;target.effectTime=0;
 attacker.pops=(attacker.pops||0)+1;if(alive(round).length<=1)finish(round);return result;
}
export function balloonBotGoal(round,id,positions){
 const self=point(positions[id]),targets=round.actors.filter(actor=>actor.id!==id&&!actor.eliminated).sort((a,b)=>{
  const pa=point(positions[a.id]),pb=point(positions[b.id]);return Math.hypot(self.x-pa.x,self.z-pa.z)-Math.hypot(self.x-pb.x,self.z-pb.z);
 });
 if(!targets[0])return [0,0,0];const target=point(positions[targets[0].id]);
 const dx=target.x-self.x,dz=target.z-self.z,d=Math.hypot(dx,dz)||1,orbit=(id%2?1:-1)*.7;
 return [target.x-dx/d*1.55-dz/d*orbit,0,target.z-dz/d*1.55+dx/d*orbit];
}
