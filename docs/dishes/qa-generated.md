# Generated dish QA (the Kitchen's Cook)

Written by `npm run qa:generated`. Each row is a table of ingredients and cooking choices, cooked by `pickDish` and built with physics. The contract (the composable dishes spec): widest gap at most 0.5 cm, nothing floating, overlap at most 1 cm, nothing moving or lost, every piece near the hero (off centre 0), at least 70% of the garnish over food or its pool.

7 of 20 pass.

| Table | Layout | Dish | Widest gap | Floating | Overlap | Moving | Off centre | Garnish on food | Result |
|---|---|---|---|---|---|---|---|---|---|
| steak + potato + garlic (Main, Savoury, wild 0) | circular-plate | Seared steak with fries and crispy garlic | 0.07 | 0 | 0.82 | 4 | 1 | 100% | 4 moving, 1 lost, 1 off centre |
| salmon + rice + avocado (Main, Savoury, wild 20) | rice-bowl | Salmon rice bowl with avocado | 1.79 | 0 | 0.54 | 0 | 0 | 100% | 2 apart, gap 1.8 cm |
| baguette + avocado + tomato (Snack, Savoury, wild 10) | toast-board | Avocado and tomato toast | 0.02 | 0 | 0.14 | 0 | 0 | 100% | pass |
| steak + romaine + tomato (Starter, Savoury, wild 20) | leaf-salad | Steak salad with tomato | 1.32 | 0 | 0.63 | 0 | 1 | 100% | 1 apart, gap 1.3 cm, 1 off centre |
| eggs + tomato + pepper (Main, Savoury, wild 20) | skillet-bake | Baked eggs with tomato and pepper | 0.33 | 0 | 1.33 | 0 | 0 | 100% | overlap 1.3 cm |
| chicken + grapes + pepper (Main, Savoury, wild 50) | skewer-platter | Chicken skewers with pepper and grape | 0.01 | 0 | 0.13 | 0 | 0 | 100% | pass |
| potato + salmon + onion (Starter, Savoury, wild 10) | mash-plate | Salmon and red onion rings on potato rösti | 0.01 | 0 | 0.15 | 0 | 0 | 100% | pass |
| peach + milk + strawberry (Dessert, Sweet, wild 20) | dessert-bowl | Pancakes with peach and strawberry | 0.02 | 0 | 0.14 | 0 | 0 | 100% | pass |
| potato + onion + milk (Starter, Savoury, wild 10) | soup-bowl | Potato soup with potato and red onion rings | 0.49 | 0 | 0.80 | 0 | 0 | 100% | pass |
| strawberry + milk + blueberries (Drink, Sweet, wild 30) | glass-drink | Strawberry milkshake | 0.00 | 0 | 0.00 | 0 | 0 | 100% | pass |
| lime + garlic + sauce (Main, Savoury, wild 50) | circular-plate | Lime slices with crispy garlic | 0.60 | 0 | 0.96 | 2 | 0 | 100% | gap 0.6 cm, 2 moving |
| romaine (Main, Savoury, wild 0) | leaf-salad | Garlic salad | 0.97 | 0 | 0.00 | 0 | 0 | 100% | gap 1.0 cm |
| steak + blueberries + milk (Dessert, Sweet, wild 80) | dessert-bowl | Milk pudding with steak and blueberries | 0.03 | 0 | 0.48 | 0 | 0 | 100% | pass |
| rice + baguette + potato (Main, Savoury, wild 60) | rice-bowl | Potato rice bowl with croutons | 1.49 | 0 | 0.91 | 0 | 0 | 100% | 3 apart, gap 1.5 cm |
| chicken + lemon + spinach (Main, Savoury, wild 30) | leaf-salad | Chicken salad with lemon slices | 1.63 | 0 | 0.25 | 0 | 0 | 100% | 2 apart, gap 1.6 cm |
| broccoli + cheese + milk (Main, Savoury, wild 20) | skillet-bake | Broccoli cheese bake | 0.72 | 0 | 0.41 | 0 | 0 | 100% | gap 0.7 cm |
| pear + cheese + grapes (Starter, Both, wild 40) | circular-plate | Cheese with pear and grapes | 0.36 | 0 | 0.95 | 3 | 1 | 100% | 3 moving, 1 off centre |
| watermelon + lime + mushroom (Main, Both, wild 100) | circular-plate | Watermelon with mushroom and lime slices | 0.88 | 2 | 1.23 | 5 | 1 | 100% | gap 0.9 cm, 2 floating, overlap 1.2 cm, 5 moving, 1 off centre |
| apple + cabbage + steak (Main, Savoury, wild 60) | leaf-salad | Steak salad with apple | 0.10 | 0 | 1.52 | 0 | 0 | 100% | overlap 1.5 cm |
| steak (Main, Savoury, wild 100) | circular-plate | Seared steak with crispy garlic | 0.01 | 0 | 1.29 | 2 | 0 | 100% | overlap 1.3 cm, 2 moving, 1 lost |
