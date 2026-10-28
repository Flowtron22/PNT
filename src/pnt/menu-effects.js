// Adapted from the menu foundation menus.js (_fx, _setFocus, _spatial, _updateCursor).
// Spring, cursor tuning, tilt strengths and feedback timing retain their source values.
import {Spring,starSVG,restartAnim} from '../ui/ui-util.js';
import {createUISounds} from './ui-sounds.js';
export function createWonderUI({blocked=()=>false,reduced=()=>false}={}){
 const sounds=createUISounds(),cursor=document.createElement('div');cursor.className='iw-cursor';cursor.setAttribute('aria-hidden','true');cursor.innerHTML='<i class="iw-cursor__ring"></i><i class="iw-cursor__glow"></i>';document.body.append(cursor);
 const springs=Object.fromEntries(['x','y','w','h'].map(k=>[k,new Spring(0,560,34)]));
 let focus=null,mode='pointer',point=null,on=false,snap=true,focusKey=null,lastFocus=0;
 const scopes=['#menu','#lobby','#pause','#results'];
 const own=el=>el.matches('.wardrobe-grid .choice,.tool-catalog .choice');
 function eligible(el){return !!(el&&el.matches('button')&&!el.disabled&&!el.closest('[hidden],#hud,#loading')&&el.getClientRects().length&&(!document.querySelector('#room-help:not([hidden])')||el.closest('#room-help')));}
 function key(el){if(el.id)return '#'+CSS.escape(el.id);const scope=el.closest('.wardrobe-grid')?'.wardrobe-grid':el.closest('#tool-catalog')?'#tool-catalog':null;return scope&&el.dataset.choice?scope+' [data-choice="'+CSS.escape(el.dataset.choice)+'"]':null;}
 function setFocus(el,sound=false){
  if(!eligible(el)||blocked())el=null;if(el===focus)return;
  focus?.classList.remove('is-focus');focus=el;focusKey=el?key(el):null;
  if(el){el.classList.add('is-focus');if(sound)sounds.play('ui_hover');if(!on)snap=performance.now()-lastFocus>250;}else{cursor.classList.remove('is-on');on=false;lastFocus=performance.now();}
 }
 function pointer(el,event){
  const r=el.getBoundingClientRect(),x=Math.max(0,Math.min(1,(event.clientX-r.left)/Math.max(1,r.width))),y=Math.max(0,Math.min(1,(event.clientY-r.top)/Math.max(1,r.height)));
  el.style.setProperty('--mx',`${(x*100).toFixed(1)}%`);el.style.setProperty('--my',`${(y*100).toFixed(1)}%`);
  const tilt=Number(el.dataset.wwTilt||0);if(tilt){el.style.setProperty('--rx',((.5-y)*tilt).toFixed(2)+'deg');el.style.setProperty('--ry',((x-.5)*tilt).toFixed(2)+'deg');el.style.setProperty('--px',(x-.5).toFixed(3));el.style.setProperty('--py',(y-.5).toFixed(3));}
 }
 function bind(){
  for(const scope of scopes)for(const el of document.querySelectorAll(scope+' button')){
   if(el.dataset.wwBound)continue;el.dataset.wwBound='true';
   if(el.matches('.nav-button')){el.classList.add('iw-btn');const ink=document.createElement('span');ink.className='iw-btn__blob';ink.setAttribute('aria-hidden','true');el.prepend(ink);}
   if(own(el)){
    el.classList.add('iw-ltile');el.dataset.cur='own';el.dataset.wwTilt=el.closest('.wardrobe-grid')?'12':'14';
    const blob=document.createElement('span');blob.className='iw-ltile__blob';blob.setAttribute('aria-hidden','true');blob.innerHTML=starSVG({seed:90+Array.from(el.parentElement.children).indexOf(el)*7,cls:'iw-fa',r:58,arms:8,drops:0});
    const check=document.createElement('span');check.className='iw-ltile__eq';check.setAttribute('aria-hidden','true');check.textContent='✓';el.prepend(blob);el.append(check);
   }
   el.addEventListener('animationend',event=>{if(event.target===el&&event.animationName==='iw-press')el.classList.remove('is-press');});
  }
  for(const el of document.querySelectorAll('.iw-ltile'))el.classList.toggle('is-on',el.closest('.tool-catalog')?el.querySelector('small')?.textContent.startsWith('SLOT '):el.getAttribute('aria-pressed')==='true');
  if(focus&&!eligible(focus)){
   const savedKey=focusKey;setFocus(null);const next=mode==='pointer'&&point?document.elementFromPoint(point.x,point.y)?.closest('button'):savedKey?document.querySelector(savedKey):null;
   if(eligible(next)){setFocus(next);if(mode==='keyboard')next.focus({preventScroll:true});}
  }
 }
 const observer=new MutationObserver(bind);for(const selector of scopes){const root=document.querySelector(selector);if(root)observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','aria-pressed']});}bind();
 document.addEventListener('pointerover',event=>{
  if(event.pointerType==='touch')return;const el=event.target.closest('button');if(!eligible(el))return;mode='pointer';point={x:event.clientX,y:event.clientY};pointer(el,event);el.classList.add('is-hover');setFocus(el,true);
 });
 document.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;mode='pointer';point={x:event.clientX,y:event.clientY};const el=event.target.closest('button');if(eligible(el)){pointer(el,event);setFocus(el,true);}else setFocus(null);},{passive:true});
 document.addEventListener('pointerout',event=>{const el=event.target.closest('button');if(!el||el.contains(event.relatedTarget))return;el.classList.remove('is-hover','is-down');for(const property of ['--rx','--ry'])el.style.setProperty(property,'0deg');for(const property of ['--px','--py'])el.style.setProperty(property,'0');if(focus===el&&mode==='pointer')setFocus(null);},{passive:true});
 document.addEventListener('pointerdown',event=>{sounds.unlock();if(blocked())return;mode='pointer';const el=event.target.closest('button');if(eligible(el)){el.classList.add('is-down');if(event.pointerType!=='touch')setFocus(el);}},true);
 const release=()=>{for(const el of document.querySelectorAll('.is-down'))el.classList.remove('is-down');};document.addEventListener('pointerup',release,true);document.addEventListener('pointercancel',release,true);
 document.addEventListener('change',event=>{if(!blocked()&&event.target.matches('#menu select,#lobby select'))sounds.play('ui_toggle');});
 document.addEventListener('focusin',event=>{if(mode==='keyboard')setFocus(event.target.closest('button'),true);});
 document.addEventListener('click',event=>{
  const el=event.target.closest('button');if(!eligible(el)||blocked())return;
  let sound='ui_click';if(el.matches('.back-button,#quit-lobby,#leave,#result-menu,#cancel-countdown,#cancel-profile-name'))sound='ui_back';else if(el.matches('[data-page="play"],#training,.primary,#host-lobby,#start-lobby,.wardrobe-grid .choice,[id^="equip-slot"]'))sound='ui_confirm';else if(el.matches('#role-preference,#add-bot,#remove-bot'))sound='ui_toggle';
  sounds.play(sound);if(!reduced())restartAnim(el,'is-press');
 },true);
 document.addEventListener('keydown',event=>{
  if(event.repeat)return;sounds.unlock();if(blocked()||event.target.matches('input,select,textarea,[contenteditable]'))return;
  mode='keyboard';if(event.code==='Tab')return;
  const directions={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'},dir=directions[event.code];if(!dir)return;
  const candidates=[...document.querySelectorAll(scopes.map(s=>s+' button').join(','))].filter(eligible);if(!candidates.length)return;event.preventDefault();
  const from=eligible(document.activeElement)?document.activeElement:focus;
  if(!from){candidates[0].focus();return;}
  const fr=from.getBoundingClientRect(),fcx=fr.left+fr.width/2,fcy=fr.top+fr.height/2;let next=null,best=Infinity;
  for(const c of candidates){if(c===from)continue;const r=c.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let primary,ortho;
   if(dir==='down'||dir==='up'){primary=dir==='down'?cy-fcy:fcy-cy;if(primary<Math.min(fr.height,r.height)*.3)continue;ortho=Math.max(0,Math.max(fr.left,r.left)-Math.min(fr.right,r.right));}
   else{primary=dir==='right'?cx-fcx:fcx-cx;if(primary<Math.min(fr.width,r.width)*.3)continue;ortho=Math.max(0,Math.max(fr.top,r.top)-Math.min(fr.bottom,r.bottom));}
   const score=primary+ortho*3+Math.abs(dir==='down'||dir==='up'?cx-fcx:cy-fcy)*.15;if(score<best){best=score;next=c;}
  }
  if(next){next.style.setProperty('--mx',dir==='left'?'100%':dir==='right'?'0%':'50%');next.style.setProperty('--my',dir==='up'?'100%':dir==='down'?'0%':'50%');next.focus();}
 });
 addEventListener('blur',()=>{release();setFocus(null);});
 return {sounds,tick(dt){
  if(blocked()||!eligible(focus)){setFocus(null);return;}
  if(focus.dataset.cur==='own'){cursor.classList.remove('is-on');on=false;snap=true;return;}
  const r=focus.getBoundingClientRect(),pad=7,values={x:r.left-pad,y:r.top-pad,w:r.width+pad*2,h:r.height+pad*2};
  for(const [name,value]of Object.entries(values)){springs[name].target=value;if(snap||reduced())springs[name].snap(value);else springs[name].step(dt);}
  const style=cursor.style;style.transform=`translate3d(${springs.x.x.toFixed(1)}px,${springs.y.x.toFixed(1)}px,0)`;style.width=Math.max(0,springs.w.x).toFixed(1)+'px';style.height=Math.max(0,springs.h.x).toFixed(1)+'px';style.borderRadius=(Math.round(parseFloat(getComputedStyle(focus).borderTopLeftRadius)||0)+pad)+'px';cursor.classList.add('is-on');on=true;snap=false;
 }};
}
