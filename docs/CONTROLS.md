# Player input

Version 0.9.41 supports keyboard, mouse buttons, touch and a browser-standard
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

The radial dead zone is 0.14 with full deflection at 0.96. Direction repeats start
at 330 ms then every 130 ms. Tool presses are edges; interaction is held. Pads
must return to rest after reconnecting or clearing input (pause, blur, etc.).

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
