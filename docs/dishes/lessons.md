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
