# Player input

Version 0.9.107 supports keyboard, mouse buttons, touch and a browser-standard
controller. All send the same movement and actions to practice and multiplayer.

## Controller

Connect the controller using your operating system's Bluetooth or USB controls,
open the game, press a button, then let the controls return to rest. The browser
must expose the device with the standard Gamepad mapping; unrecognized mappings
are ignored rather than assigning incorrect tool buttons.

| Input | Match | Menu |
| --- | --- | --- |
| Left stick / D-pad | Move | Navigate |
| A / Cross | Hold to interact | Select / toggle |
| X / Square | Tool slot 1 | — |
| Y / Triangle | Tool slot 2 | — |
| Start / Options | Pause or resume | Resume from pause |
| B / Circle | — | Back / resume |
| LB / RB | — | Previous / next settings tab |

Left/right adjusts focused sliders and select controls. Controls shows connection
status; HUD action labels follow the device being used. Vibration is optional and
depends on the device and browser. Browser audio may require an initial click/tap
or keyboard gesture even when playing with a pad.

Menu and matchmaking navigation gives the active control the same animated orange
hover treatment as the mouse, including its fill, label/icon colour, outline and glow.
Directional movement smoothly scrolls the focused control into view. Lobby rerenders
preserve the focused control by stable ID, so adding bots, changing stages or
preferences no longer resets navigation to the first lobby button. If a selected
control disappears, focus moves to the nearest remaining control instead of Back.
Selecting a tool card moves controller focus to Equip Slot 1, or Slot 2 when Slot 1
is unavailable.

Selecting a text field with the controller opens the on-screen QWERTY keyboard.
Use the stick/D-pad to move, A/Cross to type, X/Square to backspace, Y/Triangle
for a space, B/Circle to cancel and Start/Options to finish. Player-name mode
includes case, apostrophe, hyphen and space controls. Room-code mode accepts only
six uppercase letters or digits. Physical keyboard entry continues to work.

The radial dead zone is 0.14 with full deflection at 0.96. Direction repeats start
at 330 ms then every 130 ms. Tool presses are edges; interaction is held. Pads
must return to rest after reconnecting or clearing input (pause, blur, etc.).

In Couch Crew, entering with keyboard or mouse reserves P1 for keyboard; pressing
Start on a controller then joins the next open player lane. Entering with a
controller assigns that pad to P1. The controller host uses D-pad left/right to
change maps and Start/Options to begin once every human player is ready.

## Keyboard and mouse

Defaults remain arrows to move, Q/W for tools and E held to interact. In Settings
→ Controls → Key & mouse mapping, select an action then press a key or click a
mouse button. Mouse left/right/middle are supported; Escape cancels capture.
Existing assignments swap on conflict and persist across reloads. Reset key
mapping restores Q/W/E and arrows without changing other preferences.

Mapped mouse presses on gameplay scenery trigger actions; pressing existing HUD
buttons invokes their own actions. Right-click context menus and middle-click
autoscroll are suppressed during play and capture, with normal menu behavior
otherwise. Separate interaction owners prevent one device releasing another's
held interaction. Pause, hidden tabs and blur clear all held input.

## Touch

Phone and tablet gameplay uses translucent circular controls. At default scale,
phone minimum sizes are 140px for the joystick base, 78px for each tool and 94px
for Interact. Larger touch screens grow those to at most 184/104/124px, with
safe-area spacing. Settings → Controls still adjusts joystick size/sensitivity.
Cooldown overlays also remain translucent so the arena stays visible.

The floating joystick and each action track separate pointers: movement can
continue while holding Interact or tapping a tool. Pause/blur clears held input.

## Verification

`tests/pnt/controller.test.mjs` covers radial input, action edges, menu repeat,
disconnect/reconnect, reset, unsupported APIs, rumble errors and menu controls.
`tests/pnt/controls-config.test.mjs` covers mouse persistence and conflict swaps.
Browser verification covers mouse capture. Physical USB/Bluetooth controller
playtesting remains necessary on target devices.
