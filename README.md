# Police N Thief Web

A browser practice prototype based on Wonder Wave, using exported PSX characters,
role-specific running and action animations, logo and a selected Mall promenade slice.
The Wonder Wave style menu has Play, Tools, Costume, Setting and Credit pages.

## Play locally

Requires Node.js. Browser dependencies are vendored; no installation is needed.

```powershell
npm run dev
```

Open http://localhost:8491. For a phone on the same Wi-Fi, run `npm run dev:lan`
and use the printed LAN address. `Start Web Preview.cmd` also starts the LAN preview.

Choose runner or chaser for a 60-second practice with three local bots.
Desktop: WASD move, Shift dash, Space jump, E slot 1, R slot 2, Escape pause.
Phone: virtual stick and Jump, Dash and tool buttons. The match camera has a fixed
orthographic top-down view; movement follows the screen directions.

The Tools page follows the Unreal layout: two equipped slots at the top, a catalog
below left, and selected-tool details with Equip Slot 1/2 buttons below right.
Selecting a catalog tool does not change equipment until a slot is chosen. Equipping
an already-equipped tool into the other slot swaps the slots, preventing duplicates.
Hammer stuns nearby opponents, banana leaves a spin trap, and rocket gives a jet boost.
Each slot has its own eight-second cooldown. Old one-tool saves migrate automatically.
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
room. Start Match requires four players and the playable Mall stage, then runs a
cancelable three-second countdown and loads the chase. Sunken and Iceberg are artwork
previews, with launching disabled until their web stages exist. The lobby's bot
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

Online multiplayer, Steam, full PSX capture/escape/rescue rules,
the complete original tool systems, full stages and gameplay audio are not ported yet.
Bots use simple steering and ground sampling; collision/navigation needs further work.
Touch layouts have browser checks, but actual iOS/Android performance is unmeasured.
This project does not change the original Unreal multiplayer implementation.

## Assets and attribution

Browser foundation: Wonder Wave / PURRITORY, Jayden Davis; see LICENSE.
Three.js is vendored. Rubik and Titan One font OFL notices are in assets/fonts.
PSX art has a separate provenance and licence review pending; the source-code MIT
licence does not automatically license that art for public distribution.

The optional Unreal export script requires UE 5.6 and the original PSX project at
its configured source path. It exports copies without saving source packages.
Local reports, exported provenance manifests, build output and credentials are excluded
from version control.

`tools/convert-character-animations.mjs` converts the supplied animation FBXs into
`assets/psx/animations/clips.json`, remapping their axes and bone names to the exported
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
map thumbnails and copies its Host/Join icons. Pass the PSXWonderUI `Resources`
directory and, optionally, a `sharp` module path. Prepared assets are checked in.

## Wonder Wave menu feedback and local profile

The original procedural UI audio engine is retained verbatim under `src/wonder-wave`,
with its source spring tuning, pointer ink fill, tile tilt and press feedback adapted
in `src/psx/wonder-ui.js` and `styles/wonder-ui.css`. Audio unlocks after the first
click or key press; Settings can mute it. `tools/ui-audio-check.html` renders all
seven UI cues offline for a browser smoke check.

The editable profile and current loadout show real browser-local selections. Only
completed practice rounds award wins, matches and XP; leaving early awards nothing.
Ranks and XP thresholds use the reference progression. These are local practice
stats, not an online account or an authoritative multiplayer rating.
