import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyVirtualKey} from '../../src/pnt/virtual-keyboard.js';

test('virtual keys replace selections, respect length and support cursor backspace',()=>{
 let state=applyVirtualKey({value:'Player',start:0,end:6},'J',{maxLength:8});assert.deepEqual(state,{value:'J',start:1,end:1});state=applyVirtualKey(state,'o',{maxLength:8});state=applyVirtualKey(state,'space',{maxLength:8});state=applyVirtualKey(state,'123456',{maxLength:8});assert.equal(state.value,'Jo 12345');state=applyVirtualKey(state,'backspace',{maxLength:8});assert.equal(state.value,'Jo 1234');assert.deepEqual(applyVirtualKey({value:'Police',start:1,end:5},'backspace'),{value:'Pe',start:1,end:1});
});

test('room-code entry accepts only uppercase letters and numbers',()=>{
 let state={value:'',start:0,end:0};for(const key of ['a','b','-','space','3','z'])state=applyVirtualKey(state,key,{maxLength:6,uppercaseOnly:true});assert.deepEqual(state,{value:'AB3Z',start:4,end:4});assert.deepEqual(applyVirtualKey(state,'clear',{maxLength:6,uppercaseOnly:true}),{value:'',start:0,end:0});
});

test('controller keyboard is bundled and maps controller actions without replacing native typing',()=>{
 const main=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8'),controller=readFileSync(new URL('../../src/pnt/controller.js',import.meta.url),'utf8'),html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');assert.match(controller,/controllertext/);assert.match(main,/virtualKeyboard\.backspace\(\)/);assert.match(main,/virtualKeyboard\.space\(\)/);assert.match(main,/virtualKeyboard\.done\(\)/);assert.match(main,/virtualKeyboard\.cancel\(\)/);assert.match(html,/styles\/virtual-keyboard\.css/);
});
