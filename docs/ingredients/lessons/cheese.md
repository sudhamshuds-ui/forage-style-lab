# Cheese

Sources: commits 5d3bfcd, 925eac0, CLAUDE.md notes (2026-11-05). Built in a cloud session; the
user's feedback is recorded in those notes.

## Colour
- **Pale ingredients take less of the shadow's violet and pink** (cheese, butter, watermelon).
  Claude's note: on the pale yellow, the shadow's violet and pink patches read as pink stains; `shadowTint` scales them per ingredient (cheese 0.35, butter 0.4, melon 0.3).
  Why: coloured shadows must stay in the ingredient's own temperature.
- **A cheese yellow is buttery, not lemon** (cheese).
  Claude's note: board 08 says Yellow, but the lemon's yellow read acidic; the `cheese` family is paler and buttery with a warm caramel shadow.

## Composition
- **Point toward the front, the long face to the light** (cheese).
  Claude's note: turned 50 so the point comes toward the front left.

## Form
- **A rind is part of the same surface, never a separate slab** (cheese).
  First try: a separate rind slab on the back.
  Claude's note: the user said it looked like a cushion stuck on the back.
  Ended on: the back of the cheese's own surface lifted off as a thin skin (`liftRegion`).
  Why: a seam between two pieces reads as assembled, not grown.
- **Holes are deep, with an overhanging rim** (cheese).
  Claude's note: shallow dishes read as pale spots; a bubble centred a little under the face opens as a real hole with a shadowed inside.
- **Never machine-perfect** (cheese).
  Claude's note: round bites on the edges and a very gentle wobble in the faces, so the outline is never ruler-straight.

## Recurring errors
- **Bevels on a meshed form must span about two grid cells** (cheese).
  Claude's note: narrower bevels came out saw-toothed; `relaxOnSurface` keeps long angled edges clean.
