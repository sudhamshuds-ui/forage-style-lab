# Round 3: 71 more ingredients, in nine batches

Written 2026-11-14 and approved by the user the same day ("Ok for all"). It follows round 2
(`r2-plan.md`), whose last five come first: cabbage (round 1 on branch `napa`, not approved),
salmon, fried egg, rice bowl, milk carton. With this list the pantry reaches 95.

## How a batch runs

1. **References first.** Before a batch starts, tell the user which ingredients need references
   and wait for them (the user, 2026-11-14: "when u need references, let me know before u start
   that round, i will paste them in").
2. One archetype or kit tool per batch, built once and reused.
3. Each ingredient: spec, form in code at real size on the kit, its own skin and family, registry
   entry, the pre-check from every side in both looks, `npm test`, `npm run build`, in budget, a
   build under about 0.3 s.
4. Each batch on its own branch (`r3-batch-1` and so on), pushed, the preview built with
   `VITE_PREVIEW_NEXT=<ids in order>`. Every round goes on the preview before writing to the user.
   Never merged to `main` until the user says so.
5. After an approval: `/forage-brand {id}`. Figma once per round.

## Decisions (the user, 2026-11-14)

- **A ninth archetype, "flat"**: fried egg, bacon, tortillas, a loaf's slices.
- **Raw, but appetising**: shrimp, bacon, sausages and the fish stay raw (the fried egg is the
  exception from round 2).
- **More warm rooms**: fish, shrimp and mussels are cool subjects and Apricot is the only warm
  room, so one or two more are added. White subjects (tofu, mozzarella, salt, milk) get a slightly
  deeper room so they stand out.
- Rooms below are first picks; the room test (70 to 180 degrees from the subject) decides, and
  any swap is reported.

## Round 2's last five

| Ingredient | Archetype | Family | Room | Size (cm) | Layout | New tool |
|---|---|---|---|---|---|---|
| Cabbage | leafy | `cabbage` | Iris | 17 x 12.6 x 17 | solo, upright | none |
| Salmon fillet | block | new `salmon` | Mist | 18 x 3 x 8 | solo, three-quarter | stripe skin, like the steak's |
| Fried egg | flat | new `albumen`, `yolk` | Spruce | 12 x 1.5 x 11 | solo | puddle |
| Rice bowl | contained | new `rice`, bowl `glaze` | Dusk | 13 x 7 x 13 | solo | bowl prop, grain mound |
| Milk carton | contained | `paper`, green print | Seafoam | 7 x 20 x 7 | solo | carton |

## Batch 1. Round (the lathe as it is)

| Ingredient | Family | Room | Size (cm) | Layout | Flag |
|---|---|---|---|---|---|
| Tomato | new `tomato` (scarlet, more orange than the apple) | Mist | 7.5 x 6.5 | solo, calyx star | |
| Egg | new `eggshell` | Celadon | 4.4 x 5.8 each | cluster of 3 | |
| Potato | new `potato` | Iris | 10 x 6 x 7 | cluster of 2 | |
| Lime | new `lime` | Thistle | 5.5 x 5 | whole and half | reuses the avocado's cut; gives the lemon its half |
| Garlic | new `garlic`, `papery` | Lavender | 6 x 6 | one bulb, two cloves | lobes like the pepper's |
| Mushroom | new `mushroom` | Spruce | 4.5 x 4.5 each | cluster of 3, one showing gills | |
| Pear | new `pear` | Heather | 7 x 10 | solo, standing | |
| Peach | new `peach`, `pit` | Seafoam | 7 x 7 | whole and half with pit | |

## Batch 2. Long (one new taper tool, from the drumstick's method)

| Ingredient | Family | Room | Size (cm) | Layout | Flag |
|---|---|---|---|---|---|
| Carrot | new `carrot` | Spruce | 20 x 3.5 | solo, diagonal | short trimmed tops, not feathery leaves |
| Cucumber | new `cucumber` | Heather | 20 x 4.5 | solo, diagonal | |
| Eggplant | new `aubergine` (violet, never black) | Sage morning | 20 x 8 | solo, diagonal | |
| Corn | new `corn`, part `husk` | Iris | 19 x 5.5 | husk peeled halfway | kernel skin |
| Banana | new `banana` | Dusk | 18 x 4 x 12 | a hand of three | |
| Leek | new `leek` | Thistle | 30 x 4.5 | solo, diagonal | |
| Sweet potato | new `sweet-potato` | Celadon | 16 x 6 | cluster of 2 | |
| Asparagus | new `asparagus` | Lavender | 20 x 5 | tied bundle of 7 | |

## Batch 3. Vessels (jar, can and bag added to the vessel kit)

| Ingredient | Family | Room | Size (cm) | Layout | Flag |
|---|---|---|---|---|---|
| Olive oil | new `oil`, `glass` | Mist | 7 x 26 | solo | |
| Soy sauce | new `soy`, `crimson` cap | Seafoam | 6 x 15 | solo | |
| Honey | new `honey`, `gold` lid | Iris | 7.5 x 9.5 | solo | jar with lid |
| Jam | `crimson`, `glass` | Linen | 7 x 9 | solo | reuses the jar |
| Mustard | new `mustard` | Dusk | 6.5 x 9 | solo | our own label |
| Peanut butter | new `peanut` | Celadon | 8 x 10 | solo | |
| Tomato can | `tomato` label, part `tin` | Sage morning | 7.5 x 11 | solo | can, our own label |
| Flour | `paper`, new `flour` | Spruce | 11 x 17 x 7 | bag, top folded open | bag |

## Batch 4. Bowls and piles (reuses the rice bowl and the blueberry pile)

| Ingredient | Family | Room | Size (cm) | Layout |
|---|---|---|---|---|
| Chickpeas | new `chickpea` | Celadon | bowl 13 x 7 | in a bowl |
| Red lentils | new `lentil` | Spruce | bowl 13 x 7 | in a bowl |
| Salt | new `salt` | Iris | dish 8 x 3.5 | pinch dish |
| Peppercorns | new `peppercorn` (plum-brown, never black) | Sage morning | dish 8 x 3.5 | pinch dish |
| Penne | new `pasta` | Heather | 12 x 4 x 10 | loose pile |
| Almonds | new `almond` | Mist | 9 x 3 x 8 | loose pile |
| Walnuts | new `walnut` | Thistle | 3.5 each | cluster of 3, one cracked |
| Olives | new `olive` | Lavender | 8 x 3 x 7 | loose pile |

## Batch 5. Small and bunches (reuses the grape bunch)

| Ingredient | Family | Room | Size (cm) | Layout |
|---|---|---|---|---|
| Cherry tomatoes | `tomato`, `vine` | Seafoam | 14 x 4 x 6 | a truss of 6 |
| Cherries | new `cherry`, `stalk` | Linen | 2.4 each | a pair on joined stems, plus one |
| Red chilies | `chili` | Spruce | 12 x 1.8 each | cluster of 3 |
| Pea pods | new `pea` | Heather | 9 x 1.5 each | three pods, one open |
| Green beans | `pea` | Thistle | 13 long | loose bundle of 10 |
| Radishes | `crimson`, `leaf` | Sage morning | 3 each, plus tops | bunch of 4 |
| Kiwi | new `kiwi` | Iris | 5 x 6.5 | whole and half |
| Raspberries | `crimson` | Mist | 6 x 3 x 6 | loose pile |

## Batch 6. Meat, fish and dairy

| Ingredient | Family | Room | Size (cm) | Layout | Flag |
|---|---|---|---|---|---|
| Chicken breast | `poultry` | Seafoam | 16 x 4 x 10 | solo | |
| Sausages | `pink-raw` | Sage morning | 13 x 3.2 each | two links, joined | |
| Bacon | `beef`, `fat` | Iris | 22 x 4 each | three wavy rashers | flat ribbon |
| Whole fish | new `fish` (silver-blue) | Apricot | 26 x 8 x 3.5 | solo, diagonal | fins and scale skin, the hardest here |
| Shrimp | new `shrimp` | a warm room | 9 x 3 each | cluster of 3 | segmented curl |
| Mussels | new `mussel` | a warm room | 7 x 3.5 each | five, two open | shell tool, a one-off |
| Tofu | new `tofu` | Lavender | 10 x 4.5 x 7 | block, one slice off | |
| Mozzarella | new `mozzarella` | Spruce | 7 | one ball, one torn half | |

## Batch 7. Bakery and pantry

| Ingredient | Family | Room | Size (cm) | Layout | Flag |
|---|---|---|---|---|---|
| Sandwich loaf ("toast") | `baked`, `crumb` | Celadon | 22 x 11 x 11 | loaf, two slices leaning | |
| Croissant | `baked` | Mist | 14 x 6 x 9 | solo | stepped crescent |
| Burger bun | `baked` | Sage morning | 10 x 5.5 | solo | sesame skin |
| Tortillas | new `tortilla` | Iris | 20 x 2 | stack of 4, top one folded | flat disc |
| Spaghetti | `pasta` | Thistle | 25 x 3 | tied bundle | strands |
| Egg noodles | `pasta` | Heather | 9 x 4 | one nest | strands |
| Chocolate | new `chocolate` | Seafoam | 15 x 1 x 7 | bar, one row snapped off | |
| Cinnamon | new `cinnamon` | Spruce | 9 x 1.2 each | cluster of 3 quills | |

## Batch 8. Big, branching and wedge

| Ingredient | Family | Room | Size (cm) | Layout | Flag |
|---|---|---|---|---|---|
| Cauliflower | new `cauliflower`, `pale-green` | Lavender | 16 x 12 | solo, in its leaves | broccoli's crown, romaine's leaves |
| Ginger | new `ginger` | Mist | 11 x 4 x 7 | solo, lying | |
| Celery | new `celery` | Heather | 30 x 7 x 6 | one bunch, diagonal | |
| Pineapple | new `pineapple` | Seafoam | 13 x 28 | solo, upright | spiky crown and eye skin, a one-off |
| Butternut squash | new `squash` | Iris | 22 x 10 | solo, lying | |
| Pumpkin wedge | new `pumpkin` | Spruce | 18 x 9 x 7 | one wedge, seed hollow | |
| Coconut | new `coconut` | Celadon | 11 x 7 | two halves | |
| Mango | new `mango` | Thistle | 11 x 8 x 7.5 | solo, lying | |

## Batch 9. Leafy and herbs (the hardest archetype, so last and smaller)

| Ingredient | Family | Room | Size (cm) | Layout | Flag |
|---|---|---|---|---|---|
| Basil | new `basil` | Thistle | 12 x 8 | one sprig | sprig tool |
| Parsley | new `parsley` | Heather | 14 x 10 | small bunch | sprig tool, finely cut leaves |
| Rosemary | `leaf`, `stalk` | Iris | 14 long | two sprigs | sprig tool |
| Kale | new `kale` | Linen | 28 x 8 | three leaves | strong ruffle |
| Bok choy | new `bok-choy` | Lavender | 18 x 8 | one head, lying | romaine's method |
| Spring onions | `leek` | Sage morning | 30 x 3 | tied bunch of 5 | |
| Beetroot | new `beet`, `leaf` | Celadon | 7, plus stems | one whole, one half | onion's cut face |

## Where references would help most

The whole fish, parsley, pineapple, mussels and kale. Ask before their batch starts.

## Progress

Nothing built yet. Update this section as each batch lands.
