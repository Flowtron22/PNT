# PATTYTIDE event

Live client 0.9.107 / server 0.9.27 (event rules version 4). The event is a four-player free-for-all with an AI Patrics boss.

## Enter and play

Use **EVENTS** directly below PLAY, select **PATTYTIDE**, then use the same Solo Online / Couch Play flow as the main game. Solo Online has the existing Host, Join, public matchmaking and room codes. The event also has a Training button for one player and three bots. Costumes remain editable; event tools are locked to Hammer and Banana Split. Grassfield is the event's fixed map. Couch Play still requires at least two humans and fills empty seats with bots.

Online rooms are filtered by `gameMode` as well as public/private status. Joining a room for the other mode by code is rejected. The event is deployed on Vercel and Render. Keep event rules versions compatible when changing shared gameplay; client-only presentation updates need no server redeploy.

Run over candy to collect it, up to a carrying limit of 30. Small, medium and big burger pickups give 1, 3 and 5 respectively. Twenty-four pickups appear initially; six new candies spawn every three seconds, up to 44 active pickups. Spawn points are randomized among 260 prepared, reachable field positions away from wells. Uncollected pickups expire after 35 seconds. Fixed, replenishing candy caches are no longer used.

Hold Interact near a living enemy well to deposit (12 whole candies/sec; release cancels partial transfer progress). Hammer and Banana affect every opponent. A new stun spills half the victim's carried candy, rounded up, as up to 15 separate pieces. The pieces fan out from body height along synchronized arcs, bounce once and become collectible after landing. They expire after 20 seconds. Stun extensions do not repeatedly spill candy. Landing points stay on prepared ground. Smoke, Jetpack and Rewind are unavailable in this mode; classic gameplay retains those tools.

Well markers show their count above the supplied burger icon, with remaining hearts below. Player markers show their carried count inside the same icon; the redundant carried-total HUD under the timer is removed. Ownership stays visible through the coloured well and player rings. The extra top-left well list and floating Patrics label are removed.

Each well starts with two hearts. After 50 seconds, Patrics locks onto the fullest well and walks to it. He cannot be stunned or stopped. Deposits close during his attack. His smash removes one heart at the visible impact frame. Ties queue a smash on every tied well, resolving all tied targets before deciding the result. An empty cycle skips the attack. After the attack, all well candy clears; carried candy stays with its owner. Patrics walks home before the next 50-second cycle begins. Deposits can resume while he returns.

A destroyed well eliminates its owner, who can spectate. The last surviving well wins; simultaneous destruction of all remaining wells is a draw. Results report well hearts, total candy deposited and elapsed time. Local profile rewards follow the existing main-game policy (P1 for couch). Rematch returns online/couch players to their lobby; training starts a fresh round.

## Assets and animation

Source folder supplied by the user: `F:\PROJECTS\PS_3D\Assets\3D\01_Maps\Diretide\grassfield`.

`tools/prepare-diretide.py` imports both FBXs with Blender 5.2, without overwriting the sources. Set `PNT_DIRETIDE_SOURCE` to use another source directory. Run:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b --python tools/prepare-diretide.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b --python tools/bake-diretide-lighting.py
```

The map needs -90 degrees about X after Blender's FBX import; the corrected ground faces up. The export is centred on the field and glTF converts to browser Y-up. The central 18 × 28 metre field is sampled into a 0.4 metre navigation/collision grid. Source beach scenery and supplied texture atlas are retained. Scenery animation is omitted from this first event version. Runtime wells use lightweight geometry; pickups, spilled pieces and well contents use the supplied burger model.

Patrics keeps his original 62-joint skeleton and skin weights. Board/house prop meshes are omitted from the boss export. Five authored, sampled actions are embedded in `patrics.glb`: idle breathing, jumping jacks, heavy walk, overhead/forward smash and celebration. Runtime loops the 1.6-second jumping-jack action while Patrics waits between attacks, then blends into walking and smashing. The two hops include arm/leg opening and closing, vertical root motion, landing compensation and a changing ground shadow. Breathing idle and celebration remain available for further presentation. The animation is an initial stylised pass and can be refined without re-rigging him. The game positions the boss horizontally; only the jumping-jack clip adds vertical skeletal motion. Export FPS is explicitly 30 so authored clips retain their intended timing (smash 1.8s, walk 1.2s). To rebuild Patrics without touching map exports, add `-- --boss-only` to the preparation command.

The preparation script writes previews to `.local/` and runtime GLBs/metadata to `assets/pnt/arenas/`. The lobby thumbnail is `assets/pnt/maps/grassfield.png`, copied from the map preview. Browser builds require no Blender or original FBXs.

The lighting script now follows Mall's contact-AO recipe: only three ground receivers get a 2048px AO map, with a 0.4m radius, 0.65 strength and upward-normal mask above 0.8. Scenery keeps its diffuse UVs and is never assigned the AO texture. Broken imported custom normals are bypassed with flat face shading on Grassfield, removing the white specular faces on leaves/posts/umbrellas. The bake also uses true face normals for the upward mask. The old full-scene irradiance lightmap has been removed. Sunken's soft shading and warm grade remain, with 80% light intensity and exposure 1.0. Players, wells and Patrics still cast live shadows; environment contact shading is baked.

Event players and bots move 1.3 times faster than the original event speed. Server, local play and prediction use the same speed function. The event hammer has a 3m radius; hammer stun lasts 4 seconds and banana spinning lasts 7 seconds. Normal Police N Thief keeps its original movement and tools. Event tool descriptions reflect these overrides.

New candy shoots up from the ground, stretches in flight and squashes on landing. It becomes collectible once the 0.85-second launch finishes. Nearby candy responds to player and Patrics hammer impacts with a short upward jump and damped shake. These reactions affect presentation only; collection positions stay authoritative.

Event rules version 4 is checked during room authentication and the first lobby response so incompatible clients/servers cannot silently mix tuning or pickup formats.

## Burger replacement assets

Client 0.9.93 uses the user-supplied `sm_krabbypatty.fbx` and `ui_krabbypatty.png` from `F:\PROJECTS\PS_3D\Assets\3D\01_Maps\Diretide`. Run `tools/prepare-diretide-pickup.py` with Blender to reproduce `assets/pnt/props/krabbypatty.glb` and copy the exact PNG to `assets/pnt/ui/krabbypatty.png`. The original FBX contains a packed texture, embedded in the runtime GLB. The static model is centred and normalized to a horizontal diameter of two, then scaled by the existing small/medium/big radii. Source colours remain intact and the material is opaque and nonmetallic.

All pickup clones share cached geometry, material and texture. Removing a pickup or disposing a match does not dispose those cached resources. The existing spawn/spill/wiggle motion and 1/3/5 values are retained. Wells show up to three burger models as deposits accumulate. This asset/UI change requires no server update.

## Validation

Event tests cover collection limits, enemy-only deposits, line of sight and effects, countdowns, target locking, impact timing, ties, elimination, empty cycles, ballistic candy drops, seeded random spawns, pickup caps/values, stable bot goals, seat remapping, every spawn-to-objective route and full bot matches. A real SDK integration covers matchmaking isolation, wrong-mode room codes, loading barrier, event snapshots, victory and rematch. Browser checks cover local training, online host with bots, event results/rematch, returning to classic mode, and desktop/landscape phone layouts. Online browser checks also verify mid-air spills, landed recovery, icon counts, results and rematch. Physical gamepad/mobile-device testing remains outstanding.

Carry balance (client 0.9.94 / server 0.9.27, event rules 4): speed = unloaded speed × (1 − carried patties / 45), clamped to 0–30 patties. At 5/10/15/20/25/30 the percentages are 88.89/77.78/66.67/55.56/44.44/33.33. Shared movement applies this to practice, couch, authoritative server and prediction. Hammer stun 4 seconds, banana spin 7 seconds. All event players and bots use fixed hammer/banana slots; server rejects other tools and lobby choices are locked. Classic kits are retained. Idle Patrick faces the fullest living well (ties use well ID); burgers sit above the rim.

The startup/title and loading-screen flow is described in the current summary in `../handoff.md`. Event code paths retain their internal `diretide` names. Returning Home clears event restrictions; connection recovery preserves the room mode and code.
