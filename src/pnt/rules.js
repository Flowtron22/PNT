export const ROUND_SECONDS=300;
export const DETECTION_RADIUS=2,CAPTURE_SECONDS=1.6;
export const TAG_RADIUS=.9,INTERACT_RADIUS=2.2,RELEASE_COOLDOWN=10,RESCUE_SECONDS=1.5,STEAL_RATE=100;
export const TOOL_COOLDOWNS={hammer:10,banana:5,rocket:15,smoke:30,rewind:10};
export function createRound(playerRole='runner',caches=[]){
 if(!['runner','chaser'].includes(playerRole))throw new Error('Unknown role');
 return {remaining:ROUND_SECONDS,phase:'playing',winner:null,reason:null,playerRole,collected:0,totalMoney:caches.reduce((n,c)=>n+c.amount,0),caches:caches.map(c=>({...c,remaining:c.amount,harvester:null})),actors:Array.from({length:4},(_,i)=>({id:i,role:(playerRole==='chaser'?i===0:i===1)?'chaser':'runner',caught:false,caughtTime:0,releaseCooldown:0,rescueProgress:0,rescuer:null,immune:0,toolCooldowns:[0,0],effect:null,effectTime:0,captureRemaining:0,detectionProgress:0,money:0,interacting:false}))};
}
export function canAct(round,id){const a=round.actors[id];return !!(round.phase==='playing'&&a&&!a.caught&&a.captureRemaining<=0&&a.effectTime<=0);}
export function activateTool(round,id,slot,tool='hammer'){
 const a=round.actors[id];if(![0,1].includes(slot)||!TOOL_COOLDOWNS[tool]||!canAct(round,id)||a.toolCooldowns[slot]>0)return false;a.toolCooldowns[slot]=TOOL_COOLDOWNS[tool];return true;
}
export function finishRound(round,winner,reason){if(round.phase!=='playing')return false;round.phase='finished';round.winner=winner;round.reason=reason;return true;}
export function beginCapture(round,chaserId,runnerId,distance){
 const c=round.actors[chaserId],r=round.actors[runnerId];if(!canAct(round,chaserId)||c.role!=='chaser'||r?.role!=='runner'||r.caught||r.captureRemaining>0||r.immune>0||!Number.isFinite(distance)||distance<0||distance>TAG_RADIUS)return false;
 r.captureRemaining=1;r.effect=null;r.effectTime=0;cancelInteraction(round,runnerId);return true;
}
function completeCapture(round,r){r.detectionProgress=0;r.captureRemaining=0;r.caught=true;r.caughtTime=0;r.releaseCooldown=RELEASE_COOLDOWN;r.rescueProgress=0;r.rescuer=null;r.interacting=false;if(round.actors.filter(a=>a.role==='runner').every(a=>a.caught))finishRound(round,'chaser','captured');}
export function tag(round,chaserId,runnerId,distance){
 const c=round.actors[chaserId],r=round.actors[runnerId];if(!canAct(round,chaserId)||c.role!=='chaser'||r?.role!=='runner'||r.caught||r.immune>0||!Number.isFinite(distance)||distance<0||distance>TAG_RADIUS)return false;
 completeCapture(round,r);return true;
}
// Each thief must stay continuously inside the visible police detection circle.
export function detectThief(round,chaserId,runnerId,dt,distance,clear=true){
 const c=round.actors[chaserId],r=round.actors[runnerId];if(!r)return false;
 if(!canAct(round,chaserId)||c.role!=='chaser'||r.role!=='runner'||r.caught||r.captureRemaining>0||r.immune>0||!clear||!Number.isFinite(distance)||distance<0||distance>DETECTION_RADIUS){r.detectionProgress=0;return false;}
 if(!Number.isFinite(dt)||dt<=0)return false;
 r.detectionProgress=(r.detectionProgress||0)+Math.min(dt,.1);
 if(r.detectionProgress<CAPTURE_SECONDS-1e-8)return false;
 cancelInteraction(round,runnerId);r.effect=null;r.effectTime=0;completeCapture(round,r);r.detectionProgress=0;return true;
}
export function harvest(round,id,cacheId,dt,distance,clear=true){
 const a=round.actors[id],cache=round.caches.find(c=>c.id===cacheId);if(!canAct(round,id)||a.role!=='runner'||!cache||cache.remaining<=0||!clear||!Number.isFinite(distance)||distance<0||distance>INTERACT_RADIUS||!Number.isFinite(dt)||dt<=0||(cache.harvester!==null&&cache.harvester!==id))return 0;
 cache.harvester=id;const amount=Math.min(cache.remaining,STEAL_RATE*Math.min(dt,.1));cache.remaining-=amount;round.collected+=amount;a.money+=amount;a.interacting=true;
 if(round.totalMoney>0&&round.collected>=round.totalMoney-.001)finishRound(round,'runner','money');return amount;
}
export function rescue(round,helperId,targetId,dt,distance,clear=true){
 const h=round.actors[helperId],t=round.actors[targetId];if(!canAct(round,helperId)||h.role!=='runner'||!t?.caught||helperId===targetId||t.releaseCooldown>0||!clear||!Number.isFinite(distance)||distance<0||distance>INTERACT_RADIUS||!Number.isFinite(dt)||dt<=0)return false;
 if(t.rescuer!==helperId){if(t.rescuer!==null&&canAct(round,t.rescuer))return false;t.rescuer=helperId;t.rescueProgress=0;}t.rescueProgress+=Math.min(dt,.1);h.interacting=true;
 if(t.rescueProgress>=RESCUE_SECONDS-.00001){t.caught=false;t.caughtTime=0;t.rescuer=null;t.rescueProgress=0;t.immune=2;return true;}return false;
}
export function cancelInteraction(round,id){const a=round.actors[id];if(a)a.interacting=false;for(const c of round.caches)if(c.harvester===id)c.harvester=null;for(const t of round.actors)if(t.rescuer===id){t.rescuer=null;t.rescueProgress=0;}}
export function stepRound(round,dt){
 if(round.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;const step=Math.min(dt,.1);round.remaining=Math.max(0,round.remaining-step);
 for(const a of round.actors){a.toolCooldowns=a.toolCooldowns.map(t=>Math.max(0,t-step));a.effectTime=Math.max(0,a.effectTime-step);a.releaseCooldown=Math.max(0,a.releaseCooldown-step);a.immune=Math.max(0,a.immune-step);if(a.caught)a.caughtTime+=step;if(a.captureRemaining>0){a.captureRemaining=Math.max(0,a.captureRemaining-step);if(a.captureRemaining<.00001)completeCapture(round,a);}}
 if(round.remaining===0)finishRound(round,'chaser','timeout');
}
