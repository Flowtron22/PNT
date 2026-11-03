import {WELL_HEARTS} from './diretide-rules.js';

// The supplied transparent PNG is shared by well, player and carried-total UI.
export const PICKUP_ICON_URL='assets/pnt/ui/krabbypatty.png?v=burger-093';
export const CANDY_ICON=`<img class="candy-icon" src="${PICKUP_ICON_URL}" alt="" draggable="false">`;
export function candyMarkerMarkup(well=false){return well?'<b class="well-candy-count">0</b>'+CANDY_ICON+`<span class="well-health" role="meter" aria-label="Well health" aria-valuemin="0" aria-valuemax="${WELL_HEARTS}"><span class="money-bar-fill" aria-hidden="true"></span><span class="money-bar-label" aria-hidden="true"></span></span>`:CANDY_ICON+'<b class="player-candy-count">0</b>';}

export function updateWellHealth(node,health){
 const value=String(health);
 if(node.getAttribute('aria-valuenow')===value)return;
 node.setAttribute('aria-valuenow',value);
 node.querySelector('.money-bar-fill').style.clipPath=`inset(0 ${(1-health/WELL_HEARTS)*100}% 0 0)`;
 node.querySelector('.money-bar-label').textContent=`${health} / ${WELL_HEARTS}`;
}
