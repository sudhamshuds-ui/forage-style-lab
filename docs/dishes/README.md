# Dishes

What the kitchen's Cook button reveals: a dish painted in the same style as the ingredients, built
in code from the pantry's own forms (the same peach, the same lime, cut with the knife and plated).

## How a dish is made
- **Plan first** (the user's rule, 2026-11-19: "always make a 2d drawing of the dish, its
  composition and plating first from top view...using basic forms/shapes.. and then recreate it
  using the elements. use theory of symmetry, golden ratio, BMS, circular plating"). A `Plan` in the
  dish's form file (`src/dishes/kit/plan.ts`): a circle for each pool, a rectangle for a fillet or a
  slab, a half circle for a wedge, small circles for wheels, berries and garnish, each tagged big,
  medium or small. `npm run plans` draws them to `docs/dishes/plans/{id}.svg` with the guides (the
  plate, its well, the golden circle at the plate's radius over phi, the centre cross). Compose on
  the drawing:
  - **Big, medium, small**: one hero, a few medium pieces, small ones in clusters; sizes clearly
    stepped.
  - **Circular plating**: a round base (pool, bed) centred or on the golden circle; the rest rings
    the hero.
  - **Golden ratio**: the hero's middle off centre, near the golden circle; groups split about
    62 to 38, not half and half.
  - **Symmetry, broken**: balance across the plate's centre, but never mirror-even; odd numbers
    (three, five) in each group.
  The dish is then built from the plan's own numbers, and checked from straight above against it.
- **Reference first.** Each dish starts from a reference painting made with the user's Figma AI
  (`generate_image`, GPT 2.5) in our style: soft light, muted room, a painterly gouache plate. The
  references live on the Figma page "Dish refs (generated)" (node 214:8), one board per batch.
- **The three chosen ingredients are the heroes.** A dish may add support ingredients (herbs, a
  sauce, a garnish), but they never become the hero.
- **Built in code** (`src/dishes/forms/{id}.ts`), like an ingredient, from the dish kit
  (`src/dishes/kit/`):
  - `cut.ts`, the knife: cuts any form with a plane and closes the cut with a flat face (its own
    piece, so it takes flesh colours). Halves, wedges, wheels, slices. `'radial'` maps a face from
    its own middle (a steak slice: rare at the heart, browned at the crust).
  - `ware.ts`: plates and wide bowls, with `floor(x, z)` to set food down on.
  - `pool.ts`: sauces, jams, foams and butter pools, lying in the plate's well.
  - `place.ts`: pantry forms back in cm (`inCm`), new roles (`roles`), moving (`posed`), setting
    down on a surface (`setDown`, `surfaceOf`), and `plate()` to finish.
- **Each part is painted by its own skin** (`partSkins` on the dish's entry): the peach keeps its
  velvet skin, the lime its peel. Dish skins: `ceramic` (speckled stoneware), `flesh` (a cut face:
  core to skin, citrus segments when its map's y counts them), `charred` (flesh with grill bars),
  `sauce` (wet pools). `seared` on any skin adds a crust over what faces up (1: all round).
- **Rooms**: each dish names its own (`room` on the entry).

## Review
The user reviews dishes in the **"Forage Dish Review"** preview: the Style Lab built with
`VITE_COLLECTION=dishes` (the scratchpad's `publish-dishes.sh`), so New ingredient becomes "Next
dish" and turns through the batch, the dish's name as the title, a higher camera looking down onto
the plate. Batch first: build a whole batch, publish, the user shuffles through and gives notes.
What they look at: overall beauty, composition and presentation, colours and textures,
glitches, and the form of the ingredients and their cuts. Every note becomes a lesson in
`lessons.md`, read before every batch.

## The plan: 50 dishes, in batches of six
Ingredients: apple, lemon, orange, strawberry, broccoli, baguette, hot sauce, cheese, butter,
watermelon, steak, red onion, orange pepper, chicken, avocado, red grapes, blueberries, spinach,
romaine, cabbage, salmon, rice, milk, tomato, eggs, potato, lime, garlic, mushrooms, pear, peach.

**Batch 1** (references from 2026-11-16, built 2026-11-18, in review):
1. Seared salmon, charred peach, lime foam (salmon, peach, lime)
2. Strawberry and melted cheese baguette (baguette, cheese, strawberry)
3. Tomahawk with blueberry and garlic glaze (steak, blueberries, garlic)
4. Soft egg in butter-roasted mushrooms (eggs, mushrooms, butter)
5. Grape-lacquered drumsticks on tomato jam (chicken, grapes, tomato)
6. Watermelon "tuna" rice bowl (rice, watermelon, avocado)

**Batch 2**
7. Charred cabbage wedge, brown butter, lemon (cabbage, butter, lemon)
8. Potato rösti with salmon and red onion (potato, salmon, onion)
9. Roast pear with melted cheese and honeyed garlic (pear, cheese, garlic)
10. Hot sauce chicken with lime and avocado (chicken, hot sauce, lime)
11. Baked eggs in tomato and pepper (eggs, tomato, pepper)
12. Apple, cheddar and onion toastie (apple, cheese, baguette)

**Batch 3**
13. Steak frites with garlic butter (steak, potato, garlic)
14. Spinach and mushroom omelette (eggs, spinach, mushrooms)
15. Watermelon, lime and chili salad (watermelon, lime, hot sauce)
16. Salmon rice bowl with avocado and lime (salmon, rice, avocado)
17. Strawberry milk pudding (milk, strawberry, butter)
18. Roast broccoli with lemon and garlic (broccoli, lemon, garlic)

**Batch 4**
19. Peach and tomato salad with onion (peach, tomato, onion)
20. Chicken and grape skewers (chicken, grapes, pepper)
21. Blueberry pancakes with butter (milk, blueberries, butter)
22. Orange-glazed salmon on cabbage (salmon, orange, cabbage)
23. Stuffed peppers with rice and cheese (pepper, rice, cheese)
24. Creamy potato and onion soup (potato, onion, milk)

**Batch 5**
25. Caesar-style romaine with egg and baguette croutons (romaine, eggs, baguette)
26. Pear, grapes and cheese board (pear, grapes, cheese)
27. Steak and mushroom skewers with pepper (steak, mushrooms, pepper)
28. Lemon butter chicken with spinach (chicken, lemon, spinach)
29. Apple tarte on butter pastry (apple, butter, milk)
30. Avocado toast with tomato and lime (baguette, avocado, tomato)

**Batch 6**
31. Fried rice with egg and broccoli (rice, eggs, broccoli)
32. Garlic mushrooms on toast (mushrooms, garlic, baguette)
33. Orange, strawberry and blueberry salad (orange, strawberry, blueberries)
34. Salmon with spinach and lemon cream (salmon, spinach, lemon)
35. Cabbage slaw with apple and lime (cabbage, apple, lime)
36. Hasselback potato with cheese and onion (potato, cheese, onion)

**Batch 7**
37. Peach melba-style with milk ice and berries (peach, milk, strawberry)
38. Steak salad with romaine and tomato (steak, romaine, tomato)
39. Chicken rice with cabbage and chili (chicken, rice, hot sauce)
40. Grilled pepper and peach with cheese (pepper, peach, cheese)
41. Mushroom risotto with butter (rice, mushrooms, butter)
42. Blueberry and lemon cheesecake slice (blueberries, lemon, cheese)

**Batch 8**
43. Tomato and watermelon gazpacho bowl (tomato, watermelon, pepper)
44. Pear and spinach salad with orange (pear, spinach, orange)
45. Roast chicken drumsticks with potato and garlic (chicken, potato, garlic)
46. Broccoli cheese bake (broccoli, cheese, milk)
47. Salmon and avocado on crisp rice (salmon, avocado, rice)
48. Apple and onion pan with steak slices (steak, apple, onion)

**Batch 9**
49. Strawberry and grape tart (strawberry, grapes, butter)
50. Shakshuka with spinach and bread (eggs, tomato, baguette)
