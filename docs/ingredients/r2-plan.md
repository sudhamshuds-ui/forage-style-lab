# Round 2: the next twelve ingredients

Written 2026-11-11, from the user's reference board (Figma "ref R2", node 148:29). The goal, in the
user's words: "at the end of this R2 round of making ingredients 1. we will have enough
ingredients for pantry to show visually without repeating, aesthetic bunch of ingredients, and
hopefully enough data on form, composition, colours, textures, positions of ingredients that u can
start creating food without handholding and heavy reviewing."

## Where round 1 left us

Twelve ingredients built and approved: apple, lemon, orange, strawberry, broccoli, baguette, hot
sauce, cheese, butter, watermelon, steak, chicken drumstick (the egg was skipped).

What we collected along the way:

- **The bar** (the guide's first section): the user's brief for the drumstick, approved on its
  first round. Every ingredient is held to it before the user sees it.
- **Seven style rules** (the six from board 02 plus "no crisp lines").
- **About fifty lessons** under the four lenses (colour, composition, form, recurring errors),
  each tagged with the ingredients that taught it, and a lessons record per ingredient.
- **A pre-check list of thirteen items**, from overlap to "both looks, zoomed in".
- **Families**: fourteen whole-ingredient families and thirteen part-only ones.
- **Archetypes**: seven of eight built (round, small, long, branching, wedge, contained, block).
  Leafy is the only one never built.
- **Rooms**: twelve soft rooms, one per ingredient.
- **The kit**: lathe and round recipe, stem, calyx and leaf, sweep, crown, surface nets with
  relax and lifted skins, wedge, vessel and printed label, block and paper sheet, and a distance
  field along an axis (the drumstick).

The trend: the steak took many rounds; the drumstick, built after the lessons and the pre-check
existed, was approved on its first round. The rules work.

What round 1 never exercised, and what cooking will need:

1. **Leafy forms** (thin, curling, ribbed sheets): never built.
2. **Cut forms and the whole-and-cut layout**: planned since day one, never built.
3. **Many small pieces** (grains, berries, a pile, a bunch): only the three strawberries.
4. **Containers with contents** (a bowl of something, a box): only a sealed bottle.
5. **A cooked state**: everything is raw.
6. **Cool-coloured subjects** (blue, purple): every subject so far is warm, so every room is cool.
   A blue subject needs a warm room, which the room rules do not allow yet.
7. **Mixed ingredients on one card** (a dish): never done.

## The round 2 set

| # | Ingredient | Archetype | What it teaches | New kit or system | Family |
|---|---|---|---|---|---|
| 1 | Red onion | round | papery skin streaks, a dry neck and roots | lathe with a pulled neck; a streaked skin | new `onion` (red-violet) |
| 2 | Orange bell pepper | round | deep lobes, a thick stem, a glossier skin | lobed round recipe | `orange`, or its own glossier `pepper` |
| 3 | Avocado | round, whole and cut | **the cut tool** (slice and cap) and the whole-and-cut layout | cut tool, cap faces, a pit | new `avocado` skin, `avocado-flesh`, `pit` parts |
| 4 | Grapes | small, bunch | a bunch hanging on a stem, waxy bloom, translucent glow | bunch layout (many on a branching stem) | new `grape` (red-violet) |
| 5 | Blueberries | small, pile | a loose pile that settles, a crown at each tip, dusty bloom | **scatter and settle** (a pile tool) | new `blueberry` (indigo): **needs a warm room** |
| 6 | Spinach | leafy | a bunch of leaves on stems | **the leafy kit** (a curved sheet with a rib and a stem) | `green` or a deeper `spinach` |
| 7 | Romaine | leafy | a head of long, ruffled leaves, pale ribs | leafy kit: stacked leaves | `green` with a pale rib |
| 8 | Napa cabbage | leafy | crinkled pale tops, broad white ribs | leafy kit: crinkle | `pale-green` |
| 9 | Salmon fillet | block | coral flesh with soft white fat lines, silver skin | slab with a painted stripe skin (like the steak's) | new `salmon` (coral) |
| 10 | Fried egg | cooked, flat | the first cooked state: a white pool with frilled edges, a domed yolk | a puddle tool (a flat, wobbly pool) | new `albumen` part, `yolk` |
| 11 | Rice in a bowl | contained | a mound of grains in a bowl | a bowl prop, a mound with a grain texture | new `rice` (pale), a `glaze` part for the bowl |
| 12 | Milk carton | contained | a gable-top carton, a printed label | carton shape; our own label art (never the reference's brand) | `paper` white, a green print |

## Build order

Grouped so each step adds one new tool and the next ones reuse it:

1. **Red onion**, 2. **Orange pepper**: round kit, quick, two new families. Warm-up.
3. **Avocado**: builds the cut tool and the whole-and-cut layout, which every later dish needs.
4. **Grapes** (done 2026-11-12, see `lessons/grapes.md`), 5. **Blueberries** (done 2026-11-12, see `lessons/blueberries.md`): many small pieces; the bunch and the pile. Blueberries also
   bring the first warm room.
6. **Spinach**, 7. **Romaine**, 8. **Napa cabbage**: the leafy kit, simplest first.
9. **Salmon**: reuses the steak's painted-stripe approach on a slab.
10. **Fried egg**: the first cooked state.
11. **Rice bowl**, 12. **Milk carton**: containers.

Then a **capstone**: one simple dish on one card (for example rice, salmon and half an avocado),
built with as little review as possible. That is the test of the ultimate goal.

## How each ingredient is built in round 2 (less hand-holding)

1. **A spec card first** (one message): archetype, family, size, layout, the signature features,
   the risks from the lessons, and the plan. One quick OK from the user before code.
2. **Build to the bar**, run the pre-check, compare beside two finished ingredients.
3. **One review sheet** to the user: the starting view in both looks, four sides, above and low.
4. **/forage-brand** after approval, as before. Each new kit tool goes into the guide's kit table.

## Decisions (the user, 2026-11-11)

1. **Rooms may repeat**, but never on two ingredients that look alike, and never twice in a row
   in Shuffle (to build with the first repeat).
2. **Blueberries: a loose pile.** Containers (a punnet, a box) are a separate tool, later on the
   roadmap.
3. **Avocado: one whole and one half** (the half with its pit). Done 2026-11-12, see `lessons/avocado.md`.
4. **The fried egg is an exception** to "all raw": "everything raw sometimes isnt appetizing".
   The user is also thinking about the raw meat's colours (steak, chicken): either keep them raw
   but more appetizing, or show them cooked. Open, to decide later.
5. **Milk carton: packaging.** For now our own label, like the hot sauce's, simply saying "Milk".

## Spinach: on hold, where to pick up (2026-11-13)

Branch `spinach` (not merged). Four rounds so far:

1. Seven flat leaves fanned on the table: rejected (all alike, edge on, slits).
2. A tied bunch of stemmed leaves (stem and leaf one shape, `kit/leafy.ts`): the user listed
   leaves bending and folding oddly, stem and leaf detached, obvious crossings, gaps.
3. The whole bunch as one surface (`kit/leafMass.ts`, surface nets): rejected for spinach
   ("more suited for romaine and cabbage, not for leafy greens"). The kit is kept for those.
4. Round 2's bunch, fixed: the clearing push moves a blade as one piece and the stem eases out to
   meet it (no zigzags), gentler bends, 27 leaves. The user liked how it looked lying on the floor
   (sp4f). A floating, upright variation was tried and removed.

5. Round 5 (2026-11-13), built from the notes below: blades leave their stems almost level and
   sag to the table; laid lowest first, each settles onto the table, the stems and the leaves
   below (`settleStemmedLeaf` on a `Drape` height map), folding over and round them; four outlines,
   a wide size range, mixed folds; each leaf its own veins and wrinkles in the skin.

**The user's notes on round 4** (screenshots: `lessons/img/spinach-feedback-r4-side.png`,
`lessons/img/spinach-feedback-r4-front.png`), in their words:

1. "u dont have to show it bending upwatd like that"
2. "it looks like they dont want to fold on top of eachother or around eachother"
3. "ther is very minimal folding now"
4. "all the leaves Look the same, same shape, same size, same cut, same folds same wrinkles"
5. "in reality no leaves an bend upward like that"

Claude's plan for next time:

- **Gravity, not fans.** The leaves stand up from the bundle like a fan (each leans out from the
  axis at an angle, upward ones stand in the air). Leaves are soft: from the tie they should sag,
  lie down and pour over each other toward the table, never rise. Bend each blade down along its
  length (more toward the tip) instead of leaning it out.
- **Drape onto, not clear.** The clearing push keeps every leaf a gap away from the others, so
  they never fold over or round each other. Lay leaves bottom first and let each settle onto
  what is below (like cloth over a height field): resting on it, conforming to it, folding where
  it runs over an edge, only kept from passing through.
- **More folding, varied.** Real folds: some leaves folded along the midrib (half closed), some
  with a tip turned under, a side edge rolled, a crease across; each leaf its own.
- **Every leaf its own.** Several outline types (broad spade, long narrow, round, slightly
  lobed), a wide spread of sizes (small young inner leaves, big outer ones), its own cut at the
  stem, its own fold and its own wrinkle seed in the skin, so no two read the same.
