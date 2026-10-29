import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutUnit,menuPreviewFrame} from '../../src/pnt/viewport.js';
import {matchView,stageFraming} from '../../src/pnt/camera-rig.js';
const sizes=[[1920,1080],[1600,900],[1024,768],[1180,820],[932,430],[896,414],[3440,1440]];

test('shared UI unit scales with the limiting screen dimension without fixing the renderer aspect',()=>{
 assert.equal(layoutUnit(1600,900),16);assert.equal(layoutUnit(1024,768),10.24);
 assert.ok(Math.abs(layoutUnit(932,430)-430/56.25)<1e-8);
});
test('menu character fits between actual menu and profile bounds across desktop, iPad and phones',()=>{
 for(const [width,height] of sizes){
  const u=layoutUnit(width,height),left=27.8*u,right=width-30.2*u;
  const shot=menuPreviewFrame({width,height,left,right});
  const projectedWidth=1.6*shot.pixelsPerUnit,projectedHeight=2.325*shot.pixelsPerUnit;
  assert.ok(shot.x-projectedWidth/2>left&&shot.x+projectedWidth/2<right);
  assert.ok(projectedHeight<=height*.68+1e-8);assert.ok(shot.distance>0);
  assert.ok(Math.abs(height/(2*Math.tan(Math.PI/9)*shot.distance)-shot.pixelsPerUnit)<1e-8);
 }
});
test('tools and costume camera responds to panel width instead of a device-specific offset',()=>{
 for(const [width,height] of sizes){
  const u=layoutUnit(width,height),left=3.6*u+Math.min(52*u,width*.54);
  const shot=menuPreviewFrame({width,height,left,right:width,mode:'costume'});
  assert.ok(shot.x-1.6*shot.pixelsPerUnit/2>left);assert.ok(shot.x+1.6*shot.pixelsPerUnit/2<width);
  const wider=menuPreviewFrame({width,height,left:left+u*2,right:width,mode:'costume'});
  assert.ok(wider.x>shot.x);assert.ok(wider.distance>=shot.distance-1e-8);
 }
});
test('full-screen gameplay preserves vertical FOV and pulls back only to fit important stage bounds',()=>{
 const reference=matchView(16/9),stage=stageFraming([[-12,0,-17],[12,0,17]],[{position:[0,0,20]}]);
 for(const [width,height] of sizes){
  const aspect=width/height,base=matchView(aspect),view=matchView(aspect,stage);
  assert.equal(base.distance,reference.distance);assert.ok(Math.abs(base.width/base.height-aspect)<1e-8);
  assert.ok(view.distance>=base.distance);const tan=Math.tan(Math.PI/12);
  for(const x of [-stage.x,stage.x])for(const z of [-stage.z,stage.z]){const depth=view.distance+x*.509;assert.ok(Math.abs(z)<=depth*tan*aspect+1e-8);assert.ok(Math.abs(x*.861)<=depth*tan+1e-8);}
 }
});
