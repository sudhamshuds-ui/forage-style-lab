# Romaine

Sources: commits on branch `romaine` (2026-11-13 to 2026-11-14, ten rounds), the user's references
(a head lying on its side with its cut base showing, a painted head, a watercolour with mottled savoy
cells, a watercolour romaine with a broad pale rib, a napa cabbage close-up), their drawn outline on
a screenshot, and notes in a cloud session. The second leafy ingredient.

## Colour
- **A pale rib blends into a green blade, never in blocks** (romaine).
  First try: the colour was painted from each leaf's own map, which jumps where one leaf hands over to the next: pale and green met in hard steps.
  Ended on: the colour map worked out in the form and blended over the mesh, so pale ribs, the white base and the green top fade into each other.
  Why: the texture follows the leaves, but the colour must flow across them like wet paint (the no crisp lines rule).
- **Veins like the references, not a pattern of cells** (romaine).
  First try: Voronoi cells. User said: "the texture isnt right" (they read as stone paving). Then soft mottling and noise veins; user said: "can u add more veiny texture like the refs?".
  Ended on: veins drawn on each leaf from its own map (a `leafMap` attribute): side veins branching diagonally from the midrib toward tip and edge, wavering, finer veins between, soft puckers between them, over soft mottled washes.
- **A crinkle texture was tried and taken out** (romaine, a decision).
  User said: "can we get this sort of texture too" (a napa close-up), then "previous texture was better". The crinkle ridges are in history (round 8); napa cabbage may want them.
- **Subsurface on thin leaves** (romaine).
  User said: "and some subsurface".
  Ended on: a warm band at the turn into shadow, a glow on thin edges and with light from behind, a little warmth in the shadow side.
- **A cut face is clean and light** (romaine).
  First try: wavy grey-brown rings. User said: "this is ugly", with their reference.
  Ended on: a warm cream disc, the faintest rings, a thin pale-gold ring near its edge, the pale leaf bases round it.
  Why: a cut face is the freshest, palest part; busy dark rings read as rot.

## Composition
- **One solo head on its side, cut base to the front** (romaine).
  Claude's note: the user's first reference; the base shows the cut disc from the starting view.

## Form
- **A head: a blended inner head with separate outer leaves wrapped round it** (romaine, a decision).
  First try: the whole head as one blended surface (the kit kept for "romaine and cabbage"). User said: "it looks like a log tree trunk now", then "try the separate outer leaves approach".
  Ended on: the inner head as one blended surface pulled in, seven real outer leaves round it (thick along the rib, thin at the edge, narrow at the base, a round tip, the top flaring with soft ruffles), laid like shingles so where two overlap one is always on top.
  Why: blending smooths away the leaf edges that make a head read as leaves.
- **The size from the user's outline, the body round** (romaine).
  User said: "make it less [thick] its very thick now" (with a drawn outline), "the size is perfect", and later "liked the rounded shape here" (round 4's profile, brought back).
  Ended on: a small rounded base widening gently, fullest near the top, about 27 x 7.7 x 8.9 cm.
- **Leaves fold over the end, never a bare bulge** (romaine).
  User said: "have leaves fill this rather than plain bulge".
  Ended on: the inner core stops short of the top and the heart's leaves fold in over the end.
- **Smooth, never jagged** (romaine).
  User said: "it still looks very jagged and rough and edgy, make it more leafy".
  Ended on: shrink-free smoothing after meshing (`smoothRounds` in `kit/leafMass.ts`), a finer grid, barely lobed outlines, gentle ruffles.

## Recurring errors
- **Gaps between leaves showing a lower layer as a pit or a flake** (romaine).
  User said: "edges still not blended", "fix the striped base".
  Claude's note: pits on top where outer leaves left a gap; pale flakes and dark notches where inner leaves' edges showed between the outer ones near the base; cut-off leaf ends as stripes round the base. Fixed by covering (more and wider outer leaves), tucking leaf bases into the head, and keeping crevice shading off the pale parts. Check every side and close up near the base.
- **A shader varying declared twice** (romaine).
  Claude's note: the whole ingredient rendered grey; when adding a varying, check it is declared once in each shader.
