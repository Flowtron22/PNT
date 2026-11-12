import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {GALAH_WIDTH, GALAH_END, GALAH_RUN_LINE, GALAH_RUNWAY_END, GALAH_CROSSBARS, galahCanMove} from '../../src/pnt/galah-rules.js';
import {canTraverse} from '../../src/pnt/collision.js';
import {PerspectiveCamera, Vector3} from '../../vendor/three/build/three.module.js';
import {localSnapshot} from '../../src/pnt/multiplayer.js';
import {CAPTURE_LOCK_SECONDS} from '../../src/pnt/capture-timing.js';

registerHooks({resolve(specifier, context, next) {
 if (specifier === 'three') return next(new URL('../../vendor/three/build/three.module.js', import.meta.url).href, context);
 return next(specifier, context);
}});
const {MatchSimulation} = await import('../simulation.mjs');
const {galahCameraView, GALAH_CAMERA_LIFT, GALAH_CAMERA_ZOOM} = await import('../../src/pnt/galah-view.js');
const players = Array.from({length:4}, (_, id) => ({sessionId:String(id), bot:false}));

test('Galah guards stay on their own rails and cannot use classic tools', async () => {
 const sim = await MatchSimulation.create('grassfield', players, 'galah');
 assert.deepEqual(sim.round.actors.map(a => a.galahRole), ['runner','leader','runner','guard']);
 assert.equal(sim.tool(1, 0), false);
 assert.equal(galahCanMove('leader', 2, -GALAH_END), true);
 assert.equal(galahCanMove('leader', 2, 0), false);
 assert.deepEqual(GALAH_CROSSBARS, [0, GALAH_END]);
 assert.equal(galahCanMove('guard', 0, 0), true);
 assert.equal(galahCanMove('guard', GALAH_WIDTH - .15, 3), true);
 assert.equal(galahCanMove('guard', 0, 3), false);
 const lead = sim.actors[1].group.position;
 for (let i = 1; i <= 60; i++) {
  sim.input(1, {seq:i,x:1,z:0});
  sim.step();
 }
 assert.ok(lead.x > 2);
 for (let i = 61; i <= 120; i++) {
  sim.input(1, {seq:i,x:0,z:1});
  sim.step();
 }
 assert.ok(lead.z < -GALAH_END + .33);
});

test('the four-box court stays traversable and its runways fit the zoomed camera', async () => {
 const sim = await MatchSimulation.create('grassfield', players, 'galah');
 assert.ok(Math.abs((GALAH_WIDTH * GALAH_END) / (3.6 * 5.4) - 2) < .01);
 for (let x = -GALAH_WIDTH; x <= GALAH_WIDTH; x += .2) {
  for (let z = -GALAH_RUNWAY_END; z <= GALAH_RUNWAY_END; z += .2) {
   assert.ok(canTraverse(sim.grid,x,z,x+.08,z+.08), 'blocked court cell at '+[x,z]);
  }
 }
 for (const aspect of [16/9, 16/10, 4/3]) {
  const camera = new PerspectiveCamera(30,aspect,.1,180);
  camera.zoom = GALAH_CAMERA_ZOOM;
  camera.updateProjectionMatrix();
  camera.position.fromArray(galahCameraView(aspect).offset);
  camera.position.y += GALAH_CAMERA_LIFT;
  camera.lookAt(0,GALAH_CAMERA_LIFT,0);
  camera.updateMatrixWorld();
  for (const x of [-GALAH_WIDTH, GALAH_WIDTH]) {
   for (const z of [-GALAH_RUNWAY_END, GALAH_RUNWAY_END]) {
    const point = new Vector3(x,1.6,z).project(camera);
    assert.ok(Math.abs(point.x) < .94 && point.y > -.91 && point.y < .78);
   }
  }
 }
});

test('Galah runners reverse quickly and the line guard can turn onto the sideline', async () => {
 const sim = await MatchSimulation.create('grassfield', players, 'galah');
 const runner = sim.actors[0], guard = sim.actors[3];
 for (let seq = 1; seq <= 120; seq++) {
  sim.input(3,{seq,x:seq <= 85 ? 1 : 0,z:seq <= 85 ? 0 : 1});
  if (seq > 100) sim.input(0,{seq,x:seq <= 114 ? 1 : -1,z:0});
  sim.step();
 }
 assert.ok(guard.group.position.x > GALAH_WIDTH-.32 && guard.group.position.z > 1.5);
 assert.ok(runner.vx < -4);
 assert.ok(Math.abs(runner.group.rotation.y + Math.PI/2) < .25);
});

test('Galah runners glide after releasing movement', async () => {
 const sim = await MatchSimulation.create('grassfield', players, 'galah');
 const runner = sim.actors[0];
 for (let seq = 1; seq <= 30; seq++) {
  sim.input(0,{seq,x:1,z:0});
  sim.step();
 }
 const releaseX = runner.group.position.x;
 sim.input(0,{seq:31,x:0,z:0});
 for (let i = 0; i < 12; i++) sim.step();
 assert.ok(runner.vx > 1.5);
 assert.ok(runner.group.position.x > releaseX + .6);
 for (let i = 0; i < 90; i++) sim.step();
 assert.ok(runner.vx < .01);
 assert.ok(runner.group.position.x < releaseX + 1.3);
});

test('Galah scores a complete circuit once and resumes the role swap after host restore', async () => {
 const sim = await MatchSimulation.create('grassfield', players, 'galah');
 const [runner, lead, partner] = sim.actors;
 runner.group.position.set(-2,0,-GALAH_RUN_LINE);
 sim.step();
 assert.equal(sim.round.score[0], 0);
 runner.group.position.set(-2,0,GALAH_RUN_LINE+.01);
 sim.step();
 assert.equal(sim.round.actors[0].galahStatus, 'returning');
 runner.group.position.set(-2,0,-GALAH_RUN_LINE-.01);
 sim.step();
 assert.equal(sim.round.actors[0].galahStatus, 'scored');
 assert.deepEqual(sim.round.score,[1,0]);
 partner.group.position.copy(lead.group.position);
 sim.step();
 assert.equal(sim.round.half, 0);
 assert.equal(sim.round.actors[2].caught, true);
 assert.equal(sim.round.actors[2].caughtTime, 0);
 assert.deepEqual(sim.events, [{id:1,type:'capture',actor:2,position:partner.group.position.toArray(),policePosition:lead.group.position.toArray()}]);
 const checkpoint = JSON.parse(JSON.stringify(sim.snapshot()));
 const restored = await MatchSimulation.restore(checkpoint, players);
 assert.deepEqual(restored.snapshot(), checkpoint);
 const caughtGuest = localSnapshot(checkpoint, players, '2');
 assert.equal(caughtGuest.round.actors[0].caught, true);
 assert.equal(caughtGuest.events[0].actor, 0);
 for (let i = 0; i < CAPTURE_LOCK_SECONDS * 60 - 1; i++) restored.step();
 assert.equal(restored.round.half, 0);
 assert.equal(restored.events.length, 1);
 restored.step();
 assert.equal(restored.round.half, 1);
 assert.equal(restored.round.startRemaining, 3);
 assert.deepEqual(restored.round.actors.map(a => a.galahRole), ['leader','runner','guard','runner']);
 assert.equal(restored.round.actors[2].caught, false);
 const guest = localSnapshot(restored.snapshot(), players, '3');
 assert.equal(guest.round.actors[0].team, 1);
 assert.equal(guest.round.actors[0].galahRole, 'runner');
 for (let i = 0; i < 185; i++) restored.step();
 restored.actors[1].group.position.copy(restored.actors[0].group.position);
 restored.step();
 assert.equal(restored.round.actors[1].galahStatus, 'tagged');
 restored.round.remaining = 1/60;
 restored.step();
 assert.equal(restored.round.phase, 'playing');
 assert.equal(restored.round.actors[3].galahStatus, 'timeout');
 for (let i = 1; i < CAPTURE_LOCK_SECONDS * 60; i++) restored.step();
 assert.equal(restored.round.phase, 'finished');
 assert.equal(restored.round.winnerTeam, 0);
 assert.deepEqual(restored.round.score,[1,0]);
});
