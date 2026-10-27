# Wonder Wave source reused by Police N Thief

Unmodified copies from `D:/Projects/wonder-wave/src`: `audio/audio.js`,
`audio/music.js` and `config.js`. Copyright and MIT terms remain in the root LICENSE.
The web game instantiates the original AudioEngine with music disabled; only its
UI sound definitions are used. No Wonder Wave backend or game mode is started.

The cursor spring, pointer origins, tile tilt, rounded focus styling and profile
layout in `src/psx/wonder-ui.js` / `styles/wonder-ui.css` are adapted from
Wonder Wave's `src/ui/menus.js` and `styles/ui.css`. The original shared `Spring`
class is retained in `src/ui/ui-util.js`. PSX controls, two tool slots and costumes
retain their own data and gameplay behavior.
