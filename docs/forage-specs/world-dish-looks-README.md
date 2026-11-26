# World Dish Visual Looks Notes (`world-dish-looks.json`)

Hand-authored visual specifications for all **236** world dishes in `src/dishes/worldDishes.json`, designed to replace the regex-guessed notes in `scripts/world-looks.py` so Claude Code can wire honest visual rendering directly without spending tokens researching dishes.

---

## 1. Field Meanings

Each object in `/workspace/forage-specs/world-dish-looks.json` corresponds 1:1 (same `id`, same order) to `src/dishes/worldDishes.json`:

| Field | Type | Meaning |
|---|---|---|
| `id` | `string` | Exact dish `id` from `worldDishes.json`. |
| `name` | `string` | Exact dish `name` from `worldDishes.json`. |
| `vessel` | `string` | Authentic serving vessel (`plate`, `shallow bowl`, `bowl`, `deep bowl`, `board`, `glass`, `tart`, `skillet`, `kadai`, `ramekin`, `clay pot`, `lidded cup`). |
| `base` | `{ colour, texture } \| null` | What the dish sits in/on (gravy, broth, rice bed, leaf bed, mash, yogurt pool, drink liquid). `null` when items sit directly on a dry plate/board/skillet with no pool or bed. |
| `pieces` | `Array<{ ingredient, shape, size_cm, placement }>` | Each visible solid component: pantry id (or explicit non-pantry item name when missing from pantry), authentic cut/form, realistic primary dimension in **cm**, and placement/sink depth (`half sunk`, `sunk one-third`, `fanned`, `stacked`, `scattered on top`, `beside`, etc.). |
| `finish` | `string` | Signature final garnish/glaze/finish as actually served. |
| `never` | `string[]` | Common wrong renderings, ingredients, or garnishes to strictly forbid (e.g. no chicken in Palak Paneer, no herbs/croutons on desserts, no syrup on savoury dishes, no avocado half with pit). |
| `minimum_to_claim_name` | `string[]` | Visual invariants that **must** be visible on the card to honestly claim the dish's name. If any item cannot be produced, refuse the world dish. |

---

## 2. How Claude Code Should Use This File

1. **Replace auto-derived `looks`:** Import or merge `/workspace/forage-specs/world-dish-looks.json` into `src/dishes/worldDishes.json` (instead of running `scripts/world-looks.py`'s word-matching heuristics).
2. **Drive vessel, base, pieces, and finish from the note:**
   - Map `vessel` to `ware.ts` (`skillet` / `kadai` -> `bowl` or `deep-bowl` only if the base + pieces still match `minimum_to_claim_name`; `ramekin` / `lidded cup` / `clay pot` should not be faked with a flat plate).
   - Map `base.colour` and `base.texture` to `FAMILIES` in `src/ingredients/families.ts` (e.g. Palak Paneer -> `green-gravy`, never `cheese-sauce`; Doogh -> opaque white yogurt `milk`/`cream`; Kuku Sabzi -> emerald green).
   - Use `pieces[].shape`, `size_cm`, and `placement` to pick the exact `element` form, real-world cm scale, and sink depth (`half sunk` -> `0.5`, `sunk one-third` -> `0.33`, etc.).
3. **Enforce `never`:** In `scoreWorldDish` (`src/dishes/compose/world.ts`), reject any dish if a table ingredient or planned component violates `never` (e.g. meat on Palak Paneer, herbs on sweet dishes, syrup on savoury dishes).
4. **Enforce `minimum_to_claim_name` (Honest-Names Rule):** Check at load/build time (or via a `needs` / `renderable()` gate) that every requirement in `minimum_to_claim_name` can be built by the current pantry and render library (`elements.ts`, `components.ts`, `ware.ts`). If not, **refuse the world dish** and fall back to a template dish (or another fitting world dish). Title and caption must describe what is actually rendered.

---

## 3. Dishes That Can't Be Honestly Rendered Yet (Current Pantry / Render Library)

With the current 31-ingredient pantry (`registry.ts`) and current 3D forms/vessels (`elements.ts`, `components.ts`, `ware.ts`), the following **40 dishes** cannot yet satisfy `minimum_to_claim_name` honestly and should be refused until the missing ingredient/geometry/vessel is built:

### A. Missing Non-Pantry Hero Ingredients (10)
- `ca-phe-trung` — Needs dark coffee base + whipped golden egg-yolk foam (no coffee in pantry).
- `duck-a-lorange` — Needs rosy seared duck breast slices (no duck in pantry; chicken must not impersonate duck).
- `aloo-gobi` — Needs cauliflower florets (no cauliflower in pantry; broccoli must not impersonate cauliflower).
- `broccoli-orecchiette` — Needs ear-shaped orecchiette pasta (no pasta in pantry/library).
- `broccoli-aglio-olio` — Needs spaghetti/pasta ribbons (no pasta in pantry/library).
- `cacio-e-pepe` — Needs pasta twirl coated in pecorino emulsion (no pasta in pantry/library).
- `vietnamese-pho-ga` — Needs flat white rice noodle nest in clear broth (no rice noodles).
- `egyptian-koshari` — Needs brown lentils and macaroni alongside rice (neither in pantry).
- `sichuan-chili-wontons` — Needs folded pleated dumpling/wonton geometry (no dumplings).
- `georgian-churchkhela` — Needs candle-shaped grape-must-coated walnut strands (no walnut strands).

### B. Missing Bread / Pastry / Pancake / Dessert Geometries (17)
- `adjaruli-khachapuri` — Needs boat-shaped bread crust holding molten cheese pool and intact raw egg yolk (only flat baguette toast exists).
- `creme-brulee` — Needs ceramic ramekin + crisp cracked torched caramelized sugar glass top (neither exists; cream dome reads as ice cream).
- `austrian-kaiserschmarrn` — Needs torn irregular caramelized pancake chunks with powdered sugar snow (only neat stacked round discs exist).
- `crepes-suzette` — Needs thin folded triangular crepes (thick round `milk:pancake` discs look wrong).
- `egyptian-hawawshi` — Needs stuffed crisp pita pocket halves (no pita pocket).
- `aloo-paratha` — Needs griddled stuffed round flatbread (no stuffed flatbread).
- `mumbai-pav-bhaji` — Needs soft toasted pav dinner rolls beside spiced red vegetable mash (baguette toast is wrong).
- `ichigo-sando` — Needs crustless square milk-bread sandwich cross-section showing whipped cream and strawberries.
- `schiacciata-uva` — Needs dimpled baked grape flatbread squares.
- `chicken-pastilla` — Needs enclosed round crisp phyllo/warqa pie dusted with powdered sugar & cinnamon lattice (open `tart` shell is wrong).
- `greek-spanakopita` — Needs flaky layered phyllo pastry wedge enclosing spinach & feta.
- `om-ali` — Needs milk-soaked flaky puff pastry shards bubbling in bowl.
- `chilaquiles` — Needs salsa-soaked crisp tortilla triangles in skillet.
- `huevos-rancheros` — Needs warm corn tortilla rounds beneath eggs and salsa.
- `british-eton-mess` — Needs broken crisp white meringue shards tumbled with cream & strawberries.
- `peach-cobbler`, `blueberry-grunt` — Needs drop-biscuit crust / steamed biscuit dumplings over stewed fruit.

### C. Missing Special Forms or Vessels for Existing Pantry Items (13)
- `okonomiyaki` — Needs thick savoury cabbage-studded round pancake with brown sauce & mayo lattice.
- `gamja-jeon` — Needs crisp lacy pan-fried potato pancake (not potato mash).
- `bubble-and-squeak` — Needs pan-crisped potato-and-cabbage patty/cake.
- `batates-mahshia` — Needs hollowed potato cups stuffed with spiced minced beef.
- `sicilian-arancini` — Needs breaded golden fried rice spheres (no rice ball geometry).
- `indian-rasmalai` — Needs soft snow-white flattened milk-curd discs soaking in saffron milk (porous cheddar slices read wrong).
- `chawanmushi`, `broccoli-chawanmushi` — Needs lidded custard cup with silky steamed savoury custard inlaid with toppings (`eggs:egg` is a fried egg).
- `gyeran-jjim` — Needs puffed volcanic steamed egg dome in an earthen clay pot (`eggs:egg` is a flat fried egg).
- `tamagoyaki`, `tortilla-espanola`, `kuku-sabzi` — Needs rectangular rolled omelette slices / thick layered potato-egg wedge / thick emerald herb frittata wedge (`eggs:omelette` only builds a thin pale-yellow half-moon).
- `steak-tartare` — Needs molded finely diced raw red beef cylinder + intact raw yolk (`steak:steak` is seared sliced steak).
- *(Borderline / check in QA)*: `french-onion-soup`, `croque-monsieur`, `swiss-raclette`, `queso-fundido`, `french-tartiflette`, and `broccoli-cheese-bake` rely on a broiled bubbling/molten melted cheese cap (`cheese` currently only renders solid wedges, slices, or crumbles, though `cheese-sauce` exists as a liquid pool). Refuse any of these whose `minimum_to_claim_name` requires a melted cheese blanket/gratin until a melted-cheese shader/mesh is added.
