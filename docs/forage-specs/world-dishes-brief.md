# World Dishes Library: Claude Code Integration Brief

Integrate `/workspace/forage-specs/world-dishes.json` (236 verified real dishes across 40 cuisines and 13 world regions) into Forage's `pickDish()` pipeline (`src/dishes/compose/pick.ts`). When the user drops 1-3 pantry ingredients on the table and picks Course / Taste / Wild, Forage matches a real world dish so the Kitchen serves named global dishes (e.g., *Gibna wa Bateeikh*, *Nargesi Esfenaj*, *Tarte Bourdaloue*, *Salmorejo*) with the chosen ingredients as heroes and authentic supporting components plated around them.

Follow `/workspace/forage-specs/composable-dishes.md`, `/workspace/forage-specs/fix-list.md`, and `/workspace/forage-specs/owner-notes.md`. Do not use an LLM or image model at runtime. No em dashes in any UI copy.

---

## 1. Files and Data Contract

Copy or import `/workspace/forage-specs/world-dishes.json` into `src/dishes/worldDishes.json` (or `src/dishes/compose/worldDishes.ts`). Each entry has:

```ts
export interface WorldDishEntry {
  id: string;
  name: string;                 // Real dish name, <= 32 chars, single line, no em dashes
  cuisine: string;              // e.g. "Persian", "Egyptian", "Japanese", "Peruvian"
  region: string;               // e.g. "Middle East", "North Africa", "East Asia"
  course: 'starter' | 'main' | 'dessert' | 'snack' | 'drink';
  taste: 'savoury' | 'sweet' | 'both';
  heroes: string[];             // 1-3 pantry ids (from src/ingredients/registry.ts)
  coreIngredients: string[];    // Pantry ids authentically in the dish (superset of heroes)
  supportingComponents: string[]; // Non-pantry render components to plate alongside
  vessel: 'plate' | 'slate' | 'bowl' | 'deep-bowl' | 'board' | 'glass' | 'tart';
  layout:
    | 'circular-plate' | 'rice-bowl' | 'leaf-salad' | 'toast-board'
    | 'soup-bowl' | 'skewer-platter' | 'glass-drink' | 'dessert-bowl'
    | 'skillet-bake' | 'mash-plate' | 'tart' | 'tartare-crudo' | 'pancake-stack';
  platingNotes: string;         // 1-line layout guidance
  blurb: string;                // 1-line origin/description for the dish card
  sourceUrl: string;            // Verified recipe/reference URL
}
```

---

## 2. Matching Logic (`scoreWorldDish` in `src/dishes/compose/pick.ts`)

Given `tableIds: string[]` (1-3 pantry ids), `choices: CookChoices` (`course`, `taste`, `wild`), and `seed: number`:

### 2.1 Hard Filters
- **Drink rule:** If `choices.course === 'Drink'`, filter to `dish.course === 'drink'` only. If no world dish matches above threshold, fall back to the `glass-drink` template generator (never plate solid wedges for Drink).
- **Zero-overlap rule:** Any candidate with `overlap(tableIds, dish.coreIngredients) === 0` is ineligible (score `-Infinity`).

### 2.2 Scoring Formula
For each eligible `dish`:
1. **Ingredient overlap (primary signal):**
   - `+3.5` for each `id` in `tableIds` that is in `dish.heroes`.
   - `+1.5` for each `id` in `tableIds` that is in `dish.coreIngredients` (and not already counted as a hero).
   - `+4.0` full-table bonus if every `id` in `tableIds` is present in `dish.coreIngredients`.
   - `-0.8` per `dish.heroes` item NOT in `tableIds` (prevents a 3-hero dish beating a 1-hero dish on a 1-ingredient cook).
2. **Course alignment:**
   - Exact match (`dish.course === choices.course.toLowerCase()`): `+3.0`.
   - Adjacent savoury match (`starter <-> snack` or `starter <-> main`): `+0.5`.
   - Mismatch (e.g., `main` dish when `Dessert` selected): `-3.5`.
3. **Taste alignment:**
   - Exact match (`dish.taste === choices.taste.toLowerCase()`): `+2.5`.
   - `'both'` matches `'savoury'` or `'sweet'` at `+1.2`; `'savoury'`/`'sweet'` mismatch gets `-3.0`.
4. **Wild steering (`wild` in `0..100`):**
   Let `CLASSIC_CUISINES = new Set(['American', 'British', 'French', 'Italian', 'Spanish', 'Mexican', 'Indian', 'Japanese', 'Greek'])`.
   - **Classic (`wild <= 30`):** `+1.5` if `CLASSIC_CUISINES.has(dish.cuisine)`, `+0.5` if `dish.taste !== 'both'`. Pick the deterministic top scorer.
   - **Regional (`31 <= wild <= 70`):** `+1.2` if `!CLASSIC_CUISINES.has(dish.cuisine)` (surfaces Persian, Egyptian, Levantine, Moroccan, Peruvian, Korean, Thai, Georgian, Nordic dishes). Pick from top 2 using `seededRandom(seed)`.
   - **Unhinged (`wild >= 71`):** `+2.0` if `!CLASSIC_CUISINES.has(dish.cuisine)`, `+1.8` if `dish.taste === 'both'` (sweet-savoury surprises like *Pla Haeng Tangmo*, *Gibna wa Bateeikh*, *Duck a l'Orange*, *Pear Gorgonzola Risotto*). Pick from top 4 within `1.5` points of best using `seededRandom(seed)`.

### 2.3 Threshold and Fallback
- Set `MATCH_THRESHOLD = 4.0`.
- If `bestScore < MATCH_THRESHOLD`, fall back to the procedural template generator in `composable-dishes.md` (e.g. for wild clashing combos with 0 overlap on the requested course).
- **Mandatory table ingredient retention:** Every `id` in `tableIds` MUST appear in the final plated `DishIdea` (`heroes` stays `tableIds`). If the winning world dish only matched a subset of `tableIds` (e.g. `avocado + tomato + blueberries` matched *Mexican Guacamole*), slot the unmatched item (`blueberries`) as a touching accent/support inside the dish's layout so no user-chosen ingredient disappears.

---

## 3. Mapping `supportingComponents` to Render Components

Re-use existing `makeElement` forms (`pool`, `pour`, `butter:pastry`, `milk:pancake`, `baguette:cube`, `garlic:chip`, `herbLeaf`, `shaving`) and the §2.7 `ComponentKind`s from `composable-dishes.md` (`tart-shell`, `crumb`, `crouton`, `puree`, `smear`, `gel`, `foam`, `oil-dot`, `whipped-cream`, `quenelle`, `tuile`, `microherb`, `chip`, `shaving`, `pool`, `drizzle`).

Across all 236 dishes in `world-dishes.json`, the 502 descriptive `supportingComponents` strings normalize into the following **deduped render component set** (new builders needed in `src/dishes/compose/components.ts` are marked **NEW**):

| Canonical Render Component | Status | Example `supportingComponents` mapped |
|---|---|---|
| `pool` / `drizzle` / `oil-dot` | Existing + §2.7 | `beurre blanc pool`, `chimichurri drizzle`, `basil oil swirl`, `chili oil dots`, `maple syrup drizzle` |
| `microherb` / `herbLeaf` / `shaving` | Existing + §2.7 | `dill fronds`, `cilantro microherbs`, `parmesan shavings`, `lemon zest curls`, `nori strips` |
| `crouton` / `garlic:chip` | Existing + §2.7 | `crispy pita croutons`, `garlic croutons`, `crispy garlic chips`, `fried shallots` |
| `tart-shell` (`butter:pastry`) | §2.7 | `fluted tart shell`, `graham tart shell`, `golden phyllo crust`, `flaky pastry` |
| `whipped-cream` / `quenelle` / `foam` | §2.7 **NEW** | `whipped cream quenelle`, `vanilla ice cream quenelle`, `whipped egg foam cap`, `berry foam crown` |
| `smear` / `puree` / `crumb` | §2.7 **NEW** | `toum garlic smear`, `spiced spinach puree`, `toasted butter crumbs`, `walnut crumble` |
| `pancake-stack` | **NEW** (required) | `3-pancake stack`, `folded crepe stack`, `caramelized pancake pieces` |
| `flavoured-bread-side` | **NEW** (required) | `garlic bread`, `tomato-topped bread`, `cheesy gratin toast`, `crusty bread slices` (for `soup-bowl`) |
| `flatbread-wedge` | **NEW** (low poly) | `pita wedges`, `warm corn tortillas`, `naan wedge`, `injera flatbread` |
| `pasta-noodle-nest` | **NEW** (low poly) | `pasta ribbons`, `pasta shells`, `rice noodle nest` |
| `nut-seed-olive-cluster` | **NEW** (small scatter) | `pistachio slivers`, `black olives`, `barberry scatter`, `toasted sesame seeds`, `pomegranate seeds` |
| `spice-sugar-dust` | **NEW** (shader/fleck) | `sumac dust`, `cinnamon sugar dust`, `berbere dust`, `turmeric spiced oil`, `chili lime salt dust` |
| `sponge-biscuit-wedge` | **NEW** (from `butter:cake`) | `sponge cake base`, `almond cake wedge`, `golden biscuit crust`, `shortbread biscuit` |
| `ice-cube-cluster` | **NEW** (glass-drink) | `ice cubes`, `crushed ice` |

---

## 4. Non-Negotiable Owner Plating Rules

Enforce these rules in `composeLayoutPlan` regardless of which world dish is selected:

1. **One-line titles:** Dish `name` must be `<= 32` chars and render on a single line (add a vitest assertion checking every `world-dishes.json` `name.length <= 32`).
2. **Soups (`soup-bowl`):** Always use a big `deep-bowl` ware (distinct from `rice-bowl` celadon bowl and never a flat plate). Always render `flavoured-bread-side` on the side (`garlic` -> garlic bread, `tomato` -> tomato-topped bread, `cheese` -> cheese toast, otherwise crusty herb bread).
3. **Avocado ban on half/seed:** Never render an avocado half or pit/seed (`avocado:half` forbidden in composed dishes). Use `avocado:slice` (fanned), `avocado:cube`, or a smashed dome.
4. **Pancake stacks (`pancake-stack`):** Exempt from the flat-height ban via opt-in stack of 3-4 pancakes. Drizzle contrasting syrup on top (never the same fruit flavour as any chosen fruit on the table; default to maple/caramel/butterscotch when fruit is present).
5. **Toast boards (`toast-board`):** Always use 2 neat slices of toast (`baguette:toast*2`). All toppings must stay cleanly inside the toast footprint (no pieces sliding off onto the wood board).
6. **Salads (`leaf-salad`):** Render as a tossed, mounded nest of greens with croutons and toppings nestled inside, never splayed flat in a star shape.
7. **Rice bowls (`rice-bowl`):** Mixed rice with visible veg/herb flecks on a level surface (never a plain white mound or steep peak); lay sliced/torn chicken or salmon flat in the rice.
8. **Mash plates (`mash-plate`):** Mash uses a bright yellow-white palette (never muddy brown), shaped as a low wide dome with sliced/fanned toppings overlapping on top (never tiny cubes perched awkwardly).
9. **Tarts (`tart`):** Place `whipped-cream` / `quenelle` inside the centre of the tart shell, never hanging off the rim.
10. **Sauce on top & centred sparse plates:** Allow sauce drizzle ON TOP of supports/bases (keep seared salmon fillet top clear). Sparse compositions must sit centred on the plate, not drifted toward one edge.

---
## 5. Coverage Table (All 31 Pantry IDs)

Summary across **236 dishes** (**40 cuisines**, **13 regions**):
- **Courses:** `main` (95), `starter` (51), `dessert` (41), `snack` (25), `drink` (24)
- **Tastes:** `savoury` (145), `sweet` (62), `both` (29)
- **1-ingredient combinations:** **31/31** covered (minimum 7 hero dishes per ingredient, up to 53). **Zero** 1-ingredient combos have no match.
- **2-ingredient combinations:** **286/465** pairs co-occur directly inside a dish's `coreIngredients`. Under partial-overlap matching (`overlap >= 1` hero/core + fallback retention of the second item), **465/465** pairs return a valid dish. Of the **179** pairs with 0 direct co-occurrence:
  - **81** are cross sweet-fruit x savoury-protein/veg clashes (e.g. `apple + steak`, `strawberry + broccoli`, `blueberries + garlic`), intentionally handled via Wild partial-overlap or template fallback.
  - **98** are same-side or rare culinary combinations listed below.

### Per-Ingredient Coverage

| Pantry ID | Hero dishes | Core dishes | Courses covered | Tastes covered | Direct 2-ing pairs (of 30) |
|---|---|---|---|---|---|
| `apple` | 11 | 11 | dessert, drink, starter | both, sweet | 10/30 |
| `avocado` | 12 | 13 | drink, main, snack, starter | both, savoury, sweet | 16/30 |
| `baguette` | 31 | 36 | dessert, main, snack, starter | both, savoury, sweet | 22/30 |
| `blueberries` | 8 | 8 | dessert, drink | sweet | 7/30 |
| `broccoli` | 9 | 10 | main, starter | savoury | 16/30 |
| `butter` | 36 | 61 | dessert, main, snack, starter | both, savoury, sweet | 26/30 |
| `cabbage` | 12 | 12 | main, starter | both, savoury | 15/30 |
| `cheese` | 37 | 43 | dessert, main, snack, starter | both, savoury, sweet | 25/30 |
| `chicken` | 30 | 31 | main, snack, starter | both, savoury | 22/30 |
| `eggs` | 53 | 62 | dessert, drink, main, snack, starter | both, savoury, sweet | 27/30 |
| `garlic` | 32 | 63 | main, snack, starter | both, savoury | 24/30 |
| `grapes` | 9 | 9 | dessert, drink, main, snack, starter | both, sweet | 8/30 |
| `lemon` | 29 | 46 | dessert, drink, main, snack, starter | both, savoury, sweet | 27/30 |
| `lime` | 17 | 21 | dessert, drink, main, snack, starter | both, savoury, sweet | 20/30 |
| `milk` | 51 | 60 | dessert, drink, main, snack, starter | savoury, sweet | 29/30 |
| `mushroom` | 13 | 15 | main, snack, starter | savoury | 20/30 |
| `onion` | 26 | 75 | main, snack, starter | both, savoury | 27/30 |
| `orange` | 9 | 9 | dessert, drink, main, starter | both, savoury, sweet | 11/30 |
| `peach` | 9 | 9 | dessert, drink, main, snack, starter | both, sweet | 11/30 |
| `pear` | 7 | 8 | dessert, drink, main, snack, starter | both, savoury, sweet | 11/30 |
| `pepper` | 16 | 22 | main, snack, starter | both, savoury | 20/30 |
| `potato` | 24 | 24 | main, snack, starter | savoury | 22/30 |
| `rice` | 36 | 41 | dessert, drink, main, snack | both, savoury, sweet | 22/30 |
| `romaine` | 10 | 11 | main, starter | both, savoury | 17/30 |
| `salmon` | 14 | 14 | main, snack, starter | both, savoury | 15/30 |
| `sauce` | 11 | 20 | drink, main, snack, starter | both, savoury | 22/30 |
| `spinach` | 11 | 12 | drink, main, starter | both, savoury | 15/30 |
| `steak` | 19 | 19 | main, snack, starter | both, savoury | 20/30 |
| `strawberry` | 10 | 11 | dessert, drink | sweet | 8/30 |
| `tomato` | 34 | 42 | drink, main, snack, starter | both, savoury | 25/30 |
| `watermelon` | 9 | 9 | drink, snack, starter | both, sweet | 12/30 |

### 2-Ingredient Combos with 0 Direct Co-Occurrence (Non-Clashing / Rare Pairs: 98 of 465)

(All 81 sweet-fruit x savoury pairs also have 0 direct co-occurrence and are served via partial-overlap hero matching or the template generator at high Wild.)

- `apple` + `avocado`, `baguette`, `blueberries`, `cheese`, `lime`, `peach`, `pear`, `rice`, `sauce`, `strawberry`, `watermelon`
  - `avocado` + `blueberries`, `broccoli`, `butter`, `cabbage`, `grapes`, `mushroom`, `orange`, `peach`, `pear`, `pepper`, `spinach`, `strawberry`, `watermelon`
  - `baguette` + `blueberries`, `broccoli`, `cabbage`, `lime`, `orange`, `pear`, `spinach`
  - `blueberries` + `grapes`, `lime`, `orange`, `peach`, `pear`, `rice`, `sauce`
  - `broccoli` + `lime`, `romaine`, `salmon`, `spinach`
  - `butter` + `grapes`, `romaine`, `watermelon`
  - `cabbage` + `cheese`, `lime`, `pepper`, `romaine`, `salmon`, `spinach`
  - `cheese` + `lime`, `salmon`, `strawberry`
  - `chicken` + `salmon`, `steak`
  - `eggs` + `grapes`, `salmon`, `watermelon`
  - `grapes` + `lime`, `orange`, `peach`, `pear`, `rice`, `sauce`, `strawberry`, `watermelon`
  - `lemon` + `orange`, `steak`, `strawberry`
  - `lime` + `peach`, `pear`, `spinach`
  - `milk` + `romaine`
  - `mushroom` + `romaine`
  - `orange` + `peach`, `pear`, `rice`, `strawberry`
  - `peach` + `pear`, `rice`, `sauce`, `watermelon`
  - `pear` + `sauce`, `strawberry`, `watermelon`
  - `pepper` + `spinach`
  - `potato` + `spinach`
  - `rice` + `romaine`, `strawberry`, `watermelon`
  - `romaine` + `salmon`, `spinach`
  - `salmon` + `sauce`, `spinach`, `steak`
  - `sauce` + `strawberry`, `watermelon`

---

## 6. Acceptance Checks

Add tests in `src/dishes/compose/pick.test.ts` and `src/dishes/compose/qa.test.ts`:

1. **Data integrity:** Every entry in `world-dishes.json` has `name.length <= 32`, zero em/en dashes, valid `course` and `taste`, all `heroes` and `coreIngredients` present in `src/ingredients/registry.ts`, and `layout` matching `LAYOUTS`.
2. **1-ingredient coverage:** For every one of the 31 pantry ids, `pickDish([id], DEFAULT_CHOICES, seed)` returns a named world dish (never a bare ingredient name like `"Apple"` or `"Avocado"`).
3. **Key combo checks:**
   - `['watermelon', 'cheese']` + Starter + Both -> *Gibna wa Bateeikh*
   - `['spinach', 'eggs']` + Main + Savoury -> *Nargesi Esfenaj*
   - `['avocado', 'tomato']` + Starter + Savoury -> *Mexican Guacamole* (with no half avocado or seed rendered)
   - `['potato', 'tomato']` + Soup/Starter or `['tomato', 'baguette']` -> `soup-bowl` in `deep-bowl` with flavoured bread on side
   - `['blueberries', 'milk']` + Dessert -> *Blueberry Pancakes* in `pancake-stack` with non-blueberry syrup
   - `['apple']` + Drink -> *Spiced Apple Cider* in `glass`
4. **Wild effect:** For `['watermelon', 'salmon', 'onion']` or `['chicken', 'rice']`, `wild = 0` vs `wild = 100` selects distinct dishes/cuisines.
5. **Plating QA:** Run `qa.test.ts` across 50 random world-dish picks: `apart === 0`, `floating === 0`, `towering === 0` (except `pancake-stack` opt-in), `lost === 0`, `widestGap <= 0.5`.
