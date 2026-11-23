# Dish QA (cohesion and physics)

Written by `npm run qa`. Widest gap: cm from a piece to its nearest neighbour, seen from above. Apart: pieces more than 1 cm from any other. Floating: pieces touching nothing. Overlap: the deepest a piece sits inside another (cm; over 1 cm counts as a problem). Moving: pieces not at rest.

58 of 100 dishes have a problem.

| Dish | Widest gap | Apart | Floating | Overlap | Moving | Result |
|---|---|---|---|---|---|---|
| salmon-citrus-crudo | 0.0 | 0 | 0 | 0.06 | 0 | pass |
| steak-frites-garlic | 0.1 | 0 | 0 | 0.49 | 1 | 1 moving |
| charred-cabbage-lemon | 1.0 | 2 | 0 | 0.00 | 0 | 2 apart |
| rosti-salmon-onion | 0.6 | 0 | 1 | 0.16 | 0 | 1 floating, 1 lost |
| pear-cheese-garlic | 3.4 | 1 | 0 | 0.62 | 0 | 1 apart |
| hot-chicken-lime-avocado | 0.6 | 0 | 0 | 0.00 | 0 | pass |
| baked-eggs-tomato-pepper | 0.3 | 0 | 0 | 0.34 | 1 | 1 moving |
| apple-cheddar-toastie | 0.0 | 0 | 0 | 0.25 | 0 | pass |
| spinach-mushroom-omelette | 1.1 | 1 | 2 | 0.00 | 0 | 1 apart, 2 floating |
| watermelon-lime-chili | 1.9 | 3 | 0 | 1.35 | 0 | 3 apart, overlap 1.4 cm |
| salmon-avocado-rice | 1.4 | 1 | 0 | 0.73 | 0 | 1 apart |
| strawberry-milk-pudding | 0.5 | 0 | 0 | 0.52 | 0 | pass |
| broccoli-lemon-garlic | 0.5 | 0 | 0 | 0.32 | 0 | pass |
| peach-tomato-onion | 1.4 | 1 | 0 | 0.25 | 0 | 1 apart |
| chicken-grape-skewer | 0.5 | 0 | 0 | 0.00 | 0 | pass |
| blueberry-pancakes | 1.7 | 4 | 0 | 0.45 | 0 | 4 apart |
| orange-salmon-cabbage | 0.1 | 0 | 2 | 0.00 | 0 | 2 floating |
| stuffed-peppers | 0.3 | 0 | 1 | 0.27 | 1 | 1 floating, 1 moving |
| potato-onion-soup | 0.0 | 0 | 0 | 0.08 | 0 | pass |
| caesar-romaine-egg | 1.9 | 2 | 0 | 0.75 | 0 | 2 apart |
| pear-grape-cheese-board | 3.3 | 2 | 0 | 0.63 | 2 | 2 apart, 2 moving |
| steak-mushroom-pepper | 2.1 | 1 | 0 | 0.47 | 0 | 1 apart |
| lemon-chicken-spinach | 0.1 | 0 | 0 | 0.00 | 0 | pass |
| apple-tart | 0.0 | 0 | 0 | 0.12 | 0 | pass |
| avocado-toast-tomato | 0.1 | 0 | 0 | 0.33 | 0 | pass |
| egg-fried-rice-broccoli | 1.6 | 1 | 0 | 0.41 | 0 | 1 apart |
| garlic-mushroom-toast | 0.3 | 0 | 0 | 0.61 | 0 | pass |
| citrus-berry-salad | 1.2 | 1 | 0 | 0.48 | 1 | 1 apart, 1 moving |
| salmon-spinach-lemon | 0.1 | 0 | 0 | 0.00 | 0 | pass |
| cabbage-apple-slaw | 0.0 | 0 | 0 | 0.35 | 0 | pass |
| hasselback-cheese-onion | 2.1 | 1 | 0 | 0.00 | 0 | 1 apart |
| peach-melba | 1.1 | 1 | 0 | 0.76 | 0 | 1 apart |
| steak-romaine-tomato | 4.6 | 1 | 0 | 1.39 | 2 | 1 apart, overlap 1.4 cm, 2 moving |
| chicken-rice-chili | 0.8 | 0 | 0 | 0.36 | 0 | pass |
| pepper-peach-cheese | 1.2 | 2 | 0 | 0.41 | 0 | 2 apart |
| mushroom-risotto | 0.5 | 0 | 0 | 0.43 | 0 | pass |
| blueberry-lemon-cheesecake | 4.6 | 2 | 0 | 0.56 | 0 | 2 apart |
| tomato-melon-gazpacho | 2.4 | 1 | 0 | 0.61 | 0 | 1 apart |
| pear-spinach-orange | 0.1 | 0 | 0 | 0.03 | 0 | pass |
| roast-chicken-potato-garlic | 1.2 | 2 | 0 | 0.87 | 0 | 2 apart |
| broccoli-cheese-bake | 1.8 | 3 | 0 | 0.89 | 0 | 3 apart |
| salmon-avocado-crisp-rice | 0.4 | 0 | 0 | 0.60 | 0 | pass |
| steak-apple-onion | 3.4 | 1 | 0 | 0.56 | 0 | 1 apart |
| strawberry-grape-tart | 0.1 | 0 | 0 | 0.61 | 0 | pass |
| shakshuka-spinach | 0.6 | 0 | 0 | 0.09 | 0 | pass |
| lemon-garlic-salmon | 2.7 | 1 | 0 | 0.11 | 0 | 1 apart |
| tomato-cheese-caprese | 0.1 | 0 | 0 | 0.18 | 0 | pass |
| mushroom-steak-garlic | 0.1 | 0 | 0 | 0.78 | 0 | pass |
| avocado-egg-rice | 0.0 | 0 | 0 | 0.28 | 2 | 2 moving |
| pepper-onion-skillet | 0.0 | 0 | 0 | 0.19 | 1 | 1 moving |
| grape-chicken-salad | 3.6 | 2 | 0 | 0.90 | 0 | 2 apart |
| pear-blue-cheese-toast | 0.0 | 0 | 0 | 0.06 | 0 | pass |
| watermelon-feta-mint | 1.7 | 1 | 3 | 1.22 | 0 | 1 apart, 3 floating, overlap 1.2 cm |
| peach-salmon-skewers | 3.1 | 2 | 0 | 0.56 | 0 | 2 apart |
| potato-egg-salad | 0.3 | 0 | 0 | 1.03 | 0 | overlap 1.0 cm |
| cabbage-steak-rolls | 3.2 | 3 | 0 | 0.00 | 0 | 3 apart |
| apple-pear-crumble | 0.6 | 0 | 0 | 0.93 | 0 | pass |
| lime-avocado-mousse | 11.0 | 2 | 0 | 0.00 | 0 | 2 apart |
| strawberry-milkshake | 0.0 | 0 | 0 | 0.00 | 0 | pass |
| orange-lime-cooler | 0.0 | 0 | 0 | 0.00 | 0 | pass |
| blueberry-smoothie | 4.7 | 5 | 0 | 0.00 | 1 | 5 apart, 1 moving, 1 lost |
| watermelon-cooler | 0.0 | 0 | 0 | 0.00 | 1 | 1 moving |
| tomato-juice-pepper | 13.1 | 2 | 0 | 0.00 | 1 | 2 apart, 1 moving, 1 lost |
| spinach-apple-juice | 8.1 | 3 | 0 | 0.00 | 0 | 3 apart |
| grape-pear-spritz | 5.1 | 3 | 0 | 0.00 | 1 | 3 apart, 1 moving, 1 lost |
| peach-chili-salmon | 0.1 | 0 | 0 | 0.78 | 0 | pass |
| butter-garlic-broccoli-rice | 1.0 | 0 | 0 | 0.00 | 0 | pass |
| egg-avocado-toast | 0.2 | 0 | 0 | 0.00 | 0 | pass |
| cheese-onion-tart | 0.6 | 0 | 4 | 0.16 | 5 | 4 floating, 5 moving |
| tomato-rice-soup | 0.1 | 0 | 0 | 0.31 | 0 | pass |
| chicken-pepper-stew | 1.0 | 1 | 0 | 1.73 | 0 | 1 apart, overlap 1.7 cm |
| salmon-cabbage-lime | 0.1 | 0 | 0 | 0.19 | 0 | pass |
| orange-chicken-rice | 0.8 | 0 | 0 | 0.89 | 0 | pass |
| lemon-potato-wedges | 0.4 | 0 | 0 | 0.57 | 0 | pass |
| peach-cheese-board | 3.6 | 2 | 1 | 0.61 | 0 | 2 apart, 1 floating, 2 lost |
| mushroom-egg-rice | 1.3 | 1 | 0 | 0.42 | 0 | 1 apart |
| avocado-tomato-salad | 4.7 | 2 | 0 | 0.40 | 0 | 2 apart |
| strawberry-cheese-toast | 0.1 | 0 | 0 | 0.25 | 0 | pass |
| apple-chicken-salad | 0.0 | 0 | 0 | 1.14 | 0 | overlap 1.1 cm |
| steak-potato-mash | 0.1 | 0 | 0 | 0.61 | 0 | pass |
| grape-cheese-salad | 3.0 | 4 | 0 | 0.58 | 0 | 4 apart |
| pear-butter-cake | 2.7 | 1 | 0 | 0.00 | 0 | 1 apart |
| blueberry-yogurt-bowl | 0.2 | 0 | 0 | 0.39 | 0 | pass |
| salmon-potato-cakes | 1.8 | 3 | 0 | 0.02 | 2 | 3 apart, 2 moving |
| tomato-egg-toast | 0.0 | 0 | 0 | 0.20 | 1 | 1 moving |
| cabbage-potato-colcannon | 0.0 | 0 | 0 | 0.00 | 0 | pass |
| lime-chili-chicken | 1.8 | 1 | 0 | 0.00 | 1 | 1 apart, 1 moving |
| mushroom-spinach-toast | 0.0 | 0 | 1 | 0.24 | 0 | 1 floating |
| orange-pear-salad | 2.2 | 3 | 0 | 0.23 | 0 | 3 apart |
| steak-garlic-rice | 1.2 | 1 | 0 | 1.03 | 0 | 1 apart, overlap 1.0 cm |
| peach-butter-toast | 0.0 | 0 | 0 | 0.38 | 2 | 2 moving |
| roast-tomato-garlic | 0.1 | 0 | 0 | 0.51 | 0 | pass |
| apple-cabbage-steak | 0.1 | 0 | 0 | 0.45 | 0 | pass |
| grape-peach-salad | 1.4 | 2 | 0 | 0.71 | 0 | 2 apart |
| egg-spinach-rice | 0.0 | 0 | 0 | 0.00 | 0 | pass |
| lemon-cheese-dessert | 0.7 | 0 | 1 | 0.91 | 0 | 1 floating |
| onion-potato-gratin | 0.2 | 0 | 0 | 0.21 | 1 | 1 moving |
| watermelon-salmon-poke | 0.5 | 0 | 0 | 0.84 | 0 | pass |
| pepper-egg-toast | 0.2 | 0 | 0 | 0.16 | 0 | pass |
| broccoli-salmon-rice | 0.9 | 0 | 0 | 0.71 | 0 | pass |
