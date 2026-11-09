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

Sorted by the four things the user looks at. Each rule names the ingredients that taught it; the
full story (first try, what the user said, where we ended) is in `docs/ingredients/lessons/{id}.md`.
`/forage-brand` keeps this list current after every approved ingredient: merge, never duplicate.

### Colour (colours, textures, gradients)

- **The ingredient keeps its own colours; only the room changes** (apple). Randomize never touches colour.
- **Softly lit, never blasted by sun** (apple, lemon): Light strength pulls lit and shadow toward the base, so no lit side bleaches toward white. The room complements the subject and stays muted, never candy.
- **Shadows are a mix of colours, never grey** (apple), in the ingredient's own temperature: pale ingredients take less of the violet and pink (`shadowTint`: cheese 0.35, butter 0.4, melon 0.3), or they read as stains (cheese).
- **Pale yellows turn warm in shadow, through orange, never lime** (butter); if a yellow shows green edges, check `turnHueTowardCool` before changing the family.
- **Texture marks darken toward the ingredient's own shade, never grey or black** (lemon): `shadeOwn`. Lettering is deep plum, never black (sauce).
- **Every ingredient gets its own skin texture** (lemon, orange), and it must read at card size (strawberry seeds).
- **Close relatives must still read apart**: berries are cooler and more magenta than the apple (strawberry); cheese is buttery, not lemon (cheese); butter is paler and fresher than cheese (butter); a melon is juicy coral, not candy pink (watermelon).
- **Small parts share one natural leaf green and need tone, veins and a paler underside** (orange, strawberry).
- **Warm and varied, never one flat colour**: a crust is many browns with blotches and specks (baguette); flesh has deeper, riper patches (watermelon).
- **Gradients between layers are one soft, wide wash** (watermelon): painted in the shader from a map on the body, never separate bands with edges.
- **Translucent flesh glows in its shadows and thin places, with faint things seen inside** (watermelon; reuse for citrus). Keep the glow on the flesh's own colour.
- **Highlights are believable touches of light, never graphic shapes** (apple); one main highlight per object, small parts quiet (orange); matte where the real thing is matte (broccoli, baguette, cheese, butter, watermelon). **A bumpy skin breaks its shine** into a faint sheen and small glints (strawberry). On a different-coloured layer the highlight takes the surface's own colour (watermelon).

### Composition (several pieces)

- **Every piece rests the way it really would** (broccoli, watermelon): broccoli lies on its side; a wedge on its curved rind only stands upright, so to lean one, lay it on a flat cut side.
- **A cluster is an odd triangle, balanced from every side** (strawberry): hero in front, two behind, stem ends out, bodies just touching. Never a row; a symmetric pinwheel looked worse.
- **Pieces never pass through each other** (broccoli, strawberry).
- **Group shadows follow the five shadow rules** in `CLAUDE.md` (strawberry).
- **Turn the most telling side toward the camera or the light** (sauce label, cheese point, butter curl's spiral end); a long ingredient lies on a diagonal (baguette).
- **Tell the story with the ingredient, not a tool** (butter): the curl, not a knife. What it rests on is a prop (`PROPS`).
- **A pair the cluster layout cannot make is built in the form** (watermelon), each body resting on its own and repeating the hero's role.

### Form (believable, aesthetic, consistent)

- **Smooth and rounded, no facets** (apple); hard edges only where the real thing has them, each with a small bevel (sauce).
- **Never geometrically perfect** (strawberry, cheese, baguette): lobed, bent off centre, round bites on edges, gentle wobble in faces, cuts varied and spread out with pointed tips. Keep the table face flat.
- **Push the signature feature until it reads** (broccoli crown bumps, about 70% more than the first try; sauce bottle length).
- **Make it the version people picture** (baguette over boule; the boule is kept as `loaf`).
- **Real size, framed by the card** (strawberry).
- **Keep deformations gentle: start at about half** (butter). Local changes stay local. Small drips and beads read as damage: make swellings broad or leave them out.
- **A rind, crust or skin is part of the same surface** (cheese, watermelon): lift it off with `liftRegion`, never a separate slab or shell (a slab read as a cushion, a shell as a ledge).
- **Holes are deep with an overhanging rim** (cheese); seeds and dots are few, irregular, never a face, raised a little (watermelon).
- **Printed artwork is our own two-tone stencil, kept simple** (sauce): never a copy of a brand or an artist.
- **Sheets and marks sit just off their surface** (sauce, watermelon): a label floats a hair off the bottle, its two ends meeting exactly; flat marks (seeds) lift clear of any wobble in the face, or they vanish under it.
- **Distance fields and surface nets** (broccoli, cheese): start the grid at odd offsets, bevels span about two cells, smooth with `relaxOnSurface`.

### Recurring errors

These come back on almost every ingredient. The pre-check list below is how to catch them first.

- Bodies sinking into each other: sample points apart is not the same as not overlapping (strawberry).
- Flicker where two surfaces sit at the same depth: leaves and sheets at table height (broccoli, butter), lifted skins on tight curves (watermelon).
- Contact shadows that do not follow the footprint (baguette, watermelon) or reach past the cast shadow (strawberry).
- Rim glints drawing hard white or coloured lines on narrow tubes and pale layers (sauce, watermelon).
- Shadow dashes where a flat surface meets a body (butter); patches, seams and halos where layers meet (apple).
- Saw-toothed bevels on meshed forms (cheese); ledges in a lumpy crown (broccoli).
- A highlight that becomes one flat pale patch or a dashed line along an edge (strawberry, butter, apple).
- A wrapped sheet's ends not meeting (sauce).

## Pre-check before showing an ingredient

Run through this before the user sees a new ingredient (and after each round of changes). Look from
all four sides and from above, in both styles, not just the front. Items marked *(could be
automated)* are candidates for a test later.

1. **No overlap**: no body inside another, checked on every vertex, not by sample distance; parts never sink into a body. *(could be automated: `layout.test.ts` does it for clusters)*
2. **Resting for real**: every piece sits on the table the way it physically could; nothing floats. *(could be automated)*
3. **No flicker**: anything lying flat at table height is a prop; lifted skins and leaves never shimmer while orbiting.
4. **Contact shadows**: inside the cast shadow, following each piece's footprint, none under an arch or beside a long piece. Look from above. *(could be automated)*
5. **Shadow colour**: never grey, lime or pink-stained; check `shadowTint` for pale ingredients and the warm turn for yellows.
6. **Highlights**: one main highlight, soft and broken; no flat pale patch, no white or coloured rim lines (`rimGlints`), no dashed line along an edge.
7. **Edges**: no sawtooth on bevels or rinds, no seam, halo or gap where layers meet, wrapped sheets close.
8. **Texture**: the ingredient's own skin reads at card size; specks lean to its own shade; marks never bunch at a tip.
9. **Silhouette and size**: the solid-black silhouette still names it; `styleLab.report()` within 10% of `size_cm`; triangles within budget. *(automated: `forms.test.ts`)*
10. **Lessons**: reread this file's lessons for the ingredient's archetype and colour family.

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
8. Keep the guidelines in step: once the user approves the ingredient, run `/forage-brand {id}` (`.claude/skills/forage-brand/SKILL.md`). It writes the ingredient's lessons record, updates this file (lessons, pre-check list, families, kit, settings) and the project notes (`CLAUDE.md`), and proposes the Figma board changes, applied after one OK. This file also lives on claude.ai as the user's `forage-ingredient` skill: after it changes, rebuild `docs/ingredients/forage-ingredient.zip` and remind the user to upload it there.

## Card framing (handled by the Style Lab, listed so forms suit it)

The card is 3:4 for now and will be redesigned, so framing rules are percentages: subject fits a centred square about 70% of card width, contact line about 74% of card height, top 20% calm for title and stats. One key light, warm, upper left and slightly in front, fixed to the room for every ingredient. Only the room colour changes per ingredient.

## Fallback: Blender through MCP

Use Blender only when a shape is still wrong after two honest tries with the kit (for example a very organic cut of meat), and say so to the person first. Then: metric, real size, Z up, origin at the bottom centre on Z = 0, apply transforms, smooth shading (use "Shade auto smooth", Blender 4.1 and later), one object per piece named by role, no lights, cameras, textures or colours. Export glTF binary with modifiers applied to `public/models/ingredients/{id}/{form}.glb`, and point the registry entry at the file instead of a builder. Save the .blend first; Blender MCP runs code directly.
