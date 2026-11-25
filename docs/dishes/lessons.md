# Dish lessons

What the user's reviews teach, so the same mistake is never made twice. Read before every batch.
Sorted by what the user reviews: overall beauty, composition and presentation, colours and
textures, glitches, form and cuts. Each lesson names the dish it came from.

Batch 1, first review: the user's notes on Figma (node 240:57, 2026-11-18), with their plating
sketches and reference photos.

## Overall beauty
- **Match the reference 1:1, dish by dish** (all six). The first showing read as "near the idea";
  the user compared each against its reference and a real photo. Build from the reference's
  composition, not a reinterpretation of it.

## Composition and presentation
- **Draw the plan first, in simple shapes, from above** (the user's rule, 2026-11-19), composed with
  symmetry, the golden ratio, big-medium-small and circular plating; build from its numbers. See
  the README's "Plan first".
- **Centre plating, big, medium, small** (salmon, then all: "use same plating approach as salmon
  dish. circular"). A round pool of the sauce in the middle; the hero (big) in it; the medium
  pieces round it; the small ones (thin wheels, berries, herbs) in clusters and scattered. The user
  draws the top view: follow it.
- **Sauce pooled under and drizzled over** (tomahawk, egg, drumsticks): a round pool, plus the
  same sauce running over the ingredients (the `drizzle` on a skin), so it looks spooned over.
- **Plate it to the sketch, measured** (salmon, 2026-11-19: "u can clearly see the difference...in
  sizes, rotation and placement"): read every piece's size and place off the user's top view,
  relative to the hero (along it and across it), and check the dish from straight above against
  the sketch before showing it. Garnish sits close round the hero, sized to the sketch (thin limes
  about 3.5 cm, peach wedges about 4 cm), cut faces turned toward the hero.
- **No ugly details** (salmon: the dark skin underneath "looks very ugly"): leave out real-world
  details that read badly in the painting.
- **No sauce on the salmon's top** (2026-11-19, a decision): a dollop of foam read as awkward, and a
  poured ribbon (`kit/pour.ts`) was worse ("no its worse, just remove the foam on top"). The seared
  top stays clear; the foam is the pool under it. The pour tool is kept for later.
- **Garnish never on the hero** (salmon: "never on top of salmon"): pieces lie next to or over
  each other and the hero, never on top of it (`clearOf`). Herbs go on last, over everything.
- **Toppings lie on their base gently** (rice bowl): the base level, not a peak with things perched
  on top; group each topping (half watermelon, half avocado).
- **Standing pieces at an angle** (drumsticks: "place all 3 chicken at an angle"), splayed outward,
  each standing on its own foot.

## Colours and textures
- **Seared, not charred** (salmon peaches, mushrooms: "not char grilled texture ... its a sear
  brownish edge texture", "needs to feel its seared not charred lines"). A seared cut face browns
  at its edges; a seared top is a golden crust with no raw marks showing through (the salmon's
  white fat lines read as raw). Grill bars only when asked.
- **Cooked colour is not raw colour** (salmon, 2026-11-19: "when cooked the body cannot be
  orange...thats raw...its more pinkish white"): a cooked ingredient gets a cooked family (pale
  coral pink for salmon), never the raw one. On a seared top the fat lines turn brown, deeper than
  the crust round them ("the white lines become brown"; a skin marks them with `searMark`).
- **A white plate is pristine** (salmon: "keep the plate white pristine clean", then "still not
  clear white it has some dirty texture"): porcelain white, no specks, and none of the shared
  paint grain either (on white it reads as dirt): the ceramic skin at a low amount lays the
  colour again from the light alone.
- **A seared crust is rough, never plastic** (salmon, 2026-11-19: "flat and glossy on top, it
  needs to be rough, bumby and not shine"): real lumps in the top (`crust` on the fillet), an
  embossed lumpy shading, darker crumbs in the pits, and the shine broken into small glints. Gently:
  half the first try's bumps was right ("too bumpy reduce a bit").
- **Crust follows the food**: golden on pale food (salmon, bread), deep brown on dark (beef); the
  sear picks its tone from the food's own colour.
- **Bones and white parts browned when cooked** (drumsticks: "white parts need browning and
  colour"): a roasted bone is golden tan, never raw white.
- **Cooked food looks cooked** (rice: "add some colour to the rice ... like its cooked"; tomato:
  "needs heavy deform to look its been cooked ... not raw"): warmer colours, slumped and wrinkled
  shapes.
- **Darker lacquer** (drumsticks): glazed meat is deep red-brown and glossy, with the glaze
  running in streaks.

## Glitches
- **Black faces on the user's Mac** (steak slices, strawberry slices, grapes, melon cubes): a part
  with no frame of its own gave the flesh skin a zero point; on Mac graphics cards its angle was
  "not a number" and painted black. My test renderer forgives it, so it never showed here. Fixed
  at the root (every dish part carries `ownPos`; tested in `dishes.test.ts`) and in the shader
  (`atan` nudged off zero). Never trust only the test renderer for new skin code.
- **Nothing levitating, nothing intersecting** (all): pieces are set down with the table's `rest`
  (a height map of everything plated; each piece tipped until it settles), never on "the highest
  point nearby". Checked from every side.
- **Melted cheese glitched** (baguette): a pool whose floor dropped away past the bread's edge made
  a curtain of jagged teeth. A sauce's floor must never fall away under it.

## Form and cuts
- **Match the cut to the reference** (peach: "need to be wedges"; avocado: the user's photo of a
  fanned half, D-shaped slices; garlic: "a cut bulb like the ref"; limes: "needs to be thinner").
- **Bread is a slice, not a turned tube** (baguette: "looks like a cylinder cut in half"): pressed
  and puffed out of round, toasted, the top resting right on the filling (no gap), the filling's
  layers showing at a cut end (build it whole, then cut through everything).
- **Cut from a smooth body** (peach wedges, 2026-11-19: "dont have these bumps showing in
  slices"): a whole fruit's signature (the peach's cleft, its deep stem dip) shows as dents and
  ridges once cut; slices come from a plain body (`peachBody(random, true)`).
- **Soft edges on cut fruit** (peach wedges, 2026-11-19: "all the edges are uniform and sharp"):
  a wedge is one smooth form with rounded edges (surface nets, its cuts blended with
  `roundedIntersection`), its cut faces caramelised darker at the rim, wet and glossy. One piece,
  one paint, like the watermelon: split into a skin piece and a flesh piece, the seam showed as a
  pale band and a fold ("avoid this for the edges...just have watermelon treatment"); its map runs
  from the stone to the rim and on over the skin, so the flesh fades into the skin.
- **Vary repeated pieces** (wedges: "need more variety in rotation"): each turned its own way, lying
  on either cut face, a little different in size.
- **Thick fillets** (salmon: "needs to be shaped proper"; then "it should be a fillet like this",
  with a watercolour of a cooked portion): a squarish block cut from the loin, its top nearly level
  with a soft groove, the belly only a little lower, well-rounded top edges, the fat's arcs on the
  cut end (`salmonFillet` with its own measurements, `COOKED_PORTION`). From the side (the user's
  sketch, 2026-11-19): a short end, the top rising in a long arc to a peak about 40% along, a long
  slope down to a thin tail (`along`); plated on a diagonal so that side shape reads.
- **Cooked salmon is pale** (2026-11-19: "more lighter whitish, research how salmon looks
  cooked"): cooking turns the translucent orange opaque, a light pink nearly white where lit,
  with paler fat lines; the crust fades into the sides over a wide uneven band, never a sudden
  change of colour.
- **Rounder knuckles** (drumsticks: "the bone ends need more rounded deform").
- **A cut face needs points inside it** (built into the knife, 2026-11-18). A face with points only
  round its edge left a lime wheel's flesh one flat green: the shading from the core to the peel
  had nothing in the middle to land on. The knife now fills a face with rings from its centre.
- **Never stack food on a height grid of its neighbours** (2026-11-18). Mushrooms and lime wheels
  set down on "whatever is highest nearby" rode up into the air; set food down on the plate and the
  sauce, and space the pieces so they do not meet.

## Batch 2, the composer (2026-11-19 to 22)
- A leaf's `lift` is a height in centimetres at a distance in centimetres: write it as a share of the
  leaf's length (`(d / length) ** 2`), or a 9 cm leaf rises 48 cm and stands up like a flag.
- A heap of cubes packed at less than its own width stacks into a tower when each is set down with
  `Table.rest`: space heap pieces at about 1.25 of their width.
- Garnish must be capped to its ware: a 9 cm avocado slice fits a dinner plate, not the 13 cm rice bowl.
- The painting has no see-through glass: anything clear standing above a drink reads as an opaque band.

## The references as source of truth, and real physics (2026-11-22)
- The user: "the generated refs have a real good plating ... right now it feels like just seperate
  ingredient pieces on the plate", "levitating, or intersecting or wierdly laying on top of
  eachother", "make the 2d plan to replicate the generated dish refs ... source of truth for
  everything". Every dish is now traced from its reference and plated by a physics engine (Rapier):
  each piece a solid of its convex outline, dropped layer by layer onto the one under it.
- Physics lessons: work in centimetres (in metres a strawberry is 0.03 and slips through the
  ground); build the ground as one grid of heights from the plate, sauce, leaves and rice, as an
  up-facing triangle mesh (the rice's own mesh had gaps, the engine's height field let detailed
  shapes through); spawn each piece above those already dropped, never inside them (the engine
  flings overlapping pieces); a layer is at rest only when every piece sleeps (a piece pausing at
  the top of a bounce is not at rest); hold settled pieces still so the next layer leans on them;
  food is sticky (high friction, strong roll damping), or berries and cubes roll off the rice.
- Second physics round (2026-11-23), from the renders: (1) a piece locked to fall straight down
  balances in poses no food holds (fried eggs and a steak stood on their edges): pieces now slide
  a little, heavily damped; (2) never trust the engine's "asleep" with heavy damping (a tipping
  piece moves slowly enough to be put to sleep mid-tip): a layer is at rest only after a quarter
  second of real stillness; (3) chunky pieces of one layer (cubes, florets, halves) are spread in
  the plan until their footprints just touch, or the drop stacks them into towers; flat pieces
  (slices, leaves) may still shingle; (4) leaves are draped, not dropped (a stiff curled leaf
  tumbles onto its edge like a card); (5) a piece that slips over the rim is plated again where
  the reference has it, set straight down, instead of being lost (the salmon cakes lost their
  salmon); (6) a piece on another sits higher in the painting, so its traced spot is moved forward
  by the height under it (the cheesecake's berries had landed behind the cake).
- The painting pass: plates and boards are props, so the card frames the food; full coloured
  shadows; every dish skin at a lighter touch (`PAINT_TOUCH`), so the watercolour bands carry the
  form as on the apple and the orange.

## Layers, fries and no garlic bulbs (2026-11-25)
- The user, on the steak frites: "in a dish like this, there is no need to show a bulb of garlic.
  never show garlic bulb anywhere from now onwards, it isnt appetizing. i feel there is a lot of
  empty space in dishes. when u have an element like fries (make them look like fries, thick cuts
  instead of these wedges. also make them golden brown bright) add a lot of them in a bunch to
  create volume"; "approach dishes in terms of layers ... first place the sauce pool, then place
  the cut pieces of steak (btw they need to be more saturated pink) then a bunch of fries next to
  it, then sprinkle some bits of yellow, golden and white shavings as garnish, then some herb
  garnish ... Do this for every dish as a process."
- Done: every garlic bulb (22 in the traced dishes, one on the tomahawk) is now a scatter of crisp
  golden garlic chips; the steak frites has about 33 thick-cut fries piled in two layers; the
  steak is a saturated pink with a thinner crust; every plated dish without a sauce in its
  reference gets a pool under its food; every dish but the drinks ends with 40 to 50 shavings
  (golden, yellow, white) and 18 chopped herbs over and round its food; roast potatoes sear
  golden, not brown.
- Lesson: an empty plate reads as "not food". Fill it with layers (sauce, hero, a generous bunch,
  shavings, herbs) before adding more big elements.

