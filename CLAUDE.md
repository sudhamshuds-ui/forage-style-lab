# Forage Style Lab

## What this is
Forage is a cooking discovery web game where combined ingredients become painterly
trading-card artworks. The Style Lab is step 1: a tool for stylizing a single 3D
ingredient with live parameters, viewable in 3D. It started with an apple; ingredients
are now built in code from a shared kit (branch `ingredient-forms`), one on stage at a
time, flipped through with Shuffle ingredient.

## Who I'm working with
A motion and visual designer who is new to coding. Explain things in simple terms
as you go, use design analogies (layers, adjustment layers, pre-comps, palettes), and
keep code readable with friendly comments.

## Rules
- UI copy never uses em dashes. Use a full stop, comma, or colon instead.
- UI copy uses sentence case ("Copy settings", "Stroke size").
- **Source of truth for the art: `references/painterly/00-source-of-truth-lemon-wedges.png`
  and `references/painterly/01-source-of-truth-blood-orange.png`**, but softly lit and with
  muted (not candy) surroundings. `02` and `03` support them; `90-avoid-stroke-clutter.png`
  shows what must never happen. `references/apple` is the old direction (kept for history);
  `references/ui` is the tool's look. Design: `docs/superpowers/specs/2026-10-17-painterly-design.md`.
- **After the user approves an ingredient**, run `/forage-brand {id}`
  (`.claude/skills/forage-brand/SKILL.md`) on its branch before merging: it turns the rounds of
  feedback into lessons (colour, composition, form, recurring errors) in
  `docs/ingredients/lessons/{id}.md`, the ingredient guide and the Figma boards (one OK for Figma).
- **The page** (the user's design, 2026-11-11; explored in `prototypes/brush.html`, see
  `docs/process/README.md`): a white page, "Forage pantry" in Geist Serif (Heart, free, SIL OFL,
  `src/ui/fonts/`) above a square-cornered card with no shadow (5:6, 15% smaller than the first cut for more
  white round it, `--card-w` in `style.css`), the drag hint below (it
  fades after the first drag). On the card, `src/ui/styleBar.tsx` (React, base-ui Menu): "New
  ingredient" (Shuffle) and the brush, a split button: the brush half switches the painterly look
  (Playful strokes), the arrow opens the painters by name (Sargent, Monet, Degas, Cézanne,
  Seurat, Van Gogh); picking one paints like that painter and switches the look on. No
  ingredient name and no descriptions on the page. Söhne (the hint in the user's Figma) needs a
  paid web licence from Klim, so the hint and controls use Geist for now. No brand mark and no
  toast (removed 2026-11-05).
- **The old panel is hidden, not deleted**: add `#panel` to the address (then reload) to bring it
  back for fine-tuning. Shuffle and the name still run through it behind the scenes.
  What it held: the panel is deliberately small: the ingredient's name and Shuffle ingredient in the
  head; Style (Playful strokes, and Randomize only while it is on); Light (Strength, Tone bands: chosen 2026-11-04 because each makes a clear
  visible change); plus Reset (Copy settings was removed, 2026-11-05).
  **Hidden, not deleted** (still working, in `src/params.ts`): the Paint group (Brushiness,
  Wash bleed, Edge softness: hidden 2026-11-04, too small a visible change), the other Light
  controls (Direction pad, band softness, painted edges, ambient, bounce), Glow and Shadow colour,
  Background colour (the room combo picker, tried and hidden again 2026-11-04), Texture, Highlights, Scene,
  the detailed brush controls, Form (Faceted, off) and the apple's shape sliders, the
  lighting and the individual colours. Never delete hidden controls;
  to bring one back, remove its `hidden` flag (group or control).
- **Randomize** (`src/randomize.ts`) picks a **painter** (`src/painters.ts`, always a different
  one from the painter on screen) and rolls each stroke setting inside that painter's ranges,
  so every roll reads as that painter. The painter's name is not shown (the user, 2026-11-04;
  `SHOW_PAINTER_NAME` in `src/ui/panel.ts` brings back "After {painter}" under the button). Painters (iconic names people know at a glance, chosen
  2026-11-04/05): Monet (round, broken dabs of colour), Cézanne (flat, square-ish patches in
  parallel diagonals), Sargent (the default: exactly the original Playful strokes settings from before the
  painters, brought back by the user on 2026-11-05, with a little variation around them), Van Gogh
  (thick, streaky strokes that wrap the form, a backdrop swirling in currents), Seurat (tiny
  dots, the room too), Degas (dry pastel hatching with comb lines). Each painter sets the
  brush type, size, length, bristles, pattern, looseness, broken colour, follow the form
  (100: along the form, 0: one diagonal, like hatching), backdrop stroke size and swirl, all
  hidden settings in the Brush group. It never touches colours, light, shape or the refined
  paint sliders. Thiebaud: the user was unsure, not added. Stroke rules for every painter:
  edge detail strokes stay on the object (on the backdrop they made a pale halo round the
  outline); backdrop strokes come in mixed sizes, with capped colour shifts and quieter
  patterns, so the room stays calm and never reads as polka dots or wallpaper.
- The ingredient keeps its **own natural colours** (the apple is red; hidden Colour group).
  The user picks a **room combo** (wall, table, ambient and bounce light, cast shadow), not
  individual colours. Randomize never changes colours.
- **Idle spin is on by default**: a slow turntable that pauses while you drag the view and
  eases back in 1.5 seconds after you last drag or zoom (`Stage.setIdleSpin`; Scene > Idle spin, hidden).
- **No crisp lines** (the user, 2026-11-10, a rule for every ingredient): where one colour meets
  another inside an ingredient (fat and meat, flesh and rind, a seam, a vein, a band), the edge
  fades over a soft band like wet paint, never a crisp cut-out line. Crisp edges are kept only for
  a few niche places, each a deliberate choice: the lit side of the outline and the cast shadow's
  edge (the style direction), and printed artwork such as the hot sauce label.
- **Facets are retired.** Every form is smooth and rounded, the apple included (the hidden
  Faceted switch is off). No stamped dabs on the apple. Highlights are
  soft and believable (Soft sheen, Dry speckle); the hard window shapes are kept but not
  the default and never picked by Randomize. **Bumpy skins break their shine** (2026-11-09,
  the user: the strawberry's highlight read as "glossy candy flat"): a skin can set
  `highlightBumpy`, `highlightBreak` and `highlightGlint` (`stylizedMaterial.ts`); the seed
  skin does, so the strawberry gets a faint sheen that thins out from its core, skips in the
  seed dimples, and small glints on the dimple rims, tinted toward the berry's own colour.
  Every other ingredient keeps the Soft sheen as it was (trying the new sheen on all of them
  made the apple's highlight vanish and the orange's a scratchy mark).
- Style direction: **digital gouache with watercolour glazes, softly lit**. Shapes first
  (about 70% calm shapes, 30% marks): each tone area is one calm shape with soft colour
  bleeding inside it; brush marks only where the form turns. Edges crisp on the lit side
  and on cast shadows, lost on the shadow side. A warm glow (subsurface) at thin edges and
  the light-to-shadow line. Shadows shift hue (red to wine to plum), never grey or near
  black, with warm bounce from below; the cast shadow is a clear shape, darkest at the
  contact, lighter and bluer further away, picking up the fruit's colour near it. A muted,
  light, cool-leaning room (wall, table, a soft patch of window light) around a warm,
  saturated subject. Soft, broken highlights. No frame. Never: uniform stroke texture,
  jagged shadow edges, muddy colour, candy-coloured sun-blasted surroundings.
- The light **stays in the room** (world-fixed, set on the light pad from the starting view).
  The backdrop is a real 3D **studio sweep** (floor curving into wall, no horizon line) with
  mixed colours and one soft pool of light, so everything turns together when orbiting.
  The key light comes from the **upper left**, slightly in front (about 35 degrees left of
  camera, 40 up, board 05), so the cast shadow falls down and to the right.
  The light is **soft** for every ingredient: the hidden Light strength (55) pulls each
  palette's lit and shadow colours toward its base (`softenPalette`, OKLab), with a wider
  turn into shadow and more fill, so the lit side never bleaches toward white.
- **Ingredients** follow the Figma "Ingredient guidelines" (file 537QrQ0QsVjcT4u3st7M20,
  node 60:2, boards 00 to 10; 07 and 09 matter most) and the skill
  `docs/ingredients/forage-ingredient/SKILL.md`. Each one is built **in code** at its **real
  size** in cm (the apple is 8 cm wide): a form file `src/ingredients/forms/{id}.ts` on the
  shared kit `src/ingredients/forms/kit/` (one recipe per archetype), plus one registry
  entry. Forms carry shape only: colours come from the colour families (board 04,
  `families.ts`), never the form. Off-board additions (to add to board 04): `crimson`
  (berries, cooler and more magenta than the apple's red), `baked` (a well-baked crust,
  orange-brown to red-brown), and part-only palettes `leaf`
  (deeper, natural leaf green for sepals and small leaves), `stalk` (woody stems) and
  `pale-green` (broccoli and cauliflower stalks) and `crumb` (pale cream bread crumb), and for
  condiments `sauce` (dark wine-red sauce through glass, a whole-ingredient family) plus the
  part-only `glass` (pale, cool clear glass), `paper` (cream labels), `gold` (printed ochre
  gold), `ink` (deep plum lettering, never black) and `chili` (a hot sauce label's warm
  red-orange ground); `cheese` (buttery cream-yellow, a whole-ingredient family) and the
  part-only `rind`; `butter` (paler and fresher than the cheese, honey-rose shadow, a
  whole-ingredient family) and the part-only `parchment` (a whiter, cooler paper than the
  label's cream, lilac creases). **Props**: what an ingredient rests on (the butter's paper
  sheet; later a plate or board), listed in `PROPS` (`forms/kit/checks.ts`). A prop is left out
  of the real size and of the card's subject zone (the framing only keeps it inside the card,
  `propMargin`), and it is drawn a hair in front of the floor (a polygon offset in
  `subject.ts`): lying flat at table height, it flickered with the floor and the floor's dark
  contact shadow speckled through it like scribbles. Fine texture (peel pebbling, seeds) belongs to the
  shader (the registry's `skin`, `src/shading/effects/skinTexture.ts`), never geometry. Small
  parts (stem, calyx, leaf) keep a quiet highlight: one main highlight per object.
  Randomness is seeded from the id. Blender only after two honest
  tries with the kit, and only after asking.
- **Card framing** (board 06): the subject fills a centred square about 70% of the card
  width and touches the floor about 74% down (`src/scene/framing.ts`). Measured from the framing camera
  (8.6 units); the view itself starts further back, at 10.2 (`START_DISTANCE` in `stage.ts`, the
  user, 2026-11-11: "i want this to be the default zoom"), so the room shows round the ingredient. It is done by
  scaling the real-size subject on the stage (looks like a camera zoom, keeps the room
  and marks at their tuned scale). Each entry's `turn` is measured from the camera.
- **Layouts** (`src/ingredients/layout.ts`): `cluster-2` and `cluster-3` show 2 or 3 seeded
  variants (own seed, size and turn): the hero in front (it takes the entry's `turn`, so its
  calyx faces the camera; the group itself stays square to the camera), the others behind
  and to the side, each turned so its stem end faces out (tip and side meet in the middle)
  and slid in until its **body** just touches (no visible gap, no overlap; sepals and stems
  may brush each other but never sink into a neighbour's body). Approved by the user as is
  (2026-11-04); a symmetric pinwheel was tried and rejected as worse. One shared cast
  shadow, plus a soft contact shadow under each member (the backdrop takes up to 4 contact
  spots, `MAX_CONTACTS`). Whole and cut arrives with the cut forms. An entry's `stemEnds`
  picks 'out' (berries, default) or 'front' (broccoli: each stalk's cut end fans diagonally
  toward the camera, choosing the side that fans away from the others, so stalks show and
  never cross). `matte: true` keeps the body's highlight quiet (broccoli). Touching is checked
  on dense samples (1500 per body) **with their outward directions** (`BodyGrid` in `layout.ts`):
  a point counts as touching when it is closer than the gap to a neighbour's surface *or inside
  it*. Until 2026-11-09 only point-to-point closeness was checked, and the strawberries sank up
  to 1.1 cm into each other (the user's screenshot): once surfaces cross, no two sample points
  need to be near. A test now checks every vertex for this, and with 'front' the parts are solid (stalks never pass
  through each other); with 'out' soft parts (sepals) may brush. An entry may carry its own
  triangle `budget` when its archetype's does not fit (the 32 cm baguette: 9k). The branching triangle
  budget is 18k, not board 07's 12k (a bumpier crown, asked for by the user).
- **Cast shadows on the fruit**: ingredient materials read the key light's shadow map
  (`lightMask` in the shader), so sepals, stems and neighbours shade the fruit. A cast shadow
  drops the surface one tone band (to the middle tone, coloured, never grey); it fades out at
  the light-to-shadow line (no acne). The shadow map is fine (4096) with a small blur
  (radius 2): a clean edge, never jagged, never a fuzzy fringe. Shadow bias -0.0008 (was
  -0.0002 until 2026-11-05: the butter's paper, flat right against the block, caught a row of
  dark dashes along its foot; the other ingredients look the same).
- **Shadow rules for several pieces** (cluster now, dishes later; glaze `uPieces`, backdrop
  `uContacts`, up to `MAX_CONTACTS` = 4): (1) one shared shadow shape, never darker where
  shadows overlap; (2) each stretch of shadow belongs to the nearest piece: darkness and
  colour (lighter and bluer as it travels) are measured from where that piece sits, never
  from the group's middle; (3) the deep contact patch is a flat oval under each piece, on
  its side away from the light, never a rim round the outline, and it never reaches beyond
  the real cast shadow (the backdrop's own contact core stays within about half a piece's
  radius, or it shows from above as a second, separate blob). Contact spots follow each
  piece's footprint (`footprintSpots`): one for a round piece, a row along a long one (the
  baguette), sized to its narrow width, never one big circle; (4) a soft, slightly darker
  crevice where two pieces meet; (5) pieces shade each other with real cast shadows.
- **Shuffle ingredient** swaps to a random different ingredient, frames
  it, paints it with its family and switches the room to the family's suggested room. The
  swap is a **painted transition** (2026-11-05, the user's idea; `src/painting/transition.ts`
  and `transitionShader.ts`), **2.4 s** (1.6 s was too fast; `TRANSITION_SECONDS`, every phase
  is a share of it), the same in both styles. **The idle spin never stops** (the user): both
  cards are painted live while on stage, the next ingredient is built at the click and put on
  stage (without resetting the view) as the reveal begins, so the turn carries straight
  through. Smudge (0 to 55%): two layers of long dry-brush strokes sweep out from the
  ingredient in a wave, crossing each other, each dragging the paint along its path into a
  smear layer with its own coverage mask (a feedback loop), over the live card. Reveal (45 to
  100%): three layers of dry-brush strokes, crossing in three directions, paint the next card
  in from the middle outward; a soft, noisy wash
  follows behind them from the middle, so gaps the strokes missed melt away instead of
  lingering as sharp shards of the old card, which the user disliked), and the last
  frame is exactly the live view. **Paint in** (the default since 2026-11-11, the user): the
  reveal strokes carry paint picked up from the next picture along their length (`strokePaint`,
  `uPaintIn` in `transitionShader.ts`), big blurry strokes first, then smaller and sharper, so
  the next card is painted in rather than uncovered; the smudge lays down a little more of the
  old card's colour. A round with more stroke layers and a shorter wash was tried and reverted
  (the user preferred this one). Other styles (sweep, dabs, swirl, feather burn, brush burn) sit
  in the same shaders (`uStyle`) for the prototype page only; see `docs/process/README.md`. Each stroke travels for about half a second with an
  ease-in-out (movement on screen). The panel's name changes as the reveal begins (a 100 ms
  fade and blur), and the button looks busy while a swap plays. User feedback that shaped
  it: smudge strokes were too small, all one way and all at once; reveal strokes were
  massive, spiky and all one way (audited with the `improve-animations` skill). **Blur only
  on the strokes, never the whole card** (the user). **Strokes are dry brush**, after the
  user's references (2026-11-05): long and slim (about five times longer than wide), a
  sweeping arc, a loaded start drying out into separate bristle streaks along the stroke,
  rough bitten edges with granular speckle, feathery tips where each bristle ends at its own
  length (`strokeMask` in `transitionShader.ts`). Clicks during a swap are ignored; resizing mid-swap jumps to the end; with
  reduced motion it is a 200 ms opacity fade instead. **No stalls**: the next ingredient is
  **prepared in the background** (the user, 2026-11-05: `prepareNext` in `main.ts`), after
  load and after each swap, in idle moments: picked and built, its materials compiled with
  `compileAsync` (non-blocking), then an invisible rehearsal (painted once into a hidden image,
  the current one put back). A click uses it, so it costs about 1 ms; without a prepared one
  it builds and rehearses at the click. Without the rehearsal the halfway swap froze for about
  0.4 s. The transition's shaders and the painter's hidden-image versions are compiled 0.5 s
  after load (`warmUp`). The broccoli's build (about 0.3 s) is the heaviest background step.
  `styleLab.prepared()` (dev) shows the background timings. The old ingredient is not
  deleted at the swap (deleting GPU resources mid-flight can stall, on Macs especially): it is
  set aside and cleared in an idle moment after the transition (`retired`). **Frame meter**:
  add `#perf` to the page address (works on the published preview too) and press Shuffle;
  the longest real frame and where in the transition it happened go to the browser's
  console. The on-card readout is hidden (the user; `SHOW_FRAME_METER` in `main.ts`). `styleLab.filmstrip(times?,
  to?)` (dev) plays it frame by frame at 60 fps and returns stills; `styleLab.swapFrameTimes()`
  gives each frame's preparation time in ms, to spot stalls. Buttons press to
  scale(0.97) and hover only on real pointers (from the `emil-design-eng` skill).
  **Random strokes** (the user, 2026-11-10): every click rolls a new seed (`uSeed`, set in
  `ShuffleTransition.begin`), so each shuffle paints a different set of strokes with the same
  feel, length and wave (before, the stroke layout was the same every time).
  **No repeats too soon** (the user, 2026-11-06): Shuffle remembers what was shown
  (`shownRecently` in `main.ts`) and picks only from ingredients not seen lately (`pickFresh`
  in `registry.ts`): it holds back all but the three seen longest ago, at most seven
  (`holdBack`), so with ten ingredients nothing comes back within eight shuffles.
  **Preview first pick** (the user, 2026-11-06, for working sessions only): a build with
  `VITE_PREVIEW_NEXT=<id>` sends the first Shuffle to that ingredient (`pickNext` in `main.ts`),
  so the private preview page opens the one being worked on in one click. The preview is built
  with it (the scratchpad's publish script takes `NEXT=<id>`); Vercel builds `main` without it,
  so the main link always shuffles at random.
  Reset keeps that room. No physics, no multi-ingredient table on this branch.

## Tech
- Vite + TypeScript + Three.js (WebGL, not WebGPU for now). React (with base-ui, motion, clsx)
  only for the controls on the card (`src/ui/styleBar.tsx`, mounted from `main.ts` with a small
  API) and the prototype pages; the Style Lab itself is plain TypeScript.
- Tweakpane 4 for the panel, re-skinned in `src/ui/panel.css`.
- Three.js reference skills are installed in `.claude/skills/` (shaders and
  postprocessing are the relevant ones). They target Three r160; this project uses r186.
  Emil Kowalski's design and animation skills are there too (MIT, added 2026-11-05 at the
  user's request): `emil-design-eng` (the user asked to use it for UI and motion work),
  `animate`, `choreograph`, `review-animations` and others.
- Commands: `npm run dev` (dev server, http://localhost:5173), `npm run build`
  (type-check + production build), `npm test` (Vitest: panel, Randomize, palette rules,
  backdrop layout, every registry form's size, contact, normals and triangle budget, the
  registry and its rooms, card framing, cluster layout, skin texture, soft light, the room's
  horizon).
- In dev, `styleLab.settings`, `styleLab.redraw()` and `styleLab.snapshot()` (paints one
  frame now and returns it as an image URL, handy for side-by-side comparisons) are
  available in the browser console, plus the ingredient checks from board 09:
  `styleLab.show('lemon')`, `styleLab.report()` (size in cm against size_cm, contact,
  triangles), `styleLab.silhouette()`, `styleLab.lineUp()` (next to the apple at real
  size) and `styleLab.checks()` (all of them on one sheet; click to close).

## How a frame is made (the pipeline)
1. **Underpainting**: the 3D scene renders into a hidden image (`src/painting/painter.ts`).
   The room (`src/scene/background.ts`) is a 3D studio sweep painted in world space: mixed
   room colours, calm slabs (Brushiness), a soft light pool and a contact shadow, arranged
   by the Backdrop slider (`backdropLayout.ts`). Ingredients use the stylized shader stack:
   tone bands, wash bleed, shadow colour, glow, surface texture (shared paint grain), skin
   texture (each ingredient's own peel, from its registry `skin`: pebbled lemon, orange
   pores, apple streaks and freckles, strawberry seeds in lit dimples, broccoli florets, bread crust
   colour (toastier top, paler sides, blotches, pores, flour specks; no crackle lines); every
   piece named `crumb` gets the crumb skin (holes, streaks, a toasted rim, never flat white); every leaf and sepal
   gets the leaf skin: stalk-to-tip shading, centre and side veins, paler underside), highlights, matte. Everything on the apple is computed on its own surface, so
   it turns with the apple. Alpha is a label, not transparency: 0 = backdrop,
   0..0.2 = backdrop under the cast shadow (written by the floor, `ground.ts`, which also
   darkens the colour so the apple's edge never shows a light halo),
   0.5 = object, up to 1.0 = crisp highlight.
2. **Flow** (`src/painting/flowShader.ts`): measures which way edges run (structure tensor),
   at quarter resolution.
3. **Glaze** (`src/painting/glazeShader.ts`, the default): paints the cast shadow from the
   label, loses the shadow-side edges, pools pigment at wash edges, adds paper grain
   (lighter on the apple), then puts the highlights back. Every step comes from the
   image itself, so nothing re-forms when the camera moves.
4. **Playful strokes** (Style switch, `brush.classic`): the glazed painting is kept in a
   hidden image (alpha label preserved) and the stroke pass (`paintShader.ts`) repaints it
   with bold strokes, so the playful look keeps every refined treatment underneath. Strokes
   stay inside their area: object, cast shadow, or lit backdrop. Strokes are screen-based on
   purpose: strokes pinned to the ingredient's surface (so they turn with it while orbiting)
   were built and **rejected by the user** (2026-11-05, "the previous version looked more
   painterly"; reverted, kept in history as commit 1d48d51). The known side effect: while the
   view turns, single strokes pivot on their own centres. The detailed brush
   controls (type, size, length, bristles, pattern) are hidden.
   The frame (`frame.glsl.ts`) is shared by both and hidden by default.
- The stage only redraws when something changes (`stage.invalidate()`), or while the
  camera moves.

## Code map
- `src/main.ts` wires everything up and runs the loop.
- `src/params.ts` is the single source of truth for every control:
  `Settings`, `DEFAULTS`, `SPECS` (label, range, Randomize range, `hidden`). The panel is
  generated from `SPECS`.
- `src/palettes.ts` holds the room combos (soft and vivid families) and the Shuffle generator.
- `src/painters.ts` holds the painters (each a style preset of stroke ranges);
  `src/randomize.ts` picks one and rolls inside its ranges (`paintLike`).
- `src/ingredients/` holds the ingredients: `registry.ts` (one entry per ingredient: the
  board 07 spec plus its form builder; the apple is entry 1 and still uses its procedural
  builder and the hidden Shape and Colour groups), `families.ts` (colour families and
  their rooms), `scale.ts` (cm to scene units), `subject.ts` (whichever ingredient is on
  stage), `forms/kit/` (lathe, round recipe, stem, calyx and leaf, sweep (a tube along a
  curve, with an optional ribbed cross-section, for stalks and the long archetype), crown
  (blobs blended into one surface, for the branching archetype), surfaceNets (turns any
  distance field into a clean mesh: no ledges, however lumpy), wedge (a slice of a wheel),
  vessel (bottles, caps, labels), block (a rounded box as distances, plus `paperSheet`, `fold`
  and `crease` for a creased sheet under it), pieces, seeded random, checks) and
  `forms/{id}.ts`. The size check measures every piece except small parts (stem, leaf,
  calyx), which may stick out, and props (the butter's paper). "Faces point outward" is checked by each closed piece's signed
  volume (positive), which works for bent tubes too. `apple/` builds the procedural apple (body, stem, leaf). No model files.
- `src/dev/checks.ts` has the dev-only report, silhouette, line-up and check sheet.
- `docs/ingredients/lessons/` holds one lessons record per finished ingredient and its approved
  painting (`img/`); `src/docs.test.ts` checks the records and the guide.
- `src/shading/` is the stylized 3D shader, built from a stack of effect modules:
  `effect.ts` (interface, shared GLSL values, FrameContext), `stylizedMaterial.ts`,
  `effects/index.ts` (ordered stack), `chunks/` (OKLab colour maths, noise).
- `src/painting/` is the screen pass: painter, flow, glaze (default), classic strokes, frame.
- `src/scene/` has the stage (renderer, camera, controls, light rig), the backdrop
  underpainting, the shadow-catching floor and the card framing.
- `src/ui/` has the Tweakpane panel, the colour combo picker and the buttons.
- `src/utils/colour.ts` has OKLab helpers in TypeScript.

## Adding a new effect
- On the 3D surface (before painting): create `src/shading/effects/myEffect.ts`
  exporting a `ShaderEffect`, add its controls to `src/params.ts`, add it to
  `EFFECT_STACK`. Tone bands must stay first.
- On the painted image (grain, edges, shadow): extend `src/painting/glazeShader.ts`
  and pass new uniforms from `Painter.updateGlaze`. Keep it derived from the image (no
  random screen-space cells on the apple), so the apple never boils when orbiting.

## Translucent flesh (guideline, the user 2026-11-06: reuse for oranges, melons, lemons)
Built first in the `melon` skin (`skinTexture.ts`, kind 10). For any cut, juicy flesh:
- **Glow in the shadows**: the darker tones soak up the family's warm glow colour and lift a
  little (light scatters inside), never dull or grey.
- **Thin places glow most**: edges seen side on (a fresnel term) and narrow tips.
- **Things inside show vaguely**: the material knows the camera in its own space
  (`vObjectCamera`, set in the vertex shader of `stylizedMaterial.ts`), so the shader samples a
  pattern a little way *under* the surface along the line of sight, at a few depths, fainter
  deeper in. The melon's buried seeds do this; citrus could show segment walls or pips the same way.
  They shift gently as the view turns, like looking into it. Keep them faint and sparse (a
  dense scatter reads as polka dots).

## Conventions
- Colours are hex strings in settings. Mix colours in OKLab/OKLCh, not RGB.
- Texture marks never darken toward grey: a darker speck, pit or streak uses `shadeOwn`
  (in the shader), which leans toward the object's own deep shade (its glow colour). A
  lemon's specks are golden, never olive.
- Most sliders are 0..100 (shown as %), converted to real units where they are used.
- List options are defined once in `params.ts` (`BRUSHES`, `PATTERNS`, `HIGHLIGHT_SHAPES`);
  shaders receive the option's index.
- The light pad is read from the starting view, then the light stays in the room.
- The six light cases from board 05 (cut-juicy, wet, pale, dark, group, whole next to cut)
  are stored on each spec (`light_case`) but not built yet; they plug in at
  `showIngredient` in `main.ts`.

## Done so far
v1: procedural apple, stylized shader, scene, panel, Randomize / Reset / Copy settings.
v2: stylization-only panel, colour combos with Shuffle, real brush strokes (flat, round,
palette knife, dry brush; bristle texture; lines, scribble, crosshatch patterns),
painterly backdrop slabs, frame, highlight shapes (window, panes, square, dashes, streak,
dot) and rim glints, on-demand rendering.
Painterly (branch `painterly`): new source of truth (soft-light citrus paintings), glaze
pass instead of strokes everywhere, soft-light colour combos with a glow colour (rules
checked by tests), Backdrop slider with window light, clear multi-coloured cast shadow,
lost edges, pigment pooling, paper grain, wash bleed, glow, shadow colour, accent marks
and speckle that stick to the apple, carved (rounder) apple, closer camera, Vitest.
Painterly iteration 2 (user feedback): light fixed in the room, 3D studio sweep backdrop
that turns with the view, soft light pool, shadow seam/halo fixes, room-only combos (apple
keeps its colours, soft + vivid rooms complementing it), Randomize leaves colours alone,
soft sheen and dry speckle highlights, facets back, facet shards and granular fill instead
of dabs. Style switch: Playful strokes repaints the refined look with bold strokes (a
kid's painting) while keeping all of it underneath.
Ingredient forms (branch `ingredient-forms`, merged 2026-11-05, and on `main` since): facets
retired, key light upper left, the registry, colour families, the form kit, card framing,
Shuffle ingredient, soft light (Light strength), skin textures, dev checks. Each ingredient's
story (what was tried, what the user said, where we ended) is in its lessons record,
`docs/ingredients/lessons/{id}.md`, and the general rules are in the ingredient guide
(`docs/ingredients/forage-ingredient/SKILL.md`). What is still in force:
- **Apple**: procedural (`apple/`), smooth, the hidden Shape and Colour groups. See `lessons/apple.md`.
- **Lemon**: pebbled skin, golden specks (`shadeOwn`). See `lessons/lemon.md`.
- **Orange**: calyx star, thin stem and leaf in `leaf` green; Overcast room at 172 degrees (family
  rooms may sit 70 to 180 degrees away, board 04's own pairings, kept by choice). See `lessons/orange.md`.
- **Strawberry**: `crimson`, a cluster of three (layout approved as is), seeds in lit dimples, a
  dimpled shine (`highlightBumpy`). See `lessons/strawberry.md`.
- **Broccoli**: one head lying down, crown and cut end on the table, about 115 lumps (surface
  nets), ribbed stalk with finger branches, a leaf on the table; 18k budget. The egg was skipped.
  See `lessons/broccoli.md`.
- **Baguette** (board 08's bread card): a long loaf on a diagonal, four slashes with crumb,
  `baked` family, 9k budget. The round boule is kept as its `loaf` form; a white sandwich loaf
  comes later as "toast". See `lessons/baguette.md`.
- **Hot sauce** (the user's idea; reference Figma node 81:5, a painting signed Tikisso, used for
  the form only): 6.5 x 15 cm (`LONGER`), sharp bevelled edges, the printed label
  (`WITH_PRINTED_LABEL`, art in `src/shading/labelArt.ts`, our own design; sides and back plain),
  the older layered label switched off (`WITH_LABEL`, its parts still listed in the registry; its
  cream panel is `panel`), turn -25, `rimGlints: false`, 14k budget. More condiments to come.
  See `lessons/sauce.md`.
- **Cheese**: a 12 cm wedge, deep holes, round bites, the rind lifted off its own surface,
  `cheese` and `rind` families, turn 50, shadowTint 0.35, 10k budget. See `lessons/cheese.md`.
- **Butter**: a block on its creased paper (a prop), the soft corner melting at about half, the
  curl on the paper, the scrape on top switched off (`WITH_SCRAPE`), turn -40, matte,
  shadowTint 0.4, 12k budget. See `lessons/butter.md`.
- **Watermelon**: two wedges built in the form (one lying on a cut side, one standing), 4 cm
  thick, the `melon` skin's soft flesh-to-rind gradient with stripes, translucency and a chalky
  texture, seed beads, the separate rind shell switched off (`WITH_SHELL`), matte, no rim glints,
  shadowTint 0.3, 30k budget. See `lessons/watermelon.md`.

- **Steak**: a tomahawk (the user's references; board 08's card said a raw slab): a ribeye eye and
  meaty neck (surface nets), a long curved rib bone (`bone@bone`, a sweep) with the meat wrapping
  up round it in a short sleeve, its knob resting on the table; the fat rim, organic seams with
  pockets and marbling painted softly by the `marbled` skin (kind 12, no fat piece) in the `fat`
  colour; `beef` family, 37 x 5.2 x 14 cm, turn 25, shadowTint 0.3, no rim glints, 24k budget.
  The shapes-first marbling was tried and rejected (it is in history, commit edb98e7). See
  `lessons/steak.md`.

Shared mechanisms added along the way (code hooks other ingredients reuse):
- Registry look settings: `turn`, `skin`, `matte`, `rimGlints` (via `FrameContext.rimGlints`),
  `shadowTint` (via `FrameContext.shadowTint`), `budget`, `stemEnds`.
- Kit: `vessel.ts` (`revolve`, `roundedSquare`, `ribs`, `wrapSheet` with `mapped`), `wedge.ts`
  (`wedgeDistance`, `roundedIntersection`), `block.ts` (`blockSides`, `paperSheet`, `fold`,
  `crease`), `relaxOnSurface`, `liftRegion` (a skin lifted off a body, with `keepNormals`).
- `subject.ts`: lifted skins and props are drawn a hair in front (polygon offset); any piece named
  `label` with a map gets the label skin, `crumb` the crumb skin, a leaf map the leaf skin; a form
  may repeat its hero's role for a second body (skin, highlight, contact spots per body, each
  from its foot only).
- Shader: `turnHueTowardCool` sends yellows the warm way round; a skin can set `highlightOwn`
  (highlight in the surface's own colour) and `highlightBumpy`, `highlightBreak`,
  `highlightGlint` (a dimpled shine); the `melon`, `melonRind` and `marbled` skins (kinds 10 to
  12); the material knows the camera in its own space (`vObjectCamera`). `patch` is a reserved
  word in GLSL.
- Form tests: "faces point outward" asks 85% for wedges (hole insides rightly face inward).
Next, one at a time with feedback: the chicken drumstick (whole forms only; cut forms later).

Polish and painters (branch `claude/happy-babbage-016gw2`, merged to `main` 2026-11-05):
zoom redraws straight away (the controls' change event), idle spin eases back in 1.5 s after
you drag or zoom, the Paint sliders hidden and Light (Strength, Tone bands) shown, Randomize
picks one of six painters (Monet, Cézanne, Sargent, Van Gogh, Seurat, Degas; names hidden),
stroke fixes (no pale halo round the outline, no straight cut-offs or saw-tooth ends while
the view turns, calmer backdrops). Surface-pinned strokes were tried and rejected.
Later the same day (merged to `main` 2026-11-05): the painted Shuffle transition (smudge,
then paint the next card in with dry-brush strokes, the spin never stopping), the next
ingredient prepared in the background, the `#perf` frame meter, and Emil Kowalski's design
and animation skills in `.claude/skills/`. The user confirmed it runs smoothly on their Mac.
Fixed on `main` (2026-11-05): the painter note ("After Sargent") still showed although
`SHOW_PAINTER_NAME` is false: its `display: flex` outranked the `hidden` switch, so the CSS
now says `.painter-note[hidden] { display: none }`. The ingredient guide
(`docs/ingredients/forage-ingredient/SKILL.md`) is kept in step with the code: families, kit,
look settings and lessons, updated with each new ingredient. The butter (with its curl; the
scrape on top switched off) merged to `main` the same day.

Horizon strokes (Playful strokes, merged to `main` 2026-11-06): the horizon is found from the
room (`roomHorizonUv` in `background.ts`: the spot straight behind the ingredient where the
table-to-wall mix is halfway, projected each frame; the hidden Horizon setting is only the
fallback). In `paintShader.ts` room strokes lie level in a band around it (`horizonBand`) and
right beside the ingredient (`nearObject`), wall slabs keep their diagonals above it, strokes
follow clear colour edges in the room (`roomEdge`), a stroke landing on a thin feature (the
light's rainbow fringe) loads the room's colour, and room strokes pick up the colour under them
(wet-in-wet). A pick-up that reacted to every small change flattened the wall's slabs: keep the
thresholds.

## Where we are (2026-11-11, later)
The real page now has the user's design (branch `ui-brush`): the controls on the card, the
painters by name, the camera starting further back. Not merged to `main` until the user says so.

## Earlier on 2026-11-11
The UI and transition prototypes (branch `ui-variants`, merged 2026-11-11): React is set up for
the prototype pages only (`prototypes/`, base-ui, motion, clsx); the Style Lab itself is still
plain TypeScript and its panel is unchanged. The user is editing the dock UI in Figma (page
"Style Lab UI"); the React build follows once they send it. Paint in is the Shuffle default.

## Before that (2026-11-10)
On `main`: everything above, including the steak (a tomahawk), the baguette fix, random Shuffle
strokes and the "no crisp lines" rule. Vercel deploys `main`. Next: the chicken drumstick, then
`/forage-brand`. Open question from the user: "the camera still pauses spinning mid transition"
(CPU frames measured 1 to 5 ms; ask whether the wall and table keep moving during the pause, or
everything freezes: then use `#perf`).
**Keep every iteration** (the user, 2026-11-11, for a case study later): prototype pages
(`prototypes/*.html`) and their published previews are never deleted, even after a winner
is picked (this overrides the prototype skill's clean-up step). Each round goes into the
process log, `docs/process/README.md`: the date, the variants, a still in
`docs/process/img/`, the preview link and the user's words. Transition styles are compared
on the "Forage shuffle transitions" preview (https://claude.ai/artifact/6wUDJ3pRuMPaGyK3TYve4Z,
`prototypes/transition.html`; republish it after each change).
Workflow the user expects: work on a branch, push it and publish the preview (the private
claude.ai page "Forage Style Lab", built with `VITE_PREVIEW_NEXT=<id>`), merge to `main` only
when the user says so.

## Planned for later sessions (not built yet)
Cut forms (slice the whole form and cap the cut), the whole-and-cut layout,
the light cases, patterns inside highlights and shadows, sparkles, soft body
wobble. Later tools: cut and cooked forms, vessels, combining, recipe cards.

## Branches (saved versions)
`main` is the soft-light watercolour + gouache look (this file describes it), merged from
`painterly` once approved, plus the ingredient forms work (merged from `ingredient-forms`
on 2026-11-05: registry, form kit, the ingredients so far, card framing, Shuffle ingredient).
`ingredients-and-import` (the shelf, physics and multi-ingredient table) is not merged. The version from just before Big, Medium, Small is the parent
of that merge on `main`. Older attempts are kept on local branches,
newest first:
`experiment-bad` (noise falloff + reference-scene page), `v4-before-noise` (compact
Settings card, outside-in mark falloff, glaze shapes, stable apple marks), `first-bms`
(first Big, Medium, Small version). The "Painterly v3" commit on GitHub is BMS + glaze shapes.
`vite.config.ts` only sets the dev server port (uses `PORT`, else 5173).
