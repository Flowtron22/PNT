// Adapted from Wonder Wave's core/input.js: standard mapping, radial stick
// dead zone and rising button edges. A new/reconnected pad must return to rest.
export function padStick(x=0,y=0,dz=.14,outer=.96){
 if(!Number.isFinite(x)||!Number.isFinite(y))return {x:0,z:0};
 const magnitude=Math.hypot(x,y);if(magnitude<=dz)return {x:0,z:0};
 const gain=Math.min(1,(magnitude-dz)/(outer-dz))/magnitude;return {x:x*gain,z:y*gain};
}
export function createController(device){
 let identity=null,previous=[],armed=false,pad=null,lastDirection=null,nextRepeat=0,rumbleEffect=null,rumbleIn=0;
 const empty=()=>({x:0,z:0,pressed:new Set(),held:new Set(),direction:null,connected:!!pad,id:pad?.id||''});
 function stopRumble(){if(rumbleEffect)try{pad?.vibrationActuator?.reset?.()?.catch?.(()=>{});}catch{}rumbleEffect=null;rumbleIn=0;}
 function reset(){armed=false;lastDirection=null;nextRepeat=0;stopRumble();}
 function poll(now){
  let pads=[];try{pads=device.getGamepads?.()||[];}catch{}
  const next=Array.from(pads).find(p=>p?.connected&&p.mapping==='standard'&&p.index===pad?.index)||Array.from(pads).find(p=>p?.connected&&p.mapping==='standard')||null;
  const key=next?next.index+':'+next.id:null;
  if(key!==identity){stopRumble();pad=next;identity=key;previous=[];reset();}else pad=next;
  const result=empty();if(!pad)return result;
  const held=new Set();pad.buttons.forEach((b,i)=>{if(b?.pressed||b?.value>.55)held.add(i);});
  const stick=padStick(pad.axes[0],pad.axes[1]);
  if(!armed){previous=[...held];if(!held.size&&Math.hypot(stick.x,stick.z)<.01)armed=true;return result;}
  result.held=held;result.pressed=new Set([...held].filter(i=>!previous.includes(i)));previous=[...held];
  result.x=(held.has(15)?1:0)-(held.has(14)?1:0);result.z=(held.has(13)?1:0)-(held.has(12)?1:0);
  if(!result.x&&!result.z){result.x=stick.x;result.z=stick.z;}const length=Math.max(1,Math.hypot(result.x,result.z));result.x/=length;result.z/=length;
  const direction=Math.abs(result.x)>.5||Math.abs(result.z)>.5?(Math.abs(result.x)>Math.abs(result.z)?result.x>0?'right':'left':result.z>0?'down':'up'):null;
  if(direction!==lastDirection){lastDirection=direction;nextRepeat=now+330;result.direction=direction;}
  else if(direction&&now>=nextRepeat){nextRepeat=now+130;result.direction=direction;}
  return result;
 }
 function rumble(effect,dt,active,enabled){
  const kind=active&&enabled&&['rocket','banana'].includes(effect)?effect:null;
  if(!kind){stopRumble();return;}rumbleIn-=dt;if(kind===rumbleEffect&&rumbleIn>0)return;
  rumbleEffect=kind;rumbleIn=.45;try{pad?.vibrationActuator?.playEffect?.('dual-rumble',{duration:150,startDelay:0,strongMagnitude:kind==='rocket'?.22:.4,weakMagnitude:.25})?.catch?.(()=>{});}catch{}
 }
 return {poll,reset,rumble,get supported(){return typeof device.getGamepads==='function';}};
}

// Menu navigation uses real focus/click and native form values; no synthetic keys.
export function controllerMenu(doc,command){
 const modal=doc.querySelector('#room-help:not([hidden])');
 const scope=modal||['pause','results','lobby','menu'].map(id=>doc.getElementById(id)).find(el=>el&&!el.hidden);if(!scope)return;
 const items=[...scope.querySelectorAll('button,input,select,a[href]')].filter(el=>!el.disabled&&!el.closest('[hidden]')&&el.getClientRects().length);
 let current=items.includes(doc.activeElement)?doc.activeElement:null;
 const focus=el=>{if(!el)return;for(const old of doc.querySelectorAll?.('.pad-focus')||[])old.classList.remove('pad-focus');el.classList?.add('pad-focus');el?.focus({preventScroll:true});el?.scrollIntoView({block:'nearest',inline:'nearest'});};
 if(command==='tabLeft'||command==='tabRight'){const tabs=[...scope.querySelectorAll('[role=tab]')];if(!tabs.length)return;const index=tabs.findIndex(el=>el.getAttribute('aria-selected')==='true'),next=tabs[(index+(command==='tabRight'?1:-1)+tabs.length)%tabs.length];next.click();focus(next);return;}
 if(!current){focus(items[0]);return;}
 if(command==='accept'){
  if(current.matches('input[type=range],select'))return;
  if(current.matches('input:not([type=checkbox])'))return;
  current.click();return;
 }
 if((command==='left'||command==='right')&&current.matches('input[type=range],select')){
  const sign=command==='right'?1:-1;
  if(current.matches('select')){const index=Math.min(current.options.length-1,Math.max(0,current.selectedIndex+sign));if(index===current.selectedIndex)return;current.selectedIndex=index;current.dispatchEvent(new Event('change',{bubbles:true}));}
  else{const value=Math.max(+current.min,Math.min(+current.max,+current.value+sign*(+current.step||1)));current.value=String(value);current.dispatchEvent(new Event('input',{bubbles:true}));}return;
 }
 const r=current.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let next=null,best=Infinity;
 for(const el of items){if(el===current)continue;const b=el.getBoundingClientRect(),dx=b.left+b.width/2-cx,dy=b.top+b.height/2-cy,vertical=command==='up'||command==='down',distance=(vertical?dy:dx)*(['up','left'].includes(command)?-1:1);if(distance<8)continue;const score=distance+Math.abs(vertical?dx:dy)*2;if(score<best){best=score;next=el;}}
 focus(next);
}
