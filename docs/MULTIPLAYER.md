# Multiplayer prototype — local and online testing

Version 0.9.9. Colyseus 0.18 server, JavaScript browser SDK. The user authorized
a free online test on Render after the local test. No paid upgrade is authorized.

## Online hosting

- Website: `https://police-n-thief.vercel.app/`
- Game server: `https://pnt-multiplayer.onrender.com`
- Render service: `srv-dbg9g4vb9u1s73cleivg`, Free, Singapore.
- Source branch: `codex/multiplayer-local` (public Git repository deployment).
- Build: `npm --prefix server ci --omit=dev`; start: `npm run multiplayer`.
- Environment: `NODE_VERSION=24`, `NODE_ENV=production`, `ALLOWED_ORIGINS`
  includes the exact Vercel origin plus localhost/LAN test origins.
- Health check: `/health`. Vercel's `buildCommand` sets `PNT_MULTIPLAYER_URL`.
- Free hosting sleeps after 15 minutes without inbound traffic and can take
  about a minute to wake. It may restart; rooms are held in memory and are lost
  on a server restart. Suitable for prototype testing, with no uptime guarantee.

Choose PLAY → HOST LOBBY, then share the code. Other devices choose JOIN LOBBY.
Internet clients do not need the same Wi-Fi and the developer PC can be off.

## Run

Node.js 24+. Install the server once:

```powershell
npm run server:install
npm run dev:online
```

The launcher starts the LAN website on port 8491 and Colyseus on 2567. It prints
the PC's LAN address. Stop an existing preview/server first if either port is in
use. Keep this terminal and the PC running during the test. Ctrl+C stops both.

1. Open the same printed website address on each device on the same Wi-Fi.
2. On the first device, choose **PLAY → HOST LOBBY**.
3. On other devices, choose **PLAY → JOIN LOBBY**, enter the six-character code,
   then **JOIN ROOM**. Names/loadouts/costumes come from each browser's profile.
4. The host can add bots for empty seats, choose a map, and start with four seats.
5. Everyone loads the selected map before simulation begins. A client opening its
   pause menu stops its input; the online match continues for everyone.

**LOCAL PRACTICE** remains available without a game server. `npm run dev` still
starts that website alone with vendored browser dependencies.

## Implemented

- Private six-character room codes and public-room matchmaking.
- Server-enforced host controls, roster capacity, role preferences (exactly one
  police), map selection and a shared countdown/loading readiness barrier.
- Fixed 60 Hz authoritative movement, collision, bot decisions, tools, cooldowns,
  cash, rescue, 1.6-second police detection, round timer and winner.
- Shared movement implementation in `src/pnt/player-motion.js` for local practice,
  server simulation and browser prediction. Local-player prediction with bounded
  correction; interpolation of remote players and furniture. This is an initial
  implementation, not complete input-history rollback/lag compensation.
- Map effects: original Iceberg slip with its latest movement/animation tuning,
  Sunken tilt/sliding, and server-simulated Mall furniture. Only the server runs
  online furniture physics; browsers render its poses.
- Authoritative snapshots at 20 Hz. Tool/capture events produce client-side VFX;
  cosmetic particle randomness is intentionally not synchronized.
- Twenty-second reconnection reservation for temporary connection loss. After
  expiry, a departed player becomes a bot during the match. Host ownership passes
  on final departure. Fully empty rooms are disposed.
- Per-player results and host-controlled rematches. XP/profile persistence remains
  browser-local. Account refresh/rejoin after reloading the page is not implemented;
  automatic reconnection covers a temporary drop on the same page.

## Server layout

| File | Purpose |
| --- | --- |
| `server/run.mjs` | Node bootstrap, vendored Three.js resolution and listener |
| `server/app.mjs` | Colyseus transport, origin policy and health endpoint |
| `server/game-room.mjs` | Sessions, lobby, authority, ready barrier, reconnects |
| `server/simulation.mjs` | Match rules, input validation, AI, tools and snapshots |
| `server/arena.mjs` | Cached native map/navigation data and headless Mall geometry |
| `src/pnt/multiplayer.js` | SDK connection and canonical-to-local seat mapping |
| `src/pnt/online-presentation.js` | Replicated hazard/tool/capture presentation |
| `tools/pnt-multiplayer.mjs` | LAN website/server launcher |

Client messages contain movement intent and actions, never accepted world
positions, cash totals, capture claims or arbitrary player IDs. Server-side
movement input is normalized, sequenced and expires after 0.4 seconds without an
update. Colyseus limits messages and frame size. Requests from production browser
origins must match `ALLOWED_ORIGINS`.

## Verification

```powershell
npm run check
npm test
npm run test:multiplayer
npm run build
```

The root suite has 84 tests; the server suite has five tests, including four real
SDK clients joining over HTTP/WebSocket, capacity, host permissions, readiness,
shared state, cooldown enforcement, reconnect, end/rematch/map switch, public/private
isolation, timed capture, input validation, stealing, rescue and Mall furniture.
Two browser clients completed a shared Mall match with matching clock/cash totals
and correct separate victory/defeat results. Tests use loopback, not cellular
latency or a production load. Real phone testing and internet-latency tuning remain.

On 27 October 2026, four real SDK clients also passed a hosted Render smoke test:
private room joining, shared Mall match, all 15 furniture poses, acknowledged
movement input and replicated hammer activation. All test clients left afterward.

## Future public deployment

Vercel continues to serve the static website. Run the persistent Colyseus server
on Colyseus Cloud or another Node.js host. `@colyseus/tools` is included for Cloud
compatibility. For a repository-root deployment, install using
`npm --prefix server ci --omit=dev` and start with `npm run multiplayer`.
`Dockerfile.multiplayer` is also provided for a Node/container host.

Set server `ALLOWED_ORIGINS` to the exact public website origin. Use HTTPS/WSS for
internet play. On the website build, set `PNT_MULTIPLAYER_URL` to the public HTTPS
Colyseus URL. The build writes that public endpoint into the generated client
configuration; no secret belongs in this value. Until configured, the production
website explicitly reports that the online server is not deployed. The current
Vercel configuration supplies the Render endpoint during its Linux build.

This phase uses guest identities and browser-local profiles. Persistent accounts,
rankings, moderation, internet load testing and multi-process server coordination
are later work. The public service uses Render's Free compute plan.
