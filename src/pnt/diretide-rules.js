// Shared authoritative event rules. World positions are Y-up metres.
export const DIRETIDE_VERSION=4;
export const DIRETIDE_SECONDS=50, WELL_HEARTS=2, CARRY_LIMIT=30, DEPOSIT_RATE=12;
export const EVENT_SPEED_MULTIPLIER=1.3,EVENT_HAMMER_RADIUS=3,EVENT_BANANA_SECONDS=7,EVENT_STUN_SECONDS=4,CANDY_SPAWN_FLIGHT=.85;
export const PLAYER_COLORS=['#4f97ff','#ffb331','#4bd58a','#ef78ba'];
export const CANDY_SIZES={small:{amount:1,radius:.22},medium:{amount:3,radius:.36},big:{amount:5,radius:.52}};
export const CANDY_SPAWN_SECONDS=3,CANDY_LIMIT=44;
function random(round){let x=round.randomState|0;x^=x<<13;x^=x>>>17;x^=x<<5;round.randomState=x>>>0;return round.randomState/4294967296;}
export function createDiretideRound(base,metadata,{seed=Math.floor(Math.random()*4294967295)||1}={}){
 const round={...base,mode:'diretide',eventVersion:DIRETIDE_VERSION,remaining:DIRETIDE_SECONDS,elapsed:0,cycle:1,playerRole:'runner',winner:null,winnerId:null,collected:0,totalMoney:0,
  caches:[],pickups:[],pickupId:0,spawnClock:CANDY_SPAWN_SECONDS,randomState:seed>>>0||1,drops:[],dropId:0,
  wells:metadata.wells.map(w=>({...w,hearts:WELL_HEARTS,candy:0})),boss:{stage:'sleeping',position:[...metadata.bossSpawn],home:[...metadata.bossSpawn],targets:[],target:null,clock:0,hit:false,smashes:0},
  actors:base.actors.map(a=>({...a,role:'runner',candy:0,deposited:0,eliminated:false,money:0,depositProgress:0,depositWell:null}))};
 // Static navigation candidates stay out of 20 Hz snapshots. Online clients consume
 // authoritative pickups/landing positions and never simulate their own spawns.
 Object.defineProperty(round,'spawnPoints',{value:metadata.candySpawns||metadata.caches.map(c=>c.position)});
 spawnCandy(round,24);return round;
}
export function spawnCandy(round,count=6){
 if(!round.spawnPoints?.length)return;
 for(let n=0;n<count&&round.pickups.length<CANDY_LIMIT;n++){
  const start=Math.floor(random(round)*round.spawnPoints.length);let position=null;
  for(let i=0;i<round.spawnPoints.length;i++){
   const p=round.spawnPoints[(start+i)%round.spawnPoints.length];
   if(round.wells.some(w=>Math.hypot(p[0]-w.position[0],p[2]-w.position[2])<2)||round.pickups.some(c=>Math.hypot(p[0]-c.position[0],p[2]-c.position[2])<1.25))continue;
   position=[...p];break;
  }
  if(!position)break;const roll=random(round),size=roll<.55?'small':roll<.85?'medium':'big';
  round.pickups.push({id:++round.pickupId,position,size,amount:CANDY_SIZES[size].amount,born:round.elapsed,time:35});
 }
}
export function eventCanAct(round,id){const a=round.actors[id];return !!(round.phase==='playing'&&!(round.startRemaining>0)&&a&&!a.eliminated&&!a.caught&&a.effectTime<=0);}
export function eventTarget(round,id,position,clear=()=>true){
 if(!eventCanAct(round,id)||round.actors[id].inSmoke||round.actors[id].candy<=0||!['sleeping','returning'].includes(round.boss.stage))return null;
 const distance=p=>Math.hypot(position.x-p[0],position.z-p[2]);
 return round.wells.filter(w=>w.owner!==id&&w.hearts>0&&distance(w.position)<2.2&&Math.abs(position.y-w.position[1])<2&&clear(w.position))
  .sort((a,b)=>distance(a.position)-distance(b.position)).map(w=>({type:'well',target:w,position:w.position}))[0]||null;
}
export function eventInteract(round,id,target,dt,distance,clear=true){
 if(!eventCanAct(round,id)||round.actors[id].inSmoke||target?.type!=='well'||!Number.isFinite(dt)||dt<=0||!Number.isFinite(distance)||distance<0||distance>2.2||!clear)return 0;
 const a=round.actors[id],well=round.wells.find(w=>w.id===target.target?.id);
 if(a.candy<=0||!well||well.owner===id||well.hearts<=0||!['sleeping','returning'].includes(round.boss.stage))return 0;
 if(a.depositWell!==well.id){a.depositWell=well.id;a.depositProgress=0;}a.depositProgress+=DEPOSIT_RATE*Math.min(.1,dt);
 const amount=Math.min(a.candy,Math.floor(a.depositProgress+1e-8));a.depositProgress=Math.max(0,a.depositProgress-amount);well.candy+=amount;a.candy-=amount;a.deposited+=amount;a.money=a.deposited;a.interacting=true;return amount;
}
function landedPosition(round,origin,x,z){
 const target=[origin[0]+x,origin[1],origin[2]+z];
 if(!round.spawnPoints?.length)return target;
 let best=origin,d=Infinity;
 for(const p of round.spawnPoints){const dist=(p[0]-target[0])**2+(p[2]-target[2])**2;if(dist<d){best=p;d=dist;}}
 return [...best];
}
export function dropCandy(round,id,position){
 const a=round.actors[id];if(!a||a.eliminated||a.candy<=0)return 0;
 const amount=Math.min(a.candy,Math.ceil(a.candy*.5)),pieces=Math.min(15,Math.ceil(amount));a.candy-=amount;
 const offset=random(round)*Math.PI*2;
 for(let i=0;i<pieces;i++){
  const angle=offset+i/pieces*Math.PI*2,distance=1.3+random(round)*1.7;
  round.drops.push({id:++round.dropId,origin:[position[0],position[1]+.65,position[2]],position:landedPosition(round,position,Math.cos(angle)*distance,Math.sin(angle)*distance),
   amount:amount/pieces,size:'small',born:round.elapsed,flight:.65+random(round)*.3,arc:1.5+random(round)*1.2,time:20});
 }
 if(round.drops.length>80)round.drops.splice(0,round.drops.length-80);return amount;
}
export function candyDropPose(drop,elapsed){
 const age=Math.max(0,elapsed-drop.born),t=Math.min(1,age/drop.flight),origin=drop.origin||drop.position;
 const bounce=age>drop.flight&&age<drop.flight+.36?Math.sin((age-drop.flight)/.36*Math.PI)*.28:0;
 return [origin[0]+(drop.position[0]-origin[0])*t,origin[1]+(drop.position[1]-origin[1])*t+(t<1?Math.sin(t*Math.PI)*drop.arc:0)+bounce,origin[2]+(drop.position[2]-origin[2])*t];
}
export function collectEventCandy(round,positions,clear=()=>true){
 if(round.phase!=='playing'||round.startRemaining>0)return;
 for(const candy of [...round.pickups,...round.drops]){
  if(candy.amount<=0||round.elapsed-candy.born<(candy.flight||CANDY_SPAWN_FLIGHT))continue;
  const radius=candy.flight ? .75 :.6+CANDY_SIZES[candy.size].radius*.5;
  const collectors=round.actors.filter(a=>eventCanAct(round,a.id)&&!a.inSmoke&&a.candy<CARRY_LIMIT).map(a=>({a,p:positions[a.id]})).filter(({p})=>p&&Math.abs(p.y-candy.position[1])<1.5)
   .map(item=>({...item,d:Math.hypot(item.p.x-candy.position[0],item.p.z-candy.position[2])})).filter(item=>item.d<radius&&clear(item.p,candy.position)).sort((a,b)=>a.d-b.d||a.a.id-b.a.id);
  if(!collectors.length)continue;const a=collectors[0].a,amount=Math.min(candy.amount,CARRY_LIMIT-a.candy);a.candy+=amount;candy.amount-=amount;a.interacting=true;
 }
 round.pickups=round.pickups.filter(c=>c.amount>.001);round.drops=round.drops.filter(c=>c.amount>.001);
}
export function spillOnStun(round,id,effect,position){const a=round.actors[id],stuns=['stunned','airStunned','banana'];if(round.mode==='diretide'&&a&&stuns.includes(effect)&&!(stuns.includes(a.effect)&&a.effectTime>0))return dropCandy(round,id,position);return 0;}
function finish(round){const alive=round.actors.filter(a=>!a.eliminated);if(alive.length>1)return;round.phase='finished';round.winnerId=alive[0]?.id??null;round.winner=alive.length?'runner':null;round.reason=alive.length?'last-well':'draw';}
function nextTarget(round){const b=round.boss;b.target=b.targets.shift()??null;b.stage=b.target===null?'returning':'walking';b.clock=0;b.hit=false;}
function walk(b,target,dt){const dx=target[0]-b.position[0],dz=target[2]-b.position[2],d=Math.hypot(dx,dz),step=Math.min(d,3.2*dt);if(d>.01){b.position[0]+=dx/d*step;b.position[2]+=dz/d*step;}b.position[1]=target[1];return d<=.15;}
export function stepDiretide(round,dt){
 if(round.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);
 if(round.startRemaining>0){round.startRemaining=Math.max(0,round.startRemaining-dt);if(round.startRemaining<1e-8)round.startRemaining=0;return;}
 round.elapsed+=dt;
 for(const a of round.actors){a.interacting=false;a.toolCooldowns=a.toolCooldowns.map(t=>Math.max(0,t-dt));for(const key of ['effectTime','immune','captureLock','releaseCooldown'])a[key]=Math.max(0,(a[key]||0)-dt);}
 for(const c of [...round.pickups,...round.drops])c.time-=dt;
 round.pickups=round.pickups.filter(c=>c.time>0&&c.amount>.001);round.drops=round.drops.filter(d=>d.time>0&&d.amount>.001);
 round.spawnClock-=dt;if(round.spawnClock<=0){round.spawnClock+=CANDY_SPAWN_SECONDS;spawnCandy(round);}
 const b=round.boss;
 if(b.stage==='sleeping'){
  round.remaining=Math.max(0,round.remaining-dt);
  if(round.remaining<=1e-8){const alive=round.wells.filter(w=>w.hearts>0),max=Math.max(0,...alive.map(w=>w.candy));if(max>.001){b.targets=alive.filter(w=>Math.abs(w.candy-max)<.001).map(w=>w.id);nextTarget(round);}else{round.remaining=DIRETIDE_SECONDS;round.cycle++;}}
 }else if(b.stage==='walking'){
  const w=round.wells.find(w=>w.id===b.target),target=[w.position[0],w.position[1],w.position[2]+(w.position[2]>0?-2:2)];if(walk(b,target,dt)){b.stage='smashing';b.clock=0;b.hit=false;}
 }else if(b.stage==='smashing'){
  b.clock+=dt;if(!b.hit&&b.clock>=1.17){b.hit=true;b.smashes++;const w=round.wells.find(w=>w.id===b.target);w.hearts=Math.max(0,w.hearts-1);if(w.hearts===0){const a=round.actors[w.owner];a.eliminated=a.caught=true;a.candy=0;a.effectTime=0;a.interacting=false;}}
  if(b.clock>=1.8){nextTarget(round);if(b.stage==='returning'){for(const w of round.wells)w.candy=0;finish(round);}}
 }else if(b.stage==='returning'&&walk(b,b.home,dt)){b.stage='sleeping';round.remaining=DIRETIDE_SECONDS;round.cycle++;}
}
export function eventBotGoal(round,id,position){
 const a=round.actors[id],distance=p=>(p[0]-position.x)**2+(p[2]-position.z)**2,opponents=round.wells.filter(w=>w.owner!==id&&w.hearts>0);
 if(a.candy>0&&a.depositWell!==null&&['sleeping','returning'].includes(round.boss.stage)){const w=opponents.find(w=>w.id===a.depositWell);if(w)return w.position;}
 if((a.candy>=8||a.candy>0&&round.remaining<10)&&['sleeping','returning'].includes(round.boss.stage)&&opponents.length)return opponents[(id+round.cycle)%opponents.length].position;
 return [...round.drops.filter(d=>round.elapsed-d.born>=d.flight),...round.pickups].filter(c=>c.amount>.001).sort((a,b)=>distance(a.position)-distance(b.position))[0]?.position||round.boss.home;
}

// Carry weight scales speed linearly down to one third at the carrying limit.
export function pattySpeedMultiplier(amount=0){return 1-(2/3)*Math.min(CARRY_LIMIT,Math.max(0,Number.isFinite(amount)?amount:0))/CARRY_LIMIT;}
export function fullestWell(wells){return wells.filter(w=>w.hearts>0&&w.candy>0).sort((a,b)=>b.candy-a.candy||a.id-b.id)[0]||null;}
