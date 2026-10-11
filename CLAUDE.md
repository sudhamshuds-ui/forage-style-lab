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
- **Source of truth for the art: `references/apple/00-source-of-truth.webp`.**
  `04-backdrop-falloff-and-strokes.png` shows the backdrop as an abstract painted shape.
  Other images in `references/apple` explain it; `references/ui` is the tool's look.
- The panel is deliberately minimal: **Painterly** (the main stylization dial),
  **Backdrop falloff**, and **Pattern** (type, amount). Everything else (brush, colour
  combo, highlights, scene, shape, lighting, colours) is **hidden, not deleted**: kept in
  `src/params.ts` with `hidden: true` (or a hidden group). Never delete hidden controls;
  to bring one back, remove its `hidden` flag.
- Strokes follow **Big, Medium, Small**: few big strokes lay in masses, fewer medium
  strokes only where something happens (plane edges, horizon, backdrop edge), a handful
  of small accents near the focal point (the highlight) and the backdrop edge. Aim for
  the most pleasing picture with the fewest strokes. Patterns follow BMS zones too.
- Marks are not only brush strokes: many are flat geometric **shapes** (rectangles,
  slanted slabs, tapered wedges) laid on as translucent glazes, and every mark has its
  own opacity. Big marks are mostly shapes, small accents mostly strokes.
- No random pale scratch lines: the user found them odd (`scene.scratchLines` is off).
- Art principles the user cares about: planar rendering (one flat value per plane,
  crisp plane edges, no blending on the subject); edge hierarchy (hard on the silhouette
  and highlight, soft or lost in the backdrop); complementary contrast (red on green,
  purple wall); warm light, cool hue-shifted shadows, green bounce.
- Composition: the fruit is centred, with a natural curved stem and a leaf (on).
- Idle spin is off by default.
- Style direction: gouache with visible paint strokes. Each stroke is one colour;
  shadows shift hue (red to wine to plum), never plain darker or grey; warm lights,
  cool shadows; ambient light from the wall, bounce light from the table; crisp pale
  highlight shapes (window panes, dashes); a painted backdrop of big slabs, not a
  smooth gradient; a taupe frame with brushy edges.

## Tech
- Vite + TypeScript + Three.js (WebGL, not WebGPU for now). No React.
- Tweakpane 4 for the panel, re-skinned in `src/ui/panel.css`.
- Three.js reference skills are installed in `.claude/skills/` (shaders and
  postprocessing are the relevant ones). They target Three r160; this project uses r186.
- Commands: `npm run dev` (dev server, http://localhost:5173), `npm run build`
  (type-check + production build).
- In dev, `styleLab.settings` and `styleLab.redraw()` are available in the browser console.

## How a frame is made (the pipeline)
1. **Underpainting**: the 3D scene renders into a hidden image (`src/painting/painter.ts`).
   The apple uses the stylized shader (flat tone bands, hue-shifted shadows, ambient and
   bounce, highlight shapes). Alpha is a label, not transparency: 0 = backdrop,
   0.5 = object, up to 1.0 = crisp highlight.
2. **Flow** (`src/painting/flowShader.ts`): measures which way edges run (structure tensor),
   at quarter resolution, and stores the painted backdrop shape (Backdrop falloff) as a
   distance field in alpha.
3. **Paint** (`src/painting/paintShader.ts`): repaints the image with brush strokes on
   grids of cells (backdrop slabs, object strokes, detail strokes near edges). Each stroke
   picks up one colour, follows the flow, stays inside its own area (object vs backdrop),
   and has a brush shape, bristle texture and optional pattern. Highlights and the frame
   go on top. Strokes are in screen space, so they re-form when the camera moves.
- The stage only redraws when something changes (`stage.invalidate()`), or while the
  camera moves.

## Code map
- `src/main.ts` wires everything up and runs the loop.
- `src/params.ts` is the single source of truth for every control:
  `Settings`, `DEFAULTS`, `SPECS` (label, range, Randomize range, `hidden`). The panel is
  generated from `SPECS`.
- `src/palettes.ts` holds the colour combos and the Shuffle generator.
- `src/randomize.ts` randomizes visible controls only, plus a random combo.
- `src/ingredients/apple/` builds the procedural apple (body, stem, leaf). No model files.
- `src/shading/` is the stylized 3D shader, built from a stack of effect modules:
  `effect.ts` (interface, shared GLSL values, FrameContext), `stylizedMaterial.ts`,
  `effects/index.ts` (ordered stack), `chunks/` (OKLab colour maths, noise).
- `src/painting/` is the brush stroke post-process (painter, flow and paint shaders).
- `src/scene/` has the stage (renderer, camera, controls, light rig), the backdrop
  underpainting, and the shadow-catching floor.
- `src/ui/` has the Tweakpane panel, the colour combo picker and the buttons.
- `src/utils/colour.ts` has OKLab helpers in TypeScript.

## Adding a new effect
- On the 3D surface (before painting): create `src/shading/effects/myEffect.ts`
  exporting a `ShaderEffect`, add its controls to `src/params.ts`, add it to
  `EFFECT_STACK`. Tone bands must stay first.
- On the painted image (strokes, grain, frame): extend `src/painting/paintShader.ts`
  and pass new uniforms from `Painter.updateUniforms`. Stroke layers are set up at the
  bottom of `paintShader.ts` (`main`): one call to `paintLayer` per Big, Medium, Small
  layer, for the backdrop and for the object.

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
v3: translucent geometric glaze shapes alongside strokes, per-mark opacity;
Big, Medium, Small stroke hierarchy; "dry and flat" brush mix; Painterly as the main
dial; Backdrop falloff (abstract painted shape with cut corners, lost and crisp edges,
pale scratch accents); BMS pattern zones; planar apple (crisper plane edges, 5 values);
centred fruit, natural stem with a tip knob, leaf on; Randomize reshuffles stroke layout.

## Planned for later sessions (not built yet)
Fixed grain/dither, patterns inside highlights and shadows, sparkles, soft body wobble,
decorative scratch lines on the frame (seen in the reference top left).
