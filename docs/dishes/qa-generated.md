# Generated dish QA (the Kitchen's Cook)

Written by `npm run qa:generated`. Each row is a table of ingredients and cooking choices, cooked by `pickDish` and built with physics. The contract (the composable dishes spec): widest gap at most 0.5 cm, nothing floating, overlap at most 1 cm, nothing moving or lost, nothing towering or on its edge, every piece near the hero (off centre 0), at least 70% of the garnish over food or its pool.

20 of 26 pass.

| Table | Layout | Dish | Widest gap | Floating | Overlap | Moving | Off centre | Towering | Garnish on food | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| pepper + avocado + salmon (Snack, Savoury, wild 60) | toast-board | Salmon toast with avocado | 0.10 | 0 | 0.14 | 0 | 0 | 0 | 100% | 3 lost |
| sauce + cheese (Main, Savoury, wild 60) | circular-plate | Cheese with chili oil | 0.15 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| lemon (Starter, Sweet, wild 0) | composed-plate | Lemon carpaccio with citrus oil | 0.15 | 0 | 0.13 | 1 | 0 | 0 | 100% | 1 moving |
| lime + pepper (Dessert, Both, wild 100) | pancake-stack | Pancakes with limes | 0.15 | 0 | 0.34 | 0 | 0 | 0 | 100% | pass |
| chicken + rice (Main, Savoury, wild 0) | rice-bowl | Nigerian Jollof Rice | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| apple (Drink, Sweet, wild 100) | glass-drink | Apple cider cooler | 0.31 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| apple (Starter, Sweet, wild 60) | tartare-crudo | Apple crudo with citrus oil | 0.33 | 0 | 0.91 | 0 | 0 | 0 | 100% | pass |
| apple (Main, Savoury, wild 60) | circular-plate | Apple with herb oil | 0.30 | 0 | 0.22 | 0 | 0 | 0 | 100% | pass |
| apple (Dessert, Sweet, wild 0) | tart | Normandy Apple Tart | 0.30 | 0 | 0.48 | 0 | 0 | 0 | 100% | pass |
| apple (Snack, Sweet, wild 60) | toast-board | Apple toast with cream | 0.04 | 0 | 0.17 | 0 | 0 | 0 | 100% | pass |
| lime + garlic + sauce (Main, Savoury, wild 60) | circular-plate | Lime with crispy garlic | 0.31 | 0 | 0.13 | 8 | 0 | 0 | 100% | 8 moving |
| romaine (Main, Savoury, wild 60) | circular-plate | Romaine with herb oil | 0.28 | 1 | 0.00 | 0 | 0 | 0 | 100% | 1 floating |
| pepper + lime (Main, Savoury, wild 60) | circular-plate | Roast pepper with lime | 0.38 | 0 | 0.23 | 1 | 0 | 0 | 100% | 1 moving |
| steak + potato + garlic (Main, Savoury, wild 0) | mash-plate | Bistro Steak & Mash | 0.00 | 0 | 0.20 | 0 | 0 | 0 | 100% | pass |
| salmon + rice + avocado (Main, Savoury, wild 20) | rice-bowl | Teriyaki Salmon Bowl | 0.00 | 0 | 0.00 | 1 | 0 | 0 | 100% | missing avocado, 1 moving, 1 lost |
| baguette + avocado + tomato (Snack, Savoury, wild 10) | toast-board | Avocado toast with tomato | 0.11 | 0 | 0.72 | 0 | 0 | 0 | 100% | pass |
| steak + romaine + tomato (Starter, Savoury, wild 20) | leaf-salad | Steak salad with tomato | 0.15 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| eggs + tomato + pepper (Main, Savoury, wild 20) | circular-plate | Slata Mechouia | 0.22 | 0 | 0.05 | 0 | 0 | 0 | 100% | pass |
| chicken + grapes + pepper (Main, Savoury, wild 50) | circular-plate | Roast chicken with jus | 0.29 | 0 | 0.69 | 0 | 0 | 0 | 100% | pass |
| potato + salmon + onion (Starter, Savoury, wild 10) | tartare-crudo | Salmon crudo with cream sauce | 0.24 | 0 | 0.62 | 0 | 0 | 0 | 100% | pass |
| peach + milk + strawberry (Dessert, Sweet, wild 20) | dessert-bowl | Peach Melba | 0.43 | 0 | 0.36 | 0 | 0 | 0 | 100% | pass |
| potato + onion + milk (Starter, Savoury, wild 10) | soup-bowl | French Vichyssoise | 0.27 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| strawberry + milk + blueberries (Drink, Sweet, wild 30) | glass-drink | Thick strawberry milkshake | 0.36 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| broccoli + cheese + milk (Main, Savoury, wild 20) | skillet-bake | Broccoli cheese bake | 0.30 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
| chicken + lemon + spinach (Main, Savoury, wild 30) | circular-plate | Pulled chicken with spinach | 0.30 | 0 | 0.40 | 0 | 0 | 0 | 100% | pass |
| steak (Main, Savoury, wild 100) | circular-plate | Seared steak with jus | 0.30 | 0 | 0.00 | 0 | 0 | 0 | 100% | pass |
