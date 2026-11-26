# Test links for the test sheet, checks 1 to 12

Each link opens the Forage Kitchen preview with the check's table and controls set and cooks straight away (`seed=0` is the first press of Cook; `seed=1` the second, and so on; with no `seed` it is the first press). Cook is pressed as soon as the table holds every item, and pressed again until it takes. Add `&cook=0` to set the table and controls without cooking.

Add `&shot=1` for screenshots: the side panel, the tray and the buttons are hidden, the card fills the frame, and the dish's title and caption sit under it as plain text. For automated checks, the table's canvas carries `data-ingredients` (the table's items, comma separated, also while a dish is shown), and the dish text (`#dish-text`, and `#shot-words` in shot mode) carries `data-title` and `data-caption` once a dish is cooked.

If the preview host drops the part after `?`, the same text works after `#` instead (the kitchen reads either). Locally the same query works on `http://localhost:5173/kitchen.html`. Add `&test=1` (or open the page with `?test=1`) to show the test tools: a search button in the tray that lists all 31 ingredients and a menu of all 32 test-sheet checks. Normal visitors never see them.

| # | Check | Table | Course / Taste / Wild | Link |
|---|---|---|---|---|
| 1 | Palak Paneer looks honest | Spinach, Cheese | Main / Savoury / 0 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=spinach,cheese&course=main&taste=savoury&wild=0&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=spinach,cheese&course=main&taste=savoury&wild=0&seed=0)) |
| 2 | Khachapuri refused unless it is a bread boat | Baguette, Cheese, Eggs | Main / Savoury / 0 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=baguette,cheese,eggs&course=main&taste=savoury&wild=0&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=baguette,cheese,eggs&course=main&taste=savoury&wild=0&seed=0)) |
| 3 | Kaiserschmarrn is torn, not a stack | Eggs, Milk, Apple | Dessert / Sweet / 0 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=eggs,milk,apple&course=dessert&taste=sweet&wild=0&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=eggs,milk,apple&course=dessert&taste=sweet&wild=0&seed=0)) |
| 4 | Crème brûlée is a ramekin, not ice cream | Milk, Eggs | Dessert / Sweet / 0 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=milk,eggs&course=dessert&taste=sweet&wild=0&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=milk,eggs&course=dessert&taste=sweet&wild=0&seed=0)) |
| 5 | Doogh is a savoury yogurt drink | Milk, Lemon | Drink / Savoury / 0 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=milk,lemon&course=drink&taste=savoury&wild=0&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=milk,lemon&course=drink&taste=savoury&wild=0&seed=0)) |
| 6 | Salmorejo is a thick cold puree | Tomato, Baguette, Eggs | Starter / Savoury / 0 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=tomato,baguette,eggs&course=starter&taste=savoury&wild=0&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=tomato,baguette,eggs&course=starter&taste=savoury&wild=0&seed=0)) |
| 7 | Drink from bread, tomato and broccoli uses only the table | Baguette, Tomato, Broccoli | Drink / Savoury / 60 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=baguette,tomato,broccoli&course=drink&taste=savoury&wild=60&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=baguette,tomato,broccoli&course=drink&taste=savoury&wild=60&seed=0)) |
| 8 | Milk and red onion drink keeps the onion, invents no lemon | Milk, Red onion | Drink / Savoury / 60 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=milk,onion&course=drink&taste=savoury&wild=60&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=milk,onion&course=drink&taste=savoury&wild=60&seed=0)) |
| 9 | Broccoli and tomato lie flat on toast | Baguette, Broccoli, Tomato | Snack / Savoury / 0 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=baguette,broccoli,tomato&course=snack&taste=savoury&wild=0&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=baguette,broccoli,tomato&course=snack&taste=savoury&wild=0&seed=0)) |
| 10 | Salmon on toast is thin ribbons, to scale, droplets touching | Baguette, Salmon, Avocado | Snack / Savoury / 0 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=baguette,salmon,avocado&course=snack&taste=savoury&wild=0&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=baguette,salmon,avocado&course=snack&taste=savoury&wild=0&seed=0)) |
| 11 | Butter is a pale pat, never a cake block | Baguette, Butter, Tomato | Snack / Savoury / 0 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=baguette,butter,tomato&course=snack&taste=savoury&wild=0&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=baguette,butter,tomato&course=snack&taste=savoury&wild=0&seed=0)) |
| 12 | Potato soup toppings are roast dice, sunk in | Potato, Milk, Red onion | Starter / Savoury / 0 | [open](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM?table=potato,milk,onion&course=starter&taste=savoury&wild=0&seed=0) ([#](https://claude.ai/artifact/JLcyCs7ptNQ6jEJGxFtEhM#table=potato,milk,onion&course=starter&taste=savoury&wild=0&seed=0)) |

Query string only, to paste onto any copy of the page:

1. `?table=spinach,cheese&course=main&taste=savoury&wild=0&seed=0`
2. `?table=baguette,cheese,eggs&course=main&taste=savoury&wild=0&seed=0`
3. `?table=eggs,milk,apple&course=dessert&taste=sweet&wild=0&seed=0`
4. `?table=milk,eggs&course=dessert&taste=sweet&wild=0&seed=0`
5. `?table=milk,lemon&course=drink&taste=savoury&wild=0&seed=0`
6. `?table=tomato,baguette,eggs&course=starter&taste=savoury&wild=0&seed=0`
7. `?table=baguette,tomato,broccoli&course=drink&taste=savoury&wild=60&seed=0`
8. `?table=milk,onion&course=drink&taste=savoury&wild=60&seed=0`
9. `?table=baguette,broccoli,tomato&course=snack&taste=savoury&wild=0&seed=0`
10. `?table=baguette,salmon,avocado&course=snack&taste=savoury&wild=0&seed=0`
11. `?table=baguette,butter,tomato&course=snack&taste=savoury&wild=0&seed=0`
12. `?table=potato,milk,onion&course=starter&taste=savoury&wild=0&seed=0`
