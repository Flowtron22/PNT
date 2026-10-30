# VFX reference studies

Project learning notes: observations from references, implementation ideas, and
approved direction. These notes preserve context for later chats; they do not
change model weights or automatically approve changes to existing effects.

## How to use these studies

The user prioritizes practical implementation: making textures, noise maps,
flipbooks, materials and emitters. Reference summaries alone are insufficient.
For each implemented effect, record the reproducible asset workflow, channel
packing, shader operations, actual timing, integration and visual findings.
Separate techniques we built and verified from guesses about reference source
files. Use the approved jetpack implementation below as a practical example.

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

## Study 03 — Riot's League of Legends VFX guide (2017)

User reference: [Deck.gallery](https://www.deck.gallery/league-of-legends-2017/).
Read 30 October 2026. The preview is limited, so the full 37-page public guide
was obtained from the mirror linked in the
[original release thread](https://realtimevfx.com/t/official-league-of-legends-vfx-style-guide/3392).
The original Riot-hosted URL currently redirects to League's homepage.
Local study copy: `.local/riot-vfx-styleguide-2017.pdf` (ignored, not shipped).

### Coverage and evidence

Read text from all 37 pages and visually inspected rendered pages. The document
contains embedded motion examples; the static rendering does not play them.
Timing conclusions below come from the written explanations, diagrams and
illustrated stages, not measured playback. No claim of access to Riot's shaders
or original effect source files.

### Principles from the guide

- **Gameplay, pp. 6-11:** distinguish the main information from supporting
  decoration; show affected areas and hitboxes accurately. Scale visual emphasis
  to gameplay importance. A basic attack and a major ability should not compete
  equally for attention.
- **Value, pp. 13-17:** use brightness contrast to establish a focal point in
  context. A bright centre, illumination or restrained dark backing can help;
  excessive contrast across many effects creates competition.
- **Colour, pp. 19-26:** relate palettes to their source and distinguish opposing
  indicators. With complementary colours, keep one subordinate. Saturation is an
  attention control, not a setting to maximize everywhere.
- **Shape, pp. 28-30:** concise silhouettes, controlled detail and a mixture of
  soft/sharp shapes improve readability. Directional shape and blur can convey
  travel more clearly than fast isolated points.
- **Timing, pp. 32-36:** author anticipation, action and dissipation. Use changing
  rates for emphasis and motion appropriate to the material. Reduce the visual
  strength and linger of the outro so it yields to subsequent actions.

### Particularly useful visual comparisons

- Leona's boundary versus interior decoration (pp. 6-7): the important region
  need not have the busiest interior.
- Teemo's indicated explosion area and Sona's ground-aligned rectangle (pp. 8-9):
  attractive effects can still fail if they misrepresent where gameplay occurs.
- Lux basic attack versus ultimate (pp. 10-11): an effect's hierarchy must work
  against other effects, not just within its own composition.
- Bard versus Lulu (p. 21): a restrained complementary supporting colour enriches
  a focal colour; equally strong opposing colours can fight for attention.
- Painted flame shapes versus noisy photographic texture (p. 28): the guide's
  specific texture treatment supports League's chosen art direction.
- Ekko's curved timing graph versus a straight line (p. 35): rate of change is
  an authored part of impact. The diagram is not a numerical easing preset.
- Syndra linger comparison (p. 36): inspect the aftermath as carefully as the
  peak frame, because it can obscure the next gameplay event.

### PNT working rules derived from this study

These are proposed project applications, not changes requested by the user and
not universal rules attributed to Riot.

1. Before implementation, define the event's gameplay meaning, the one thing a
   player must notice, its spatial footprint and when that information expires.
2. Give routine movement a quiet visual budget. Allocate clearer peaks to
   captures, rescues, stuns and major state changes. Check competing events in
   four-player play before deciding their relative emphasis.
3. Read affected-area dimensions and active state from gameplay data. Decorative
   smoke, sparks or squash may extend beyond them only while the true area stays
   unambiguous. Do not present decoration as an inaccurate danger boundary.
4. Never add a gameplay delay to make room for a visual windup. If an action is
   instant, synchronize its visual peak to the existing event. Use anticipation
   only where the mechanic already supplies a warning or preparation interval.
5. Review still frames in greyscale for value hierarchy, then review colour,
   movement and multiple-effect overlap against Mall, Sunken and Iceberg.
6. Separate the event's active state from residual decoration. An ending hazard
   must stop communicating active danger; a fading celebration must not obscure
   a new capture or stun.
7. Keep the approved 1.02-second banana trail history. If overlap becomes noisy,
   first assess brightness, width taper and accent density in context; changing
   a requested lifetime requires a concrete visual reason and user direction.
8. Preserve PNT's approved chubby filled stars, narrow green strands and shared
   smoke normals. League's precise saturation limits, spell palettes and painted
   texture requirements are style-specific references, not automatic PNT rules.

## Approved implementation — MISFITZ-inspired jetpack energy (0.9.77)

User approved the deployed result on 30 October 2026: "nicely done".
Implementation commit: `6a42649`. This approval covers the added energy layer;
the existing smoke was explicitly preserved. Reference:
[Enemy 02 rocket](https://cdnb.artstation.com/p/assets/images/images/099/641/893/original/octopo-vfx-studio-14-enemy-02-attack.gif?1780543830).

### 1. Author the shape animation, then bake the atlas

Source: `tools/bake-jet-energy.py`, using Python and Pillow. Run from the repo:

```text
python tools/bake-jet-energy.py
```

The generator draws original polygon masks at 3x resolution and downsamples for
antialiasing. It authors shape changes across 16 frames, rather than just scaling
one static sprite: thrust tongues sway and separate, gaps cut through their
tails, broken ring segments expand, and the ignition burst hollows out.

Output: `assets/pnt/vfx/jet-energy-flipbook.png`, 512x512, arranged 4x4 with
128px cells, ordered left-to-right/top-to-bottom. Independent masks share RGB:

| Channel | Authored animation | Runtime use |
| --- | --- | --- |
| R | Torn thrust with brighter internal regions | Directional pink exhaust tongue |
| G | Uneven expanding arcs with deliberate gaps | Violet/pink/cyan pulse rings |
| B | Angular burst breaking apart from its centre | Short ignition accent |

These channels are data, not displayed colours. Multiple grey levels within the
masks control the transition to the hot centre in the shader. Safe empty borders
and UV inset prevent adjacent atlas cells from bleeding into each other.

### 2. Bake independent flow and erosion noise

Output: `assets/pnt/vfx/jet-energy-noise.png`, 128x128, from seeded periodic sine
waves at multiple frequencies and amplitudes. Integer spatial frequencies make
the pattern wrap. Independently seeded channels avoid identical X/Y motion.
RG supplies UV offset vectors; B supplies the erosion field. Both PNGs are
sampled as linear data. Noise repeats; atlas sampling stays inside each cell.
Packing and provenance are recorded in `assets/pnt/vfx/jet-energy.json`.

### 3. Combine them in the material

Runtime: `src/pnt/jet-energy.js`. Each sprite carries normalized age and kind.

1. Sample noise at `uv * 1.6 + time * (0.18, -0.63)`.
2. Offset the shape UV by `(noise.rg - 0.5) * 0.045`.
3. Map age to atlas frame `age * 15`; blend the two neighbouring frames. Flip
   the atlas row index to account for texture-coordinate orientation.
4. Select the packed channel by sprite kind.
5. During the last 45% of life, raise a threshold against noise B to erode the
   mask. This gives spatial breakup in addition to the baked shape evolution.
6. Fade in over the first 8% and fade out over the final 38% of life. Discard
   alpha below 0.035. Mix the saturated colour towards pale pink-white in the
   strongest mask regions. Output in the renderer's colour space.

Material uses normal alpha blending, depth testing and no depth writing.
No bloom, additional lights or scene-wide colour changes are needed for this
approved result. Pixel fragments use simple filled quads in the same batch;
they bypass the atlas but share lifetime fading and palette treatment.

### 4. Emit from the animated nozzle

| Layer | Lifetime | Movement/shape |
| --- | --- | --- |
| Ignition | 0.24s | One expanding burst on emitter start |
| Thrust | 0.26s | Travels at 2.6 units/s along exhaust axis; elongated 2.1x |
| Ring | 0.36s | Expands and rotates while drifting along exhaust axis |
| Pixels | 0.30-0.52s | Three per emission group, varied sizes and scatter |

The scheduler ticks every 0.065s and emits a group every second tick: approximately
one thrust, one ring and three pixels per 0.13s, plus the initial ignition.
Birth positions interpolate between sampled nozzle positions. Thrust is offset
0.66 units along the nozzle exhaust axis so the unchanged smoke does not hide it.
Billboards face the camera; the thrust's long axis follows the projected exhaust
direction. Parent transforms are accounted for, including tilted arenas.

Runtime `size` is a quad half-extent, not its full width. Full quad width is twice
that value before age scaling; the visible mask occupies less than the quad.
When tuning thickness, distinguish geometry width, painted mask coverage,
elongation, emission density and lifetime: they change different parts of the read.

### 5. Preserve the base effect and validate the addition

The energy uses a separate fixed 192-sprite batch, adding one draw call for all
players. It cannot evict particles from the original smoke pool. Smoke geometry,
materials, emission cadence, size, lifetime and velocity were not retuned.
Reduced motion and capture clear the added energy; flight end lets it expire.
Teleports discard old owner particles, and match cleanup resets the pool.

Browser validation covered three actual costumes, dark/light preview floors,
reduced motion, Mall training activation and returning to the menu. No shader or
console errors were observed. Automated checks cover transformed nozzle placement,
frame-rate cadence, four-player allocation, staggered atlas ages and cleanup.
These checks do not establish physical mobile-device performance.
Preview evidence: `.local/jet-energy-preview.png`.

### What the visual iteration taught us

The first thrust was mostly hidden by the smoke. Moving it into the exhaust path
revealed it without modifying the smoke. Too many overlapping tongues formed a
dense mass; fewer, shorter tongues retained the energy while making each shape
readable. Broader pixel scatter separated small accents from the smoke cluster.
The accepted result combines authored shape evolution, subtle texture distortion,
erosion and discrete accents. Preserve it as a baseline, not a requirement to
reuse this palette or recipe for every future effect.

## Implementation trial — Gloss-inspired hammer addition (0.9.78)

Reference: MISFITZ Gloss special (Study 02), specifically
`octopo-vfx-studio-6-gloss-special.gif`. The user requested an additional layer
and explicitly retained the current smash. Awaiting user feedback on this trial;
do not label it approved merely because its checks pass.

### Asset and material method

- Run `python tools/bake-hammer-gloss.py` to rebuild the original 512px 4x4 atlas.
  Each of 16 frames has three independently authored masks: R hollow angular
  petals, G radial fans and B four-point sparkles. Draw at 3x resolution, then
  downsample for controlled edge antialiasing.
- Petals use nested polygons: high-value outer rim, mid-value thick band and an
  empty inner shape. In the material those mask levels become yellow and pink;
  the centre remains transparent. Frames expand the petals and later cut gaps
  through them, rather than only enlarging one static image.
- Green fans use alternating filled sectors over a faint disk, with an empty
  centre. Their low opacity supports the main petals without covering the floor.
- `src/pnt/hammer-gloss.js` interpolates adjacent atlas frames and reuses the
  existing jet flow/erosion noise. UV warp is only 0.012 times the centred noise
  vector, preserving the hard corners. Erosion starts after 65% of life; fade
  starts after 56%. Pink bands use a coverage threshold for a solid graphic read.
- Floor quads lie in the arena's local XZ plane, at small Y offsets to separate
  fans and petals. Sparkles face the camera after removing root rotation. All
  nine sprites per impact share one material and one bounded dynamic batch.

### Timing and integration

The existing `gameFX.hammer()` impact emits the additional layer at the same
position and time. Petals last 0.66s, fans 0.59s, and seven sparkles last
0.4-0.63s. Sparkles move outward/upward with gravity. Reduced motion skips the
new layer; the original splash, rings, sparks and clustered smoke remain.
The pool caps at 96 sprites and uses one extra draw call for overlapping impacts.
Metadata and exact layer sizes: `assets/pnt/vfx/hammer-gloss.json`.

### Visual iteration and verification

The original splash obscured the first floor pattern. Increase the added petals'
extent beyond that wall, move sparkles outward and make the pink band solid;
keep the fan fill translucent. This reveals the addition without retuning the
original. Browser comparison covers an animated thief with held hammer, dark and
bright floors, a tilted arena, and impact/dissipation samples. Existing hammer
regressions and new allocation/placement/cleanup/FPS/reduced-motion checks pass.
Preview: `.local/hammer-gloss-preview.png`. Physical mobile performance was not
measured. No gameplay radius or stun timing changed.

## Approved project technique — grenade smoke

Overlapping puff meshes use one cloud-space ellipsoid normal field and one grey
material. This makes lighting read continuously across the cloud while preserving
the billowing geometry. Transfer normals changes shading; it does not weld the
meshes or remove their geometric intersections. Implementation:
`src/pnt/smoke-normals.js`, shipped in 0.9.76 and approved by the user.
