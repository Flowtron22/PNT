import test from 'node:test';
import assert from 'node:assert/strict';
import {createRound} from '../../src/pnt/rules.js';
import {createSplashRound,splashPaint,stepSplash,splashAction,splashFire,ownPaint,splashClear,splashCanTarget,slideSplashCover,SPLASH_SPAWNS} from '../../src/pnt/splash-rules.js';
const round=()=>{const r=createSplashRound(createRound('runner',[]),{seed:42});r.startRemaining=0;return r;};
const positions=()=>SPLASH_SPAWNS.map(([x,y,z])=>({x,y,z}));
test('seeded square cover is repeatable and all four starting areas have equal turf',()=>{const r=round();assert.deepEqual(r.paintCover,round().paintCover);assert.equal(new Set(r.paintCounts).size,1);assert.equal(r.paintCover.length,8);assert.ok(r.paintTotal<256*256);for(const p of positions())assert.ok(splashClear(r.paintCover,p.x,p.z,.34));});
test('rival splashes transfer ownership and score exactly matches the paint map',()=>{const r=round();splashPaint(r,0,-9,-9,2.5);const before=r.paintCounts[0];splashPaint(r,1,-9,-9,2.5);assert.ok(r.paintCounts[0]<before);for(let i=0;i<4;i++)assert.equal(r.paintCounts[i],r.paint.split('').filter(c=>c===String(i+1)).length);});
test('Interact surfaces and fires after refilling without throwing a can',()=>{
 const r=round(),p=positions(),actor=r.actors[0];actor.ink=50;
 assert.ok(ownPaint(r,actor,p[0]));
 splashAction(r,0,0,p[0],0);stepSplash(r,.1,p);
 assert.equal(actor.ink,54.2);
 splashFire(r,0,p[0],0,true);
 assert.equal(actor.spraying,true);assert.equal(actor.diving,false);assert.equal(actor.submerged,false);
 assert.equal(actor.shots,1);assert.equal(actor.cans,0);
 assert.ok(splashAction(r,0,1,p[0],0));
 assert.ok(Math.abs(actor.ink-21.7)<1e-8);
 assert.equal(splashAction(r,0,1,p[0],0),false);
});
test('swept player movement cannot tunnel through boxes or arena walls',()=>{const r=round(),b=r.paintCover[0],from={x:b.x-b.w/2-1,z:b.z},to={x:b.x+b.w/2+1,z:b.z};slideSplashCover(r.actors[0],from,to);assert.ok(to.x<b.x-b.w/2);const edge={x:50,z:-9};slideSplashCover(r.actors[0],positions()[0],edge);assert.ok(edge.x<12-.33);});
test('hose stops at cover without painting through it',()=>{const r=round(),b=r.paintCover[0],p=positions();p[0]={x:b.x-b.w/2-1,z:b.z};splashFire(r,0,p[0],Math.PI/2,true);for(let i=0;i<12;i++)stepSplash(r,.1,p);assert.equal(r.paintShots.length,0);assert.ok(r.paintBursts.length>0);assert.equal(ownPaint(r,r.actors[0],{x:b.x+b.w/2+.3,z:b.z}),false);});
test('countdown freezes scoring and timer; timeout selects coverage winner or draw and stops late shots',()=>{const r=round(),p=positions();r.startRemaining=1;stepSplash(r,.1,p);assert.equal(r.remaining,120);r.startRemaining=0;splashPaint(r,2,9,9,2.5);r.remaining=.05;stepSplash(r,.1,p);assert.equal(r.phase,'finished');assert.equal(r.winnerId,2);const count=r.paintShotId;splashFire(r,0,p[0],0,true);assert.equal(r.paintShotId,count);const tied=round();tied.paintCounts=[10,10,2,2];tied.remaining=.01;stepSplash(tied,.1,p);assert.equal(tied.reason,'draw');});
import {createCouchLobby,couchCommand} from '../../src/pnt/couch-state.js';
import {modeLoadout} from '../../src/pnt/loadout.js';
import {activateTool} from '../../src/pnt/rules.js';
test('Splash couch navigation skips removed tool rows and classic tools are disabled',()=>{const room=createCouchLobby('thief',['hammer','banana']);room.gameMode='splash';couchCommand(room,0,'down');assert.equal(room.players[0].cursor,3);couchCommand(room,0,'accept');assert.equal(room.players[0].ready,true);couchCommand(room,0,'up');assert.equal(room.players[0].cursor,0);assert.deepEqual(modeLoadout('splash',['hammer','banana']),[]);assert.equal(activateTool(round(),0,0,'hammer'),false);});

test('cover moves across seeds and keeps the four spawn puddles clear',()=>{
 const base=createRound('runner',[]),first=round();
 for(let seed=0;seed<12;seed++){
  const r=createSplashRound(base,{seed:Math.imul(seed+1,2654435761)});
  assert.notDeepEqual(r.paintCover.map(({x,z})=>[x,z]),first.paintCover.map(({x,z})=>[x,z]));
  assert.equal(new Set(r.paintCounts).size,1);
  for(const p of positions())assert.ok(splashClear(r.paintCover,p.x,p.z,1.65));
 }
});
test('hose holds a continuous short aim and turns off when released',()=>{
 const r=round(),p=positions();r.paintCover=[];p[0]={x:0,z:-3};
 splashFire(r,0,p[0],0,true);
 assert.equal(r.paintShots.length,0);assert.equal(r.paintBursts.length,1);assert.equal(r.paintBursts[0].r,1.38);
 assert.ok(r.paintBursts[0].z-p[0].z>3&&r.paintBursts[0].z-p[0].z<3.4);
 splashFire(r,0,p[0],0,true);
 assert.equal(r.actors[0].spraying,true);assert.equal(r.paintBursts.length,1);
 splashFire(r,0,p[0],0,false);assert.equal(r.actors[0].spraying,false);
});
test('paint can clears cover on its arc and lands at the previewed point',()=>{
 const r=round(),p=positions();p[0]={x:-4,z:0};
 r.paintCover=[{x:-1,z:0,w:2,d:2,h:2.3}];
 const target=splashCanTarget(r.paintCover,p[0],Math.PI/2);
 assert.equal(target.x,2);
 assert.ok(splashAction(r,0,1,p[0],Math.PI/2));
 assert.ok(r.paintShots[0].age<0&&r.actors[0].throwTime>0);
 for(let i=0;i<24;i++)stepSplash(r,1/60,p);
 assert.ok(r.paintShots[0].y>3.5);
 for(let i=0;i<39;i++)stepSplash(r,1/60,p);
 assert.equal(r.paintShots.length,0);
 assert.equal(r.paintBursts[0].x,target.x);
 assert.ok(Math.abs(r.paintBursts[0].z-target.z)<1e-8);
});
