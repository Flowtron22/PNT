export const ROUND_SECONDS=60;
export const TAG_RADIUS=.9;
export function createRound(playerRole='runner'){
  if(!['runner','chaser'].includes(playerRole))throw new Error('Unknown role');
  return {remaining:ROUND_SECONDS,phase:'playing',winner:null,playerRole,actors:Array.from({length:4},(_,i)=>({id:i,role:(playerRole==='chaser'?i===0:i===1)?'chaser':'runner',caught:false,dash:0,cooldown:0}))};
}
export function dash(round,id){const a=round.actors[id];if(round.phase!=='playing'||!a||a.caught||a.cooldown>0)return false;a.dash=.7;a.cooldown=5;return true;}
export function tag(round,chaserId,runnerId,distance){
  const c=round.actors[chaserId],r=round.actors[runnerId];
  if(round.phase!=='playing'||c?.role!=='chaser'||r?.role!=='runner'||r.caught||!Number.isFinite(distance)||distance<0||distance>TAG_RADIUS)return false;
  r.caught=true;if(round.actors.filter(a=>a.role==='runner').every(a=>a.caught)){round.phase='finished';round.winner='chaser';}return true;
}
export function stepRound(round,dt){
  if(round.phase!=='playing')return;
  const step=Math.max(0,Math.min(dt,.1));round.remaining=Math.max(0,round.remaining-step);
  for(const a of round.actors){a.dash=Math.max(0,a.dash-step);a.cooldown=Math.max(0,a.cooldown-step);}
  if(round.remaining===0){round.phase='finished';round.winner='runner';}
}
