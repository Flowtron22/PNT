import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three/build/three.module.js';
import {createGameplayAudio} from '../../src/pnt/game-audio.js';
import {createRound,detectThief,rescue,stepRound,canAct,activateTool} from '../../src/pnt/rules.js';

async function fixture(t){
 const storage=globalThis.localStorage,fetcher=globalThis.fetch,sources=[],requests=[];
 globalThis.localStorage={getItem:()=>null,setItem(){}};
 globalThis.fetch=async url=>{requests.push(url);return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer};};
 const context={currentTime:1,state:'running',createGain:()=>({gain:{value:1},connect(){},disconnect(){}}),decodeAudioData:async bytes=>new TextDecoder().decode(bytes),createBufferSource(){return {connect(){},disconnect(){},start(){sources.push(this);},stop(){this.stopped=true;this.onended?.();}};}};
 const audio=createGameplayAudio(()=>({ctx:context,master:{},init(){},resume(){}}));await audio.prepare();
 t.after(()=>{audio.stop();globalThis.localStorage=storage;globalThis.fetch=fetcher;});
 const round=createRound('runner');round.profileId='announcer';
 const actors=round.actors.map(()=>({group:{position:{distanceTo:()=>0}}}));
 const update=(localIds=[0],active=true)=>{context.currentTime+=.2;audio.update(round,actors,active,active,'mall',false,localIds.length>1,localIds);};
 const finish=()=>{for(let i=0;i<32;i++){const source=sources.find(s=>s.buffer.includes('/vc_')&&!s.finished&&!s.stopped);if(!source)return;source.finished=true;source.onended?.();}throw Error('Unbounded narration');};
 const count=name=>sources.filter(s=>s.buffer.endsWith('/'+name+'.wav')).length;
 update();return {audio,round,actors,sources,requests,update,finish,count};
}

test('victory/defeat occur once at verdict, congratulations only once on winning stats',async t=>{
 const f=await fixture(t);f.round.phase='finished';f.audio.verdict(f.round,true);f.audio.verdict(f.round,true);f.update([0],false);
 assert.equal(f.count('vc_narration_result_victory'),1);assert.equal(f.count('vc_narration_congratulation'),0);
 f.audio.results(f.round,true);f.audio.results(f.round,true);assert.equal(f.count('vc_narration_congratulation'),0,'stats waits for the current voice');f.finish();assert.equal(f.count('vc_narration_congratulation'),1);
 f.round.profileId='lost';f.audio.verdict(f.round,false);f.audio.verdict(f.round,false);f.audio.results(f.round,false);f.finish();assert.equal(f.count('vc_narration_defeated'),1);assert.equal(f.count('vc_narration_congratulation'),1);
});

test('second personal capture and second personal rescue use the milestone lines without snapshot repeats',async t=>{
 const f=await fixture(t);f.round.actors[0].role='chaser';f.round.actors[0].captures=1;f.update();assert.equal(f.count('vc_menu_narration_nailedit'),0);
 f.round.actors[0].captures=2;f.update();f.update();f.finish();assert.equal(f.count('vc_menu_narration_nailedit'),1);
 f.round.actors[0].captures=3;f.update();assert.equal(f.count('vc_menu_narration_nailedit'),1);
 f.round.actors[0].role='runner';f.round.actors[0].rescues=1;f.update();f.finish();assert.equal(f.count('vc_narration_incledible'),1);
 f.round.actors[0].rescues=2;f.update();f.update();f.finish();assert.equal(f.count('vc_menu_narration_nocontest'),1);assert.equal(f.count('vc_narration_incledible'),1);
 f.round.actors[2].rescues=2;f.round.actors[2].captures=2;f.update();f.finish();assert.equal(f.count('vc_menu_narration_nocontest'),1);assert.equal(f.count('vc_menu_narration_nailedit'),1);
});

test('stun praise follows the attacker role and includes couch humans but excludes bots',async t=>{
 const f=await fixture(t);f.round.actors[0].stuns=1;f.update();f.finish();assert.equal(f.count('vc_menu_narration_mob'),1);
 f.round.actors[1].stuns=1;f.update([0,1]);f.finish();assert.equal(f.count('vc_menu_narration_vipsmash'),1);
 f.round.actors[2].stuns=1;f.update([0,1]);f.finish();assert.equal(f.count('vc_menu_narration_mob'),1);
 f.update([0,1]);f.finish();assert.equal(f.count('vc_menu_narration_vipsmash'),1);
});

test('reconnect/new-match baselines do not replay historical achievements and pause/mute clear queued voices',async t=>{
 const f=await fixture(t);f.audio.stop();f.round.actors[0].rescues=2;f.round.actors[0].stuns=3;f.update();f.finish();assert.equal(f.count('vc_menu_narration_nocontest'),0);assert.equal(f.count('vc_menu_narration_mob'),0);
 f.round.actors[0].rescues++;f.round.actors[0].stuns++;f.update();assert.equal(f.count('vc_narration_incledible'),1);assert.equal(f.count('vc_menu_narration_mob'),0);f.update([0],false);f.finish();assert.equal(f.count('vc_menu_narration_mob'),0);
 f.round.actors[0].rescues++;f.round.actors[0].stuns++;f.update();f.audio.setEnabled(false);f.finish();assert.equal(f.count('vc_menu_narration_mob'),0);
 f.audio.setEnabled(true);f.round.profileId='next';f.round.actors[0].captures=0;f.round.actors[0].rescues=0;f.round.actors[0].stuns=0;f.update();f.round.actors[0].rescues=2;f.update();f.finish();assert.equal(f.count('vc_menu_narration_nocontest'),1);
 f.round.actors[0].rescues++;f.round.actors[0].stuns++;f.update();f.audio.update(null,[],false,false);f.finish();assert.equal(f.count('vc_menu_narration_mob'),0,'menu cleanup discards pending voices');
});

test('B2B return uses the supplied teleport WAV and all new clips preload as PCM WAVs',async t=>{
 const f=await fixture(t);f.audio.tool('rewind',0,f.actors);assert.equal(f.count('se_assist_ghirahim_teleport'),1);assert.ok(!f.requests.some(url=>url.includes('Tool_Rewind_Teleport')));
 for(const name of ['vc_narration_result_victory','vc_narration_defeated','vc_narration_incledible','vc_menu_narration_nailedit','vc_menu_narration_nocontest','vc_narration_congratulation','vc_menu_narration_mob','vc_menu_narration_vipsmash','se_assist_ghirahim_teleport']){
  assert.ok(f.requests.includes(`assets/pnt/audio/${name}.wav`));const bytes=readFileSync(new URL(`../../assets/pnt/audio/${name}.wav`,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
 }
});

test('shared rules credit only completed captures and rescues to the acting player and reset each match',()=>{
 const round=createRound('chaser');round.profileId='rules';
 for(let i=0;i<16;i++)detectThief(round,0,1,.1,1);assert.equal(round.actors[0].captures,1);assert.equal(round.actors[1].captures,0);
 detectThief(round,0,1,.1,1);assert.equal(round.actors[0].captures,1);round.actors[1].releaseCooldown=0;
 for(let i=0;i<14;i++)rescue(round,2,1,.1,1);assert.equal(round.actors[2].rescues,0);rescue(round,2,1,.1,1);assert.equal(round.actors[2].rescues,1);rescue(round,2,1,.1,1);assert.equal(round.actors[2].rescues,1);
 while(round.actors[0].captureLock>0||round.actors[1].immune>0)stepRound(round,.1);for(let i=0;i<16;i++)detectThief(round,0,1,.1,1);assert.equal(round.actors[0].captures,2);
 for(const actor of createRound().actors)assert.deepEqual([actor.captures,actor.rescues,actor.stuns],[0,0,0]);
});

test('local hammer credits actual hits and B2B placement does not play the return sound',()=>{
 const source=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8'),round=createRound('runner'),calls=[];
 const avatars=round.actors.map((_,id)=>({id,tools:['hammer','rewind'],group:{position:new THREE.Vector3(id===1?1:id*5,0,0),rotation:{y:0}},grounded:true}));
 const context=vm.createContext({round,avatars,THREE,online:null,room:null,paused:false,busy:false,loadout:['hammer','rewind'],hazards:[],ANIMATION_PLAY_RATE:1.3,smokeCoverage(){},canActRule:canAct,activateTool,withinSight:()=>true,setEffect(state,name,time){state.effect=name;state.effectTime=time;},gameAudio:{tool:name=>calls.push(name),play:name=>calls.push(name)},gameFX:{hammerSwing(){},rewind(){}},attachHeldHammer:()=>null,prop:()=>null,say(){},createPlayerMirage:()=>({position:new THREE.Vector3()}),attachHazardTelegraph(){},matchRoot:{add(){}}});
 vm.runInContext(source.slice(source.indexOf('function useTool('),source.indexOf('function limitItems(')),context);
 context.useTool(0);assert.equal(round.actors[0].stuns,1);context.useTool(0);assert.equal(round.actors[0].stuns,1);
 round.actors[0].effectTime=0;context.useTool(1);assert.ok(avatars[0].mark);assert.ok(calls.includes('Tool_Rewind_Box_Deploy'));assert.ok(!calls.includes('rewind'));
 context.spot=()=>new THREE.Vector3();context.useTool(1);assert.equal(avatars[0].mark,null);assert.equal(calls.filter(name=>name==='rewind').length,1);
});
