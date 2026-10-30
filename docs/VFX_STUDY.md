# VFX reference studies

Project learning notes: observations from references, implementation ideas, and
approved direction. These notes preserve context for later chats; they do not
change model weights or automatically approve changes to existing effects.

## Study 01 — Laser beam breakdown

Reference: [VFX Breakdown Laser Beam](https://www.youtube.com/watch?v=Zf4skMYAPu4)
by YouTube channel ДШ (@chakarock). The description links to
[Daniil Shmelkov's ArtStation](https://www.artstation.com/danver_07).
Studied on 30 October 2026.

### Evidence and limits

Inspected the opening in playback and sampled paused frames across the
100-second video, including labelled mesh and texture breakdowns. Captions were
unavailable. Browser playback became disabled before a complete motion review.
The layer descriptions below are visual observations. Shader recipes, performance
choices and animation principles are our interpretations, not verified source
code from the artist. Exact animation curves, blend modes and emitter settings
remain unknown. Do not claim a complete frame-by-frame study.

### What the breakdown shows

| Component | Observed construction | Role in the image |
| --- | --- | --- |
| Core | A sphere mesh with a bright yellow centre | Establishes a clear source and focal point |
| Glow | Soft radial texture; another glow layer is also shown | Builds a soft halo around the solid source |
| Electrical discharge | Sphere mesh, a bright irregular line texture and a separate distortion map | Adds fine, broken energy around the source |
| Trails | Purple curved surrounding shapes; texture and bump map are displayed | Adds larger directional movement around the core |
| Point light | Pink illumination visibly reaches the character | Connects the effect to its surroundings |
| Dark waves | Sphere mesh and an irregular texture; dark purple shapes surround the bright source | Preserves contrast and a readable outer shape |
| Beam background | Elongated rounded mesh, streak texture and two maps labelled Bump 1/Bump 2 | Gives the beam a broad magenta/purple body |
| Plasma | A narrow bright line texture and a distortion map are displayed | Creates the strong yellow/white beam centre |
| Ground reflection | A separate texture is displayed for the ground response | Provides another environment connection |

Small bright streaks are also visible around the assembled effect. The sampled
frames did not establish their exact emitter configuration. Likewise, the
ground-reflection label does not prove real-time ray tracing or a screen-space
reflection implementation.

### Lessons to apply

1. **Give each layer a job.** Start with the core shape and direction. Add a
   surrounding body, contrasting shapes, motion detail and environment response
   only where each improves the read. Particle count alone is not a quality goal.
2. **Design large, medium and small shapes together.** The beam/core defines the
   large read, curved purple shapes provide the middle scale, and fine arcs and
   streaks add accents. Keep the small detail subordinate to the focal shape.
3. **Use brightness hierarchy.** Reserve the highest values for the source and
   beam centre. Saturated surrounding colour and darker shapes give those values
   something to contrast against. Making every layer bright weakens this read.
4. **Let textures shape simple geometry.** The visible sphere and elongated mesh
   are carriers. Textures and their animated treatment supply much of the surface
   character. A plain glowing primitive is only a starting layer.
5. **Distinguish distortion from bump.** The video labels both. A possible port
   uses vector noise to offset texture coordinates and normal maps to alter
   lighting, but the exact original material wiring is not shown. Neither label
   alone proves background refraction or geometry displacement.
6. **Connect the effect to the world.** The visible character illumination and
   separate ground response help the effect occupy space. Use a selective light
   or a soft ground patch where useful, rather than relying entirely on glow.
7. **Treat timing as authored work.** For our implementations, design buildup,
   release, sustain and dissipation independently, with different scale,
   brightness and emission curves per layer. This is a proposed workflow; exact
   phase timings from this reference still need a motion review.

### Translation to the Three.js game

- Build effects from separately controllable mesh, ribbon and sprite layers.
  Keep the dominant shape readable from the actual gameplay camera before adding
  secondary detail. Debug previews should allow soloing each layer.
- A candidate energy material combines a shape mask with scrolling texture
  coordinates, modest noise distortion, a colour ramp and a controlled erosion
  threshold. Use separate parameters for width, glow radius and lifetime.
- A future beam can use a broader coloured outer mesh and a narrower bright
  centre, each with its own motion and fade. This is an implementation proposal,
  not a request to add a beam to the current game.
- Prefer pooled or instanced accents, bounded lifetimes and reusable geometry.
  Large overlapping transparent layers can cost more than their triangle count
  suggests. Measure on target devices before increasing their number or area.
- Judge both still frames and playback: silhouette, focal point, action timing,
  world contact, disappearance and readability with multiple players. Check on a
  bright arena as well as a dark preview background.
- Keep the approved cartoon direction: three narrow varied green banana ribbons,
  chubby filled stars, and unified smoke lighting. Transfer the reference's
  construction principles; its purple/yellow palette is not a new art-direction
  instruction.

### Next review when playback is available

Watch the assembled effect through complete cycles, then inspect individual
frames around buildup, release and shutdown. Confirm which layers lead or lag,
which motions converge or spread, and how the beam disappears. Until then, do
not assign reference-derived timings or claim specific easing curves.

## Approved project technique — grenade smoke

Overlapping puff meshes use one cloud-space ellipsoid normal field and one grey
material. This makes lighting read continuously across the cloud while preserving
the billowing geometry. Transfer normals changes shading; it does not weld the
meshes or remove their geometric intersections. Implementation:
`src/pnt/smoke-normals.js`, shipped in 0.9.76 and approved by the user.
