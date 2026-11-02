const LETTERS=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
const DIGITS='1234567890';

export function applyVirtualKey(state,key,{maxLength=Infinity,uppercaseOnly=false}={}){
 let value=String(state.value??''),start=Math.max(0,Math.min(value.length,state.start??value.length)),end=Math.max(start,Math.min(value.length,state.end??start));
 if(key==='backspace'){
  if(start===end&&start>0)start--;value=value.slice(0,start)+value.slice(end);return {value,start,end:start};
 }
 if(key==='clear')return {value:'',start:0,end:0};
 let text=key==='space'?' ':String(key||'');if(uppercaseOnly)text=text.toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(!text)return {value,start,end};const room=Math.max(0,maxLength-(value.length-(end-start)));text=text.slice(0,room);value=value.slice(0,start)+text+value.slice(end);start+=text.length;return {value,start,end:start};
}

export function createVirtualKeyboard(doc){
 const root=doc.createElement('section');root.id='virtual-keyboard';root.className='virtual-keyboard';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Controller keyboard');
 root.innerHTML='<div class="vk-panel"><header><span>CONTROLLER KEYBOARD</span><strong id="vk-label">TYPE</strong><output id="vk-preview"></output></header><div id="vk-keys" class="vk-keys"></div><footer><span><b>A</b> TYPE</span><span><b>X</b> BACKSPACE</span><span><b>Y</b> SPACE</span><span><b>B</b> CANCEL</span><span><b>START</b> DONE</span></footer></div>';
 doc.body.append(root);const keys=root.querySelector('#vk-keys'),preview=root.querySelector('#vk-preview'),label=root.querySelector('#vk-label');
 let input=null,original='',originalStart=0,originalEnd=0,start=0,end=0,upper=true,uppercaseOnly=false,maxLength=Infinity;
 const event=type=>new (doc.defaultView?.Event||Event)(type,{bubbles:true});
 function refreshPreview(){preview.textContent=input?.value||' ';preview.classList.toggle('is-empty',!input?.value);}
 function sync(key){const next=applyVirtualKey({value:input.value,start,end},key,{maxLength,uppercaseOnly});input.value=next.value;start=next.start;end=next.end;input.setSelectionRange?.(start,end);input.dispatchEvent(event('input'));refreshPreview();}
 function button(text,key,wide='',row=0,column=''){const item=doc.createElement('button'),id=key==='-'?'hyphen':key==="'"?'apostrophe':key.replace(/[^a-z0-9]+/gi,'-').toLowerCase();item.type='button';item.id='vk-key-'+id;item.dataset.vkey=key;item.textContent=text;if(wide)item.className=wide;if(row)item.style.gridRow=String(row);if(column)item.style.gridColumn=String(column);return item;}
 function render(){
  const nodes=[...DIGITS].map((char,i)=>button(char,char,'',1,i+1));LETTERS.forEach((letters,row)=>[...letters].forEach((char,i)=>nodes.push(button(upper?char:char.toLowerCase(),upper?char:char.toLowerCase(),'',row+2,(row===0?1:2)+i))));
  if(!uppercaseOnly){nodes.push(button(upper?'Aa':'aA','shift','vk-command',5,'1 / 3'));nodes.push(button("'","'",'vk-command',5,3));nodes.push(button('−','-','vk-command',5,4));nodes.push(button('SPACE','space','vk-space',5,'5 / 9'));}
  nodes.push(button('⌫','backspace','vk-command',5,'9 / 11'));nodes.push(button('CLEAR','clear','vk-command',6,'1 / 3'));nodes.push(button('CANCEL','cancel','vk-cancel',6,'3 / 6'));nodes.push(button('DONE','done','vk-done',6,'6 / 11'));keys.replaceChildren(...nodes);
 }
 function close(keep=true){if(!input)return;if(!keep){input.value=original;start=originalStart;end=originalEnd;input.dispatchEvent(event('input'));}root.hidden=true;for(const item of root.querySelectorAll('.pad-focus'))item.classList.remove('pad-focus');const target=input;input=null;target.focus?.({preventScroll:true});target.setSelectionRange?.(start,end);target.classList?.add('pad-focus');}
 function press(key){if(!input)return;if(key==='done'){input.dispatchEvent(event('change'));close(true);return;}if(key==='cancel'){close(false);return;}if(key==='shift'){upper=!upper;render();return;}sync(key);if(!uppercaseOnly&&upper&&/^[A-Z]$/.test(key)){upper=false;render();}}
 function open(target){if(!target||target.disabled||target.readOnly)return;input=target;original=target.value;start=originalStart=target.selectionStart??target.value.length;end=originalEnd=target.selectionEnd??start;uppercaseOnly=target.id==='join-code'||target.autocapitalize==='characters'||target.getAttribute('autocapitalize')==='characters';maxLength=target.maxLength>0?target.maxLength:Infinity;upper=true;label.textContent=target.labels?.[0]?.textContent?.trim()||target.getAttribute('aria-label')||target.placeholder||'TYPE';render();refreshPreview();root.hidden=false;}
 root.addEventListener('click',e=>{const item=e.target.closest('[data-vkey]');if(item)press(item.dataset.vkey);});
 doc.addEventListener('keydown',e=>{if(root.hidden)return;let key=null;if(e.key==='Backspace')key='backspace';else if(e.key==='Escape')key='cancel';else if(e.key==='Enter')key='done';else if(e.key===' ')key='space';else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey)key=uppercaseOnly?e.key.toUpperCase():e.key;if(!key)return;e.preventDefault();e.stopImmediatePropagation();press(key);},true);
 return {open,press,backspace:()=>press('backspace'),space:()=>{if(!uppercaseOnly)press('space');},done:()=>press('done'),cancel:()=>press('cancel'),get active(){return !root.hidden;},get root(){return root;}};
}
