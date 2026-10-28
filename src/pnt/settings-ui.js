const percent=v=>Math.round(v*100)+'%';
export const SETTINGS_TABS=[
 {id:'controls',label:'Controls',icon:'✥',rows:[
  {key:'joystickSize',label:'Joystick size',min:.8,max:1.5,step:.05,format:percent,help:'Resize the thumb control. Touch anywhere on the left half to start moving.'},
  {key:'joystickSensitivity',label:'Joystick sensitivity',min:.5,max:1.5,step:.05,format:v=>v.toFixed(2)+'×',help:'Higher reaches full movement with a shorter thumb drag. Maximum running speed stays the same.'},
  {key:'haptics',label:'Vibration',toggle:true,help:'Feedback for rocket and banana effects, when supported by your browser.'},
  {key:'bindings',label:'Key mapping',action:true,help:'Choose the keyboard controls that feel comfortable for you.'}
 ]},
 {id:'video',label:'Video',icon:'▣',rows:[
  {key:'quality',label:'Graphics quality',options:[['battery','Battery'],['balanced','Balanced']],help:'Battery lowers rendering resolution to reduce GPU work. Balanced keeps a sharper image.'},
  {key:'fpsCap',label:'Frame rate limit',options:[[0,'Max'],[60,'60'],[30,'30']],help:'Limit rendering to save battery. Movement and networking continue independently.'},
  {key:'showFps',label:'Show FPS',toggle:true,help:'Show measured rendered frames per second during a match.'},
  {key:'fullscreen',label:'Fullscreen',action:true,help:'Fill the display when your browser supports fullscreen.'}
 ]},
 {id:'audio',label:'Audio',icon:'♫',rows:[
  {key:'master',label:'Master volume',min:0,max:1,step:.05,format:percent,help:'Adjust all music, gameplay sounds and menu sounds together.'},
  {key:'music',label:'Music volume',min:0,max:1,step:.05,format:percent,help:'Menu, lobby and each map’s soundtrack.'},
  {key:'sfx',label:'Sound effects',min:0,max:1,step:.05,format:percent,help:'Tools, footsteps, capture cues and the announcer.'},
  {key:'uiSounds',label:'Menu sounds',toggle:true,help:'Sounds when selecting and navigating menus.'}
 ]},
 {id:'gameplay',label:'Gameplay',icon:'★',rows:[
  {key:'cameraShake',label:'Camera shake',min:0,max:1,step:.05,format:percent,help:'Scale impact shake without changing tool power or game rules.'},
  {key:'reducedMotion',label:'Reduced motion',toggle:true,help:'Reduce decorative motion, coin trails and camera shake.'},
  {key:'hudScale',label:'HUD size',min:.7,max:1.3,step:.05,format:percent,help:'Resize the timer, money counter and crew portraits. Action buttons keep their touch size.'}
 ]}
];
export function mountSettings(root,{getSettings,onChange,onReset,bindingsMarkup,onBindings,onCloseBindings=()=>{},hapticsSupported,onFullscreen}){
 const doc=root.ownerDocument;let tab=0,resetArmed=false;
 root.innerHTML=`<div class="settings-shell"><div class="settings-panel"><div class="settings-tabs" role="tablist" aria-label="Settings categories"></div><div class="settings-rows" role="tabpanel" id="settings-options"></div><div class="settings-foot"><span id="settings-saved" role="status">Changes save automatically</span><button type="button" id="settings-reset">RESET TO DEFAULTS</button></div></div><aside class="settings-preview"><div class="settings-preview-top"><span>LIVE PREVIEW</span><output></output></div><h2></h2><div class="settings-demo" aria-hidden="true"></div><p></p></aside></div>`;
 const tabs=root.querySelector('.settings-tabs'),rows=root.querySelector('.settings-rows'),card=root.querySelector('.settings-preview'),demo=card.querySelector('.settings-demo'),saved=root.querySelector('#settings-saved');
 const valueLabel=(r,v)=>r.toggle?(v?'ON':'OFF'):r.format?r.format(v):r.options?.find(([key])=>key===v)?.[1]||'';
 function preview(r){const s=getSettings(),v=s[r.key];card.querySelector('h2').textContent=r.label;card.querySelector('p').textContent=r.help;card.querySelector('output').textContent=valueLabel(r,v);demo.dataset.preview=r.key;demo.classList.toggle('quiet',s.reducedMotion);demo.style.setProperty('--strength',s.cameraShake);demo.style.setProperty('--joy-size',s.joystickSize);demo.style.setProperty('--sensitivity',s.joystickSensitivity);demo.style.setProperty('--hud-size',s.hudScale);demo.style.setProperty('--level',`${(r.key==='music'||r.key==='sfx'?s.master*s[r.key]:s.master)*100}%`);
  const joystick=['joystickSize','joystickSensitivity'].includes(r.key),hud=['hudScale','showFps','fpsCap'].includes(r.key),audio=['master','music','sfx','uiSounds'].includes(r.key);
  demo.innerHTML=joystick?'<div class="preview-joystick"><i></i></div><small>LEFT THUMB · DRAG TO MOVE</small>':hud?`<div class="preview-hud"><b>2:45</b><span>💰 1,250</span><small>${s.showFps?'60 FPS':'THIEF · FREE'}</small></div>`:audio?'<div class="preview-audio"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><small>MUSIC & SOUND</small>':r.key==='quality'?`<img class="preview-map ${v==='battery'?'battery':''}" src="assets/pnt/maps/mall.webp" alt=""><small>${valueLabel(r,v).toUpperCase()}</small>`:r.key==='bindings'?'<div class="preview-keys"><kbd>↑</kbd><span><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span></div>':r.key==='haptics'?'<div class="preview-symbol">⌁</div><small>VIBRATION FEEDBACK</small>':r.key==='fullscreen'?'<div class="preview-symbol">⛶</div>':'<div class="preview-impact">★</div><small>IMPACT & MOTION</small>';
 }
 function build(){const t=SETTINGS_TABS[tab];rows.replaceChildren();rows.setAttribute('aria-labelledby','settings-tab-'+t.id);
  for(const r of t.rows){const row=doc.createElement('div');row.className='settings-option';row.innerHTML=`<label>${r.label}</label><div class="settings-control"></div>`;const host=row.lastElementChild,label=row.firstElementChild;let control;
   if(r.action){control=doc.createElement('button');control.type='button';control.textContent=r.key==='bindings'?'EDIT KEYS':'ENTER';control.onclick=()=>{preview(r);if(r.key==='bindings'){const section=rows.querySelector('.settings-bindings');section.hidden=!section.hidden;if(section.hidden)onCloseBindings();control.setAttribute('aria-expanded',String(!section.hidden));}else onFullscreen(control,rows.querySelector('#fullscreen-status'));};if(r.key==='bindings'){control.setAttribute('aria-expanded','false');control.setAttribute('aria-controls','settings-bindings');}}
   else if(r.options){control=doc.createElement('select');for(const [v,text]of r.options){const o=doc.createElement('option');o.value=v;o.textContent=text;control.append(o);}control.value=String(getSettings()[r.key]);}
   else{control=doc.createElement('input');control.type=r.toggle?'checkbox':'range';if(r.toggle){control.checked=getSettings()[r.key];control.setAttribute('role','switch');}else{control.min=r.min;control.max=r.max;control.step=r.step;control.value=getSettings()[r.key];const output=doc.createElement('output');output.textContent=valueLabel(r,+control.value);host.append(output);}}
   control.id='setting-'+r.key;label.htmlFor=control.id;host.append(control);row.addEventListener('focusin',()=>preview(r));row.addEventListener('pointerenter',()=>preview(r));row.addEventListener('pointerdown',()=>preview(r));
   if(r.key==='haptics'&&!hapticsSupported){control.disabled=true;label.append(doc.createElement('small'));label.lastChild.textContent='Unavailable in this browser';}
   if(!r.action)control.addEventListener(r.toggle||r.options?'change':'input',()=>{const value=r.toggle?control.checked:r.options&&r.key==='quality'?control.value:+control.value;const persisted=onChange(r.key,value);saved.textContent=persisted===false?'Applied · browser storage unavailable':'Saved automatically ✓';if(host.querySelector('output'))host.querySelector('output').textContent=valueLabel(r,value);preview(r);});
   rows.append(row);
  }
  if(t.id==='controls'){const section=doc.createElement('section');section.className='settings-bindings key-mapping';section.id='settings-bindings';section.hidden=true;section.innerHTML=bindingsMarkup;rows.append(section);onBindings();}
  if(t.id==='video'){const status=doc.createElement('p');status.id='fullscreen-status';status.className='fullscreen-help';status.setAttribute('role','status');rows.append(status);onFullscreen(rows.querySelector('#setting-fullscreen'),status);}
  preview(t.rows[0]);
 }
 SETTINGS_TABS.forEach((t,i)=>{const b=doc.createElement('button');b.id='settings-tab-'+t.id;b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-controls','settings-options');b.innerHTML=`<i aria-hidden="true">${t.icon}</i>${t.label}`;b.onclick=()=>{tab=i;select();};b.onkeydown=e=>{let n=i;if(e.key==='ArrowRight')n=(i+1)%4;else if(e.key==='ArrowLeft')n=(i+3)%4;else if(e.key==='Home')n=0;else if(e.key==='End')n=3;else return;e.preventDefault();e.stopPropagation();tab=n;select();tabs.children[n].focus();};tabs.append(b);});
 function select(){onCloseBindings();[...tabs.children].forEach((b,i)=>{b.setAttribute('aria-selected',String(i===tab));b.tabIndex=i===tab?0:-1;});root.querySelector('#settings-reset').textContent='RESET TO DEFAULTS';resetArmed=false;build();}
 root.querySelector('#settings-reset').onclick=()=>{const button=root.querySelector('#settings-reset');if(!resetArmed){resetArmed=true;button.textContent='PRESS AGAIN TO RESET';saved.textContent='Resets all tabs and keyboard bindings';return;}const persisted=onReset();select();saved.textContent=persisted===false?'Defaults applied · browser storage unavailable':'Defaults restored ✓';};
 select();return {refreshFullscreen:()=>{const button=root.querySelector('#setting-fullscreen');if(button)onFullscreen(button,rows.querySelector('#fullscreen-status'),true);}};
}
