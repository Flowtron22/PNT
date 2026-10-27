# Original environment mechanics and proposed browser adaptation

Inspected 27 October 2026, Asia/Kuala_Lumpur. Source checkout:
`F:/PROJECTS/PS_3D/GitHub/PSX`, Unreal Engine 5.6.

The inspection below records the original baseline. The browser implementation
is described in the 0.9.8 section at the end. The Unreal
checkout was clean before and after; SHA-256 checks also confirmed the three map
packages, ship, player, chair, table and project descriptor were unchanged.

## Evidence

Read Blueprint class defaults, component instances and placed map actors through
Unreal's Python commandlet. Exported Blueprint graphs and the ship timeline to
text outside the original project. Never saved source packages. ElectronicNodes
was missing locally, so it was disabled only in the command-line process.

Local raw evidence is under `.local/environment-audit/` (Git-ignored):
`audit.json`, `SunkenShip.t3d`, `BP_GameOfTagCharacter.t3d`,
`ship-timeline.t3d`, `CurveFloat_0.t3d`, and `before-hashes.json`.
This was static inspection; no claim of Unreal gameplay or multiplayer testing.

## Confirmed source settings

### Shared character movement

`Content/_MyGame/Characters/BP_Player.uasset`, native CharacterMovementComponent:

| Property | Saved default |
| --- | --- |
| Max walk speed | 500 cm/s |
| Max acceleration | 1500 cm/s² |
| Braking deceleration walking | 2000 cm/s² |
| Separate braking friction | Enabled |
| Braking friction | 0 |
| Braking friction factor | 1 |
| Ground friction | 8 before map-specific graph overrides |
| Character movement mass | 500 |
| Physics interaction | Enabled |
| Initial push force factor | 500 |
| Push force factor | 750000 |
| Push force scaled to mass | Disabled |
| Scale push force to velocity | Enabled |

The map switch in the inherited
`Content/AGameOfTagKit/Blueprints/BP_GameOfTagCharacter.uasset` connects
`Level_01_Mall` to GroundFriction=8, `Level_02_Sunken` through its map-effect
execution path to GroundFriction=5, and `Level_03_Iceberg` to GroundFriction=0.
Iceberg's zero turning friction does not imply zero stopping deceleration:
the separate braking settings above must be considered too.

### Sunken

Source: `Content/_MyGame/Maps/Asset_Sunken/SunkenShip.uasset`.

- Current Blueprint default `PushAcceleration`: **50000**.
- `Barrel Push Acceleration`: **10000**.
- `ApplyShipPush` uses the ship's up vector, horizontal vector math and AddForce.
  Its graph includes a grounded-character condition.
- The Rotate float curve has keys (seconds, degrees): (0,0), (3,5), (5,0), (10,0).
- Timeline length is **10 seconds**. Timeline looping/auto-play flags are false;
  graph-driven restarts/sign selection must be reproduced separately. Do not
  assume this means a continuous ten-second sine wave or a twenty-second cycle.
- The curve feeds the signed selection connected to the mesh rotation Pitch pin.
  Map orientation and Unreal-to-web axis conversion determine screen left/right.
- Earlier `updates.md` reports a 6000 push setting. This is historical; current
  class defaults are 50000. These are force-graph parameters, not portable browser
  acceleration values that can be pasted into a velocity equation directly.

### Mall

Sources: `Content/_MyGame/PhysicAsset/BP_CoffeeChair.uasset`,
`BP_CoffeeTable.uasset`, and `Maps/Level_01_Mall.umap`.

- 12 placed coffee chairs and 3 coffee tables.
- Chairs: mass override **30 kg**; tables: **50 kg**.
- Both simulate physics, enable gravity and replicate movement.
- Their body defaults use linear damping **0.01**, angular damping **0**,
  normal sleeping, and continuous collision detection disabled.
- One coffee signboard and one food-court signboard are also present in the
  inspected physics-actor set; decide their interaction scope explicitly.

## Proposed browser implementation

These are starting design choices, not benchmarked performance results or applied
settings. Retain current browser running-speed and animation multipliers.

1. **Sunken:** retain the authored 5-degree curve and flat intervals. Store a
   shared cycle start/sign, and compute tilt from simulation time. Simulate
   movement/collision in ship-local coordinates, add grounded downhill motion,
   and transform the ship and occupants for display. Reuse the native collision
   grid instead of rebuilding it while the ship rocks. Tune a bounded sliding
   speed against current web movement, rather than copying 50000 as acceleration.
   Keep the camera stable initially. Props that should slide must wake when tilt
   forces become meaningful.
2. **Iceberg:** use a separate movement profile with weaker steering and retained
   momentum, with independently tuned stopping deceleration. Keep normal gravity
   and collision. Sweep the resulting displacement through the native grid at the
   existing bounded movement substeps. This requires vector momentum; the current
   per-axis target damping alone is not a faithful copy of Unreal friction.
3. **Mall:** extract the 15 furniture meshes from the static export, remove their
   original baked blocking footprints, and use small compound box colliders
   rather than detailed triangle furniture. Preserve relative 30/50 kg masses;
   tune player impulses and damping in web units. Put settled bodies to sleep and
   wake them on contact/impulse. Bound extreme linear/angular speeds. Profile all
   15 objects moving before setting any active-body cap.
4. **Online:** run movement forces, furniture and captures on the authoritative
   server. Clients predict their movement and interpolate furniture transforms.
   Start with fixed simulation updates and 10–20 Hz awake-prop snapshots, then
   measure bandwidth and latency. Send final resting transforms before suppressing
   updates for sleeping furniture. Cosmetic smoke remains client-side.

Rapier is a candidate for the furniture layer, subject to a prototype benchmark.
Its documentation describes sleeping and wake-up behavior:
https://rapier.rs/docs/user_guides/javascript/rigid_body_sleeping/

## Acceptance checks before rollout

- Sunken: slide direction matches visible tilt; no push on flat deck, in flight,
  or away from the ship; stairs remain traversable; captured thieves and caches
  remain aligned with their ship-local positions.
- Iceberg: controllable turning drift and stopping distance at 30/60/120 FPS;
  no wall tunneling; bots use the same movement model as human players.
- Mall: visible furniture position matches collision after movement; no lingering
  blockers at spawn locations; valid paths to all caches; no jittering piles.
- Online: identical capture/slide outcomes across devices, reconnection to current
  furniture state, and measured performance on iPhone and Android.

## Implemented in browser 0.9.8

Follow-up tuning: Iceberg steering response time and stopping distance are reduced
by about 40% from the initial release. Steering rate is now 1.4/0.6 (2.333/s) and
braking is 2.2/0.6 (3.667 units/s²). Running speed and acceleration stay unchanged.

- `src/pnt/environment.js`: independent ice steering, acceleration and stopping;
  authored 0/3/5/10-second ship tilt with alternating sign; bounded grounded
  downhill sliding. The current web movement-speed and animation rates remain.
  Tilt direction alternates deterministically, rather than copying Blueprint
  random/sign/restart networking. Sliding stops on flat deck and during flight,
  stun or capture; caught actors stay in their local rescue positions.
- `main.js`: a shared render group tilts the map, characters, tools and particles
  around the original ship pivot. Simulation stays in map-local coordinates.
  Money/rescue markers project transformed positions; the camera remains stable.
- `src/pnt/mall-physics.js`: Rapier 3D 0.21.0 loads on first Mall entry only.
  Fifteen furniture meshes become dynamic compound-box bodies, retaining 30/50 kg
  masses. Damping is explicitly tuned to 0.45 linear / 0.7 angular; characters use
  a 90 kg push-controller mass. These differ from Unreal to bound web collisions.
  CCD, sleeping, speed limits and a below-map reset keep the simulation bounded.
  Players and bots use native static collision plus a controller that pushes and
  collides against current furniture poses. Furniture collides with terrain,
  native grid walls, other furniture and character capsules.
- `tools/prepare-mall-navigation.mjs` samples static Mall ground excluding movable
  meshes. `tools/export-mall-environment-collision.py` then re-exports native Pawn
  sweeps while ignoring those 15 Unreal actors. Updated Mall navigation/collision
  assets contain neither ghost blockers nor furniture-top walking surfaces.
- On retry or map/menu transitions, dispose the physics world and restore cached
  furniture transforms. Vendored Rapier licence is included in build notices.

Validation: movement/tilt tests, native furniture-origin clearance, actual engine
mass/impact/tumbling and character pushing tests; all-map cache reachability tests.
Desktop browser sessions exercised all three maps, visible table/chair displacement,
and map/menu transitions without logged runtime errors. A ten-second offline run
of the actual Mall geometry settled all 15 bodies to sleep; initial settling
displacement was below 2 cm. This is not an iPhone/Android benchmark.

Not ported in this batch: movable Sunken barrels, cannons, destructible props,
online replication or client prediction. Those are separate features. Existing
barrels/cannons rock with the ship but retain their static collision.
