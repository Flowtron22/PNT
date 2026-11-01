// The supplied transparent PNG is shared by well, player and carried-total UI.
export const PICKUP_ICON_URL='assets/pnt/ui/krabbypatty.png?v=burger-093';
export const CANDY_ICON=`<img class="candy-icon" src="${PICKUP_ICON_URL}" alt="" draggable="false">`;
export function candyMarkerMarkup(well=false){return well?'<b class="well-candy-count">0</b>'+CANDY_ICON+'<small class="well-hearts"></small>':CANDY_ICON+'<b class="player-candy-count">0</b>';}
