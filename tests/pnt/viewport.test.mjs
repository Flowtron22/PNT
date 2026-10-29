import test from 'node:test';
import assert from 'node:assert/strict';
import {DESIGN_WIDTH,DESIGN_HEIGHT,fitGameViewport,gamePixelRatio,gameHost} from '../../src/pnt/viewport.js';
import {matchView} from '../../src/pnt/camera-rig.js';
import {fullscreenMode,configureFullscreen} from '../../src/pnt/fullscreen.js';
import {configureLandscape} from '../../src/pnt/landscape.js';

test('PC, iPad, iPhone and ultrawide screens fit the same centred game canvas without cropping',()=>{
 const sizes=[[1920,1080],[1024,768],[1180,820],[1366,1024],[932,430],[896,414],[3440,1440],[430,932]];
 const reference=matchView(DESIGN_WIDTH/DESIGN_HEIGHT,{x:12,z:14});
 for(const [width,height] of sizes){
  const fit=fitGameViewport(width,height);
  assert.ok(Math.abs(fit.width/fit.height-16/9)<1e-9);
  assert.ok(fit.width<=width+1e-8&&fit.height<=height+1e-8);assert.ok(fit.x>=-1e-8&&fit.y>=-1e-8);
  assert.ok(Math.abs(fit.x*2+fit.width-width)<1e-8&&Math.abs(fit.y*2+fit.height-height)<1e-8);
  // A point in the menu, HUD or 3D projection maps back to the same design point.
  for(const [x,y] of [[200,250],[1000,500],[800,70]]){const physical={x:fit.x+x*fit.scale,y:fit.y+y*fit.scale};assert.ok(Math.abs((physical.x-fit.x)/fit.scale-x)<1e-8);assert.ok(Math.abs((physical.y-fit.y)/fit.scale-y)<1e-8);}
  assert.ok(Math.abs(matchView(fit.width/fit.height,{x:12,z:14}).distance-reference.distance)<1e-8);
 }
});

test('GPU framebuffer follows physical frame pixels instead of rendering desktop resolution on a phone',()=>{
 for(const [width,height,dpr] of [[932,430,3],[1024,768,2],[1920,1080,1],[3840,2160,1]]){
  const fit=fitGameViewport(width,height),ratio=gamePixelRatio(dpr,fit.scale,'balanced');
  assert.ok(Math.abs(DESIGN_WIDTH*ratio-fit.width*Math.min(dpr,1.5))<1e-8);
  assert.ok(Math.abs(DESIGN_HEIGHT*gamePixelRatio(dpr,fit.scale,'battery')-fit.height)<1e-8);
 }
});

test('framed game fullscreen uses the outer document so landscape and borders stay intact',async()=>{
 const host={pntFrame:{},navigator:{},matchMedia:()=>({matches:false})},doc={fullscreenEnabled:true,documentElement:{},exitFullscreen:async()=>{doc.fullscreenElement=null;}};host.document=doc;
 doc.documentElement.requestFullscreen=async()=>{doc.fullscreenElement=doc.documentElement;};const win={parent:host},button={},status={};
 assert.equal(gameHost(win),host);assert.equal(fullscreenMode({},win),'native');configureFullscreen(button,status,{},win);await button.onclick();assert.equal(doc.fullscreenElement,doc.documentElement);await button.onclick();assert.equal(doc.fullscreenElement,null);
 assert.equal(gameHost({parent:{get pntFrame(){throw Error('Cross origin');}}}),null);
});

test('framed touch input delegates orientation to the real screen and follows its blocked state',()=>{
 const events=new Map();let attempts=0,notified=null;
 const host={pntFrame:{blocked:true,requestLandscape(){attempts++;}}};
 const win={parent:host,addEventListener:(name,fn)=>events.set(name,fn)};
 const doc={addEventListener:(name,fn)=>events.set(name,fn),createElement(){assert.fail('no duplicate orientation overlay inside the scaled game');}};
 const orientation=configureLandscape({win,doc,onChange:blocked=>notified=blocked});assert.equal(orientation.blocked,true);
 events.get('pointerup')();assert.equal(attempts,1);host.pntFrame.blocked=false;events.get('pnt-viewport')();assert.equal(orientation.blocked,false);assert.equal(notified,false);
});
