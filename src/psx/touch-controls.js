// Each finger owns its pointer independently. Gameplay never waits for a synthetic click.
export function bindGameControls({root,joystick,knob,actions,isActive,onMove}){
 let movementId=null;const pressed=new Map(),gameTouches=new Set(),cleanups=[];
 const on=(node,type,fn,options)=>{node.addEventListener(type,fn,options);cleanups.push(()=>node.removeEventListener(type,fn,options));};
 const prevent=e=>{if(e.cancelable)e.preventDefault();};
 function move(e){const r=joystick.getBoundingClientRect(),radius=r.width*.34;let x=(e.clientX-r.left-r.width/2)/radius,z=-(e.clientY-r.top-r.height/2)/radius;const length=Math.max(1,Math.hypot(x,z));x/=length;z/=length;onMove(x,z);knob.style.transform=`translate(${x*radius}px,${-z*radius}px)`;}
 function reset(){movementId=null;onMove(0,0);knob.style.transform='';for(const item of pressed.values()){item.button.classList.remove('is-touch-down');item.release?.();}pressed.clear();}
 on(joystick,'pointerdown',e=>{if(!isActive()||movementId!==null||(e.pointerType==='mouse'&&e.button!==0))return;prevent(e);movementId=e.pointerId;joystick.setPointerCapture?.(e.pointerId);move(e);});
 on(joystick,'pointermove',e=>{if(e.pointerId!==movementId)return;prevent(e);if(isActive())move(e);else reset();});
 for(const [button,activate,release] of actions){
  on(button,'pointerdown',e=>{if(!isActive()||button.disabled||(e.pointerType==='mouse'&&e.button!==0))return;prevent(e);pressed.set(e.pointerId,{button,release});button.classList.add('is-touch-down');activate();});
  on(button,'click',e=>{prevent(e);if(e.detail===0&&!e.pointerType&&isActive()&&!button.disabled){activate();release?.();}});
 }
 function release(e){const item=pressed.get(e.pointerId);item?.button.classList.remove('is-touch-down');item?.release?.();pressed.delete(e.pointerId);if(e.pointerId===movementId){movementId=null;onMove(0,0);knob.style.transform='';}}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])on(root,type,release,true);
 // Safari can still recognize a two-finger pinch / double-tap despite CSS touch-action.
 // Track touches that began in the match, so a pause mid-gesture cannot leak its touchend.
 on(root,'touchstart',e=>{if(isActive()){for(const t of e.changedTouches)gameTouches.add(t.identifier);prevent(e);}},{capture:true,passive:false});
 on(root,'touchmove',e=>{if(isActive()||[...e.changedTouches].some(t=>gameTouches.has(t.identifier)))prevent(e);},{capture:true,passive:false});
 for(const type of ['touchend','touchcancel'])on(root,type,e=>{if(isActive()||[...e.changedTouches].some(t=>gameTouches.has(t.identifier)))prevent(e);for(const t of e.changedTouches)gameTouches.delete(t.identifier);},{capture:true,passive:false});
 on(root,'gesturestart',e=>{if(isActive())prevent(e);},{capture:true,passive:false});
 on(root,'gesturechange',e=>{if(isActive())prevent(e);},{capture:true,passive:false});
 on(root,'contextmenu',e=>{if(isActive())prevent(e);});
 return {reset,dispose(){reset();for(const cleanup of cleanups)cleanup();gameTouches.clear();}};
}
