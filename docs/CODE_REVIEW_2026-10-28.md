# Match rules and audio review — 28 October 2026

Release: 0.9.17. Scope: capture/detection, smoke, rescue, terminal match state,
practice/server parity, room action validation and audio lifecycle.

## Findings fixed

1. **P2 — Opening detection grace differed between practice and online.**
   Practice used elapsed gameplay time; the server used its network clock, which
   already included the three-second intro. Online detection could start 1.5s
   sooner after GO. Both now call `detectThiefAt()` in `src/pnt/rules.js`, using
   the same gameplay clock, vertical separation and start grace. Server tests
   cover intro → grace → full 1.6s capture.
2. **P2 — Old capture APIs contradicted the current rules and their tests.**
   Dormant `tag()` could instantly catch and did not enforce smoke protection;
   dormant `beginCapture()` scheduled an unconditional catch one second later.
   Neither had a production caller. Both and the delayed completion path were
   removed; old tests now exercise the actual timed detector. `captureRemaining`
   remains zero in the snapshot shape for existing client compatibility, with no
   producer or completion timer.
3. **P2 — Smoke projection and expiry handling diverged.**
   Practice projected smoke from a different vertical origin than the server and
   bypassed smoke sight checks for nearly coincident positions. Both now use
   `src/pnt/sight.js`. Smoke occupancy is refreshed after movement and hazard
   aging, before banana/detection checks, removing stale protection at expiry.
4. **P2 — Timeout still allowed the rest of that simulation tick to run.**
   Movement and hazard processing continued after the clock declared a winner.
   Both simulations now return immediately; practice still starts its verdict
   UI. Detection also leaves meters untouched during countdown/finished phases.
5. **P2 — Music was tied to a match rather than the current screen.**
   Added an independent music-active flag so the existing BGM plays through
   menu/lobby screens after a browser gesture. Match/scene changes do not create
   duplicate loops. Leaving a match stops gameplay effects while retaining menu
   music. Pause, mute and hidden-tab handling stop music; visibility stops audio
   immediately rather than waiting for a throttled animation frame. Failed audio
   downloads can retry without reloading decoded clips. Audio state is initialized
   before the countdown widget emits its first cue, so that cue isn't cancelled.

## Rules retained and checked

| Rule | Current behavior |
| --- | --- |
| Range | Circle with horizontal radius 2; 2 is eligible, above 2 is not |
| Height | Base-height difference must be strictly below 0.8 |
| Start | Three-second intro, then 1.5s gameplay grace in both modes |
| Capture | 1.6s of valid contact, tracked independently per thief |
| Losing contact | Drain 0.4s of credit per second; full credit drains in 4s |
| Smoke | Blocks capture/stun/tools/stealing; teammate rescue remains allowed |
| Police disabled | Tool animation, stun and jetpack prevent detection; credit drains |
| Rescue | 10s lock, then 1.5s held interaction; 2s immunity after release |
| Victory | All thieves caught, all money stolen, or 300s timeout |
| Same-tick priority | Timeout first, then capture, then money/rescue; unchanged |

## Remaining issues and cleanup risks

- **P2 — The single ring cannot identify whose progress it represents.**
  `src/pnt/detection-zone.js` displays the highest uncaught thief meter. When that
  thief is caught it switches to the next highest, which can look like a reset.
  The underlying meters remain independent. A target indicator or separate
  meters would make this clear; that is a UI decision, not another capture reset.
- **P2 — Practice/server AI and interaction selection are still duplicated.**
  Main client and server each maintain bot decisions, hazard stepping and rescue
  targeting. The detector and visibility are now shared, but future changes can
  still drift. Extract a browser-safe simulation core in a separate change.
- **P3 — `main.js` has too many responsibilities and densely packed functions.**
  UI, networking presentation, local AI, rendering and input are coupled. Split
  by responsibility, starting with local simulation and HUD updates. A broad
  reformat/rewrite was avoided during these rule fixes to keep changes reviewable.

The visible ring remains present while the police uses a tool, although detection
is disabled during that action. This preserves current balance; a disabled visual
state would explain it better. No detection speed/radius/decay values were changed.

## Validation and rollout

- 112 client/rules tests and 16 server tests pass, including real SDK clients,
  countdown, reconnection, smoke expiry, frame-rate capture and movement replay.
- Syntax checks and production build pass.
- Browser control is disabled in the current session; no live visual/audio QA
  was claimed. Browser audio still needs an initial click/tap/key gesture.
- Vercel deploys main automatically. Render uses `codex/multiplayer-local` and
  may need Manual Deploy → Deploy latest commit. Confirm `/health` reports
  version `0.9.17` before considering online rule fixes rolled out.
