import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
import {createRound,detectThief,canAct,stepRound,DETECTION_RADIUS} from '../../src/pnt/rules.js';
const {createDetectionZone}=await import('../../src/pnt/detection-zone.js');
test('detection catches only after 1.6 continuous seconds, at different frame rates',()=>{
 for(const hz of [20,60,120]){const round=createRound('chaser');for(let i=0;i<hz*1.6-1;i++)assert.equal(detectThief(round,0,1,1/hz,DETECTION_RADIUS),false);assert.equal(canAct(round,1),true);assert.equal(round.actors[1].caught,false);assert.equal(detectThief(round,0,1,1/hz,DETECTION_RADIUS),true);assert.equal(round.actors[1].caught,true);assert.equal(round.actors[1].releaseCooldown,10);assert.equal(canAct(round,1),false);}
});
test('escaping, blocked sight, police stun and rescue immunity reset detection',()=>{
 const round=createRound('chaser'),thief=round.actors[1];
 for(const invalidate of [()=>detectThief(round,0,1,.1,2.01),()=>detectThief(round,0,1,.1,1,false),()=>{round.actors[0].effectTime=1;detectThief(round,0,1,.1,1);round.actors[0].effectTime=0;},()=>{thief.immune=1;detectThief(round,0,1,.1,1);thief.immune=0;}]){for(let i=0;i<10;i++)detectThief(round,0,1,.1,1);assert.ok(thief.detectionProgress>.9);invalidate();assert.equal(thief.detectionProgress,0);assert.equal(thief.caught,false);}
 assert.equal(detectThief(round,0,1,NaN,1),false);assert.equal(detectThief(round,0,1,-1,1),false);assert.equal(detectThief(round,0,1,.1,NaN),false);assert.equal(detectThief(round,0,1,10,1),false);assert.equal(thief.detectionProgress,.1);
});
test('thieves have independent progress and all three detections award victory once',()=>{
 const round=createRound('chaser');for(let i=0;i<8;i++)detectThief(round,0,1,.1,1);assert.equal(round.actors[2].detectionProgress,0);detectThief(round,0,2,.1,1);assert.ok(round.actors[1].detectionProgress>round.actors[2].detectionProgress);
 for(const id of [1,2,3]){for(let i=0;i<16;i++){detectThief(round,0,id,.1,1);stepRound(round,.1);}assert.equal(round.actors[id].caught,true);}assert.equal(round.winner,'chaser');assert.equal(detectThief(round,0,1,.1,1),false);
});
test('police ring matches detection radius and fills progressively without new geometry',()=>{
 const zone=createDetectionZone(),round=createRound('chaser'),fill=zone.group.children[2],geometry=fill.geometry;
 zone.update(round.actors);assert.equal(fill.geometry.drawRange.count,0);assert.equal(zone.group.children[0].geometry.parameters.radius,DETECTION_RADIUS);
 round.actors[1].detectionProgress=.8;zone.update(round.actors);assert.equal(fill.geometry.drawRange.count,96*3);round.actors[2].detectionProgress=1.6;zone.update(round.actors);assert.equal(fill.geometry.drawRange.count,96*6);assert.equal(fill.geometry,geometry);zone.update(round.actors,false);assert.equal(zone.group.visible,false);zone.dispose();
});
