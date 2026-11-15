# Cabbage

Sources: commits on `claude/loving-gauss-efvivl` and `r3-batch-1` (2026-11-14 to 2026-11-15), the
user's watercolour references (Figma node 183:289), `docs/ingredients/batch-0-feedback.md`. Round 2's
last leafy ingredient, replacing the napa cabbage first tried. Approved: "FULL PERFECT GOOD JOB".

## Colour
- **Never flat colour: several hues of the ingredient's own colour, a bit dramatic** (cabbage).
  First try: a pale green head and deeper green wrappers, two greens in all.
  User said: "the colours just look flat 2 greens", "add more colour gradient or variation (keep this in mind for next ones too)", "make it a bit dramatic, add colours, add some colours to the shadows".
  Ended on: warm lime blooms where lit, cooler blue-green blooms deeper in, a gradient along each leaf from pale rib to green edge, violet-teal in the shadows (`depthWash` in the skin).
  Why: it is a painting; a real watercolour never fills a shape with one colour. This is now a project rule.

## Composition
- **One solo head, upright, its loose wrapper leaves opening toward the camera** (cabbage).
  Claude's note: after the user's watercolours; the wrappers frame the tight head.

## Form
- **A head of leaves is made of real leaves all the way in, never a ball with leaves round it** (cabbage).
  First try: a smooth ball for the heart with jagged leaves round it.
  User said: "i can see the leaves are jagged, and the centre is just a ball instead of leaves".
  Ended on: every leaf a real leaf laid on a height map of the ball (`cover` in `forms/cabbage.ts`): seven head leaves, each resting on the ones before, and six round-topped wrappers in two rings.
  Why: the overlapping leaf edges on the head are what make it read as cabbage.
- **Leaf edges are smooth and round-topped** (cabbage, romaine).
  Claude's note: the same lesson as the romaine's "smooth, never jagged"; gentle ruffles only.

## Recurring errors
- **One shader holding every skin grew too large** (cabbage and the batch).
  Claude's note: the user's browser lost its graphics while viewing the batch. Each material now holds only its own skin (`SKIN_KIND`). Not proven to be the cause; keep shaders small.
