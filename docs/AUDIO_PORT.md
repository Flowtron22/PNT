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
