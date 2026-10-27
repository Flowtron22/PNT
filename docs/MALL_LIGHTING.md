# Mall baked lighting

## Shared treatment on all maps

`bakedArena(arena,id)` now applies the approved contrast (mask^2.3) and 1.15×
saturation to Mall, Sunken and Iceberg. Sunken uses only `SunkenShip` as a bake
receiver, with the upward-normal mask restricting shading to deck-facing surfaces.
Iceberg uses only `sm_ib_icefloor`; its emissive texture and transparency remain.
Both retain their original scene lighting and map mechanics, including ship tilt.

Generate the new UV-equipped variants and atlases with Blender:
`tools/bake-arena-contact.py -- sunken` or `-- iceberg` (arguments after `--`).
Only receivers get a second UV; original materials and polygon assignments are
restored before export. Original GLBs are preserved. Water and invisible collision
meshes are excluded from bake rays. Validate with
`node tools/verify-mall-lighting.mjs sunken` (or `iceberg`).
Preview with `tools/preview-mall-lighting.py -- --contact --arena=sunken`.
Offline previews preserve transparency/emissive textures and show AO placement,
not the runtime camera, scene lighting or saturation grading.

## Current: floor contact AO only

The broad full-lighting bake was rejected visually. The runtime now uses original
MeshStandardMaterial lighting with `aoMap` only on mainfloor, boutique/cafe floors
and the bridge. Walls, foliage, counters and props receive no AO texture.
The 0.4-unit AO radius and upward normal threshold 0.8 keep shading near ground
contacts. AO strength is baked at 65%; the raw non-color atlas is 2048² / ~165 KB.
No sun or bounce lighting is included. The previous full lightmap is not loaded.

Visibility correction: the default Three aoMap only affects indirect light and
was washed out by the Mall's direct lighting. Floor materials now replace that
ambient-only application with a single final-light multiplier (mask^2.3).
The contact footprint stays 0.4 units; other materials have no shader override.
This is an artistic contact shadow under both direct and indirect lighting.
Mall scenery and movable props also receive 1.15× display-space saturation after
tone mapping/color conversion. This composes with the floor-contact shader;
characters, HUD, menu and other maps are unchanged.

Run `tools/bake-mall-contact.py` in Blender to regenerate; it uses the UVs from
`mall-lit.glb` and excludes movable props. Offline AO-placement preview:
`tools/preview-mall-lighting.py -- --contact`. Preview displays albedo multiplied
by AO, not the game scene lights. The runtime preserves the original lights.

## Previous full-lighting bake (reference)

The web Mall has a separate `mall-lit.glb` and a shared 2048² RGB
`mall-lightmap.png`. Original `mall.glb` and Unreal assets are untouched.

`tools/bake-mall-lighting.py` runs in Blender 5.2 background mode. It imports the
exported GLB, makes instance geometry independent, unwraps a second UV atlas,
then bakes 48-sample Cycles combined lighting on white diffuse surfaces: soft
sun, sky, two diffuse bounces, and AO blended at 65% over a 1.6-unit radius.
Original materials are restored before exporting geometry; albedo UVs remain
on channel 0. Each fixed instance has unique lightmap UVs on channel 1.

All 15 `BP_CoffeeChair*` / `BP_CoffeeTable*` props are hidden during baking and
have no second UV. They keep existing runtime materials and physics; their
spawn locations do not leave baked shadows. Characters are also absent from
the bake. No navigation, collision grid or server simulation is regenerated.

`bakedMall()` in `src/pnt/arena-appearance.js` applies the atlas to static
geometry only, using MeshBasicMaterial with lightMap intensity PI × 1.6. Three's
Basic lightmap shader divides by PI before multiplying albedo. This avoids
adding runtime lights on top of already baked lighting. Original color maps,
alpha, sides, vertex colors and fog are retained. Dynamic props and characters
continue using the scene lights. Other arenas and menu background are unchanged.

Rebuild:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/bake-mall-lighting.py
node tools/verify-mall-lighting.mjs
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/preview-mall-lighting.py
npm run build
```

The verifier compares names, triangle counts and transformed bounds against the
original, and checks that only fixed meshes have TEXCOORD_1. The offline preview
multiplies the atlas by original albedo; it uses Blender AgX rather than Three's
ACES display transform, so it is a shading check rather than a browser screenshot.

To revert: load `mall.glb` instead of `mall-lit.glb` and omit `bakedMall()` in
`loadArena()`. The original is kept in the repository.
