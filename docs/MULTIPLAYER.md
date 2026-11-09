# Multiplayer

Online matches use the Steam desktop build. Follow the [Steam playtest guide](STEAM.md)
to build, host and invite players. The host runs the authoritative simulation
for countdowns, bots, tools, and match results.

Choose **Create a Room** or **Join a Room** from Solo Online. A seven-character
code or Steam invite joins a specific lobby. Public matchmaking looks for the
same mode and build. The host can set visibility and choose the stage while the
lobby is waiting. Fixed-arena events have one stage.

Steam transfers ownership when the host leaves. An active match resumes from
the latest received snapshot and a bot takes over the departed host's seat.
Balloon Bash snapshots also carry the remaining balloons, sphere positions,
and drop timing.

Run `npm run test:multiplayer` to check the match rules and exercise the
transport using simulated Steam peers. Use separate Steam accounts and
machines for an internet playtest.
