import test from 'node:test';import assert from 'node:assert/strict';
import {phoneNeedsLandscape,lockPhoneLandscape} from '../../src/pnt/landscape.js';
test('only portrait phones require landscape; touch tablets and desktops retain their layout',()=>{
 const win={screen:{width:430,height:932},innerWidth:430,innerHeight:820,matchMedia:()=>({matches:true})};assert.equal(phoneNeedsLandscape(win),true);win.innerWidth=932;win.innerHeight=430;assert.equal(phoneNeedsLandscape(win),false);win.innerWidth=430;win.innerHeight=900;win.matchMedia=()=>({matches:false});assert.equal(phoneNeedsLandscape(win),false);win.matchMedia=()=>({matches:true});win.screen={width:820,height:1180};assert.equal(phoneNeedsLandscape(win),false);
});
test('orientation requests fullscreen before locking and handles unsupported/rejected browser APIs',async()=>{
 const calls=[],doc={documentElement:{requestFullscreen:async()=>calls.push('fullscreen')}},win={screen:{orientation:{lock:async mode=>calls.push(mode)}}};assert.equal(await lockPhoneLandscape(doc,win),true);assert.deepEqual(calls,['fullscreen','landscape']);assert.equal(await lockPhoneLandscape(doc,{screen:{}}),false);win.screen.orientation.lock=async()=>{throw Error('Unsupported');};assert.equal(await lockPhoneLandscape(doc,win),false);
});
