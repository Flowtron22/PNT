import test from 'node:test';import assert from 'node:assert/strict';
import {environmentVelocity,shipTilt,SHIP,ICE} from '../../src/pnt/environment.js';
test('iceberg uses the softened steering and braking tune',()=>{assert.deepEqual(ICE,{acceleration:9,steering:2.2,braking:3.2});});
test('ice retains turning momentum and takes longer to stop than normal ground',()=>{
 const ice={vx:4,vz:0},normal={vx:4,vz:0};environmentVelocity(ice,0,1,4,.1,{map:'iceberg'});environmentVelocity(normal,0,1,4,.1,{map:'mall'});assert.ok(ice.vx>normal.vx);assert.ok(ice.vz<normal.vz);
 const stopping=map=>{const actor={vx:4,vz:0};let distance=0;for(let i=0;i<120;i++){environmentVelocity(actor,0,0,4,1/60,{map});distance+=actor.vx/60;}return {distance,speed:actor.vx};};assert.ok(stopping('iceberg').distance>stopping('mall').distance*5);assert.equal(stopping('iceberg').speed,0);
});
test('ice momentum is stable across render rates with bounded substeps',()=>{
 const travel=hz=>{const actor={vx:0,vz:0};let x=0,z=0;for(let i=0;i<hz*3;i++){const steps=Math.ceil(60/hz),dt=1/hz/steps;for(let s=0;s<steps;s++){environmentVelocity(actor,i<hz?1:0,i>=hz&&i<2*hz?1:0,4,dt,{map:'iceberg'});x+=actor.vx*dt;z+=actor.vz*dt;}}return {x,z};};const a=travel(30),b=travel(60),c=travel(120);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-8);assert.ok(Math.hypot(a.x-c.x,a.z-c.z)<.1);
});
test('ship tilt follows authored five-degree keys, rests flat and alternates direction',()=>{
 assert.equal(shipTilt(0),0);assert.equal(shipTilt(3),SHIP.peak);assert.equal(shipTilt(5),0);assert.equal(shipTilt(9),0);assert.equal(shipTilt(13),-SHIP.peak);assert.equal(shipTilt(23),SHIP.peak);
});
test('ship slides downhill only while grounded, respects speed cap and stops on flat deck',()=>{
 const actor={vx:0,vz:0};for(let i=0;i<180;i++)environmentVelocity(actor,0,0,4,1/60,{map:'sunken',tilt:SHIP.peak});assert.ok(actor.slideX< -1);assert.ok(Math.abs(actor.slideX)<=SHIP.maxSlide);
 environmentVelocity(actor,0,0,4,.1,{map:'sunken',tilt:0});assert.equal(actor.slideX,0);
 for(const opt of [{flying:true},{grounded:false},{locked:true}]){environmentVelocity(actor,1,0,4,.1,{map:'sunken',tilt:SHIP.peak,...opt});assert.equal(actor.slideX,0);}
 environmentVelocity(actor,1,0,4,.1,{map:'iceberg',locked:true});assert.equal(actor.vx,0);assert.equal(actor.vz,0);
});
