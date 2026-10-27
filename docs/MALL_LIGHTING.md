# Mall baked lighting

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
