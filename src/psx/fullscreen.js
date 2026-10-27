export function fullscreenMode(doc,win){
 if(win.navigator.standalone||win.matchMedia('(display-mode: standalone)').matches||win.matchMedia('(display-mode: fullscreen)').matches)return 'standalone';
 if((doc.fullscreenEnabled&&typeof doc.documentElement.requestFullscreen==='function')||(doc.webkitFullscreenEnabled&&typeof doc.documentElement.webkitRequestFullscreen==='function'))return 'native';
 return /iPhone|iPad|iPod/.test(win.navigator.userAgent)||(win.navigator.platform==='MacIntel'&&win.navigator.maxTouchPoints>1)?'install':'unsupported';
}
export function configureFullscreen(button,status,doc=document,win=window){
 const mode=fullscreenMode(doc,win),active=doc.fullscreenElement||doc.webkitFullscreenElement;
 button.disabled=mode==='standalone';
 button.textContent=mode==='standalone'?'ALREADY IN APP MODE':mode==='native'?(active?'EXIT FULLSCREEN':'ENTER FULLSCREEN'):mode==='install'?'HOW TO PLAY FULL SCREEN':'FULLSCREEN HELP';
 const install='On iPhone: open this game in Safari, tap Share → Add to Home Screen, then open the new icon. If “Open as Web App” appears, leave it on. This opens the game without Safari’s address bar.';
 status.textContent=mode==='install'?install:mode==='standalone'?'You opened the game as a Home Screen app.':mode==='unsupported'?'This browser does not offer game fullscreen. Try its app-install or full-screen option.':'';
 button.onclick=async()=>{
  if(mode!=='native'){status.textContent=mode==='install'?install:'This browser does not offer game fullscreen. Try its app-install or full-screen option.';return;}
  try{if(active){await (doc.exitFullscreen?.()??doc.webkitExitFullscreen?.());}else{const el=doc.documentElement;await (el.requestFullscreen?el.requestFullscreen():el.webkitRequestFullscreen());}configureFullscreen(button,status,doc,win);}
  catch{status.textContent='Fullscreen was blocked by your browser. On iPhone, use Safari → Share → Add to Home Screen.';}
 };
}
