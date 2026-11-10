// Territory rules shared by local play, Steam host and client prediction.
export const SPLASH_VERSION=4;
export const SPLASH_HALF=12,SPLASH_SIZE=256,SPLASH_CELL=24/SPLASH_SIZE;
export const SPLASH_INK_CAPACITY=160;
const SPRAY_RADIUS=1.38,CAN_RELEASE_DELAY=.14,CAN_THROW_DURATION=.48;
export const SPLASH_COLORS=['#006cff','#ff8700','#00c96a','#ff0088'];
export const SPLASH_SPAWNS=[[-9,0,-9],[9,0,-9],[9,0,9],[-9,0,9]];
export function createSplashArenaData(){const n=65;return {metadata:{id:'grassfield',name:'SPLISH SPLASH',origin:[0,0,0],spawns:SPLASH_SPAWNS,caches:[]},grid:{step:.5,nx:n,nz:n,minX:-16,minZ:-16,heights:new Float32Array(n*n),blocked:new Uint8Array(n*n),edges:new Uint8Array(n*n)}};}
function random(r){r.paintSeed=(Math.imul(r.paintSeed,1664525)+1013904223)>>>0;return r.paintSeed/4294967296;}
export function splashInside(box,x,z,pad=0){const dx=Math.abs(x-box.x),dz=Math.abs(z-box.z),hx=box.w/2+pad,hz=box.d/2+pad;return dx<hx&&dz<hz&&dx+dz<hx+hz-.22;}
export function splashClear(boxes,x,z,pad=0){return Math.abs(x)<SPLASH_HALF-pad&&Math.abs(z)<SPLASH_HALF-pad&&!boxes.some(b=>splashInside(b,x,z,pad));}
export function slideSplashCover(state,from,to){const boxes=state.paintCover||[],dx=to.x-from.x,dz=to.z-from.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));let x=from.x,z=from.z;for(let i=0;i<n;i++){if(splashClear(boxes,x+dx/n,z,.34))x+=dx/n;if(splashClear(boxes,x,z+dz/n,.34))z+=dz/n;}to.x=x;to.z=z;}
export function paintIndex(x,z){const ix=Math.floor((x+12)/SPLASH_CELL),iz=Math.floor((z+12)/SPLASH_CELL);return ix<0||iz<0||ix>=SPLASH_SIZE||iz>=SPLASH_SIZE?-1:iz*SPLASH_SIZE+ix;}
export function ownPaint(r,a,p){return r.paint[paintIndex(p.x,p.z)]===String(a.paintSeat+1);}
export function splashCoverage(r,a){return 100*(r.paintCounts[a.paintSeat]||0)/Math.max(1,r.paintTotal);}
export function createSplashRound(base,{seed=Math.floor(Math.random()*4294967296)}={}){
 const r={...base,mode:'splash',eventVersion:SPLASH_VERSION,playerRole:'runner',remaining:120,elapsed:0,winner:null,winnerId:null,reason:null,caches:[],collected:0,totalMoney:0,paintSeed:seed>>>0,paintRevision:0,paintShotId:0,paintShots:[],paintBursts:[],paintCover:[],paintCounts:[0,0,0,0]};
 // Nine separated regions, with one randomly left open. Jitter and independent
 // box sizes change lanes each round while preserving spawn and wall clearance.
 const regions=[-6.3,0,6.3].flatMap(x=>[-6.3,0,6.3].map(z=>[x,z]));
 regions.splice(Math.floor(random(r)*regions.length),1);
 for(const [x,z] of regions){
  const jitterX=(random(r)-.5)*2.2,jitterZ=(random(r)-.5)*2.2;
  const centerZ=x&&z?Math.sign(z)*Math.min(5.65,Math.abs(z+jitterZ)):z+jitterZ;
  r.paintCover.push({x:x+jitterX,z:centerZ,
   w:1.7+random(r)*1.1,d:1.6+random(r)*1.2,h:1.4+random(r)*1.1});
 }
 r.paint=Array.from({length:SPLASH_SIZE*SPLASH_SIZE},(_,i)=>splashClear(r.paintCover,(i%SPLASH_SIZE+.5)*SPLASH_CELL-12,(Math.floor(i/SPLASH_SIZE)+.5)*SPLASH_CELL-12)?'0':'x').join('');r.paintTotal=r.paint.split('').filter(c=>c!=='x').length;
 r.actors=base.actors.map(a=>({...a,role:'runner',caught:false,eliminated:false,paintSeat:a.id,ink:SPLASH_INK_CAPACITY,throwTime:0,diving:false,submerged:false,shotCooldown:0,shots:0,cans:0,paintCover:r.paintCover,money:0}));
 for(const a of r.actors){const p=SPLASH_SPAWNS[a.id];splashPaint(r,a.paintSeat,p[0],p[2],1.35,0);}
 return r;
}
function lineClear(r,x,z,qx,qz){const n=Math.ceil(Math.hypot(qx-x,qz-z)/.12);for(let i=1;i<=n;i++)if(!splashClear(r.paintCover,x+(qx-x)*i/n,z+(qz-z)*i/n))return false;return true;}
export function splashPaint(r,seat,x,z,radius,seed=0){
 const cells=r.paint.split(''),loX=Math.max(0,Math.floor((x-radius*1.35+12)/SPLASH_CELL)),hiX=Math.min(SPLASH_SIZE-1,Math.ceil((x+radius*1.35+12)/SPLASH_CELL)),loZ=Math.max(0,Math.floor((z-radius*1.35+12)/SPLASH_CELL)),hiZ=Math.min(SPLASH_SIZE-1,Math.ceil((z+radius*1.35+12)/SPLASH_CELL));let changed=false;
 for(let iz=loZ;iz<=hiZ;iz++)for(let ix=loX;ix<=hiX;ix++){const i=iz*SPLASH_SIZE+ix;if(cells[i]==='x'||cells[i]===String(seat+1))continue;const px=(ix+.5)*SPLASH_CELL-12,pz=(iz+.5)*SPLASH_CELL-12,dx=px-x,dz=pz-z,angle=Math.atan2(dz,dx),edge=radius*(1+.13*Math.sin(angle*5+seed)+.09*Math.sin(angle*9-seed*2));if(Math.hypot(dx,dz)>edge||!lineClear(r,x,z,px,pz))continue;const old=Number(cells[i])-1;if(old>=0)r.paintCounts[old]--;cells[i]=String(seat+1);r.paintCounts[seat]++;changed=true;}
 if(changed){r.paint=cells.join('');r.paintRevision++;}
}
function burst(r,s){splashPaint(r,s.seat,s.x,s.z,s.can?2.55:SPRAY_RADIUS,s.id*.71);r.paintBursts.push({id:s.id,x:s.x,z:s.z,seat:s.seat,r:s.can?2.55:SPRAY_RADIUS});if(r.paintBursts.length>24)r.paintBursts.shift();}
export function splashHoseTarget(boxes,p,angle){
 const dx=Math.sin(angle),dz=Math.cos(angle);
 let distance=0;
 for(let d=.06;d<=3.3;d+=.06){
  if(!splashClear(boxes,p.x+dx*d,p.z+dz*d,.07))break;
  distance=d;
 }
 return {x:p.x+dx*distance,z:p.z+dz*distance,distance};
}
export const SPLASH_CAN_TIME=.85;
export function splashCanHeight(t){return .86*(1-t)+13.6*t*(1-t)+.05;}
export function splashCanTarget(boxes,p,angle){
 const dx=Math.sin(angle),dz=Math.cos(angle);
 for(let distance=6;distance>0;distance-=.25){
  const x=p.x+dx*distance,z=p.z+dz*distance;
  if(!splashClear(boxes,x,z,.2))continue;
  let clear=true;
  for(let i=1;i<64;i++){
   const t=i/64,y=splashCanHeight(t);
   if(boxes.some(box=>y<box.h+.23&&splashInside(box,p.x+dx*distance*t,p.z+dz*distance*t,.17))){
    clear=false;break;
   }
  }
  if(clear)return {x,z};
 }
 return {x:p.x,z:p.z};
}
export function splashAction(r,id,slot,p,angle){
 const a=r.actors[id];
 if(r.mode!=='splash'||r.phase!=='playing'||r.startRemaining>0||!a)return false;
 if(a.throwTime>0)return false;
 if(slot===0){a.diving=!a.diving;a.spraying=false;return true;}
 if(slot!==1||a.ink<30||a.toolCooldowns[1]>0)return false;
 const target=splashCanTarget(r.paintCover,p,angle);
 a.diving=false;a.submerged=false;a.ink-=30;a.paintIdle=0;a.toolCooldowns[1]=5;a.cans++;
 a.throwTime=CAN_THROW_DURATION;a.spraying=false;
 r.paintShots.push({id:++r.paintShotId,seat:a.paintSeat,x:p.x,z:p.z,y:splashCanHeight(0),
  startX:p.x,startZ:p.z,targetX:target.x,targetZ:target.z,age:-CAN_RELEASE_DELAY,can:true});
 return true;
}
export function splashFire(r,id,p,angle,wants){
 const a=r.actors[id];
 a.spraying=false;
 if(!wants||r.startRemaining>0||r.phase!=='playing'||a.ink<2.5||a.throwTime>0)return;
 a.diving=false;a.submerged=false;a.spraying=true;a.sprayAngle=angle;
 if(a.shotCooldown>0)return;
 a.ink-=2.5;a.shotCooldown=.13;a.paintIdle=0;a.shots++;
 const target=splashHoseTarget(r.paintCover,p,angle);
 burst(r,{id:++r.paintShotId,seat:a.paintSeat,x:target.x,z:target.z,can:false});
}
export function stepSplash(r,dt,positions){if(r.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.1,dt);if(r.startRemaining>0){r.startRemaining=Math.max(0,r.startRemaining-dt);if(r.startRemaining<1e-8)r.startRemaining=0;return;}dt=Math.min(dt,r.remaining);r.elapsed+=dt;r.remaining=Math.max(0,r.remaining-dt);
 for(const a of r.actors){a.throwTime=Math.max(0,a.throwTime-dt);a.shotCooldown=Math.max(0,a.shotCooldown-dt);a.toolCooldowns=a.toolCooldowns.map(t=>Math.max(0,t-dt));a.submerged=a.diving&&ownPaint(r,a,positions[a.id]);a.paintIdle=(a.paintIdle||0)+dt;if(a.submerged)a.ink=Math.min(SPLASH_INK_CAPACITY,a.ink+42*dt);else if(a.paintIdle>.9)a.ink=Math.min(SPLASH_INK_CAPACITY,a.ink+5*dt);}
 const live=[];
 for(const shot of r.paintShots){
  shot.age+=dt;
  const t=Math.max(0,Math.min(1,shot.age/SPLASH_CAN_TIME));
  shot.x=shot.startX+(shot.targetX-shot.startX)*t;
  shot.z=shot.startZ+(shot.targetZ-shot.startZ)*t;
  shot.y=splashCanHeight(t);
  if(t===1)burst(r,shot);else live.push(shot);
 }
 r.paintShots=live;
 if(r.remaining<1e-8){r.remaining=0;r.phase='finished';const best=Math.max(...r.paintCounts),winners=r.actors.filter(a=>r.paintCounts[a.paintSeat]===best);r.winnerId=winners.length===1?winners[0].id:null;r.winner=r.winnerId===null?null:'runner';r.reason=winners.length===1?'coverage':'draw';}
}
// Bots walk between clear points; low ink returns to their closest owned turf.
export function splashBotInput(r,id,p){const a=r.actors[id];if(a.ink<12)a.paintRefilling=true;if(a.ink>SPLASH_INK_CAPACITY-6)a.paintRefilling=false;
 if(a.paintRefilling){a.diving=true;if(ownPaint(r,a,p))return {x:0,z:0,interact:false};let best=Infinity,target=null;for(let i=0;i<r.paint.length;i+=3){if(r.paint[i]!==String(a.paintSeat+1))continue;const x=(i%SPLASH_SIZE+.5)*SPLASH_CELL-12,z=(Math.floor(i/SPLASH_SIZE)+.5)*SPLASH_CELL-12,d=(x-p.x)**2+(z-p.z)**2;if(d<best&&splashClear(r.paintCover,x,z,.4)&&lineClear(r,p.x,p.z,x,z)){best=d;target={x,z};}}if(target){const d=Math.hypot(target.x-p.x,target.z-p.z);return {x:(target.x-p.x)/Math.max(.1,d),z:(target.z-p.z)/Math.max(.1,d),interact:false};}a.diving=false;}
 else a.diving=false;
 if(!a.paintGoal||Math.hypot(a.paintGoal.x-p.x,a.paintGoal.z-p.z)<.6||r.elapsed>(a.paintGoal.until||0)){let best=-Infinity;for(let k=0;k<24;k++){const angle=random(r)*Math.PI*2,d=2+random(r)*5,x=p.x+Math.sin(angle)*d,z=p.z+Math.cos(angle)*d;if(!splashClear(r.paintCover,x,z,.6)||!lineClear(r,p.x,p.z,x,z))continue;const score=(r.paint[paintIndex(x,z)]!==String(a.paintSeat+1)?10:0)+random(r)*6;if(score>best){best=score;a.paintGoal={x,z,until:r.elapsed+2.5};}}}
 const t=a.paintGoal||p,d=Math.hypot(t.x-p.x,t.z-p.z);return {x:(t.x-p.x)/Math.max(.1,d),z:(t.z-p.z)/Math.max(.1,d),interact:true};
}
