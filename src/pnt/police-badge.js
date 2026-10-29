// Animate the supplied sheet's seven glowing P frames. Its grid lines and
// pressed-switch/reference row stay outside the visible crop.
export const POLICE_BADGE={frames:7,fps:9,stride:85,x:1,y:94,width:84,height:92};
export function policeBadgeFrame(seconds,reduced=false){return reduced?0:Math.floor(Math.max(0,Number.isFinite(seconds)?seconds:0)*POLICE_BADGE.fps)%POLICE_BADGE.frames;}
export function policeBadgeMarkup(){return '<span class="police-badge-art"><img src="assets/pnt/ui/police-badge-sheet.png" width="596" height="187" alt="Police" draggable="false"></span>';}
export function updatePoliceBadge(node,seconds,reduced=false){const frame=policeBadgeFrame(seconds,reduced);if(node.dataset.frame===String(frame))return;node.dataset.frame=String(frame);node.querySelector('img').style.transform=`translate(${-POLICE_BADGE.x-frame*POLICE_BADGE.stride}px,${-POLICE_BADGE.y}px)`;}
