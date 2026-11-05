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
- No brand mark and no toast on the page (removed 2026-11-05): just the card and the panel.
- The panel is deliberately small: the ingredient's name and Shuffle ingredient in the
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
  parallel diagonals), Sargent (broad strokes that follow the form; the default), Van Gogh
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
- **Facets are retired.** Every form is smooth and rounded, the apple included (the hidden
  Faceted switch is off). No stamped dabs on the apple. Highlights are
  soft and believable (Soft sheen, Dry speckle); the hard window shapes are kept but not
  the default and never picked by Randomize.
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
  `pale-green` (broccoli and cauliflower stalks) and `crumb` (pale cream bread crumb). Fine texture (peel pebbling, seeds) belongs to the
  shader (the registry's `skin`, `src/shading/effects/skinTexture.ts`), never geometry. Small
  parts (stem, calyx, leaf) keep a quiet highlight: one main highlight per object.
  Randomness is seeded from the id. Blender only after two honest
  tries with the kit, and only after asking.
- **Card framing** (board 06): the subject fills a centred square about 70% of the card
  width and touches the floor about 74% down (`src/scene/framing.ts`). It is done by
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
  on dense samples (1500 per body), and with 'front' the parts are solid (stalks never pass
  through each other); with 'out' soft parts (sepals) may brush. An entry may carry its own
  triangle `budget` when its archetype's does not fit (the 32 cm baguette: 9k). The branching triangle
  budget is 18k, not board 07's 12k (a bumpier crown, asked for by the user).
- **Cast shadows on the fruit**: ingredient materials read the key light's shadow map
  (`lightMask` in the shader), so sepals, stems and neighbours shade the fruit. A cast shadow
  drops the surface one tone band (to the middle tone, coloured, never grey); it fades out at
  the light-to-shadow line (no acne). The shadow map is fine (4096) with a small blur
  (radius 2): a clean edge, never jagged, never a fuzzy fringe.
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
- **Shuffle ingredient** swaps to a random different ingredient with a short fade, frames
  it, paints it with its family and switches the room to the family's suggested room.
  Reset keeps that room. No physics, no multi-ingredient table on this branch.

## Tech
- Vite + TypeScript + Three.js (WebGL, not WebGPU for now). No React.
- Tweakpane 4 for the panel, re-skinned in `src/ui/panel.css`.
- Three.js reference skills are installed in `.claude/skills/` (shaders and
  postprocessing are the relevant ones). They target Three r160; this project uses r186.
- Commands: `npm run dev` (dev server, http://localhost:5173), `npm run build`
  (type-check + production build), `npm test` (Vitest: panel, Randomize, palette rules,
  backdrop layout, every registry form's size, contact, normals and triangle budget, the
  registry and its rooms, card framing, cluster layout, skin texture, soft light).
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
  distance field into a clean mesh: no ledges, however lumpy), pieces, seeded random,
  checks) and
  `forms/{id}.ts`. The size check measures every piece except small parts (stem, leaf,
  calyx), which may stick out. "Faces point outward" is checked by each closed piece's signed
  volume (positive), which works for bent tubes too. `apple/` builds the procedural apple (body, stem, leaf). No model files.
- `src/dev/checks.ts` has the dev-only report, silhouette, line-up and check sheet.
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
Ingredient forms (branch `ingredient-forms`): facets retired (smooth apple), key light
upper left, the registry, colour families, form kit (lathe and round recipe), card
framing, Shuffle ingredient, soft light (Light strength), skin textures, the lemon, the
orange (calyx, stem, leaf), the strawberry (a cluster of three) and the cluster layout,
the broccoli (one head lying down with crown and cut end on the table, a crown of about 115
lumps meshed with surface nets, a ribbed stalk with leaf scars forking into finger-like
branches, a leaf resting on the table; the egg was skipped), the baguette (board 08's
bread card: a long loaf on a diagonal, four varied, spread-out slashes with pointed tips and
pale crumb pieces in them, in the warmer `baked` crust family; the round boule with a scored cross is kept as its `loaf` form for later, and a white
sandwich loaf comes later as its own ingredient, "toast"),
dev checks. Family rooms may sit 70 to 180
degrees from the ingredient (board 04's own pairings, kept by choice). Next, one at a
time with feedback: cheese wedge, butter, steak,
chicken drumstick, watermelon wedge (whole forms only; cut forms later).

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
