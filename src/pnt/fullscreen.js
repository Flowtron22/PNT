export function fullscreenMode(doc,win){
 if(win.navigator.standalone||win.matchMedia('(display-mode: standalone)').matches||win.matchMedia('(display-mode: fullscreen)').matches)return 'standalone';
 return (doc.fullscreenEnabled&&typeof doc.documentElement.requestFullscreen==='function')||(doc.webkitFullscreenEnabled&&typeof doc.documentElement.webkitRequestFullscreen==='function')?'native':'unsupported';
}
export function configureFullscreen(button,status,doc=document,win=window){
 const active=doc.fullscreenElement||doc.webkitFullscreenElement;
 button.disabled=false;button.textContent=active?'EXIT FULLSCREEN':'TOGGLE FULLSCREEN';status.textContent='';status.hidden=true;
 button.onclick=async()=>{
  if(fullscreenMode(doc,win)!=='native')return;
  try{if(active){if(doc.exitFullscreen)await doc.exitFullscreen();else await doc.webkitExitFullscreen();}else{const el=doc.documentElement;if(el.requestFullscreen)await el.requestFullscreen();else await el.webkitRequestFullscreen();}configureFullscreen(button,status,doc,win);}catch{}
 };
}
