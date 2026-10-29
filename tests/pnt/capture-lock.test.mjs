import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '../../vendor/three/build/three.module.js';
import {createRound,detectThief,stepRound,canAct,activateTool} from '../../src/pnt/rules.js';
import {advanceActor} from '../../src/pnt/player-motion.js';
import {LocalPrediction,NETWORK_STEP} from '../../src/pnt/netcode.js';
import {CAPTURE_SMOKE_SECONDS,CAPTURE_RECOVERY_SECONDS} from '../../src/pnt/capture-timing.js';
const grid={minX:-10,minZ:-10,nx:21,nz:21,step:1,heights:new Float32Array(441)};
function capture(round){for(let i=0;i<16;i++)detectThief(round,0,1,.1,1);}

test('successful capture locks police through smoke plus half a second without locking other thieves',()=>{
 const round=createRound('chaser');capture(round);const police=round.actors[0];
 assert.equal(police.captureLock,CAPTURE_SMOKE_SECONDS+CAPTURE_RECOVERY_SECONDS);assert.equal(canAct(round,0),false);assert.equal(canAct(round,2),true);
 assert.equal(activateTool(round,0,0),false);round.actors[2].detectionProgress=1.59;assert.equal(detectThief(round,0,2,.1,1),false);
 for(let i=0;i<10;i++)stepRound(round,.1);assert.ok(Math.abs(police.captureLock-.5)<1e-8);assert.equal(canAct(round,0),false);
 for(let i=0;i<5;i++)stepRound(round,.1);assert.equal(police.captureLock,0);assert.equal(canAct(round,0),true);assert.equal(activateTool(round,0,0),true);
});

test('capture lock stops held movement, ice momentum and ship sliding on every map',()=>{
 for(const map of ['mall','sunken','iceberg']){
  const round=createRound('chaser');capture(round);const actor={group:{position:new Vector3(),rotation:{y:0}},vx:3,vz:2,slideX:1.5,grounded:true,speed:1};
  for(let i=0;i<15;i++){advanceActor(actor,round.actors[0],1,1,.1,{grid,map,tilt:.08,speed:4});assert.equal(actor.group.position.x,0);assert.equal(actor.group.position.z,0);assert.equal(actor.speed,0);stepRound(round,.1);}
  advanceActor(actor,round.actors[0],1,0,.1,{grid,map,tilt:.08,speed:4});assert.ok(actor.group.position.x>0,map+' resumes after recovery');
 }
});

test('local prediction counts down capture recovery while holding input and resumes at the authoritative tick',()=>{
 const actor={group:{position:new Vector3(),rotation:{y:0}}},state={role:'chaser',caught:false,effectTime:0,captureLock:1.5};
 const pose={position:[0,0,0],angle:0,vx:0,vz:0,slideX:0,grounded:true,speed:0,ack:0};
 const prediction=new LocalPrediction(actor,pose,state,0,{grid,map:'iceberg'});
 for(let i=0;i<89;i++)prediction.advance(NETWORK_STEP,{x:1,z:0});assert.equal(prediction.actor.group.position.x,0);
 prediction.advance(NETWORK_STEP,{x:1,z:0});assert.equal(prediction.state.captureLock,0);assert.ok(prediction.actor.group.position.x>0);
});

test('capture reconciliation removes residual movement smoothing instead of drifting during the lock',()=>{
 const actor={group:{position:new Vector3(),rotation:{y:0}}},state={role:'chaser',caught:false,effectTime:0,captureLock:0};
 const pose={position:[0,0,0],angle:0,vx:0,vz:0,slideX:0,grounded:true,speed:0,ack:0};
 const prediction=new LocalPrediction(actor,pose,state,0,{grid,map:'mall'});
 for(let i=0;i<15;i++)prediction.advance(NETWORK_STEP,{x:1,z:0});assert.ok(prediction.render().position.x>.1);
 prediction.reconcile({...pose,ack:5},{...state,captureLock:1.5},.1);
 assert.equal(prediction.offset.length(),0);assert.equal(prediction.render().position.x,0);assert.equal(prediction.actor.vx,0);
});
