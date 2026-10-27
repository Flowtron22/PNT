# Police N Thief web prototype — handoff

Updated: 27 October 2026 (Asia/Kuala_Lumpur).
Current app version: **0.9.7**. Code baseline before this document: `6ace5d1` on `main`.

## Continue here

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
  **Developed by Todak Studios**. No Ureka logo or upward credits animation.
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

- PLAY -> Host / Join -> local practice lobby -> four players -> three-second
  countdown -> match loading -> match -> on-stage Victory/Defeat -> fade -> results.
- Exactly one police versus three thieves. Five-minute round.
- Thieves win by stealing all money from all caches. Police win by catching all
  three thieves or when time expires with money remaining.
- Hold Interact near a cache to steal or near an eligible teammate to rescue.
- Capture has a one-second smoke sequence before the caught state applies.
- Rescue unlocks after a ten-second cooldown and takes 1.5 seconds of continuous
  interaction. Only one helper owns a rescue; competing bots no longer reset it.
- Host lobby supports bots, map selection, role preference, tools and costumes.
- Public matchmaking / room-code joining are UI placeholders with explicit
  unavailable feedback. **No browser online multiplayer backend exists yet.**

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
- Desktop Play/Join/lobby/results widths cap at 1200px automatically on fine-pointer
  desktop screens above 1024px. Mobile styles retain dynamic viewport/safe areas.
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
- Native dynamic physics, original gameplay audio and online browser networking
  are not fully ported. UI sound effects are implemented.
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
