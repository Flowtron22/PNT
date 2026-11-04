import test from 'node:test';
import assert from 'node:assert/strict';
import {createRound} from '../../src/pnt/rules.js';
import {createTiletideRound,stepTiletide,tileArenaContains,tileContains,TILE_POSITIONS,TILETIDE_VERSION,TILE_IDLE_SECONDS,TILE_RUN_SECONDS,TILE_RETURN_SECONDS,TILE_STUN_SECONDS} from '../../src/pnt/tiletide-rules.js';
import {modeLoadout} from '../../src/pnt/loadout.js';
import {readFileSync} from 'node:fs';

const positions=round=>round.actors.map((_,id)=>({x:TILE_POSITIONS[round.safeTile][0]+id*.1,y:0,z:TILE_POSITIONS[round.safeTile][2]}));

test('Tile Tumble creates a four-player free-for-all with the fixed event kit',()=>{
 const round=createTiletideRound(createRound());assert.equal(round.mode,'tiletide');assert.equal(round.eventVersion,TILETIDE_VERSION);assert.equal(round.actors.length,4);assert.ok(round.actors.every(a=>a.role==='runner'&&!a.eliminated));assert.deepEqual(modeLoadout('tiletide',['rocket','smoke']),['hammer','banana']);assert.equal(TILE_STUN_SECONDS,2);
});

test('players outside the called tile are eliminated when the timer expires',()=>{
 const round=createTiletideRound(createRound(),{seed:8});round.safeTile=0;const safe=TILE_POSITIONS[round.safeTile],wrongA=TILE_POSITIONS[1],wrongB=TILE_POSITIONS[2],poses=[{x:safe[0],y:0,z:safe[2]},{x:wrongA[0],y:0,z:wrongA[2]},{x:safe[0]+.4,y:0,z:safe[2]},{x:wrongB[0],y:0,z:wrongB[2]}];round.tileStage='run';round.tileClock=.01;stepTiletide(round,.02,poses);assert.equal(round.tileStage,'reveal');assert.deepEqual(round.actors.map(a=>a.eliminated),[false,true,false,true]);assert.deepEqual(round.actors.map(a=>!!a.fell),[false,true,false,true]);assert.equal(round.actors[1].fallDelay,.32);assert.equal(round.phase,'playing');
});

test('leaving the connected platform footprint eliminates the player as a fall',()=>{assert.equal(tileArenaContains({x:0,z:0}),true);assert.equal(tileArenaContains({x:8,z:10}),false);const round=createTiletideRound(createRound());round.startRemaining=0;stepTiletide(round,.05,[{x:8,z:10},{x:0,z:0},{x:1,z:0},{x:-1,z:0}]);assert.equal(round.actors[0].eliminated,true);assert.equal(round.actors[0].fell,true);});

test('gameplay containment follows the visible hex edges instead of a surrounding circle',()=>{const round=createTiletideRound(createRound());round.safeTile=6;assert.equal(tileContains(round,{x:2,z:0}),true);assert.equal(tileContains(round,{x:2.3,z:0}),false);assert.equal(tileArenaContains({x:6.8,z:0}),false);});

test('only the retained safe tile remains valid ground during the drop phase',()=>{const round=createTiletideRound(createRound());round.startRemaining=0;round.safeTile=6;round.tileStage='reveal';round.tileClock=1;const safe=TILE_POSITIONS[6],removed=TILE_POSITIONS[0],poses=[{x:removed[0],z:removed[2]},{x:safe[0],z:safe[2]},{x:safe[0]+.2,z:safe[2]},{x:safe[0]-.2,z:safe[2]}];stepTiletide(round,.02,poses);assert.equal(round.actors[0].eliminated,true);assert.equal(round.actors[0].fell,true);assert.ok(round.actors.slice(1).every(actor=>!actor.eliminated));});

test('platforms return before four seconds of free movement, then allow three seconds to reach the announced tile',()=>{const round=createTiletideRound(createRound());round.startRemaining=0;const centre=round.actors.map((_,id)=>({x:id*.1,y:0,z:0}));assert.equal(TILE_RUN_SECONDS,3);assert.equal(round.tileStage,'idle');assert.equal(round.tileClock,4);round.tileClock=.01;stepTiletide(round,.02,centre);assert.equal(round.tileStage,'run');assert.equal(round.tileClock,TILE_RUN_SECONDS);assert.ok(round.safeTile>=0);const retained=positions(round);round.tileStage='reveal';round.tileClock=.01;stepTiletide(round,.02,retained);assert.equal(round.tileStage,'return');assert.equal(round.tileClock,TILE_RETURN_SECONDS);assert.equal(round.safeTile,-1);round.tileClock=.01;stepTiletide(round,.02,retained);assert.equal(round.tileStage,'idle');assert.equal(round.tileClock,TILE_IDLE_SECONDS);round.tileClock=.01;stepTiletide(round,.02,retained);assert.equal(round.tileStage,'run');assert.equal(round.tileClock,TILE_RUN_SECONDS);assert.ok(round.safeTile>=0);});

test('late-round closest-player tiebreak ends a match that everyone survives',()=>{
 const round=createTiletideRound(createRound(),{seed:4});round.cycle=10;round.safeTile=0;round.tileStage='run';round.tileClock=.01;const poses=positions(round);stepTiletide(round,.02,poses);assert.equal(round.phase,'finished');assert.equal(round.winnerId,0);assert.equal(round.reason,'last-standing');
});

test('Tile Tumble replaces Grassfield scenery with a panning galaxy, thick sinking pads and smoke-only hammer poofs',()=>{
 const main=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8'),view=readFileSync(new URL('../../src/pnt/tiletide-view.js',import.meta.url),'utf8');assert.match(main,/gameArena\.visible=false;eventView=createTiletideView/);assert.match(main,/createTiletideCallout/);assert.match(view,/TileTumbleGalaxy/);assert.match(view,/mesh\.position\.y=-5\.5/);assert.match(view,/galaxy\.material\.uniforms\.time/);assert.match(view,/new THREE\.WebGLRenderer\(\{alpha:true/);assert.match(view,/const geometry=padGeometry\(\)/);assert.match(view,/depth:\.72/);assert.match(view,/createHammerSmokeGeometry/);assert.match(view,/poofs\.burst/);assert.doesNotMatch(view,/RingGeometry/);assert.match(view,/targetScale=vanish\?0:1/);assert.match(view,/pad\.visible=false/);
});

test('fallen players wait for the poof, use the authored jetpack orientation, and remain visible before verdict',()=>{const main=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8');assert.match(main,/fallWait\?\?=state\.fallDelay/);assert.match(main,/falling\?'jet':animationFor/);assert.match(main,/a\.group\.rotation\.x=0;a\.group\.rotation\.z=0/);assert.doesNotMatch(main,/rotation\.z=THREE\.MathUtils\.lerp\([^;]+Math\.PI\/2/);assert.match(main,/gameAudio\.play\('Player_Spin_Out'/);assert.match(main,/fallOutro\?\?=2/);});

test('event selector uses the wide square mode-card layout and hides the loadout promo',()=>{
 const css=readFileSync(new URL('../../styles/diretide.css',import.meta.url),'utf8'),main=readFileSync(new URL('../../src/pnt/main.js',import.meta.url),'utf8');assert.match(css,/#menu\[data-page=events\] #character-label\{display:none\}/);assert.match(css,/\.event-mode-card\{[^}]*aspect-ratio:1\.08\/1/);assert.doesNotMatch(main,/event-mode-meta/);assert.doesNotMatch(main,/LAST ONE STANDING|FREE FOR ALL/);
});

test('Tile Tumble results retain original online seat numbers after local actor remapping',()=>{const results=readFileSync(new URL('../../src/pnt/results-ui.js',import.meta.url),'utf8');assert.match(results,/seatFor=actor=>\(actor\.seat\?\?actor\.id\)\+1/);assert.match(results,/winnerSeat=draw\?null:seatFor\(round\.actors\[winner\]\)/);assert.match(results,/<em>P\$\{seatFor\(a\)\}<\/em>/);});
