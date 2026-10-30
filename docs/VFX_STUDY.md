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

## Study 02 — MISFITZ: VFX Part I

Reference: [MISFITZ - VFX: Part I](https://www.artstation.com/artwork/lGJwnz),
OCTOPO VFX Studio, collaborating with Antihero Studios. Studied 30 October 2026.
Page credits: art direction Felix Vivier, VFX direction SOL, VFX art Mean,
Eren and Jay. Software listed: Unity, After Effects, Photoshop and Blender.

### Evidence and limits

Browser access recovered after the app restart. Went through the full gallery of
24 animated images, sampling their displayed frames and accompanying concept
panels. Beat's special was also inspected at its original displayed size. This
is an art-direction study, not an inspection of source assets or shader graphs.
Exact durations, animation curves, render settings and implementation methods
were not measured. A concept panel states intent; it is not proof that every
detail was reproduced identically in the gameplay panel.

### Observations across the gallery

| Examples | Visible design | Useful lesson |
| --- | --- | --- |
| Beat attack/special | Sound-wave curves, angular yellow/cyan shapes, musical notes, dark circular accents and a radial special around the speaker | Secondary shapes reinforce the ability's theme |
| Drip attack/special | Lime liquid with a strong pink edge, separated droplets and irregular persistent puddles | Distinct silhouettes make liquid read without realistic fluid simulation |
| Gloss attack/special | Pink capsule projectile; heart/heal and star/hit motifs; a larger green/pink radial special | Shape symbols help distinguish the outcomes as well as the colours |
| Ray special | Bright yellow/white beam, orange/red outer band, dark edging, sharp accents and comic lettering at the source | A controlled bright centre and clear outer shape keep the beam readable |
| Rush attack/special | Multiple spinning projectiles; a directional dash treatment, sharp cyan/yellow/orange shapes and ground marks | Flying objects, character movement and residual marks each have a separate role |
| Shade attack/special | Narrow magenta projectile, yellow/pink angular hit and a separate circular special projectile with pale trailing shapes | Travel, hit and active state use related but different silhouettes |
| Enemy 01/02 | Separate muzzle, projectile, trail and hit/explosion concepts; repeated purple/magenta energy, rings and square fragments | Build an attack as a coordinated sequence rather than one generic burst |
| Enemy 03 | Explicit warning-start and warning-loop concepts before an explosion | The warning state deserves its own designed visual language |
| Enemy 04/05 | Drone energy projectile; melee crescent with angular hit accents | Match effect geometry to the action's path and direction |
| Golden Goose | Small yellow accents and a displayed sequence of step-dust shapes | Movement detail can be economical and specific to the character |
| Charger miniboss | Broad attack crescent and a directional charge path with chevrons and streaks | Communicate swept space and travel direction with the large shape |
| Worldboss | Flamethrower with hollow/broken purple shapes, circular sword slash, missile trail and a distinct explosion | Preserve differences between continuous fire, a sweep and a travelling attack |
| Death/spawn/down/team-up | Ground rings/arrows, angular character-centred bursts, coloured bands and a large hand symbol | Important state changes need distinct visual identities |

Two notes are explicit in the concept panels: Ray's comic lettering dissolves
over the laser's lifetime; Rush's ground residue disappears after a short time.
The flamethrower and Golden Goose panels also display sequences of individual
shapes. These are useful shape-animation references, but they do not establish
whether the shipped implementation uses flipbooks, meshes or another method.

### Art direction to carry into PNT

1. **Design the flat silhouette first.** Filled splashes, crescents, wedges and
   stars remain legible at the gameplay camera distance. Soft glow can support
   these shapes without replacing their edges.
2. **Separate a dominant fill from its supporting edge.** Drip's lime/pink and
   Ray's bright centre/outer band are clear examples. This is a reference
   technique, not permission to outline every PNT sprite: the user explicitly
   requested unoutlined, chubby banana stars.
3. **Use a consistent vocabulary within an effect family.** Musical shapes for
   Beat, liquid for Drip and repeated purple/square motifs for enemies make
   related effects feel connected. Avoid unrelated decorative particles added
   only to increase activity.
4. **Preserve negative space.** Broken crescents, holes in fire shapes, separated
   droplets and sparse fragments keep effects from becoming solid visual blocks.
   More screen coverage is not automatically a better result.
5. **Give action and aftermath separate lives.** Projectile travel, contact flash,
   lingering area and final residue serve different purposes. Author their
   lifetimes and disappearance independently; do not just fade the whole effect
   uniformly. Exact reference curves remain unmeasured.
6. **Use the ground deliberately.** Puddles, rings and dash residue communicate
   location and affected area. Keep decorative expansion distinct from the
   gameplay footprint so it does not misrepresent collision or range.
7. **Review at game scale.** This page pairs concept art with gameplay. Follow
   that practice: compare the planned large shape, accent colour and disappearance
   against the actual PNT camera, arena colours and multiple-player overlap.

### Proposed implementation options, not observed source techniques

Use ribbons for action-following arcs; shaped meshes or alpha-masked cards for
filled bursts; reusable sprite sequences for designed shape changes; ground
planes/decals for residual marks; and instanced accents for droplets or fragments.
Erosion masks are one option for patterned disappearance. Choose based on the
desired silhouette and measured cost, not an assumption that the reference used
the same technique. Start with a readable primary shape, then add only supporting
layers. Existing approved PNT effects remain unchanged by this study.

## Approved project technique — grenade smoke

Overlapping puff meshes use one cloud-space ellipsoid normal field and one grey
material. This makes lighting read continuously across the cloud while preserving
the billowing geometry. Transfer normals changes shading; it does not weld the
meshes or remove their geometric intersections. Implementation:
`src/pnt/smoke-normals.js`, shipped in 0.9.76 and approved by the user.
