# Painterly Look Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repaint the Style Lab apple as softly lit digital gouache with watercolour glazes: calm shapes, glowing edges, clear multi-coloured shadows, a quiet muted backdrop, and a 9-control panel.

**Architecture:** The 3D underpainting does most of the work and does it in object space, so everything on the apple sticks to its surface: soft tone bands, wet-in-wet colour blooms, glow, multi-hue shadow colour, contact shadow and sparse accent marks. The screen-space pass becomes a light "glaze" pass that only applies effects derived deterministically from the underpainting (lost edges, pigment pooling, painting the cast shadow from a label, calm backdrop slabs, paper grain), so nothing boils when the camera orbits. The old stroke pass stays reachable behind a hidden toggle. One change from the design's builder's calls: no separate edge-preserving smoothing pass. The underpainting is already made of flat bands, so the calm shapes come from there, and the post pass stays cheap.

**Tech Stack:** Vite 8, TypeScript, Three.js r186 (WebGL, `ShaderMaterial`), Tweakpane 4, Vitest (added in Task 1) for pure TypeScript logic.

**Spec:** `docs/superpowers/specs/2026-10-17-painterly-design.md`. Source-of-truth images: `references/painterly/00-source-of-truth-lemon-wedges.png`, `references/painterly/01-source-of-truth-blood-orange.png`. Avoid: `references/painterly/90-avoid-stroke-clutter.png`.

## Global Constraints

- Branch `painterly`. Commit after every task.
- Three.js r186, WebGL only, no React, Tweakpane 4.
- Colours are hex strings in settings; mix in OKLab/OKLCh, never RGB (GLSL: `mixOklab`, `mixOklch`, `linearToOklab`, `oklabToLinear` in `src/shading/chunks/colour.glsl.ts`).
- UI copy: sentence case, no em dashes.
- Hidden, never deleted: controls leave the panel via `hidden: true` (or a hidden group), never by deleting them. Old palettes and the old stroke shader are kept too.
- Most sliders 0..100 shown as %, converted where used.
- On-demand rendering stays (`stage.invalidate()`); orbiting must stay smooth.
- Idle spin off by default.
- Code style: friendly explanatory comments, like the existing files (the user is a designer new to code).
- Verify visuals in the browser preview (`preview_start` with name `style-lab`), not by asking the user.

## Review Focus

1. **Randomize at extreme combinations** (Brushiness 100 + Texture 100 + Wash bleed 100): still no clutter, the shadow still a clear shape. Covered by the nice ranges test in Task 2 and the 20-press check in Task 9.
2. **Light pad low or behind the apple** (hidden light direction): the cast shadow fades out cleanly with no stray label pixels painting dark blotches. Task 6 test step.
3. **Shuffle palette** must obey the same soft-light rules as the presets, every time. Task 3 runs the rules on 200 shuffles.
4. **Window resize and the 2x pixel ratio**: paper grain, slabs and edge widths are sized from resolution so they look the same at any size. Task 5 check step.
5. **Hidden classic toggle on**: the old stroke look still renders, including its darkened cast shadow and frame. Task 5 and Task 6 check steps.

---

## File map

| File | Change |
|---|---|
| `package.json` | add `vitest`, `"test": "vitest run"` |
| `src/utils/colour.ts` | add `hexToOklch` |
| `src/params.ts` | new controls, new `lighting` group, hidden old ones, new defaults |
| `src/randomize.ts` | unchanged logic; covered by new tests |
| `src/palettes.ts` | soft-light `PALETTES`, `CLASSIC_PALETTES`, `glow` colour, rules-based `shufflePalette` |
| `src/scene/backdropLayout.ts` | **new**: Backdrop slider to plane arrangement |
| `src/scene/background.ts` | wall/table planes with tilt and a window light patch |
| `src/scene/ground.ts` | label mode: writes the shadow into alpha instead of darkening |
| `src/painting/glazeShader.ts` | **new**: the default screen pass |
| `src/painting/frame.glsl.ts` | **new**: frame GLSL moved out of `paintShader.ts`, shared by both passes |
| `src/painting/painter.ts` | two pass materials, `PaintFrame` input |
| `src/shading/effect.ts` | `FrameContext.groundY` |
| `src/shading/effects/toonBands.ts` | softer wrap; band softness from Wash bleed |
| `src/shading/effects/washBleed.ts` | **new**: wet-in-wet colour blooms in object space |
| `src/shading/effects/shadowColour.ts` | **new**: replaces `ambientBounce` in the stack (file kept) |
| `src/shading/effects/glow.ts` | **new**: subsurface glow at the terminator and thin edges |
| `src/shading/effects/surfaceMarks.ts` | **new**: sparse accent marks and speckle, object space |
| `src/shading/effects/index.ts` | new stack order |
| `src/main.ts` | pass `groundY` and `PaintFrame`, ground mode |
| `CLAUDE.md` | new source of truth, style, pipeline, panel |

---

### Task 1: Test runner and OKLCh reader

**Files:**
- Modify: `package.json`, `src/utils/colour.ts`
- Test: `src/utils/colour.test.ts`

**Interfaces:**
- Produces: `hexToOklch(hex: string): { l: number; c: number; h: number }` (h in degrees 0..360).

- [ ] **Step 1:** `npm install -D vitest`, add script `"test": "vitest run"`.
- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { hexToOklch, oklchToHex } from './colour';

describe('hexToOklch', () => {
  it('reads white as light and grey', () => {
    const w = hexToOklch('#ffffff');
    expect(w.l).toBeCloseTo(1, 2);
    expect(w.c).toBeLessThan(0.001);
  });
  it('round-trips through oklchToHex', () => {
    const c = hexToOklch(oklchToHex(0.6, 0.12, 30));
    expect(c.l).toBeCloseTo(0.6, 2);
    expect(c.c).toBeCloseTo(0.12, 2);
    expect(c.h).toBeCloseTo(30, 0);
  });
});
```

- [ ] **Step 3:** `npm test` → FAIL (`hexToOklch` is not exported).
- [ ] **Step 4:** Implement `hexToOklch` in `src/utils/colour.ts` with the existing sRGB to linear to OKLab maths in that file; hue via `atan2`, wrapped to 0..360.
- [ ] **Step 5:** `npm test` → PASS. `npm run build` → no errors.
- [ ] **Step 6:** Commit `Add Vitest and an OKLCh colour reader`.

---

### Task 2: The new panel (settings, groups, defaults)

**Files:**
- Modify: `src/params.ts`
- Test: `src/params.test.ts`

**Interfaces:**
- Produces, in `Settings`:
  - `paint.brushiness`, `paint.washBleed`, `paint.edgeSoftness`, `paint.texture` (0..100, visible). Existing `paint.painterly`, `paint.variation`, `paint.chalk` become hidden.
  - New group `lighting: { glow: number; shadowColour: number }` (0..100), title `Light`, visible, placed after `paint`.
  - `scene.backdrop` (0..100, visible). `scene.backdropStrokes` and `scene.frame` become hidden; `DEFAULTS.scene.frame = false`.
  - `brush.classic: boolean` (hidden, default `false`). Whole `brush` group becomes hidden.
  - `colour.glow: string` (hidden group, set by palettes).
- Labels (exact): `Brushiness`, `Wash bleed`, `Edge softness`, `Texture`, `Glow`, `Shadow colour`, `Backdrop`. Highlights folder keeps `Shape`, `Size`, `Rim glints`. Scene keeps `Idle spin`.
- `GROUPS` order: `palette`, `paint` (title `Paint`), `lighting` (`Light`), `highlight` (`Highlights`), `scene` (`Scene`), then hidden `brush`, `shape`, `colour`, `light`.
- Nice ranges (Randomize): Brushiness `[15, 70]`, Wash bleed `[25, 80]`, Edge softness `[20, 75]`, Texture `[10, 60]`, Glow `[25, 80]`, Shadow colour `[30, 85]`, Backdrop `[0, 100]`, highlight Size stays `[25, 70]`. Starting defaults: 35, 55, 50, 30, 55, 60, 40 (Task 9 tunes them).
- In `SPECS.scene`, put `backdrop` first so the panel order is Backdrop, then Idle spin.
- The default palette stays `orchard` in this task; Task 3 switches it to `linen`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULTS, GROUPS, SPECS, isVisible, type GroupKey, type Spec } from './params';
import { randomSettings } from './randomize';

const visibleLabels = () =>
  GROUPS.flatMap(({ key }) =>
    (Object.values(SPECS[key]) as Spec[]).filter((s) => isVisible(key, s)).map((s) => s.label),
  );

describe('panel', () => {
  it('shows exactly the stylization controls', () => {
    expect(visibleLabels()).toEqual([
      'Colour combo', 'Brushiness', 'Wash bleed', 'Edge softness', 'Texture',
      'Glow', 'Shadow colour', 'Shape', 'Size', 'Rim glints', 'Backdrop', 'Idle spin',
    ]);
  });
  it('starts with the frame off and idle spin off', () => {
    expect(DEFAULTS.scene.frame).toBe(false);
    expect(DEFAULTS.scene.idleSpin).toBe(false);
    expect(DEFAULTS.brush.classic).toBe(false);
  });
});

describe('randomize', () => {
  it('keeps every visible slider inside its nice range and leaves hidden values alone', () => {
    for (let i = 0; i < 200; i++) {
      const next = randomSettings(structuredClone(DEFAULTS));
      for (const { key } of GROUPS) {
        for (const [name, spec] of Object.entries(SPECS[key as GroupKey]) as [string, Spec][]) {
          const value = (next[key as GroupKey] as Record<string, unknown>)[name];
          const before = (DEFAULTS[key as GroupKey] as Record<string, unknown>)[name];
          if (!isVisible(key as GroupKey, spec)) {
            if (key !== 'colour' && key !== 'light' && key !== 'scene') expect(value).toEqual(before);
          } else if (spec.kind === 'slider' && spec.random !== false) {
            expect(value as number).toBeGreaterThanOrEqual(spec.nice[0]);
            expect(value as number).toBeLessThanOrEqual(spec.nice[1]);
          }
        }
      }
      expect(next.scene.frame).toBe(false);
      expect(next.brush.classic).toBe(false);
    }
  });
});
```

(Colour, light and scene colour values are rewritten by the palette, which is why they are excluded from the "unchanged" check.)

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Update `Settings`, `GROUPS`, `DEFAULTS`, `SPECS` in `src/params.ts` as listed. `DEFAULTS.colour.glow` = the current `lit` colour for now.
- [ ] **Step 4:** `npm test` → PASS. `npm run build` → no errors.
- [ ] **Step 5:** Browser: `preview_start` `style-lab`, `read_page`: the panel shows the folders Paint, Light, Highlights, Scene with the labels above, and no Brush folder. Sliders do nothing visible yet; that is expected.
- [ ] **Step 6:** Commit `New painterly panel controls; old brush controls hidden`.

---

### Task 3: Soft-light colour combos

**Files:**
- Modify: `src/palettes.ts`
- Test: `src/palettes.test.ts`

**Interfaces:**
- Consumes: `hexToOklch` (Task 1), `colour.glow` (Task 2).
- Produces: `PaletteColours.glow: string`; `PALETTES` (6 soft-light combos, first is `linen`); `CLASSIC_PALETTES` (the 7 current combos, unchanged, with a `glow` added equal to their `lit`), not shown in the picker; `applyPalette` also writes `settings.colour.glow`; `shufflePalette()` follows the rules below.
- The 6 combos (id, name, subject): `linen` / `Linen` (red apple, warm grey and dusty blue room); `sage-morning` / `Sage morning` (red-orange apple, sage and stone); `dusty-rose` / `Dusty rose` (pink-red apple, mauve grey); `overcast` / `Overcast` (crimson apple, cool blue-grey); `pear-light` / `Pear light` (yellow-green apple, warm putty and lilac grey); `honey` / `Honey` (golden apple, dusty teal-grey). The hex values are the implementer's, tuned by eye against the source of truth, within the rules.

- [ ] **Step 1: Write the failing test** that checks every combo in `PALETTES` plus 200 `shufflePalette()` results against these rules (OKLCh, `hexToOklch`):

| Colour | Rule |
|---|---|
| `wall`, `table` | `0.62 ≤ l ≤ 0.88`, `c ≤ 0.07` (muted, high key) |
| `ambient` | `c ≤ 0.08` |
| `base` | `c ≥ 0.12` and `c ≥ max(wall.c, table.c, ambient.c) + 0.05` |
| `lit` | `l > base.l`, `l ≤ 0.86` (pale, not bleached) |
| `shadow` | `0.30 ≤ l ≤ 0.50`; hue differs from `base` by ≥ 20° |
| `glow` | `c ≥ base.c`; hue within 50° of `base` |
| `highlight` | `l ≥ 0.88`, `c ≤ 0.06` |
| `bounce` | hue in 20°..100° (warm), `0.04 ≤ c ≤ 0.12` |
| `castShadow` | `0.38 ≤ l ≤ 0.62`, `0.03 ≤ c ≤ 0.09`, hue in 180°..320° (cool) |

Also: `PALETTES[0].id === 'linen'`, `PALETTES.length === 6`, `CLASSIC_PALETTES.length === 7`, and `applyPalette` copies `glow` into `settings.colour.glow`.

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement the combos, `CLASSIC_PALETTES`, the `glow` field and a rules-following `shufflePalette`. Update the file's top comment to describe the soft-light rules. Set `DEFAULTS.palette.preset = 'linen'` and make the default `colour.*`, `light.ambient`, `light.bounce` and `scene` colours equal `linen`'s (add a test: `applyPalette(defaultSettings(), PALETTES[0])` leaves the settings unchanged).
- [ ] **Step 4:** `npm test` → PASS. `npm run build` → no errors.
- [ ] **Step 5:** Browser: the combo picker lists the 6 new combos; Shuffle works.
- [ ] **Step 6:** Commit `Soft-light colour combos with a glow colour`.

---

### Task 4: Backdrop planes and the window light patch

**Files:**
- Create: `src/scene/backdropLayout.ts`
- Modify: `src/scene/background.ts`, `src/main.ts`
- Test: `src/scene/backdropLayout.test.ts`

**Interfaces:**
- Produces:

```ts
export interface BackdropLayout {
  horizon: number;      // 0..1 screen height of the wall/table line
  tilt: number;         // radians, slope of the horizon line
  patchCentre: { x: number; y: number }; // 0..1 screen, always on the table
  patchAngle: number;   // radians, direction the light patch runs
  patchWidth: number;   // 0..1 of screen height
  contrast: number;     // 0..1 how far wall and table colours are pushed apart
}
export function backdropLayout(backdrop: number): BackdropLayout;
```

- [ ] **Step 1: Write the failing test:** for every `backdrop` in 0..100 (step 1): `0.28 ≤ horizon ≤ 0.48`; `|tilt| ≤ 0.12`; `patchCentre.y < horizon` (patch is on the table); `0.15 ≤ patchCentre.x ≤ 0.85`; `0.08 ≤ patchWidth ≤ 0.22`; `0 ≤ contrast ≤ 1`; same input gives the same output; values at 0 and 100 differ.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `backdropLayout` as a smooth, deterministic walk through arrangements (sine-based on the slider value, no `Math.random`).
- [ ] **Step 4:** In `background.ts`, replace the soft-gradient look with: a wall plane and a table plane split by the tilted horizon (crisp, slightly wobbly painted edge, `horizonSoftness` still respected), each nearly flat with very low-frequency OKLab lightness drift (`variation`), and a window light patch on the table: a parallelogram (two panes) at `patchCentre`, lighter and warmer than the table (mix the table colour toward the lit side of the combo in OKLab, roughly `+0.08 l`), gently edged, never a spotlight. Read layout from `backdropLayout(settings.scene.backdrop)`; pass `settings.scene` plus palette colours as today. Alpha stays 0.
- [ ] **Step 5:** `npm test` → PASS, `npm run build` → no errors. Browser: drag Backdrop 0 to 100: the arrangement changes smoothly, always calm, patch always on the table. Screenshot at 0, 50, 100.
- [ ] **Step 6:** Commit `Backdrop planes with a window light patch`.

---

### Task 5: The glaze pass (new default screen pass)

**Files:**
- Create: `src/painting/glazeShader.ts`, `src/painting/frame.glsl.ts`
- Modify: `src/painting/painter.ts`, `src/painting/paintShader.ts` (use the shared frame chunk), `src/main.ts`

**Interfaces:**
- Consumes: `settings.paint.*`, `settings.brush.classic`, `settings.scene.frame`, flow texture (unchanged `flowShader.ts`).
- Produces:

```ts
export interface PaintFrame {
  /** Screen direction toward the light, from the light pad (camera relative), normalised. */
  lightScreen: Vector2;
  /** The apple's centre in 0..1 screen coordinates and its radius as a fraction of screen height. */
  objectUv: Vector2;
  objectRadius: number;
}
// Painter.render(renderer, scene, camera, settings, frame: PaintFrame): void
// frame.glsl.ts exports frameGLSL: string defining `vec3 applyFrame(vec3 colour, vec2 uv, vec2 resolution, vec3 frameColour)`
```

- `main.ts` builds the `PaintFrame` each frame: `lightScreen` = normalised `(light.direction.x, light.direction.y)`; `objectUv` and `objectRadius` by projecting `apple.centre` (and a point `apple.radius` above it) with the camera.
- `Painter` uses the classic `paintShader` when `settings.brush.classic` is true, otherwise the glaze shader. The flow pass runs in both modes.

The glaze shader does, in order (`under = texture(tColour)`; `onObject = under.a ≥ 0.25`; `highlight = clamp((a − 0.5) × 2)`):

1. **Lost edges (Edge softness).** Near the object outline (alpha changes within ~`0.012 × height` px), estimate the outward silhouette normal from the alpha gradient (4 taps). Where `dot(normal, lightScreen) < 0` (shadow side), blend across the outline with a short blur along the normal, strength `edgeSoftness × shadowSide`, extra where the two sides have similar OKLab lightness. Lit-side outline stays crisp.
2. **Pigment pooling (Wash bleed).** Where the flow pass's edge strength (`tFlow.b`) is high, darken in OKLab by up to `0.035 × washBleed` on the darker side of the edge only, so washes get a slightly darker rim. Never on highlight pixels.
3. **Calm backdrop slabs (Brushiness).** Backdrop pixels only: one layer of large slabs (cell ≈ `0.12 × height`), each slab a very small OKLab shift of the colour under it (lightness ±0.02, hue turn ±0.06 rad), soft edges, slab coverage `0.2 + 0.6 × brushiness`. No bristles, no patterns. Directions as the classic `strokeAngle` fallback (wall diagonals, table near level).
4. **Paper grain (Texture).** A fine fixed-to-canvas grain (fbm at ~`height / 3` frequency) shifting OKLab lightness by up to `±0.025 × texture`. This is the paper, so it stays fixed to the canvas by design; paint texture on the apple sticks to the apple (Task 8).
5. **Highlights** stay crisp: `colour = mix(colour, under.rgb, highlight)`.
6. **Frame** only if `scene.frame` (hidden): `applyFrame`.

All sizes come from `uResolution.y` so they look the same at any size or pixel ratio.

- [ ] **Step 1:** Move the frame block from `paintShader.ts` into `frame.glsl.ts` as `applyFrame`; `paintShader.ts` calls it. Build, and in the browser set `styleLab.settings.brush.classic = true; styleLab.settings.scene.frame = true; styleLab.redraw()`: the classic look and frame are unchanged.
- [ ] **Step 2:** Write `glazeShader.ts` and wire `Painter` and `main.ts`.
- [ ] **Step 3:** `npm run build` → no errors. Browser checks, with screenshots: default view has no strokes on the apple, a crisp lit-side silhouette, a softened shadow-side silhouette; Edge softness 0 vs 100 visibly changes only the shadow side; Brushiness 0 vs 100 changes only backdrop slab presence, never into clutter; resize the window and the grain and edge widths look the same; `read_console_messages` has no shader errors.
- [ ] **Step 4:** Commit `Glaze pass replaces stroke-everywhere painting; strokes kept behind a hidden toggle`.

---

### Task 6: Clear, multi-coloured cast shadow

**Files:**
- Modify: `src/scene/ground.ts`, `src/painting/glazeShader.ts`, `src/main.ts`

**Interfaces:**
- Consumes: `PaintFrame` (Task 5), `settings.scene.shadowColour`, `settings.scene.shadowAmount`, `settings.lighting.shadowColour`, `settings.light.ambient`.
- Produces: `Ground.update(scene: Settings['scene'], lightDirection: Vector3, labelMode: boolean): void`. In label mode the ground keeps the backdrop colour (`blendSrc = ZeroFactor`, `blendDst = OneFactor`) and adds its shadow into alpha (`blendSrcAlpha = OneFactor`, `blendDstAlpha = OneFactor`) with `opacity = 0.2 × lightAbove`, so backdrop alpha `0..0.2` means "shadow amount". Classic mode keeps today's blending exactly.

In the glaze shader, for backdrop pixels, `shadow = clamp(under.a / 0.2, 0, 1)`, sampled with a small object-independent wobble (fbm offset ≈ 1.5 px) so the edge looks painted, never jagged. Then:

- **Contact:** march 6 taps from the pixel toward `objectUv`, up to `0.06 × height`; if a tap hits the object, `contact = 1 − distance / maxDistance`.
- **Distance from the apple:** `far = smoothstep(objectRadius × 0.6, objectRadius × 2.2, distance to objectUv in height units)`.
- **Colour (OKLab):** start from `scene.shadowColour` (cool); toward `far`, mix toward a lighter, bluer version (+0.06 l, hue toward 250°); mix in a second hue from `light.ambient` as a soft low-frequency patch, amount `0.35 × lighting.shadowColour`; at `contact`, mix toward a darker, more saturated version (−0.08 l, chroma ×1.3).
- **Strength:** `shadow × shadowAmount/100 × mix(1.0, 0.75, far)`. The shape stays readable; it never fades below 0.6 of full strength inside the shadow.

- [ ] **Step 1:** Implement label mode in `Ground` and pass `!settings.brush.classic` from `main.ts`.
- [ ] **Step 2:** Implement the shadow painting in the glaze shader.
- [ ] **Step 3:** `npm run build` → no errors. Browser checks with screenshots: the cast shadow is one clear shape, crisp edged, darkest and most saturated at the contact, lighter and bluer away from it; Shadow colour 0 gives a simple cool shadow, 100 a visible second hue. **Review Focus 2:** set `styleLab.settings.light.direction = {x: 0.6, y: -0.2}` then `{x: 0, y: 0.05}`: the shadow fades out with no dark blotches or stray pixels. **Review Focus 5:** with `brush.classic = true` the old darkened shadow is back.
- [ ] **Step 4:** Commit `Cast shadow painted as a clear, multi-coloured shape`.

---

### Task 7: Soft light, wash bleed, shadow colour and glow on the apple

**Files:**
- Create: `src/shading/effects/washBleed.ts`, `src/shading/effects/shadowColour.ts`, `src/shading/effects/glow.ts`
- Modify: `src/shading/effects/toonBands.ts`, `src/shading/effects/index.ts`, `src/shading/effect.ts`, `src/shading/stylizedMaterial.ts`, `src/ingredients/apple/apple.ts` (`applyColours` passes `glow`: the body uses `colour.glow`, stem and leaf use their own colour), `src/main.ts`

**Interfaces:**
- Produces: `FrameContext.groundY: number` (set from `apple.bottomY` in `main.ts`); a per-material `uGlowColour` uniform set by `setPalette` (extend `Palette` in `stylizedMaterial.ts` with `glow`; stem and leaf use their own colour for glow).
- `EFFECT_STACK = [toonBands, washBleed, shadowColour, glow, highlight, gouacheMatte]`. `ambientBounce.ts` stays in the folder, unused, with a comment saying `shadowColour` replaced it.

What each does (all in object space, so it sticks to the apple):

- **toonBands:** wrap light more for soft light (`(dot(N, L) + 0.55) / 1.55`); band transition softness comes from `mix(light.softness, 0.45, paint.washBleed/100)` instead of `light.softness` alone (keep a hidden-light override possible by taking the larger of the two).
- **washBleed:** inside each band, drift the colour wet-in-wet: two `fbm3(objectPos × ~1.6)` fields shift OKLab lightness (±0.04) and pull the colour toward `uGlowColour` in lit bands and toward `light.ambient` in shadow bands, amount `0.35 × washBleed`. Low frequency only: blooms, not speckle.
- **shadowColour:** replaces ambient/bounce. In shadow bands (`1 − tone`): core shadow cools toward `light.ambient` (0.4 × amount); warm bounce from below (`facesDown`) toward `light.bounce` (0.5 × amount); contact occlusion where `worldPos.y − groundY < 0.25 × radius` and `N.y < 0.3`: darker and more saturated (−0.1 l, chroma ×1.25), not grey. `amount = lighting.shadowColour / 100`; at 0 the shadow is just the palette's cool shadow ramp.
- **glow:** two masks times `lighting.glow / 100`: terminator band (a soft bump around the band edge between the darkest and the next band, using `facing`), and thin-edge rim (`pow(1 − dot(N, V), 3)` on the side facing away from the light). Mix toward `uGlowColour` in OKLCh: raise chroma, keep lightness within ±0.05, so glowing areas get warmer and more saturated, never darker.

- [ ] **Step 1:** Add `groundY`, `uGlowColour`, and the three effects; update `toonBands` and the stack.
- [ ] **Step 2:** `npm run build` → no errors; no shader compile errors in `read_console_messages`.
- [ ] **Step 3:** Browser checks with screenshots against the two source-of-truth images: the apple reads softly lit (pale lit side, not white); Glow 0 vs 100 shows a warm saturated rim and terminator band appearing; Shadow colour 0 vs 100 shows warm bounce and a deeper coloured contact under the apple; Wash bleed 0 vs 100 goes from flat bands to soft blooms inside bands. Orbit: blooms and glow travel with the surface.
- [ ] **Step 4:** Commit `Soft light, wash bleed, shadow colour and glow on the apple`.

---

### Task 8: Accent marks and material speckle that stick to the apple

**Files:**
- Create: `src/shading/effects/surfaceMarks.ts`
- Modify: `src/shading/effects/index.ts` (insert after `glow`, before `highlight`)

**Interfaces:**
- Consumes: `paint.brushiness`, `paint.texture`, `tone` and `facing`-like values from the stack (recompute `facing` locally).

Marks are placed in object space so they turn with the apple:

- 3D cell grid over `objectPos` (cell ≈ `0.18 × radius`, smaller at higher brushiness down to `0.12 × radius`). Check the 27 neighbouring cells; each cell has a mark with probability `coverage`.
- **Where:** only near form turns: `turn = 1 − smoothstep(0.0, 0.12, distance from facing to the nearest band threshold)`. `coverage = turn × mix(0.15, 0.55, brushiness)`. Flat areas stay clean at every setting.
- **Shape:** an elongated, soft-ended dab in the surface's tangent plane, running along the band (`T = normalize(cross(N, L))`), length ≈ 1.8 cells, width ≈ 0.35 cells, edges anti-aliased with `fwidth`.
- **Colour:** one colour per mark: the band colour shifted toward the neighbouring band (±0.05 OKLab lightness, small hue turn), so it reads as a single stroke of a slightly different mix. Never black, never a colour outside the palette ramp.
- **Speckle (Texture):** fine `valueNoise3(objectPos × ~40)` speckle shifting lightness by up to `±0.02 × texture`, on the apple only.
- Never on highlight pixels (`highlightMask` is computed after; marks run before `highlight`, which paints over them).

- [ ] **Step 1:** Implement `surfaceMarks.ts` and add it to the stack.
- [ ] **Step 2:** `npm run build` → no errors.
- [ ] **Step 3:** Browser checks with screenshots: Brushiness 0 = no marks; 100 = clear accent marks only at form turns, no clutter (compare against `90-avoid-stroke-clutter.png`, which must look nothing like it). Orbit slowly: marks stay attached to the surface and do not re-form.
- [ ] **Step 4:** Commit `Accent marks and speckle that stick to the apple`.

---

### Task 9: Tune the defaults against the source of truth

**Files:**
- Modify: `src/params.ts` (defaults, nice ranges, hidden `shape.roundness` and `shape.facets` defaults, `light` defaults), `src/palettes.ts` (combo hex values within the Task 3 rules)

- [ ] **Step 1:** Set the apple to "carved, not faceted": raise `shape.roundness` (start ~70) and lower `shape.facets` (start ~28) until only the major plane changes read. Adjust `light.bands` (start 3) and the hidden light direction for soft side-front light.
- [ ] **Step 2:** Tune the nine control defaults and the `linen` combo by eye. Screenshot the default view next to each source-of-truth image and adjust until it reads as the same family, softly lit.
- [ ] **Step 3:** Press Randomize 20 times (`find` the Randomize button and click it, screenshot each result). Every result must pass: calm shapes, no stroke clutter, no jagged shadow edge, no muddy colour, shadow present and clear. Narrow nice ranges where a result fails, and repeat until 20 in a row pass. **Review Focus 1** is covered here.
- [ ] **Step 4:** Orbit continuously for ~5 seconds; it stays smooth (no visible stutter) and the apple's marks stay attached.
- [ ] **Step 5:** `npm test` and `npm run build` → pass. Commit `Tune painterly defaults to the new source of truth`.

---

### Task 10: Update the project notes

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1:** Update: source of truth (`references/painterly/00-…` and `01-…`; `references/apple` is the old direction); style direction (digital gouache with watercolour glazes, softly lit, shapes first and marks as accents, lost and found edges, glow, multi-coloured clear shadows, muted environment with a warm subject, no frame); the panel list; the pipeline (object-space underpainting effects, glaze pass, label alpha `0..0.2` = cast shadow, classic stroke pass behind `brush.classic`); the test command `npm test`; "Done so far" with this work. UI-copy rules unchanged.
- [ ] **Step 2:** `npm test` and `npm run build` → pass. Commit `Update project notes for the painterly look`.
