import test from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../../src/pnt/rules.js';
import {smokeBlocksSight} from '../../src/pnt/sight.js';
const p={x:0,y:0,z:0},q={x:1,y:0,z:0};
test('only timed detection can catch; obsolete instant and delayed capture APIs are absent',()=>{
 assert.equal(rules.tag,undefined);assert.equal(rules.beginCapture,undefined);
 const r=rules.createRound('chaser');r.actors[1].captureRemaining=.01;rules.stepRound(r,.1);assert.equal(r.actors[1].caught,false);
});
test('spatial detection uses gameplay time after GO, vertical separation, sight and circle radius',()=>{
 const r=rules.createRound('chaser');r.remaining=298.5;rules.detectThiefAt(r,0,1,.1,p,q);assert.equal(r.actors[1].detectionProgress,0);
 r.remaining=298.4;rules.detectThiefAt(r,0,1,.1,p,{...q,x:2});assert.equal(r.actors[1].detectionProgress,.1);
 for(const [position,sight] of [[{...q,x:2.01},true],[{...q,y:.8},true],[q,false]]){r.actors[1].detectionProgress=1;rules.detectThiefAt(r,0,1,.1,p,position,sight);assert.equal(r.actors[1].detectionProgress,.96);assert.equal(r.actors[1].caught,false);}
});
test('finished rounds and countdowns never change capture meters, even on invalid contact',()=>{
 const r=rules.createRound('chaser');r.actors[1].detectionProgress=1;rules.startCountdown(r);rules.detectThief(r,0,1,.1,8);assert.equal(r.actors[1].detectionProgress,1);r.startRemaining=0;rules.finishRound(r,'runner','money');rules.detectThief(r,0,1,.1,8);assert.equal(r.actors[1].detectionProgress,1);
});
test('a near-full meter cannot catch through smoke; protection clears at exact cloud expiry',()=>{
 const r=rules.createRound('chaser'),positions=[p,q,{x:8,y:0,z:0},{x:9,y:0,z:0}],cloud={position:q,time:.01};r.actors[1].detectionProgress=1.59;
 rules.updateSmokeCoverage(r,positions,[cloud]);assert.equal(r.actors[1].inSmoke,true);assert.equal(rules.detectThief(r,0,1,.1,1),false);assert.ok(r.actors[1].detectionProgress<1.59);
 cloud.time=0;rules.updateSmokeCoverage(r,positions,[cloud]);assert.equal(r.actors[1].inSmoke,false);assert.equal(rules.detectThief(r,0,1,.1,1),true);
});
test('smoke sight uses one three-dimensional segment for server and local hazard shapes',()=>{
 const a={x:-4,y:0,z:0},b={x:4,y:0,z:0},position={x:0,y:0,z:0};
 for(const cloud of [{type:'smoke',time:5,position},{type:'smoke',time:5,mesh:{position}}]){assert.equal(smokeBlocksSight(a,b,[cloud]),true);assert.equal(smokeBlocksSight(p,p,[cloud]),true);cloud.time=0;assert.equal(smokeBlocksSight(a,b,[cloud]),false);}
 assert.equal(smokeBlocksSight(a,b,[{type:'smoke',time:5,position:{x:0,y:4,z:0}}]),false);
});
