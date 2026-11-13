---
name: forage-ingredient
description: Use when building, speccing or reviewing a Forage ingredient: writing its YAML spec, building its smooth real-size form in code for the Style Lab, checking it against the Forage style and adding it to the registry.
---

# Forage ingredient

Forage is a cooking discovery web game. Every ingredient is a 3D form painted by the Forage Style Lab shader into a soft-light gouache card. This skill turns one ingredient spec into a smooth, real-size **form built in code** and a registry entry.

Source of truth for the art direction: the Figma page "Ingredient guidelines" in https://www.figma.com/design/537QrQ0QsVjcT4u3st7M20/Forage (boards 01 to 10). Read it with the Figma MCP when something here is unclear.

The person you work with is a motion and visual designer who is new to code. Explain each step simply, with design analogies. Never use em dashes in any copy you write.

## The bar (the user's brief, for every ingredient)

The user's words for the chicken drumstick, approved on its first round ("drumstick is perfect"),
and asked to be remembered every time: "Please lets try to get it right this time. avoid making
the same mistakes. follow the guidelines and the get the form, colours, textures, shadows right
without glitching, artifacts, evident hard edges or not blended regions. make sure it has ample
amount of detail as well, and is consistent in style with the rest of the ingredients."

Every new ingredient is held to all of it before the user sees it:

1. **Get it right the first time**: read this whole guide, the lessons records of the ingredients
   closest to it (same archetype, family or material) and the board 08 card before writing code.
2. **Avoid the same mistakes**: go through "Recurring errors" and the pre-check list, and design
   them out up front (no rim glints on narrow tubes, flush contacts, contact spots only where it
   touches, no crisp lines inside, a quick build).
3. **Follow the guidelines**: the split, the style rules, the families, real size, the framing.
4. **Form, colours, textures, shadows**, each right on its own: a believable, aesthetic form; the
   ingredient's own colours (a new family if the board's is wrong for it); its own skin texture;
   shadows that shift hue and sit flush.
5. **No glitching or artifacts**: no spikes, flicker, dashed lines, slivers, seams or halos, from
   any side, in both looks (the soft look and Playful strokes).
6. **No evident hard edges, no unblended regions**: every change of colour inside the ingredient
   fades over a soft, wandering band; parts that meet (meat and bone) meet in similar colours.
7. **Ample detail**: the signature features in the form (seams, lobes, folds, ridges, knobs, all
   gentle) and a rich painted surface (texture in loose patches, what shows through, blotches,
   the shared chalky texture), never a plain smooth blob.
8. **Consistent in style** with the other ingredients: compare it beside one or two of them in
   the same view before showing it.

How the drumstick met it (the working method): read first, build, then look from the starting
view, eight sides, above and low down, in both looks, zoomed in on the outline and on every
contact; fix what shows, including shared bugs (fix them for every ingredient, then compare every
ingredient before and after so nothing else moves); run the tests; only then show the user.

## The split (most important rule)

- **Code builds the form.** Smooth, clean, real-size pieces, written as TypeScript that builds Three.js geometry. No colours, textures, lights or cameras.
- **The Style Lab paints the look.** Colour, light, edges, glaze, grain, highlights and framing all come from the shader.
- **The Style Lab arranges layouts.** Forms are pieces; clusters and whole-and-cut pairs are arranged from the spec's `layout` field.

If a request would put look into the form (painted colours, baked shadows, gloss, sculpted micro detail, facets), stop and move it to the spec or the shader instead.

No Blender and no model files by default. Blender through MCP is only a fallback (see the end).

## Style rules every ingredient follows

1. Shapes first, 70/30: calm tone shapes, marks only where the form turns. Build smooth, rounded forms; keep flat planes only where the real thing has them (cut face, crust, cheese wedge). **No facets**: not in the form, not as a shader option.
2. Shadows shift hue, never grey (shader).
3. Edge hierarchy: crisp lit side, lost shadow side. Give real hard edges a small rounded bevel so they catch a line.
4. Glow at thin edges: mark translucent parts with `:glow` in the spec (`flesh:glow`); the piece is named `flesh_glow`.
5. Cast shadow is a clear shape: the form must sit flat on the table at y = 0.
6. Soft, broken highlights (shader). Forms carry no gloss.

7. **No crisp lines** (the user, 2026-11-10): where colours meet inside an ingredient (fat and meat, flesh and rind, seams, veins, bands), the edge fades over a soft band like wet paint. Crisp edges only in a few deliberate, niche places: the lit side of the outline, the cast shadow's edge, printed artwork (a label).
8. **Warm highlights, cool shadows, always** (the user, 2026-11-12): light and its glow lean warm (coral, gold, cream), shadows lean cool (violet, plum, indigo, blue-green), never grey and never the same hue as the light. Check every new family and skin against it.

Never: ink outlines, a white void, candy sun-blasted rooms, uniform stroke clutter.

References come in four paint families. Only family A (soft-light gouache) decides the paint. Families B (impasto oil), C (watercolour on white) and D (inked illustration) are for form, cut and grouping only. Reference files are named with the letter, e.g. `lemon_C_half-cut.png`.

## The spec

Each ingredient lives in `ingredients/{id}.yaml`:

```yaml
id: lemon
name: Lemon
archetype: round            # picks the kit recipe and default layout
family: yellow              # picks five colours + room combo
layout: whole-and-cut       # solo | whole-and-cut | cluster-2 | cluster-3
show: one whole lemon behind, one half in front, cut face tilted up toward the light
forms: [whole, half, wedge, slice, zest]   # Tool 02 states
scale: M                    # XS | S | M | L
size_cm: [7, 5, 5]
parts: [peel, flesh:glow, pith, seeds]
light_case: cut-juicy       # optional: cut-juicy | wet | pale | dark | group | whole-next-to-cut
refs:
  paint: family-A
  form: references/lemon/lemon_C_half-cut.png
notes: pointed tip at both ends. Pebbled peel is a shader texture, never geometry.
```

If a field is missing, propose a value and ask before building. All meat and fish are raw. A part that needs a different colour family from the body (watermelon rind, steak fat) names it: `parts: [flesh:glow, rind@green]`.

## Colour families (map to the Style Lab's Colour values: lit, base, shadow, glow, highlight)

The live values are in `src/ingredients/families.ts` (the source of truth; this table is kept in step with it). Board 04 holds the first six; the rest were added while building ingredients and are waiting to be added to the board.

**Whole-ingredient families** (each suggests rooms, first one is used when the ingredient comes on stage):

| family | lit | base | shadow | glow | highlight | rooms | used by |
|---|---|---|---|---|---|---|---|
| red | #f78e64 | #ce5249 | #843d56 | #ed6531 | #f5e5d3 | Linen, Heather | apple |
| crimson | #f4766a | #cf2c44 | #7a1e4b | #f2544a | #fbe1dc | Sage morning, Linen | strawberry (off-board) |
| orange | #ffb36b | #f0812f | #b0484a | #ff9a2e | #fff0d9 | Overcast, Dusk | orange |
| yellow | #fff0a3 | #f2c94c | #b0866a | #ffc94a | #fffbe8 | Dusk, Seafoam | lemon |
| green | #c8de8a | #73a24c | #3c6f66 | #b5d65a | #eef5d8 | Heather, Linen | broccoli |
| cream-crust | #fbe6c4 | #e0ad73 | #9a6a63 | #f2b45e | #fff6e6 | Sage morning, Overcast | |
| baked | #f8c98c | #df8a47 | #94443a | #ee7b34 | #fff0d8 | Celadon, Sage morning | baguette (off-board) |
| sauce | #cf4a3e | #8e1b2b | #4c1534 | #e8452f | #f8d9d2 | Spruce, Linen | hot sauce (off-board) |
| cheese | #fff1bf | #f3d273 | #c48a45 | #ffbf4a | #fffaf0 | Mist, Seafoam | cheese (off-board; board 08 says Yellow, which read acidic) |
| butter | #fff7d2 | #f6e092 | #d4b08f | #ffcf66 | #fffdf2 | Lavender, Heather | butter (off-board; board 08 says Yellow, kept apart from the cheese) |
| melon | #ff8f74 | #e4473d | #962f45 | #ff6e4f | #ffe6dc | Seafoam, Sage morning | watermelon flesh (off-board; board 08 says Red, the apple's red is a skin) |
| beef | #ee7a6e | #bd3540 | #741f3c | #e64a43 | #fbe0dc | Iris, Seafoam | steak (off-board; deeper than Pink and raw) |
| onion | #d79ad3 | #9a3f92 | #4a2164 | #c24ea6 | #f5e4f4 | Celadon, Sage morning | red onion (off-board; magenta-violet, from the user's watercolour) |
| pepper | #ffae5e | #f2761a | #a8462c | #ff8726 | #fff2df | Seafoam, Spruce | orange pepper (off-board; purer and redder than the orange's) |
| avocado | #90b653 | #46762f | #2d3f5c | #7fa83a | #e6efcf | Iris, Thistle | avocado (off-board; deep leaf green, indigo shadows; the cut flesh is painted by its skin) |
| grape | #e86f78 | #a8304f | #4c2358 | #e8504a | #f8e2ea | Spruce, Mist | red grapes (off-board; coral to deep wine-violet, each berry its own mix) |
| blueberry | #7f9ad8 | #2f4c98 | #2a2b60 | #5a4f9e | #f7eedf | Apricot | blueberries (off-board; dusty cobalt, the first cool subject) |
| spinach | #80b44f | #2f6b2f | #1f4552 | #86b843 | #f2f1d4 | Lavender, Heather | spinach (off-board; a deep fresh leaf green, lime where thin and lit, blue-green shadows) |
| poultry | #fde5d6 | #f2bca3 | #ad6676 | #f49a7c | #fff6ef | Thistle, Seafoam | chicken (off-board; board 08 says Pink and raw, a deep salmon; raw skin is far paler) |
| pink-raw | #f6a493 | #d4544f | #8c3150 | #ff7a66 | #fbe4dc | Seafoam, Sage morning | |

**Part-only families** (never a whole ingredient, no rooms; a part names one with `@`, e.g. `stem@stalk`):

| family | lit | base | shadow | glow | highlight | for |
|---|---|---|---|---|---|---|
| stalk | #9a9a55 | #66693a | #4f3d45 | #8f9a45 | #b9b78f | woody stems |
| leaf | #8fb35a | #4f8a3c | #1f5a57 | #9cc94a | #d9e8b0 | sepals, small leaves |
| pale-green | #e2ebb4 | #b4c983 | #5e8a78 | #cfe08f | #f3f7e0 | broccoli and cauliflower stalks |
| crumb | #fcf3df | #f1ddb6 | #c3a184 | #f7dca4 | #fffaf0 | bread crumb |
| glass | #f4eff3 | #ddd3de | #97849a | #f1e6ee | #ffffff | clear glass (a bottle's base) |
| paper | #fdf6e6 | #efe2c6 | #b99f88 | #f6e5c2 | #fffbf3 | labels, wrappers, label ink |
| chili | #f2875a | #d6532f | #8a2f3a | #f26a3a | #fde2d0 | a hot sauce label's ground |
| gold | #f2d688 | #d2a64a | #8c5a3a | #f0c25a | #fff6d8 | printed gold |
| ink | #6e3b4c | #45222f | #2e1523 | #7a3a4a | #8f6070 | lettering (deep plum, never black) |
| rind | #fde5a4 | #eabd66 | #ae7a52 | #f6c25a | #fff6e0 | a cheese's rind |
| bone | #f8eedb | #e6d0aa | #a98a70 | #f0d6a8 | #fffaf0 | a rib bone (ivory to warm tan, never grey) |
| papery | #f4dfc6 | #dcb895 | #9c7268 | #ebbd8e | #fff5e8 | an onion's dry tip, root tuft and outer skin; later garlic |
| fat | #fbe4da | #eec6ba | #bf8f96 | #f6c0ae | #fff6f2 | raw fat: the steak's fat rim, seams and marbling are painted in its lit colour (no fat piece) |
| vine | #d8b45e | #a37f35 | #5a4a3c | #c99a3e | #f3e3b8 | a grape bunch's woody stem (golden ochre); later vines, tomato trusses |
| pit | #dc8752 | #a04f29 | #512b4a | #cc632f | #fde6cc | an avocado's pit (glossy chestnut, plum shadow); later nuts |
| parchment | #fdfbf6 | #efebe4 | #c4bccf | #f4ecdc | #ffffff | a butter wrapper, baking parchment (whiter and cooler than `paper`) |

**A cool subject gets a warm room** (blueberries, 2026-11-12): the rooms complement the subject, so a blue subject opens in Apricot, the first warm room (`warm: true` in `src/palettes.ts`; the room tests check warm rooms against a blue subject).

**Rooms may repeat, with care** (the user, 2026-11-11): the first twelve ingredients each open in their own room; from round 2 a room may be reused, but never on two ingredients that look alike, and never twice in a row in Shuffle. Most ingredients are warm, so the rule allows only teal-greens and blues to lilacs (twelve soft rooms in `src/palettes.ts`).

Colours live in data (the registry), never in the form. Shadows always shift hue (never grey or near black). A whole-ingredient family needs five colours and rooms **70 to 180 degrees** away on the colour wheel (board 04 says 70 to 150, but its own pairings go further; kept by choice, tested in `registry.test.ts`).

## The form kit (one recipe per archetype)

Forms are built from a shared kit in `src/ingredients/forms/kit/`. Create a kit tool the first time an archetype needs it; reuse it after that. Never build a form from scratch when a kit recipe fits. What is built so far:

| archetype | built | kit tools | default layout | budget |
|---|---|---|---|---|
| round | apple, lemon, orange, red onion, orange pepper, avocado, (loaf) | `lathe.ts` (a profile spun round an axis), `round.ts` (lopsided, flat base, lying or upright, a dimple at either or both poles), `stemLeaf.ts` (stem, calyx, leaf); a **cut half** is a lathe whose profile rounds off into a flat face over a small bevel, its map telling the shader how far in from the rim (onion); a **lengthwise half** is a lathe whose cross-section is a half disc with rounded corners, then pulled onto the shape with the cut rounded all the way round (`roundedIntersection` + `relaxOnSurface`), its face map fading by the final normals (avocado) | solo or whole-and-cut | 2k to 6k |
| small | strawberry, red grapes, blueberries | one master form, seeded variants, `layout.ts` arranges cluster-2 and cluster-3; **a bunch** (grapes): many pieces on a branching stem, settled by a drop-and-nudge pass (gravity, the table, each piece within reach of its stalk, pushed apart by each oval's true outline), merged into one piece with a per-piece map value; the settle is `kit/settle.ts` (shared); **a pile** (blueberries): dropped, drawn toward its middle, two strays close by, and **balanced** (each raised piece held from below on every side, `isHeld`; a piece is tucked in under a shaky one) | cluster-3, or solo for a bunch or pile | 1k to 3k each (grapes 22k, blueberries 30k) |
| long | baguette, chicken | `sweep.ts` (a tube along a curve, optional ribbed section); for a drumstick, a distance field built along an axis (a radius profile with a smooth fillet, a shaped cross-section) meshed with `surfaceNets` and `relaxOnSurface`, the bone and knuckle a second piece, then tipped until both ends rest on the table | solo, on a diagonal | 2k to 5k (baguette has its own 9k, chicken 18k) |
| branching | broccoli | `crown.ts` (blobs blended as a distance field), `surfaceNets.ts` (distance field to clean mesh), `sweep.ts` for stalks | solo | 6k to 18k (raised from 12k for a bumpier crown) |
| wedge | cheese, watermelon | `wedge.ts` (a slice of a wheel as a distance field, `roundedIntersection` for bevelled edges), meshed with `surfaceNets`, smoothed with `relaxOnSurface`, rind lifted off with `liftRegion` | solo | 2k to 5k (cheese has its own 10k) |
| contained | hot sauce | `vessel.ts`: `revolve` (a profile spun standing up, with a `roundedSquare` or `ribs` cross-section), `wrapSheet` (a sheet hugging a vessel: labels, rectangles or ovals, `mapped` for printed artwork) | solo | vessel + 1k (sauce has its own 16k) |
| block | butter, steak | `block.ts`: `blockSides` (a box as distances, rounded with `roundedIntersection`, meshed with `surfaceNets` and `relaxOnSurface`), `paperSheet` with `fold` and `crease` for a creased sheet under it; for a cut of meat, an outline as a distance meshed with `surfaceNets`, a bone as a `sweep` with the meat joined round it (a smooth union); fat and marbling painted by the `marbled` skin from a map on the meat | solo, three-quarter view | 1k to 4k (butter has its own 12k, steak 24k) |
| leafy | spinach | `kit/leafy.ts`: `stemmedLeaf` (stem and leaf one closed shape: a round stem flattening into a thin lens-shaped blade, the midrib running on from the stem; outline, cup, wavy edge, twist, `edgeRoll`, `roll` to turn the face), `settleStemmedLeaf` (a leaf settles like cloth onto a `Drape` height map of the table and the leaves already there), `stemmedLeafGeometry(leaf, id)` (each leaf its own number for the skin); **a pile** (spinach): leaves dropped over an oval, outer first, a ring round the foot; the tied bunch is kept as `buildSpinachBunch`; `kit/leafMass.ts` (a whole head as one surface, for romaine and napa cabbage) | solo | 1k each (spinach 20k) |

Only add a ninth archetype when three or more ingredients need it.

## Form conventions

- Real size from `size_cm`, converted with the Style Lab's scale helper (the apple is 8 cm wide). The size test allows 10%.
- Three.js axes: Y up. The ingredient's best side faces the camera's starting view; the registry `turn` (degrees) turns it on stage.
- Origin at the bottom centre, resting on the table at y = 0.
- Smooth normals everywhere: merge vertices, then compute normals. Real hard edges get a small rounded bevel instead of a crease.
- One form file per ingredient: `src/ingredients/forms/{id}.ts`, exporting a builder that takes the form state (`whole`, `half`, ...) and a seed, and returns pieces named by role (`peel`, `flesh_glow`, `pith`). The first piece is the hero: it gets the skin and the one loud highlight.
- Cut forms come from slicing the whole form with a plane and capping the cut face, not from separate hand-built shapes.
- All randomness is seeded from the ingredient id, so it looks the same on every reload.
- No lights, cameras, textures or colours in the form. Printed artwork (a label) is a texture the shader paints, never geometry (see `src/shading/labelArt.ts`).
- Register the ingredient (spec, family, builder) in `src/ingredients/registry.ts`. Export a `.glb` only when another tool needs a file.

## Per-ingredient look settings (registry)

Each registry entry can also carry, beside the spec and builder:

- `turn`: degrees on stage, measured from the camera (0 shows the form's front, +Z).
- `skin`: the peel texture the shader paints (`pebbled`, `pores`, `streaks`, `seeds`, `florets`, `crust`, `melon`, `marbled`, `poultry`, `onion`, `pepper`, `avocado`, `grape`, `blueberry`; `crumb`, `leaf`, `label`, `melonRind` and `knuckle` are set automatically by piece name). `poultry` (chicken) paints raw skin from a map on the meat (uv x: cm along, y: cm inside the skin's edge): follicles in loose tracts, fat and meat showing through, creases, the bare shank's meat and tendons. `onion` paints lines from root to neck in smooth arcs over soft bands, papery flakes, a tan root end, the neck drying toward its tip, a translucent glow, and on a cut face (map y > 0) rings of pale flesh edged in violet; it reads `ownPos`, each point's position in the upright onion, so it works tipped over. `pepper` paints soft grooves, long streaks and riper patches, and its gloss as long soft reflections down the lit lobes (the shared sheen stays quiet, `matte`). `avocado` paints a pebbled skin with specks and ripening blotches, and on the cut face (map y > 0) a warm yellow heart, a lime band, a green ring, a deeper green under the skin and a thin dark line, an ochre hollow round the pit (from `ownPos`, measured from the pit) and cooler shadows. `grape` paints a bunch (map x: each berry's own mix, y: 0 at its stalk to 1 at the far end): coral to wine-violet berries with mottled washes, one smooth turn from light to shadow instead of the tone steps, a warm band where it turns into shadow, a violet shadow side, a waxy bloom, a golden scar at the stalk, and the shared sheen broken into glints (`highlightBumpy`). `spinach` paints leaves (map x: 0 at the blade's base to 1 at its tip, a stem -1 to 0; y across, 0.5 the midrib; `ownPos.x` each leaf's own number): each leaf its own green, vein spacing and savoy wrinkles, lime washes and deeper blots, a pale midrib and side veins, a warm glow where light comes through, cool blue-green shadows, a paler underside, pale stems. `blueberry` paints a pile (map x: each berry's own mix, y: 0 at the crown's centre to 1 at the far pole): each berry its own blue, a dusty bloom rubbed off in places to a deeper blue, a soft plum hollow in the crown, violet shadows, broken glints kept off the crown. `knuckle` paints a bone's end (uv x: cm back from the end): a pearly cartilage cap and a pink blush where it leaves the meat. `marbled` (steak) paints marbling, muscle seams and a soft fat rim in the `fat` family's colour, from a map on the meat (uv x: cm in from the edge, y: height as a share of the top).
- `matte: true`: a quiet highlight on the hero (broccoli, bread, cheese).
- `rimGlints: false`: skip the rim glints (a narrow tube facing the light, like a bottle's neck, catches them as a hard white bar).
- `shadowTint` (0 to 1, default 1): how much of the shadow's violet and pink patches it takes (a pale cheese takes 0.35, or its shadows read as pink stains).
- `budget: [min, max]`: its own triangle budget when the archetype's does not fit.
- For clusters: `stemEnds` ('out' or 'front').
- `contactsFromFeet: true`: contact shadows only under the places that touch the table (a drumstick's bulb and knuckle), one group each, never a row along the whole length.
- `glossy: ['pit']`: parts that keep a full highlight although the body is matte or they are small (an avocado's polished pit).
- `playfulHide: ['seeds']`: pieces left out in Playful strokes, where small dark parts turn into hard blocks (the watermelon's seeds); they still show in the soft look.

**Props**: what an ingredient rests on (a paper sheet, later a plate or a board) is a piece named in `PROPS` (`forms/kit/checks.ts`, now `paper`). It is left out of the real size and of the card's subject zone (it only has to stay inside the card), it is not the hero (put it after the body), and it is drawn a hair in front of the floor so the two never flicker.

## Lessons learned (read before building)

Sorted by the four things the user looks at. Each rule names the ingredients that taught it; the
full story (first try, what the user said, where we ended) is in `docs/ingredients/lessons/{id}.md`.
`/forage-brand` keeps this list current after every approved ingredient: merge, never duplicate.

### Colour (colours, textures, gradients)

- **The ingredient keeps its own colours; only the room changes** (apple). Randomize never touches colour.
- **Softly lit, never blasted by sun** (apple, lemon): Light strength pulls lit and shadow toward the base, so no lit side bleaches toward white. The room complements the subject and stays muted, never candy.
- **Shadows are a mix of colours, never grey** (apple), in the ingredient's own temperature: pale ingredients take less of the violet and pink (`shadowTint`: cheese 0.35, butter 0.4, melon 0.3), or they read as stains (cheese).
- **Pale yellows turn warm in shadow, through orange, never lime** (butter); if a yellow shows green edges, check `turnHueTowardCool` before changing the family.
- **Texture marks darken toward the ingredient's own shade, never grey or black** (lemon): `shadeOwn`. Lettering and dark marks are never black: use the ingredient's own deep shade (plum `ink`), or a light ink on a coloured ground (sauce).
- **Every ingredient gets its own skin texture** (lemon, orange), and it must read at card size (strawberry seeds).
- **Close relatives must still read apart**: a bell pepper is purer and redder than the orange (pepper); berries are cooler and more magenta than the apple (strawberry); cheese is buttery, not lemon (cheese); butter is paler and fresher than cheese (butter); a melon is juicy coral, not candy pink (watermelon); raw beef is a deep red, deeper than Pink and raw (steak); raw chicken skin is a pale peach-pink, far paler than Pink and raw, apart from the fat and the butter (chicken). When the board's family is wrong for the real thing, add an off-board family.
- **Line textures follow the form in smooth arcs** (onion): a few lines of their own strength, broken in places, drifting slowly; wiggly lines read as cracks.
- **A skin shows what is under it** (chicken): fat and meat in soft patches, glow soaking into its darker tones, faint blotches. One flat colour reads as plastic.
- **A signature texture comes in loose patches, never an even pattern** (chicken follicles, strawberry seeds): each mark a little different, faded where the surface turns away from the camera (they bunch into a dotted line at the outline).
- **Small parts share one natural leaf green and need tone, veins and a paler underside** (orange, strawberry).
- **Warm and varied, never one flat colour**: a crust is many browns with blotches and specks (baguette); flesh has deeper, riper patches (watermelon). The same light chalky dry-brush texture carries across cut faces and skins (watermelon, steak, chicken). Marbling is a few shapes, never a lace: big sections with wandering seams that swell into pockets (steak).
- **Warm highlights, cool shadows** (grapes, a house rule): see style rule 8. On a red fruit the shadows lean violet (grapes), never just darker red.
- **Translucent fruit glows in one soft band where it turns into shadow, plus thin edges and light coming through** (grapes); never over the whole shadow side, which lifts the underside back to the lit colour and reads as light, dark, light. **Many small round pieces** (grapes) get one smooth turn from light to shadow: the shared tone steps repeat on each as a stripe pattern.
- **Many of a kind: each its own colour and texture, not only its own shape** (spinach, grapes, blueberries): a per-piece number (`ownPos.x` or the map) gives each leaf or berry its own green or blue, vein spacing and wrinkles; identical marks on every piece read as one piece stamped many times.
- **Small dark marks stay mid-dark** (blueberries, watermelon): a crown's hollow or a seed in near black turns into a hard block in Playful strokes; use a soft deep shade of the subject's own colour. **Blue, not purple** (blueberries): check a blue family doesn't drift violet once its shadows lean violet.
- **Cut flesh is several colour bands, each wandering like wet paint** (avocado): a warm heart, a lighter band, a bright ring, a deeper band under the skin, a thin dark line, plus a deeper tone in any hollow and broad blooms of value; lift the lit side only a little so it never bleaches. Green's shadows go cool toward indigo, never black-green (avocado).
- **Gradients between layers are one soft, wide wash** (watermelon, chicken): painted in the shader from a map on the body, never separate bands with edges. Where two pieces meet (meat and bone), both fade toward a shared colour so the join is never a crisp ring (chicken).
- **No crisp lines where colours meet inside an ingredient** (steak, watermelon): fat and meat, flesh and rind, seams, veins and bands fade over a soft band like wet paint. Crisp edges only in a few deliberate places: the lit outline, the cast shadow, printed art. When the user says "too realistic", soften the edges first; do not redraw the shapes as a diagram (steak).
- **Translucent flesh and skins glow in their shadows and thin places, with faint things seen inside** (watermelon, onion; reuse for citrus). Ask for a reference when a colour is hard to judge: the onion's purple landed in one step from the user's watercolour. Keep the glow on the flesh's own colour.
- **Highlights are believable touches of light, never graphic shapes** (apple); on a glossy skin the reflections follow the form (long streaks down a pepper's lobes, painted by its skin), never round blobs (pepper); one main highlight per object, small parts quiet (orange), except a polished part, which keeps its shine on a matte body (avocado pit, `glossy`); matte where the real thing is matte (broccoli, baguette, cheese, butter, watermelon). **A bumpy skin breaks its shine** into a faint sheen and small glints (strawberry); so do many small pieces, or each gets the same dot (grapes). On a different-coloured layer the highlight takes the surface's own colour (watermelon).

### Composition (several pieces)

- **Every piece rests the way it really would** (broccoli, watermelon, steak, chicken): broccoli lies on its side; a wedge on its curved rind only stands upright, so to lean one, lay it on a flat cut side; a tomahawk's bone dips so its knob rests on the table; a drumstick tips until its soft bulb settles a little flat and its knuckle rests too, the shank in the air (contact shadows only under those, `contactsFromFeet`).
- **A cluster is an odd triangle, balanced from every side** (strawberry): hero in front, two behind, stem ends out, bodies just touching. Never a row; a symmetric pinwheel looked worse.
- **Pieces never pass through each other** (broccoli, strawberry, onion pair: slid together until a point would enter the other's real profile).
- **Nothing levitates** (onion, spinach): a body rests on the table; roots or small parts that would reach below it are pressed flat along it; a bundle of stems lies on the table, its cut ends too.
- **Look from above and from every side** (spinach): a pile can be heavy on one side seen from above, or show a gap under an arch from one side only.
- **Let the user pick an arrangement on the variations page** (onion): `prototypes/variants.html` toggles an ingredient's arrangements on the real page.
- **Group shadows follow the five shadow rules** in `CLAUDE.md` (strawberry).
- **Turn the most telling side toward the camera or the light** (sauce label, cheese point, butter curl's spiral end); a long ingredient lies on a diagonal (baguette), its telling end toward the camera (chicken's knuckle).
- **Tell the story with the ingredient, not a tool** (butter): the curl, not a knife. What it rests on is a prop (`PROPS`).
- **Whole and cut: the whole one stands behind, the half leans in front with its face to the camera** (avocado, after the user's sketch); a cut half has no stem.
- **A pile: a mound with strays close by, every piece held in balance** (blueberries): strays a short roll away, never a separate group; a raised piece held on one side only looks as if it should roll off.
- **Soft things fall and settle; nothing bends upward** (spinach): leaves sag under their own weight and rest on the table or on each other, folding over and round them (settle like cloth onto a height map), never fanned up like a flower and never held a gap apart. Spread them out so only a few overlap at a time.
- **A heap is low and round** (spinach): outer pieces first, the middle ones on top; roundness comes from a ring at the foot, not from piling higher (a fuller, taller heap turned into a spire and was reverted).
- **A bunch lies the way a real one settles** (grapes): a soft mound held by its stalks, never a flat mat; the stem's cut end curls up off the table.
- **A pair the cluster layout cannot make is built in the form** (watermelon, avocado), each body resting on its own and repeating the hero's role.

### Form (believable, aesthetic, consistent)

- **Smooth and rounded, no facets** (apple); hard edges only where the real thing has them, each with a small bevel (sauce).
- **Never geometrically perfect** (strawberry, cheese, baguette): lobed, bent off centre, round bites on edges, gentle wobble in faces, cuts varied and spread out with pointed tips. Keep the table face flat.
- **Push the signature feature until it reads** (broccoli crown bumps, about 70% more than the first try; sauce bottle length).
- **Make it the version people picture** (baguette over boule, the boule kept as `loaf`; a tomahawk over a shapeless slab, from the user's references, steak).
- **Ample detail, all gentle** (chicken): build in the features that make it itself (a muscle seam, a three-cornered section, a concave taper, tendon ridges, loose skin folds, two knuckle knobs), each a small change in the radius, so it stays calm and never a plain blob.
- **No straight runs in an organic outline** (steak): two edges that line up (a neck's edge along the eye's) read as one ruler line; tuck one in, round the corners, add soft swells.
- **Smooth extras need a floor** (chicken): a smooth maximum where both shapes are near zero, or a layer added past the end of a body, draws a spike at the tip. Keep "no shape here" well below zero and scale added layers by the radius under them.
- **Where two parts join, one grows out of the other** (steak, chicken): the meat wraps up round the bone in a short, thinning sleeve. **Ends are shaped, never flat-cut** (steak bone's knob). **A layer sits only where the real thing has it** (steak fat on the back wall, not wrapped all round). **A flat ingredient tilts its top toward the low camera** (steak).
- **A rounded fruit's outline bulges all the way round** (avocado): no pointy ends and no flat sides; a boxier curve blunts the ends but straightens the sides. Plot a few outlines side by side before choosing. A pear is one smooth profile, never two balls (a peanut).
- **A cut is rounded all the way round, ends included** (avocado): build the half as a clean lathe or sweep, then pull it onto the shape with the cut rounded (`roundedIntersection`, `relaxOnSurface`); a meshed bevel one cell wide steps into a sawtooth. Small round parts on a face (a pit) are built as smooth caps, never meshed fields.
- **A signature detail stands up from the surface** (blueberries' crown: a raised collar with five points, never a flat dent); build a round piece by angle from that detail so the rings sit where it needs them.
- **Settle many pieces with a drop-and-nudge pass** (grapes, blueberries): gravity, the table, a reach limit per piece, pieces pushed apart by each one's true outline in that direction (support distance), so they touch and never sink in. **Stems are slim** (grapes: a 2.4 mm main stem, 1 mm stalks).
- **Stem and leaf are one shape, and the stem runs straight into its leaf** (spinach): a stem flattens and widens into its blade, the midrib running on; no extra bend before the blade.
- **Folds come in kinds, every leaf its own** (spinach): cupped, folded along the midrib, an edge rolled, a soft crease across, faces turned sideways or over; several outlines and a wide size range. Do this from the first try for leaves and sepals (the strawberry's sepals made the same mistake).
- **Leafy: separate leaves for a loose pile or bunch, one surface for a head** (spinach, a decision): the spinach as one blended surface was rejected ("more suited for romaine and cabbage, not for leafy greens"); `kit/leafMass.ts` is kept for those.
- **Real size, framed by the card** (strawberry).
- **Shoulders sweep into a neck** (onion): a neck grows out of the body (the shoulders pull up into it), never a cylinder stuck on a ball.
- **Tipped forms remember where they were upright** (onion): `ownPos` keeps marks that run round an axis on it.
- **Keep deformations gentle: start at about half** (butter); on a blocky form, organic variation of about 5% (pepper: more read as squashed). **Per-part variation blends, never jumps** (pepper: per-lobe sizes left a stepped groove). Local changes stay local. Small drips and beads read as damage: make swellings broad or leave them out.
- **A rind, crust or skin is part of the same surface** (cheese, watermelon): lift it off with `liftRegion`, never a separate slab or shell (a slab read as a cushion, a shell as a ledge).
- **Holes are deep with an overhanging rim** (cheese); seeds and dots are few, irregular, never a face: glossy beads half sunk in, never flat stickers (watermelon).
- **Printed artwork is our own two-tone stencil, kept simple** (sauce): never a copy of a brand or an artist.
- **Sheets and marks sit just off their surface** (sauce, watermelon): a label floats a hair off the bottle, its two ends meeting exactly; anything meant to sit on a face clears any wobble in it, or it vanishes under it.
- **Distance fields and surface nets** (broccoli, cheese): start the grid at odd offsets, bevels span about two cells, smooth with `relaxOnSurface`.

### Recurring errors

These come back on almost every ingredient. The pre-check list below is how to catch them first.

- Bodies sinking into each other: sample points apart is not the same as not overlapping (strawberry).
- Flicker where two surfaces sit at the same depth: leaves and sheets at table height (broccoli, butter), lifted skins on tight curves (watermelon).
- Contact shadows that do not follow the footprint (baguette, watermelon) or reach past the cast shadow (strawberry, avocado: a tipped half's front strip, painted as a grey block in Playful strokes).
- Rim glints drawing hard white or coloured lines on narrow tubes, pale layers and soft edges (sauce, watermelon, steak).
- Shadow dashes where a flat surface meets a body (butter), or under a rounded bottom edge: a flat-bottomed body sits flush (steak); patches, seams and halos where layers meet (apple).
- Saw-toothed bevels on meshed forms (cheese, avocado: a cut edge one cell wide; a pit's outline on the face); ledges in a lumpy crown (broccoli); a stepped groove where per-part sizes jumped (pepper).
- A highlight that becomes one flat pale patch or a dashed line along an edge (strawberry, butter, apple).
- A wrapped sheet's ends not meeting (sauce).
- A pile that settles but is not balanced (blueberries): check balance as well as overlap (`blueberries.test.ts`).
- A glow or tint tied to the tone steps draws a hard line or a stripe (grapes): drive it from a smooth light falloff.
- A stale render after an edit (grapes): the page reloads on every edit; make render scripts retry and compare before and after side by side.
- Inside-out triangles on a hand-built mesh (avocado): the near face vanishes and the far side's inside shows.
- Crisp lines where colours meet inside an ingredient (steak, watermelon).
- A slow build (heavy work inside a distance field) stalling Shuffle: sample curves once, look radii up from a table, answer quickly far from the surface; keep builds under about 0.3 s (steak, chicken).
- A dashed bluish line round a pale ingredient's outline (butter, chicken): outline pixels read as cast shadow. Fixed for every ingredient in the glaze (`shadowMaskAt`); if it comes back, zoom in on a pale outline.
- A pale sliver where a rounded body meets the table (chicken): light leaking in at the contact. Fixed for every ingredient on the floor (`ground.ts`: no normal bias, a hair of `FLOOR_BIAS`); look from low down.
- Small dark parts turning into hard black blocks in Playful strokes (watermelon seeds): leave them out of that look (`playfulHide`).
- Pushing a thin sheet point by point to clear its neighbours bends it into walls and zigzags (spinach): move it whole, or let it settle like cloth over a height map.
- Levitating (onion, spinach): a body or bundle hovering a little above the table; hold every part that should rest to the table.
- Bare parts with nothing on them (spinach: stems with no leaf): every stem has its leaf, or stays hidden.

## Pre-check before showing an ingredient

Run through this before the user sees a new ingredient (and after each round of changes). Look from
all four sides and from above, in both styles, not just the front. Items marked *(could be
automated)* are candidates for a test later.

1. **No overlap, and balanced**: no body inside another, and every raised piece held from below on every side (a pile), checked on every vertex, not by sample distance; parts never sink into a body. *(could be automated: `layout.test.ts` does it for clusters)*
2. **Resting for real**: every piece sits on the table the way it physically could; nothing floats. *(could be automated)*
3. **No flicker**: anything lying flat at table height is a prop; lifted skins and leaves never shimmer while orbiting.
4. **Contact shadows**: inside the cast shadow, following each piece's footprint, none under an arch or beside a long piece. Look from above. *(could be automated)*
5. **Shadow colour**: warm highlights and cool shadows (style rule 8); never grey, lime or pink-stained; check `shadowTint` for pale ingredients and the warm turn for yellows.
6. **Highlights**: one main highlight, soft and broken; no flat pale patch, no white or coloured rim lines (`rimGlints`), no dashed line along an edge.
7. **Edges**: no sawtooth on bevels, rinds or cut edges (zoom in on the ends of a cut too), no seam, halo or gap where layers meet, wrapped sheets close; no crisp line where colours meet inside the ingredient (only the lit outline, the cast shadow, printed art).
8. **Texture**: the ingredient's own skin reads at card size; specks lean to its own shade; marks never bunch at a tip.
9. **Silhouette and size**: the solid-black silhouette still names it; `styleLab.report()` within 10% of `size_cm`; triangles within budget. *(automated: `forms.test.ts`)*
10. **Lessons**: reread this file's lessons for the ingredient's archetype and colour family.
11. **Resting, not levitating**: the body touches the table; nothing thin holds it up (roots, tips, stems); soft parts (leaves) sag down, never up.
12. **Both looks, zoomed in**: Playful strokes too (no small dark part turned into a block); zoom in on the outline (no dashed line) and look at every contact from low down (no pale sliver).
13. **The bar**: hold it to "The bar" at the top of this guide, side by side with one or two finished ingredients in the same view; the build stays under about 0.3 s.

## Workflow

1. Read the spec and "The bar" at the top of this guide. Restate the archetype recipe and plan in two or three plain sentences.
2. Write or extend the kit tool, then the ingredient's form file. Build the first requested form only.
3. Check, and show the person before moving on:
   - a Style Lab screenshot from the card camera (three-quarter view, about 25 degrees up, 50 mm); use `styleLab.snapshot()` in dev
   - silhouette check (solid black): still obviously this ingredient?
   - bounding box in cm within 10% of `size_cm`
   - triangle count inside the archetype budget (or the entry's own `budget`)
   - no floating pieces, holes or inward normals
   - the shared form tests pick it up on their own (`forms.test.ts`: size, the y = 0 contact, finite outward normals, no floating pieces, the budget, part names, seeded); look at it from all four sides, not just the front
   - in dev: `styleLab.show('{id}')`, `styleLab.report()`, `styleLab.checks()`
4. Fix from feedback. If the problem is "too big, too detailed, too shiny", fix the spec or the shader, not by adding detail to the form.
5. Build the remaining requested forms (cuts) with the slicing tool.
6. Line-up check: show the new ingredient next to the apple and the egg at real size.
7. Run `npm test` and `npm run build`, then commit with a short message naming the ingredient and forms.
8. Keep the guidelines in step: once the user approves the ingredient, run `/forage-brand {id}` (`.claude/skills/forage-brand/SKILL.md`). It writes the ingredient's lessons record, updates this file (lessons, pre-check list, families, kit, settings) and the project notes (`CLAUDE.md`), and proposes the Figma board changes, applied after one OK. This file also lives on claude.ai as the user's `forage-ingredient` skill: after it changes, rebuild `docs/ingredients/forage-ingredient.zip` and remind the user to upload it there.

## Card framing (handled by the Style Lab, listed so forms suit it)

The card is 3:4 for now and will be redesigned, so framing rules are percentages: subject fits a centred square about 70% of card width, contact line about 74% of card height, top 20% calm for title and stats. One key light, warm, upper left and slightly in front, fixed to the room for every ingredient. Only the room colour changes per ingredient.

## Fallback: Blender through MCP

Use Blender only when a shape is still wrong after two honest tries with the kit (for example a very organic cut of meat), and say so to the person first. Then: metric, real size, Z up, origin at the bottom centre on Z = 0, apply transforms, smooth shading (use "Shade auto smooth", Blender 4.1 and later), one object per piece named by role, no lights, cameras, textures or colours. Export glTF binary with modifiers applied to `public/models/ingredients/{id}/{form}.glb`, and point the registry entry at the file instead of a builder. Save the .blend first; Blender MCP runs code directly.
