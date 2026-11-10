# Splish Splash

Available from **Events → Splish Splash** in Steam playtest **0.9.160**.
Training, couch and Steam online use mode ID `splash`, rules version `4`.

Four individual players compete for the largest share of paintable floor in
120 seconds. Repainting replaces the previous owner. Exact cell counts decide
the winner; equal largest counts draw. The HUD and results show percentages.
Unpainted floor remains in the denominator; box footprints do not count.

- Move to aim; hold Interact (default E / controller A) to run a continuous paint hose. Interact automatically surfaces before firing.
- Slot 1 (default Q / X) toggles submerge. Move into your own paint to refill
  at 42 ink/second, then surface with the same button before shooting.
- The 160-unit tank gives 60% more spray time. The stream paints twice the previous width and throws round droplets from its impact point.
- Slot 2 (default W / Y) throws a paint can: 30 ink, five-second cooldown,
  larger landing splash. The back-mounted can launches at the hit beat of the unarmed Hammer Smash animation. Aim with movement and use the dotted arc and landing ring to line up the launch.
- A small five-ink/second idle recovery after .9 seconds prevents an empty-tank
  deadlock if all of a player's territory is overwritten.
- Standard equipped tools do not apply. This mode has no damage or elimination.

The 24 × 24 metre arena has a fixed shared camera with Tile Tumble's viewing
angle and 10% tighter zoom. Eight seeded boxes shift independently each round,
with varied dimensions and three-segment bevels. Players slide against
chamfered collision footprints; the hose stops at cover and the launch guide selects a clear arc.
Splashes cannot paint through boxes. Each match selects a new seed.

`src/pnt/splash-rules.js` runs in local and authoritative Steam simulation.
A ground contact lightmap is baked once per seeded layout. The ownership map, exact counts, projectiles, ink, action cooldowns, bot goals,
cover and random generator state are in snapshots. `paintSeat` remains canonical
when a guest's own player is remapped to local actor zero. Host restoration uses
the received layout and continues the same rules. Steam lobby discovery isolates
this mode, and the rules-version handshake rejects incompatible peers.

`src/pnt/splash-view.js` reconstructs smooth paint contours from ownership and draws beveled cover, a continuous spray,
paint cans and splash ripples. The design adapts the paint/repaint/submerge loop
from `D:/Projects/wonder-wave` (`world/paint.js`, `game/weapons.js`, `game/actor.js`).
The existing MIT notice in `notices/foundation.txt` remains distributed.

Verification includes rules, collision, scoring, full-state restoration, guest
seat mapping, removed-tool controller navigation and a three-peer simulated Steam
public/room-code match with host migration. Actual Steam-account networking,
physical controllers and Steam Deck/Proton remain device checks.
