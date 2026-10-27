import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../../vendor/three/build/three.module.js';
import {advanceActor} from '../../src/pnt/player-motion.js';
import {landingMask,safeLandingCell,nearestLanding} from '../../src/pnt/landing.js';
const makeGrid=()=>({nx:12,nz:9,minX:0,minZ:0,step:1,heights:new Float32Array(108),blocked:new Uint8Array(108),edges:new Uint8Array(108)});
const actor=()=>({group:{position:new Vector3(2,0,4),rotation:{y:0}},grounded:true,vx:0,vz:0});
test('jetpack bypasses blocking walls and furniture, then lands on a reachable floor',()=>{
 const grid=makeGrid();for(let z=0;z<9;z++)grid.blocked[z*12+4]=1;grid.landingMask=landingMask(grid,[[2,0,4],[8,0,4]]);
 const a=actor(),state={effect:'rocket',effectTime:5};let contacts=0;
 for(let i=0;i<80;i++)advanceActor(a,state,1,0,1/60,{grid,map:'mall',speed:4,furniture:{move(){contacts++;}}});assert.ok(a.group.position.x>5);assert.equal(contacts,0);
 a.group.position.x=4;state.effectTime=0;advanceActor(a,state,0,0,1/60,{grid,map:'mall',speed:4});assert.ok(safeLandingCell(grid,a.group.position.x,a.group.position.z));assert.notEqual(Math.round(a.group.position.x),4);
 for(let i=0;i<120;i++)advanceActor(a,state,0,0,1/60,{grid,map:'mall',speed:4});assert.equal(a.grounded,true);assert.ok(Math.abs(a.group.position.y)<.02);
});
test('landing excludes isolated rooftops and finds real floor from voids or outside the arena',()=>{
 const grid=makeGrid();for(let z=3;z<=5;z++)for(let x=5;x<=7;x++)grid.heights[z*12+x]=4;grid.landingMask=landingMask(grid,[[2,0,4]]);
 assert.equal(safeLandingCell(grid,6,4),false);const landing=nearestLanding(grid,6,4);assert.ok(landing);assert.equal(landing.y,0);assert.equal(safeLandingCell(grid,landing.x,landing.z),true);assert.ok(nearestLanding(grid,-5,4));
 const a=actor(),state={effect:'rocket',effectTime:5};advanceActor(a,state,0,0,1/60,{grid,map:'mall',speed:4});a.group.position.set(6,1.8,4);advanceActor(a,state,0,0,1/60,{grid,map:'mall',speed:4});assert.ok(a.group.position.y<2);state.effectTime=0;advanceActor(a,state,0,0,1/60,{grid,map:'mall',speed:4});assert.ok(safeLandingCell(grid,a.group.position.x,a.group.position.z));assert.ok(a.group.position.y<2);
});
test('walking still collides with walls and all-blocked grids cannot invent a landing',()=>{
 const grid=makeGrid(),a=actor();for(let z=0;z<9;z++)grid.blocked[z*12+4]=1;for(let i=0;i<120;i++)advanceActor(a,{effect:null,effectTime:0},1,0,1/60,{grid,map:'mall',speed:4});assert.ok(a.group.position.x<3.6);grid.blocked.fill(1);assert.equal(nearestLanding(grid,5,4),null);
});
