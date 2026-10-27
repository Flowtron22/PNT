export function phoneNeedsLandscape(win){return win.matchMedia('(pointer: coarse)').matches&&Math.min(win.screen?.width||win.innerWidth,win.screen?.height||win.innerHeight)<760&&win.innerWidth<win.innerHeight;}
export async function lockPhoneLandscape(doc,win){
 if(typeof win.screen?.orientation?.lock!=='function')return false;
 try{if(!doc.fullscreenElement&&doc.documentElement.requestFullscreen)await doc.documentElement.requestFullscreen({navigationUI:'hide'});await win.screen.orientation.lock('landscape');return true;}catch{return false;}
}
export function configureLandscape({onChange=()=>{},doc=document,win=window}={}){
 const overlay=doc.createElement('section');overlay.id='phone-landscape';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Landscape view');
 overlay.innerHTML='<div><span class="rotate-phone-icon" aria-hidden="true">▯ ↶</span><h2>TURN YOUR PHONE</h2><p>The chase plays in landscape.</p><button class="primary">ENTER LANDSCAPE</button></div>';doc.body.append(overlay);
 const button=overlay.querySelector('button');button.hidden=typeof win.screen?.orientation?.lock!=='function';let blocked=false,attempted=false;
 function update(){const next=phoneNeedsLandscape(win);overlay.hidden=!next;doc.body.classList.toggle('landscape-required',next);if(next!==blocked){blocked=next;onChange(blocked);}}
 async function attempt(){if(attempted||!win.matchMedia('(pointer: coarse)').matches||Math.min(win.screen?.width||win.innerWidth,win.screen?.height||win.innerHeight)>=760)return;attempted=true;await lockPhoneLandscape(doc,win);update();}
 button.onclick=()=>{attempted=false;void attempt();};doc.addEventListener('pointerup',attempt,{capture:true});win.addEventListener('resize',update);win.screen?.orientation?.addEventListener('change',update);doc.addEventListener('fullscreenchange',()=>{if(!doc.fullscreenElement)attempted=false;update();});update();
 return {get blocked(){return blocked;}};
}
