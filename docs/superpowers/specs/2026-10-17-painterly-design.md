# Painterly look for the Style Lab (tool 01)

Branch: `painterly`. Merge to `main` only if the result is good.

## Intent

Forage turns ingredients into painterly trading-card artworks. The current Style
Lab paints the apple as "gouache with visible strokes everywhere". In practice that
reads as noisy clutter (see `references/painterly/90-avoid-stroke-clutter.png`):
jagged stroke spikes at the shadow edge, every surface chopped into the same busy
marks, muddy averaged colour, and a ragged silhouette.

The new direction is **digital gouache with watercolour glazes**: calm, opaque
shapes carry the drawing, transparent washes carry the colour, and brush marks
are only accents. The apple should look like it belongs next to the two new
source-of-truth paintings, but **softly lit**, not blasted by sun.

This is tool 01 of a 7-step roadmap (later tools add cutting and cooking,
vessels, combining dishes, recipe cards). Later tools will paint cut flesh,
purées and plates with this same system, so it must be built from general
painting ideas, not apple-only tricks.

## References

- **Source of truth:** `references/painterly/00-source-of-truth-lemon-wedges.png`
  and `references/painterly/01-source-of-truth-blood-orange.png`.
- Supporting: `02-supporting-cake.png`, `03-supporting-orange-slices.png`.
- What to avoid: `90-avoid-stroke-clutter.png`.
- `references/apple/` becomes history (the old direction). Keep the files.

Take from the references: the structure, shapes, edges, glazes, glow and shadow
colour. **Do not take** their candy colours. The saturated pink, periwinkle and
aqua surroundings read as harsh direct sun. We want soft light.

## The look, in painting terms

1. **Shapes first, about 70% shapes and 30% marks.** Each tone area or plane is
   one calm shape. Colour may shift softly *inside* a shape (wet-in-wet bleed),
   but the shape stays whole. Brush marks appear only at form turns, along some
   edges and in textured zones.
2. **Edge control.** Edges are crisp on the lit-side silhouette, on plane changes
   and on cast shadows. They are lost on the shadow side, where the apple melts
   into its own shadow or the backdrop. This contrast does more for the painted
   feel than stroke texture does.
3. **Watercolour glazes.** Thin, transparent washes in the light (they can let the
   pale ground show through) and more opaque paint in darks and accents. Washes
   bleed and blend inside shapes, with slightly darker pigment pooling at wash
   edges, plus a subtle paper grain.
4. **Soft, natural light.** Bright room or window light, not direct sun. The lit
   side is pale but not bleached to white. The environment is light, cool and
   **muted, greyed** (dusty blue, sage, warm grey). The subject keeps its warmth
   and is the most saturated thing in the frame. Values are generally high-key,
   but the darkest dark is a mid violet or plum, never near black.
5. **Glow (subsurface).** Thin edges and the line where light turns to shadow get
   warmer and *more* saturated, not darker. On a whole apple it is subtle, at the
   rim and the terminator. It must be a reusable effect, because in tool 02 cut
   flesh will rely on it heavily.
6. **Shadows are clear, multi-coloured shapes.** Soft light changes how strong a
   shadow is, never whether it is there. The cast shadow is a readable shape with
   a crisp edge near the apple, possibly softening with distance, never a vague
   blur. Inside, in order: a cool core shadow on the apple, warm bounce light
   within it, the darkest and most saturated contact shadow where the apple meets
   the table, then the cast shadow, cool and getting lighter and bluer with
   distance, with a second hue mixed in. Shadows stay quieter than in the
   references (a cool shadow with a hint of warm bounce, not a full rainbow).
7. **Form: carved, not faceted.** The apple is rounded, with only the major plane
   changes stated, like something carved from soap. Not a gem with visible
   polygon facets, not a smooth photoreal sphere. Silhouette slightly irregular.
8. **Quiet backdrop.** Two or three big, muted planes: wall, table, and a soft
   patch of window light falling across the table (user's decision), like the
   lemon-wedge and cake paintings. The light patch is a clear shape, gently
   edged, never a spotlight. Lots of calm space, low detail.
9. **No frame.**
10. **Highlights:** keep the existing crisp pale highlight shapes. Soften their
    default colour to suit the softly lit palette.
11. **Marks stick to the apple (user's decision).** When the camera orbits, the
    apple's paint marks, wash variation and texture stay attached to its surface,
    so turning it feels like turning a painted object, not a boiling animation.
    The backdrop does not move when orbiting, so its marks stay fixed on screen.

## Goals

- The default view on load looks like it belongs with the two source-of-truth
  paintings, softly lit.
- Randomize shuffles every visible control and the colour combo, and **every
  result looks like a good painting**. None of the failures in the "avoid" image
  appear at any combination of visible settings.
- The shading pieces (glow, shadow colour, edge control, glazes) are general and
  will apply to other ingredients and to cut flesh later.

## Non-goals (this branch)

- Importing 3D files (part of tool 01, but a separate job).
- Cut, sliced or cooked forms; plates and vessels (tools 02 and 03).
- New highlight shapes, sparkles, patterns inside shadows.

## Anti-goals (fails even if it technically works)

- Uniform stroke texture over every surface.
- Jagged, spiky or sawtooth shadow edges; a ragged or chewed silhouette.
- Muddy, averaged colour (browns and dark greens where neighbours meet).
- Candy-coloured, sun-blasted environment.
- Shadows that disappear or turn to blur.
- Grey or black shadows (shadows always shift hue).

## The panel

Nine controls plus Randomize, Reset, Copy settings. Labels in sentence case, no em
dashes in UI copy.

| Group | Control | What it does |
|---|---|---|
| Colour | **Colour combo** | Palette picker and Shuffle, as today. |
| Paint | **Brushiness** | From calm shapes to more visible marks. Even at 100% marks stay accents, never clutter. |
| Paint | **Wash bleed** | How much colour bleeds and blends inside each shape. |
| Paint | **Edge softness** | How many shadow-side edges are lost. Lit-side silhouette and cast shadows stay crisp. |
| Paint | **Texture** | Paper grain and material speckle. |
| Light | **Glow** | Subsurface warmth at thin edges and the light-to-shadow line. |
| Light | **Shadow colour** | Low: a simple cool shadow. High: the multi-colour mix with warm bounce. |
| Light | **Highlights** | Highlight shape and size (existing controls, kept together). |
| Scene | **Backdrop** | How the wall and table planes are split and arranged. |

Idle spin stays available and off by default (project rule).

Everything else is **hidden, not deleted**, following the project rule: the brush
group (type, size, length, bristle texture, pattern), the old paint sliders, the
frame and its colour, plus the already-hidden shape, colour and light groups.
Randomize touches only visible controls, within "nice" ranges tuned so results
always look good.

## Colour combos

Rebuild the combos for soft light: a muted, greyed, cool-leaning environment
(wall, table, ambient) around a warm, saturated subject, with hue-shifting
shadows and warm bounce. Shuffle generates combos that follow the same rules.

## Constraints

- Vite + TypeScript + Three.js r186, WebGL, no React. Tweakpane 4 panel.
- Keep the existing architecture: 3D underpainting, then screen-space passes in
  `src/painting/`. Shader effects stay in `src/shading/effects/` and remain stackable.
- On-demand rendering stays. It must stay smooth while orbiting.
- Colours are mixed in OKLab/OKLCh, never RGB.
- UI copy: sentence case, no em dashes.
- Update `CLAUDE.md` (source of truth, style direction, pipeline, panel) to match.

## Builder's calls (made by Claude, not agreed by the user, check while reading)

- **Paint stage approach:** replace the "strokes everywhere" grid with a
  shape-first pass: an edge-preserving smoothing that flattens each area into a
  calm shape (guided by the existing flow field), then a watercolour pass (bleed,
  pigment pooling at wash edges, paper grain), then sparse accent marks reusing
  the existing stroke code only at form turns and edges, scaled by Brushiness.
  The old stroke code stays reachable through the hidden brush controls.
- **Shadows:** the existing hidden scene shadow settings stay, but cast shadow
  colour is driven by the combo and the Shadow colour slider, with an
  edge that is crisp near the contact point. The shadow must still read as a
  clear shape at every Randomize result.
- **Apple form:** lower the default of the hidden Facets value (and adjust
  roundness if needed) to get "carved, not faceted". The shape group stays hidden.
- **Old combos:** kept in `src/palettes.ts` as an unexposed list rather than
  deleted, so the old look can be restored.
- **References:** copied into `references/painterly/` from the Figma file
  (Forage, Section 1) at 1024 px.
- **Defaults** for the nine controls are tuned by eye against the source of truth.
- **Highlights** shows Shape, Size and Rim glints (the existing three controls).
- **Backdrop** is one slider that moves through arrangements of the wall and
  table planes (horizon height, plane tilt, how much the colours differ). Calm at
  every value.
- **Glow colour** comes from the combo (a warmer, more saturated version of the
  subject colour), not a separate picker.
- **Stem and leaf** get the same treatment as the body, with their own combo colours.

## Done when

- On load, side by side with the two source-of-truth images, the apple reads as
  the same family: calm shapes, glazed colour, a glowing rim, a clear coloured
  shadow, a quiet muted backdrop, no frame, soft light.
- Twenty presses of Randomize in a row produce no stroke clutter, no jagged shadow
  edges, no muddy colour and no missing shadows.
- Orbiting stays smooth, and the apple's marks travel with its surface rather
  than re-forming.
- `npm run build` passes and `CLAUDE.md` describes the new look.
