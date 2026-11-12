# Police N Thief on Steam

## Required delivery workflow

These rules apply to every new chat and requested game build. Read
[AGENTS.md](../AGENTS.md) and the [handoff](../handoff.md) first.
Steam on Windows x64 and Steam Deck through Proton is the target.

For every requested playable build, increment the patch version beyond the
source version and existing packaged versions. Update the lockfile and visible
version labels, run the relevant checks, then use
`npm run build:steam -- --dev-playtest`. Deliver the complete
`dist-steam/win64-dev-playtest-<new-version>` folder, including
`steam_appid.txt`, and update the handoff with its current version and location.
Documentation-only work keeps the current game version.

The static renderer build is an internal packaging step. New modes and gameplay
changes require the Steam package as their playable deliverable.

Online matches use Steam lobbies and Steam peer networking. The lobby host runs
the authoritative match simulation. If the host leaves, Steam assigns a remaining
player as the new host. An active match resumes from the latest received state
and the departed host's character becomes a bot. If the match was counting down
or loading, the players return to the same lobby and can start it again.
PC and Steam Deck use the same Windows x64 package, with Proton on Deck.

## Private development playtest

Current development package is **0.9.186** in
`dist-steam/win64-dev-playtest-0.9.186`.

The windowed client opens at a fixed size. Toggle fullscreen in Settings → Video, or press F11 or Alt+Enter.

**Settings → Video → Render resolution** sets the maximum 3D resolution from
720p to 4K after you select **Apply**. Auto follows the Low, Medium, High and
Ultra presets with 720p, 900p, 1080p and 4K caps respectively. The game fits the
display aspect ratio and scales the menus and HUD independently of this setting.

Build on Windows with x64 Node.js 22.12 or newer. Run Steam and sign in.

```powershell
npm ci
npm run build:steam -- --dev-playtest
& ".\dist-steam\win64-dev-playtest-$(npm pkg get version | ConvertFrom-Json)\Police N Thief.exe"
```

Share the entire `win64-dev-playtest-<version>` folder privately. This build uses Valve's
Spacewar App ID (480) via its own `steam_appid.txt` and has a separate save
directory. Each player needs a different signed-in Steam account. Use the same
PNT build on every machine.

1. The host selects **Play → Solo Online → Create a Room**.
2. Choose **Public** or **Private** under **Room Setting**. Public rooms appear
   in PNT matchmaking. Private rooms are available by room code or invitation.
3. Share the seven-character **Room Code**, or select **Invite Steam Friends**.
   Testers can enter the code in **Join a Room** or accept the Steam invite.
4. Fill empty seats with bots and start the match.

For Patty Prowl, start from **Events → Patty Prowl → Solo Online**. Room codes and
Steam invites can also take a player directly into a Patty Prowl lobby.

For **Slippery Shoots**, use **Events → Slippery Shoots → Solo Online**.
Each room has four seats, split into Red and Blue. Empty seats can be filled
with bots. Training and couch play are also available from the event.
See [mode rules and asset pipeline](SLIPPERY_SHOOTS.md).

For **Balloon Bash**, use **Events → Balloon Bash**. Training, couch play and
Steam online use the same four-player free-for-all rules and fixed Hammer/Banana
kit. See the [mode notes](BALLOON_BASH.md).

For **Galah Panjang**, use **Events → Galah Panjang**. Seats 1 and 3 play Blue,
and seats 2 and 4 play Red. Each team gets one 45-second turn to run. Each runner
who crosses the far dashed line and returns over the home dashed line scores one
point. Guards tag on contact. The lead guard uses the blue front and center
lines, and the line guard patrols the two red lines via the sidelines.
The painted court has four 6.2 × 6.2 game-unit boxes arranged in two lanes.
Use movement controls to run or guard. Training and Couch Play fill the court
with bots, and Solo Online uses Galah Panjang matchmaking.
Players can coast about ten game units when releasing movement at full speed
on open ground. Court boundaries limit the slide.
A tag plays Classic's capture smoke and caught animation.

**Find Public Match** searches Steam for a lobby with the same PNT build and
game mode. It refreshes a quick search that finds no joinable room before
creating a public lobby. After leaving a room, the next online action waits for
Steam to clear local membership in the previous room.
See Valve's [Spacewar example](https://partner.steamgames.com/doc/sdk/api/example)
and [lobby documentation](https://partner.steamgames.com/doc/features/multiplayer/matchmaking).

## Steam distribution

```powershell
$env:PNT_STEAM_APP_ID = 'YOUR_STEAM_APP_ID'
npm run build:steam
```

Use the assigned game App ID for release or the assigned
[Steam Playtest App ID](https://partner.steamgames.com/doc/features/playtest)
for a Steam-distributed playtest. Upload the contents of `dist-steam/win64`
to the Windows depot and set the launch executable to `Police N Thief.exe`.
The pinned `steamworks.js` package supplies the native binding and
`steam_api64.dll`. The [full Steamworks SDK](https://partner.steamgames.com/doc/sdk)
includes SteamPipe upload tools.

The Windows depot installs the contents of `win64` into the player's game
directory. Keep the runtime DLLs, `.pak` and `.bin` files, `locales/`, and
license notices alongside the executable. `resources/app/` holds the game,
assets, and Steam integration. The release packager omits `steam_appid.txt`.
Steam supplies the assigned App ID at launch. The private dev-playtest package
includes `steam_appid.txt` for Spacewar App ID 480.

For an offline packaging check, run `npm run build:steam -- --smoke-test`.

## Device checks

- Test a host and a guest on separate Steam accounts and internet connections.
- After results, have the host create a public room in a different mode. The guest
  should return to the menu and immediately use Find Public Match in that mode.
  Repeat with the new room code.
- Check the invite overlay, join by room code, and host transfer in the lobby and in a match.
- In Deck Gaming Mode, check gamepad navigation, fullscreen at 1280 × 800,
  HUD readability, and suspend and resume.
- Check Slippery Shoots rink collisions, sliding turns, team-facing kickoff,
  shooting, goal dance/countdown, shot-only trails and winner portraits.
- Check the rounded tool/costume stars, orange focus fill on both play options,
  and complete home logo at desktop fullscreen and Deck aspect ratios.
