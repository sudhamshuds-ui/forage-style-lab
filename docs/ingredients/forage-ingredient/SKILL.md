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

| family | lit | base | shadow | glow | highlight | room |
|---|---|---|---|---|---|---|
| red | #f78e64 | #ce5249 | #843d56 | #ed6531 | #f5e5d3 | Linen or Heather |
| orange | #ffb36b | #f0812f | #b0484a | #ff9a2e | #fff0d9 | Overcast or Dusk |
| yellow | #fff0a3 | #f2c94c | #b0866a | #ffc94a | #fffbe8 | Seafoam |
| green | #c8de8a | #73a24c | #3c6f66 | #b5d65a | #eef5d8 | Heather or Linen |
| cream-crust | #fbe6c4 | #e0ad73 | #9a6a63 | #f2b45e | #fff6e6 | Sage morning or Overcast |
| pink-raw | #f6a493 | #d4544f | #8c3150 | #ff7a66 | #fbe4dc | Seafoam or Sage morning |

Colours live in data (the registry), never in the form. A new family needs five colours and a room 70 to 150 degrees away on the colour wheel (tested in `palettes.test.ts`).

## The form kit (one recipe per archetype)

Forms are built from a shared kit in `src/ingredients/forms/kit/`. Create a kit tool the first time an archetype needs it; reuse it after that. Never build a form from scratch when a kit recipe fits.

| archetype | examples | kit recipe | default layout | budget |
|---|---|---|---|---|
| round | apple, orange, lemon, tomato, onion | Lathe a profile curve (`LatheGeometry`): squash to proportion, soft dimple at each pole, a little low-frequency lopsidedness. Stem and leaf are separate pieces. | solo or whole-and-cut | 2k to 6k tris |
| small | strawberry, egg, grape, garlic clove | One master form plus three seeded variants (scale, lean, shape) so clusters never look copy-pasted. | cluster-3 | 1k to 3k each |
| long | carrot, banana, baguette, drumstick | A tube swept along a gentle curve (`TubeGeometry`-style sweep) with a radius profile and rounded ends. Lay it on a diagonal. | solo | 2k to 5k |
| block | butter, steak, tofu, fillet | Rounded box (soft edge radius) with a slight sag. Fat, marbling and paper are separate pieces. | solo, three-quarter view | 1k to 4k |
| wedge | cheese wedge, watermelon wedge, pie | An extruded wedge or segment (`ExtrudeGeometry` with bevel). Rind or crust is a thin separate shell. | solo or pair | 2k to 5k |
| branching | broccoli, cauliflower, mushrooms | Stalk from a swept curve. Tops are a few soft blobs blended as a distance field, meshed with marching cubes and smoothed. 3 to 5 big masses only. | solo | 6k to 12k |
| leafy | lettuce, basil, spinach | A shaped plane with a gentle curl and a little thickness. | small pile | 1k to 3k |
| contained | milk, flour, honey, rice | A Tool 03 vessel plus a contents surface and a small spill. | solo | vessel + 1k |

Only add a ninth archetype when three or more ingredients need it.

## Form conventions

- Real size from `size_cm`, converted with the Style Lab's scale helper (the apple is 8 cm wide).
- Three.js axes: Y up. The ingredient's best side faces the camera's starting view.
- Origin at the bottom centre, resting on the table at y = 0.
- Smooth normals everywhere: merge vertices, then compute normals. Real hard edges get a small rounded bevel instead of a crease.
- One form file per ingredient: `src/ingredients/forms/{id}.ts`, exporting a builder that takes the spec, the form state (`whole`, `half`, ...) and a seed, and returns pieces named by role (`peel`, `flesh_glow`, `pith`).
- Cut forms come from slicing the whole form with a plane and capping the cut face, not from separate hand-built shapes.
- All randomness is seeded from the ingredient id, so it looks the same on every reload.
- No lights, cameras, textures or colours in the form.
- Register the ingredient (spec, family, builder) in `src/ingredients/registry.ts`. Create the registry if it does not exist yet. Export a `.glb` (Three.js `GLTFExporter`) only when another tool needs a file.

## Workflow

1. Read the spec. Restate the archetype recipe and plan in two or three plain sentences.
2. Write or extend the kit tool, then the ingredient's form file. Build the first requested form only.
3. Check, and show the person before moving on:
   - a Style Lab screenshot from the card camera (three-quarter view, about 25 degrees up, 50 mm); use `styleLab.snapshot()` in dev
   - silhouette check (solid black): still obviously this ingredient?
   - bounding box in cm within 10% of `size_cm`
   - triangle count inside the archetype budget
   - no floating pieces, holes or inward normals
   - a Vitest test that pins the size, the y = 0 contact, finite outward normals and the budget
4. Fix from feedback. If the problem is "too big, too detailed, too shiny", fix the spec or the shader, not by adding detail to the form.
5. Build the remaining requested forms (cuts) with the slicing tool.
6. Line-up check: show the new ingredient next to the apple and the egg at real size.
7. Run `npm test` and `npm run build`, then commit with a short message naming the ingredient and forms.

## Card framing (handled by the Style Lab, listed so forms suit it)

The card is 3:4 for now and will be redesigned, so framing rules are percentages: subject fits a centred square about 70% of card width, contact line about 74% of card height, top 20% calm for title and stats. One key light, warm, upper left and slightly in front, fixed to the room for every ingredient. Only the room colour changes per ingredient.

## Fallback: Blender through MCP

Use Blender only when a shape is still wrong after two honest tries with the kit (for example a very organic cut of meat), and say so to the person first. Then: metric, real size, Z up, origin at the bottom centre on Z = 0, apply transforms, smooth shading (use "Shade auto smooth", Blender 4.1 and later), one object per piece named by role, no lights, cameras, textures or colours. Export glTF binary with modifiers applied to `public/models/ingredients/{id}/{form}.glb`, and point the registry entry at the file instead of a builder. Save the .blend first; Blender MCP runs code directly.
