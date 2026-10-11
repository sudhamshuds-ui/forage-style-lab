# Forage Style Lab

## What this is
Forage is a cooking discovery web game where combined ingredients become painterly
trading-card artworks. The Style Lab is step 1: a tool for stylizing a single 3D
ingredient (an apple) with live parameters, viewable in 3D. Later sessions will add
more effects and more ingredients.

## Who I'm working with
A motion and visual designer who is new to coding. Explain things in simple terms
as you go, use design analogies (layers, adjustment layers, palettes), and keep
code readable with friendly comments.

## Rules
- UI copy never uses em dashes. Use a full stop, comma, or colon instead.
- UI copy uses sentence case ("Copy settings", "Tone bands").
- Match `references/ui` for any UI work and `references/apple` for the art style.
- Style direction: gouache. Matte, opaque, chalky colour; flat value bands with
  slightly soft, wobbly painted edges; shadows that shift hue (red to wine to plum),
  never plain darker or grey; warm lights, cool shadows; ambient light from the
  surroundings and bounce light from the table.

## Tech
- Vite + TypeScript + Three.js (WebGL, not WebGPU for now). No React.
- Tweakpane 4 for the panel, re-skinned in `src/ui/panel.css`.
- Commands: `npm run dev` (dev server, http://localhost:5173), `npm run build`
  (type-check + production build).

## Code map
- `src/main.ts` wires everything up and runs the per-frame loop.
- `src/params.ts` is the single source of truth for every control:
  `Settings` (shape of the data), `DEFAULTS`, `SPECS` (label, range, Randomize range).
  The panel is generated from `SPECS`.
- `src/randomize.ts` makes new settings from the "nice" ranges plus colour-harmony rules.
- `src/ingredients/apple/` builds the procedural apple (body, stem, leaf). No model files.
- `src/shading/` is the stylized shader, built from a stack of effect modules:
  - `effect.ts` defines the `ShaderEffect` interface and the shared GLSL values.
  - `stylizedMaterial.ts` assembles the effects into one ShaderMaterial.
  - `effects/index.ts` is the ordered effect stack (like layers).
  - `chunks/` has shared GLSL (OKLab/OKLCh colour maths, noise).
- `src/scene/` has the stage (renderer, camera, orbit controls, light rig),
  the painted background, and the shadow-catching floor.
- `src/ui/` has the Tweakpane panel and the Randomize / Reset / Copy settings buttons.
- `src/utils/colour.ts` has OKLab helpers in TypeScript.

## Adding a new shader effect
1. Create `src/shading/effects/myEffect.ts` exporting a `ShaderEffect`
   (uniforms, GLSL declarations, GLSL body that edits `colour`, and `update(settings)`).
2. Add its controls to `src/params.ts` (Settings, DEFAULTS, SPECS).
3. Add it to `EFFECT_STACK` in `src/shading/effects/index.ts` in the right order.
Tone bands must stay first, since it sets `tone` for later effects.

## Conventions
- Colours are hex strings in settings. Mix colours in OKLab/OKLCh, not RGB.
- Most sliders are 0..100 (shown as %), converted to real units where they are used.
- The light direction is relative to the camera (like a lamp fixed to the easel).
- Shape changes rebuild geometry only when a Shape value changes; everything else
  is pushed into uniforms every frame.

## Done in v1
Procedural apple with shape sliders, stylized gouache shader (tone bands, hue-shifted
shadows, ambient and bounce colour, highlight dab, painted edges, chalkiness), gradient
backdrop with horizon, cast shadow, orbit + idle spin, grouped panel, Randomize, Reset,
Copy settings (JSON).

## Planned for later sessions (not built yet)
Brush strokes based on colour gradients, fixed grain/dither, highlight shape types
(square flecks, streaks), patterns inside highlights and shadows, deckled paper frame,
sparkles, soft body wobble.
