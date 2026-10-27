import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '../../vendor/three/build/three.module.js';
import {LocalPrediction,SnapshotBuffer,interpolatePose,NETWORK_STEP,predictInput} from '../../src/pnt/netcode.js';
const grid={minX:-50,minZ:-50,nx:101,nz:101,step:1,heights:Array(10201).fill(0)};
const pose=(x=0,ack=0)=>({position:[x,0,0],angle:Math.PI/2,vx:0,vz:0,slideX:0,velocity:0,grounded:true,speed:0,ack});
const state={role:'runner',effect:null,effectTime:0,caught:false};
const actor=()=>({group:{position:new Vector3(),rotation:{y:Math.PI/2}}});
test('delayed server acknowledgements replay pending movement without pulling the local render backward',()=>{
 const prediction=new LocalPrediction(actor(),pose(),state,0,{grid,map:'iceberg'}),authoritative=actor();Object.assign(authoritative,{vx:0,vz:0,grounded:true});const history=[pose()];
 for(let i=1;i<=180;i++){
  prediction.advance(NETWORK_STEP,{x:1,z:0,interact:false});predictInput(authoritative,state,{x:1,z:0},i*NETWORK_STEP,{grid,map:'iceberg'});
  history.push({...pose(authoritative.group.position.x,i),vx:authoritative.vx,vz:authoritative.vz,speed:authoritative.speed,grounded:authoritative.grounded});
  if(i>12&&i%3===0){const before=prediction.render().position.x;prediction.reconcile(history[i-12],state,(i-12)*NETWORK_STEP);assert.ok(Math.abs(prediction.actor.group.position.x-authoritative.group.position.x)<1e-8);assert.ok(Math.abs(prediction.render().position.x-before)<1e-8);}
 }
 assert.ok(prediction.actor.group.position.x>12);assert.ok(prediction.pending.length<=15);
});
test('prediction travels the same distance at 30, 60 and 144 render frames per second',()=>{
 const distances=[30,60,144].map(hz=>{const p=new LocalPrediction(actor(),pose(),state,0,{grid,map:'mall'});for(let i=0;i<hz*2;i++)p.advance(1/hz,{x:1,z:0});return p.actor.group.position.x;});
 assert.ok(Math.max(...distances)-Math.min(...distances)<1e-8);
});
test('prediction corrects a changed server position visually and bounds retained input during a stall',()=>{
 const p=new LocalPrediction(actor(),pose(),state,0,{grid,map:'mall'});for(let i=0;i<30;i++)p.advance(NETWORK_STEP,{x:1,z:0});const before=p.render().position.clone();p.reconcile(pose(.1,20),state,20/60);assert.ok(p.render().position.distanceTo(before)<1e-8);
 for(let i=0;i<500;i++)p.advance(NETWORK_STEP,{x:1,z:0});assert.equal(p.pending.length,180);assert.equal(p.outgoing().length,12);assert.equal(p.outgoing()[0].seq,33);
 p.reconcile(pose(-20,600),state,10);assert.equal(p.offset.length(),0);
 const resumed=new LocalPrediction(actor(),{...pose(0,40),received:50},state,1,{grid,map:'mall'});resumed.advance(NETWORK_STEP,{x:0,z:0});assert.equal(resumed.outgoing()[0].seq,51);
});
const snapshot=(time,tick)=>({time,tick,poses:[{...pose(time*4),vx:4}]});
test('remote interpolation remains monotonic and smooth with jittery 20Hz arrivals',()=>{
 const buffer=new SnapshotBuffer(),packets=Array.from({length:80},(_,i)=>({arrival:i*.05+[.02,.04,.01,.06][i%4],snapshot:snapshot(i*.05,i)}));packets.sort((a,b)=>a.arrival-b.arrival);let last=0,maxJump=0,samples=0;
 for(let frame=0;frame<240;frame++){const now=frame/60;while(packets.length&&packets[0].arrival<=now)buffer.push(packets.shift().snapshot);const pair=buffer.advance(1/60);if(!pair)continue;const p=interpolatePose(pair.a.poses[0],pair.b.poses[0],pair.alpha,pair.extra);assert.ok(p.position[0]>=last-1e-8);if(frame>20){maxJump=Math.max(maxJump,p.position[0]-last);samples++;}last=p.position[0];}
 assert.ok(samples>200);assert.ok(maxJump<.08,`maximum frame movement ${maxJump}`);
 const lastTick=buffer.frames.at(-1).tick;assert.equal(buffer.push(snapshot(0,lastTick-1)),false);
});
test('remote turns take the short arc, teleports snap and extrapolation stops at 100ms',()=>{
 const a={...pose(),angle:179*Math.PI/180},b={...pose(1),angle:-179*Math.PI/180};assert.ok(Math.abs(Math.abs(interpolatePose(a,b,.5).angle)-Math.PI)<1e-8);assert.deepEqual(interpolatePose(a,pose(20),.5).position,[20,0,0]);
 const buffer=new SnapshotBuffer();buffer.push(snapshot(0,0));buffer.push(snapshot(.05,3));let pair;for(let i=0;i<180;i++)pair=buffer.advance(1/60);assert.ok(pair.extra<=.100000001);assert.ok(interpolatePose(pair.a.poses[0],pair.b.poses[0],pair.alpha,pair.extra).position[0]<=.6000001);
});
