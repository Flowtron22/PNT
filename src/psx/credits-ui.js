// Credits roll adapted from Wonder Wave's _scr_credits presentation.
export const creditsMarkup=()=>`<div class="studio-credits-view"><div class="studio-credits-roll"><section class="studio-credit"><h3>Developed by</h3><img class="todak-credit-logo" src="assets/psx/ui/todak-studios.png" alt="Todak Studios"><p>Todak Studios</p></section><section class="studio-credit"><img class="ureka-credit-logo" src="assets/psx/ui/ureka-games.png" alt="Ureka Games"></section></div></div>`;
let roll=null,viewport=null,y=0;
export function resetCredits(root){viewport=root.querySelector('.studio-credits-view');roll=root.querySelector('.studio-credits-roll');y=0;if(roll)roll.style.transform='translate3d(0,0,0)';}
export function tickCredits(dt,reduced=false){if(!roll||!viewport||reduced)return;y-=dt*42;const height=roll.offsetHeight;if(y < -height)y=viewport.clientHeight;roll.style.transform=`translate3d(0,${y.toFixed(1)}px,0)`;}
