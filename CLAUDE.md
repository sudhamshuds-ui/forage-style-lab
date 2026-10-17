# Forage Style Lab

## What this is
Forage is a cooking discovery web game where combined ingredients become painterly
trading-card artworks. The Style Lab is step 1: a tool for stylizing a single 3D
ingredient (an apple) with live parameters, viewable in 3D. Later sessions will add
more effects and more ingredients.

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
- The panel is deliberately small: Style (Playful strokes, and Randomize only while it is
  on); Paint (Brushiness, Wash bleed, Edge softness); Form (Faceted); plus Reset and Copy
  settings. **Hidden, not deleted** (still working, in `src/params.ts`): the colour combo
  picker, Light, Texture, Highlights, Scene, the detailed brush controls, the apple's
  shape sliders, the lighting and the individual colours. Never delete hidden controls;
  to bring one back, remove its `hidden` flag (group or control).
- **Randomize** (`src/randomize.ts`) only shuffles the playful stroke settings (brush type,
  stroke size and length, bristles, pattern and its amount). It never touches colours,
  light, shape or the refined paint sliders.
- The ingredient keeps its **own natural colours** (the apple is red; hidden Colour group).
  The user picks a **room combo** (wall, table, ambient and bounce light, cast shadow), not
  individual colours. Randomize never changes colours.
- Idle spin is off by default.
- The apple keeps its **facets** (poly edges) by default; Form > Faceted switches to the soft,
  rounded apple. No stamped dabs on the apple. Highlights are
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

## Tech
- Vite + TypeScript + Three.js (WebGL, not WebGPU for now). No React.
- Tweakpane 4 for the panel, re-skinned in `src/ui/panel.css`.
- Three.js reference skills are installed in `.claude/skills/` (shaders and
  postprocessing are the relevant ones). They target Three r160; this project uses r186.
- Commands: `npm run dev` (dev server, http://localhost:5173), `npm run build`
  (type-check + production build), `npm test` (Vitest: panel, Randomize, palette rules,
  backdrop layout).
- In dev, `styleLab.settings`, `styleLab.redraw()` and `styleLab.snapshot()` (paints one
  frame now and returns it as an image URL, handy for side-by-side comparisons) are
  available in the browser console.

## How a frame is made (the pipeline)
1. **Underpainting**: the 3D scene renders into a hidden image (`src/painting/painter.ts`).
   The room (`src/scene/background.ts`) is a 3D studio sweep painted in world space: mixed
   room colours, calm slabs (Brushiness), a soft light pool and a contact shadow, arranged
   by the Backdrop slider (`backdropLayout.ts`). The apple uses the stylized shader stack:
   tone bands, wash bleed, shadow colour, glow, surface texture (facet shards and granular
   fill), highlights, matte. Everything on the apple is computed on its own surface, so
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
   stay inside their area: object, cast shadow, or lit backdrop. The detailed brush
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
- `src/randomize.ts` randomizes visible controls only, plus a random combo.
- `src/ingredients/apple/` builds the procedural apple (body, stem, leaf). No model files.
- `src/shading/` is the stylized 3D shader, built from a stack of effect modules:
  `effect.ts` (interface, shared GLSL values, FrameContext), `stylizedMaterial.ts`,
  `effects/index.ts` (ordered stack), `chunks/` (OKLab colour maths, noise).
- `src/painting/` is the screen pass: painter, flow, glaze (default), classic strokes, frame.
- `src/scene/` has the stage (renderer, camera, controls, light rig), the backdrop
  underpainting, and the shadow-catching floor.
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
- Most sliders are 0..100 (shown as %), converted to real units where they are used.
- List options are defined once in `params.ts` (`BRUSHES`, `PATTERNS`, `HIGHLIGHT_SHAPES`);
  shaders receive the option's index.
- The light direction is relative to the camera (like a lamp fixed to the easel).

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

## Planned for later sessions (not built yet)
Importing 3D files (tool 01), patterns inside highlights and shadows, sparkles, soft body
wobble. Later tools: cut and cooked forms, vessels, combining, recipe cards.

## Branches (saved versions)
`main` is the soft-light watercolour + gouache look (this file describes it), merged from
`painterly` once approved. The version from just before Big, Medium, Small is the parent
of that merge on `main`. Older attempts are kept on local branches,
newest first:
`experiment-bad` (noise falloff + reference-scene page), `v4-before-noise` (compact
Settings card, outside-in mark falloff, glaze shapes, stable apple marks), `first-bms`
(first Big, Medium, Small version). The "Painterly v3" commit on GitHub is BMS + glaze shapes.
`vite.config.ts` only sets the dev server port (uses `PORT`, else 5173).
