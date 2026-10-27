# Unreal gameplay port

Source: `D:/Projects/PNT/PSX`, revision `9625f30a2f02b1febec99108455a5a9f891f20db`.
Read `updates.md`; inspected Blueprint defaults, `DT_Skills`, and all three level actor
placements through Unreal 5.6 Python without saving any source packages.

## Source values retained

- One police and three thieves, with two universal tool slots and shared costumes.
- `BP_GS_GameOfTag`: match countdown 300 seconds. Its separate money target is 5,000.
- Four `BP_Base_Money` / `BP_Money_Ship` caches in each level, 2,000 each.
- `DT_Skills`: Hammer cooldown 10s, 2m range, 2s stun; Banana cooldown 5s,
  15s peel lifetime, five placed items; Jetpack cooldown 15s, 5s duration;
  Smoke cooldown 30s, 20s effect duration, three placed items; Rewind cooldown
  10s and MultiTap enabled. Smoke's prose says 45s, but its structured DurationVFX
  says 20s; this port uses the structured value. Rewind's mesh is the engine Cube
  referenced by its original Blueprint, not an invented replacement.
- Each level's original gameplay spawn and cache locations are in `assets/psx/arenas`.
  Unreal-to-exported glTF positions use `(X,Z,Y)/100`; origin offsets retain alignment.

## Requested behavior and explicit web tuning

- Thieves win only when every cache is empty (8,000), following the user's explicit
  request rather than the native 5,000 target. Money is shared toward this objective.
- Police win by simultaneously capturing all thieves, or by retaining money at timeout.
- Captured thieves remain caught until a free teammate releases them. Release has a
  10s lockout and a continuous 1.5s hold; new release has 2s capture protection.
  These timings were not exposed as named Blueprint defaults and are web tuning.
- Stealing is 100 per second; one harvester per cache. Range is 2.2m and walls block
  stealing/rescue. Stealing and rescue stop on release, capture, stun or leaving range.
- Capture is contact-based within 0.9m, with sight/height checks. Captures remain at
  their world position for rescue. Native jail teleport/capture-progress graphs are
  not reproduced.
- Jetpack permits steering during its five-second flight. Native skill prose says
  random destination; this web adaptation retains player control.
- Smoke blocks line of sight, auto-targeting and capture through the cloud. Rewind
  uses a place/return action; captured players cannot use it to escape.
- Jump and dash remain removed. The camera uses 30-degree perspective with 30% wider framing, views from the
  opposite side after the 0.7 orientation correction, and
  movement transforms with it so joystick/WASD remain relative to the screen.
- The arenas are static exports. Native ship rocking/push, destructible/physics props,
  cannon interactions, advanced ice physics and online replication are not recreated.

## Validation

`npm test` covers money/capture/timeout wins, rescue lockout/hold/cancellation,
role/range/sight checks, per-tool cooldowns, multi-touch holds, and navigation.
`node tools/audit-arena-navigation.mjs` loads the actual three GLBs without textures,
builds the gameplay ground grid, and checks every cache is reachable within interact
range from the first spawn. Browser runs cover all three stages and Smoke/Rewind.

`tools/inspect-unreal-gameplay.py` writes local audit evidence;
`tools/export-gameplay-assets.py` reproduces the asset exports. Both run through
Unreal's Python commandlet and never save source packages.

## Version 0.7 polish

Wonder Wave result-screen styling, splat generator and source victory_fanfare /
defeat_jingle / judge_reveal / xp_tick sounds are reused with PNT match data.
Footstep dust and hammer shockwave are WebGL equivalents of the original effects;
Niagara runtime graphs are not portable to Three.js. These particles have a bounded
pool and share geometry. Movement uses substeps up to 60 Hz, interpolated terrain
height, stable acceleration/deceleration, and normalized bot route directions.

Validation for 0.7: 50 automated tests pass, including movement interpolation,
frame-rate independence, camera geometry, result totals and bounded VFX lifetime.
Visual browser verification was unavailable because local browser use was disabled
in Work settings during this pass.

## Version 0.7.1 collision and presentation

`tools/export-unreal-collision-grid.py` opens each source level in UE 5.6 and runs
Pawn-profile capsule sweeps against its actual simple mesh collision and blocking
volumes. It does not save source packages. The web capsule uses radius 0.28m and
half-height 0.72m, with up to 0.45m of step-up clearance, scaled for the web character.
The prepared 0.38m grid records occupancy, ground clearance and four swept movement
edges per cell. Both player movement and bot pathfinding obey it. These are sampled
native collision constraints, not exact runtime Chaos geometry or dynamic physics.
All four gameplay spawns have routes to all four caches on every map.

`tools/export-unreal-collision.py` also inspects/export boxes and available convex
primitives into local audit files. Some convex vertices are not exposed by Python;
the native sweep export covers those collision bodies without a guessed mesh hull.

The result character is rendered directly from its GLB into a transparent WebGL
canvas. It uses no black-backed portrait image, and its GPU context is released on
retry or return to menu. The camera width is another 10% larger than 0.7.0; Mall's
scene exposure is multiplied by 1.15 and restored when leaving Mall.

52 automated tests and the Unreal protected-file baseline pass. Browser verification
is unavailable while local browser use is disabled in Work settings.

## Version 0.8.0 tool and transition changes

- Rocket movement checks ground-level navigation clearance independently from its
  airborne visual height. Its model receives a 90° yaw offset. Native blockers
  remain enforced.
- Banana slips apply a random unit movement direction and reroll periodically or
  when blocked, for the existing two-second spin duration.
- Contact now starts a one-second capture lock/smoke sequence. The thief cannot
  move, use tools or harvest during that time; caught state and release cooldown
  begin after it finishes. Capturing the last thief only ends the match then.
- Opaque, varied sphere clusters provide the smoke bomb, capture and run effects.
  Run clusters are distance-spaced by 0.85m. Capture smoke rotates rapidly with
  randomized initial orientation and angular speeds, then shrinks away.
- All win conditions show a stage verdict first. The fade begins at 1.7s; the
  results screen follows at 2.4s. Outcome audio plays once, during the stage reveal.
- The menu uses the lobby backdrop with its existing gradient overlay. The 3D
  character preview remains; map and floor geometry are hidden in the menu.

58 automated tests pass. Visual browser verification remains unavailable because
local browser access is disabled in Work settings.

## Version 0.8.1 scroll, defeat pose and CPU sight queries

Costume equip updates selection flags in the existing page rather than rebuilding
it and focusing Back. Scroll position and the user's browsing context are retained.
The defeat portrait uses `busted` once, then `bustedIdle`; the winning dance is unchanged.

All maps already load assets and compile shaders before the HUD appears. Loading
can hide download/decode/compile time, but cannot remove recurring match-frame cost.
The prepared GLBs contain approximately 23,918 triangles for Mall, 45,253 for Sunken,
and 38,185 for Iceberg. Original sight checks scanned render triangles repeatedly.
They now traverse the prepared native collision grid, retaining smoke occlusion.

A local desktop CPU benchmark of 320 queries measured mesh scans / grid checks:
Mall 49.41 / 1.01 ms, Sunken 395.49 / 0.43 ms, Iceberg 258.37 / 1.48 ms. These are
query timings only, not complete frame times or actual iPhone FPS. Browser visual
verification remains unavailable while local browser use is disabled.

## Version 0.8.2 rescue contention and iPhone layout

Rescue ownership stays with the active helper until completion or cancellation. A
second helper neither resets nor accelerates progress; ownership can transfer if
the original helper stops or cannot act. Bot target selection skips owned rescues.
Regression tests exercise simultaneous helpers and ownership handoff.

`styles/mobile-pages.css` defines dynamic viewport/safe-area bounds for mobile
Play/Join, Lobby and Results pages. Portrait uses stacked cards; landscape uses
side-by-side cards and a compact two-column result summary/scoreboard, with controls
kept inside the scrollable content. iPhone 14 Plus sizes (430×932 / 932×430 CSS
pixels, reduced further by browser bars) were the target dimensions. Actual Safari
visual verification is unavailable while browser use remains disabled.

Mall, Sunken and Iceberg share `matchView(aspect)`, with no per-map zoom overrides.
The common view width is multiplied by another 1.1 in this version. 61 tests pass.


### 0.9.0 — fixed shared view and configurable controls

The match camera anchors once to the spawn/cache area. It no longer follows the
local character or rocket elevation. All three maps use the same 30° perspective
fit with a portrait/landscape adjustment to keep objectives visible; clipping and
fog distances follow framing. Only a brief, subtle hammer impact shake moves the
camera, disabled with reduced menu motion.

Desktop uses the mobile three-button triangle and equipped tool icons. Defaults
are arrows to move, Q/W for tools and E to hold Interact. Settings can rebind all
seven actions, swap conflicting assignments, reset defaults and save locally.
WASD is no longer the default because W is explicitly assigned to tool slot 2.

Hammer hits emit ground-level grey toon sphere clouds, radial dispersal and fade
out from the same smoke geometry used for trails. Rocket and banana effects pulse
the Vibration API while active; pause, hiding the page, effect completion and the
Settings toggle cancel vibration. Unsupported browsers show that limitation in
Settings. iPhone Safari currently does not expose this API, so physical vibration
cannot be provided there. No Unreal project files or gameplay/network rules changed.
