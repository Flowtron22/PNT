import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {GALAH_END, GALAH_RUN_LINE, galahCanMove} from '../../src/pnt/galah-rules.js';
import {localSnapshot} from '../../src/pnt/multiplayer.js';

registerHooks({resolve(specifier, context, next) {
 if (specifier === 'three') return next(new URL('../../vendor/three/build/three.module.js', import.meta.url).href, context);
 return next(specifier, context);
}});
const {MatchSimulation} = await import('../simulation.mjs');
const players = Array.from({length:4}, (_, id) => ({sessionId:String(id), bot:false}));

test('Galah guards stay on their own rails and cannot use classic tools', async () => {
 const sim = await MatchSimulation.create('grassfield', players, 'galah');
 assert.deepEqual(sim.round.actors.map(a => a.galahRole), ['runner','leader','runner','guard']);
 assert.equal(sim.tool(1, 0), false);
 assert.equal(galahCanMove('leader', 2, -GALAH_END), true);
 assert.equal(galahCanMove('leader', 2, 0), false);
 assert.equal(galahCanMove('guard', 0, -1.8), true);
 assert.equal(galahCanMove('guard', 3.5, 0), true);
 assert.equal(galahCanMove('guard', 0, 0), false);
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
 assert.ok(lead.z < -5.19);
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
 assert.equal(sim.round.half, 1);
 assert.equal(sim.round.startRemaining, 3);
 assert.deepEqual(sim.round.actors.map(a => a.galahRole), ['leader','runner','guard','runner']);
 const checkpoint = JSON.parse(JSON.stringify(sim.snapshot()));
 const restored = await MatchSimulation.restore(checkpoint, players);
 assert.deepEqual(restored.snapshot(), checkpoint);
 const guest = localSnapshot(checkpoint, players, '3');
 assert.equal(guest.round.actors[0].team, 1);
 assert.equal(guest.round.actors[0].galahRole, 'runner');
 for (let i = 0; i < 185; i++) restored.step();
 restored.actors[1].group.position.copy(restored.actors[0].group.position);
 restored.step();
 assert.equal(restored.round.actors[1].galahStatus, 'tagged');
 restored.round.remaining = 1/60;
 restored.step();
 assert.equal(restored.round.phase, 'finished');
 assert.equal(restored.round.winnerTeam, 0);
 assert.deepEqual(restored.round.score,[1,0]);
});
