import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {padStick,createController,controllerMenu} from '../../src/pnt/controller.js';
function fixture(){const pad={index:0,id:'Test standard pad',connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};let pads=[pad];const controller=createController({getGamepads:()=>pads});controller.poll(0);return {pad,controller,setPads:v=>pads=v,button:(i,on)=>{pad.buttons[i]={pressed:on,value:on?1:0};}};}
test('radial dead zone preserves analog direction and caps diagonal movement',()=>{
 assert.deepEqual(padStick(.05,.05),{x:0,z:0});assert.deepEqual(padStick(NaN,0),{x:0,z:0});const half=padStick(.55,0);assert.ok(Math.abs(half.x-.5)<1e-9);assert.equal(half.z,0);const diagonal=padStick(1,-1);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-9);assert.ok(Math.abs(diagonal.x+diagonal.z)<1e-9);
});
test('pad buttons produce one edge, independent held state and controlled menu repeats',()=>{
 const f=fixture();f.button(0,true);let state=f.controller.poll(10);assert.ok(state.pressed.has(0));assert.ok(state.held.has(0));assert.equal(f.controller.poll(20).pressed.size,0);f.button(2,true);assert.ok(f.controller.poll(30).pressed.has(2));f.button(0,false);assert.equal(f.controller.poll(40).held.has(0),false);
 f.pad.axes=[1,0];assert.equal(f.controller.poll(50).direction,'right');assert.equal(f.controller.poll(100).direction,null);assert.equal(f.controller.poll(381).direction,'right');assert.equal(f.controller.poll(400).direction,null);f.pad.axes=[0,-1];assert.equal(f.controller.poll(410).direction,'up');f.button(12,true);f.button(15,true);const diagonal=f.controller.poll(420);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-9);
});
test('disconnect, reconnect and pause reset cannot leave movement or held actions stuck',()=>{
 const f=fixture();f.button(0,true);f.pad.axes=[1,0];assert.equal(f.controller.poll(10).x,1);f.setPads([]);const lost=f.controller.poll(20);assert.equal(lost.connected,false);assert.equal(lost.x,0);assert.equal(lost.held.size,0);
 f.setPads([f.pad]);assert.equal(f.controller.poll(30).pressed.size,0);assert.equal(f.controller.poll(40).x,0);f.button(0,false);f.pad.axes=[0,0];f.controller.poll(50);f.button(0,true);assert.ok(f.controller.poll(60).pressed.has(0));f.controller.reset();assert.equal(f.controller.poll(70).held.size,0);f.button(0,false);f.controller.poll(80);f.button(0,true);assert.ok(f.controller.poll(90).pressed.has(0));
});
test('unsupported pads and denied API fail safely; supported pad selection stays stable',()=>{
 assert.equal(createController({}).poll(0).connected,false);assert.equal(createController({getGamepads(){throw Error('denied');}}).poll(0).connected,false);const f=fixture();f.pad.mapping='';assert.equal(f.controller.poll(10).connected,false);f.pad.mapping='standard';const other={...f.pad,index:1,id:'Other'};f.setPads([f.pad,other]);f.controller.poll(20);f.setPads([other,f.pad]);assert.equal(f.controller.poll(30).id,f.pad.id);
});
test('controller rumble stops on disable, pause and disconnect, and tolerates rejection',()=>{
 const f=fixture(),calls=[];f.pad.vibrationActuator={playEffect:(type,opts)=>{calls.push([type,opts]);return Promise.reject(Error('unsupported'));},reset:()=>{calls.push('reset');return Promise.resolve();}};f.controller.rumble('rocket',.01,true,true);f.controller.rumble('rocket',.1,true,true);assert.equal(calls.length,1);f.controller.rumble('banana',.01,true,true);assert.equal(calls.length,2);f.controller.rumble('banana',.01,false,true);assert.equal(calls.at(-1),'reset');f.controller.rumble('rocket',.01,true,false);assert.equal(calls.length,3);f.controller.rumble('rocket',.01,true,true);f.setPads([]);f.controller.poll(1);assert.equal(calls.at(-1),'reset');
});
test('menu navigation adjusts native sliders/selects, focuses controls and activates buttons once',()=>{
 let clicked=0,focused=null;const events=[];
 const make=(kind,x,y)=>({disabled:false,kind,value:'0.5',min:'0',max:'1',step:'.05',selectedIndex:0,options:[{},{}],getClientRects:()=>[{}],closest:()=>null,getBoundingClientRect:()=>({left:x,top:y,width:40,height:20}),matches(s){return s.split(',').some(k=>k==='select'&&kind==='select'||k==='input[type=range]'&&kind==='range'||k==='input:not([type=checkbox])'&&kind==='range');},focus(){focused=this;doc.activeElement=this;},scrollIntoView(){},click(){clicked++;},dispatchEvent:e=>events.push(e.type)});
 const button=make('button',0,0),slider=make('range',0,50),select=make('select',0,100),scope={hidden:false,querySelectorAll:()=>[button,slider,select]},doc={activeElement:null,querySelector:()=>null,getElementById:id=>id==='menu'?scope:null};
 controllerMenu(doc,'down');assert.equal(focused,button);controllerMenu(doc,'accept');assert.equal(clicked,1);controllerMenu(doc,'down');assert.equal(focused,slider);controllerMenu(doc,'right');assert.equal(+slider.value,.55);assert.deepEqual(events.filter(type=>type!=='controllerfocus'),['input']);controllerMenu(doc,'accept');assert.equal(clicked,1);controllerMenu(doc,'down');controllerMenu(doc,'right');assert.equal(select.selectedIndex,1);assert.deepEqual(events.filter(type=>type!=='controllerfocus'),['input','change']);assert.equal(events.filter(type=>type==='controllerfocus').length,4);
});
test('controller focus survives a lobby rebuild and scrolls the replacement into view',()=>{
 let items=[],focused=null,lastScroll=null;const classes=()=>{const values=new Set();return {add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v)};};
 const make=(id,y,click=()=>{})=>({id,disabled:false,classList:classes(),getClientRects:()=>[{}],closest:()=>null,getBoundingClientRect:()=>({left:0,top:y,width:100,height:40}),matches:()=>false,focus(){focused=this;doc.activeElement=this;},scrollIntoView(options){lastScroll=options;},click});
 const scope={hidden:false,querySelectorAll:selector=>selector==='[role=tab]'?[]:items};
 const doc={activeElement:null,body:{classList:classes()},querySelector:()=>null,getElementById:id=>id==='lobby'?scope:null,querySelectorAll:selector=>selector==='.pad-focus'?items.filter(item=>item.classList.contains('pad-focus')):[]};
 let replacement;const first=make('quit-lobby',0),second=make('add-bot',100,()=>{replacement=make('add-bot',100);items=[make('quit-lobby',0),replacement];});items=[first,second];
 controllerMenu(doc,'down');controllerMenu(doc,'down');assert.equal(focused,second);controllerMenu(doc,'accept');assert.equal(focused,replacement);assert.equal(replacement.classList.contains('pad-focus'),true);assert.deepEqual(lastScroll,{block:'nearest',inline:'nearest',behavior:'smooth'});
 controllerMenu(doc,'up');assert.equal(focused.id,'quit-lobby');
});
test('controller focus moves to the nearest surviving control when its lobby button disappears',()=>{
 let items=[],focused=null;const classes=()=>{const values=new Set();return {add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v)};};
 const make=(id,y,click=()=>{})=>({id,disabled:false,classList:classes(),getClientRects:()=>[{}],closest:()=>null,getBoundingClientRect:()=>({left:0,top:y,width:100,height:40}),matches:()=>false,focus(){focused=this;doc.activeElement=this;},scrollIntoView(){},click});
 const scope={hidden:false,querySelectorAll:selector=>selector==='[role=tab]'?[]:items},doc={activeElement:null,body:{classList:classes()},querySelector:()=>null,getElementById:id=>id==='lobby'?scope:null,querySelectorAll:selector=>selector==='.pad-focus'?items.filter(item=>item.classList.contains('pad-focus')):[]};
 const back=make('quit-lobby',0),addP2=make('',100,()=>{doc.activeElement=null;items=[back,make('',130)];});addP2.dataset={emptySlot:'1'};items=[back,addP2];items[1].dataset={emptySlot:'1'};
 controllerMenu(doc,'down');controllerMenu(doc,'down');controllerMenu(doc,'accept');assert.equal(focused,items[1]);
});
test('programmatic controller focus has the orange hover treatment in menus and lobbies',()=>{
 const css=readFileSync(new URL('../../styles/settings.css',import.meta.url),'utf8'),effects=readFileSync(new URL('../../src/pnt/menu-effects.js',import.meta.url),'utf8');assert.match(css,/\.pad-focus\{[^}]*#ff8a14/);assert.match(css,/\.nav-button\.pad-focus:before\{[^}]*scale\(1\)/);assert.match(css,/\.iw-btn\.pad-focus \.iw-btn__blob\{[^}]*scale\(1\)/);assert.match(css,/\.lobby-screen button\.pad-focus\{[^}]*background:#ffad2f/);assert.match(effects,/addEventListener\('controllerfocus'[^]*setFocus\(el,true\)/);
});
