// Shared authoritative rules for the Tile Tumble event. Positions are Y-up metres.
export const TILETIDE_VERSION=2;
export const TILE_BANANA_SECONDS=1;
export const TILE_RUN_SECONDS=3,TILE_REVEAL_SECONDS=2,TILE_RETURN_SECONDS=1,TILE_IDLE_SECONDS=4,TILE_STUN_SECONDS=2;
export const TILE_RADIUS=2.45;
export const TILE_COLORS=[
 {name:'AQUA',color:'#35d9ee'},
 {name:'YELLOW',color:'#ffd84f'},
 {name:'RED',color:'#ff6570'},
 {name:'GREEN',color:'#69e34e'},
 {name:'PINK',color:'#f471dc'},
 {name:'PURPLE',color:'#9b62e8'},
 {name:'WHITE',color:'#e9f3ff'},
];
export const TILE_POSITIONS=[[-4.4,0,0],[-2.2,0,-3.8],[2.2,0,-3.8],[4.4,0,0],[2.2,0,3.8],[-2.2,0,3.8],[0,0,0]];
export const TILE_SPAWNS=[[-2.4,0,-1.5],[2.4,0,-1.5],[2.4,0,1.5],[-2.4,0,1.5]];

function random(round){let x=round.randomState|0;x^=x<<13;x^=x>>>17;x^=x<<5;round.randomState=x>>>0;return round.randomState/4294967296;}
function chooseTile(round){let next=Math.floor(random(round)*TILE_POSITIONS.length);if(next===round.safeTile)next=(next+1+Math.floor(random(round)*(TILE_POSITIONS.length-1)))%TILE_POSITIONS.length;return next;}
function alive(round){return round.actors.filter(a=>!a.eliminated);}
function finish(round){const survivors=alive(round);round.phase='finished';round.winnerId=survivors.length===1?survivors[0].id:null;round.winner=survivors.length===1?'runner':null;round.reason=survivors.length===1?'last-standing':'draw';}
export function createTiletideRound(base,{seed=Math.floor(Math.random()*4294967295)||1}={}){
 const round={...base,mode:'tiletide',eventVersion:TILETIDE_VERSION,playerRole:'runner',winner:null,winnerId:null,reason:null,
  elapsed:0,cycle:1,tileStage:'idle',tileClock:TILE_IDLE_SECONDS,safeTile:-1,randomState:seed>>>0||1,caches:[],totalMoney:0,collected:0,
  actors:base.actors.map(a=>({...a,role:'runner',eliminated:false,survived:0,money:0}))};
 round.safeTile=chooseTile(round);round.remaining=round.tileClock;return round;
}
export function tileSafeRadius(round){return Math.max(1.25,TILE_RADIUS-.11*Math.max(0,round.cycle-1));}
export function tileHexContains(position,center,radius=TILE_RADIUS){if(!position||!center)return false;const x=Math.abs(position.x-center[0]),z=Math.abs(position.z-center[2]);return x<=Math.sqrt(3)*.5*radius&&z+x/Math.sqrt(3)<=radius;}
export function tileArenaContains(position,margin=.12){return TILE_POSITIONS.some(center=>tileHexContains(position,center,TILE_RADIUS+margin));}
export function tileStageContains(round,position,margin=.12){return round.tileStage==='reveal'?tileHexContains(position,TILE_POSITIONS[round.safeTile],TILE_RADIUS+margin):tileArenaContains(position,margin);}
export function tileContains(round,position,tile=round.safeTile){return tileHexContains(position,TILE_POSITIONS[tile],tileSafeRadius(round));}
export function stepTiletide(round,dt,positions=[]){
 if(round.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.1,dt);
 if(round.startRemaining>0){round.startRemaining=Math.max(0,round.startRemaining-dt);if(round.startRemaining<1e-8)round.startRemaining=0;return;}
 round.elapsed+=dt;for(const a of round.actors){a.interacting=false;a.toolCooldowns=a.toolCooldowns.map(t=>Math.max(0,t-dt));for(const key of ['effectTime','immune','captureLock','releaseCooldown'])a[key]=Math.max(0,(a[key]||0)-dt);if(!a.eliminated&&!tileStageContains(round,positions[a.id])){a.eliminated=a.caught=true;a.effectTime=0;a.fell=true;}}
 if(alive(round).length<=1){finish(round);return;}
 round.tileClock=Math.max(0,round.tileClock-dt);round.remaining=round.tileClock;
 if(round.tileClock>1e-8)return;
 if(round.tileStage==='run'){
  const survivors=alive(round);const ranked=survivors.map(a=>{const p=positions[a.id],c=TILE_POSITIONS[round.safeTile];return {a,d:p?Math.hypot(p.x-c[0],p.z-c[2]):Infinity};}).sort((a,b)=>a.d-b.d||a.a.id-b.a.id);
  const sudden=round.cycle>=10;
  for(const item of ranked)if(!tileContains(round,positions[item.a.id])||(sudden&&item!==ranked[0])){item.a.eliminated=item.a.caught=true;item.a.effectTime=0;item.a.fell=true;item.a.fallDelay=.32;}
  for(const item of ranked)if(!item.a.eliminated)item.a.survived++;
  round.tileStage='reveal';round.tileClock=TILE_REVEAL_SECONDS;round.remaining=round.tileClock;
  if(alive(round).length<=1)finish(round);
 }else if(round.tileStage==='reveal'){
  round.cycle++;round.safeTile=-1;round.tileStage='return';round.tileClock=TILE_RETURN_SECONDS;round.remaining=round.tileClock;
 }else if(round.tileStage==='return'){
  round.tileStage='idle';round.tileClock=TILE_IDLE_SECONDS;round.remaining=round.tileClock;
 }else{
  round.safeTile=chooseTile(round);round.tileStage='run';round.tileClock=TILE_RUN_SECONDS;round.remaining=round.tileClock;
 }
}
export function tileBotGoal(round,id){
 if(round.tileStage==='idle'||round.tileStage==='return')return TILE_POSITIONS[(id*2+round.cycle)%TILE_POSITIONS.length];
 const center=TILE_POSITIONS[round.safeTile];if(round.tileStage==='run')return [center[0],0,center[2]];
 const angle=id/4*Math.PI*2+round.cycle*.7,r=Math.min(1.1,tileSafeRadius(round)*.45);return [center[0]+Math.cos(angle)*r,0,center[2]+Math.sin(angle)*r];
}
