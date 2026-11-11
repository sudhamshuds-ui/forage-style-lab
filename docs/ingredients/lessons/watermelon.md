# Watermelon

Sources: commits df3dcef..03693ba, CLAUDE.md notes (2026-11-05 and 06), five rounds of the user's
feedback in a cloud session (recorded in those notes, not in the user's own words).

## Colour
- **Gradients between layers are one soft, wide wash** (watermelon).
  First try: separate bands, then crisp wet edges.
  Claude's note: the user preferred a soft gradient; crisp edges went too far. Ended on red to pink to cream to yellow-green to green in wide overlapping steps, with a generous, then slightly narrower, cream band (the user: blush from 0.66, cream from 0.8), painted from a map on the body (`melon` skin).
  Why: flesh fades into rind; bands with edges read as stripes of paint.
- **Juicy, not candy** (watermelon).
  Claude's note: the first melon family read candy-pink; it became a juicier coral-red, with big soft patches of deeper, riper red.
- **Translucent flesh glows in its shadows and thin places** (watermelon).
  Claude's note: glow soaks into the darker tones, more at thin places and where light comes through, and buried seeds show faintly when looking in. Kept on the red flesh only (orange glow on the green turned brown). Reusable for citrus.
- **Chalky pastel texture, measured along the surface** (watermelon).
  Claude's note: after the user's reference, dry-brush scratches along the fibres, red flecks and pale grains, spaced by arc length so they never bunch at the tip.
- **A highlight takes the surface's own colour on a different-coloured layer** (watermelon).
  Claude's note: the red-tinged highlight read as tan on the green rind (`highlightOwn`).

## Composition
- **Balance: every piece rests the way it really would** (watermelon).
  First try: the front wedge leaning on its curved rind.
  Claude's note: a wedge on its rind can only stand straight up; the front one now lies on a flat cut side, the back one stands behind and to the right.
  Why: a pose that could not happen reads as wrong even when nobody can say why.
- **A pair the cluster layout cannot make is built in the form** (watermelon).
  Claude's note: two bodies in one form, each resting on its own, both getting the hero's skin, highlight and contact spots.

## Form
- **Thicker than first guessed** (watermelon).
  Claude's note: the slices went from 3 to 4 cm thick.
- **Seeds: few, irregular, never a face** (watermelon).
  Claude's note: two or three a face, glossy beads half sunk in, never two above one.
- **Decision: the seeds only in the soft look** (watermelon).
  User said: "is it possible to not have the seeds in the water melon show up during paint mode? these black spots look like artifacts errors" (2026-11-11).
  Ended on: Playful strokes repaints the small dark beads as hard black blocks, so the seeds are left out in that look (the registry's `playfulHide: ['seeds']`; remove it to bring them back). The soft look keeps them.
- **Decision: no separate rind shell** (watermelon).
  Claude's note: its edge read as a hard ledge on the faces; the flesh's gradient runs on into the dark rind (`WITH_SHELL` in `forms/watermelon.ts` brings it back).

## Recurring errors
- **Contact spots only where a piece rests** (watermelon, baguette).
  Claude's note: measured as one shape, a spot landed under the rind's arch; spots now come per body, from its foot, sized to its width there.
- **Lifted skins flicker on tight curves** (watermelon, cheese).
  Claude's note: the rind flickered into the flesh as a sawtooth; lifted skins are drawn a hair in front of their body.
- **Rim glints draw coloured lines on pale or graded layers** (watermelon, sauce).
  Claude's note: a salmon line inside the rind; `rimGlints: false`.
