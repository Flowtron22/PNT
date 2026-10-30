import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as THREE from '../../vendor/three/build/three.module.js';
import {createRound,canAct,rescue,harvest,cancelInteraction} from '../../src/pnt/rules.js';
const source=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8');

test('host transfer on results enables rematch without replacing the result screen',async()=>{
 const button={disabled:true,textContent:'WAITING FOR HOST'},sent=[];
 const context=vm.createContext({online:{control:action=>sent.push(action)},room:{canHost:false},round:{phase:'finished'},onlineLoading:false,busy:false,ui:{results:{hidden:false}},$:()=>button});
 vm.runInContext(source.slice(source.indexOf('function refreshOnlineRematch('),source.indexOf('function showFinalResults('))+source.slice(source.indexOf('async function receiveOnlineLobby('),source.indexOf('async function beginOnlineMatch(')),context);
 button.onclick=()=>context.online.control('rematch');
 await context.receiveOnlineLobby({phase:'finished',canHost:true});assert.equal(button.disabled,false);assert.match(button.textContent,/ONE MORE CHASE/);button.onclick();assert.deepEqual(sent,['rematch']);
 await context.receiveOnlineLobby({phase:'finished',canHost:false});assert.equal(button.disabled,true);assert.equal(button.textContent,'WAITING FOR HOST');
 context.ui.results.hidden=true;await context.receiveOnlineLobby({phase:'finished',canHost:true});assert.equal(button.disabled,true,'verdict must finish before results controls change');
});

test('a cooldown-locked teammate does not prevent stealing and becomes rescuable at expiry',()=>{
 const round=createRound('runner',[{id:'cash',position:[0,0,.5],amount:1000}]);round.actors[2].caught=true;round.actors[2].releaseCooldown=10;
 const avatars=[[0,0,0],[8,0,8],[.5,0,0],[-8,0,-8]].map(position=>({group:{position:new THREE.Vector3(...position)}}));
 const context=vm.createContext({round,avatars,THREE,INTERACT_RADIUS:2.2,canActRule:canAct,withinSight:()=>true,rescue,harvest,cancelInteraction});
 vm.runInContext(source.slice(source.indexOf('function interactionTarget('),source.indexOf('function syncCacheCelebrations(')),context);
 const cache=context.interactionTarget(0);assert.equal(cache.type,'money');context.performInteraction(0,cache,1/60);assert.ok(round.collected>0);assert.equal(round.actors[2].rescueProgress,0);
 round.actors[2].releaseCooldown=0;const teammate=context.interactionTarget(0);assert.equal(teammate.type,'rescue');context.performInteraction(0,teammate,1/60);assert.ok(round.actors[2].rescueProgress>0);
});
