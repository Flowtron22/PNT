# Balloon Bash

Steam playtest 0.9.147 exposes Balloon Bash from **Events → Balloon Bash**.
The stable internal mode ID is `balloon`, rules version is `10`. The event uses
a small procedural flat grid shared by client and authority, with no Grassfield
model or collision export. The sand has a small procedural AO-only contact map.

## Match rules

- Four players compete free-for-all. There are no teams or role advantages.
- Each player has one balloon above their head. A Hammer swing that reaches an
  exposed opponent balloon eliminates that player immediately.
- Four colored guard spheres trail every living player with snake-like follow
  spacing. A sphere crossing the attack line absorbs the hit and keeps the
  balloon intact.
- The fixed kit is Hammer and Banana Skin. Banana creates an opening; Hammer is
  the only balloon-pop action.
- Quicksand reduces movement to 87 percent, steadily pulls living players toward
  the centre, and clamps them inside the circular arena.
- The last intact balloon wins. If all balloons disappear together, the result
  is a draw.

## Arena and camera

The arena radius is 10.296 metres (another 10 percent smaller than 0.9.141). Twenty-four raised colored blocks form a
1.05-metre-high collision border around a warm quicksand floor. The floor,
border, ring, balloon and guard materials all use metalness `0` and roughness
`0.3`. Only animated shader bands communicate the
inward pull, without static painted arcs, centre/perimeter rings or imported art. Bands pan radially inward
using a time uniform, without redrawing or uploading a canvas every frame.

The shared camera targets the arena centre with a 0.82 distance multiplier and
original close stage bounds of 7.8 by 8.2 metres and original central spawns.
The arena's outside edges may extend beyond the deliberately close view.

## Integration

Core rules live in `src/pnt/balloon-rules.js`; procedural visuals are in
`src/pnt/balloon-view.js`. Local training, couch play, client prediction, Steam
authority and host snapshots all share the same mode ID, fixed loadout, movement
constraint and replicated guard positions. Multiplayer clients must advertise
Balloon rules version `10` during the room handshake.

Opponent guards also block player movement and quicksand pull, with a .32 m player
radius plus each equal-size .75 m sphere radius. Overhead balloons have .9 m
radius and their centres are 2.95 m above ground; guard centre spacing is 1.3 m,
slightly overlapping. Collider lists replicate with actor state
for client prediction. Movement uses .06 m substeps and finds the closest valid
contact point across overlapping sphere boundaries and the circular arena wall.
Existing overlaps are separated rather than ignored, preventing far-side bypass.
Moving guards also collide against stationary opponents. Online rendered players
are separated from visible guards. Own guards never block their owner.
Hammer never stuns defenders: a guard blocks it or an exposed balloon pops.
Impact effects use the existing pooled VFX without adding/removing lights, which
avoids changing shader light-count variants during a match.
Balloon/guard geometry totals 11,200 triangles; guards do not cast dynamic shadows.
Lighting uses the Mall directional, hemisphere and additional fill lights,
matching their intensities and exposure. There is no custom studio environment.
Balloon and guard materials retain metalness 0 / roughness .3.
The ground suppresses direct and indirect specular terms to remove the right-side
light hotspot. Mall diffuse lighting remains active; other objects retain highlights.

Guards use low-drag spring links, serialized velocities, 4-percent maximum stretch and
elastic border bounces. They coast and sway after the owner stops. Integration
uses substeps no longer than 1/120 second; a 7 m/s speed cap and .9/s damping
contain oscillation. Border bounce retains 60 percent of outward velocity.

Popped players use `balloon-launch.js` for a 2.2-second upright visual ascent
along world Y. The idle standing pose is held without crossfading into the
horizontal jet clip. Two sockets follow the foot bones and emit straight down;
the back jetpack is not shown. Long smoke/energy trails stream from the feet.
Gameplay positions remain authoritative on the ground and eliminated players
cannot act. The final verdict waits for the last ascent. Elimination smoke lasts
1.8–2.1 seconds and energy particles last three times longer; existing pools bound
allocations and other modes keep their standard trail lifetimes.

Version 0.9.146 restored original 24x16 balloon / 20x14 guard geometry density
(11,200 triangles across four balloons and sixteen guards). The balloon crown
is full, with a longer narrowed lower neck and matching knot/string attachment.
Only the sand receives a 512x512 AO-only contact bake through separate planar
UV1. The centre is unoccluded, with soft shading near the border. No direct
lighting is baked; AO does not pan with the animated sand bands or apply to
players, balloons, guards or border blocks.
Each pop emits 78 confetti particles at balloon height and one strong camera
kick. Reduced motion and camera shake settings remain respected. Grassfield's
model and exported collision are neither loaded nor attached for this mode.

Sudden Death announces once when two survivors remain, shared with Tile Tumble
and Patty Prowl. Classic retains the last-thief cue. Paused transitions wait for
resume, rematches reset, and mid-match restores do not replay historical cues.

Automated coverage is in `tests/pnt/balloon.test.mjs` and
`server/tests/balloon.test.mjs`. Live playtesting should focus on Hammer timing,
guard readability in a four-player pile-up, quicksand strength, border collision,
shared-camera framing, controller flow and host transfer.

The Events card and lobby use `assets/pnt/maps/balloonbash.png`, a composed render
of the actual arena and character assets. The original SVG remains as a legacy
asset but is not referenced by the current UI.

Known issue: holding movement during a Hammer swing can reset facing toward
heading zero because quicksand displacement is mistaken for directed movement
while velocity is zero. See the diagnosis in `../handoff.md`; no fix is included
in 0.9.147.
