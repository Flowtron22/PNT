# Balloon Bash

Steam playtest 0.9.153 uses mode ID `balloon` and rules version `12`.
Choose **Events → Balloon Bash** for training, couch play, or Steam online.

## Match rules

- Four players compete free-for-all with two balloons each. Every successful
  Hammer swing pops one balloon. The second pop eliminates the player and
  triggers their upward launch. The last player standing wins.
- The fixed kit is Hammer and Banana Skin. Banana can open a path to a rival.
- At GO, 5–10 spheres fall at randomized locations. Every seven seconds, another
  1–3 are scheduled, up to a maximum of 14 active spheres.
- Spheres become solid cover when they land. They block players and Hammer
  strikes, slide past other spheres, and drift inward at about 0.48 m/s.
  Near the centre they sink at 0.55 m/s, lose collision as they submerge, and
  disappear beneath the sand.
- Quicksand slows players to 87 percent and pulls them toward the centre.
  Players remain inside the circular arena.

## Arena and integration

The arena radius is 10.296 metres. The procedural sand ring uses Mall lighting,
a sand-only AO bake, animated inward bands and a shared camera widened to show
more of the arena. The spheres and overhead balloons have distinct shapes and
colors. The HUD shows survivors and your remaining balloons.

Rules live in `src/pnt/balloon-rules.js`. The shared rules simulate both
balloon counts and spheres. Steam snapshots carry obstacle positions, phase,
drop timing and random state so the next host can resume the same match.
The renderer in `src/pnt/balloon-view.js` shows the independent spheres and
seat-colored balloons. The first pop gives visual feedback without launching the
player. The final pop uses the existing upright launch and foot exhaust.

Sudden Death announces when two players remain. Retest Hammer timing, cover
readability, sink speed, shared camera framing and host transfer on live Steam
and Steam Deck. The Events preview uses the existing Balloon Bash artwork.
