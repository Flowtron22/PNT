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
