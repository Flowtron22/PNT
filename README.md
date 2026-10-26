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
the complete original tool systems, full stages, audio and progression are not ported yet.
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
