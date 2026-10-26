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
Desktop: WASD move, Shift dash, Space jump, E tool, Escape pause.
Phone: virtual stick and Jump, Dash and tool buttons. The match camera has a fixed
orthographic top-down view; movement follows the screen directions.

Tools equip immediately: hammer stuns nearby opponents, banana leaves a spin trap,
and rocket launches into a short jet boost. Each has an eight-second cooldown.
The Tools page also previews all twelve animation clips. Costumes load on selection
and remain cached; the chosen costume and tool persist on this browser.
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

Online multiplayer, Steam, full PSX capture/escape/rescue rules, equipment effects,
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
against the previous frozen-pose run exports.

`tools/optimize-costumes.mjs` caps embedded costume textures at 512px while preserving
skin weights and animation bones. It requires the optional `sharp` package (or pass
its module path as the first argument). These prepared assets are checked in;
Vercel needs no FBX converter, image processor, or Unreal installation.
