// Shared authoritative rules for Patty Strikers. All positions are Y-up metres.
export const STRIKERS_VERSION=12;
export const STRIKER_HAMMER_STUN_SECONDS=1.5;
export const KICK_DURATION=.8,KICK_WINDUP=.32,GOAL_RESET_SECONDS=3.65;
export const GOAL_DANCE_SECONDS=2;
export const strikerKickoffAngle=position=>Math.atan2(-position.x,-position.z);
export const STRIKER_TEAMS=[{name:'BLUE',color:'#42b9ff'},{name:'RED',color:'#ff5367'}];
export const STRIKERS_SECONDS=60;
export const STRIKER_SPAWNS=[[-2.4,0,5.6],[2.4,0,5.6],[-2.4,0,-5.6],[2.4,0,-5.6]];
// Derived from the normalized FBX ice surface and the front edge of each goal.
export const FIELD={minX:-8.71,maxX:8.71,minZ:-10,maxZ:10,goalHalfWidth:3,goalCenterX:0};
export const BALL_RADIUS=.29,SHOOT_COOLDOWN=.32;
export function strikerInsidePitch(x,z,margin){
 return x>=FIELD.minX+margin&&x<=FIELD.maxX-margin&&Math.abs(z)<=FIELD.maxZ-margin;
}
export const BUFF_TYPES=['speed','power','shock'];
export const BUFF_COLORS={speed:'#4be8ff',power:'#ffcf3b',shock:'#b86cff'};

const teamOf=id=>id<2?0:1;
function random(round){let x=round.randomState|0;x^=x<<13;x^=x>>>17;x^=x<<5;round.randomState=x>>>0;return round.randomState/4294967296;}
function resetBall(round){
 round.goalPosition=round.ball.position.slice();
 Object.assign(round.ball,{position:[0,2.4,0],velocity:[0,0,0],carrier:null,pickupDelay:0,lastTouch:null,shockTeam:null,shockTime:0,shotTrail:0});
 round.resetClock=GOAL_RESET_SECONDS+GOAL_DANCE_SECONDS;
 for(const actor of round.actors){actor.effect=null;actor.effectTime=0;actor.kickWindup=0;actor.hammerWindup=0;}
}
export function resetStrikerPlayers(actors){
 for(const actor of actors){
  actor.group.position.copy(actor.spawn);
  actor.group.rotation.y=strikerKickoffAngle(actor.spawn);
  actor.vx=actor.vz=actor.slideX=actor.speed=actor.velocity=0;
  actor.hammerImpact=0;
  actor.warp=(actor.warp||0)+1;
 }
}
function finish(round){round.phase='finished';round.reason=round.score[0]===round.score[1]?'draw':'goals';round.winnerTeam=round.reason==='draw'?null:(round.score[0]>round.score[1]?0:1);round.winner=round.winnerTeam===null?null:'runner';}
export function createStrikersRound(base,{seed=Math.floor(Math.random()*4294967295)||1}={}){
 const actors=base.actors.map(a=>({...a,role:'runner',team:teamOf(a.id),goals:0,shots:0,buff:null,buffTime:0,shootCooldown:0,money:0}));
 return {...base,mode:'strikers',eventVersion:STRIKERS_VERSION,playerRole:'runner',remaining:STRIKERS_SECONDS,elapsed:0,score:[0,0],winner:null,winnerTeam:null,reason:null,caches:[],totalMoney:0,collected:0,actors,ball:{position:[0,BALL_RADIUS,0],velocity:[0,0,0],carrier:null,pickupDelay:0,lastTouch:null,shockTeam:null,shockTime:0},buffs:[],buffClock:6,buffId:0,resetClock:0,randomState:seed>>>0||1};
}
export function strikerShoot(round,id){
 const a=round.actors[id],b=round.ball;if(round.phase!=='playing'||round.startRemaining>0||round.resetClock>0||!a||a.caught||a.effectTime>0||a.shootCooldown>0)return false;
 if(b.carrier!==id)return false;
 a.effect='kick';a.effectTime=KICK_DURATION;a.kickWindup=KICK_WINDUP;
 a.shootCooldown=KICK_DURATION+SHOOT_COOLDOWN;
 return true;
}
function launchShot(b,a,angle){
 const power=a.buff==='power'?24:19;
 b.carrier=null;b.pickupDelay=.14;
 b.velocity=[Math.sin(angle)*power,5,Math.cos(angle)*power];
 b.shotTrail=1.15;
 b.shockTeam=a.buff==='shock'?a.team:null;b.shockTime=a.buff==='shock'?4.5:0;
 a.shots++;
}
function spawnBuff(round){
 const type=BUFF_TYPES[Math.floor(random(round)*BUFF_TYPES.length)],x=(random(round)*2-1)*4.65,z=(random(round)*2-1)*6.8;
 round.buffs.push({id:++round.buffId,type,position:[x,6.5,z],velocity:-.5,time:14,landed:false});if(round.buffs.length>4)round.buffs.shift();
}
function rollTowardFeet(ball,p,angle,dt){
 const clamp=(v,min,max)=>Math.max(min+BALL_RADIUS,Math.min(max-BALL_RADIUS,v));
 const x=clamp(p.x+Math.sin(angle)*.95,FIELD.minX,FIELD.maxX);
 const z=clamp(p.z+Math.cos(angle)*.95,FIELD.minZ,FIELD.maxZ);
 const blend=1-Math.exp(-11*dt);
 ball.position[0]+=(x-ball.position[0])*blend;
 ball.position[1]=BALL_RADIUS;
 ball.position[2]+=(z-ball.position[2])*blend;
}
export function updateStrikerPossession(round,groups,dt=1/60){
 const ball=round.ball;
 if(ball.carrier==null)return;
 const state=round.actors[ball.carrier],group=groups[ball.carrier];
 if(!group||state.caught||(state.effectTime>0&&state.effect!=='kick')){
  state.kickWindup=0;
  const angle=group?.rotation.y??0;
  ball.carrier=null;ball.pickupDelay=.16;
  ball.velocity=[Math.sin(angle)*3,1.5,Math.cos(angle)*3];
  return;
 }
 rollTowardFeet(ball,group.position,group.rotation.y,dt);
 if(state.kickWindup>0){
  state.kickWindup=Math.max(0,state.kickWindup-dt);
  if(!state.kickWindup)launchShot(ball,state,group.rotation.y);
 }
}
function claimBall(round,positions){
 const ball=round.ball;
 if(ball.pickupDelay>0||ball.position[1]>1.05)return;
 let closest=null,distance=1.1;
 for(const actor of round.actors){
  const p=positions[actor.id];
  if(!p||actor.caught||actor.effectTime>0)continue;
  const d=Math.hypot(ball.position[0]-p.x,ball.position[2]-p.z);
  if(d<distance){closest=actor;distance=d;}
 }
 if(!closest)return;
 if(ball.shockTime>0&&closest.team!==ball.shockTeam){
  closest.effect='stunned';closest.effectTime=1.35;
 }else{
  ball.carrier=ball.lastTouch=closest.id;
  ball.velocity=[0,0,0];
  ball.shotTrail=0;
 }
 ball.shockTime=0;ball.shockTeam=null;
}
export function stepStrikers(round,dt,positions=[]){
 if(round.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.1,dt);
 if(round.startRemaining>0){round.startRemaining=Math.max(0,round.startRemaining-dt);return;}
 if(round.resetClock>0){
  const remaining=round.resetClock-dt;
  const next=remaining<1e-8?0:remaining;
  round.resetClock=round.resetClock>GOAL_RESET_SECONDS&&next<=GOAL_RESET_SECONDS+1e-8?GOAL_RESET_SECONDS:next;
  return;
 }
 round.elapsed+=dt;round.remaining=Math.max(0,round.remaining-dt);if(round.remaining<=0){finish(round);return;}
 for(const a of round.actors){a.toolCooldowns=a.toolCooldowns.map(t=>Math.max(0,t-dt));a.effectTime=Math.max(0,(a.effectTime||0)-dt);a.shootCooldown=Math.max(0,a.shootCooldown-dt);a.buffTime=Math.max(0,(a.buffTime||0)-dt);if(!a.buffTime)a.buff=null;}
 const b=round.ball;
 if(b.carrier!=null){const carrier=round.actors[b.carrier];carrier.possession=(carrier.possession||0)+dt;}
 if(b.carrier==null){
 b.shotTrail=Math.max(0,(b.shotTrail||0)-dt);
 const previousX=b.position[0],previousZ=b.position[2];
 b.pickupDelay=Math.max(0,(b.pickupDelay||0)-dt);
 b.shockTime=Math.max(0,b.shockTime-dt);if(!b.shockTime)b.shockTeam=null;
 b.velocity[1]-=25*dt;b.position[0]+=b.velocity[0]*dt;b.position[1]+=b.velocity[1]*dt;b.position[2]+=b.velocity[2]*dt;
 if(b.position[1]<=BALL_RADIUS){
  b.position[1]=BALL_RADIUS;b.velocity[1]=b.velocity[1]<-1.2?-b.velocity[1]*.34:0;
  const speed=Math.hypot(b.velocity[0],b.velocity[2]),drag=speed?Math.max(0,1-.65*dt/speed):0;
  b.velocity[0]*=drag;b.velocity[2]*=drag;
 }
 if(b.position[0]<FIELD.minX+BALL_RADIUS||b.position[0]>FIELD.maxX-BALL_RADIUS){b.position[0]=Math.max(FIELD.minX+BALL_RADIUS,Math.min(FIELD.maxX-BALL_RADIUS,b.position[0]));b.velocity[0]*=-.78;}
 const direction=Math.sign(b.velocity[2]);
 const goalLine=direction>0?FIELD.maxZ:FIELD.minZ;
 const wall=goalLine-direction*BALL_RADIUS;
 if(direction&&(b.position[2]-wall)*direction>=0){
  const travel=b.position[2]-previousZ;
  const crossing=(line)=>previousX+(b.position[0]-previousX)*Math.max(0,Math.min(1,(line-previousZ)/travel));
  const inOpening=x=>Math.abs(x-FIELD.goalCenterX)+BALL_RADIUS<FIELD.goalHalfWidth;
  if((b.position[2]-goalLine)*direction>=0&&inOpening(crossing(wall))&&inOpening(crossing(goalLine))){
   const team=direction>0?1:0;
   b.position[0]=crossing(goalLine);b.position[2]=goalLine;
   round.score[team]++;
   round.goalTeam=team;
   if(b.lastTouch!==null&&round.actors[b.lastTouch].team===team)round.actors[b.lastTouch].goals++;
   resetBall(round);return;
  }
  if(!inOpening(crossing(wall))||(b.position[2]-goalLine)*direction>=0){
   b.position[2]=wall;b.velocity[2]*=-.8;
  }
 }
 claimBall(round,positions);
 }
 round.buffClock-=dt;if(round.buffClock<=0){spawnBuff(round);round.buffClock=8+random(round)*4;}
 for(const buff of round.buffs){buff.time-=dt;if(!buff.landed){buff.velocity-=11*dt;buff.position[1]+=buff.velocity*dt;if(buff.position[1]<=.55){buff.position[1]=.55;buff.velocity=0;buff.landed=true;}}if(!buff.landed||buff.time<=0)continue;for(const a of round.actors){const p=positions[a.id];if(p&&Math.hypot(p.x-buff.position[0],p.z-buff.position[2])<1){a.buff=buff.type;a.buffTime=8;buff.time=0;break;}}}
 round.buffs=round.buffs.filter(x=>x.time>0);
}
export function strikerBotGoal(round,id,positions=[]){
 const a=round.actors[id],p=positions[id],ball=round.ball.position,team=a.team,partner=round.actors.find(x=>x.team===team&&x.id!==id);if(!p)return ball;
 if(round.ball.carrier===id)return [0,0,team===0?FIELD.minZ:FIELD.maxZ];
 if(partner&&id>partner.id){const defendZ=team===0?6.8:-6.8;return [Math.max(-4,Math.min(4,ball[0]*.65)),0,(ball[2]+defendZ)*.5];}
 return [ball[0],0,ball[2]];
}
export function strikerBotWantsShot(round,id,p,angle){
 if(round.ball.carrier!==id)return false;
 const goalZ=round.actors[id].team===0?FIELD.minZ:FIELD.maxZ;
 const distance=goalZ-p.z;
 return Math.abs(distance)<10&&Math.sign(Math.cos(angle))===Math.sign(distance)&&Math.abs(p.x+Math.tan(angle)*distance)<1.7;
}
export function strikerSpeedMultiplier(state){return state?.buff==='speed'&&state.buffTime>0?1.45:1;}
