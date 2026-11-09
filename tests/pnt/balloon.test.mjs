import test from 'node:test';
import assert from 'node:assert/strict';
import {createRound} from '../../src/pnt/rules.js';
import {createBalloonRound,updateBalloonGuards,resolveBalloonHammer,balloonBotGoal,BALLOON_GUARD_COUNT,BALLOON_SPAWNS,BALLOON_VERSION} from '../../src/pnt/balloon-rules.js';
import {modeLoadout} from '../../src/pnt/loadout.js';
import {createLobby,lobbyMaps} from '../../src/pnt/lobby-state.js';
import {balloonGuardPathClear,slideBalloonGuards,createBalloonArenaData,BALLOON_ARENA_RADIUS,BALLOON_GUARD_RADIUS,BALLOON_GUARD_SPACING,BALLOON_GUARD_MAX_STRETCH} from '../../src/pnt/balloon-rules.js';
import {advanceActor} from '../../src/pnt/player-motion.js';
import * as THREE from '../../vendor/three/build/three.module.js';
import {sampleGround} from '../../src/pnt/motion.js';
import {updateBalloonLaunch,BALLOON_LAUNCH_SECONDS} from '../../src/pnt/balloon-launch.js';

test('guards retain momentum after the head stops and snapshots preserve velocity',()=>{
 const round=createBalloonRound(createRound()),p=positions();
 for(let i=0;i<60;i++){p[0].x+=.04;updateBalloonGuards(round,p,1/60);}
 const before=round.actors[0].guards.map(g=>g.slice());
 for(let i=0;i<15;i++)updateBalloonGuards(round,p,1/60);
 assert.ok(round.actors[0].guards.some((g,i)=>Math.hypot(g[0]-before[i][0],g[1]-before[i][1])>.1));
 assert.ok(round.actors[0].guardVelocities.some(v=>Math.hypot(...v)>.1));
 const restored=JSON.parse(JSON.stringify(round));updateBalloonGuards(round,p,1/60);updateBalloonGuards(restored,p,1/60);assert.deepEqual(restored.actors[0].guards,round.actors[0].guards);
});

test('balloon launch holds upright pose with two downward foot emitters and one pop/shake',()=>{
 let calls=0,pops=0,shakes=0;const group=new THREE.Group(),model=new THREE.Group();group.add(model);
 const actor={group,model,ring:{visible:true},shadow:{visible:true},seatMarker:{visible:true},anim:{play(name){assert.equal(name,'idle');},update(dt){assert.equal(dt,0);}},hammerImpact:1};
 const options={shake(strength){assert.ok(strength>1);shakes++;},fx:{balloonPop(position){assert.equal(position.y,2.95);pops++;},jetpack(a,state,dt,camera,options){assert.equal(state.caught,false);assert.equal(options.longTrail,true);assert.equal(options.vertical,true);assert.ok(Math.abs(a.jetpackNozzle.position.x)>.1);assert.equal(a.jetpackNozzle.rotation.x,0);calls++;}}};
 for(let i=0;i<60;i++)updateBalloonLaunch(actor,{eliminated:true},1/60,options);
 assert.equal(calls,120);assert.equal(pops,1);assert.equal(shakes,1);assert.ok(model.position.y>7);assert.equal(group.position.y,0);assert.equal(actor.ring.visible,false);assert.equal(actor.popLaunch.emitters.length,2);
 for(let i=0;i<Math.ceil(BALLOON_LAUNCH_SECONDS*60);i++)updateBalloonLaunch(actor,{eliminated:true},1/60,options);
 assert.equal(group.visible,false);
 assert.equal(pops,1);assert.equal(shakes,1);
});

test('tight chain stays bounded through sharp turns, stops and border contact',()=>{
 const round=createBalloonRound(createRound()),p=positions();
 for(let frame=0;frame<1200;frame++){
  const t=frame/60;p[0]={x:Math.sin(t*1.8)*8,z:Math.cos(t*1.8)*8};updateBalloonGuards(round,p,1/60);
  let leader=p[0];for(const guard of round.actors[0].guards){assert.ok(guard.every(Number.isFinite));assert.ok(Math.hypot(guard[0]-leader.x,guard[1]-leader.z)<=BALLOON_GUARD_SPACING*BALLOON_GUARD_MAX_STRETCH+.01);assert.ok(Math.hypot(...guard)<=BALLOON_ARENA_RADIUS-BALLOON_GUARD_RADIUS+.001);leader={x:guard[0],z:guard[1]};}
 }
});

test('resized arena has flat walkable ground across its full diameter',()=>{
 assert.equal(BALLOON_ARENA_RADIUS,10.296);const {grid}=createBalloonArenaData();
 for(let i=0;i<64;i++){const angle=i/64*Math.PI*2;assert.equal(sampleGround(grid,Math.sin(angle)*(BALLOON_ARENA_RADIUS-.5),Math.cos(angle)*(BALLOON_ARENA_RADIUS-.5)),0);}
});

test('guard collision stops crossing and tunnelling but permits escape from overlap',()=>{
 const state={guardColliders:[[0,0,.46]]};
 assert.equal(balloonGuardPathClear(state,-2,0,2,0),false);
 assert.equal(balloonGuardPathClear(state,-1,0,-.5,0),false);
 assert.equal(balloonGuardPathClear(state,-2,1,2,1),true);
 assert.equal(balloonGuardPathClear(state,.2,0,.5,0),true);
 assert.equal(balloonGuardPathClear(state,.5,0,.2,0),false);
});

test('living guard colliders replicate at the visible sphere sizes and retire on elimination',()=>{
 const round=createBalloonRound(createRound());updateBalloonGuards(round,positions(),1/60);
 assert.equal(round.actors[0].guardColliders.length,12);
 assert.ok(round.actors[0].guardColliders.every(collider=>collider[2]===BALLOON_GUARD_RADIUS));
 round.actors[1].eliminated=true;updateBalloonGuards(round,positions(),1/60);
 assert.equal(round.actors[0].guardColliders.length,8);
});

test('sliding contact blocks crossing while retaining sideways movement',()=>{
 const state={guardColliders:[[0,0,.46]]},from={x:-1,z:0},to={x:1,z:0};slideBalloonGuards(state,from,to);assert.ok(to.x<=-.78);
 const diagonal={x:0,z:.7};slideBalloonGuards(state,from,diagonal);assert.ok(diagonal.z>.6);assert.ok(Math.hypot(diagonal.x,diagonal.z)>=.78);
});

test('moving snakes cannot imprison an overlapped player between two spheres',()=>{
 const state={guardColliders:[[-.4,0,.46],[.4,0,.46]]},from={x:0,z:0},to={x:.6,z:1};slideBalloonGuards(state,from,to);assert.ok(to.z>.8);for(const [x,z,r] of state.guardColliders)assert.ok(Math.hypot(to.x-x,to.z-z)>=r+.32);
});

test('starting inside a sphere cannot bypass collision by walking through its far side',()=>{
 const state={guardColliders:[[0,0,.75]]},to={x:2,z:0};slideBalloonGuards(state,{x:-.9,z:0},to);assert.ok(to.x<=-1.07);
});

test('adjacent overlapping guards and border leave no penetrations or pass-through gaps',()=>{
 const state={guardColliders:[[0,-.65,.75],[0,.65,.75]]};
 for(const z of [-.1,0,.1]){const to={x:3,z};slideBalloonGuards(state,{x:-3,z},to);assert.ok(to.x<0);for(const [x,cz,r] of state.guardColliders)assert.ok(Math.hypot(to.x-x,to.z-cz)>=r+.32-1e-7);}
 const wall={guardColliders:[[9,0,.75]]},to={x:10,z:0};slideBalloonGuards(wall,{x:9.7,z:0},to);assert.ok(Math.hypot(to.x-9,to.z)>=1.07-1e-7);assert.ok(Math.hypot(to.x,to.z)<=BALLOON_ARENA_RADIUS-.42+1e-7);
});

test('moving guard spheres cannot cross or occupy stationary opponents',()=>{
 const round=createBalloonRound(createRound()),p=positions();p[0]={x:-3,z:0};p[1]={x:0,z:0};round.actors[0].guards=[[-1.08,0]];round.actors[0].guardVelocities=[[7,0]];
 for(let i=0;i<60;i++){updateBalloonGuards(round,p,1/60);const guard=round.actors[0].guards[0];assert.ok(Math.hypot(...guard)>=BALLOON_GUARD_RADIUS+.32-1e-7);assert.ok(guard[0]<0);}
});

test('own snake cannot stop reversing direction through its trail',()=>{
 const round=createBalloonRound(createRound()),p=positions();updateBalloonGuards(round,p,1/60);
 const actor={group:{position:new THREE.Vector3(...BALLOON_SPAWNS[0]),rotation:{y:0}},grounded:true},start=actor.group.position.clone();
 const {grid}=createBalloonArenaData();for(let i=0;i<120;i++)advanceActor(actor,round.actors[0],-1,0,1/60,{grid,map:'grassfield',speed:4});
 assert.ok(actor.group.position.x<start.x-3,'owner can reverse through its own tail');
});

const positions=()=>BALLOON_SPAWNS.map(([x,y,z])=>({x,y,z}));
test('quicksand moves a swinging player without changing Hammer aim',()=>{
 const round=createBalloonRound(createRound()),{grid}=createBalloonArenaData();
 const actor={group:{position:new THREE.Vector3(4,0,0),rotation:{y:Math.PI/2}},grounded:true};
 const state={...round.actors[0],effect:'hammer',effectTime:.48};
 for(let i=0;i<9;i++)advanceActor(actor,state,1,0,1/60,{grid,map:'grassfield',speed:4});
 assert.ok(actor.group.position.x<4);
 assert.equal(actor.group.rotation.y,Math.PI/2);
});

test('a third player’s living guard blocks Hammer but the attacker’s guard does not',()=>{
 const round=createBalloonRound(createRound()),p=[[0,0,0],[0,0,2.2],[2.8,0,1],[-5,0,5]],angles=[0,0,0,0];
 round.actors[0].guards=[[0,.5]];
 round.actors[1].guards=[];
 round.actors[2].guards=[[0,1.25]];
 assert.equal(resolveBalloonHammer(round,0,p,angles).blocked,true);
 assert.equal(round.actors[1].balloonIntact,true);
 round.actors[2].eliminated=true;
 assert.equal(resolveBalloonHammer(round,0,p,angles).blocked,false);
 assert.equal(round.actors[1].balloonIntact,false);
});

test('Balloon Bash creates four free-for-all players with fixed event tools',()=>{
 const round=createBalloonRound(createRound());assert.equal(round.mode,'balloon');assert.equal(round.eventVersion,BALLOON_VERSION);assert.equal(round.actors.length,4);assert.ok(round.actors.every(actor=>actor.role==='runner'&&actor.balloonIntact&&!actor.eliminated&&actor.guards.length===BALLOON_GUARD_COUNT));assert.deepEqual(modeLoadout('balloon',['rocket','smoke']),['hammer','banana']);
 const lobby=createLobby('thief','balloon');assert.equal(lobbyMaps(lobby)[0].id,'grassfield');assert.equal(lobbyMaps(lobby)[0].image,'balloonbash.png');
});

test('trailing guards follow the player as a spaced snake',()=>{
 const round=createBalloonRound(createRound()),p=positions(),before=round.actors[0].guards.map(guard=>guard.slice());p[0].x+=3;p[0].z+=1;for(let i=0;i<60;i++)updateBalloonGuards(round,p,1/60);
 assert.notDeepEqual(round.actors[0].guards,before);for(let i=1;i<round.actors[0].guards.length;i++){const a=round.actors[0].guards[i-1],b=round.actors[0].guards[i];assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<=BALLOON_GUARD_SPACING*BALLOON_GUARD_MAX_STRETCH+.01);}
});

test('a guard sphere blocks a rear hammer line but an exposed balloon pops',()=>{
 const round=createBalloonRound(createRound()),p=[{x:0,z:0},{x:0,z:2.2},{x:5,z:5},{x:-5,z:5}],angles=[0,Math.PI,0,0];
 round.actors[1].guards=[[0,1.25],[0,2.9],[0,3.7],[0,4.5]];let hit=resolveBalloonHammer(round,0,p,angles);assert.equal(hit.blocked,true);assert.equal(round.actors[1].balloonIntact,true);assert.equal(round.actors[0].blocks,1);
 round.actors[1].guards=[[1.6,2.4],[2.2,2.8],[2.8,3.2],[3.4,3.6]];hit=resolveBalloonHammer(round,0,p,angles);assert.equal(hit.blocked,false);assert.equal(round.actors[1].balloonIntact,false);assert.equal(round.actors[1].eliminated,true);assert.equal(round.actors[0].pops,1);
});

test('the last intact balloon wins and bots choose a living opponent',()=>{
 const round=createBalloonRound(createRound()),p=positions(),angles=[0,0,0,0];p[0]={x:0,z:0};round.actors[1].guards=round.actors[2].guards=round.actors[3].guards=[];
 for(const id of [1,2,3]){p[id]={x:0,z:2};resolveBalloonHammer(round,0,p,angles);p[id]={x:20,z:20};}
 assert.equal(round.phase,'finished');assert.equal(round.winnerId,0);assert.equal(round.reason,'last-standing');assert.equal(round.actors[0].pops,3);
 const goal=balloonBotGoal(createBalloonRound(createRound()),0,positions());assert.equal(goal.length,3);assert.ok(goal.every(Number.isFinite));
});
