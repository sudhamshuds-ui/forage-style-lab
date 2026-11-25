# Composable dishes

A handoff spec for Claude Code. Read-only context: the Forage repo (`src/`, `docs/dishes/`). Do not invent geometry APIs or image models. Anything marked **NEW** is to be added; everything else already exists.

## 0. The goal

The Kitchen must do this: the user drops any 1, 2 or 3 pantry ingredients on the table, sets Course / Taste / Wild, presses Cook, and gets a dish that **looks like a dish** — one plated composition, not three ingredients dropped onto a plate.

Today that fails in two ways:

1. `cook()` in `src/kitchen/main.ts` ignores the table and `CookChoices`, and always reveals `DISHES[0]` (the hand-built salmon and peach).
2. The 100 catalogue dishes are each a 1:1 rebuild of a Figma-generated painting (`TRACES` in `src/dishes/compose/traces.ts`). Many read as separate pieces: `docs/dishes/qa.md` reports **61 of 100** failing cohesion or physics (apart, floating, overlap > 1 cm, still moving, lost). The owner: the refs have good plating, "right now it feels like just seperate ingredient pieces on the plate." Texture also drifted heavy, away from the pantry's washed gouache.

This spec replaces "one painting, one dish" with **roles + layouts**. A layout is a plating recipe (ware, layer order, slot geometry, cohesion contracts). Roles decide which ingredient fills which slot. The existing composer still builds the 3D: no new renderer, no AI model.

**Success is:** every random pantry combination plus every Course / Taste / Wild setting yields a *varied* (seeded) but *intentionally plated* dish that passes the acceptance checks in §3 and §5. Variety comes from the seed and from Wild, never from loosening cohesion.

### Revision (2026-11-25, after the artifact test)

The owner tested a prototype. Screenshots in `/workspace/forage-artifact-shots/`; the paste-ready fix brief is `/workspace/forage-specs/fix-list.md`. These rules **supersede** earlier ones where they conflict.

1. **Pieces rest flat on the plate.** The common failure is a tower or tumble (salmon+pepper+avocado: supports standing on edge and stacked). Default: low profile, settled on the ware or sauce, no stacking unless a layout deliberately opts in (toast toppings, tart filling, a low fry bunch, a quenelle on a smear). See §3.0 rule 9 and `towering` QA.
2. **Chosen ingredients are the stars of a complete dish, not the entire dish.** The generator adds supporting components from a library (tart shells, whipped cream, quenelles, crumbs, purees, smears, gels, tuiles, foams, oil dots, microherbs, and so on). One apple + Dessert becomes an apple tart with cream, not "Apple" on berry sauce. Library components never go in `heroes`. See §2.7.
3. **Course and Wild must be visible.** Drink always produces a glass (apple + Drink is a juice or cider, not wedges on a plate). Wild 0 vs 100 must change archetype, cuts, counts, or components in a way a person can see. Do not apply `pool:berry-sauce` to every fruit-led dish.
4. **Forms:** mixed rice (not a plain white mound); chicken as slices, torn pieces, or drumsticks (cubes only for skewers/stews); pepper as multiple cut pieces (strips, charred halves, slices), never a single smooth blob; avocado flesh is creamy yellow-green (`#f4ee9a` core), never cucumber-mint. Savoury dishes need more variety of forms and garnishes.

## 1. How it plugs into the composer

The pipeline already ends in a `DishIdea` (`src/dishes/catalog.ts`) that `composedDish()` (`src/dishes/compose/build.ts`) turns into a `Dish` / `IngredientEntry`. The Kitchen already paints that entry with the Style Lab's `StylizedLook` + `Painter` (`src/kitchen/main.ts`).

What is missing is the first step. **NEW:**

```ts
// src/dishes/compose/pick.ts  (NEW)
function pickDish(ids: string[], choices: CookChoices, seed: number): DishIdea
```

Wire:

```
table ids (1–3, from staying()) + cookPanel.choices() + seed
        → pickDish()                         // NEW
        → DishIdea
        → composedDish(idea)                 // existing
        → cook() swaps the card to that dish // edit src/kitchen/main.ts
```

`pickDish` always returns a `DishIdea`. It never throws, never returns the salmon stand-in, never requires a trace in `TRACES`. Catalogue entries and Batch 1 hand-built forms are *references* for layout design and a Classic-mode preference when they exactly match; they are not the runtime path for unmatched (almost all) combinations.

Runtime plans must come from a layout-aware planner, not from `traces.ts`. Today `planFor()` uses a trace when one exists and otherwise `composePlan()` (`src/dishes/compose/layout.ts`). Generated ideas have no trace, so they already fall through to `composePlan`. `composePlan`'s generic ring is part of the "dropped on the plate" problem (medium pieces parked out on an arc, often > 1 cm from neighbours). Layouts in §3 tighten that planner.

`CookChoices` already exists in `src/kitchen/panel.ts`:

```ts
interface CookChoices {
  course: string; // 'Starter' | 'Main' | 'Dessert' | 'Snack' | 'Drink'
  taste: string;  // 'Savoury' | 'Sweet' | 'Both'
  wild: number;   // 0–100, Classic → Unhinged
}
```

`onCook` already passes choices; `main.ts` currently discards them (`onCook: () => cook()`). Use the choices.

Seed: hash of sorted ids + course + taste + a cook attempt nonce, so the same table can be cooked again at the same Wild and land a different valid plating, and the same seed rebuilds the same dish. Use `seededRandom` from `src/ingredients/forms/kit/random.ts`, the same helper `composePlan` and `composedBuilder` already use.

---

## 2. Ingredient roles

### 2.1 Slot taxonomy

These are *composition slots* on a plate, not pantry categories. A layout names which slots it uses; `pickDish` fills them from the table.

| Slot | What it is | DishIdea field | Typical forms |
|---|---|---|---|
| **hero** | One main element (or a tight group of the same element). Off centre, near the golden spot. The eye lands here. | `big` | fillet, steak, drumstick, toast, egg, mash, a fan/heap of one form |
| **support** | The generous bunch beside or around the hero. This is what gives volume. | `medium[]` | fries, cubes, halves, wedges, slices, berries, leaves |
| **accent** | Small sharp notes that punctuate, never dominate (citrus wheels, a few berries, onion rings). | `small[]` | wheel, wedge, berry, chip, crumble, half |
| **base** | What the food sits *in*: rice, a leaf bed, mash, soup. | `base` (`rice`, `leaves:…`, `mash:…`, `soup:…`) | not a loose piece |
| **sauce** | Two parts: a **pool under** the food (unifies the plate) and a **drizzle or pour on top** after the mains are down, so it reads as one dish. | `base` as `pool:…` for the under-pool; drizzle/pour is applied at build time (see §3 layer order) | `pool` / `pour` / skin `drizzle` |
| **garnish** | Last layer: shavings and chopped herbs over and around the food, not out on the bare rim. Auto-added. Never a hero. | `small` herbs, plus the shaving/herb pass in `composedBuilder` | `herb`, `shaving_*`, `garlic:chip` |
| **liquid** | The drink in a glass. Mutually exclusive with a plated hero. | `base` as `drink:…`, `ware: 'glass'` | drink column + glass (already in `build.ts`) |

The owner's layering lesson, reconciled with `docs/dishes/lessons.md` (2026-11-25):

> Approach dishes in terms of layers. A pool under the food is the ground; then the main ingredients; then the support bunch; then sauce on top; then garnish. An empty plate is not food.

Auto-added supports (herb, under-pool, shavings, a drizzle) **never become the hero** and never replace a table ingredient in `heroes`.

### 2.2 Category (how an ingredient wants to be used)

Each pantry item also has a *category*, used only to pick a slot and a layout. Categories are not painted and do not appear in `DishIdea`.

`protein` | `produce` | `starch` | `dairy` | `leafy` | `liquid` | `condiment`

### 2.3 Trait record  — **NEW** `src/ingredients/traits.ts`

```ts
import type { FamilyId } from './families';

/** Composition slots a pantry ingredient is allowed to fill. */
export type DishSlot = 'hero' | 'support' | 'accent' | 'base' | 'sauce' | 'garnish' | 'liquid';

export type IngredientCategory =
  | 'protein' | 'produce' | 'starch' | 'dairy' | 'leafy' | 'liquid' | 'condiment';

export type Taste = 'savoury' | 'sweet' | 'both';

/**
 * Forms listed here must already be buildable by makeElement()
 * (src/dishes/compose/elements.ts) or by its cutElement default
 * (half | wedge | wheel | slice | cube) for ingredients that have a BODY
 * in layout.ts. Do not list Style Lab planned forms (zest, melted, minced,
 * flaked, …) — those are not builders.
 */
export interface IngredientTraits {
  id: string;                         // registry id, src/ingredients/registry.ts
  category: IngredientCategory;
  taste: Taste;
  /** Preferred slot, then the others it may take. First is the default. */
  slots: DishSlot[];
  /** Allowed makeElement forms, by the slot they are used in. */
  forms: Partial<Record<DishSlot, string[]>>;
  /** Family on a raw or fresh cut. */
  family: FamilyId;
  /** Family when the dish is cooked (isCooked() in build.ts). Same as family if it does not change. */
  cookedFamily: FamilyId;
  /** Default SEARED amount (elements.ts) when the dish is cooked; 0 if it should stay fresh. */
  sear: number;
  /** When true, this ingredient on the table becomes the base (rice, leaves, milk, sauce). */
  prefersBase?: boolean;
  /** Hard bans. garlic must never use whole / half / bulb. */
  forbiddenForms?: string[];
}
```

`BODY` in `layout.ts` is missing `blueberries`, `broccoli`, `grapes`, `romaine`, `spinach`, `sauce`. Do not send those through `cutElement` defaults. Use only the special-cased forms in the table below. Fill `BODY` only if you add a new cut form for one of them.

### 2.4 Full pantry table (all 31 registry ids)

Forms are only those `makeElement` already supports. Special-cased forms are marked with a star. Others go through `cutElement` (`half`, `wedge`, `wheel`, `slice`, `cube`) and have a `BODY` size.

`sear` values match `SEARED` in `elements.ts` where one exists; `salmon:fillet` uses its own skin (`seared: 0.95`) and `cooked-salmon`.

| id | category | taste | slots (preferred first) | forms by slot | family → cookedFamily | sear | notes |
|---|---|---|---|---|---|---|---|
| `steak` | protein | savoury | hero, support | hero: `steak`\*; support: `cube`, `skewer`\* | `beef` → `rare` | 0.55–0.9 | Saturated pink inside, thinner crust (lessons, 2026-11-25). |
| `salmon` | protein | savoury | hero, support, accent | hero: `fillet`\*; support: `slice`\*, `cube`, `skewer`\* | `salmon` → `cooked-salmon` (fillet) or `salmon` (raw slice/cube) | 0.95 on fillet | Cooked body is pale pink-white, never raw orange. |
| `chicken` | protein | savoury | hero, support | hero: `drumstick`\*, **NEW** `slice`, **NEW** `torn`; support: `skewer`\*; `cube` only in stew/skewer | `poultry` → `poultry` | 0.5–0.97 | Bones browned. Never default to cubes in a bowl. Slices/torn pieces lie flat in the rice or beside the hero. |
| `eggs` | protein | savoury | hero, support | hero: `egg`\*, `omelette`\*; support: `half` | `eggshell` / `albumen`+`yolk` | 0 | Fried egg is a soft white, no browned lace. |
| `potato` | starch | savoury | support, hero, base | hero: `mash`\*, `whole`\*; support: `fries`\*, `wedge`\*, `cube`, `wheel`; base: `mash:potato` | `potato` → `fries` or `mash` or `potato` | 0.45 | Fries are thick cuts, golden-bright, in a *bunch*. Never a lonely wedge. |
| `rice` | starch | savoury | base, support | base: `rice` (deep ware, **mixed**: warm `cooked-rice` with veg/herb flecks, not a plain white mound); support: `mash` | `rice` → `cooked-rice` | 0.8 | Prefers base. Toppings sit in a level bowl, not on a peak. |
| `baguette` | starch | savoury | hero, support | hero: `toast`\*; support: `cube` (croutons) | `baked` / `crumb` | 0.7 | A slice, not a turned tube. |
| `broccoli` | produce | savoury | support, hero | hero/support: `whole`\* only | `green` + `pale-green` + `leaf` | 0.35 | No cut-body. Two heads as a pair is enough volume. |
| `apple` | produce | both | hero, support, accent, liquid | hero/support: `wedge`, `slice`, `half`; accent: `cube`, `slice`; liquid: juiced as `drink:…` (cider/juice) | `red` / `apple-flesh` | 0 | Alone + Dessert: tart with cream and a quenelle, not wedges on berry sauce. Alone + Drink: a glass. |
| `pear` | produce | sweet | hero, support | hero: `half`; support: `slice`, `cube` | `pear` / `pear-flesh` | 0.4 when roasted | Lengthwise half lies on its back. |
| `peach` | produce | sweet | hero, support, accent | hero/support: `wedge`, `half`; accent: `cube`, `slice` | `peach` / `peach-flesh` (`peachCube` for cubes) | 0.5 when seared | Smooth body, soft edges, flesh fades into skin. |
| `orange` | produce | both | accent, support, liquid | support/accent: `wheel`; liquid: `drink:orange` | `orange` / `orange-flesh` | 0 | |
| `lemon` | produce | savoury | accent, liquid, hero | accent: `wedge`, `wheel`; liquid: a citrus cooler; hero only when it is the sole table item | `yellow` / `lemon-flesh` | 0 | Alone + Starter: a composed citrus plate (citrus oil, wheels, microherbs), never default berry sauce. |
| `lime` | produce | savoury | accent, liquid, hero | accent: `wedge`, `wheel`; liquid: `drink:green`; hero only when it is the sole table item | `lime` / `lime-flesh` | 0 | Thin wheels. Alone: composed citrus plate or a cooler, not lumps in berry sauce. |
| `strawberry` | produce | sweet | support, accent, hero, liquid | hero/support: `half`; accent: `slice`; liquid: `drink:strawberry` | `crimson` / `berry-flesh` | 0 | |
| `watermelon` | produce | both | support, hero, liquid | support/hero: `cube`; liquid: `drink:watermelon` | `melon` | 0.28 if "seared tuna" | Cubes in a heap, not one cube. |
| `tomato` | produce | savoury | support, accent, base, liquid | support: `half`, `wedge`, `wheel`; base: `soup:tomato`, `pool:tomato-sauce`; liquid: `drink:tomato` | `tomato` / `tomato-flesh` | 0.35 if roasted | Cooked tomato should slump, not look raw. |
| `onion` | produce | savoury | accent, support | accent/support: `wheel`\* only | `onion` / `onion-flesh` | 0 | Rings, never a whole bulb as hero. |
| `pepper` | produce | savoury | support, accent, hero | support/hero: `slice`\*, `half` (charred when cooked), **NEW** `strip`, **NEW** `dice`; **forbidden as the only form: `whole`** | `pepper` / `pepper-flesh` | 0.4 | Always multiple pieces (typically 5–7 strips or a pair of charred halves). Never a single smooth blob. |
| `avocado` | produce | savoury | support, hero, liquid | hero: `half`\*; support: `slice`; liquid: `drink:avocado` | `avocado` / `avocado-flesh` (core `#f4ee9a`, skin `#3e5a26`) | 0 | D-shaped fan or a half with pit, lying flat or shallow-shingled. Flesh is creamy yellow-green, **never cucumber-mint**. |
| `grapes` | produce | both | support, accent, liquid | support/accent: `berry`\* only; liquid: `drink:grape` | `grape` | 0 | Heaps, odd counts. No cut-body. |
| `blueberries` | produce | sweet | support, accent, liquid | support/accent: `berry`\* only; liquid: `drink:blueberry` | `blueberry` | 0 | Heaps. No cut-body. |
| `mushroom` | produce | savoury | support, hero | support/hero: `half`\*, `slice`\* | `mushroom` | 0.6 | Seared, not grill-bar char. |
| `cabbage` | leafy | savoury | base, hero, support | base: `leaves:cabbage`; hero: `wedge`; support: `leaf`\*, `roll`\* | `cabbage` / `cabbage-flesh` | 0.85 on a seared wedge | Leaf beds are a base, not a single leaf dropped on the plate. |
| `spinach` | leafy | savoury | base, accent, support | base: `leaves:spinach`; support/accent: `leaf`\* only | `spinach` | 0 | No cut-body. |
| `romaine` | leafy | savoury | base | base: `leaves:romaine` only | `romaine` | 0 | No piece form today (`makeElement` has no `romaine:leaf`). If romaine is on the table it *must* become the leaf bed. Do not invent a bulb. |
| `cheese` | dairy | both | support, accent, hero | hero: `wedge`\*; support: `slice`\*; accent: `crumble`\*; dessert hero: `cake`\* | `cheese` | 0 | Savoury Main: a low plated wedge or melted pool, not a tall upright "cheese cake" unless Course is Dessert. |
| `butter` | dairy | both | sauce, accent, base | accent: `cube`\*, `crumble`\*; sauce/base: `pool:brown-butter`; dessert: `cake`\*, `pastry`\* | `butter` / `brown-butter` | 0 | A pat can sit as accent; a pool is usually better. |
| `milk` | dairy / liquid | both | base, liquid, hero | base: `pool:cream`, `milk:mash`\*; hero (sweet): `pancake`\*, `mash`\*; liquid: a pale drink | `milk` / `cream` | 0 | Prefers base or drink. |
| `sauce` | condiment | savoury | sauce | sauce only: `pool:chili` (or drizzle) | `sauce` / `chili-oil` | 0 | **Never a hero, never a modelled bottle.** On the table it becomes the under-pool and the on-top drizzle. |
| `garlic` | condiment | savoury | garnish, accent | accent/garnish: `chip`\* only | `garlic-chip` | 0.5 | **Forbidden: `whole`, `half`, any bulb.** Lessons 2026-11-25: "never show garlic bulb anywhere from now onwards." Always a scatter of crisp golden chips. |

Hero-priority when several table ingredients could be the hero, highest first:

1. `steak`, `salmon`, `chicken`, `eggs`
2. `baguette` (if layout is toast-board), `potato` (if mash/rösti), `cheese` (if a wedge or cake)
3. Substantial produce: `peach`, `pear`, `apple`, `avocado`, `watermelon`, `pepper`, `mushroom`, `cabbage` (wedge), `broccoli`, `tomato`
4. Berries and soft fruit as a *heap* hero only when nothing above is present: `strawberry`, `grapes`, `blueberries`
5. Never hero: `garlic`, `sauce`. `lemon` and `lime` are heroes only when they are the only table item (a composed citrus starter, or a drink). `romaine` is never a piece hero; it becomes the base and another table ingredient is promoted. If romaine is alone, complete the plate with a library smear or oil and microherbs over a generous leaf bed — still one composed dish, not a single leaf.

### 2.5 Resolving 1, 2 or 3 table ingredients into slots

Input: unique registry ids, length 1–3 (Kitchen `MAX_ITEMS`). Output: filled slots + `heroes` on the `DishIdea`. `heroes` is typed as a 3-tuple today; for 1 or 2 items, repeat the last id or pad with the same ids so the field stays valid, and treat only the real table ids as heroes in copy and in "never replace the hero" rules. Prefer tightening the type later to `string[]` of length 1–3; until then, do not invent a fourth pantry item to pad the tuple.

**Shared rules**

- Every table ingredient appears in the dish, in a slot its traits allow, in a form `makeElement` supports.
- Table ids are the **heroes / stars**. The generator then adds supporting **library components** (§2.7) so the result is a complete, servable dish. Components never go in `heroes` and never outshine the hero. A pool, herbs, and shavings alone are not enough, especially for one-ingredient cooks.
- `sauce` on the table → `base: 'pool:chili'` (or tomato-sauce if a tomato is also present) plus an on-top drizzle. Not a bottle. Do **not** default to `pool:berry-sauce` for every fruit or dessert; pick the sauce from the archetype, taste, and the actual heroes (citrus-oil for lemon/lime, chili or the table sauce when present, jus/cream/brown-butter/herb-oil for proteins, a specific caramel or fruit sauce for an apple tart, berry-sauce only when a berry is a hero or the archetype is a berry dessert).
- `garlic` on the table → `garlic:chip` in accent/garnish, a handful (5–8+), never one chip and never a bulb.
- `romaine` / `spinach` / `cabbage` with `prefersBase` or a salad/slaw layout → `leaves:…` base. Cabbage may instead be a seared `wedge` hero on a non-salad layout.
- `rice` prefers `base: 'rice'` and `ware: 'deep'`.
- Counts are odd for accents (3, 5). Supports that exist to make volume (`fries`, `cube`, `berry`, chips) use *generous* counts (see each layout). One lonely cube or two fries is how a plate reads as "dropped."

**One ingredient.** It is the hero (or the base, if it prefers base). Course picks a complete archetype, and the library fills the rest of a fine-dining plate. Never title the dish with the bare ingredient name ("Apple", "Lemon").

- `apple` + Dessert → apple tart: tart shell, fanned `apple:slice`, whipped cream, a quenelle of ice cream or cider cream, a modest caramel or apple-sauce smear.
- `apple` + Drink → apple juice or cider in a `glass`, one apple wheel touching the glass.
- `lemon` or `lime` + Starter → a composed citrus plate (citrus oil or a pale sauce, wheels/wedges, oil dots or a cheese crumb, microherbs), not lumps in berry sauce.
- `steak` + Main → sliced `steak:steak` in jus or brown-butter, a library puree or oil dots, chips, herbs — still low and plated.
- `potato` + Main → a bunch of `potato:fries` or a `potato:mash` with a golden top, plus a library sauce and garnish, not one whole potato on a bare plate.
- `rice` + Main → a *mixed* rice bowl, glaze, herbs; if nothing else is on the table, add a library component (oil, egg is not allowed unless eggs were chosen — use chips, herbs, a pickle-like accent or a puree swirl, not a fake second pantry hero).
- `milk` + Drink → a pale glass; + Dessert → pudding or pancake with a quenelle or fruit-free cream component.
- `cheese` + `sauce` + Main, Savoury → a low plated wedge or melted pool in chili oil, chips, herbs — not a tall upright "cheese cake" unless Course is Dessert.

**Two ingredients.** Assign hero by the priority list, biased by Course/Taste (Dessert promotes sweet produce and dairy; Drink promotes `liquid` slots; Snack promotes `baguette` toast). The other becomes support if it can, else accent, else base.

- `steak` + `potato` → hero steak, support fries (the steak-frites layout).
- `salmon` + `rice` → mixed rice base, salmon slices or a small fillet as hero (rice-bowl). Cubes only if the archetype is poke and they sit *in* the rice as a low heap.
- `chicken` + `rice` → mixed rice, sliced or torn chicken or a drumstick in the bowl, never three cubes on a white peak.
- `baguette` + `avocado` → toast hero, avocado slices as support (toast-board).
- `romaine` + `eggs` → leaf bed + eggs hero.
- `lime` + `sauce` → sauce is the pool; lime wheels are the hero group (the condiment cannot be hero).

**Three ingredients.** Hero, support, accent (or hero, support, base). Typical: protein hero, starch/produce support, citrus/allium/berry/cheese accent. If the third prefers base (`rice`, leafy, `milk`), give it the base and treat the other two as hero + support.

**Conflicts**

| Situation | Resolution |
|---|---|
| Two or three proteins | Highest priority is hero (or Course picks: breakfast/snack may prefer `eggs`). The others become support as `cube` / `slice`, never a second giant steak beside the first. |
| No natural hero (e.g. `lime` + `garlic` + `sauce`) | Promote the most substantial allowed piece (`lime` wheels) to hero; `sauce` is the pool; `garlic` is chips. |
| Two leafies | One becomes the `leaves:` base; the other, if it has a piece form (`spinach:leaf`, `cabbage:leaf` or `wedge`), is support. Two bases are not allowed. |
| Two starches (`potato` + `rice`, `baguette` + `potato`) | Layout decides: rice-bowl puts rice under and potato as roast cubes/wedges; toast-board puts bread under and potato off the board as a small bunch, or skip toast and use mash-plate. Never two competing centres. |
| Taste clash (steak + blueberries + Dessert, or steak + Sweet) | Still cook it. Prefer a layout that can hold the clash (circular-plate with a berry accent and a dark glaze), rather than refusing. Wild may lean into it; Classic stays closer to a known catalogue pairing if one exists. |
| Drink course | Always `glass-drink`. Juice or blend the juiciest table item (`apple`, `pear`, `peach`, citrus, berries, melon, tomato, spinach, avocado, milk, even `pepper` as a cooler). Add a `drink:*` family (`BASE_FAMILY` in `elements.ts`, or a close existing one). A wheel or half of the fruit touches the glass. If the only hero is a protein with no sensible drink, a savoury cordial or consommé-style glass is allowed; a dinner plate of wedges is not. |
| Ingredient has no form for the chosen slot | Step down to the next allowed slot/form. Never emit a form `makeElement` cannot build. |

### 2.6 Naming

**NEW** `titleDish(idea, slots)`: a short catalogue-style title for the *dish*, as the catalogue does ("Steak frites with garlic butter", "Apple tart with cream"), and a one-sentence description for the card. Never use a bare ingredient name as the title ("Apple", "Lemon"). Use the hero's cooked/cut words (seared, roast, soft, charred only when the layout really chars a cabbage wedge). Do not list every library component in the title. UI copy: no em dashes (project rule in `CLAUDE.md`).

### 2.7 Supporting component library  — **NEW** `src/dishes/compose/components.ts`

The 1–3 table ingredients are the stars of a real dish, not the only things on the plate. `pickDish` attaches a list of `DishComponent`s from this library, chosen by archetype, course, taste, and seed. One-ingredient cooks must add enough components to read as a complete fine-dining plate (a tart with cream and a quenelle, a composed starter with a smear and oil dots, a drink in a glass with a garnish).

```ts
export type ComponentKind =
  | 'tart-shell' | 'crumb' | 'crouton'
  | 'puree' | 'smear' | 'gel'
  | 'foam' | 'oil-dot'
  | 'whipped-cream' | 'quenelle'
  | 'tuile' | 'microherb' | 'chip' | 'shaving'
  | 'pool' | 'drizzle';

export interface DishComponent {
  kind: ComponentKind;
  family: FamilyId;
  role: string;
  count: number;
  place: 'under' | 'beside' | 'on-hero-allowed' | 'on-base' | 'dots-around';
}
```

Reuse existing builders where they already work: `pool`, `pour`, `butter:pastry`, `butter:crumble`, `butter:cake`, `milk:mash`, `milk:pancake`, `cheese:cake`, `baguette:cube`, `garlic:chip`, `herbLeaf`, `shaving`. Add **NEW** `makeComponent` (or extend `makeElement`) only for kinds with no form yet: `quenelle`, `smear`, `tuile`, `gel`, `whipped-cream`, a foam dollop, `oil-dot`, `microherb`, and a `tart-shell` if `butter:pastry` is not a believable case.

Components follow the same painted-look rules (§4) and the same cohesion rules (§3.0). A quenelle or whipped-cream dollop may sit *on* a tart or smear (`on-hero-allowed` / `on-base`). Tuiles may lean slightly by design. Nothing else may tower.

Extend `DishIdea` with **NEW** optional fields `archetype: string` and `components: DishComponent[]`. `heroes` remains the table ids only.

---

## 3. Layouts

A layout is a plating contract. **NEW** `src/dishes/compose/layouts.ts` exports `LAYOUTS: LayoutSpec[]` and `pickLayout(...)`.

`composePlan` (or a **NEW** `composeLayoutPlan(idea, layout, seed)` that `planFor` calls for untraced ideas) must place pieces from these contracts, not from a generic 62/38 ring. The generic ring is what makes random dishes look dropped.

Shared geometry vocabulary, from `WARE_PLAN` in `layout.ts` (cm, top view, x right, z toward camera):

| ware | plate R | well | reach `R` |
|---|---|---|---|
| `plate`, `slate` | 13.5 | 8.2 | 9.4 |
| `bowl` | 12.5 | 4.5 | 7.4 |
| `deep` | 6.6 | 4.2 | 4.6 |
| `board` | 15 | 11 | 10.5 |
| `round` | 14 | 12 | 10 |
| `glass` | 13.5 | 3.6 | 10 |

Golden spot: offset the hero's middle toward `(-0.32, +0.12) * (R / φ²)`, as `composePlan` already does. Broken symmetry: odd counts, never a mirror. Circular plating: a round base centred or on the golden circle; the rest rings the hero *and touches it*.

### 3.0 Cohesion rules (every layout, non-negotiable)

These exist to kill the "dropped onto the plate" look. They are more specific than today's QA, and they are acceptance checks, not suggestions.

1. **One centre.** All food footprints sit inside the ware's `reach`, clustered around the hero. There is a single visual centre. A second pile on the opposite rim is a fail, unless the layout is toast-board (food lives on the toast) or skewer-platter (two or three skewers as *one* overlapping bundle).
2. **Touch, don't orbit.** Every support and accent piece is within **0.5 cm** of the hero cluster or of another piece that already touches that cluster, seen from above. "Apart" in QA is already > 1 cm from *any* neighbour; generated dishes should land closer, so the food reads as one mass. Chunks (cubes, florets, halves) are packed so footprints *just touch*, at about **1.25 × width** as in lessons (tighter and they tower under `Table.rest`). Flat pieces (slices, wheels, leaves) may shingle.
3. **Layer order is fixed:**
   1. ware
   2. base (under-pool, leaf bed, rice, soup, mash)
   3. hero
   4. support bunch
   5. accents that are food (wheels, chips) slid `clearOf` the hero
   6. **sauce on top** — a `drizzle` on the relevant skins and/or a short `pour()` ribbon (`src/dishes/kit/pour.ts`) over the support and the pool, not a second puddle on empty porcelain. (Exception: the salmon-fillet lesson, "no sauce on the salmon's top": keep a seared hero top mostly clear; pour around it and over the support.)
   7. garnish last: 40–50 gold/yellow/white shavings and ~18 chopped herbs *over and around the food*, never only on the bare rim (`composedBuilder` already does this; keep it, and skip on `ware === 'glass'`).
4. **Volume before new elements.** If the plate still has a large empty well after the hero, add more pieces of the *support* (more fries, more cubes, more berries), not a new kind of object. Lessons: "add a lot of them in a bunch to create volume."
5. **Negative space is a crescent**, a quiet margin between the food mass and the rim, not gaps *between* pieces. On a dinner plate the food mass should occupy roughly the well (~8 cm) plus a little, not three islands.
6. **Colour count.** At most four food colour families in the mains (hero, support, accent, pool), plus herbs/shavings. Do not add a fifth garnish colour.
7. **Physics QA, existing thresholds** (`src/dishes/compose/qa.test.ts` and `docs/dishes/qa.md`):
   - `apart === 0` (no piece > 1 cm from its nearest neighbour)
   - `floating === 0`
   - `deepest <= 1` cm overlap
   - `restless === 0` (everything at rest)
   - `lost === 0` (nothing flung off the ware)
8. **Intentional-plating extras** to add as checks on generated dishes (**NEW** fields on `Cohesion` or a sibling report):
   - `widestGap <= 0.5` cm for generated dishes (tighter than the 1 cm "apart" line)
   - every support/accent piece's centroid is within `heroReach + ownReach + 0.5` of the hero centroid
   - garnish samples: at least 70% land over food or pool, not over empty rim
   - `towering === 0`: a piece towers if it stands on an edge or point (up-axis more than ~35° from world-up, for forms that should lie flat: wheels, slices, strips, fillets, halves, wedges) or its centroid is more than `ownHeight + 0.4 cm` above the ware/sauce/base under it, or it is primarily resting on another loose piece outside an opt-in stack
   - `maxFoodHeight` stays in a low-profile band for `circular-plate`, `leaf-salad`, and `glass-drink` (a fillet plus a shallow shingle is fine; an 8–10 cm support pile is not)
9. **Rest flat. No accidental stacks.** This is the common failure from the artifact test (salmon+pepper+avocado was a leaning tower, not a plated dish). Planner footprints sit *beside* the hero, never at the same `(x, z)`. Spawn each piece above the floor under its own footprint; settle with a little slide and strong damping (lessons in `docs/dishes/lessons.md`: never stack on a height grid of neighbours; chunks closer than ~1.25 × width become towers; pieces locked straight down stand on their edges). After each layer, replate any piece that fails the `towering` test, laying it flat at the nearest free touching position, or count it `lost`. Leaves drape. Pieces that slip the rim are replated straight down, never left on the table. Stacking is allowed only when a layout **opts in**, and then only as a *low* planned stack: toast toppings on toast, fruit on a tart shell, a two-layer fry bunch, a quenelle on a smear. Accidental towers are always a bug.
10. **No garlic bulbs. No ugly undersides.** Follow `docs/dishes/lessons.md`.

Seeded variation may change counts (inside the ranges below), angles, which side of the hero the bunch sits on, and (at high Wild) which legal layout and cut. It may not break rules 1–10.

Each layout block uses the same shape: fit, ware, layers, geometry, cohesion, cook/sear, Wild knobs, catalogue ancestry, an example, acceptance.

---

### Layout 1 — `circular-plate`

**Fit:** Main or Starter, Savoury or Both. The default plated main.

**Ware:** `plate` (or `slate` at mid Wild).

**Layer order:** under-pool → hero (slightly off centre) → support bunch beside the hero → accents in the remaining pocket → sauce on top → shavings and herbs.

**Slot geometry** (cm, dinner plate, `R = 9.4`, well 8.2):

- Pool: circle, r ≈ `R * 0.72`, centred. Kind from the sauce rule in §2.5 (jus for steak/chicken/mushroom, cream for salmon/eggs/potato, herb-oil or citrus-oil otherwise, the table's `sauce` / `butter` when present). Not automatic berry-sauce.
- Supports (avocado slices, pepper strips, lime wheels) lie in a shallow fan or bunch *beside* the hero, `clearOf` a seared top. They must not stand on edge or stack into a tower.
- Hero: one piece or a tight fan (`salmon:fillet`, `steak:steak`, `chicken:drumstick*2` splayed, `cabbage:wedge`, a fan of `salmon:slice*5`). Middle near the golden offset. Long heroes sit on a diagonal (~18–25°) so the side profile reads. Hero group reach ≤ `0.72 R`.
- Support: a *bunch* in the larger pocket of the 62% arc, packed until footprints touch the hero and each other. Fries: 10–14 in two layers (the traced steak-frites bunches), not five lonely sticks. Cubes/wedges: 5–9. Slices (avocado, peach): a shingled fan of 3–5, cut faces toward the hero.
- Accents: odd cluster of 3–5 in the remaining 38%, still touching the mass (lime wheels ~3.5 cm, onion wheels, garlic chips *8*).
- Sauce on top: drizzle in the pool's colour over the support and the pool edge; seared hero tops stay mostly clear.
- Negative space: a crescent of clean porcelain on the rim opposite the support bunch.

**Cohesion:** support bunch leans into the hero; no piece isolated in the well. Max four food families.

**Cooked / sear:** `isCooked()` already returns true for mains that are not salad/crudo/… . Use `SEARED` / special skins. Seared, not grill-bar charred, unless the layout is explicitly a charred cabbage wedge.

**Wild knobs:** 0–30 stick to this geometry and "classic" cuts (fillet, steak, fries). 30–70 may swap slate, stand drumsticks at an angle, or use cubes instead of a whole steak. 70–100 may pick an unhinged pairing (watermelon "tuna" cubes as support, grape lacquer drizzle) but must keep the same packing contract.

**Derived from:** Batch 1 `dish-salmon-peach`, `dish-tomahawk-berry`, `dish-grape-drumsticks`; catalogue `steak-frites-garlic`, `charred-cabbage-lemon`, `hot-chicken-lime-avocado`, `lemon-garlic-salmon`.

**Example:** table `steak`, `potato`, `garlic`; Main / Savoury / Classic → `base: 'pool:brown-butter'`, `big: 'steak:steak'`, `medium: ['potato:fries*12']`, `small: ['garlic:chip*8', 'herb*8']`.

**Acceptance:** QA §3.0; fries read as a golden heap; no garlic bulb; steak stays saturated pink; `widestGap <= 0.5`; nothing on the bare rim as a third island.

---

### Layout 2 — `rice-bowl`

**Fit:** Main or Snack, Savoury or Both, when `rice` is on the table or chosen as base.

**Ware:** `deep` (the celadon rice bowl already built in `makeWare`).

**Layer order:** mixed rice (the ware's rice mound, warm and flecked) → hero group *in* the rice → support group beside it in the rice → sauce on top (a light glaze, no second soup) → herbs. No porcelain shavings out on a tiny rim; keep garnish inside the bowl (`inside()` in `build.ts` already caps deep ware at 4.8 cm).

**Slot geometry** (`R = 4.6` — everything is smaller):

- Rice fills the bowl and reads as **mixed**: cooked-rice colour with veg and herb flecks through the body, not a plain white dome. **NEW** treatment in `src/ingredients/forms/rice.ts` or the rice path in `build.ts`. Toppings sit *in* a level bowl, not perched on a peak (lessons: "the base level, not a peak").
- Hero: chicken as **NEW** `chicken:slice` or `chicken:torn`, or `chicken:drumstick`, laid in the rice — never a few `chicken:cube` boxes on the peak. Salmon as a small fillet or slices (cubes only for a poke heap *in* the rice). Or `eggs:egg*1`, or a low `watermelon:cube` heap. Scale to ware (`fitWare`).
- Support: a short fan (`avocado:slice*3–4` in avocado-flesh colours, `broccoli:whole*2` scaled down, pepper strips, tomato) occupying the other half of the bowl, touching the hero, lying shallow, not stacked.
- Accents: lime wheel or two, oil dots or microherbs from the library.
- Two groups, one bowl, a soft seam where they meet. No third island.

**Cohesion:** both groups touch; no topping outside r ≈ 4.6; no floating on the rice (sticky physics, already in `physics.ts`). Overlap ≤ 1 cm. `towering === 0`.

**Cooked / sear:** rice uses `cooked-rice` with flecks; salmon cubes in a poke-style bowl stay on the raw `salmon` flesh skin if Course is Starter or the title is poke/crudo; mains may sear lightly. Chicken slices/torn pieces take a cooked poultry sear.

**Wild knobs:** 0–30 salmon/chicken/egg + avocado or broccoli. Higher Wild allows watermelon "tuna", fruit cubes, chili drizzle.

**Derived from:** `dish-watermelon-bowl`; `salmon-avocado-rice`, `broccoli-salmon-rice`, `watermelon-salmon-poke`, `egg-spinach-rice`, `butter-garlic-broccoli-rice`.

**Example:** `chicken`, `rice` → deep bowl, mixed rice, `chicken:slice` or `chicken:torn` (or a drumstick) in the bowl, herbs, a glaze. `salmon`, `rice`, `avocado` → mixed rice, salmon slices or a small fillet, a shallow avocado fan in yellow-green flesh.

**Acceptance:** QA §3.0 including `towering === 0`; rice is visibly mixed, not plain white; chicken is not cubes; toppings inside a level bowl; no giant avocado slice overflowing the rim.

---

### Layout 3 — `leaf-salad`

**Fit:** Starter or Main, any taste, when a leafy is on the table or Course is Starter and produce leads.

**Ware:** `plate` or `bowl` (bowl for slaw).

**Layer order:** leaf bed (7 leaves, tips out, already in `composedBuilder`) → hero pieces nestled *in* the bed → support shingled on the leaves → light pool of herb-oil or citrus-oil under or in the middle if the plate would otherwise look dry → accents → a very light drizzle (vinaigrette), not a heavy gravy → herbs.

**Slot geometry:**

- Bed radius ≈ `R * 0.8`, centred. Leaves drape (lessons: do not drop them like cards).
- Hero: a fan or short row *on* the bed, e.g. `steak:steak` slices, `eggs:half*2`, `pear:slice*5`, `chicken:cube*5`, packed into the golden offset.
- Support: fruit or veg touching the hero (tomato wedges, apple slices, grape berries in a cluster of 7–8).
- Accents: cheese crumble, citrus wheels, all still on the leaves.
- Negative space: a ring of plate around the bed, not holes in the bed.

**Cohesion:** no leaf standing like a flag (lift is a share of leaf length, lessons). No steak sitting beside an empty patch of plate with the salad off to one side — the meat is *in* the salad. `widestGap <= 0.5`.

**Cooked / sear:** usually fresh (`isCooked` is already false for salad/slaw/crudo titles). If a steak or chicken is the hero, sear *that* piece only.

**Wild knobs:** Classic stays Caesar / slaw / caprese-like. High Wild allows hot protein on leaves, fruit-heavy plates, chili oil.

**Derived from:** `caesar-romaine-egg`, `steak-romaine-tomato`, `cabbage-apple-slaw`, `pear-spinach-orange`, `grape-cheese-salad`, `apple-chicken-salad`, `avocado-tomato-salad`.

**Example:** `steak`, `romaine`, `tomato` → `leaves:romaine`, `steak:steak`, `tomato:wedge*5`, `herb*6`.

**Acceptance:** QA §3.0; romaine is a bed, not a prop at the rim; leaves drape; protein touches the bed.

---

### Layout 4 — `toast-board`

**Fit:** Snack or Starter, any taste, when `baguette` is on the table (or milk/butter pastry is not a better dessert layout).

**Ware:** `board`.

**Layer order:** board → toast(s) as the hero platform → toppings *on* the toast (support, then accent) → a small pool or melted bloom on the toast, not a soup on the wood → sauce on top (a gloss of honey, chili, or oil) → herbs and a few shavings on the toast. A tiny extra accent may sit *against* the toast, still touching it (a lime wedge, a few berries).

**Slot geometry** (board floor: \|x\| < 15, \|z\| < 11):

- `baguette:toast*1–2`, long side along z or slightly skewed (~15°). Two toasts overlap or sit in a tight pair (`group: 'pair'`).
- Toppings stay inside the toast footprint, shingled: `avocado:slice*4`, `tomato:wheel*3`, `eggs:egg*1` on one toast, `cheese:slice` peeking out.
- If a protein is present, it is the topping (folded salmon slices, steak strips as `cube`), not a second centre on the bare board.
- Negative space: wood around the toast, clean.

**Cohesion:** nothing levitating above the bread (bread is a slice, topping rests on it). No curtain of melted cheese off a disappearing floor (lessons: a sauce floor must not fall away). All toppings within 0.5 cm of the toast mass.

**Cooked / sear:** toast seared/toasted 0.7; toppings as the course requires.

**Wild knobs:** Classic avocado or tomato or cheese toast. Higher Wild: fruit and cheese, chili, grapes on toast, an egg.

**Derived from:** `avocado-toast-tomato`, `egg-avocado-toast`, `apple-cheddar-toastie`, `pepper-egg-toast`, `strawberry-cheese-toast`, `garlic-mushroom-toast`, `mushroom-spinach-toast`, `pear-blue-cheese-toast`. Batch 1 `dish-berry-baguette` is a related hand-built sandwich — prefer the composer path for new combos; use the hand-built form only on an exact Classic match of those three heroes.

**Example:** `baguette`, `avocado`, `tomato` → board, `baguette:toast*2`, `avocado:slice*5`, `tomato:wheel*3`, `herb*4`.

**Acceptance:** QA §3.0; toppings on the bread; no floating egg; no food islands at the far corners of the board.

---

### Layout 5 — `soup-bowl`

**Fit:** Starter or Main, Savoury, when `milk`, `tomato`, `potato`, or `pepper` can be a soup, or Course is Starter and no leafy/toast claim is stronger.

**Ware:** `bowl` (pasta bowl).

**Layer order:** deep soup pool (depth 1.4 already in `build.ts`) → hero pieces *in* the soup (half-sunk, `sink` is already 0.6 for soup) → a support cluster at one side, also in the bowl → no dry rim food → a dot of cream or oil on top (sauce-on-top) → herbs in the centre.

**Slot geometry** (`R = 7.4`):

- Soup circle r ≈ `0.98 R`, almost to the well.
- Hero: `potato:cube*5–7`, `chicken:cube*6`, `eggs:egg*2`, or a short stack of `tomato:half`, sitting in a loose sunflower heap whose pieces touch, slightly off centre.
- Support: onion wheels, pepper slices, mushroom halves, nestled into the same mass.
- Negative space: only the bowl's inner wall, never a dry island of cubes on the rim.

**Cohesion:** every cube is in the soup and within 0.5 cm of the cluster. No floating (soup is the floor). Overlap ≤ 1 cm.

**Cooked / sear:** always cooked. Cubes may take a light sear before they sit in the soup; the soup family is `soup-potato`, `soup-tomato`, or `drink-orange` for pepper (`BASE_FAMILY`).

**Wild knobs:** Classic potato-onion or tomato. Higher Wild: chicken-pepper stew, chili oil on top, fruit is unusual here — if sweet produce is on the table, prefer dessert-bowl or circular-plate instead unless Wild is high.

**Derived from:** `potato-onion-soup`, `tomato-rice-soup`, `chicken-pepper-stew`, `tomato-melon-gazpacho` (gazpacho is a cold cousin: same bowl geometry, no sear).

**Example:** `potato`, `onion`, `milk` → `soup:potato` or `pool` + milk cream, `potato:cube*6`, `onion:wheel*3`, `herb*4`.

**Acceptance:** QA §3.0; pieces half in the liquid; one cluster; nothing on the table beside the bowl.

---

### Layout 6 — `skewer-platter`

**Fit:** Main or Snack, Savoury or Both, when a protein is present and at least one threadable support (`pepper`, `mushroom`, `grapes`, `peach`, `onion`, `tomato`, `chicken`/`steak`/`salmon` cubes).

**Ware:** `plate` or `board`.

**Layer order:** under-pool or a dry board → 2–3 skewers as *one bundle* (the hero) → loose accents (a citrus wedge, a herb scatter) touching the bundle → sauce on top (glaze drizzle along the sticks) → herbs.

**Slot geometry:**

- Use existing `chicken:skewer`, `steak:skewer`, `salmon:skewer` in `elements.ts` (`SKEWERS` already threads chicken+pepper+grapes, steak+mushroom+pepper, salmon+peach). If the table's third ingredient is one of those, it is already on the stick — do not also pile a second heap of it across the plate. If it is not in `SKEWERS`, keep the closest skewer builder and put the third ingredient as a touching accent, or **NEW** only a data entry in `SKEWERS` (do not invent a new mesh type).
- Two or three sticks, `group: 'pair'`, slightly fanned (10–20°), handles to one side, tips crossing or nearly touching so they read as one object. Length ~22 cm must `fitWare` or the board; shrink before hanging off a dinner plate.
- Pool under the meaty half, not under the bare handles.

**Cohesion:** the skewers overlap in plan (bundle, not three isolated parallels 4 cm apart). Accents touch the bundle. `widestGap <= 0.5` across the bundle.

**Cooked / sear:** seared / lacquered meat, glaze drizzle.

**Wild knobs:** Classic uses the existing three `SKEWERS` maps. High Wild may swap in peach or grape even on a steak stick *only if* you add a validated `SKEWERS` entry and `makeElement` can build each bead.

**Derived from:** `chicken-grape-skewer`, `steak-mushroom-pepper`, `peach-salmon-skewers`.

**Example:** `chicken`, `grapes`, `pepper` → `chicken:skewer*3` (already threads those), `pool:chili` or herb-oil, `herb*8`.

**Acceptance:** QA §3.0; a bundle, not a row of isolated sticks; pieces stay on the stick; no second salad dumped at the far rim unless it touches the bundle.

---

### Layout 7 — `glass-drink`

**Fit:** Drink, or Dessert when `milk` and fruit want a glass (`lime-avocado-mousse`).

**Ware:** `glass`.

**Layer order:** glass + drink column (`drinkPieces` in `build.ts`) → fruit on the *table beside the glass*, close to it → no shavings, no herb lawn on the table → at most a thin lip of glass above the drink (lessons: clear walls paint as opaque bands).

**Slot geometry:**

- Glass slightly off centre (`baseAt` already `[-1.5, -1]` in `composePlan`).
- Drink family from `BASE_FAMILY` (`drink:strawberry`, `drink:orange`, `drink:blueberry`, `drink:watermelon`, `drink:tomato`, `drink:green`, `drink:grape`, `drink:avocado`, or pale cream).
- Hero fruit: one half or a short wheel *touching the glass* (not 6 cm away — `docs/dishes/lessons.md` / commit notes: drink fruit near the glass). Count 1–3, on the table height, not floating in the drink (the shader cannot do fruit inside liquid cleanly).
- Negative space: the rest of the plate-sized card is empty on purpose; cohesion is measured between glass, drink, and the fruit cluster only (do not fail QA because herbs were not scattered — skip the garnish pass, already the case for `ware === 'glass'`).

**Cohesion:** fruit centroid within ~4 cm of the glass wall. `apart === 0` among glass/drink/fruit. `floating === 0`. Special-case the cohesion check so the drink and glass count as the centre mass.

**Cooked / sear:** never seared.

**Wild knobs:** Classic milkshake / cooler / spritz from the juiciest ingredient. High Wild may mix unexpected produce (spinach-apple, tomato-pepper) using existing `drink:*` families only.

**Derived from:** `strawberry-milkshake`, `orange-lime-cooler`, `blueberry-smoothie`, `watermelon-cooler`, `tomato-juice-pepper`, `spinach-apple-juice`, `grape-pear-spritz`, `lime-avocado-mousse`.

**Example:** `strawberry`, `milk`, `blueberries` → `drink:strawberry`, `strawberry:half*1` and a small `blueberries:berry` cluster against the glass.

**Acceptance:** QA §3.0 with the glass special case; fruit touches the glass; no tall opaque "glass wall"; no herb sprinkles on the table.

---

### Layout 8 — `dessert-bowl`

**Fit:** Dessert, Sweet or Both.

**Ware:** `bowl` (or `plate` for a tart / pancake / cake slice).

**Layer order:** cream or berry-sauce pool (or `butter:pastry` / `milk:pancake` / `cheese:cake` / `butter:cake` as the built base) → fruit hero on or in the cream → a second fruit or crumble as support, touching → a gloss of sauce on top → a little herb only if the catalogue would (mint-scale; otherwise skip heavy parsley on a pudding). Shavings may be sparse on desserts (buttery crumbs rather than 50 savory shavings). If the existing garnish pass looks wrong on puddings, **NEW** a layout flag `savoryGarnish: false` and have `composedBuilder` honour it (fewer or no gold/white shavings, fewer herbs).

**Slot geometry:**

- Pool r ≈ `0.72 R` in a bowl, or a pastry/pancake circle as hero with fruit on top (`apple:slice*9` as a tight ring — `group: 'ring'` already in `elementInfo` / `arrange`).
- Fruit in touching clusters: `strawberry:half*4–5`, `blueberries:berry` heaps, `peach:wedge*5`, never four berries at the four corners (the cheesecake QA: berries had landed behind / apart).
- A slice of cake is one half-circle, fruit piled *against the cut face and on the plate touching it*.

**Cohesion:** fruit is a pile, not a constellation. `widestGap <= 0.5`. No floating berries (they were a known physics miss).

**Cooked / sear:** usually unseared; pastry/pancake take a baked family, not a meat sear.

**Wild knobs:** Classic pudding, tart, pancake, melba. High Wild may put cheese + fruit, or chili with fruit, still in this packing.

**Derived from:** `strawberry-milk-pudding`, `blueberry-pancakes`, `apple-tart`, `peach-melba`, `blueberry-yogurt-bowl`, `blueberry-lemon-cheesecake`, `pear-butter-cake`, `lemon-cheese-dessert`.

**Example:** `peach`, `milk`, `strawberry` → `pool:cream`, `peach:wedge*5`, `strawberry:half*3`, berry-sauce drizzle on top.

**Acceptance:** QA §3.0; one mound; fruit not behind the cake; `savoryGarnish` does not litter a pudding with 50 cheese-like shavings if that flag is off.

---

### Layout 9 — `skillet-bake`

**Fit:** Main or Snack, Savoury, when `eggs` are present with tomato/pepper/mushroom/spinach, or a melted cheese bake (broccoli + cheese + milk).

**Ware:** `bowl` (reads as a skillet / baking dish).

**Layer order:** sauce or cheese-sauce pool → vegetables as a ring or bed in the sauce → eggs (or a `broccoli` / `cheese` bake mass) set into the sauce → a little cheese crumble or pepper on top → sauce gloss → herbs.

**Slot geometry:**

- Pool r ≈ `0.85–0.98 R` (almost to the wall, like shakshuka).
- Veg (`pepper:slice`, `tomato:half`/`wedge`, `mushroom:half`) scattered *in* the sauce as one connected ring, footprints touching.
- Eggs: `eggs:egg*2–3` or `eggs:omelette*1` in the openings of that ring, slightly off centre, whites allowed to touch the veg. For an omelette, the fold *is* the hero and spinach/mushroom sit in or against it, not on a far rim.
- Broccoli-cheese bake: `broccoli:whole*2–3` packed in cheese-sauce, `cheese:crumble` over, no dry florets on the rim.

**Cohesion:** the bake is one pan of food. Eggs do not stand on their edges (physics lessons: allow a little slide, wait for real stillness). `widestGap <= 0.5`.

**Cooked / sear:** cooked. Mushrooms and peppers take their `SEARED` amounts; egg whites stay soft (`SAUCE_SKIN`).

**Wild knobs:** Classic shakshuka / omelette / bake. High Wild may add fruit salsa on the side *only if it still touches the pan mass*.

**Derived from:** `baked-eggs-tomato-pepper`, `spinach-mushroom-omelette`, `shakshuka-spinach` (catalogue; Batch 1 `dish-egg-mushroom` is the hand-built cousin), `broccoli-cheese-bake`, `onion-potato-gratin`.

**Example:** `eggs`, `tomato`, `pepper` → `pool:tomato-sauce`, `eggs:egg*3`, `pepper:slice*6`, `tomato:half*3`, `herb*10`.

**Acceptance:** QA §3.0; eggs in the sauce, not perched on the rim; no edge-standing fried eggs; one pan.

---

### Layout 10 — `mash-plate`

**Fit:** Main or Starter, Savoury, when `potato` wants to be a rösti/mash, or `rice` + mushrooms want a risotto on a bowl (`mash:risotto` already in `BASE_FAMILY`), or `milk:mash` is not already claimed by dessert-bowl.

**Ware:** `plate` or `bowl`.

**Layer order:** optional thin pool → mash / rösti as a low, wide cake (the hero platform) → protein or veg folded on top, still inside the mash radius → accents around the rim of the mash, touching it → sauce on top (brown butter, jus) → herbs.

**Slot geometry:**

- `potato:mash` or `milk:mash` or `rice:mash` as a circle r ≈ 4.5–5 cm, slightly off centre (`elementInfo` already uses r 4.5, `group: 'pair'`).
- Toppings: `salmon:slice*4` folded on the mash, or `mushroom:half*5` on risotto, or `steak` slices — all inside or overlapping the mash by at least 30% of their footprint. Not a steak to the left and mash to the right with a gap.
- Accents (onion wheels, garlic chips) tucked at the mash edge.
- Volume: the mash is low and wide, not a peak (same lesson as the rice bowl).

**Cohesion:** toppings are *on* the mash. `widestGap <= 0.5`. No floating slices (support check already flags pieces whose lowest points stand > 2 mm above the surface).

**Cooked / sear:** mash may take a seared top (`potato:mash` already has `seared: 0.7` when cooked). Protein as usual.

**Wild knobs:** Classic rösti + salmon, steak + mash, mushroom risotto. High Wild may put fruit on mash only if packed on top, not as a side island.

**Derived from:** `rosti-salmon-onion`, `steak-potato-mash`, `mushroom-risotto`, `cabbage-potato-colcannon`.

**Example:** `potato`, `salmon`, `onion` → `potato:mash` hero, `salmon:slice*4` on it, `onion:wheel*4` at the edge, `herb*10`, a little cream or herb-oil under.

**Acceptance:** QA §3.0; toppings on the cake; onion rings not across a bare plate; mash low and wide.

---

### Layout 11 — `tart`  (**NEW** archetype, especially Dessert / one-ingredient fruit)

**Fit:** Dessert (or a savoury tart starter: tomato, onion, cheese). First choice when a single fruit or `apple` / `pear` / `peach` / `strawberry` is the hero and Course is Dessert.

**Ware:** `plate`.

**Layer order:** tart shell on the plate → a thin smear or pool *inside* the shell if needed → hero fruit fanned or arranged in the shell, lying flat → whipped cream and/or a quenelle on the tart or just beside the cut edge, touching it → a modest sauce smear on the porcelain (caramel, a specific fruit sauce — not automatic berry-sauce) → crumb or a tuile → microherbs only if they suit.

**Slot geometry:** a low pastry case (`tart-shell` or `butter:pastry`) slightly off centre; apple slices shingled in a ring or fan *in* the shell (opt-in low stack only inside the case); cream and quenelle are library components, not heroes.

**Cohesion:** one construction. Fruit does not stand on edge. `towering === 0` under the tart opt-in (shell + one layer of fruit + a cream dollop).

**Example:** `apple` + Dessert → "Apple tart with cream": shell, `apple:slice` fan, whipped cream, ice-cream quenelle, caramel smear.

**Acceptance:** QA §3.0; the title is a dish name; at least two library components; not wedges in a berry lake.

---

### Layout 12 — `tartare-crudo` / `composed-plate`  (**NEW**, Starter)

**Fit:** Starter, when a single produce or a protein wants a small composed plate rather than a salad or soup.

**Ware:** `plate`.

**Layer order:** a puree smear or citrus/herb oil on the plate → the hero cut properly (thin wheels, a tight tartare-like mound of small cubes, a seared piece) lying low in or against the smear → oil dots, a tuile or crouton, microherbs.

**Example:** `lemon` + Starter → lemon wheels and wedges on citrus oil, oil dots, microherbs, maybe a cheese crumb. Title like "Lemon with citrus oil," never "Lemon" over berry sauce.

**Acceptance:** QA §3.0, `towering === 0`; sauce matches the hero; it reads as a small composed course.

---

## 4. Painted-look consistency

Grounded in code and in `docs/dishes/lessons.md` / `composedDish()`:

- **One material system.** Dishes already use the pantry's `StylizedLook` (`src/shading/stylizedMaterial.ts`) and the Kitchen's `Painter` pass (`src/painting/painter.ts`, presets in `src/painters.ts`). Do not add a second shader, photoreal textures, or an image model. The card already crossfades and Cook already plays `ShuffleTransition`.
- **Lighter touch on dish skins.** `composedDish()` already multiplies skin `amount` by `PAINT_TOUCH = 0.45` and eases `seared` by 0.7, so "the family's warm light and cool, coloured shadow bands carry the form, as on the apple and the orange." Keep this. Do not raise `amount` back toward 1 on cut forms to "add detail."
- **Cut forms are one piece, flesh to skin.** `elements.ts`: a smooth body, rounded knife (`roundedIntersection`), a single flesh-to-skin map — the "watermelon treatment." Do not split skin and flesh into two meshes (that seam read as a pale band). Soft edges, no crisp cut-out lines (`CLAUDE.md`: "No crisp lines").
- **Limit texture detail on cuts.** Prefer `FLESH_SKIN` on cut faces (already the default path). Heavy peel kinds (`pebbled`, `pores`, `seeds`, `florets`, `marbled`) belong on whole pantry models, not on every wedge. The owner called the current dishes texture-heavy and off the gouache; if a cut still looks "realistic," lower its `skin.amount` before adding a new kind.
- **Seared, not charred.** Browned edges and a golden crust that follows the food's own colour. Grill bars (`charred` skin) only when a layout explicitly asks (charred cabbage). Cooked colour families, never raw orange salmon.
- **Plates are props.** Porcelain at `CERAMIC_SKIN` amount 0.12, `pale: '#ece8e2'`, no specks — "white pristine clean." The card frames the food (`PROPS` / framing). Full coloured shadows (`shadowTint: 1` on composed dishes).
- **Gloss is deliberate:** sauces, yolks, lacquer, wet fruit flesh (`glossy` roles). Seared crusts should not go plastic-shiny (salmon lesson: rough, broken glints).
- **Playful strokes** hide tiny dark parts that turn into blocks (`playfulHide`, e.g. seeds). Generated dishes should mark any new pin-head dark bits the same way.
- **Avocado is avocado.** Cut faces use `avocado-flesh` (core `#f4ee9a`, skin `#3e5a26` in `elements.ts`). Pale mint slices that read as cucumber are a colour bug.
- Paint QA is still by eye against `references/painterly/00-source-of-truth-lemon-wedges.png` and `01-source-of-truth-blood-orange.png`, as `qa.test.ts` already notes. The automated checks in this spec do not replace that, but passing cohesion is what lets the painting read as one subject.

---

## 5. Selection logic and implementation order

### 5.1 `pickLayout` + `pickDish`  — **NEW**

```ts
// src/dishes/compose/pick.ts  (NEW)
function pickDish(ids: string[], choices: CookChoices, seed: number): DishIdea

function assignSlots(ids: string[], choices: CookChoices, layout: LayoutSpec, random: () => number): Slots

function titleDish(idea: Pick<DishIdea, 'big' | 'medium' | 'course'>, slots: Slots): { title: string; description: string }
```

Suggested archetype choice (**NEW** `pickArchetype(ids, choices, seed)`). Course must change the ware and the construction in a way a person can see (the same apple cooked as Drink, Dessert, and Main must not all be wedges on a red plate).

| Priority | Condition | Layout |
|---|---|---|
| 1 | `choices.course === 'Drink'` | `glass-drink` (always). Juice the juiciest table item; see §2.5. |
| 2 | `choices.course === 'Dessert'` and a fruit/dairy hero | `tart` first for apple/pear/peach/strawberry/berries; otherwise `plated-dessert` / `dessert-bowl` / `pancake` |
| 3 | `choices.course === 'Starter'` and a single produce or a crudo-like protein | `tartare-crudo` / `composed-plate`, or `soup-bowl` / `leaf-salad` when those fit |
| 4 | `rice` on the table and course is Main or Snack | `rice-bowl` |
| 5 | `baguette` on the table and course is Snack or Starter | `toast-board` |
| 6 | leafy on the table and (course is Starter or the protein wants a salad) | `leaf-salad` |
| 7 | `eggs` + veg, or broccoli+cheese, and not already toast | `skillet-bake` |
| 8 | protein + a threadable partner, and Wild ≥ 40 or the catalogue would skewer them | `skewer-platter` |
| 9 | `potato` or risotto-ish rice+mushroom wanting a cake/mash (and rice did not already take 4) | `mash-plate` |
| 10 | fallback for Main | `circular-plate` |

Wild then *perturbs* this, and the perturbation must be visible (artifact test: Wild 100 still looked like Classic fruit-on-berry-sauce):

- **0–30 Classic.** Follow the table. Calmer garnishes, classic cuts. If an unordered heroes match exists in `CATALOG` or Batch 1 `HAND_BUILT` *and* the course/taste agree, you *may* return that known `DishIdea` (hand-built form when the Batch 1 trio matches — those were reviewed). Still run it through acceptance, including `towering === 0`; do not revive a trace that fails QA just because it is famous.
- **30–70.** Keep the chosen layout, vary cuts and counts inside the layout ranges, maybe slate vs plate, maybe a extra library component (tuile, oil dots).
- **70–100 Unhinged.** May pick the second-best layout (e.g. steak+grapes as a skewer instead of circular-plate), unhinged but legal sauces and components. Cohesion and no-towering contracts do not loosen.

Same `(ids, course, taste)` at wild 0 and wild 100 must differ in at least one of: archetype, ware, hero form, component kinds, support count band.

`isCooked()` in `build.ts` stays the authority for sear, driven by `course` and title keywords. When generating titles, include words like "salad", "crudo", "slaw", "poke" when the layout is fresh, so `isCooked()` stays false.

### 5.2 Implementation order

Do this in order. After each step that changes a build, run `npm test` (at least `src/dishes/dishes.test.ts` and the new tests). Do not hook the Kitchen until generated dishes pass the tighter QA on a fixture set.

1. **`src/ingredients/traits.ts` (NEW).** The interface in §2.3 and the full 31-row table in §2.4 as `TRAITS: Record<string, IngredientTraits>`. Export `traitsFor(id)`, `heroPriority(id)`. Unit test: every `REGISTRY` id (non-shelved, non-`dish-*`) has a row; every listed form is in the allow-list below; `garlic.forbiddenForms` includes `whole` and `half`; `sauce.slots` is only `sauce`.

   Allow-list of forms (the union of `makeElement` cases, `cutElement` defaults, and **NEW** forms in this revision):  
   `whole`, `half`, `wedge`, `wheel`, `slice`, `cube`, `fillet`, `steak`, `drumstick`, `egg`, `berry`, `leaf`, `crumble`, `toast`, `mash`, `skewer`, `roll`, `omelette`, `cake`, `pancake`, `pastry`, `fries`, `chip`, plus **NEW** `strip`, `dice`, `torn`.  
   Plus base strings (`rice`, `pool:*`, `leaves:*`, `soup:*`, `mash:*`, `drink:*`) which are not `makeElement` parts. `pepper:whole` must not be the only pepper form on a plate. `chicken:cube` is not a default hero form.

2. **`src/dishes/compose/layouts.ts` (NEW).** `LayoutSpec` data for the ten layouts: id, courses, tastes, ware, layer flags (`savoryGarnish`, `wantsUnderPool`, `wantsTopSauce`, `sink`), count ranges, packing ("touch-cluster" vs "shingle-fan" vs "bundle"), `fit` predicates. No 3D code here.

3. **Tighten the planner and settling (P0 in the fix list).** Do this before the component library. Extend `composePlan` or add **NEW** `composeLayoutPlan(idea, layout, seed)` and call it from `planFor()` when `TRACES[idea.id]` is missing. Pack supports *beside* the hero (touch / 1.25 × width, never the same `(x, z)`), cap to `reach`, keep BMS and the golden offset, odd accent counts. After each physics layer, replate towering pieces flat (§3.0 rule 9). Record `towering` and `maxFoodHeight` on `LAST_QA`. Do not start tracing new Figma paintings.

4. **`src/dishes/compose/build.ts` (edit).** Honour layout flags: sauce-on-top after supports (`drizzle` and/or `pour`), `savoryGarnish`, keep the existing physics, rim replate, shaving/herb pass, and `PAINT_TOUCH`. Mixed rice. Do not turn off physics.

5. **`src/dishes/compose/pick.ts` (NEW)** and **`src/dishes/compose/pick.test.ts` (NEW).** `pickDish`, `assignSlots`, `titleDish`. Tests, all seeded and deterministic:
   - Every pantry id alone, plus a fixed sample of 2- and 3-id combinations (include awkward ones: `lime`+`garlic`+`sauce`, `romaine` alone, `steak`+`blueberries`+`milk`, `rice`+`baguette`+`potato`), across all five courses and the three tastes, at wild 0, 60, and 100, produces a `DishIdea` whose parts `readPart` + `elementLooks` / `makeElement` accept.
   - `heroes` only contain table ids (plus the 3-tuple padding rule in §2.5).
   - No `garlic:whole` or garlic bulb form ever.
   - `sauce` is never `big`.
   - `romaine` on the table always becomes `leaves:romaine` or is otherwise only a base.
   - The same `(ids, choices, seed)` returns the same idea.
   - A second seed at the same Wild changes at least a count, angle, or title, but still passes.
   - One-ingredient apple × every course produces a complete archetype (glass for Drink, tart or plated dessert for Dessert, not the same berry-sauce plate).
   - Titles are dish names, never a bare "Apple" or "Lemon".
   - `components` is non-empty for every one-ingredient idea (beyond a bare pool).

Also add **NEW** `src/dishes/compose/components.ts` and the tart / composed-plate layouts. Build **NEW** forms before using them: `chicken:slice` / `chicken:torn`, `pepper:strip` / `pepper:dice`, mixed rice, `makeComponent` kinds.

6. **QA on generated dishes.** Extend `src/dishes/compose/qa.test.ts` (or a new `generated.qa.test.ts`) to build `composedDish(pickDish(...))` for a fixture that includes the six artifact combos (sauce+cheese Main Savoury; lemon Starter Sweet; lime+pepper Dessert Wild 100; pepper+avocado+salmon; chicken+rice; apple Drink) plus the awkward set, and assert `apart === 0`, `floating === 0`, `deepest <= 1`, `restless === 0`, `lost === 0`, `towering === 0`, plus `widestGap <= 0.5` and the "one centre" check. Budget time like the existing 900s catalogue test if needed. Do not require the old 100 traces to go green in the same PR; do not make new dishes worse than §3.0.

7. **`src/kitchen/main.ts` and `src/kitchen/panel.ts` (edit).** `onCook: (choices) => cook(choices)`. First Cook click with default choices must always start the transition or show a visible error; do not swallow exceptions. Warm physics and shader compile *before* Cook is enabled if a race caused the artifact's 4-of-6 silent first-click failures. `cook` reads `staying()` ids, hashes a seed, calls `pickDish`, then `composedDish` (or the Batch 1 builder on an exact Classic hand-built match). Stop pre-building only `DISHES[0]`. Use the existing fill/busy pattern. Cache the last built entry so Back and a second Cook of the same seed are cheap. **Reset restores `DEFAULT_CHOICES` and clears every ingredient from the table.** Leave Save as a later step unless it is trivial to store `{ idea, seed, choices, painter }` in `localStorage`; do not block plating on Save.

8. **Optional tidy, not blockers:** fill missing `BODY` entries only if you add cuts for those ingredients; add a `SKEWERS` row if a high-Wild skewer needs a different bead; comment in `dishes.ts` that the salmon stand-in is no longer the Kitchen default.

### 5.3 What not to do

- Do not call an LLM or an image model. `pickDish` is rule-based and seeded.
- Do not add new 3D element types before a combination can be plated with existing `makeElement` forms, except the **NEW** forms and library components this revision names (chicken slice/torn, pepper strip/dice, mixed rice, tart shell, quenelle, smear, tuile, and the other `ComponentKind`s). Placement/physics comes first: a tart that towers is still a failed dish.
- Do not route random Kitchen cooks through `TRACES` or require a new Figma ref per combination.
- Do not loosen QA to make tests pass (do not raise the 1 cm overlap limit, do not ignore `apart` or `towering`).
- Do not show a garlic bulb. Do not put a sauce bottle on the plate. Do not default every fruit dish to berry sauce.
- Do not treat the 1–3 table ingredients as the entire dish.
- This file and `fix-list.md` live outside the repo on purpose; do not modify or push the repo as part of spec-writing.

---

## Appendix: existing files this spec refers to

| File | Role |
|---|---|
| `src/ingredients/registry.ts` | 31 pantry ids |
| `src/ingredients/families.ts` | `FamilyId` |
| `src/ingredients/forms/kit/random.ts` | `seededRandom` |
| `src/dishes/catalog.ts` | `DishIdea` |
| `src/dishes/dishes.ts` | `Dish`, Batch 1 `HAND_BUILT`, `DISHES` |
| `src/dishes/compose/layout.ts` | `composePlan`, `BODY`, `elementInfo`, `readPart`, `WARE_PLAN` |
| `src/dishes/compose/elements.ts` | `makeElement`, `elementLooks`, `BASE_FAMILY`, `SEARED`, `SKEWERS` |
| `src/dishes/compose/components.ts` (**NEW**) | `DishComponent`, component library |
| `src/dishes/compose/build.ts` | `composedDish`, `composedBuilder`, `isCooked`, `LAST_QA`, `PAINT_TOUCH`, `dishLooks`, `towering` |
| `src/dishes/compose/traces.ts` | `TRACES`, `planFor`, `defaultPool` — reference only for generated dishes |
| `src/dishes/kit/{cut,ware,pool,pour,place,physics,plan}.ts` | knife, ware, pools, pour, plating, Rapier, 2D plan |
| `src/kitchen/main.ts` | `cook()`, `MAX_ITEMS`, paint pipeline |
| `src/kitchen/panel.ts` | `CookChoices` |
| `src/shading/stylizedMaterial.ts`, `src/painting/painter.ts` | the painted look |
| `docs/dishes/lessons.md`, `docs/dishes/qa.md`, `docs/dishes/README.md` | plating lessons and current QA |
| `/workspace/forage-specs/fix-list.md` | paste-ready Claude Code brief after the artifact test |
| `/workspace/forage-artifact-shots/` | owner screenshots of the prototype |
