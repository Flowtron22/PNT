# Police N Thief web prototype — handoff

Updated: 28 October 2026 (Asia/Kuala_Lumpur).
Current app version: **0.9.35**, online multiplayer test release. Server: **0.9.19**.

**Current user instruction: deploy multiplayer for a free online test on Render.**
Render service `pnt-multiplayer` uses the Free plan in Singapore, branch
`codex/multiplayer-local`, endpoint `https://pnt-multiplayer.onrender.com`.
Vercel's build command injects that public endpoint; local development still
discovers the LAN server. Free hosting sleeps when idle and can take about a
minute to wake. No paid upgrade is authorized.
0.9.10 fixes the background-app timeout: initial seat reservation is 60 seconds,
reconnection reservation is 120 seconds, and expired reconnections return to Join
with the previous room code instead of a raw error over a stale lobby.
Validated 85 client/rules tests and six server tests, including a real SDK client
returning after 22 seconds away. Reconnection now broadcasts the restored roster
to every client. Render is a public-repository service: if it does not auto-deploy,
use Manual Deploy → Deploy latest commit on its dashboard. Browser control was
disabled in Work settings during the 0.9.10 fix; verify the server deploy separately.
0.9.11 replaces packet-by-packet local position pulls with fixed 60 Hz prediction,
acknowledged-input replay and separate visual correction smoothing. Remote actors
and Mall furniture use a 100 ms server-time snapshot buffer. Server input batches
consume one frame per tick, with processed/received sequence acknowledgements.
New clients retain compatibility with older servers via the `inputFrames` flag.
See `src/pnt/netcode.js` and `docs/MULTIPLAYER.md`. Tests cover 200 ms RTT + jitter,
30/60/144 FPS, bounded queues/extrapolation, teleports and reconnect sequence reset.
See `docs/MULTIPLAYER.md`. Colyseus server and LAN launcher are implemented;
use `npm run dev:online`, with website port 8491 and game-server port 2567.

0.9.12 replaces shared UI splat decorations with five-point stars, preserving
colors and selection animations. Tools, costumes, profile portrait decoration
and results title use the shared `starSVG` helper. Multiplayer tuning is deferred
per the latest user instruction; server stays on 0.9.11.

0.9.13 enlarges shared stars by another 30% and tilts them 15 degrees left.
Sunken/Iceberg lobby previews now use the user-supplied JPGs converted to WebP
at original dimensions; the preview URL is versioned to avoid stale asset caches.

## Continue here

0.9.35 restores the Sunken ocean material motion lost during GLB export. The
`waterplane` mesh's authored `m_ps_waterA` and `m_ps_waterB` layers now use
independent repeat-wrapped UV offsets, vertically panning in opposite directions
through countdown, gameplay and pause. No simulation/server change is required.

0.9.34 lowers every gameplay map's direct, fill and hemisphere lighting by 10%
and raises the shared arena display-space saturation from 1.15 to 1.20. Iceberg
retains its special glide but now turns and brakes sooner (steering 1.4 to 2.2,
braking 2.2 to 3.2), reducing wide drifting turns. The movement version is 5;
online parity requires server 0.9.19 on Render as well as the client release.

0.9.33 restores the original left-side dark gradient and dotted texture above
the 0.9.32 purple diagonal menu background. The loading screen no longer shows
the eyebrow (`PACKING A LITTLE TROUBLE`) or bottom warm-up tip; its logo, loading
title, progress bar, live status and percentage remain. Client-only release.

0.9.32 replaces the menu's Mall/environment backdrop with the loading screen's
flat dark-purple radial and diagonal-stripe treatment. It covers Home, Play/Join,
Tools, Costume, Settings and Credits while retaining the character preview above
it. Online matchmaking and Training lobbies keep their existing lobby backdrop.
Client-only release.

0.9.31 moves offline practice out of the online Play/Join pages and adds a
main-menu `TRAINING` button directly below `PLAY`, using the standard animated
main-menu style. Training launches the same local-bot lobby, uses Training labels
in that lobby, and quitting it now returns home rather than to the online Play page.
Client-only release.

0.9.30 replaces Android's white, thief-head generated PWA launch splash with a
branded system splash: the mandatory Android launch window now uses the game's
`#171329` purple and a safe-zone Police N Thief logo icon. New versioned icon
filenames and a versioned manifest URL prevent stale white icon caches. Existing
Android installations may need uninstall/reinstall for the WebAPK icon to refresh.
Client-only release.

0.9.29 removes the avoidable menu-music startup delay. `menu-bgm.m4a` now begins
downloading as soon as the main module initializes, before Web Audio unlock, and
is first in the decode queue after the browser's required initial click/tap.
Prepared audio reuses the warmed bytes instead of requesting them again. The
visible web-version label is also synchronized to 0.9.29. Client-only release.

0.9.28 limits the smooth procedural chase theme to the main menu and matchmaking
lobby (`menu-bgm.m4a`). Active gameplay switches to the original pre-0.9.25
`gameplay-bgm.mp3`; returning to the menu restores the smooth chase theme.
This is a client-only release.

0.9.27 removes Hull Alarm and its exported asset. The smooth procedural chase
theme now starts in the main menu, continues through matchmaking and remains the
gameplay BGM without restarting at the scene transition. Wonder Wave attribution
now covers only the VFX code still used by the project. This is client-only.

0.9.26 retains the 0.9.25 chase theme's beat, tempo and musical structure while
removing its 8-bit character. Smooth additive synth plucks, warm bass/chords,
rounded brass-like leads, stereo echoes and a fuller kick replace all pulse and
square-wave voices. This is a client-only release.

0.9.25 replaces the in-match BGM with an original procedural retro-arcade chase
theme: 32 bars at 152 BPM with synthesized pulse/triangle voices, noise drums,
arpeggios, bass and escalating call-and-response phrases. The deterministic PCM
renderer is `tools/render-chase-bgm.mjs`; its 50.53-second AAC export is
`assets/pnt/audio/gameplay-bgm.m4a`. Hull Alarm remains the menu/matchmaking BGM.
This is a client-only release.

0.9.24 adds Wonder Wave's procedural `Hull Alarm` as the looping main-menu and
matchmaking-lobby theme. Entering active gameplay cleanly stops that voice and
starts the existing gameplay BGM; returning to the menu restores Hull Alarm.
The compressed 18-bar offline render is stored as `assets/pnt/audio/Hull_Alarm.mp3`, and its
Wonder Wave MIT attribution is recorded in `notices/wonder-wave-mit.txt`. This is
a client-only release.

0.9.23 fixes desktop result portraits clipping wide costumes and defeat poses.
The portrait camera no longer uses a fixed distance: it fits both normalized
model height and width against the live canvas aspect ratio, with pose padding
and depth allowance. Narrow desktop portrait slots therefore back the camera up
while mobile and wider slots retain closer framing. A framing regression test
checks full width and height visibility. This is a client-only release.

0.9.22 fixes the rapid sound heard immediately after jetpack flight. It was not
a footstep: because the actor retains `effect='rocket'` at zero duration, the
landing transition test replayed `Tool_Jetpack_Land` every audio update. The cue
now additionally requires the previous `effectTime` to be positive, so it fires
exactly once as flight crosses to finished. A regression test advances five
post-flight updates and asserts one landing playback.

0.9.21 adds the nine user-supplied 48 kHz mono WAV narration clips. Match start
is now an authoritative four-second frozen sequence: READY, THREE, TWO, ONE, GO,
with the visual beat and matching voice triggered from the same state transition.
Sudden Death plays once when only one uncaught thief remains; Time Up plays once
on a timeout finish. Way To Go and Great alternate when individual cash caches
become empty. Narration state resets per match and works with local and online
snapshots. This shared countdown change bumps the server to 0.9.18 and requires
the Render `codex/multiplayer-local` branch to fast-forward to this release.

0.9.20 removes the banana ground-radius indicator in local and online play. The
banana prop now supplies its own warning through a bounded squash/stretch and
small vertical bounce. Hammer impact adds a pooled upward paint-crown mesh with
an irregular circular silhouette, green/yellow gradient, shader halftone dots
and matching sparks. The suspicious repeating sound was not a footstep: no
footstep system exists. `Thief_Loot_Stolen` was retriggering every 0.9 seconds
while cash increased; it now plays once at the start of each continuous cache
interaction. No server protocol or simulation changes are required.

0.9.19 fixes two live regressions from the Wonder Wave VFX release. Graphic
sparkles, colored toon puffs and rings now use bounded ordinary mesh pools with
explicit materials; this avoids the `instanceColor` driver path that rendered
the effects as black spheres/rings on the user's machine. Online connection now
visibly advances through server wake, secure connection and lobby join, probes
Render's health route to wake the free service, and exits with a useful retry
message after bounded 35/20-second waits instead of remaining at 0% forever.
Validated 118 root tests, production build, and a real SDK host connection that
received its lobby. This remains client-only; Render stays at server 0.9.17 and
does not require a deploy.

Mobile movement now accepts touch starts anywhere on the left half of the active
match. A floating joystick centers on that touch, starts neutral, then follows
the owning finger across either half until release/cancel. UI buttons are excluded
and right-hand actions keep independent pointer ownership. Release/pause restores
the original joystick location; mouse controls stay fixed. Main isActive also
blocks input during the start countdown and portrait overlay. Tests cover large
touch zone, boundaries, button exclusion, multitouch, cancellation and restoration.

Android install fix: manifest was missing its `icons` array. Added square 192/512
PNG exports of the user's thief head (white padding, aspect ratio preserved),
plus square touch icon. Generate using `tools/prepare-app-icons.ps1`. HTTPS,
standalone display and landscape orientation were already configured. No offline
cache/service-worker behavior was added; current Chrome menu installation does
not require it. Actual Android install must still be checked on the device.

0.9.17 code review and audio: BGM plays across main menu and matchmaking lobby
after the first gesture, without duplicate loops; SFX and music lifecycle are
separate, failed clips can retry, hidden-tab audio stops immediately. Rules share
`detectThiefAt()` (2 radius, <0.8 height, 1.5s gameplay grace after GO) and the new
`sight.js` across local/server. Dormant instant/delayed capture APIs are removed;
capture stays 1.6s valid contact with 0.4/sec decay. Expired smoke protection and
one-extra-tick timeout simulation fixed. See `docs/CODE_REVIEW_2026-10-28.md` for
findings and remaining ring/structural issues. Tests: 112 root + 16 server.
Render needs a server deploy from `codex/multiplayer-local`; verify health 0.9.17.
Browser control is currently disabled; don't claim hosted server deployment
until the health endpoint confirms it.

Browser/share branding now uses the user's supplied files unchanged:
`assets/pnt/thief-head-icon.png` is the tab/touch icon (512×449), and
`assets/pnt/social-preview.png` is the link-preview image (1200×798). Index head
includes static Open Graph and large-image Twitter metadata with absolute public
URLs, image dimensions/alt, title and description. No sharing/posting was done.

Hammer visuals now attach to the animated right-hand bone via
`src/pnt/held-tools.js`, shared by local useTool and multiplayer tool events.
The grip sits at 55% of the wrist-to-finger offset with a small palm-side offset;
the handle's 88%-height point is the pivot, and the authored head is flipped to
hand +Y for the swing. Bone-scale compensation preserves tool size on all nine
normalized costumes. Existing .48s visual cleanup, gameplay timings, shake and
stun behavior are unchanged. 105 tests pass including all-costume moving-grip
and multiplayer attachment tests. Offline posed geometry preview checked at
`.local/hammer-hand-grip.png`; browser control remains disabled.

Latest: Sunken and Iceberg now use the approved Mall treatment: contact mask^2.3,
0.4 radius / 65% baked strength / upward normal >0.8, saturation 1.15. Shared
`bakedArena(arena,id)` applies only to UV1 receivers: SunkenShip (upward-facing
deck portions; vertical geometry stays white) and sm_ib_icefloor. Original GLBs
remain untouched; runtime loads all three `*-lit.glb` variants. Regenerate the
new maps with `tools/bake-arena-contact.py -- sunken` / `-- iceberg` in Blender.
Geometry/material checks passed for Mall 58, Sunken 50, Iceberg 45 mesh nodes;
Three loader checks preserve transparency/emission, AO receivers and shader
composition. 103 tests passed. Offline previews only; browser remains disabled.

Contact visibility fix: default aoMap shading was washed out by direct lights.
Floor-only onBeforeCompile now removes the ambient-only AO chunk and multiplies
final outgoingLight by contactMask^2.3 once (latest contrast increase).
Radius/receivers are unchanged;
other objects have no override. Texture audit: range 0.349–1, 1.55% of the atlas
below 0.98. Browser control remains disabled; do not claim in-game visual QA.
Latest tuning also increases Mall scenery/props saturation 15% after color-space
conversion; shader hooks compose with contact AO. Other maps/characters/HUD unchanged.

Latest Mall revision replaces the full lighting bake below with **floor contact
AO only**. Original runtime lighting/materials are restored. `mall-contact-ao.png`
is a 2048² non-color AO atlas (~165 KB), radius 0.4, strength 65%, normal Z >0.8
in Blender. Only mainfloor, shop floors and bridge receive it; other surfaces and
all 15 movable props have no AO map. The UV-equipped GLB remains; the old full
lightmap is retained for reference but is no longer loaded. Regenerate with
`tools/bake-mall-contact.py`; preview with `tools/preview-mall-lighting.py -- --contact`.

Mall gameplay now loads `assets/pnt/arenas/mall-lit.glb` plus a 2048² baked
lightmap. It includes soft sunlight, diffuse bounce and contact AO on fixed
scenery. All 15 movable chairs/tables are excluded from the bake and retain
runtime lighting/physics; originals and other maps remain unchanged. See
`docs/MALL_LIGHTING.md` for regeneration, validation and rollback. Geometry,
transformed bounds and per-material triangle assignments are checked against
the original; additional Three GLTFLoader validation checks UV1/material setup.
Browser control was disabled during this task; the preview is an offline Blender
render, not a browser capture. Existing 103 tests passed.

Stealing now emits gold coins from the projected cache marker into the money
total beneath the timer. `src/pnt/money-trail.js` observes cache balance deltas
for both practice and online snapshots, skips initial/reconnect balances, caps
particles at 48, clears on pause/menu/new match and uses only a glow for reduced
motion. This is presentation only; authoritative money totals are unchanged.

Costume selection cards keep their normal dark background when equipped; only
the orange border, star and equipped badge indicate selection. The wardrobe-only
selected gradient was removed; tool selection styling is unchanged.

0.9.16 capture/smoke/start rules: capture still needs 1.6 seconds of valid contact,
but loss of range/sight/height or a disabled police now decays the independent
thief meter at 0.4 seconds/second instead of resetting it. Rescue immunity and
caught states clear that thief's meter. The much thicker progress arc smooths at
render rate and remains visible through police tool/stun downtime (except smoke).
Smoke occupancy (radius 2.6, vertical tolerance 2.2) makes either role immune to
capture, hammer stun and banana slip; it clears existing stun/spin, blocks stealing
and all tool activation. Movement and eligible teammate rescue remain allowed.

After all clients load, the server freezes movement, bots, tools, interactions and
the five-minute clock for a synchronized three-second 3/2/1/GO sticker over the
arena. Early inputs are retired. Local practice uses the same shared countdown.
Widget styling adapts wonder-wave's iw-lcd launch rays and spring beat, using PNT
stars/colors. Reference project was read only. Phone main timer is scaled 50%,
other readouts compacted, touch targets retained. All Mall lights are 20% lower.
Gameplay cues/music start at GO. Snapshot worldTime keeps ship tilt/prediction on
gameplay time while the network clock includes the intro. movementVersion=4.
Validation: 103 root + 13 server tests, including smoke immunity, hovering last
thief, gradual progress loss, countdown input/money/tool freeze and real clients.

0.9.15 fixes the landing-mask seed error introduced in 0.9.14: saved Unreal spawn
Y is not the sampled walkable floor. Seed by nearest free X/Z instead. Sunken now
has 3,587 eligible floor cells (was 967 elevated cells), Iceberg 4,361 (was 57).
Flight stays inside sampled arena bounds and blends toward a safe landing in its
last half-second. A relocated landing resets the previous position before Mall
furniture collision so it cannot be rolled back into an invalid/out-of-map spot.
Landing targets are included in poses for prediction replay.

Input queues retain the newest eight commands, discarding superseded backlog
after stalls. The client sends the newest unsent batch after a gap. Ordinary
medium corrections blend instead of triggering the old 2.5-unit hard snap;
explicit rewind/respawn revisions still snap. `/health` reports app version and
movementVersion=3 to verify the matching server release. Tests: 100 root and 11
server tests, including complete Sunken/Iceberg flights, floating spawn heights,
landing rollback, queued-input stalls and medium visual corrections.

0.9.14: phone landscape request on first touch where supported, with a rotate-phone
overlay in unsupported portrait browsers and `orientation: landscape` in the app
manifest. Mall PBR materials use roughness 1 / metalness 0 (maps cleared), plus a
Mall-only fill light from the darker side. Detection rim and progress arc are
about twice as thick without changing gameplay radius. Smoke bomb puffs billow
in both local and online matches, retaining the same meshes/materials.

Jetpacks bypass navigation and furniture collision while flying. At expiry, the
shared client/server motion selects a landing cell connected to authored spawns,
with no blocking cell or isolated roof. See `landing.js`; the grid landing mask is
built on load on both client and server. Flight-floor/wasFlying fields are included
in network poses so input replay remains consistent. Online movement requires
deploying the latest `codex/multiplayer-local` branch on Render.

Original Unreal audio was inspected/exported read-only: 21 gameplay MP3 clips and
the 64-second looping music now play in-game, with separate sound/music settings.
See `docs/AUDIO_PORT.md`. Original `Content` has no Git diff. Tests: 97 root tests,
nine server tests, including safe landing on all three original maps. Browser
control remains disabled; phone/browser visual and listening checks need user testing.

Environment reference inspected on this workstation: Unreal checkout
`F:\PROJECTS\PS_3D\GitHub\PSX`. See `docs/ENVIRONMENT_PORT.md` for verified
ship tilt/push, Iceberg friction, Mall furniture settings and proposed optimized
browser adaptation and the implemented 0.9.8 mechanics.

This is the browser prototype, not the original Unreal project. Continue editing
this repository. Do not recreate the game or switch to the Unreal checkout.

- GitHub: https://github.com/Flowtron22/PNT.git
- Branch: `main`
- Live site: https://police-n-thief.vercel.app/
- Original machine's web checkout: `D:\Projects\PNT\PNT\PNT`
- Original Unreal reference: separate external checkout; verify its location on the workstation.
- UI reference: separate external reference checkout; not included in this repository.
- Original character/FBX source location supplied by user:
  `D:\Projects\PNT\PNT\assets\characters\3d_Assets`

The original Unreal and the reference UI folders and raw FBX source are separate from
this Git checkout. Transfer those folders separately if you need to re-export
assets or inspect original mechanics. The browser-ready exported assets are in
`assets/pnt` and are sufficient to run this prototype from the repository.
Local Windows paths will need updating on the other workstation.

## User rules and preferences

- **Stay below 1.0.0. This is still a prototype.** Next change can use 0.9.7;
  do not automatically promote to a 1.x release. 0.10.0 is also pre-1.0 if needed.
- Preserve the original Unreal project, especially its multiplayer. Browser work
  stays in this separate repository. Do not modify Unreal networking or assets in place.
- Git commits and pushes are authorized for this web repository. Recent work has
  been pushed to `main`, which triggers Vercel production deployment.
- Keep changes focused and work in small batches. The user dislikes long opaque
  work sessions, repeated checks, unnecessary confirmation and speculative changes.
- iPhone 14 Plus layout was reported good. Preserve that layout while improving
  other phones and desktop. Do not shrink all devices indiscriminately.
- Match the reference UI's button hover animation, wiggle, sound and visual language.
- Credits should be **static**, with the white Todak logo and
  **Developed by**, then the TODAK logo and **STUDIOS** beneath it in spaced
  geometric Rubik lettering. No Ureka logo or upward credits animation.
- third-party/GitHub references were removed from the in-game credits presentation.
  Third-party licence files/notices remain in the repository and distribution.
- Only three mobile action buttons: two small tool buttons and one large Interact
  in a triangle on the right. Joystick on the left. No jump or dash controls.

## Setup on another computer

Use a modern Node.js version; development here used Node 24. Browser dependencies
are vendored. No npm dependency installation, backend or environment variables
are required for the current local-bot prototype.

```powershell
git clone https://github.com/Flowtron22/PNT.git
cd PNT
npm run dev
```

Open http://localhost:8491. For phone testing on the same Wi-Fi:

```powershell
npm run dev:lan
```

Use the LAN address printed by the server. Allow local firewall access if needed.
`Start Web Preview.cmd` is another launcher. If port 8491 is occupied, reuse the
existing preview or set a different `PORT`; do not repeatedly launch servers.

Validation commands:

```powershell
npm run check
npm test
npm run build
```

`npm run build` generates `dist/` (ignored by Git). Vercel configuration is in
`vercel.json`: static deployment, `npm run build`, output `dist`. Pushes do not
by themselves prove that deployment has finished; verify the live version.
Assets have a one-hour cache header, so refresh/reopen when checking updates.

## What works today

### Match rules and flow

- PLAY -> Host / Join -> online lobby (or separate Local Practice) -> four players -> three-second
  countdown -> match loading -> match -> on-stage Victory/Defeat -> fade -> results.
- Exactly one police versus three thieves. Five-minute round.
- Thieves win by stealing all money from all caches. Police win by catching all
  three thieves or when time expires with money remaining.
- Hold Interact near a cache to steal or near an eligible teammate to rescue.
- Police capture requires 1.6 accumulated seconds within a 2-unit circular detection
  radius, on the same floor with clear line of sight. Escape, blocked sight and
  police tool/stun effects decay that thief's meter at 0.4 seconds/second;
  rescue immunity clears it. Smoke prevents accumulation and capture.
  Thieves remain mobile during detection. At completion caught state applies
  immediately with a one-second cosmetic smoke effect. The police ground circle
  shows an orange progress arc for the most advanced target; timers are independent.
- Rescue unlocks after a ten-second cooldown and takes 1.5 seconds of continuous
  interaction. Only one helper owns a rescue; competing bots no longer reset it.
- Host lobby supports bots, map selection, role preference, tools and costumes.
- Public matchmaking and six-character room-code joining are implemented through
  the Colyseus server. Production connects to the Render Free server above.

### Controls and UI

- Default keyboard: arrow keys move, Q tool slot 1, W tool slot 2, E Interact,
  Escape pause. Settings supports saved remapping with conflict swaps/reset.
  W is a tool key, so WASD is not the default.
- Desktop action buttons use the same equipped icons and triangle layout as phone.
- Multi-touch supports movement plus action fingers simultaneously. Match touches
  suppress double-tap/pinch zoom; menus retain native scrolling.
- Tools: two independently equipped slots; duplicates swap rather than duplicate.
  Hammer, Banana Skin, Jetpack (internal ID `rocket`), Smoke Bomb and Rewind Box.
- All nine costumes work for either role. Selecting one preserves costume-page
  scroll position. Roles choose run animations, not outfits.
- Main menu has profile name/wins/matches/level/XP and current loadout widgets.
  Progress, name, kit, costume and key mappings save locally in the browser.
- Menu backdrop uses lobby background art plus dark overlay, not a live map.
- Removed user-marked helper copy from Home, Tools, Costume, Settings, Play and Join.
  Dynamic errors remain available when a user attempts an unsupported action.
- Host/Join titles are larger and raised beneath the icon/kicker.
- Desktop Play/Join/results widths cap at 1200px automatically on fine-pointer
  desktop screens above 1024px. Waiting lobby uses its original responsive widths.
  Mobile styles retain dynamic viewport/safe areas.
- Latest change (0.9.6): wide FREE/LOCKED crew text became small costume head
  portraits (34px, 28px in short landscape), a cross when caught, tiny release
  countdown and orange local-player outline. Accessible labels retain details.

### Camera, maps, animation and effects

- Mall, Sunken, Iceberg have exported geometry, spawns, cash caches, navigation
  and native Unreal pawn-collision grids. Do not revert to triangle scans for sight.
- Shared match camera is fixed to stage spawn/cache bounds, not tracking the player.
  It uses FOV 30 perspective with aspect-aware framing, adjusted fog and far clip.
  Orientation is the corrected opposite-side view, not the earlier reversed map.
- Only transient hammer shake moves the camera; reduced motion disables it.
- Idle uses **idleB** with authored root height. Do not switch back to idleA: feet
  appeared to float during its squat. Role-specific police/thief run clips work.
- Action clips include hammer, stunned/air stunned, banana spin, rocket/jet,
  capture/busted and victory dance. Defeat uses caught animation; keep victory dance.
- Rocket flight can move, lasts five seconds and rotates the tool mesh 90 degrees.
- Banana forces random movement while spinning, rerolling direction on a timer/wall.
- Toon sphere smoke is used for spaced run trails, smoke bomb and capture effects.
  Hammer smoke hits the ground in front, disperses radially and fades with slight shake.
- Results use a transparent separate character renderer with no black background.
- Rocket/banana vibration uses feature-detected Vibration API with an On/Off setting.
  iPhone Safari does not expose that API in our last check; do not promise physical
  iPhone vibration. Pause, page hiding and effect end stop supported vibration.

## Main files to read

| File | Responsibility |
| --- | --- |
| `src/pnt/main.js` | Three.js scene, menu/page wiring, game loop, actors/bots, tools, HUD |
| `src/pnt/rules.js` | Round, capture, money, rescue ownership, tool cooldown rules |
| `src/pnt/animation.js` | Animation binding, role run clips and priorities |
| `src/pnt/camera-rig.js` | Fixed center, shared perspective framing and shake |
| `src/pnt/collision.js`, `navigation.js`, `world-navigation.js`, `motion.js` | Collision, sight, paths, movement/substeps |
| `src/pnt/game-fx.js`, `action-state.js` | Pooled smoke/impact effects and action helpers |
| `src/pnt/touch-controls.js`, `keybindings.js`, `haptics.js` | Independent pointers, keyboard mappings, vibration |
| `src/pnt/lobby-state.js`, `lobby-ui.js` | Local lobby state and rendered controls |
| `src/pnt/home-widgets.js`, `profile.js` | Profile, progression and equipped-kit widgets |
| `src/pnt/menu-effects.js`, `ui-sounds.js` | the reference UI hover/focus/press motion and sounds |
| `src/pnt/results-ui.js`, `result-portrait.js` | Results UI and transparent animated character |
| `src/pnt/credits-ui.js` | Static Todak-only credits markup |
| `styles/pnt.css` | Base UI, touch/action triangle and compact crew heads |
| `styles/menu-ui.css` | the reference UI styles, profile/results/credits |
| `styles/mobile-pages.css` | Phone Play/Join/lobby/results; safe areas and orientation |
| `styles/desktop-layout.css` | Desktop maximum content widths; does not alter mobile |
| `index.html` | Static screen/HUD markup, imports and stylesheet order |
| `build/pnt-web.mjs` | Static build, standalone credits and separate third-party notices |
| `tools/` | Local server, offline exports, conversions and navigation diagnostics |
| `tests/pnt/` | Node tests for rules, animations, collision, controls and effects |
| `docs/GAMEPLAY_PORT.md` | Unreal mechanics evidence, tuning and implementation history |

`src/menu-audio` is retained foundation/reference code; the active game entry is
`src/pnt/main.js`. Preserve stylesheet order: pnt -> menu-ui -> mobile-pages ->
desktop-layout. Runtime loading fetches GLB and prepared animation JSON, not raw FBX.

## Verification and remaining concerns

- Multiplayer 0.9.11: 84 root tests plus five server tests pass. Four real SDK
  clients cover rooms, permissions, readiness, shared state, reconnect, rematch,
  public/private isolation, capture, tools, stealing/rescue and Mall physics.
  Two browser clients completed a shared Mall match with correct per-player
  results. Actual phone/LAN and internet-latency tests still need user review.

- Iceberg follow-up: the 40% slipperiness reduction was reverted. Original
  `ICE.steering=1.4` and `ICE.braking=2.2` are restored. Police and thief movement
  on Iceberg is now 1.5x the previous speed (on top of the shared 1.15 multiplier).
  Other maps retain their previous movement speed.
- Iceberg police/thief running clips now play twice as fast as the shared 1.3x
  rate (2.6x authored playback). Other clips, maps and movement speeds are unchanged.

- Version 0.9.8: syntax checks, **81 tests**, and production build passed. Desktop
  browser sessions covered Mall pushing/tumbling, Sunken rocking and Iceberg
  movement, plus map/menu transitions, without logged runtime errors. Real phone
  frame rate and final movement feel still need device review. Mall navigation and
  collision requests use an environment-version query to bypass old cached grids.

- Last full suite run: **69 tests passed** during this project naming cleanup. Earlier small UI changes
  passed relevant syntax checks and production builds; do not claim the full suite
  was rerun after each later CSS/copy change.
- Latest production build passed at 0.9.6. No code changes are part of this handoff.
- Original Unreal baseline: 123 protected files unchanged at last check. If those
  reference files are transferred, its script is
  `D:\Projects\PNT\PNT\Scripts\WonderUI\check_baseline.ps1`.
- Browser/computer access was disabled in the previous session. Visual verification
  and real iPhone/Android testing could not be performed there. Check whether
  browser tools are available on the new workstation; do not mistake HTTP checks
  or passing unit tests for visual/device verification.
- Latest portrait crew indicators and the desktop caps need user/device review.
  The user supplied an Android landscape screenshot where the overall HUD looked
  large. Only the crew text was replaced in the latest fix; the whole Android HUD
  has not been comprehensively resized. Keep iPhone 14 Plus behavior intact.
- Sunken/Iceberg performance remains a phone-testing concern. Loading screens,
  cached costumes, collision-grid sight checks and bounded simulation steps exist,
  but these are not proof that all phones sustain a good frame rate.
- Mall coffee furniture now uses dynamic physics; Iceberg has momentum and Sunken
  has authored rocking plus grounded sliding. Sunken barrels/cannons retain static
  collision. Original gameplay audio and online browser networking are not fully
  ported. UI sound effects are implemented.
- Static credits no longer use the retained Ureka image asset. Unused CSS/image
  cleanup is optional; do not restore that logo to the screen.
- README has one stale instruction saying Interact (F); current default is **E**.
  Treat live keybindings and this handoff as authoritative for that detail.

## Suggested first steps after transfer

1. Pull `main`, read this file and `docs/GAMEPLAY_PORT.md`, and inspect Git status.
2. Start the local preview and verify current screens before editing anything.
3. If browser/device access is available, check compact crew heads and desktop
   Play/Join widths, plus the static Todak credits on portrait and landscape.
4. Wait for the user's next requested change; there is no unfinished implementation
   task to resume automatically. Keep future releases below 1.0.0.

## Waiting lobby layout checkpoint — 27 October 2026

Latest gameplay tuning: all character clips play at 1.3x via `ANIMATION_PLAY_RATE`
in `src/pnt/animation.js`. Both police and thief movement speeds use a 1.15x
multiplier in `main.js`, for players and bots. Preview/results clip durations and
hammer impact timing track the faster animation rate. Gameplay round/effect timers
retain their previous durations. Syntax checks, all 69 tests and production build passed.

Home, Tools and Costume previews are 1.5x size with a 30-degree turn toward screen left and raised
camera framing. Its canvas is above the gradient and below controls. The logo is
inside the home button column, centered 18px above PLAY. Desktop preview visually checked.
PLAY stripes pan one seamless 26.481px tile every four seconds, replacing the fast
button-width-based pan that caused flickering.

Latest match visual tuning: running dust emits two puffs every 1.7 world units
(previously three every 0.85). Shared match camera uses zoom 1.1 on every map;
fixed framing and orientation remain. Hammer shake strength is now 0.099 (another
10% above 0.09). Reduced-motion behavior remains.
Jetpack flight emits pooled colored smoke, camera-facing stars and hearts every
0.12s, starting immediately and stopping when flight ends or capture begins.
Pink, cyan, yellow, purple and mint particles fade out within 0.85s. All 70 tests
and production build passed after this update.
Smoke materials now use smooth shading (`flatShading:false`) for shared cloud
meshes and pooled particles, keeping the existing 10-by-7 sphere tessellation.

Follow-up: removed the helper hint beneath the map and the entire bottom lobby
footer bar and its text at the user's request. Lobby markup is in `src/pnt/lobby-ui.js`.

The user requested restoring the waiting lobby (four players and map selection)
to its layout before the 0.9.4 desktop overrides. Only the waiting-lobby desktop
width overrides in `styles/desktop-layout.css` were removed. Host/Join selection
cards and mobile layout remain as before this restoration. Version stays 0.9.7.

The previous larger lobby layout is saved at Git tag
`checkpoint/lobby-larger-2026-10-27` (commit `7716009`). If the user asks to return
to it, restore only the `#lobby` rules from that tag's `styles/desktop-layout.css`;
do not reset the whole repository or overwrite unrelated later changes.

## Repository licence display follow-up

The root `LICENSE` was moved to `notices/foundation.txt` to remove GitHub's
repository-wide third-party licence tab while preserving the original foundation notice.
The build copies `notices/` and still emits `third-party-notices.txt`. Dependency
licences remain with their packages. Do not restore a root third-party licence just to
fix an old file reference; use the new notice path.

## Project naming cleanup

Active game code is now `src/pnt`, browser assets `assets/pnt`, tests `tests/pnt`,
base styles `styles/pnt.css`, menu styles `styles/menu-ui.css`, menu interactions
`src/pnt/menu-effects.js`, shared audio `src/menu-audio`, build `build/pnt-web.mjs`
and preview server `tools/pnt-serve.mjs`. Use these paths, not older historical paths.
The preserved foundation attribution is `notices/foundation.txt`. Original external
source locations are machine-specific; inspect export script defaults before rerunning
exports. Do not assume the Unreal reference folder was renamed by this web cleanup.
