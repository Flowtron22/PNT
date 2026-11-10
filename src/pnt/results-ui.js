import {starSVG,esc} from '../ui/ui-util.js';
import {PROGRESSION} from '../menu-audio/config.js';
export function resultSummary(round){return {stolen:Math.floor(round.collected),total:round.totalMoney,protected:Math.max(0,Math.ceil(round.totalMoney-round.collected)),caught:round.actors.filter(a=>a.role==='runner'&&a.caught).length,seconds:Math.floor(300-round.remaining)};}
// Adapted the menu foundation results: star title, animated team bar, score rows, XP and staggered reveal.
export function renderResults(root,{round,won,profile,costume,players,map,sounds,onAgain,onMenu,reduced=false,online=false,couch=false,playOutcome=true}){
 if(round.mode==='diretide')return renderEventResults(root,{round,won,profile,players,map,onAgain,onMenu,online,couch});
 if(round.mode==='tiletide')return renderTileResults(root,{round,won,profile,players,map,onAgain,onMenu,online,couch});
 if(round.mode==='strikers')return renderStrikersResults(root,{round,won,profile,costume,players,map,onAgain,onMenu,couch});
 if(round.mode==='splash')return renderSplashResults(root,{round,won,profile,players,onAgain,onMenu,couch});
 if(round.mode==='balloon')return renderBalloonResults(root,{round,won,profile,players,map,onAgain,onMenu,online,couch});
 const stats=resultSummary(round),share=stats.total?stats.stolen/stats.total:0,reason=round.reason==='money'?'EVERY CACHE EMPTIED':round.reason==='captured'?'ALL THIEVES CAUGHT':'TIME UP · MONEY PROTECTED';
 root.className='dialog-screen iw-results '+(won?'is-win':'is-lose')+(reduced?'':' is-intro');
 root.style.setProperty('--ta','#ff9c27');root.style.setProperty('--tb','#5487ff');
 root.innerHTML=`<div class="iw-res__scrim"></div><header class="iw-res__head ${won?'is-win':'is-lose'}"><div class="iw-res__splat">${starSVG({seed:won?9:14,cls:'iw-fta',r:60,arms:10,drops:4})}</div><div id="result-title" class="iw-res__title">${won?'VICTORY!':'DEFEAT'}</div><div class="iw-res__meta">${esc(map.toUpperCase())} · POLICE N THIEF</div><div class="result-reason">${reason}</div></header><div class="result-hero"><div class="result-character-host"></div><span>${won?'NICE WORK!':'NEXT CHASE IS YOURS.'}</span></div><div class="iw-res__body"><section class="iw-res__cover iw-panel"><div class="iw-cover__names"><span class="ta">THIEVES <b>$${stats.stolen.toLocaleString()}</b></span><span class="tb"><b>$${stats.protected.toLocaleString()}</b> POLICE</span></div><div class="iw-cover" style="--pa:${share};--pb:${1-share}"><div class="iw-cover__a"></div><div class="iw-cover__b"></div></div><div class="result-substats">${stats.caught} / 3 THIEVES CAUGHT <span>${Math.floor(stats.seconds/60)}:${String(stats.seconds%60).padStart(2,'0')} ELAPSED</span></div></section><section class="iw-panel result-scoreboard"><div class="result-table-head"><span>PLAYER</span><span>ROLE</span><span>CASH STOLEN</span></div>${round.actors.map(a=>`<div class="iw-prow ${a.id===0?'is-self':''}"><span class="iw-prow__name">${esc(a.id===0?profile.name:players[a.id]?.name||'Bot '+a.id)}${couch?'<em>P'+(a.id+1)+'</em>':a.id===0?'<em>YOU</em>':''}</span><span>${a.role==='chaser'?'POLICE':'THIEF'}</span><b>$${Math.floor(a.money).toLocaleString()}</b></div>`).join('')}</section><section class="iw-panel result-xp"><span class="iw-lvl"><small>LV</small>${profile.level}</span><strong>+${won?PROGRESSION.xpWin:PROGRESSION.xpLose} XP</strong><span>${couch?'COUCH PLAY · P1 PROGRESS SAVED':online?'ONLINE MATCH · SAVED LOCALLY':'LOCAL PRACTICE · SAVED'}</span></section><div class="result-actions"><button id="again" class="primary">ONE MORE CHASE →</button><button id="result-menu" class="secondary">MAIN MENU</button></div></div>`;
 root.querySelector('#again').onclick=onAgain;root.querySelector('#result-menu').onclick=onMenu;
 if(playOutcome)sounds.play('judge_reveal');const id=round.profileId;
 const active=()=>!root.hidden&&root.dataset.round===id;root.dataset.round=id;
 setTimeout(()=>{if(active()&&playOutcome)sounds.play(won?'victory_fanfare':'defeat_jingle');},reduced?0:380);
 setTimeout(()=>{if(active()){root.classList.remove('is-intro');sounds.play('xp_tick');}},reduced?0:900);
}

function renderStrikersResults(root,{round,won,profile,costume,players,map,onAgain,onMenu,couch}){
 const teams=[0,1].map(team=>round.actors.filter(actor=>actor.team===team));
 const total=(team,key)=>teams[team].reduce((sum,actor)=>sum+(actor[key]||0),0);
 const possession=total(0,'possession')+total(1,'possession');
 const blueShare=possession?Math.round(total(0,'possession')/possession*100):null;
 const rows=[
  ['GOALS',round.score[0],round.score[1]],
  ['SHOTS',total(0,'shots'),total(1,'shots')],
  ['TOOLS USED',total(0,'itemsUsed'),total(1,'itemsUsed')],
  ['HAMMER STUNS',total(0,'stuns'),total(1,'stuns')],
  ['POSSESSION',blueShare===null?'—':blueShare+'%',blueShare===null?'—':(100-blueShare)+'%']
 ];
 const draw=round.winnerTeam===null;
 root.className='dialog-screen iw-results strikers-results '+(won?'is-win':'is-lose');
 root.style.setProperty('--ta','#42b9ff');root.style.setProperty('--tb','#ff5367');
 root.innerHTML=`
  <div class="iw-res__scrim"></div>
  <header class="iw-res__head ${won?'is-win':'is-lose'}">
   <div class="iw-res__splat">${starSVG({seed:won?9:14,cls:'iw-fta',r:60,arms:10,drops:4})}</div>
   <div id="result-title" class="iw-res__title">${draw?'DRAW':couch?(round.winnerTeam===0?'BLUE WINS!':'RED WINS!'):won?'VICTORY!':'DEFEAT'}</div>
  </header>
  <div class="strikers-result-scores">${(draw?[1,0]:[round.winnerTeam]).map(team=>`
   <section class="strikers-result-team team-${team}">
    <div class="strikers-result-roster"><strong>${round.winnerTeam===null?'DRAW':round.winnerTeam===team?'WINNER!':!couch&&team===round.actors[0].team?'YOUR TEAM':''}</strong>
    <div>${teams[team].map(actor=>{
     const player=players[actor.id],name=actor.id===0?profile.name:player?.name||'Player '+(actor.id+1);
     const outfit=player?.costume||(actor.id===0?costume:'thief')||'thief';
     return `<figure><div class="strikers-portrait" ${round.winnerTeam===team?`data-winner-portrait="${actor.id}"`:''}><img src="assets/pnt/portraits/${esc(outfit)}.png" alt=""></div><figcaption>${esc(name)}</figcaption></figure>`;
    }).join('')}</div></div>
    <b aria-label="${team===0?'Blue':'Red'} goals">${round.score[team]}</b>
   </section>`).join('')}</div>
  <div class="iw-res__body">
   <section class="iw-panel result-scoreboard strikers-result-stats" aria-label="Team statistics">
    <div><b>RED</b><strong>MATCH STATS</strong><b>BLUE</b></div>
    ${rows.map(([label,blue,red])=>`<div><b>${red}</b><strong>${label}</strong><b>${blue}</b></div>`).join('')}
   </section>
   <section class="iw-panel result-xp"><span class="iw-lvl"><small>LV</small>${profile.level}</span><strong>+${won?PROGRESSION.xpWin:PROGRESSION.xpLose} XP</strong></section>
   <div class="result-actions"><button id="again" class="primary">${couch?'BACK TO LOBBY':'PLAY AGAIN →'}</button><button id="result-menu" class="secondary">MAIN MENU</button></div>
  </div>`;
 root.querySelector('#again').onclick=onAgain;
 root.querySelector('#result-menu').onclick=onMenu;
}

function renderTileResults(root,{round,won,profile,players,map,onAgain,onMenu,online,couch}){
 const draw=round.winnerId===null,winner=round.winnerId,seatFor=actor=>(actor.seat??actor.id)+1,winnerSeat=draw?null:seatFor(round.actors[winner]);
 root.className='dialog-screen iw-results '+(won?'is-win':'is-lose');
 root.innerHTML=`<div class="iw-res__scrim"></div><header class="iw-res__head"><div id="result-title" class="iw-res__title">${draw?'DRAW':couch?'P'+winnerSeat+' WINS!':won?'VICTORY!':'DEFEAT'}</div><div class="iw-res__meta">TILE TUMBLE · ${esc(map.toUpperCase())}</div><div class="result-reason">${draw?'NO PLAYER SURVIVED':'P'+winnerSeat+' · LAST PLAYER STANDING'}</div></header><div class="result-hero"><div class="result-character-host"></div><span>${won?'YOU RULED THE TILES!':'THE FLOOR HAD OTHER PLANS.'}</span></div><div class="iw-res__body"><section class="iw-panel result-scoreboard"><div class="result-table-head"><span>PLAYER</span><span>STATUS</span><span>ROUNDS SAFE</span></div>${round.actors.map(a=>`<div class="iw-prow ${a.id===0?'is-self':''}"><span class="iw-prow__name">${esc(players[a.id]?.name||'Player '+seatFor(a))}<em>P${seatFor(a)}</em></span><span>${a.eliminated?'OUT':'WINNER'}</span><b>${a.survived}</b></div>`).join('')}</section><section class="iw-panel result-xp"><span class="iw-lvl"><small>LV</small>${profile.level}</span><strong>+${won?PROGRESSION.xpWin:PROGRESSION.xpLose} XP</strong><span>${online?'ONLINE':couch?'COUCH PLAY':'TRAINING'} · ${Math.floor(round.elapsed/60)}:${String(Math.floor(round.elapsed%60)).padStart(2,'0')} ELAPSED</span></section><div class="result-actions"><button id="again" class="primary">${couch?'BACK TO LOBBY':'PLAY AGAIN →'}</button><button id="result-menu" class="secondary">MAIN MENU</button></div></div>`;
 root.querySelector('#again').onclick=onAgain;root.querySelector('#result-menu').onclick=onMenu;
}

function renderBalloonResults(root,{round,won,profile,players,map,onAgain,onMenu,online,couch}){
 const draw=round.winnerId===null,winner=round.winnerId,seatFor=actor=>(actor.seat??actor.id)+1,winnerSeat=draw?null:seatFor(round.actors[winner]);
 root.className='dialog-screen iw-results '+(won?'is-win':'is-lose');
 root.innerHTML=`<div class="iw-res__scrim"></div><header class="iw-res__head"><div id="result-title" class="iw-res__title">${draw?'DRAW':couch?'P'+winnerSeat+' WINS!':won?'VICTORY!':'DEFEAT'}</div><div class="iw-res__meta">BALLOON BASH · ${esc(map.toUpperCase())}</div><div class="result-reason">${draw?'EVERY BALLOON POPPED':'P'+winnerSeat+' · LAST BALLOON STANDING'}</div></header><div class="result-hero"><div class="result-character-host"></div><span>${won?'YOUR BALLOON SURVIVED!':'USE THE FALLING SPHERES AS COVER.'}</span></div><div class="iw-res__body"><section class="iw-panel result-scoreboard"><div class="result-table-head"><span>PLAYER</span><span>STATUS</span><span>POPS</span></div>${round.actors.map(actor=>`<div class="iw-prow ${actor.id===0?'is-self':''}"><span class="iw-prow__name">${esc(players[actor.id]?.name||'Player '+seatFor(actor))}<em>P${seatFor(actor)}</em></span><span>${actor.eliminated?'POPPED':'WINNER'}</span><b>${actor.pops||0}</b></div>`).join('')}</section><section class="iw-panel result-xp"><span class="iw-lvl"><small>LV</small>${profile.level}</span><strong>+${won?PROGRESSION.xpWin:PROGRESSION.xpLose} XP</strong><span>${online?'ONLINE':couch?'COUCH PLAY':'TRAINING'} · ${Math.floor(round.elapsed/60)}:${String(Math.floor(round.elapsed%60)).padStart(2,'0')} ELAPSED</span></section><div class="result-actions"><button id="again" class="primary">${couch?'BACK TO LOBBY':'PLAY AGAIN →'}</button><button id="result-menu" class="secondary">MAIN MENU</button></div></div>`;
 root.querySelector('#again').onclick=onAgain;root.querySelector('#result-menu').onclick=onMenu;
}

function renderEventResults(root,{round,won,profile,players,map,onAgain,onMenu,online,couch}){
 const draw=round.winnerId===null,winner=round.winnerId,wellFor=id=>round.wells.find(w=>w.owner===id);
 root.className='dialog-screen iw-results '+(won?'is-win':'is-lose');
 root.innerHTML=`<div class="iw-res__scrim"></div><header class="iw-res__head"><div id="result-title" class="iw-res__title">${draw?'DRAW':couch?'P'+(winner+1)+' WINS!':won?'VICTORY!':'DEFEAT'}</div><div class="iw-res__meta">PATTY PROWL · ${esc(map.toUpperCase())}</div><div class="result-reason">${draw?'ALL WELLS DESTROYED':'P'+(winner+1)+' · LAST WELL STANDING'}</div></header><div class="result-hero"><div class="result-character-host"></div><span>${won?'YOUR WELL SURVIVED!':'PATRICS HAD THE LAST WORD.'}</span></div><div class="iw-res__body"><section class="iw-panel result-scoreboard"><div class="result-table-head"><span>PLAYER</span><span>WELL</span><span>CANDY SENT</span></div>${round.actors.map(a=>`<div class="iw-prow ${a.id===0?'is-self':''}"><span class="iw-prow__name">${esc(players[a.id]?.name||'Player '+(a.id+1))}<em>P${a.id+1}</em></span><span>${wellFor(a.id).hearts?'♥'.repeat(wellFor(a.id).hearts):'OUT'}</span><b>${Math.floor(a.deposited)}</b></div>`).join('')}</section><section class="iw-panel result-xp"><span class="iw-lvl"><small>LV</small>${profile.level}</span><strong>+${won?PROGRESSION.xpWin:PROGRESSION.xpLose} XP</strong><span>${online?'ONLINE':couch?'COUCH PLAY':'TRAINING'} · ${Math.floor(round.elapsed/60)}:${String(Math.floor(round.elapsed%60)).padStart(2,'0')} ELAPSED</span></section><div class="result-actions"><button id="again" class="primary">${couch?'BACK TO LOBBY':'PLAY AGAIN →'}</button><button id="result-menu" class="secondary">MAIN MENU</button></div></div>`;
 root.querySelector('#again').onclick=onAgain;root.querySelector('#result-menu').onclick=onMenu;
}
function renderSplashResults(root,{round,won,profile,players,onAgain,onMenu,couch}){
 const coverage=a=>100*round.paintCounts[a.paintSeat]/round.paintTotal,actors=[...round.actors].sort((a,b)=>coverage(b)-coverage(a)),draw=round.winnerId===null,winner=round.actors.find(a=>a.id===round.winnerId);
 root.className='dialog-screen iw-results '+(won?'is-win':'is-lose');
 root.innerHTML=`<div class="iw-res__scrim"></div><header class="iw-res__head"><div id="result-title" class="iw-res__title">${draw?'DRAW':couch?'P'+(winner.paintSeat+1)+' WINS!':won?'VICTORY!':'DEFEAT'}</div><div class="iw-res__meta">SPLASH AREA · TIME UP</div><div class="result-reason">${draw?'EQUAL TERRITORY':`P${winner.paintSeat+1} COVERED ${coverage(winner).toFixed(1)}%`}</div></header><div class="result-hero"><div class="result-character-host"></div><span>MOST PAINTED TURF WINS</span></div><div class="iw-res__body"><section class="iw-panel result-scoreboard"><div class="result-table-head"><span>PLAYER</span><span>SHOTS</span><span>COVERAGE</span></div>${actors.map(a=>`<div class="iw-prow ${a.id===0?'is-self':''}"><span class="iw-prow__name">${esc(players[a.id]?.name||profile.name)}<em>P${a.paintSeat+1}</em></span><span>${a.shots}</span><b>${coverage(a).toFixed(1)}%</b></div>`).join('')}</section><div class="result-actions"><button id="again" class="primary">${couch?'BACK TO LOBBY':'PLAY AGAIN →'}</button><button id="result-menu" class="secondary">MAIN MENU</button></div></div>`;
 root.querySelector('#again').onclick=onAgain;root.querySelector('#result-menu').onclick=onMenu;
}
