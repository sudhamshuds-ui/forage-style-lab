# Forage Kitchen preview test sheet

A short hand-check of the next Forage Kitchen preview in the browser. The table holds up to 3 pantry items. Course is Starter, Main, Dessert, Snack or Drink. Taste is Savoury, Sweet or Both. Wild is 0, 60 or 100. Undo and tap-to-remove were requested and may land in this preview.

Work from the top. Tests **1-10** are the regressions that already failed in screenshots or in the last preview. Put only the listed ingredients on the table, set the controls, press Cook, and run the checks. If a world-dish name is refused, that can be a pass, as long as the title does not keep the refused name and the fallback plate is honest.

Companion files: [`world-dish-looks.json`](./world-dish-looks.json), [`real-world-sizes.json`](./real-world-sizes.json). Structured copy: [`test-sheet.json`](./test-sheet.json).

## Shared pass checks (every Cook)

- Sizes sit within ±15% of real-world-sizes.json (toast ~11×8×1.7 cm; lemon wheel Ø 5.5; lime wheel Ø 4.5; orange wheel Ø 7.0; garlic chips ~1.6; butter pat ~2.5×2.0×0.6; salmon ribbons ~7.5×3.5×0.3; cooked fillet 12×5×2.5 if a fillet is used at all).
- Nothing hovers or levitates (droplets, garnish, fruit, chicken, bowl shadows). Pieces rest on the food, the ware, or the rim slit.
- Every visible element comes from a table ingredient or a pantry staple (herb fleck, oil dot, icing sugar, ice). Fruit garnish, lemon wheels, berries and croutons appear only if that ingredient is on the table. Toast and pancake batter may appear when the dish type needs them.
- The title and the caption name the same dish. If a world-dish name is used, the plate matches that dish's looks note (vessel, base colour/texture, piece shapes, finish). If it cannot, the name is refused and a template dish is used instead.
- The caption does not repeat stock phrases, and it does not mention food that is not on the plate. No em dashes in title or caption.
- Savoury dishes have no syrup. Sweet dishes have no fried eggs, croutons, or savoury herb-oil unless that ingredient is honestly part of the dish.

Glass mapping in current code (tests 5, 7, 23-27): grape -> wine; apple -> coupe; pear or lime -> nick-and-nora; watermelon, spinach, avocado, pepper -> rocks; otherwise highball.

## Summary

| # | Test | Table | Course / Taste / Wild | Should produce | Watch for |
|---|------|-------|------------------------|----------------|-----------|
| 1 | Palak Paneer looks honest | Spinach, Cheese | Main / Savoury / 0 | A kadai or deep bowl of Palak Paneer, or a refused name falling back to a green spinach-and-paneer template. | The round-5 failure: sliced chicken and cheese slices on a yellow sauce on a flat plate, still titled Palak Paneer. |
| 2 | Khachapuri refused unless it is a bread boat | Baguette, Cheese, Eggs | Main / Savoury / 0 | Adjaruli Khachapuri only if the renderer can build a pointed bread boat (~22 cm) with a molten cheese pool and a raw yolk (~3.5 cm) in the centre, plus at most a thin pale butter pat. | Round-5 khachapuri.jpg: '...li Khachapuri' on flat toast with pepper strips, crumbled cheese, and huge pink-yellow butter cubes that look like cake. |
| 3 | Kaiserschmarrn is torn, not a stack | Eggs, Milk, Apple | Dessert / Sweet / 0 | Austrian Kaiserschmarrn if torn, caramelised pancake chunks (~4-5 cm) can be built and dusted with icing sugar, with stewed apple beside. | Round-5 shot: Kaiserschmarrn rendered as a neat pancake stack. |
| 4 | Crème brûlée is a ramekin, not ice cream | Milk, Eggs | Dessert / Sweet / 0 | Crème Brûlée only if a low ramekin (~10×4.5 cm) of pale custard with a crisp cracked amber caramel top can be built. | Round-5 shot: Crème Brûlée titled over ice cream on a plate (title/caption mismatch). |
| 5 | Doogh is a savoury yogurt drink | Milk, Lemon | Drink / Savoury / 0 | Persian Doogh: an opaque creamy white savoury yogurt drink in a glass (highball). | Round-5 shot: Doogh as a vanilla milkshake with a lemon wheel that isn't justified by taste, lying flat. |
| 6 | Salmorejo is a thick cold puree | Tomato, Baguette, Eggs | Starter / Savoury / 0 | Cordoban Salmorejo: a deep bowl of thick velvety coral-orange tomato-and-bread puree, garnished with egg (halved or chopped). | Being named Salmorejo while looking like a thin gazpacho, a hot tomato soup, or a cheese-topped bake. |
| 7 | Drink from bread, tomato and broccoli uses only the table | Baguette, Tomato, Broccoli | Drink / Savoury / 60 | A savoury tomato-style drink in a highball (the default glass). | The confirmed bug: Course was Drink, and the app invented a pink highball with an oversized strawberry garnish (highball-strawberry.jpg). |
| 8 | Milk and red onion drink keeps the onion, invents no lemon | Milk, Red onion | Drink / Savoury / 60 | A savoury yogurt or onion-buttermilk drink in a glass. | The reported case: a lemon wheel with no lemon on the table, and the onion omitted. |
| 9 | Broccoli and tomato lie flat on toast | Baguette, Broccoli, Tomato | Snack / Savoury / 0 | Two slices of toast on a board fitted to the bread. | broccoli-toast.jpg: standing trees, florets far too big, one tomato wedge off to the side. |
| 10 | Salmon on toast is thin ribbons, to scale, droplets touching | Baguette, Salmon, Avocado | Snack / Savoury / 0 | Salmon and avocado toast on two slices: fanned avocado (no pit), thin folded salmon ribbons or flakes draped on the bread. | The scale bug: a thick salmon brick longer than the toast, hovering droplets, toppings sliding off, or an avocado half with the pit. |
| 11 | Butter is a pale pat, never a cake block | Baguette, Butter, Tomato | Snack / Savoury / 0 | Tomato toast or pan con tomate with a small pale butter pat or a melting smear on hot bread. | The same tall butter blocks seen on the Khachapuri shot, even when the dish is ordinary toast. |
| 12 | Potato soup toppings are roast dice, sunk in | Potato, Milk, Red onion | Starter / Savoury / 0 | Potato-Leek Soup (or a close ivory potato-cream soup) in a deep soup bowl, Ø ~19 cm, liquid sitting around 5 cm. | Round-5: potato soup toppings still read as croutons; toppings perched on top of the liquid; shallow bowl; invented bread. |
| 13 | Rice-bowl toppings sink; avocado has no pit | Salmon, Rice, Avocado | Main / Savoury / 0 | A rice bowl such as Teriyaki Salmon Bowl: mixed rice in a deep bowl, glazed salmon, fanned avocado slices. | Toppings sitting neatly on top of the rice; a chicken-or-salmon piece floating beside the bowl; avocado pit; a detached shadow disc. |
| 14 | Chicken, potato and spinach as a Main is not a salad | Chicken, Potato, Spinach | Main / Savoury / 60 | A plated main: roast or sliced chicken with potato (mash, roast cubes or wedges) and wilted spinach. | Named or plated as a salad; chicken rendered as crouton cubes; grey-brown mash; spinach leaves splayed flat. |
| 15 | Romaine as a Main is a bed, not a salad dish | Romaine, Steak, Tomato | Main / Savoury / 0 | A steak main with a romaine bed or wilted leaves beside, tomato on the plate. | Owner note: romaine salad leaves splay flat like a star and croutons sit on top as big blocks, including when no bread was chosen. |
| 16 | Strawberry toast keeps the berries on the bread | Baguette, Strawberry | Dessert / Sweet / 0 | Strawberry toast or a similar dessert tartine: two slices, sliced or halved strawberries on the bread. | A dishonest Ichigo Sando name on plain toast; toppings falling off; a giant board-sized slab of bread; savoury herb oil on a sweet toast. |
| 17 | Savoury Wild 0 stays savoury, no syrup | Steak, Potato, Garlic | Main / Savoury / 0 | A straight savoury main such as Steak Frites (or Steak and potatoes). | Syrup or sweet garnish creeping onto a Wild 0 savoury plate; steak as tiny red dice on mash; a garlic bulb. |
| 18 | Sweet Wild 0 dessert stays sweet | Strawberry, Milk, Blueberries | Dessert / Sweet / 0 | A straightforward sweet dessert or a sweet lassi-like cream dessert: berries with cream, a tart, a stack, or a sweet bowl. | Earlier bug: fried eggs and lime on a caramelised apple dessert; croutons on pancakes. |
| 19 | Wild 60 does not invent a dishonest world dish | Watermelon, Cabbage, Strawberry | Starter / Savoury / 60 | A conservative plated starter that uses all three ingredients honestly, or a refused world name falling back to a template. | painterly-watermelon-cabbage.jpg caption: 'Sliced watermelon with cabbage leaves and strawberry slices over herb oil... |
| 20 | Wild 100 differs from Wild 0, still honest | Steak, Potato, Garlic | Main / Savoury / 100 | The same table as test 17, now at Wild 100. | Wild 100 being a no-op (same as Wild 0), or Wild 100 breaking taste rules to 'go wild'. |
| 21 | Repeat cooks of the same table vary | Steak, Potato, Garlic | Main / Savoury / 60 | Press Cook 3 or 4 times without changing the table or the controls. | Owner: repeated cooks look near-identical. |
| 22 | Tomato and milk as a savoury starter is not pancakes | Tomato, Milk | Starter / Savoury / 0 | A savoury starter such as a tomato-cream soup in a deep bowl, or another savoury tomato-and-dairy plate. | Round-2 bug: tomato + milk (savoury starter) became 'Pancakes with cream sauce'. |
| 23 | Highball quality (strawberry milk) | Strawberry, Milk | Drink / Sweet / 0 | A pink or blush yogurt/milk drink in a highball, such as Strawberry Lassi or Korean Strawberry Milk. | highball-strawberry.jpg issues (band through the drink, flat solid liquid, oversized garnish) even when the fruit is legitimately on the table. |
| 24 | Rocks glass (watermelon and lime) | Watermelon, Lime | Drink / Sweet / 0 | Agua de Sandía: a watermelon drink in a rocks / tumbler glass, with a lime wheel (Ø 4.5 cm) upright in a slit or beside the glass. | Wrong glass family; invented strawberry; lime wheel lying flat; etched band cutting through the liquid. |
| 25 | Coupe (apple cider) | Apple | Drink / Sweet / 0 | Spiced Apple Cider or a similar apple drink in a coupe. | A lime or strawberry appearing with only apple on the table; a floating garnish; an offset shadow blob (P1 drink bug). |
| 26 | Wine glass (grape spritz) | Red grapes, Lemon | Drink / Sweet / 0 | A sparkling grape spritz in a wine glass, with a lemon wheel (Ø 5.5 cm) upright on the rim or beside the glass. | Wrong glass; flat lemon wheel; short tasting-glass proportions so extreme the drink looks like a Nick & Nora. |
| 27 | Nick & Nora (lime and milk) | Lime, Milk | Drink / Sweet / 0 | Limonada Suíça or a similar lime-and-milk cooler in a Nick & Nora glass. | Picking a coupe or wine glass instead; a flat lime wheel; claiming Doogh (savoury, and this taste is Sweet). |
| 28 | Painterly on, then off again | Watermelon, Cabbage, Strawberry | Starter / Savoury / 60 | Cook the same table as test 19 (or reuse that plate). | painterly-watermelon-cabbage.jpg: unreadable food strokes. |
| 29 | Shuffle animation and table replace | Tomato, Broccoli, Baguette | (leave as-is) / (leave as-is) / (leave as-is) | Click Shuffle once. | Owner: Shuffle is a hard transition. |
| 30 | Randomise changes Course, Taste and Wild | Steak, Potato, Garlic | Main / Savoury / 0 | Set the controls as above, then click Randomise (not Reset). | Randomise acting like the old Reset (clearing the table, snapping back to Main/Savoury, or hanging). |
| 31 | Undo is on the left and actually undoes | Baguette, Tomato, Broccoli | Snack / Savoury / 0 | Cook once (a toast is fine). | Button missing in this preview (it was requested, and listed as coming). |
| 32 | Tap to remove a table item, without rotating the camera | Baguette, Tomato, Broccoli | Snack / Savoury / 0 | With three items on the table, tap one (or drag it back to the tray) to remove it. | Owner: there is no way to remove one item; dragging a table item rotates the camera, and later renders stay top-down. |

## Detailed checks

### 1. Palak Paneer looks honest

- **Table:** Spinach (`spinach`), Cheese (`cheese`)
- **Course / Taste / Wild:** Main / Savoury / 0
- **Vessel / dish type:** kadai or deep bowl
- **Plausible names:** Palak Paneer
- **Should produce:** A kadai or deep bowl of Palak Paneer, or a refused name falling back to a green spinach-and-paneer template. If the name is claimed: smooth, fully green spinach gravy, white or lightly golden paneer cubes (~2.2 cm) half sunk, optional cream swirl.
- **Pass checks:**
  - Base is deep emerald green and smooth, not yellow, not a cheese sauce, not a flat plate of slices.
  - Cheese is cubes, half sunk in the gravy, not slices, not chicken.
  - No meat. No syrup. Title, caption and looks note agree.
- **Watch for:** The round-5 failure: sliced chicken and cheese slices on a yellow sauce on a flat plate, still titled Palak Paneer. User is Indian; this is the honesty benchmark for all 236 dishes.
- **Covers:** round-6 Group 1; owner palak-paneer.jpg

### 2. Khachapuri refused unless it is a bread boat

- **Table:** Baguette (`baguette`), Cheese (`cheese`), Eggs (`eggs`)
- **Course / Taste / Wild:** Main / Savoury / 0
- **Vessel / dish type:** board (fitted to the bread)
- **Plausible names:** Adjaruli Khachapuri (only if the boat exists)
- **Should produce:** Adjaruli Khachapuri only if the renderer can build a pointed bread boat (~22 cm) with a molten cheese pool and a raw yolk (~3.5 cm) in the centre, plus at most a thin pale butter pat. Otherwise refuse the name and serve a cheese-and-egg bread plate or toast that does not claim Khachapuri.
- **Pass checks:**
  - If titled Khachapuri: boat-shaped crust, melted cheese inside, yolk in the middle. Never flat baguette toast with that name.
  - Any butter is a small pale pat (~2.5×2.0×0.6 cm) or a melting smear, never a tall pink or yellow block.
  - No raw pepper strips (pepper is not on the table). No syrup. Board sized to the bread, not a huge empty board.
- **Watch for:** Round-5 khachapuri.jpg: '...li Khachapuri' on flat toast with pepper strips, crumbled cheese, and huge pink-yellow butter cubes that look like cake.
- **Covers:** round-6 Group 1 and 3f; Group 7 butter; owner khachapuri.jpg

### 3. Kaiserschmarrn is torn, not a stack

- **Table:** Eggs (`eggs`), Milk (`milk`), Apple (`apple`)
- **Course / Taste / Wild:** Dessert / Sweet / 0
- **Vessel / dish type:** plate
- **Plausible names:** Austrian Kaiserschmarrn (only if torn chunks exist)
- **Should produce:** Austrian Kaiserschmarrn if torn, caramelised pancake chunks (~4-5 cm) can be built and dusted with icing sugar, with stewed apple beside. If the renderer can only make a neat American stack, refuse the name and serve a template dessert that does not claim Kaiserschmarrn.
- **Pass checks:**
  - If named Kaiserschmarrn: a loose heap of irregular torn pieces, not a tidy stack of 3 round pancakes, plus a snowfall of icing sugar.
  - Apple is present as compote or slices. No herbs, croutons, or savoury oil.
  - Title and caption agree.
- **Watch for:** Round-5 shot: Kaiserschmarrn rendered as a neat pancake stack.
- **Covers:** round-6 Group 1a; owner round-5 test

### 4. Crème brûlée is a ramekin, not ice cream

- **Table:** Milk (`milk`), Eggs (`eggs`)
- **Course / Taste / Wild:** Dessert / Sweet / 0
- **Vessel / dish type:** ramekin
- **Plausible names:** Crème Brûlée (only if the ramekin exists)
- **Should produce:** Crème Brûlée only if a low ramekin (~10×4.5 cm) of pale custard with a crisp cracked amber caramel top can be built. Otherwise refuse the name. Do not plate a quenelle of ice cream and call it Crème Brûlée.
- **Pass checks:**
  - If named Crème Brûlée: ramekin, pale custard, cracked caramel lid. Never ice cream on a flat plate under that title.
  - No herbs, croutons, or a berry pile hiding the top (no fruit is on the table).
  - Title and caption describe the same dish. A refused name must not stay in the title.
- **Watch for:** Round-5 shot: Crème Brûlée titled over ice cream on a plate (title/caption mismatch). ware.ts still has no ramekin - a leftover name is a fail.
- **Covers:** round-6 Group 1a/b; owner round-5 test

### 5. Doogh is a savoury yogurt drink

- **Table:** Milk (`milk`), Lemon (`lemon`)
- **Course / Taste / Wild:** Drink / Savoury / 0
- **Vessel / dish type:** glass (highball)
- **Plausible names:** Persian Doogh
- **Should produce:** Persian Doogh: an opaque creamy white savoury yogurt drink in a glass (highball). A lemon wheel (Ø 5.5 cm) may sit upright in a rim slit or beside the glass, because lemon is on the table. Optional mint fleck only as a pantry herb; no invented fruit.
- **Pass checks:**
  - Looks like a salted yogurt drink, not a vanilla milkshake and not a pink fruit smoothie.
  - Garnish is only lemon (on the table). The wheel stands upright through a slit, or sits beside; it does not float flat on the liquid.
  - Etched band, if any, stays on the glass surface, thin and subtle, not a pale stripe through the drink. Liquid has a slight vertical gradient. Shadow starts at the foot.
- **Watch for:** Round-5 shot: Doogh as a vanilla milkshake with a lemon wheel that isn't justified by taste, lying flat. After this test, flip Taste to Sweet and Cook again: it should become something like Punjabi Sweet Lassi, not stay Doogh.
- **Covers:** round-6 Group 1a and Group 4; owner round-5 test

### 6. Salmorejo is a thick cold puree

- **Table:** Tomato (`tomato`), Baguette (`baguette`), Eggs (`eggs`)
- **Course / Taste / Wild:** Starter / Savoury / 0
- **Vessel / dish type:** deep soup bowl (Ø ~19 cm, liquid ~5 cm)
- **Plausible names:** Cordoban Salmorejo
- **Should produce:** Cordoban Salmorejo: a deep bowl of thick velvety coral-orange tomato-and-bread puree, garnished with egg (halved or chopped). Not a thin gazpacho, not a tomato soup with floating bread cubes.
- **Pass checks:**
  - Base is thick coral-orange, not a watery clear red broth and not melted cheese.
  - Egg garnish is present (eggs are on the table). Bread belongs in the puree; if a slice sits on the side it is flavoured from the table, not a random crouton heap.
  - No syrup. Title matches caption and the looks note. Toppings, if any, sink about a third of their height.
- **Watch for:** Being named Salmorejo while looking like a thin gazpacho, a hot tomato soup, or a cheese-topped bake. Andalusian Gazpacho is a different dish (no egg hero; thinner).
- **Covers:** round-6 Group 1; owner request to re-check Salmorejo

### 7. Drink from bread, tomato and broccoli uses only the table

- **Table:** Baguette (`baguette`), Tomato (`tomato`), Broccoli (`broccoli`)
- **Course / Taste / Wild:** Drink / Savoury / 60
- **Vessel / dish type:** glass (highball)
- **Plausible names:** a tomato juice / savoury highball (not a named fruit drink)
- **Should produce:** A savoury tomato-style drink in a highball (the default glass). Tomato is in the liquid. Garnish, if any, is tomato or broccoli from the table, never a strawberry or other invented fruit. Broccoli and bread must still be accounted for (in the glass, as a rim or side garnish, or as a blended ingredient) - they are not silently dropped.
- **Pass checks:**
  - No strawberry, no pink berry liquid, no lemon wheel (none of those are on the table).
  - Liquid is tomato-forward (red or amber), with a slight vertical gradient, not a flat solid block. Etched band is not a stripe through the drink.
  - Any rim garnish is a small piece of a table ingredient, standing upright in a slit. Shadow starts at the foot. Ice, if present, reads as cubes (~2.5 cm), not crushed 1 cm chips.
- **Watch for:** The confirmed bug: Course was Drink, and the app invented a pink highball with an oversized strawberry garnish (highball-strawberry.jpg). Also: dropping broccoli or bread from the dish entirely.
- **Covers:** round-6 Group 2 and Group 4; owner drink bug; covers highball glass

### 8. Milk and red onion drink keeps the onion, invents no lemon

- **Table:** Milk (`milk`), Red onion (`onion`)
- **Course / Taste / Wild:** Drink / Savoury / 60
- **Vessel / dish type:** glass (highball)
- **Plausible names:** a savoury yogurt / onion drink (not Doogh, which needs lemon)
- **Should produce:** A savoury yogurt or onion-buttermilk drink in a glass. Onion must appear (in the liquid, as a small garnish, or clearly blended). No citrus unless it is on the table.
- **Pass checks:**
  - Onion is not dropped. No lemon wheel, no lime, no strawberry, no other invented fruit.
  - Garnish that is present stands in a rim slit or sits beside. Nothing floats flat on the surface.
  - Title does not claim Persian Doogh (lemon is missing, so the looks minimum cannot be met).
- **Watch for:** The reported case: a lemon wheel with no lemon on the table, and the onion omitted.
- **Covers:** round-6 Group 2; pick.test.ts onionDrink

### 9. Broccoli and tomato lie flat on toast

- **Table:** Baguette (`baguette`), Broccoli (`broccoli`), Tomato (`tomato`)
- **Course / Taste / Wild:** Snack / Savoury / 0
- **Vessel / dish type:** board, sized to the two toasts
- **Plausible names:** a tomato and broccoli tartine / bruschetta-style toast (not a named pasta dish)
- **Should produce:** Two slices of toast on a board fitted to the bread. Broccoli is halved or chopped florets, 3-5 cm, laid flat and spread across both slices. Tomato is on the toast (wheels Ø ~6.5 cm or smaller dice/wedges), not a single wedge parked beside the board.
- **Pass checks:**
  - Two toast slices, ~11×8×1.7 cm, toppings sitting on the bread, nothing falling off.
  - No whole florets standing upright like trees, and no 7.5 cm broccoli head.
  - Board has about a finger's width of wood around the food, not a huge empty board. No syrup.
- **Watch for:** broccoli-toast.jpg: standing trees, florets far too big, one tomato wedge off to the side. Form is wrong, not just scale.
- **Covers:** round-6 Group 3e and Group 7 scale; owner broccoli-toast.jpg

### 10. Salmon on toast is thin ribbons, to scale, droplets touching

- **Table:** Baguette (`baguette`), Salmon (`salmon`), Avocado (`avocado`)
- **Course / Taste / Wild:** Snack / Savoury / 0
- **Vessel / dish type:** board, sized to the two toasts
- **Plausible names:** Salmon Avocado Toast
- **Should produce:** Salmon and avocado toast on two slices: fanned avocado (no pit), thin folded salmon ribbons or flakes draped on the bread. A plausible world name is Salmon Avocado Toast. Never a whole cooked fillet brick.
- **Pass checks:**
  - Toast stays ~11×8×1.7 cm. Salmon is ribbons ~7.5×3.5×0.3 cm (or small flakes), not a 13×6.2×3.4 cm cooked fillet, and not longer than the bread.
  - Salmon and avocado sit on the toast, not scattered onto the board. Oil droplets touch the food or bread; nothing hovers.
  - Avocado is slices, a fan, dice or smash - never a half with the brown seed. No syrup. Title matches caption.
- **Watch for:** The scale bug: a thick salmon brick longer than the toast, hovering droplets, toppings sliding off, or an avocado half with the pit.
- **Covers:** round-6 Group 7 scale + toast toppings; owner salmon/toast notes

### 11. Butter is a pale pat, never a cake block

- **Table:** Baguette (`baguette`), Butter (`butter`), Tomato (`tomato`)
- **Course / Taste / Wild:** Snack / Savoury / 0
- **Vessel / dish type:** board
- **Plausible names:** Pan con Tomate, Bruschetta Pomodoro, tomato toast
- **Should produce:** Tomato toast or pan con tomate with a small pale butter pat or a melting smear on hot bread. Two slices on a fitted board.
- **Pass checks:**
  - Butter, if visible, is a thin pale tile ~2.5×2.0×0.6 cm or a smear - not a 2.6×2.6×1.6 cm pink or yellow cube.
  - Toppings stay on the toast. Tomato is from the table. No syrup, no invented cheese or pepper.
- **Watch for:** The same tall butter blocks seen on the Khachapuri shot, even when the dish is ordinary toast.
- **Covers:** round-6 Group 3f; owner butter complaint

### 12. Potato soup toppings are roast dice, sunk in

- **Table:** Potato (`potato`), Milk (`milk`), Red onion (`onion`)
- **Course / Taste / Wild:** Starter / Savoury / 0
- **Vessel / dish type:** deep soup bowl (not a pasta bowl, not a rice bowl, not a plate)
- **Plausible names:** Potato-Leek Soup
- **Should produce:** Potato-Leek Soup (or a close ivory potato-cream soup) in a deep soup bowl, Ø ~19 cm, liquid sitting around 5 cm. Smooth silky pale ivory base. If potato pieces sit in the soup they are golden, irregular diced roast potato (~2.2 cm), sunk about a third of their height with a slight varied tilt.
- **Pass checks:**
  - No croutons and no side bread (baguette is not on the table).
  - Potato toppings do not read as bread cubes. Some pieces break the surface; none hover.
  - Bowl sits on its foot, shadow centred under it, not a detached disc that makes the bowl float.
- **Watch for:** Round-5: potato soup toppings still read as croutons; toppings perched on top of the liquid; shallow bowl; invented bread.
- **Covers:** round-6 Group 3g/h; owner mid-run potato soup notes

### 13. Rice-bowl toppings sink; avocado has no pit

- **Table:** Salmon (`salmon`), Rice (`rice`), Avocado (`avocado`)
- **Course / Taste / Wild:** Main / Savoury / 0
- **Vessel / dish type:** rice / donburi bowl (ideally Ø 16-18 cm; current code is 13.2 - flag if it looks cramped, but don't fail a slightly small chawan if the food is honest)
- **Plausible names:** Teriyaki Salmon Bowl
- **Should produce:** A rice bowl such as Teriyaki Salmon Bowl: mixed rice in a deep bowl, glazed salmon, fanned avocado slices. Toppings sink about a third into the rice, with varied tilt.
- **Pass checks:**
  - Rice has some mix-through, not a plain white dome. Salmon and avocado are in or on the rice, not hovering beside the bowl.
  - Avocado is slices or a fan, never a half with the seed. If a fillet is used it is ~12×5×2.5 cm, not a 3.4 cm-thick brick.
  - Shadow sits under the foot. No syrup.
- **Watch for:** Toppings sitting neatly on top of the rice; a chicken-or-salmon piece floating beside the bowl; avocado pit; a detached shadow disc.
- **Covers:** round-6 Group 3g and Group 7; pick.test.ts salmon+rice+avocado

### 14. Chicken, potato and spinach as a Main is not a salad

- **Table:** Chicken (`chicken`), Potato (`potato`), Spinach (`spinach`)
- **Course / Taste / Wild:** Main / Savoury / 60
- **Vessel / dish type:** plate (or a skillet if one exists)
- **Plausible names:** a roast / skillet / composed chicken main (no required world name)
- **Should produce:** A plated main: roast or sliced chicken with potato (mash, roast cubes or wedges) and wilted spinach. Not a salad, and the title must not say salad.
- **Pass checks:**
  - Title does not match /salad/i. Layout is not a leaf-salad.
  - Chicken is slices, torn meat or a drumstick (~12×4 cm), not crouton-like cubes (cubes are for soup only).
  - Potato reads as potato (vibrant mash or roast dice), not bread cubes. Spinach is wilted leaves, not a flat star. No syrup.
- **Watch for:** Named or plated as a salad; chicken rendered as crouton cubes; grey-brown mash; spinach leaves splayed flat.
- **Covers:** round-6 honest mains; pick.test.ts chicken+potato+spinach Main

### 15. Romaine as a Main is a bed, not a salad dish

- **Table:** Romaine (`romaine`), Steak (`steak`), Tomato (`tomato`)
- **Course / Taste / Wild:** Main / Savoury / 0
- **Vessel / dish type:** plate
- **Plausible names:** a steak with a romaine bed (not a Caesar or named tossed salad)
- **Should produce:** A steak main with a romaine bed or wilted leaves beside, tomato on the plate. A main is never itself a salad. (If you later set Course to Starter, a mounded tossed salad is allowed - but that is a different cook.)
- **Pass checks:**
  - The dish reads as a main with steak as the hero. Romaine is a leaf bed or a side, not a flat star of leaves titled as a salad.
  - No croutons (baguette is not on the table). Tomato is present. No syrup.
  - Leaves form a mounded nest if they are the bed, not a radial splay.
- **Watch for:** Owner note: romaine salad leaves splay flat like a star and croutons sit on top as big blocks, including when no bread was chosen. Title 'Romaine salad' on a Main.
- **Covers:** round-6 mains-are-not-salads; owner romaine notes

### 16. Strawberry toast keeps the berries on the bread

- **Table:** Baguette (`baguette`), Strawberry (`strawberry`)
- **Course / Taste / Wild:** Dessert / Sweet / 0
- **Vessel / dish type:** board, sized to the toast
- **Plausible names:** strawberry toast / tartine (not Ichigo Sando)
- **Should produce:** Strawberry toast or a similar dessert tartine: two slices, sliced or halved strawberries on the bread. Do not claim Ichigo Sando (that needs milk and a special sandwich form the renderer does not have). A contrasting syrup is allowed on this sweet dish; it must not be strawberry-on-strawberry if a syrup is used.
- **Pass checks:**
  - Strawberries sit on the toast, not beside it or hovering. Toast ~11×8×1.7 cm, two slices if the layout is toast.
  - No invented lemon, mint, or other fruit. Title does not claim Ichigo Sando unless a cream-filled sandwich is actually built.
  - Caption matches the plate.
- **Watch for:** A dishonest Ichigo Sando name on plain toast; toppings falling off; a giant board-sized slab of bread; savoury herb oil on a sweet toast.
- **Covers:** round-6 strawberry toast; can't-render list for ichigo-sando

### 17. Savoury Wild 0 stays savoury, no syrup

- **Table:** Steak (`steak`), Potato (`potato`), Garlic (`garlic`)
- **Course / Taste / Wild:** Main / Savoury / 0
- **Vessel / dish type:** plate (Ø ~27 cm, or shrunk to the food)
- **Plausible names:** Steak Frites, Steak and mash
- **Should produce:** A straight savoury main such as Steak Frites (or Steak and potatoes). Fries ~6-8×1.2 cm or a yellow-white mash dome ~10×3.5 cm, sliced steak ~14×8×2.5 cm, garlic as chips (~1.6 cm) only, never a bulb.
- **Pass checks:**
  - No syrup, no fruit garnish, no blueberries, no dessert components, no fried egg unless eggs are on the table (they are not).
  - Garlic is chips, never a whole bulb. Mash, if used, is vibrant yellow-white and a real dome, not a 1 cm-flat pancake and not grey-brown.
  - Title and caption agree. Composition is centred.
- **Watch for:** Syrup or sweet garnish creeping onto a Wild 0 savoury plate; steak as tiny red dice on mash; a garlic bulb.
- **Covers:** round-6 Group 7 no syrup on savoury; Wild 0 discipline; owner steak-on-mash

### 18. Sweet Wild 0 dessert stays sweet

- **Table:** Strawberry (`strawberry`), Milk (`milk`), Blueberries (`blueberries`)
- **Course / Taste / Wild:** Dessert / Sweet / 0
- **Vessel / dish type:** plate, tart or dessert bowl - not a glass (Course is Dessert)
- **Plausible names:** a berry cream dessert, tart, or sweet bowl (Strawberry Lassi is a Drink, so not this course)
- **Should produce:** A straightforward sweet dessert or a sweet lassi-like cream dessert: berries with cream, a tart, a stack, or a sweet bowl. No fried eggs, no croutons, no lime, no savoury herb oil.
- **Pass checks:**
  - Every berry is from the table. Milk may appear as cream, ice cream, a pancake stack or a custard.
  - No fried egg, no croutons, no invented citrus, no savoury salad dressing.
  - If pancakes appear they are a stack of about 3, Ø ~12 cm, with a contrasting syrup (not the same berry already on the plate).
- **Watch for:** Earlier bug: fried eggs and lime on a caramelised apple dessert; croutons on pancakes. Also a single flat pancake standing in for a stack.
- **Covers:** round-6 sweet rules at Wild 0; P1 savoury-on-sweet bug

### 19. Wild 60 does not invent a dishonest world dish

- **Table:** Watermelon (`watermelon`), Cabbage (`cabbage`), Strawberry (`strawberry`)
- **Course / Taste / Wild:** Starter / Savoury / 60
- **Vessel / dish type:** plate or shallow bowl
- **Plausible names:** a composed fruit-and-cabbage starter (no forced world name)
- **Should produce:** A conservative plated starter that uses all three ingredients honestly, or a refused world name falling back to a template. Fruit may sit with cabbage, but do not dress a fruit plate as a traditional savoury national salad with herb oil and a shaky 'the Polish way' caption if that is not a real match.
- **Pass checks:**
  - All three ingredients appear. No invented lemon, cheese, or bread.
  - If a world-dish name is used, the plate matches that dish's looks note; otherwise the name is refused.
  - Sizes: watermelon as cubes ~3 cm or a plated wedge, not a whole melon; strawberries sliced; cabbage as leaves or a wedge, not a whole head.
- **Watch for:** painterly-watermelon-cabbage.jpg caption: 'Sliced watermelon with cabbage leaves and strawberry slices over herb oil... the Polish way' - a shaky world-dish match and a sweet/savoury muddle. After the cook, optionally toggle painterly (see test 27).
- **Covers:** round-6 Group 1 honesty + Group 5; owner painterly-watermelon-cabbage.jpg

### 20. Wild 100 differs from Wild 0, still honest

- **Table:** Steak (`steak`), Potato (`potato`), Garlic (`garlic`)
- **Course / Taste / Wild:** Main / Savoury / 100
- **Vessel / dish type:** plate
- **Plausible names:** Steak Frites or another fitting savoury steak-and-potato main, not a random dessert
- **Should produce:** The same table as test 17, now at Wild 100. It should visibly differ (another cut, arrangement, garnish, or another fitting savoury main). It may be more adventurous, but it is still a savoury main with only table ingredients, no syrup, and real-world sizes.
- **Pass checks:**
  - The plate is not identical to the Wild 0 cook of the same table (test 17). Cook test 17 first and compare.
  - Still no syrup, no invented fruit, no garlic bulb, no dessert rename.
  - Sizes still clamp to ±15% of true. Title matches caption.
- **Watch for:** Wild 100 being a no-op (same as Wild 0), or Wild 100 breaking taste rules to 'go wild'.
- **Covers:** round-6 Wild bands; pick.test.ts Wild 0 vs 100

### 21. Repeat cooks of the same table vary

- **Table:** Steak (`steak`), Potato (`potato`), Garlic (`garlic`)
- **Course / Taste / Wild:** Main / Savoury / 60
- **Vessel / dish type:** plate
- **Plausible names:** Steak Frites or another fitting main, possibly alternating
- **Should produce:** Press Cook 3 or 4 times without changing the table or the controls. Each plate should still be a fitting savoury steak-and-potato main, but arrangement, piece choice, garnish, and sometimes the dish itself should change more than a tiny nudge.
- **Pass checks:**
  - At least two of the four cooks are clearly distinguishable (different cut, layout, garnish, or a second fitting dish).
  - Every cook still uses only table ingredients, stays savoury, and keeps real-world sizes.
  - Captions are not copy-pasted stock lines with the same repeated phrase every time.
- **Watch for:** Owner: repeated cooks look near-identical. A 1-degree rotation or a single oil-dot moved 2 mm is not enough.
- **Covers:** round-6 Group 3i; owner mid-run variety note

### 22. Tomato and milk as a savoury starter is not pancakes

- **Table:** Tomato (`tomato`), Milk (`milk`)
- **Course / Taste / Wild:** Starter / Savoury / 0
- **Vessel / dish type:** deep soup bowl or a starter plate - not a pancake stack
- **Plausible names:** a tomato-cream soup or savoury tomato starter (not pancakes, not a lassi)
- **Should produce:** A savoury starter such as a tomato-cream soup in a deep bowl, or another savoury tomato-and-dairy plate. Not pancakes, not a dessert.
- **Pass checks:**
  - Layout is not pancake-stack. No syrup. Milk may appear as cream in the soup or on the plate.
  - Tomato is clearly present. No invented potato mash (potato is not on the table).
  - If it is a soup, toppings sink about a third; no croutons without bread on the table.
- **Watch for:** Round-2 bug: tomato + milk (savoury starter) became 'Pancakes with cream sauce'.
- **Covers:** historical pancake mis-course; savoury Wild 0

### 23. Highball quality (strawberry milk)

- **Table:** Strawberry (`strawberry`), Milk (`milk`)
- **Course / Taste / Wild:** Drink / Sweet / 0
- **Vessel / dish type:** glass (highball)
- **Plausible names:** Strawberry Lassi, Korean Strawberry Milk
- **Should produce:** A pink or blush yogurt/milk drink in a highball, such as Strawberry Lassi or Korean Strawberry Milk. A small halved strawberry may stand in a rim slit (strawberry is on the table). Side fruit slices beside the glass are welcome.
- **Pass checks:**
  - Garnish is a smaller halved berry on a slit, standing upright, slightly tilted out - not an oversized wedge lying flat, and not a fruit that is not on the table.
  - Etched band, if present, is a thin surface detail, not a pale stripe through the liquid. Liquid has a slight vertical colour gradient, not a flat solid pink block.
  - Shadow starts at the foot. Ice, if any, ~2.5 cm. Title matches caption.
- **Watch for:** highball-strawberry.jpg issues (band through the drink, flat solid liquid, oversized garnish) even when the fruit is legitimately on the table. Also claiming Doogh (that is savoury, and has no strawberry).
- **Covers:** round-6 Group 4; highball glass; owner highball-strawberry.jpg quality notes

### 24. Rocks glass (watermelon and lime)

- **Table:** Watermelon (`watermelon`), Lime (`lime`)
- **Course / Taste / Wild:** Drink / Sweet / 0
- **Vessel / dish type:** glass (rocks)
- **Plausible names:** Agua de Sandia
- **Should produce:** Agua de Sandía: a watermelon drink in a rocks / tumbler glass, with a lime wheel (Ø 4.5 cm) upright in a slit or beside the glass.
- **Pass checks:**
  - Glass is a short wide tumbler (~8.3×8.5 cm), not a highball and not a stemmed glass.
  - Lime is the only garnish fruit (it is on the table). Wheel stands in a slit; it does not float flat. No strawberry, no lemon.
  - Same glass-quality checks as test 23: band, gradient, shadow at the foot, ice size.
- **Watch for:** Wrong glass family; invented strawberry; lime wheel lying flat; etched band cutting through the liquid.
- **Covers:** round-6 Group 4; rocks glass; agua-de-sandia

### 25. Coupe (apple cider)

- **Table:** Apple (`apple`)
- **Course / Taste / Wild:** Drink / Sweet / 0
- **Vessel / dish type:** glass (coupe)
- **Plausible names:** Spiced Apple Cider, Hot Apple Cider
- **Should produce:** Spiced Apple Cider or a similar apple drink in a coupe. Apple is the only fruit. Side apple slices beside the glass are welcome.
- **Pass checks:**
  - Glass is a wide stemmed coupe (bowl ~10.4 cm), not a wine glass or a tumbler.
  - No invented lemon, lime, or strawberry garnish. Any apple garnish stands in a slit or sits beside.
  - Shadow starts at the foot, no offset ring, no grey pebble stuck at the stem base. Liquid has a slight gradient.
- **Watch for:** A lime or strawberry appearing with only apple on the table; a floating garnish; an offset shadow blob (P1 drink bug).
- **Covers:** round-6 Group 4; coupe glass; glass.ts apple → coupe

### 26. Wine glass (grape spritz)

- **Table:** Red grapes (`grapes`), Lemon (`lemon`)
- **Course / Taste / Wild:** Drink / Sweet / 0
- **Vessel / dish type:** glass (wine)
- **Plausible names:** Sparkling Grape Spritz
- **Should produce:** A sparkling grape spritz in a wine glass, with a lemon wheel (Ø 5.5 cm) upright on the rim or beside the glass.
- **Pass checks:**
  - Glass is a stemmed wine glass. Bowl diameter ~8 cm is fine. Height is currently ~16 cm vs a true 20-24 cm - note it, fail only if it no longer reads as a wine glass.
  - Lemon wheel from the table, upright in a slit, not floating flat. Grapes may appear as berries beside. No invented strawberry.
  - Shadow at the foot, slight liquid gradient, no grey pebble at the stem.
- **Watch for:** Wrong glass; flat lemon wheel; short tasting-glass proportions so extreme the drink looks like a Nick & Nora. Known: wine glass is short in current code.
- **Covers:** round-6 Group 4; wine glass; glass.ts grape → wine

### 27. Nick & Nora (lime and milk)

- **Table:** Lime (`lime`), Milk (`milk`)
- **Course / Taste / Wild:** Drink / Sweet / 0
- **Vessel / dish type:** glass (nick-and-nora)
- **Plausible names:** Limonada Suica
- **Should produce:** Limonada Suíça or a similar lime-and-milk cooler in a Nick & Nora glass.
- **Pass checks:**
  - Glass is a small stemmed cocktail glass (rim ~6.5-7.5 cm, height ~12-14 cm), not a wine glass or a coupe.
  - Lime garnish only, upright in a slit. No lemon, no strawberry. Milk is in the liquid.
  - Shadow at the foot, slight gradient, no invented fruit.
- **Watch for:** Picking a coupe or wine glass instead; a flat lime wheel; claiming Doogh (savoury, and this taste is Sweet).
- **Covers:** round-6 Group 4; nick-and-nora glass; glass.ts lime → nick-and-nora

### 28. Painterly on, then off again

- **Table:** Watermelon (`watermelon`), Cabbage (`cabbage`), Strawberry (`strawberry`)
- **Course / Taste / Wild:** Starter / Savoury / 60
- **Vessel / dish type:** (same as test 19)
- **Plausible names:** same plate as test 19
- **Should produce:** Cook the same table as test 19 (or reuse that plate). Turn the brush / painterly style on, inspect the food, then turn it off and click through at least one more screen (Shuffle, or a new Cook).
- **Pass checks:**
  - With painterly on: strokes on the food are about a quarter of the old strawberry-slice size, so you can still tell watermelon, cabbage and strawberry apart. Finer strokes near edges and highlights. The table and background may stay loose.
  - With painterly off: the default style returns on this plate and on the next screen. No leftover brush look.
  - Switching back does not freeze or slow the page (screen changes must not take 60s+).
- **Watch for:** painterly-watermelon-cabbage.jpg: unreadable food strokes. After switching off, every later screen stays painterly and the app crawls. That switch-back leak is a fail even if the new stroke size is good.
- **Covers:** round-6 Group 5; owner painterly note

### 29. Shuffle animation and table replace

- **Table:** Tomato (`tomato`), Broccoli (`broccoli`), Baguette (`baguette`)
- **Course / Taste / Wild:** (leave as-is) / (leave as-is) / (leave as-is)
- **Vessel / dish type:** n/a
- **Plausible names:** n/a (UI)
- **Should produce:** Click Shuffle once. Tray tiles and the items already on the table both change. The motion is staggered out (lift + fade) then staggered in (drop + a slight bounce), about 0.5s total, not a hard cut.
- **Pass checks:**
  - Table items are replaced, not only the tray.
  - The motion is staggered and about half a second, on both tiles and table items.
  - After Shuffle, a Cook still works and the camera is not stuck top-down.
- **Watch for:** Owner: Shuffle is a hard transition. Earlier: Shuffle changed the tray but left the table as-is. Dragging during Shuffle must not leave the camera rotated or locked.
- **Covers:** round-6 Group 6p; owner Shuffle note

### 30. Randomise changes Course, Taste and Wild

- **Table:** Steak (`steak`), Potato (`potato`), Garlic (`garlic`)
- **Course / Taste / Wild:** Main / Savoury / 0
- **Vessel / dish type:** n/a
- **Plausible names:** n/a (UI)
- **Should produce:** Set the controls as above, then click Randomise (not Reset). Course, Taste and/or Wild should change to a new random combination. Ingredients may stay (Randomise is the settings control; Shuffle is for ingredients).
- **Pass checks:**
  - At least one of Course, Taste, Wild is different after Randomise. Click a few times if the first roll matches by chance.
  - It is instant, or close to it - not the old 15-30s Reset shatter that ignored clicks.
  - A following Cook uses the new settings (for example Drink actually produces a glass).
- **Watch for:** Randomise acting like the old Reset (clearing the table, snapping back to Main/Savoury, or hanging). Or changing nothing.
- **Covers:** round-6 Kitchen UI; P1 Randomise request

### 31. Undo is on the left and actually undoes

- **Table:** Baguette (`baguette`), Tomato (`tomato`), Broccoli (`broccoli`)
- **Course / Taste / Wild:** Snack / Savoury / 0
- **Vessel / dish type:** n/a
- **Plausible names:** n/a (UI)
- **Should produce:** Cook once (a toast is fine). Change something - Cook again, or Shuffle, or tap an ingredient off the table - then press Undo. The previous state comes back. The Undo button sits on the left of the kitchen UI.
- **Pass checks:**
  - Undo is visible on the left, not only on the right or hidden in a menu.
  - One press restores the last Cook or the last table change (whichever was implemented). A second press can go further back if a stack exists.
  - Undo does not reset Course/Taste/Wild unless those were what changed, and it does not lock the camera top-down.
- **Watch for:** Button missing in this preview (it was requested, and listed as coming). A control that clears everything like Reset is not Undo.
- **Covers:** owner: Undo button on the left; round-6 Group 6

### 32. Tap to remove a table item, without rotating the camera

- **Table:** Baguette (`baguette`), Tomato (`tomato`), Broccoli (`broccoli`)
- **Course / Taste / Wild:** Snack / Savoury / 0
- **Vessel / dish type:** n/a
- **Plausible names:** n/a (UI)
- **Should produce:** With three items on the table, tap one (or drag it back to the tray) to remove it. The table then holds the remaining two. Cook should use only what is left. Dragging an item must not rotate the camera or leave later renders stuck top-down.
- **Pass checks:**
  - A single table item can be removed without clearing the whole table.
  - The next Cook omits the removed ingredient and does not invent it back.
  - Camera stays in the normal kitchen view after a drag or a tap.
- **Watch for:** Owner: there is no way to remove one item; dragging a table item rotates the camera, and later renders stay top-down. This control was listed as coming - fail if it is still missing or if the camera bug remains.
- **Covers:** round-6 Group 6o; owner tap-to-remove / camera bug

