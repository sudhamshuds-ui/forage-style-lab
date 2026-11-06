---
name: forage-ingredient
description: Use when building, speccing or reviewing a Forage ingredient: writing its YAML spec, building its smooth real-size form in code for the Style Lab, checking it against the Forage style and adding it to the registry.
---

# Forage ingredient

Forage is a cooking discovery web game. Every ingredient is a 3D form painted by the Forage Style Lab shader into a soft-light gouache card. This skill turns one ingredient spec into a smooth, real-size **form built in code** and a registry entry.

Source of truth for the art direction: the Figma page "Ingredient guidelines" in https://www.figma.com/design/537QrQ0QsVjcT4u3st7M20/Forage (boards 01 to 10). Read it with the Figma MCP when something here is unclear.

The person you work with is a motion and visual designer who is new to code. Explain each step simply, with design analogies. Never use em dashes in any copy you write.

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
| yellow | #fff0a3 | #f2c94c | #b0866a | #ffc94a | #fffbe8 | Seafoam | lemon |
| green | #c8de8a | #73a24c | #3c6f66 | #b5d65a | #eef5d8 | Heather, Linen | broccoli |
| cream-crust | #fbe6c4 | #e0ad73 | #9a6a63 | #f2b45e | #fff6e6 | Sage morning, Overcast | |
| baked | #f8c98c | #df8a47 | #94443a | #ee7b34 | #fff0d8 | Sage morning, Overcast | baguette (off-board) |
| sauce | #cf4a3e | #8e1b2b | #4c1534 | #e8452f | #f8d9d2 | Linen, Heather | hot sauce (off-board) |
| cheese | #fff1bf | #f3d273 | #c48a45 | #ffbf4a | #fffaf0 | Seafoam, Heather | cheese (off-board; board 08 says Yellow, which read acidic) |
| butter | #fff7d2 | #f6e092 | #d4b08f | #ffcf66 | #fffdf2 | Heather, Seafoam | butter (off-board; board 08 says Yellow, kept apart from the cheese) |
| melon | #ff8f74 | #e4473d | #962f45 | #ff6e4f | #ffe6dc | Seafoam, Sage morning | watermelon flesh (off-board; board 08 says Red, the apple's red is a skin) |
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
| parchment | #fdfbf6 | #efebe4 | #c4bccf | #f4ecdc | #ffffff | a butter wrapper, baking parchment (whiter and cooler than `paper`) |

Colours live in data (the registry), never in the form. Shadows always shift hue (never grey or near black). A whole-ingredient family needs five colours and rooms **70 to 180 degrees** away on the colour wheel (board 04 says 70 to 150, but its own pairings go further; kept by choice, tested in `registry.test.ts`).

## The form kit (one recipe per archetype)

Forms are built from a shared kit in `src/ingredients/forms/kit/`. Create a kit tool the first time an archetype needs it; reuse it after that. Never build a form from scratch when a kit recipe fits. What is built so far:

| archetype | built | kit tools | default layout | budget |
|---|---|---|---|---|
| round | apple, lemon, orange, (loaf) | `lathe.ts` (a profile spun round an axis), `round.ts` (lopsided, flat base, lying or upright), `stemLeaf.ts` (stem, calyx, leaf) | solo or whole-and-cut | 2k to 6k |
| small | strawberry | one master form, seeded variants, `layout.ts` arranges cluster-2 and cluster-3 | cluster-3 | 1k to 3k each |
| long | baguette | `sweep.ts` (a tube along a curve, optional ribbed section) | solo, on a diagonal | 2k to 5k (baguette has its own 9k) |
| branching | broccoli | `crown.ts` (blobs blended as a distance field), `surfaceNets.ts` (distance field to clean mesh), `sweep.ts` for stalks | solo | 6k to 18k (raised from 12k for a bumpier crown) |
| wedge | cheese, watermelon | `wedge.ts` (a slice of a wheel as a distance field, `roundedIntersection` for bevelled edges), meshed with `surfaceNets`, smoothed with `relaxOnSurface`, rind lifted off with `liftRegion` | solo | 2k to 5k (cheese has its own 10k) |
| contained | hot sauce | `vessel.ts`: `revolve` (a profile spun standing up, with a `roundedSquare` or `ribs` cross-section), `wrapSheet` (a sheet hugging a vessel: labels, rectangles or ovals, `mapped` for printed artwork) | solo | vessel + 1k (sauce has its own 16k) |
| block | butter (steak next) | `block.ts`: `blockSides` (a box as distances, rounded with `roundedIntersection`, meshed with `surfaceNets` and `relaxOnSurface`), `paperSheet` with `fold` and `crease` for a creased sheet under it; fat, marbling as separate pieces | solo, three-quarter view | 1k to 4k (butter has its own 12k: a meshed block, its curl and its paper) |
| leafy | (not yet) | a shaped plane with a gentle curl and a little thickness | small pile | 1k to 3k |

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
- `skin`: the peel texture the shader paints (`pebbled`, `pores`, `streaks`, `seeds`, `florets`, `crust`; `crumb`, `leaf` and `label` are set automatically by piece name).
- `matte: true`: a quiet highlight on the hero (broccoli, bread, cheese).
- `rimGlints: false`: skip the rim glints (a narrow tube facing the light, like a bottle's neck, catches them as a hard white bar).
- `shadowTint` (0 to 1, default 1): how much of the shadow's violet and pink patches it takes (a pale cheese takes 0.35, or its shadows read as pink stains).
- `budget: [min, max]`: its own triangle budget when the archetype's does not fit.
- For clusters: `stemEnds` ('out' or 'front').

**Props**: what an ingredient rests on (a paper sheet, later a plate or a board) is a piece named in `PROPS` (`forms/kit/checks.ts`, now `paper`). It is left out of the real size and of the card's subject zone (it only has to stay inside the card), it is not the hero (put it after the body), and it is drawn a hair in front of the floor so the two never flicker.

## Lessons learned (read before building)

- **Distance fields and surface nets** (branching, wedge): the meshing grid should never line up with a flat face (start it at odd offsets), and any bevel must span about two grid cells, or edges come out saw-toothed. Smooth the mesh with `relaxOnSurface` so long angled edges are clean.
- **Holes and cavities** (cheese eyes): put a bubble's centre a little under the face, so it opens as a deep hole with an overhanging rim and a shadowed inside. A shallow dish reads as a pale spot.
- **Never machine-perfect**: cut faces get a very gentle seeded wobble and the outline a few round bites, so it looks cut by hand. Keep the table face flat.
- **A rind, crust or skin is part of the same surface**: build the whole piece once and lift the region off as a thin skin (`liftRegion`, keeping the normals), never a separate slab (it reads as a cushion stuck on).
- **Sheets on a surface** (labels): float them a hair off the surface; when a sheet wraps all the way round, its two ends must meet exactly (a tiny gap shows as a dark line).
- **Printed artwork** (labels): draw it in code as a two-tone stencil and let the shader paint the ink with the ground's light and shadow. Our own design in the spirit of a reference, never a copy of a real brand or an artist's marks; keep it simple (the user removed borders, dots and repeated icons).
- **References** are for form: a signed painting or a real brand's pack is never copied.
- **Small bumps read as damage**: in the painted shading, a little drip or bead becomes a dark notch (a chip). Make a melt or a swelling broad and soft, or leave it out.
- **Tell the story with the ingredient, not a tool**: a knife's scrape and the curl it took say "butter" at a glance, with no utensil on the card. A small part like the curl is listed in `SMALL_PARTS` (left out of the real size); turn it so its most telling side (the curl's spiral end) faces the camera.
- **A pair built in the form** (watermelon): when a layout needs something the cluster layout cannot do (a lean), build the members in the form, each resting on the table on its own. Repeat the hero's role for the second body, so both get the skin, the highlight and contact spots.
- **Balance**: every piece must rest the way it really would. A wedge on its curved rind only stands straight up; to lean one, lay it on a flat cut side.
- **Lifted skins** (rinds) are drawn in front of their body automatically; without it they flickered as a sawtooth on tight curves.
- **Gradients between layers** (flesh to rind): soft and wide like a wash (the user preferred it to crisp edges);: paint them in the shader from a map on the body (like the `melon` skin), not as separate bands, which give hard edges.
- **Seeds and dots**: few, irregular, never two above one (a face). Make them small raised beads, not flat stickers.
- **Translucent flesh** (melon, citrus): glow in the shadows, more at thin places, and faint things seen inside by sampling under the surface along the line of sight (see `CLAUDE.md`, "Translucent flesh"). Keep it faint.
- **Rim glints and pale layers**: the rim glint is painted in the body's highlight colour; on a gradient into a rind it draws a coloured line, so switch it off (`rimGlints: false`).
- **Rind, band, peel layers**: lift each off the body's own surface by distance (`liftRegion`); the board's "separate shell" is its own layer without a seam.
- **Flat marks on a face** (seeds): lift them clear of any wobble in the face, or they vanish under it.
- **Local changes stay local**: a softened corner rounds only the top of that corner; rounding its whole upright edge hid a face of the block.
- **Anything lying flat on the table** (a paper sheet) must be a prop, or it flickers with the floor.
- **Keep deformations gentle**: a softened corner reads at about half what first seems needed (the butter's sag went from 1.2 to 0.6 cm). Start small; the user can always ask for more.
- **Pale yellows** (butter, cheese, lemon): the shader cools their shadows the warm way, through orange; if a yellow shows lime edges, check that rule (`turnHueTowardCool`) before changing the family.

## Workflow

1. Read the spec. Restate the archetype recipe and plan in two or three plain sentences.
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
8. Keep the guidelines in step: this file (families, kit, settings, lessons) and the project notes (`CLAUDE.md`). New families and archetype recipes are also candidates for the Figma boards (04 and 07); ask before editing Figma.

## Card framing (handled by the Style Lab, listed so forms suit it)

The card is 3:4 for now and will be redesigned, so framing rules are percentages: subject fits a centred square about 70% of card width, contact line about 74% of card height, top 20% calm for title and stats. One key light, warm, upper left and slightly in front, fixed to the room for every ingredient. Only the room colour changes per ingredient.

## Fallback: Blender through MCP

Use Blender only when a shape is still wrong after two honest tries with the kit (for example a very organic cut of meat), and say so to the person first. Then: metric, real size, Z up, origin at the bottom centre on Z = 0, apply transforms, smooth shading (use "Shade auto smooth", Blender 4.1 and later), one object per piece named by role, no lights, cameras, textures or colours. Export glTF binary with modifiers applied to `public/models/ingredients/{id}/{form}.glb`, and point the registry entry at the file instead of a builder. Save the .blend first; Blender MCP runs code directly.
