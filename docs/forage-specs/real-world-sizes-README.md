# Forage real-world size table

A centimetre reference for the Kitchen scale fix, so plated food and ware match how the dish looks in real life.

**Source of truth for numbers:** [`real-world-sizes.json`](./real-world-sizes.json)

**Companion:** [`world-dish-looks.json`](./world-dish-looks.json) uses a single `size_cm` on each piece — that is the *primary visible dimension* (diameter of a wheel, length of a fillet or toast, face of a cube). This table gives the full L × W × H (or diameter × height). The two files agree on that primary dimension. If you change a size, change both.

Do not commit this into the app blindly. Use it when tightening `BODY`, `elementInfo`, pantry forms, ware, and glass constants on `composable-dishes`.

## Unit scale

```ts
// src/ingredients/scale.ts
export const UNITS_PER_CM = 2.095944 / 8; // 0.261993
```

Style Lab forms are modelled in real centimetres, then multiplied by `UNITS_PER_CM` so the default 8 cm apple still measures 2.095944 scene units. The Kitchen works in centimetres throughout: pantry forms come back through `inCm()` (`1 / UNITS_PER_CM`). Ware, glass, toast, fillets, pools and garnish are already authored in cm.

There is no second hidden scale in the Kitchen. If a piece looks huge or tiny, its centimetre constants are wrong — do not invent a new conversion factor.

**Do not confuse Style Lab `registry.ts` `size_cm` with a plated piece.** Several registry entries are whole-stage compositions (a 37 cm tomahawk, a 10 cm lime cluster, a 16 cm egg cluster, a 15 cm broccoli head, a 12 cm butter stick). The plate uses the form in `elements.ts` / `components.ts` / the `forms/` files, which are often a completely different size.

## How to use it

1. Look up the ingredient and the *form being drawn* (fillet, slice, cube, toast, wheel, mash, …), or the vessel, or the garnish.
2. Clamp the rendered piece to **±15% of `true_cm`**. Do not scale a piece up to fill a plate, or down to make a three-ingredient plate look sparse.
3. **Size boards and plates from their contents.** A board gets a finger’s width (~1.3–1.5 cm) of wood around the food; a plate gets a rim’s width (~3 cm) around the food. Never leave a 30 × 22 cm board under a single 11 cm toast if a smaller board would fit. The current `build.ts` board fitter (min 11 × 9, margin 1.3 cm) is the right idea — keep it.
4. A toast stays ~11 × 8 × 1.7 cm. A salmon fillet on that toast must become thin folded ribbons or flakes that *fit the bread*, never the other way around.
5. Drink garnish comes only from ingredients already on the table, and must be the real fruit size (a lemon wheel is 5.5 cm, not 4 cm).
6. Vessels listed with `app_cm: null` (ramekin, kadai, skillet, chawanmushi cup, clay pot) do not exist in `ware.ts` yet. Do not pretend a pasta bowl is a ramekin. Refuse the dish name until the vessel is built, as `world-dish-looks.json` already requires.

`count_per_serving` is a typical single-portion count, not a hard cap. `app_cm` is what the current `origin/composable-dishes` code draws, with a source note. `app_off` is set only when that is visibly wrong.

## Biggest mismatches in current code

Fix these first. They are the ones already visible in the preview.

| Piece | App now | True size | Why it reads wrong |
|---|---|---|---|
| `salmon:fillet` (`COOKED_PORTION`) | 13 × 6.2 × 3.4 cm | 12 × 5 × 2.5 cm | Too wide and much too thick. Longer than an 11 cm toast, so it sits on bread as a brick. Salmon on toast should be thin folded ribbons (`salmon:slice`, 7.5 × 3.5 × 0.3 cm), not this fillet. |
| `butter:cube` | 2.6 × 2.6 × 1.6 cm | 2.5 × 2.0 × 0.6 cm (or a melting smear) | A tall pale block — the “cake slice” on Khachapuri. A pat is a thin tile. |
| `potato:mash` | 10.8 cm across × 1.1 cm tall | 10 cm across × 3.5 cm tall | A flat pancake of mash instead of a spooned dome with a butter well. |
| Broccoli on toast | 7.5 cm standing head (0.5 × the 15 cm pantry head) | 3–5 cm halved florets, laid flat | Standing trees. The form is wrong, not just the scale. |
| `onion:wheel` | 3.2–5.4 cm diameter | 7 cm diameter, 0.4 cm thick | A small inner ring, not a full slice. |
| Wine glass | 16 cm tall | 20–24 cm | Bowl diameter is fine; the glass is a short tasting glass. |
| Ice cubes | 1.15 cm | 2.5–3 cm | Reads as crushed ice. |
| Rice bowl (`ware` deep) | 13.2 cm, plan reach 4.6 cm | 16–18 cm for donburi / bibimbap | Fine as a small chawan; tight for a loaded bowl. |
| `avocado:smash` | 7.2 × 1.0 cm tall | 8 × 3.0 cm dome | Guacamole is a puddle. |
| Chicken drumstick | ~15 cm, 5.5 cm at the bulb | 12 × 4 cm | Long and plump; it dominates small ware. |

Also missing, and required before those dish names can be claimed: a **ramekin** (10 × 4.5 cm), a **kadai** (18 × 7 cm), an individual **skillet** (20 × 4.5 cm), a **chawanmushi cup** (7.5 × 6.5 cm), and a **ttukbaegi** (13 × 9 cm).

Things that are already the right size and should stay put: toast (8 × 11 × 1.7 cm), dinner plate (Ø 27 cm), pasta bowl (Ø 25 cm), soup bowl (Ø 19 cm, liquid at 5 cm), rocks glass, pancake (Ø 12 cm), tart shell (Ø 11 cm), garlic chips (~1.6–1.8 cm), salmon *slices* (thin ribbons), cheese slices (5 × 4 × 0.5 cm), fries, herb flecks (~1 cm), oil dots (diameter is fine — they must sit on the food, not hover).

## Counts in this table

- 31 pantry ingredients, 100 plated / Style Lab forms
- 18 vessels (12 built in `ware.ts` / `glass.ts`, plus tart shell, and 5 vessels the looks notes name but the renderer does not have yet)
- 12 shared components and garnish bits (quenelle, whip, tuile, smear, puree, oil-dot, gel-bead, herb-leaf, microherb, shaving, ice-cube, crouton)
- 15 documented mismatches

Looked at `origin/composable-dishes` only. Nothing in this folder was committed or pushed to the repo.
