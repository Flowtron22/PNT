# Unreal gameplay audio port

Inspected 27 October 2026, Unreal 5.6.1, source project
`F:/PROJECTS/PS_3D/GitHub/PSX`. No source packages were saved or modified.

The source contains 40 assets under `/Game/_MyGame/Audio`: 28 SoundWave clips,
SoundCue graphs and a SoundMix. SoundWave exports work with Unreal's WAV exporter.
The read-only audit and uncompressed exports remain in `.local/audio-audit/`.

`Gameplay_Mall` is a SoundCue concatenating the three/two/one/go narration with
a looping `/Game/Assets/Sounds/A_UI_0827` wave (64.203 seconds). The web game uses
that looping track as `assets/pnt/audio/gameplay-bgm.mp3`. It does not duplicate
the source narration over the web game's own countdown UI.

The browser build includes 21 original gameplay clips and the looping music,
converted from the exported WAVs with LAME MP3 encoding. Total encoded size is
approximately 1.27 MB. Source UI clips and unrelated reference assets were not
substituted into the existing menu sound system.

`src/pnt/game-audio.js` shares the menu's unlocked Web Audio context. It preloads
and decodes the clips during match loading, plays tool activation/impact,
jetpack flight/landing, banana slips, stun, capture/rescue, match start and money
feedback. Remote effects attenuate with distance. Jetpack and music loops stop
when paused, hidden, in portrait on a phone, or leaving the match. Separate
Gameplay sounds and Gameplay music switches persist locally in Settings.

The source names are retained for gameplay MP3s to make their provenance clear:
`Tool_Hammer_*`, `Tool_Banana_*`, `Tool_Smoke_*`, `Tool_Jetpack_*`,
`Tool_Rewind_*`, `Player_*`, `Police_Capture_*`, `Thief_*`, `Match_*`.
Some spare clips are bundled for later cue refinements. No audio synthesis or
Unreal SoundCue execution is required at runtime.


## Player-supplied collection and footsteps (0.9.46)

The user supplied `SE_O_Coin_GET3.wav`,
`00001 - WAV_1_GUESS_BNK_SE_FS_PC51.wav` and
`WAV_0_GUESS_BNK_SE_FS_PC54.wav`. `tools/prepare-player-audio.ps1` prepares
mono 44.1 kHz PCM copies (~80 KB combined). The coin clip trims its silent tail
at 0.72 seconds with a short fade; footsteps A receives +16 dB so both footstep
clips peak around -9 dB. The downloaded source files are unchanged.

`Coin_GET3` loops only for the local thief while holding Interact, with actual
active cache ownership. Release stops immediately even before a network update;
smoke, capture, empty caches, pause and leaving also stop it. Footsteps alternate
A/B after grounded movement distance, attenuate remotely, reject teleport deltas,
and stay silent in flight, stun, capture or pause. They use the existing SFX bus.

## Player-supplied announcer and B2B return (0.9.71 / server 0.9.23)

Copied these nine WAVs unchanged from C:/Users/User/Downloads/audio into
assets/pnt/audio (48 kHz, mono, 16-bit PCM; about 1.6 MB total):

| Event | WAV basename |
| --- | --- |
| Local player wins, on-stage verdict | vc_narration_result_victory |
| Local player loses, on-stage verdict | vc_narration_defeated |
| Local player completes a rescue | vc_narration_incledible |
| Local player's second capture this match | vc_menu_narration_nailedit |
| Local player's second rescue this match (replaces Incredible) | vc_menu_narration_nocontest |
| Winning player's results/stat screen | vc_narration_congratulation |
| Local thief successfully hammer-stuns police | vc_menu_narration_mob |
| Local police successfully hammer-stuns a thief | vc_menu_narration_vipsmash |
| B2B returns to its mark (replaces the old teleport SFX) | se_assist_ghirahim_teleport |

The source spelling incledible is retained. Capture/rescue totals count successful
actions, including recaptures/rescues after release, and reset every match. Shared
rules increment captures/rescues; local and server hammer hits increment stuns.
Authoritative snapshots carry these additive per-actor counters. Client seat
remapping preserves them; initial/reconnect snapshots establish silent baselines.
Couch cues follow all human seats, excluding bot actions; verdict/stat audio
follows P1's outcome. Existing SFX/master volume controls apply to every clip.

Announcer clips use one voice with a bounded eight-entry queue. Countdown beats
and the verdict interrupt old announcements; congratulations waits for the current
voice. Pause, mute, page hiding, menu exit and new matches clear pending lines.
B2B placement keeps its original deployment sound; only a successful return uses
the supplied teleport WAV, with existing remote attenuation.

## Defeat stats narration (0.9.81)

The losing results/stat board plays vc_narration_failure.wav once per match,
queued after the existing on-stage defeated cue. Winning stats retain
vc_narration_congratulation.wav. Copied the source failure WAV unchanged from
C:/Users/User/Downloads/audio; the user typed failuer, but the supplied filename
is failure. The clip joins narration preload and the existing volume/mute/queue
controls. Results refreshes cannot replay it. No server change.
