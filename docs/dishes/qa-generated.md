# Generated dish QA (the Kitchen's Cook)

Written by `npm run qa:generated`. Each row is a table of ingredients and cooking choices, cooked by `pickDish` and built with physics. The contract (the composable dishes spec): widest gap at most 0.5 cm, nothing floating, overlap at most 1 cm, nothing moving or lost, nothing towering or on its edge, every piece near the hero (off centre 0), at least 70% of the garnish over food or its pool.

8 of 26 pass.

| Table | Layout | Dish | Widest gap | Floating | Overlap | Moving | Off centre | Towering | Garnish on food | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| pepper + avocado + salmon (Snack, Savoury, wild 60) | toast-board | Salmon toast with avocado | 0.15 | 0 | 0.32 | 0 | 0 | 0 | 100% | pass |
| sauce + cheese (Main, Savoury, wild 60) | circular-plate | Cheese with chili oil | 3.13 | 0 | 0.00 | 0 | 0 | 0 | 100% | 2 apart, gap 3.1 cm |
| lemon (Starter, Sweet, wild 0) | composed-plate | Lemon carpaccio with citrus oil | 0.90 | 0 | 0.12 | 1 | 0 | 0 | 100% | gap 0.9 cm, 1 moving, 1 lost |
| lime + pepper (Dessert, Both, wild 100) | pancake-stack | Pancakes with limes | 0.32 | 0 | 0.22 | 0 | 0 | 0 | 100% | 1 lost |
| chicken + rice (Main, Savoury, wild 0) | rice-bowl | Chicken rice bowl | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| apple (Drink, Sweet, wild 100) | glass-drink | Apple cider cooler | 1.27 | 0 | 0.00 | 0 | 0 | 0 | 100% | 2 apart, gap 1.3 cm |
| apple (Starter, Sweet, wild 60) | tartare-crudo | Apple crudo with citrus oil | 0.40 | 0 | 0.81 | 0 | 0 | 0 | 100% | pass |
| apple (Main, Savoury, wild 60) | circular-plate | Apple with herb oil | 2.93 | 0 | 0.00 | 2 | 0 | 0 | 100% | 2 apart, gap 2.9 cm, 2 moving, 1 lost |
| apple (Dessert, Sweet, wild 0) | tart | Apple tart with ice cream | 0.32 | 0 | 0.34 | 0 | 0 | 0 | 100% | pass |
| apple (Snack, Sweet, wild 60) | toast-board | Apple toast with cream | 0.05 | 0 | 0.50 | 0 | 0 | 0 | 100% | pass |
| lime + garlic + sauce (Main, Savoury, wild 60) | circular-plate | Lime with crispy garlic | 0.74 | 0 | 0.16 | 15 | 0 | 0 | 100% | gap 0.7 cm, 15 moving, 6 lost |
| romaine (Main, Savoury, wild 60) | circular-plate | Romaine with crispy garlic | 0.39 | 0 | 0.09 | 13 | 0 | 0 | 100% | 13 moving, 5 lost |
| pepper + lime (Main, Savoury, wild 60) | circular-plate | Roast pepper with lime | 0.79 | 0 | 0.20 | 5 | 0 | 0 | 100% | gap 0.8 cm, 5 moving, 4 lost |
| steak + potato + garlic (Main, Savoury, wild 0) | circular-plate | Seared steak with fries | 0.58 | 0 | 0.50 | 2 | 0 | 0 | 100% | gap 0.6 cm, 2 moving |
| salmon + rice + avocado (Main, Savoury, wild 20) | rice-bowl | Salmon rice bowl with avocado | 0.05 | 0 | 0.08 | 0 | 0 | 0 | 100% | pass |
| baguette + avocado + tomato (Snack, Savoury, wild 10) | toast-board | Avocado toast with tomato | 0.65 | 0 | 0.12 | 0 | 0 | 0 | 100% | gap 0.7 cm |
| steak + romaine + tomato (Starter, Savoury, wild 20) | leaf-salad | Steak salad with tomato | 1.07 | 0 | 0.00 | 0 | 1 | 0 | 100% | 1 apart, gap 1.1 cm, 1 off centre |
| eggs + tomato + pepper (Main, Savoury, wild 20) | skillet-bake | Baked eggs with tomato | 1.00 | 0 | 0.20 | 3 | 0 | 0 | 100% | gap 1.0 cm, 3 moving |
| chicken + grapes + pepper (Main, Savoury, wild 50) | circular-plate | Roast chicken with jus | 1.45 | 0 | 0.62 | 9 | 0 | 0 | 100% | 1 apart, gap 1.5 cm, 9 moving, 5 lost |
| potato + salmon + onion (Starter, Savoury, wild 10) | tartare-crudo | Salmon crudo with cream sauce | 1.79 | 0 | 0.58 | 0 | 0 | 0 | 100% | 1 apart, gap 1.8 cm |
| peach + milk + strawberry (Dessert, Sweet, wild 20) | tart | Peach tart with ice cream | 0.31 | 0 | 0.58 | 0 | 0 | 0 | 100% | pass |
| potato + onion + milk (Starter, Savoury, wild 10) | soup-bowl | Creamy potato soup | 1.15 | 0 | 0.26 | 1 | 0 | 0 | 100% | 1 apart, gap 1.2 cm, 1 moving |
| strawberry + milk + blueberries (Drink, Sweet, wild 30) | glass-drink | Thick strawberry milkshake | 0.48 | 0 | 0.37 | 0 | 0 | 0 | 100% | pass |
| broccoli + cheese + milk (Main, Savoury, wild 20) | skillet-bake | Broccoli cheese bake | 0.98 | 0 | 0.31 | 0 | 0 | 0 | 100% | gap 1.0 cm |
| chicken + lemon + spinach (Main, Savoury, wild 30) | circular-plate | Pulled chicken with spinach | 0.69 | 0 | 0.36 | 7 | 0 | 0 | 100% | gap 0.7 cm, 7 moving, 2 lost |
| steak (Main, Savoury, wild 100) | circular-plate | Seared steak with crispy garlic | 0.49 | 0 | 0.67 | 11 | 0 | 0 | 100% | 11 moving, 3 lost |
