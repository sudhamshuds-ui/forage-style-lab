# Design rules (taste)

Rules learned from the user's corrections, each with its reason. Read the section that matches the
work before building. Ingredient rules live in the ingredient guide
(`docs/ingredients/forage-ingredient/SKILL.md`); this file holds the dish rules, learned on the
salmon dish (2026-11-18 and 19), which took eleven rounds of notes to get right. The full story is
in `docs/dishes/lessons.md`.

## Dishes: the three QA passes (every round, every dish)

The user, 2026-11-22, after the first showing of the hundred composed dishes. Run all three before
showing any dish, and say what each found.
<!-- 2026-11-22: "DO a QA pass for this everytime" (three times, one per note) -->

1. **Cohesion: a dish, not pieces on a plate.** Follow the plating of the generated references
   (Figma "Dish refs (generated)"): the food gathered into one shape, pieces touching, leaning on
   and tucked into each other, overlapping where food naturally overlaps; never a ring of separate
   pieces with plate showing between them. Check: no piece stands apart from its nearest neighbour,
   and the food sits close round the middle, never spread out to the rim.
   Why: "the generated refs have a real good plating, it feels cohesive ... right now it feels like
   just seperate ingredient pieces on the plate...not like a dish. the elements are a lot of times
   too far apart on the plate."
2. **Physics: real-world rest.** Every piece is held up by what is under it and rests where its
   centre of gravity is supported; nothing floats, nothing passes through anything, nothing lies on
   top of another piece in a way it could not stay. Check: every piece touches what holds it, no
   two pieces overlap in volume, everything has come to rest.
   Why: "a lot of elements are not placed correctly in the dish, they are levitating, or
   intersecting or wierdly laying on top of eachother. the dish should obey real world physics and
   centre of gravity."
3. **Painting: the pantry's watercolour.** A dish is painted like the normal-mode ingredients (the
   apple, the orange): a vibrant, washed watercolour, calm shapes of colour, soft glows; not
   realistic surface texture. Check side by side with the apple and the orange in normal mode.
   Why: "we have steered very far in the opposite direction in terms of painting aesthetic ... it
   should feel like a vibrant, washed watercolour painting. sometimes adding too realistic textures
   doesnt make it look like a painting."

## Dishes: composition

- **The generated reference is the source of truth for everything: shapes, form, plating, colours,
  composition.** Each dish's plan is traced from its reference (docs/dishes/refs/{id}.jpg, read
  through a grid: `compose/traces.ts`, `compose/trace.ts`): every piece where its foot sits in the
  picture, its real size, its turn, in layers bottom first (salmon folds on the rosti, onion on
  top). Colours are sampled from the reference (`scripts/sample-ref-colours.py`), each piece
  within its own outline and only where nothing lies over it, and kept only when they agree with
  the ingredient's own colour; the room is the reference's wall and table.
  Why: "make the 2d plan to replicate the generated dish refs. they are perfect, use them as source
  of truth for everything, shapes, form, plating, coulours, composition".
  <!-- 2026-11-22 -->
- **Draw every dish first, from straight above, in simple shapes, and build it from those numbers.**
  A `Plan` (`src/dishes/kit/plan.ts`): circles for pools, wheels and berries, rectangles for
  fillets and slabs, half circles for wedges, each tagged big, medium or small. Composed with
  symmetry (balanced, never mirror-even), the golden ratio (the hero off centre near the circle at
  the plate's radius over phi; groups split about 62 to 38), big-medium-small, and circular plating
  (a round base, the rest ringing the hero). The 3D dish reads its positions from the plan.
  Why: the user's own rule: "always make a 2d drawing of the dish, its composition and plating first
  from top view...using basic forms/shapes.. and then recreate it using the elements".
  <!-- 2026-11-19: "always make a 2d drawing of the dish ... use theory of symmetry, golden ratio, BMS, circular plating to improve compositions" -->
  Check: `src/dishes/plans.test.ts` fails if a dish has no plan or a plan leaves the plate.
- **Match the plan's sizes, turns and places exactly; check from straight above.** Garnish sits close
  round the hero, never far out at the rim.
  Why: the user compared a top view of the dish with their sketch: "u can clearly see the
  difference...in sizes, rotation and placement of the elements".
  <!-- 2026-11-19 -->
- **Garnish is smaller than you think: thin lime wheels about 3.5 cm across, peach wedges about 4 cm,
  against a 13 cm hero.** Big, medium and small must differ clearly in size.
  Why: the first plating had garnish nearly the hero's size and read as a pile, not a plate.
  <!-- 2026-11-19: sizes, from the user's sketch -->
- **Nothing on top of the hero but its own crust: no dollops, no poured ribbons.** Sauce goes in a
  round pool under it.
  Why: "never on top of salmon"; a foam dollop was "awkward" and a poured ribbon "worse ... just
  remove the foam on top".
  <!-- 2026-11-18, 2026-11-19 -->
- **Repeated pieces vary: each turned its own way, lying on either cut face, a little different in
  size.**
  Why: "need more variety in rotation on these wedges".
  <!-- 2026-11-19 -->
- **Nothing floats and nothing passes through anything.** Pieces are set down with `Table.rest`
  (they settle onto what is under them) and kept beside the hero with `clearOf`.
  Why: "make sure no intersections and levitating objects" (repeated on every dish).
  <!-- 2026-11-18 -->

## Dishes: form

- **A cooked hero takes the cooked form of the reference, not the raw pantry form.** The salmon is
  a thick squarish portion (13 x 6 x 3 cm, rounded top edges), from the side a short end rising
  in a long arc to a peak about 40% along and tapering to a thin tail; not the long thin raw fillet.
  Why: "the salmon shape/form is wrong. it should be a fillet like this", with a watercolour and a
  side sketch.
  <!-- 2026-11-19 -->
- **Cut fruit comes from a smooth body.** A whole fruit's signature (a peach's cleft, its stem dip)
  shows as dents in every slice; cut pieces use the plain body (`peachBody(random, true)`).
  Why: "dont have these bumps showing in slices".
  <!-- 2026-11-19 -->
- **Cut pieces have soft, rounded edges, never knife-sharp.** Build a wedge as one distance field
  with its cuts blended (`roundedIntersection`), meshed with surface nets.
  Why: "all the edges are uniform and sharp", with a photo of caramelised peach wedges.
  <!-- 2026-11-19 -->
- **Thin slices are thin** (a lime wheel 2 mm).
  Why: "lime slices needs to be thinner in thickness".
  <!-- 2026-11-18 -->
- **Leave out details that read badly in paint**, even when real (the salmon's dark skin).
  Why: "can we get rid of the salmon black skin underneath, looks very ugly".
  <!-- 2026-11-19 -->

## Dishes: colour and texture

- **Cooked food gets a cooked family, never the raw one.** Cooked salmon is a pale pink nearly white
  where lit (`cooked-salmon`), never raw orange.
  Why: "when cooked the body cannot be orange...thats raw...its more pinkish white"; "more lighter
  whitish, research how salmon looks cooked".
  <!-- 2026-11-19 -->
- **A seared crust is golden brown, rough, bumpy and matte.** The raw marks under it (the salmon's
  fat lines) turn a deeper brown, never white; the surface has real low lumps (`crust` about 0.07
  cm), an embossed lumpy shading, darker crumbs in the pits, and its shine broken into small
  glints. Gently: twice the bumps was "too bumpy".
  Why: "the white lines become brown"; "flat and glossy on top, it needs to be rough, bumby and not
  shine like plastic"; "crust is too bumpy reduce a bit".
  <!-- 2026-11-19 -->
- **A crust fades into the sides over a wide band, never a sudden change of colour.**
  Why: "the top part should blend in gradually with the body, there is a sudden shift in colour".
  <!-- 2026-11-19 -->
- **Seared, not charred: browning at the edges of a cut face, no grill bars unless asked.**
  Why: "not char grilled texture, see ref...its a sear brownish edge texture".
  <!-- 2026-11-18 -->
- **One piece, one paint where skin meets flesh** (the watermelon treatment): the colour fades from
  flesh to skin across the rounded edge; never two pieces meeting at a seam.
  Why: a skin piece and a flesh piece showed a pale band and a fold: "avoid this for the
  edges...just have watermelon treatement texture".
  <!-- 2026-11-19 -->
- **White plates are pristine: clean porcelain, no specks and no shared paint grain.**
  The ceramic skin at a low amount lays the colour from the light alone.
  Why: "keep the plate white pristine clean"; "plate is still not clear white it has some dirty
  texture".
  <!-- 2026-11-19 -->
  Check: `src/dishes/dishes.test.ts` fails if a dish's plate uses a speckled ceramic amount on the
  `porcelain` family.
