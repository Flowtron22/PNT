# Police N Thief multiplayer server

The Steam lobby host runs the authoritative match simulation from this folder.
`steam-multiplayer.mjs` handles the Steam peer transport and host migration.
`match-room.mjs` manages seats, countdowns and rematches, and `simulation.mjs`
advances gameplay and publishes snapshots.

From the repository root:

```powershell
npm run test:multiplayer
```

See the [multiplayer guide](../docs/MULTIPLAYER.md) for the current join flow and
the [Steam guide](../docs/STEAM.md) for packaging. The [handoff](../handoff.md)
records the earlier Colyseus browser deployment under its historical notes.
