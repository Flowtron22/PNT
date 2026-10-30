import {CAPTURE_LOCK_SECONDS} from './capture-timing.js';
export const ROUND_SECONDS=300;
export const DETECTION_RADIUS=2,CAPTURE_SECONDS=1.6;
export const CAPTURE_DECAY=.4,SMOKE_RADIUS=2.6,START_SECONDS=4;
export const DETECTION_HEIGHT=.8,DETECTION_GRACE=1.5;
export const INTERACT_RADIUS=2.2,RELEASE_COOLDOWN=10,RESCUE_SECONDS=1.5,STEAL_RATE=100;
export const TOOL_COOLDOWNS={hammer:10,banana:5,rocket:15,smoke:30,rewind:10};
export function createRound(playerRole='runner',caches=[]){
 if(!['runner','chaser'].includes(playerRole))throw new Error('Unknown role');
 return {remaining:ROUND_SECONDS,startRemaining:0,phase:'playing',winner:null,reason:null,playerRole,collected:0,totalMoney:caches.reduce((n,c)=>n+c.amount,0),caches:caches.map(c=>({...c,remaining:c.amount,harvester:null})),actors:Array.from({length:4},(_,i)=>({id:i,role:(playerRole==='chaser'?i===0:i===1)?'chaser':'runner',caught:false,inSmoke:false,caughtTime:0,releaseCooldown:0,rescueProgress:0,rescuer:null,immune:0,toolCooldowns:[0,0],effect:null,effectTime:0,captureRemaining:0,captureLock:0,detectionProgress:0,money:0,captures:0,rescues:0,stuns:0,interacting:false}))};
}
export function canAct(round,id){const a=round.actors[id];return !!(round.phase==='playing'&&!(round.startRemaining>0)&&a&&!a.caught&&!(a.captureLock>0)&&a.captureRemaining<=0&&a.effectTime<=0);}
export function startCountdown(round){round.startRemaining=START_SECONDS;}
export function updateSmokeCoverage(round,positions,clouds){
 const xyz=p=>Array.isArray(p)?p:[p.x,p.y,p.z];
 for(const actor of round.actors){const p=xyz(positions[actor.id]);actor.inSmoke=clouds.some(cloud=>{if(cloud.time<=0)return false;const q=xyz(cloud.position);return Math.hypot(p[0]-q[0],p[2]-q[2])<=SMOKE_RADIUS&&Math.abs(p[1]-q[1])<2.2;});if(actor.inSmoke&&['stunned','airStunned','banana'].includes(actor.effect)){actor.effect=null;actor.effectTime=0;}}
}
export function activateTool(round,id,slot,tool='hammer'){
 const a=round.actors[id];if(![0,1].includes(slot)||!TOOL_COOLDOWNS[tool]||!canAct(round,id)||a.inSmoke||a.toolCooldowns[slot]>0)return false;a.toolCooldowns[slot]=TOOL_COOLDOWNS[tool];return true;
}
export function finishRound(round,winner,reason){if(round.phase!=='playing')return false;round.phase='finished';round.winner=winner;round.reason=reason;return true;}
function completeCapture(round,r){cancelInteraction(round,r.id);r.effect=null;r.effectTime=0;r.detectionProgress=0;r.captureRemaining=0;r.caught=true;r.caughtTime=0;r.releaseCooldown=RELEASE_COOLDOWN;r.rescueProgress=0;r.rescuer=null;r.interacting=false;if(round.actors.filter(a=>a.role==='runner').every(a=>a.caught))finishRound(round,'chaser','captured');}
// Shared spatial/start checks keep practice and the authoritative server identical.
export function detectThiefAt(round,chaserId,runnerId,dt,p,q,clear=true){
 const height=Math.abs(p.y-q.y),distance=Math.hypot(p.x-q.x,p.z-q.z);
 return detectThief(round,chaserId,runnerId,dt,distance,clear&&Number.isFinite(height)&&height<DETECTION_HEIGHT&&ROUND_SECONDS-round.remaining>DETECTION_GRACE+1e-8);
}
// Independent thief meters accumulate only on valid contact and decay on loss.
export function detectThief(round,chaserId,runnerId,dt,distance,clear=true){
 const c=round.actors[chaserId],r=round.actors[runnerId];if(!r||round.phase!=='playing'||round.startRemaining>0)return false;
 if(!Number.isFinite(dt)||dt<=0)return false;
 if(r.caught||r.captureRemaining>0||r.immune>0||r.role!=='runner'){r.detectionProgress=0;return false;}
 if(!canAct(round,chaserId)||c.role!=='chaser'||c.inSmoke||r.inSmoke||!clear||!Number.isFinite(distance)||distance<0||distance>DETECTION_RADIUS){r.detectionProgress=Math.max(0,(r.detectionProgress||0)-Math.min(dt,.1)*CAPTURE_DECAY);return false;}
 r.detectionProgress=(r.detectionProgress||0)+Math.min(dt,.1);
 if(r.detectionProgress<CAPTURE_SECONDS-1e-8)return false;
 completeCapture(round,r);c.captures=(c.captures||0)+1;c.captureLock=CAPTURE_LOCK_SECONDS;cancelInteraction(round,chaserId);return true;
}
export function harvest(round,id,cacheId,dt,distance,clear=true){
 const a=round.actors[id],cache=round.caches.find(c=>c.id===cacheId);if(!canAct(round,id)||a.inSmoke||a.role!=='runner'||!cache||cache.remaining<=0||!clear||!Number.isFinite(distance)||distance<0||distance>INTERACT_RADIUS||!Number.isFinite(dt)||dt<=0||(cache.harvester!==null&&cache.harvester!==id))return 0;
 cache.harvester=id;const amount=Math.min(cache.remaining,STEAL_RATE*Math.min(dt,.1));cache.remaining-=amount;round.collected+=amount;a.money+=amount;a.interacting=true;
 if(round.totalMoney>0&&round.collected>=round.totalMoney-.001)finishRound(round,'runner','money');return amount;
}
export function rescue(round,helperId,targetId,dt,distance,clear=true){
 const h=round.actors[helperId],t=round.actors[targetId];if(!canAct(round,helperId)||h.role!=='runner'||!t?.caught||t.role!=='runner'||helperId===targetId||t.releaseCooldown>0||!clear||!Number.isFinite(distance)||distance<0||distance>INTERACT_RADIUS||!Number.isFinite(dt)||dt<=0)return false;
 if(t.rescuer!==helperId){if(t.rescuer!==null&&canAct(round,t.rescuer))return false;t.rescuer=helperId;t.rescueProgress=0;}t.rescueProgress+=Math.min(dt,.1);h.interacting=true;
 if(t.rescueProgress>=RESCUE_SECONDS-.00001){t.caught=false;t.caughtTime=0;t.rescuer=null;t.rescueProgress=0;t.immune=2;h.rescues=(h.rescues||0)+1;return true;}return false;
}
export function cancelInteraction(round,id){const a=round.actors[id];if(a)a.interacting=false;for(const c of round.caches)if(c.harvester===id)c.harvester=null;for(const t of round.actors)if(t.rescuer===id){t.rescuer=null;t.rescueProgress=0;}}
export function stepRound(round,dt){
 if(round.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;const step=Math.min(dt,.1);if(round.startRemaining>0){round.startRemaining=Math.max(0,round.startRemaining-step);if(round.startRemaining<1e-8)round.startRemaining=0;return;}round.remaining=Math.max(0,round.remaining-step);
 for(const a of round.actors){a.captureLock=Math.max(0,(a.captureLock||0)-step);if(a.captureLock<1e-8)a.captureLock=0;a.toolCooldowns=a.toolCooldowns.map(t=>Math.max(0,t-step));a.effectTime=Math.max(0,a.effectTime-step);a.releaseCooldown=Math.max(0,a.releaseCooldown-step);a.immune=Math.max(0,a.immune-step);if(a.caught)a.caughtTime+=step;}
 if(round.remaining===0)finishRound(round,'chaser','timeout');
}
