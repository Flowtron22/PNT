import {starSVG} from '../ui/ui-util.js';
export function roundStartBeat(value){const n=Math.max(0,Math.ceil(value||0));return n===4?'ready':n===0?'go':String(n);}
// Adapted from wonder-wave's iw-lcd launch sticker: rotating rays, star and
// oversized spring beat, shown over the loaded arena instead of the lobby.
export function createRoundStart(root,onBeat=()=>{}){
 const element=document.createElement('div');element.className='round-start';element.hidden=true;element.setAttribute('role','status');element.setAttribute('aria-live','polite');element.innerHTML=`<i class="round-start-rays"></i><span class="round-start-star">${starSVG({fill:'#ff961f',r:48})}</span><strong></strong><small>GET READY</small>`;root.append(element);const number=element.querySelector('strong'),subtitle=element.querySelector('small');let match=null,last=null,seen=false,goTime=0;
 return {update(round,dt){if(!round||match!==round.profileId){match=round?.profileId;last=null;seen=false;goTime=0;element.hidden=true;}if(!round)return;const n=Math.ceil(round.startRemaining||0);if(n>0)seen=true;if(!seen)return;if(n!==last){last=n;const ready=n===4,go=n===0;number.textContent=ready?'READY':go?'GO!':String(n);subtitle.textContent=ready?'GET SET':go?'START THE CHASE':'GET READY';element.classList.toggle('is-go',go);element.classList.remove('is-beat');void element.offsetWidth;element.classList.add('is-beat');element.hidden=false;goTime=go ? .7 : 0;onBeat(roundStartBeat(n));}if(n===0){goTime-=Math.min(.1,dt);if(goTime<=0){element.hidden=true;seen=false;}}}};
}
