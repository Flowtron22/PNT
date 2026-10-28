import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS,SETTINGS_KEY,normalizeSettings,loadSettings,saveSettings,createRenderGate} from '../../src/pnt/settings.js';
test('settings migrate existing audio, graphics and accessibility preferences once',()=>{
 const data=new Map([['psx-web-quality','battery'],['pnt-game-music','off'],['pnt-game-sfx','off'],['pnt-ui-sounds','off'],['pnt-haptics','off']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const s=loadSettings(storage,true);assert.equal(s.quality,'battery');assert.equal(s.music,0);assert.equal(s.sfx,0);assert.equal(s.uiSounds,false);assert.equal(s.haptics,false);assert.equal(s.reducedMotion,true);
 assert.equal(saveSettings(storage,{...s,music:.35,reducedMotion:false}),true);data.set('pnt-game-music','off');const restored=loadSettings(storage,true);assert.equal(restored.music,.35);assert.equal(restored.reducedMotion,false);assert.ok(data.has(SETTINGS_KEY));
});
test('invalid, corrupt and inaccessible saved settings cannot introduce unsafe values',()=>{
 const s=normalizeSettings({quality:'ultra',fpsCap:12,hudScale:200,joystickSensitivity:-1,master:NaN,music:'0',showFps:'yes',sfx:Infinity,unexpected:true});assert.equal(s.quality,'balanced');assert.equal(s.fpsCap,0);assert.equal(s.hudScale,1.3);assert.equal(s.joystickSensitivity,.5);assert.equal(s.master,1);assert.equal(s.music,1);assert.equal(s.showFps,false);assert.equal(s.sfx,1);assert.equal('unexpected' in s,false);
 assert.deepEqual(loadSettings({getItem:()=>'{broken'}),DEFAULT_SETTINGS);assert.equal(saveSettings({setItem(){throw Error('blocked');}},DEFAULT_SETTINGS),false);assert.equal(loadSettings({getItem(){throw Error('blocked');}},true).reducedMotion,true);
});
test('render cap follows 30/60 fps independently of callback rate and handles long stalls',()=>{
 for(const hz of [60,120,144])for(const cap of [30,60]){const gate=createRenderGate();let count=0;for(let frame=0;frame<hz*5;frame++)if(gate(frame*1000/hz,cap))count++;assert.ok(Math.abs(count-cap*5)<=1,`${hz} Hz / ${cap} cap: ${count}`);assert.equal(gate(20000,cap),true);assert.equal(gate(20001,cap),false);}
 const unlimited=createRenderGate();for(let i=0;i<300;i++)assert.equal(unlimited(i,0),true);
});
