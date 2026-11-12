export const GALAH_VERSION = 2;
export const GALAH_HALF_SECONDS = 45;
export const GALAH_WIDTH = 5.1;
export const GALAH_END = 7.6;
export const GALAH_CROSSBARS = [0, GALAH_END];
export const GALAH_ROLE_LABELS = {runner:'Runner', leader:'Lead guard', guard:'Line guard'};
export const GALAH_STATUS_LABELS = {outbound:'Cross the court', returning:'Return home', tagged:'Tagged', scored:'Scored', timeout:'Time up'};
export const GALAH_GUIDE = 'Runners cross the far line and return home to score. Guards tag by touch. The lead guard uses the blue front and center lines. The line guard uses the red crossbars and connects via the sidelines. Swap roles after each team’s turn.';

export const GALAH_RUN_LINE = GALAH_END + .52;
export const GALAH_RUNWAY_END = GALAH_END + 1.15;
const RAIL_MARGIN = .32;
const TAG_RANGE = .8;
const laneCenter = id => (id < 2 ? -.5 : .5) * GALAH_WIDTH;

export function createGalahRound(base) {
 const actors = base.actors.map(actor => ({...actor, role:'runner', team:actor.id % 2, circuits:0}));
 const round = {...base, mode:'galah', playerRole:'runner', actors, caches:[], totalMoney:0, score:[0,0], winnerTeam:null, elapsed:0};
 prepareHalf(round, 0);
 return round;
}

function prepareHalf(round, half) {
 round.half = half;
 round.remaining = GALAH_HALF_SECONDS;
 for (const actor of round.actors) {
  actor.galahRole = actor.team === half ? 'runner' : actor.id < 2 ? 'leader' : 'guard';
  actor.galahStatus = actor.galahRole === 'runner' ? 'outbound' : null;
 }
}

export function galahSpawn(actor) {
 if (actor.galahRole === 'leader') return [0, -GALAH_END];
 if (actor.galahRole === 'guard') return [0, GALAH_CROSSBARS[0]];
 return [laneCenter(actor.id), -GALAH_END - .9];
}

export function placeGalahPlayer(actor, state, heightAt) {
 const [x, z] = galahSpawn(state);
 actor.group.position.set(x, heightAt(x, z), z);
 actor.group.rotation.y = state.galahRole === 'runner' ? 0 : Math.PI;
 actor.spawn = actor.group.position.clone();
 Object.assign(actor, {vx:0, vz:0, slideX:0, speed:0, velocity:0, grounded:true, warp:(actor.warp || 0) + 1});
}

export function galahCanMove(role, x, z) {
 const near = (value, target) => Math.abs(value - target) <= RAIL_MARGIN;
 if (role === 'runner') return Math.abs(x) <= GALAH_WIDTH - .24 && Math.abs(z) <= GALAH_RUNWAY_END;
 if (Math.abs(x) > GALAH_WIDTH || Math.abs(z) > GALAH_END) return false;
 if (role === 'leader') return near(z, -GALAH_END) || near(x, 0);
 return z >= GALAH_CROSSBARS[0] - RAIL_MARGIN &&
  (near(Math.abs(x), GALAH_WIDTH) || GALAH_CROSSBARS.some(line => near(z, line)));
}

export function galahRunnerActive(actor) {
 return actor.galahStatus === 'outbound' || actor.galahStatus === 'returning';
}

// Local play and Steam authority both resolve contacts after movement.
export function beginGalahTick(round, dt) {
 if (round.startRemaining > 0) {
  const next = round.startRemaining - dt;
  round.startRemaining = next < 1e-8 ? 0 : next;
 }
}

export function finishGalahTick(round, actors, dt, heightAt) {
 const guards = round.actors.filter(actor => actor.galahRole !== 'runner');
 const runners = round.actors.filter(actor => actor.galahRole === 'runner');
 for (const runner of runners.filter(galahRunnerActive)) {
  const point = actors[runner.id].group.position;
  const tagged = guards.some(guard => {
   const other = actors[guard.id].group.position;
   return Math.hypot(point.x - other.x, point.z - other.z) <= TAG_RANGE;
  });
  if (tagged) runner.galahStatus = 'tagged';
  else if (runner.galahStatus === 'outbound' && point.z >= GALAH_RUN_LINE) runner.galahStatus = 'returning';
  else if (runner.galahStatus === 'returning' && point.z <= -GALAH_RUN_LINE) {
   runner.galahStatus = 'scored';
   runner.circuits++;
   round.score[runner.team]++;
  }
 }
 round.elapsed += dt;
 round.remaining = Math.max(0, round.remaining - dt);
 if (round.remaining > 1e-8 && runners.some(galahRunnerActive)) return;
 for (const runner of runners.filter(galahRunnerActive)) runner.galahStatus = 'timeout';
 if (round.half === 0) {
  prepareHalf(round, 1);
  round.startRemaining = 3;
  for (const actor of round.actors) placeGalahPlayer(actors[actor.id], actor, heightAt);
 } else {
  const [blue, red] = round.score;
  round.phase = 'finished';
  round.winnerTeam = blue === red ? null : blue > red ? 0 : 1;
  round.reason = blue === red ? 'draw' : 'circuits';
 }
}

function botMove(point, x, z) {
 // Slow down near intersections so a bot can enter the perpendicular rail.
 return {x:(x - point.x) * 5, z:(z - point.z) * 5, interact:false};
}

export function galahBotInput(round, id, actors) {
 const actor = round.actors[id], point = actors[id].group.position;
 const opponents = round.actors.filter(other => other.team !== actor.team);
 if (actor.galahRole === 'runner') {
  const lane = laneCenter(id);
  const direction = actor.galahStatus === 'returning' ? -1 : 1;
  return botMove(point, lane, direction * (GALAH_RUN_LINE + .22));
 }
 const targets = opponents.filter(galahRunnerActive).map(other => actors[other.id].group.position);
 targets.sort((a, b) => Math.hypot(a.x - point.x, a.z - point.z) - Math.hypot(b.x - point.x, b.z - point.z));
 const target = targets[0];
 if (!target) return botMove(point, point.x, point.z);
 if (actor.galahRole === 'leader') {
  if (target.z < -GALAH_END + .9) {
   if (point.z > -GALAH_END + .12) return botMove(point, 0, -GALAH_END);
   return botMove(point, target.x, -GALAH_END);
  }
  if (Math.abs(point.x) > .12) return botMove(point, 0, -GALAH_END);
  return botMove(point, 0, Math.max(-GALAH_END, Math.min(GALAH_END, target.z)));
 }
 const crossbar = GALAH_CROSSBARS.reduce((best, line) => Math.abs(line - target.z) < Math.abs(best - target.z) ? line : best);
 if (Math.abs(point.z - crossbar) <= .13) return botMove(point, target.x, crossbar);
 const side = (point.x < 0 ? -1 : 1) * (GALAH_WIDTH - .05);
 if (Math.abs(point.x) < GALAH_WIDTH - .16) {
  const current = GALAH_CROSSBARS.reduce((best, line) => Math.abs(line - point.z) < Math.abs(best - point.z) ? line : best);
  return botMove(point, side, current);
 }
 return botMove(point, side, crossbar);
}
