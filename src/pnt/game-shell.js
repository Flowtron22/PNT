import {DESIGN_WIDTH,DESIGN_HEIGHT,fitGameViewport} from './viewport.js';
import {configureLandscape} from './landscape.js';

const stage=document.getElementById('game-stage'),frame=document.getElementById('game-frame');
let fit={scale:1},landscape=null;
function notify(){
 const child=frame.contentWindow;if(!child)return;
 try{child.dispatchEvent(new child.Event('pnt-viewport'));}catch{}
}
window.pntFrame={get scale(){return fit.scale;},get blocked(){return landscape?.blocked||false;},requestLandscape:()=>landscape?.attempt()};
function resize(){
 const rect=stage.getBoundingClientRect();fit=fitGameViewport(Math.min(rect.width,window.visualViewport?.width||rect.width),Math.min(rect.height,window.visualViewport?.height||rect.height));
 Object.assign(frame.style,{width:DESIGN_WIDTH+'px',height:DESIGN_HEIGHT+'px',left:fit.x+'px',top:fit.y+'px',transform:`scale(${fit.scale})`});notify();
}
landscape=configureLandscape({onChange:notify});
document.addEventListener('fullscreenchange',notify);document.addEventListener('webkitfullscreenchange',notify);
new ResizeObserver(resize).observe(stage);window.visualViewport?.addEventListener('resize',resize);
frame.addEventListener('load',()=>{resize();frame.contentWindow?.focus();});resize();
