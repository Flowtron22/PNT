# Slippery Shoots

Open **Events → Slippery Shoots** in the Steam build. The stable internal mode
ID is `strikers`, arena ID is `slipperystriker`, and rules version is 12.
Earlier display names Patty Strikers and Slippery Striker are superseded.

## Rules and presentation

Four players form two teams. Blue starts on the right and Red on the left.
Most goals after 60 active seconds wins. Equal scores produce a draw.
Hammer and Banana are the fixed kit. Hammer stun lasts 1.5 seconds.

Touch the ball to gain possession. It follows through damped dribbling and drops
on a stun or banana slip. Shoot uses the interaction binding. A kick locks movement
through its .32-second anticipation and .8-second animation. Contact launches
the ball at 19 m/s, or 24 with Power, and 5 m/s upward. Gravity is 25 m/s².
Loose-ball rolling deceleration is .65 m/s². Sidelines rebound the ball and
goal crossings use a swept line check. Speed, Power and Shock pickups last eight
seconds. Pickup blocks have chamfered corners, roughness .3 and metalness zero.

Goals trigger a camera shake and three confetti bursts. The scoring team dances
for two seconds before the player reset, 3–2–1 countdown and midfield ball drop.
The clock pauses throughout this sequence. Confetti has 78 sprites per burst,
2.25× size and .55-second intervals. The ball emits jetpack smoke with pink accents
only after a shot. Its indicator is a solid yellow pulse. Reduced Motion suppresses
the pulse, spin lightning, local slow-motion beat and camera shake.

The rink uses Iceberg steering and braking, restored after the heavier drift
experiment. Running animation is 2×. Camera distance is .72 of the fitted distance,
with a -.55 m X framing offset. Results show the winning selected costumes dancing
and compare goals, shots, tools used, Hammer stuns and possession.

## Assets and integration

The source `slipperystriker.fbx` and `bgr_airhockey_tex.png` reside in
`G:/My Drive/PSX/02_Assets/3D/01_Maps/Model_Resources/brawlstar/air-hockey-environment/source/hockey/`.

```powershell
node tools/prepare-slippery-striker.mjs "<source-directory>/slipperystriker.fbx"
npm run build:steam -- --dev-playtest
```

The converter normalizes the ice to game scale, embeds the PNG atlas in the GLB
and samples the ice mesh into navigation heights. Checked-in runtime files are
`assets/pnt/arenas/slipperystriker-lit.glb`, metadata, navigation and collision
JSON. The menu preview is `assets/pnt/maps/slipperystriker.svg`.

- `src/pnt/strikers-rules.js` contains shared possession, shooting, buffs and goals.
- `src/pnt/strikers-view.js` draws the ball, marker, blocks and spin lightning.
- `src/pnt/environment.js` and `player-motion.js` share rink movement with prediction.
- `server/simulation.mjs`, `match-room.mjs` and `steam-multiplayer.mjs` handle
  authoritative play, matchmaking and host transfer.
- `src/pnt/main.js`, `results-ui.js` and `game-fx.js` integrate UI and effects.
- `tests/pnt/strikers.test.mjs` and `server/tests/strikers.test.mjs` cover rules,
  kick timing, scoring resets and the authoritative rink boundary.

## Verification

The Steam dev-playtest contains the imported rink and event code.
Automated tests cover behavior and packaging. Live Steam and Steam Deck checks
remain necessary for appearance, collision alignment, kick readability, goal
timing, controller focus, fullscreen logo and winner portrait layout.
