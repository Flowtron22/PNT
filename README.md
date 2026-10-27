# Police N Thief Web

A browser practice prototype developed by Todak Studios, using PNT characters,
role-specific running and action animations, logo and all three Unreal arenas.
The animated menu has Play, Tools, Costume, Setting and Credit pages.

Version 0.9.9 also includes **local-network multiplayer using Colyseus**. Install
the server once with `npm run server:install`, then run `npm run dev:online`.
Open the printed LAN address on each device and use Host/Join room codes.
See [the multiplayer guide](docs/MULTIPLAYER.md). Public hosting is not enabled yet.

## Play locally

Requires Node.js. Browser dependencies are vendored; no installation is needed.

```powershell
npm run dev
```

Open http://localhost:8491. For a phone on the same Wi-Fi, run `npm run dev:lan`
and use the printed LAN address. `Start Web Preview.cmd` also starts the LAN preview.

Choose thief or police for a five-minute practice with three local bots.
Desktop: arrow keys move, Q slot 1, W slot 2, E interact, Escape pause. Remap movement and actions in Settings; mappings save locally. Desktop shows the same tool icons and three-button layout as mobile.
Mobile: left joystick, two small tool buttons, one large Interact button.
Hold Interact (E) near a cache to steal, or near an unlocked captured teammate to rescue.
Phone: virtual stick, two tool buttons, and the large Interact button. The match camera has a fixed
30-degree perspective view; movement follows the screen directions.

The Tools page follows the Unreal layout: two equipped slots at the top, a catalog
below left, and selected-tool details with Equip Slot 1/2 buttons below right.
Selecting a catalog tool does not change equipment until a slot is chosen. Equipping
an already-equipped tool into the other slot swaps the slots, preventing duplicates.
Five tools are available: Hammer (10s), Banana Skin (5s), Jetpack (15s), Smoke Bomb (30s),
and Rewind Box (10s after returning). Rewind first places a marker, then returns to it.
Each slot has its own cooldown. Old one-tool saves migrate automatically.
Costumes use one shared portrait grid. Police, Thief and every other costume can be
worn in either role; gameplay role determines the running animation, not the outfit.
Costumes load on selection and remain cached. The costume and two-slot kit persist.
Boot and match-start loading screens wait for assets and shader preparation.
Standing characters use `sk_chr_idleB.fbx` in the menu, lobby and match. Its authored
root height is retained so the bent-leg pose stays grounded; movement and attack
clips continue to leave actor movement to the gameplay controller.

## PLAY and lobby flow

PLAY opens Host / Join, following the Unreal HostJoin screen. Join opens public
matchmaking and six-character room-code choices. Online search/join is not connected;
these controls validate input and report that limitation without creating fake rooms.

Host opens a local practice lobby. Add three bots to fill the four podiums, browse
the map cards, change role preference, or edit tools/costumes and return to the same
room. Start Match requires four players and runs a cancelable three-second countdown.
Mall, Sunken and Iceberg load their own arena geometry, spawns and money caches. The lobby's bot
costumes, your kit and costume, and your role preference carry into the match.
Room settings explain that this room is on this device; no joinable code is fabricated.

## Validate and deploy

```powershell
npm run check
npm test
npm run build
```

Vercel uses `npm run build` and serves `dist`, configured in `vercel.json`.
No environment variables or backend service are required for this prototype.

## Current limits

Online multiplayer, Steam, native dynamic map physics and gameplay audio are not ported.
The browser uses local bots, sampled geometry and grid routes. Original Unreal map art,
cache placements, skill-table cooldowns and five-minute timer are reused. Core money,
capture and teammate-rescue rules are implemented; see `docs/GAMEPLAY_PORT.md` for
source evidence and explicit tuning choices. Actual iPhone performance still needs testing.
This project does not change the original Unreal multiplayer implementation.

## Assets and attribution

Browser foundation: the menu foundation (see notices/foundation.txt); see `notices/foundation.txt`.
Three.js is vendored. Rubik and Titan One font OFL notices are in assets/fonts.
PNT art has a separate provenance and licence review pending; the source-code third-party
licence does not automatically license that art for public distribution.

The optional Unreal export script requires UE 5.6 and the original PNT project at
its configured source path. It exports copies without saving source packages.
Local reports, exported provenance manifests, build output and credentials are excluded
from version control.

`tools/convert-character-animations.mjs` converts the supplied animation FBXs into
`assets/pnt/animations/clips.json`, remapping their axes and bone names to the exported
GLB rigs. Police run uses the original `sk_chr_ch_runA` animation exported as FBX to
`.local/police-run.fbx`. This export is required only to regenerate clips, not to build.
The conversion rejects static clips. Bone-motion and per-costume binding tests guard
against frozen-pose run exports. Root animation converts its local basis on the right,
preserving world-up spin instead of turning it into end-over-end rotation. Regression
tests check the banana spin axis, hammer's initial facing, and independent slot timers.

`tools/optimize-costumes.mjs` caps embedded costume textures at 512px while preserving
skin weights and animation bones. It requires the optional `sharp` package (or pass
its module path as the first argument). These prepared assets are checked in;
Vercel needs no FBX converter, image processor, or Unreal installation.

`tools/prepare-lobby-assets.mjs` creates compact WebP copies of the original Unreal
map thumbnails and copies its Host/Join icons. Pass the PNTWonderUI `Resources`
directory and, optionally, a `sharp` module path. Prepared assets are checked in.

## the reference UI menu feedback and local profile

The original procedural UI audio engine is retained verbatim under `src/menu-audio`,
with its source spring tuning, pointer ink fill, tile tilt and press feedback adapted
in `src/pnt/menu-effects.js` and `styles/menu-ui.css`. Audio unlocks after the first
click or key press; Settings can mute it. `tools/ui-audio-check.html` renders all
seven UI cues offline for a browser smoke check.

The editable profile and current loadout show real browser-local selections. Only
completed practice rounds award wins, matches and XP; leaving early awards nothing.
Ranks and XP thresholds use the reference progression. These are local practice
stats, not an online account or an authoritative multiplayer rating.

## iPhone play

Gameplay uses independent pointer IDs: one thumb can hold the stick while other
fingers activate tools or Interact on pointer-down. Delayed compatibility clicks
are ignored; gameplay touch/pinch gestures are cancelled without blocking menu
fields. Touch cancel, lost capture, pause and app switching clear held movement.

Safari on iPhone cannot fullscreen arbitrary game content through the desktop API.
Settings keeps the fullscreen toggle without installation-guide text. The manifest and Apple web-app metadata support launching without
Safari browser bars. No offline asset cache or service worker is installed.

Version 0.7 reuses the reference UI result-screen splats, team bars and victory/defeat
audio, with real PNT money and player totals. The perspective camera views from
the opposite side with 30% wider framing. Movement uses bounded fixed substeps,
velocity damping and interpolated ground height. Hammer impact rings and running
dust are bounded WebGL effects; Unreal Niagara graphs cannot execute in a browser.

Version 0.7.1 adds another 10% camera framing, +15% Mall exposure, and an alpha
WebGL character portrait on results. Native Unreal Pawn capsule collision is sampled
into per-cell occupancy and swept edge masks for all three maps. Movement and bot
routes share those blockers, including invisible Unreal blocking volumes.

Version 0.8.0 fixes rocket steering while airborne and rotates the tool model 90°
about its vertical axis. Banana slips force randomized movement while spinning.
Capture locks a thief in opaque swirling smoke for one second before applying the
caught state. The same varied sphere shapes form smoke bombs and spaced run trails
(roughly one cluster per 0.85m). Every match ends with an in-stage Victory/Defeat
stamp, then a fade into results. Menu backgrounds reuse the lobby art and gradient;
map geometry is hidden while browsing the menu.

Version 0.8.1 preserves the Costume page and scroll position when equipping an
outfit. Defeat portraits play the capture clip then caught idle; victory keeps
dancing. Sight checks use the prepared Unreal collision grid instead of repeatedly
scanning visual triangles. Loading screens still wait for assets and shader warmup.
`node tools/benchmark-map-sight.mjs` compares query costs on the local desktop CPU;
it is not an iPhone frame-rate measurement.

Version 0.8.2 gives each release interaction a stable owner, so competing bots
cannot reset its progress. Other bots choose another task while a rescue is owned.
The Play, Join, Lobby and Results pages have dedicated mobile portrait/landscape
layouts, dynamic viewport height, safe-area spacing and reachable scrolling content.
Every map uses the same perspective framing function; it is widened another 10%.
