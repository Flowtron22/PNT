# Police N Thief Web

A browser practice prototype based on Wonder Wave, using exported PSX characters,
idle/run animations, logo and a selected Mall promenade slice.

## Play locally

Requires Node.js. Browser dependencies are vendored; no installation is needed.

```powershell
npm run dev
```

Open http://localhost:8491. For a phone on the same Wi-Fi, run `npm run dev:lan`
and use the printed LAN address. `Start Web Preview.cmd` also starts the LAN preview.

Choose runner or chaser for a 60-second practice with three local bots.
Desktop: WASD move, drag to look, Shift dash, Space jump, Escape pause.
Phone: virtual stick, drag to look, Jump and Dash buttons.

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
costume selection, full stages, audio and progression are not ported yet.
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
