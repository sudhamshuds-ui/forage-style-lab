# Generated dish QA (the Kitchen's Cook)

Written by `npm run qa:generated`. Each row is a table of ingredients and cooking choices, cooked by `pickDish` and built with physics. The contract (the composable dishes spec): widest gap at most 0.5 cm, nothing floating, overlap at most 1 cm, nothing moving or lost, nothing towering or on its edge, every piece near the hero (off centre 0), at least 70% of the garnish over food or its pool.

11 of 26 pass.

| Table | Layout | Dish | Widest gap | Floating | Overlap | Moving | Off centre | Towering | Garnish on food | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| pepper + avocado + salmon (Snack, Savoury, wild 60) | tartare-crudo | Salmon Tiradito | 0.15 | 0 | 0.27 | 0 | 0 | 0 | 100% | missing avocado, 3 lost |
| sauce + cheese (Main, Savoury, wild 60) | skillet-bake | Swiss Cheese Fondue | 0.24 | 0 | 0.28 | 0 | 0 | 0 | 100% | pass |
| lemon (Starter, Sweet, wild 0) | composed-plate | Lemon carpaccio with citrus oil | 0.15 | 0 | 0.15 | 0 | 0 | 0 | 100% | pass |
| lime + pepper (Dessert, Both, wild 100) | pancake-stack | Pancakes with limes | 0.72 | 0 | 0.34 | 0 | 0 | 0 | 100% | gap 0.7 cm |
| chicken + rice (Main, Savoury, wild 0) | rice-bowl | Chicken Biryani | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| apple (Drink, Sweet, wild 100) | glass-drink | Mulled Spiced Cider | 0.19 | 0 | 0.06 | 4 | 0 | 0 | 100% | 4 moving |
| apple (Starter, Sweet, wild 60) | tartare-crudo | Apple crudo with citrus oil | 0.34 | 0 | 0.88 | 0 | 0 | 0 | 100% | pass |
| apple (Main, Savoury, wild 60) | circular-plate | Apple with herb oil | 0.15 | 0 | 0.18 | 1 | 0 | 0 | 100% | 1 moving |
| apple (Dessert, Sweet, wild 0) | tart | Normandy Apple Tart | 0.28 | 0 | 0.18 | 0 | 0 | 0 | 100% | pass |
| apple (Snack, Sweet, wild 60) | toast-board | Apple toast with cream | 0.04 | 0 | 0.28 | 0 | 0 | 0 | 100% | pass |
| lime + garlic + sauce (Main, Savoury, wild 60) | circular-plate | Lime with crispy garlic | 0.15 | 0 | 0.16 | 2 | 0 | 0 | 100% | 2 moving |
| romaine (Main, Savoury, wild 60) | circular-plate | Romaine with herb oil | 0.38 | 1 | 0.00 | 0 | 0 | 0 | 100% | 1 floating |
| pepper + lime (Main, Savoury, wild 60) | skillet-bake | Rajas con Crema | 0.05 | 0 | 0.17 | 1 | 0 | 0 | 100% | 1 moving, 3 lost |
| steak + potato + garlic (Main, Savoury, wild 0) | circular-plate | French Steak Frites | 0.15 | 0 | 0.31 | 6 | 0 | 0 | 100% | 6 moving |
| salmon + rice + avocado (Main, Savoury, wild 20) | rice-bowl | Hawaiian Salmon Poke | 0.30 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| baguette + avocado + tomato (Snack, Savoury, wild 10) | toast-board | Pan con Tomate | 0.03 | 0 | 0.71 | 0 | 0 | 0 | 100% | 1 lost |
| steak + romaine + tomato (Starter, Savoury, wild 20) | circular-plate | Italian Caprese | 0.61 | 0 | 0.00 | 0 | 0 | 0 | 100% | gap 0.6 cm |
| eggs + tomato + pepper (Main, Savoury, wild 20) | skillet-bake | Shakshouka | 0.33 | 0 | 0.11 | 0 | 0 | 0 | 100% | pass |
| chicken + grapes + pepper (Main, Savoury, wild 50) | skewer-platter | Joojeh Kabab | 0.30 | 0 | 0.00 | 0 | 0 | 0 | 100% | 1 lost |
| potato + salmon + onion (Starter, Savoury, wild 10) | soup-bowl | French Vichyssoise | 0.44 | 0 | 0.96 | 0 | 0 | 0 | 100% | missing onion, 1 lost |
| peach + milk + strawberry (Dessert, Sweet, wild 20) | dessert-bowl | Peach Melba | 0.28 | 0 | 1.01 | 0 | 0 | 0 | 100% | overlap 1.0 cm |
| potato + onion + milk (Starter, Savoury, wild 10) | soup-bowl | French Vichyssoise | 0.19 | 0 | 0.08 | 2 | 0 | 0 | 100% | 2 moving |
| strawberry + milk + blueberries (Drink, Sweet, wild 30) | glass-drink | Strawberry Lassi | 0.39 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| broccoli + cheese + milk (Main, Savoury, wild 20) | skillet-bake | Swiss Cheese Fondue | 0.30 | 0 | 0.60 | 1 | 0 | 0 | 100% | 1 moving |
| chicken + lemon + spinach (Main, Savoury, wild 30) | circular-plate | Moroccan Lemon Chicken | 0.20 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| steak (Main, Savoury, wild 100) | circular-plate | Ethiopian Beef Tibs | 0.17 | 0 | 0.25 | 0 | 0 | 0 | 100% | pass |
