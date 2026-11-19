# The dish converter (planned with the user, 2026-11-19)

A tool that turns a dish painting (the Figma references, node 214:8) into a 3D dish you can turn
all the way round, as a **3D reference** for building the dish in code.

## What the user chose
- **1:1 means both**: the same pieces, sizes and layout as the painting, *and* the painting's own
  colours, painted by our shaders with the live light (the light stays in the room as it turns).
- **All the way round**: 360 degrees. The back is completed as the real food would be.
- **No outside AI, ever**, not even models that run in the browser (no depth model, no Segment
  Anything). Everything is measured by hand on the page and built in code.
- **A 3D reference**: the converted dish is for checking plating from any angle; the dishes in the
  kitchen are still built in code to match it.

## How it works (five steps)
1. **Match the camera** (like fSpy): click points round the plate's rim in the painting. A plate is
   a circle of a known size (the dinner plate, 27 cm), so the squash of its oval gives where the
   painter's camera stood: height, tilt, distance. The lens (field of view) is a slider, since one
   circle cannot tell lens and distance apart; the pieces' footprints help judge it.
2. **Trace the pieces** (masks on a layer): an outline for each piece (the salmon, each peach wedge,
   each lime wheel, the foam pool), tagged with its pantry ingredient and its size (big, medium,
   small, ground). Claude drafts them from the painting; the user drags the points to fix them.
3. **Build the blockout**: each outline's foot, projected through the matched camera onto the
   plate, gives the piece's real place, size and turn in cm. That fills the dish's `Plan`
   (`src/dishes/kit/plan.ts`) with measured numbers, and the dish kit builds it.
4. **Paint it from the painting** (camera projection): the painting is projected through the
   matched camera onto the built pieces; only its hue and saturation are kept, the light comes
   from our shader. Sides the painting never saw take the piece's own skin, tinted to the colours
   sampled from it.
5. **The viewer**: the painting and the 3D dish side by side, a full orbit, "Match view" (snaps to
   the painter's camera), and an onion skin slider (the painting faded over the 3D).

## Where it lives
`converter.html` and `src/converter/` (its own page, like the kitchen; built with
`vite.converter.config.ts`). The reference paintings are in `references/dishes/`. The outlines and
camera of each dish are saved in `src/converter/traces/{dish}.ts`.

## Rounds
- **Round 1 (salmon, steps 1 and 2; built 2026-11-19, waiting for the user's look)**: camera match from the plate's rim, the drafted outlines,
  their footprints on the plate in 3D, the measured plan next to the hand-built plan, and the
  current hand-built salmon dish seen through the painter's camera, faded over the painting, to
  show where it differs.
- Next: steps 3 to 5 for the salmon, then batch 1's other five, then batch 2.
