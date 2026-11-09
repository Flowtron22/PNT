# Project delivery rules

Read this file and `handoff.md` before changing gameplay, adding modes, or
preparing a build. These rules apply in every new chat for this repository.

## Target platform

Police N Thief targets **Steam on Windows x64 and Steam Deck via Proton**.
Every new mode, gameplay change, UI change and requested playable build must be
delivered as a Steam desktop package.

The browser prototype, Vercel configuration, `npm run dev`, `dist/` and
`npm run build` are development or historical resources. A browser build alone
does not complete a playable-delivery request. The Steam packager builds the
bundled web renderer as an internal step.

Do not ask the user to repeat the Steam setup or choose the target platform.
Use this workflow unless the user explicitly requests a different target.

## Version and build workflow

1. Read the current version from `package.json`, `handoff.md` and existing
   `dist-steam/win64-dev-playtest-*` folders.
2. For every requested game build, choose a **newer version number**. Increment
   the patch version beyond both the source version and existing packaged builds.
   A rebuild requested in a later turn also gets a newer version.
3. Update `package.json`, `package-lock.json` and visible version labels together.
   Preserve existing packages for comparison. Do not overwrite a previous release
   folder as the normal delivery workflow.
4. Use Windows x64 and Node.js 22.12 or newer. Install dependencies with `npm ci`
   when needed. Steam must be running and signed in for live Steam testing.
   Packaging can run without Steam, but report live testing accurately.
5. Run relevant automated checks, then build with
   `npm run build:steam -- --dev-playtest`.
6. Verify the output folder contains `Police N Thief.exe`, `steam_appid.txt`
   (development App ID 480), runtime dependencies, current assets and current
   game code. Update the handoff's current version and folder to the package
   actually produced. Keep the README and Steam guide current when their release
   information changes.
7. Deliver a clickable absolute path to
   `dist-steam/win64-dev-playtest-<new-version>`. Tell the user to distribute the
   **entire folder**, including `steam_appid.txt`.

See the [current build in the handoff](handoff.md#current-build) for the latest
documented package. Verify it against the source version and local build folders
before choosing the next version.

## New modes and handoff

New modes must integrate with Steam lobbies, mode-specific matchmaking,
authoritative host simulation, snapshots and host migration, as well as the
applicable training and couch flows. Check controller navigation, fullscreen
layout and Steam Deck readability. Deliver the versioned Steam package in the
same task when implementing a playable change.

When the user asks to read Markdown or continue from a handoff, treat these
Steam delivery rules as active instructions. Historical browser notes do not
replace them. Update the handoff with the current behavior, build path,
verification performed and remaining device checks.

Documentation-only work does not require generating a game build or increasing
the game version. Keep `dist/`, `dist-steam/`, dependencies and local audit output
out of Git. Commit source code, required runtime assets and relevant documentation.
