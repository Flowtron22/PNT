import test from 'node:test';
import assert from 'node:assert/strict';
import {createRound} from '../../src/pnt/rules.js';
import {createBalloonRound,stepBalloon,resolveBalloonHammer,slideBalloonSpheres,createBalloonArenaData,BALLOON_ARENA_RADIUS,BALLOON_SPHERE_RADIUS,BALLOON_MAX_SPHERES} from '../../src/pnt/balloon-rules.js';
import {advanceActor} from '../../src/pnt/player-motion.js';
import * as THREE from '../../vendor/three/build/three.module.js';
import {sampleGround} from '../../src/pnt/motion.js';
import {updateBalloonLaunch,BALLOON_LAUNCH_SECONDS} from '../../src/pnt/balloon-launch.js';

test('initial batch falls at GO, lands, moves inward, sinks and is replenished',()=>{
 const round=createBalloonRound(createRound(),{seed:6201});round.startRemaining=.2;
 stepBalloon(round,.1);assert.equal(round.spheres.length,0);
 stepBalloon(round,.1);stepBalloon(round,.1);
 const batch=round.spheres.slice(),initialCount=batch.length;
 assert.ok(initialCount>=5&&initialCount<=10);
 assert.ok(batch.every(sphere=>sphere.phase==='falling'&&sphere.y>4));
 assert.deepEqual(round.actors[0].sphereColliders,[]);
 for(let i=0;i<20;i++)stepBalloon(round,.1);
 assert.ok(batch.every(sphere=>sphere.phase==='rolling'));
 assert.equal(round.actors[0].sphereColliders.length,initialCount);
 const radius=Math.hypot(batch[0].x,batch[0].z);
 for(let i=0;i<20;i++)stepBalloon(round,.1);
 assert.ok(Math.hypot(batch[0].x,batch[0].z)<radius);
 let sank=false;
 for(let i=0;i<400;i++){
  stepBalloon(round,.1);
  assert.ok(round.spheres.length<=BALLOON_MAX_SPHERES);
  if(batch.some(sphere=>sphere.phase==='sinking'&&sphere.y<0))sank=true;
 }
 assert.ok(sank);
 assert.ok(round.sphereId>initialCount);
 assert.ok(batch.every(sphere=>!round.spheres.includes(sphere)));
});

test('only landed spheres block Hammer and it takes two hits to eliminate',()=>{
 const round=createBalloonRound(createRound()),positions=[[0,0,0],[0,0,2.2],[5,0,5],[-5,0,5]],angles=[0,0,0,0];
 const target=round.actors[1],sphere={x:0,y:BALLOON_SPHERE_RADIUS,z:1.2,phase:'rolling'};
 round.spheres=[sphere];
 assert.equal(resolveBalloonHammer(round,0,positions,angles).blocked,true);
 assert.equal(target.balloons,2);
 sphere.phase='falling';sphere.y=4;
 assert.equal(resolveBalloonHammer(round,0,positions,angles).blocked,false);
 assert.equal(target.balloons,1);
 assert.equal(target.caught,false);
 assert.equal(target.eliminated,false);
 sphere.phase='sinking';sphere.y=-BALLOON_SPHERE_RADIUS;
 assert.equal(resolveBalloonHammer(round,0,positions,angles).blocked,false);
 assert.equal(target.balloons,0);
 assert.equal(target.eliminated,true);
 assert.equal(round.actors[0].pops,2);
});

test('shared sphere collision stops crossings and preserves sliding along the border',()=>{
 const state={sphereColliders:[[0,-.65,.75],[0,.65,.75]]};
 for(const z of [-.1,0,.1]){
  const to={x:3,z};slideBalloonSpheres(state,{x:-3,z:0},to);assert.ok(to.x<0);
  for(const [x,cz,r] of state.sphereColliders)assert.ok(Math.hypot(to.x-x,to.z-cz)>=r+.32-1e-7);
 }
 const wall={sphereColliders:[[9,0,.75]]},to={x:10,z:0};
 slideBalloonSpheres(wall,{x:9.7,z:0},to);
 assert.ok(Math.hypot(to.x-9,to.z)>=1.07-1e-7);
 assert.ok(Math.hypot(to.x,to.z)<=BALLOON_ARENA_RADIUS-.42+1e-7);
});

test('arena remains flat and walkable across the full diameter',()=>{
 const {grid}=createBalloonArenaData();
 for(let i=0;i<64;i++){const angle=i/64*Math.PI*2;assert.equal(sampleGround(grid,Math.sin(angle)*(BALLOON_ARENA_RADIUS-.5),Math.cos(angle)*(BALLOON_ARENA_RADIUS-.5)),0);}
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

test('quicksand moves a swinging player without changing Hammer aim',()=>{
 const round=createBalloonRound(createRound()),{grid}=createBalloonArenaData();
 const actor={group:{position:new THREE.Vector3(4,0,0),rotation:{y:Math.PI/2}},grounded:true};
 const state={...round.actors[0],effect:'hammer',effectTime:.48};
 for(let i=0;i<9;i++)advanceActor(actor,state,1,0,1/60,{grid,map:'grassfield',speed:4});
 assert.ok(actor.group.position.x<4);
 assert.equal(actor.group.rotation.y,Math.PI/2);
});
