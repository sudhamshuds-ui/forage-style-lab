# Generated dish QA (the Kitchen's Cook)

Written by `npm run qa:generated`. Each row is a table of ingredients and cooking choices, cooked by `pickDish` and built with physics. The contract (the composable dishes spec): widest gap at most 0.5 cm, nothing floating, overlap at most 1 cm, nothing moving or lost, nothing towering or on its edge, every piece near the hero (off centre 0), at least 70% of the garnish over food or its pool.

9 of 26 pass.

| Table | Layout | Dish | Widest gap | Floating | Overlap | Moving | Off centre | Towering | Garnish on food | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| pepper + avocado + salmon (Snack, Savoury, wild 60) | toast-board | Salmon on toast | 0.89 | 0 | 0.25 | 0 | 0 | 0 | 100% | gap 0.9 cm |
| sauce + cheese (Main, Savoury, wild 60) | circular-plate | Cheese with chili oil | 3.15 | 0 | 0.00 | 0 | 0 | 0 | 100% | 2 apart, gap 3.1 cm |
| lemon (Starter, Sweet, wild 0) | composed-plate | Lemon carpaccio with citrus oil | 0.90 | 0 | 0.12 | 1 | 0 | 0 | 100% | gap 0.9 cm, 1 moving |
| lime + pepper (Dessert, Both, wild 100) | pancake-stack | Pancakes with limes | 0.09 | 0 | 0.52 | 0 | 0 | 0 | 100% | pass |
| chicken + rice (Main, Savoury, wild 0) | rice-bowl | Chicken rice bowl | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| apple (Drink, Sweet, wild 100) | glass-drink | Apple cider cooler | 1.06 | 0 | 0.00 | 0 | 0 | 0 | 100% | 2 apart, gap 1.1 cm |
| apple (Starter, Sweet, wild 60) | tartare-crudo | Apple crudo with citrus oil | 0.41 | 0 | 0.81 | 0 | 0 | 0 | 100% | pass |
| apple (Main, Savoury, wild 60) | circular-plate | Apple with herb oil | 2.90 | 0 | 0.00 | 2 | 0 | 0 | 100% | 2 apart, gap 2.9 cm, 2 moving, 1 lost |
| apple (Dessert, Sweet, wild 0) | tart | Apple tart with ice cream | 0.75 | 0 | 0.38 | 0 | 0 | 0 | 100% | gap 0.7 cm |
| apple (Snack, Sweet, wild 60) | pancake-stack | Pancakes with apples | 0.03 | 0 | 0.07 | 0 | 0 | 0 | 100% | pass |
| lime + garlic + sauce (Main, Savoury, wild 60) | circular-plate | Lime with crispy garlic | 0.72 | 0 | 0.15 | 8 | 0 | 0 | 100% | gap 0.7 cm, 8 moving, 2 lost |
| romaine (Main, Savoury, wild 60) | leaf-salad | Romaine salad with crispy garlic | 0.85 | 0 | 0.72 | 0 | 2 | 0 | 100% | gap 0.9 cm, 2 off centre |
| pepper + lime (Main, Savoury, wild 60) | circular-plate | Roast pepper with lime | 0.58 | 0 | 0.20 | 2 | 0 | 0 | 100% | gap 0.6 cm, 2 moving, 2 lost |
| steak + potato + garlic (Main, Savoury, wild 0) | circular-plate | Seared steak with fries | 0.23 | 0 | 0.94 | 6 | 0 | 0 | 100% | 6 moving, 1 lost |
| salmon + rice + avocado (Main, Savoury, wild 20) | rice-bowl | Salmon rice bowl with avocado | 0.05 | 0 | 0.08 | 0 | 0 | 0 | 100% | pass |
| baguette + avocado + tomato (Snack, Savoury, wild 10) | toast-board | Avocado on toast | 0.34 | 0 | 0.54 | 0 | 0 | 0 | 100% | pass |
| steak + romaine + tomato (Starter, Savoury, wild 20) | leaf-salad | Steak salad with tomato | 1.78 | 0 | 0.76 | 0 | 2 | 0 | 100% | 3 apart, gap 1.8 cm, 2 off centre |
| eggs + tomato + pepper (Main, Savoury, wild 20) | skillet-bake | Baked eggs with tomato | 1.00 | 0 | 0.20 | 3 | 0 | 0 | 100% | gap 1.0 cm, 3 moving |
| chicken + grapes + pepper (Main, Savoury, wild 50) | circular-plate | Roast chicken with jus | 0.55 | 0 | 0.59 | 10 | 0 | 0 | 100% | gap 0.5 cm, 10 moving, 5 lost |
| potato + salmon + onion (Starter, Savoury, wild 10) | tartare-crudo | Salmon crudo with cream sauce | 0.09 | 0 | 0.54 | 0 | 0 | 0 | 100% | pass |
| peach + milk + strawberry (Dessert, Sweet, wild 20) | tart | Peach tart with ice cream | 0.20 | 0 | 0.56 | 0 | 0 | 0 | 100% | pass |
| potato + onion + milk (Starter, Savoury, wild 10) | soup-bowl | Creamy potato soup | 1.15 | 0 | 0.26 | 1 | 0 | 0 | 100% | 1 apart, gap 1.2 cm, 1 moving |
| strawberry + milk + blueberries (Drink, Sweet, wild 30) | glass-drink | Strawberry milkshake | 0.28 | 0 | 0.42 | 0 | 0 | 0 | 100% | pass |
| broccoli + cheese + milk (Main, Savoury, wild 20) | skillet-bake | Broccoli cheese bake | 0.98 | 0 | 0.31 | 0 | 0 | 0 | 100% | gap 1.0 cm |
| chicken + lemon + spinach (Main, Savoury, wild 30) | circular-plate | Roast chicken with spinach | 0.62 | 0 | 0.07 | 6 | 0 | 0 | 100% | gap 0.6 cm, 6 moving, 1 lost |
| steak (Main, Savoury, wild 100) | circular-plate | Seared steak with crispy garlic | 0.57 | 0 | 0.68 | 9 | 0 | 0 | 100% | gap 0.6 cm, 9 moving, 2 lost |
