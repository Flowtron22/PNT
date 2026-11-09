# Balloon Bash

Steam playtest 0.9.156 uses mode ID `balloon` and rules version `14`.
Choose **Events → Balloon Bash** for training, couch play, or Steam online.

## Match rules

- Four players compete free-for-all with two balloons each. Every successful
  Hammer swing pops one balloon. The second pop eliminates the player and
  triggers their upward launch. The last player standing wins.
- The fixed kit is Hammer and Banana Skin. Banana spin lasts two seconds.
- At GO, 10–12 spheres fall across two staggered bands. A wave of 3–5 is
  scheduled every six seconds. Drops require open space and cap at 18 active spheres.
- Spheres become solid cover when they land. They block players and Hammer
  strikes, slide past other spheres, and drift inward at about 1.4 m/s.
  A landing kicks up a radial sand-smoke burst and a short camera shake.
  Reduced Motion lowers the puff count and suppresses the shake.
  Near the centre they sink at 1.35 m/s, lose collision as they submerge, and
  disappear beneath the sand.
- Quicksand slows players to 87 percent and pulls them toward the centre.
  Players remain inside the circular arena.

## Arena and integration

The arena radius is 12.6 metres. Each sphere is 3 metres across and uses one of
Tile Tumble’s colored dot, stripe, or zigzag textures, selected by its seed.
The texture visibly rolls with the sphere’s movement. The sand ring uses Mall
lighting, a sand-only AO bake, and animated inward bands. The shared camera looks
down at about 47°.
The HUD shows survivors and your remaining balloons.

Rules live in `src/pnt/balloon-rules.js`. The shared rules simulate both
balloon counts and spheres. Steam snapshots carry obstacle positions, phase,
drop timing and random state so the next host can resume the same match.
The renderer in `src/pnt/balloon-view.js` shows the independent spheres and
seat-colored balloons. The first pop gives visual feedback without launching the
player. The final pop uses the existing upright launch and foot exhaust.

Sudden Death announces when two players remain. Retest Hammer timing, cover
readability, sink speed, shared camera framing and host transfer on live Steam
and Steam Deck. The Events preview uses the existing Balloon Bash artwork.
