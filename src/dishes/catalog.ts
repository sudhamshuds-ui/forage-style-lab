/**
 * The dish catalogue (batch 2, 2026-11-19: "generate 100 more dishes"): one line per dish, built
 * from the pantry's 31 ingredients, the three chosen ones always the heroes.
 *
 * Each line says what the dish is (title, a sentence for the card and for the reference painting)
 * and how it is plated, in parts the composer (`compose.ts`) knows how to make:
 *   ware     the plate: plate (white porcelain), bowl (wide pasta bowl), deep (the celadon rice
 *            bowl), board (a wooden board), slate (a blue stoneware plate), glass (a tumbler)
 *   base     what lies under everything: a sauce pool, a purée, rice, leaves, or nothing
 *   big      the hero piece (one)
 *   medium   two to four pieces round it
 *   small    clusters of small things, and garnish
 * A part is `ingredient:form` with an optional count, e.g. `lime:wheel*3`. Forms: whole, half,
 * wedge, wheel, slice, cube, fillet, steak, drumstick, egg, berry, leaf, crumble, toast, mash, herb.
 */
export interface DishIdea {
  id: string;
  title: string;
  heroes: [string, string, string];
  course: 'starter' | 'main' | 'dessert' | 'snack' | 'drink';
  description: string;
  ware: 'plate' | 'bowl' | 'deep' | 'board' | 'round' | 'slate' | 'glass';
  base: string;
  big: string;
  medium: string[];
  small: string[];
  /** Generated dishes (the Kitchen's Cook, `pickDish`): the plating layout and the seed it was laid out with. */
  layout?: import('./compose/layouts').LayoutId;
  seed?: number;
  /** Generated dishes: the course's dish archetype (an apple tart, a crudo) and the library
   * components that complete it (src/dishes/compose/components.ts). Never heroes. */
  archetype?: string;
  components?: import('./compose/components').DishComponent[];
  /** Generated dishes: the table's ingredients, and those cooked into the base (rice, soup, sauce, drink). */
  table?: string[];
  blended?: string[];
  /** Generated dishes: the chosen sauce (a pool key), also when it is not a pool (pancake syrup). */
  sauce?: string;
  /** Generated dishes: a sweet dish (no herbs, no savoury garnish layer). */
  sweet?: boolean;
  /** Generated dishes: the real world dish it is cooked as (world-dishes-brief.md), if one matched. */
  world?: { id: string; cuisine: string; region: string };
  /** Generated dishes: the base's colour family from a world dish's looks note (a green gravy, red rice). */
  baseFamily?: import('../ingredients/families').FamilyId;
  /** Generated drinks: the glass a world dish's looks note asks for (else the drink's fruit decides). */
  glass?: import('./kit/glass').GlassKind;
}

const d = (id: string, title: string, heroes: [string, string, string], course: DishIdea['course'], ware: DishIdea['ware'], base: string, big: string, medium: string[], small: string[], description: string): DishIdea => ({ id, title, heroes, course, ware, base, big, medium, small, description });

export const CATALOG: DishIdea[] = [
  d('salmon-citrus-crudo', 'Salmon crudo with orange and lime', ['salmon', 'orange', 'lime'], 'starter', 'plate', 'pool:citrus-oil', 'salmon:slice*5', ['orange:wheel*3'], ['lime:wheel*3', 'herb*10'], 'Thin slices of raw salmon fanned over citrus oil with orange wheels and lime.'),
  d('steak-frites-garlic', 'Steak frites with garlic butter', ['steak', 'potato', 'garlic'], 'main', 'plate', 'pool:brown-butter', 'steak:steak', ['potato:fries*5'], ['garlic:chip*2', 'herb*8'], 'A seared sliced steak with crisp potato wedges and roast garlic in brown butter.'),
  d('charred-cabbage-lemon', 'Charred cabbage, brown butter, lemon', ['cabbage', 'butter', 'lemon'], 'main', 'plate', 'pool:brown-butter', 'cabbage:wedge', ['lemon:wedge*2'], ['butter:cube*3', 'herb*8'], 'A wedge of cabbage seared deep golden, spooned with brown butter and lemon.'),
  d('rosti-salmon-onion', 'Potato rösti with salmon and red onion', ['potato', 'salmon', 'onion'], 'main', 'plate', 'none', 'potato:mash', ['salmon:slice*4'], ['onion:wheel*4', 'herb*10'], 'A golden potato rösti topped with folds of salmon and rings of red onion.'),
  d('pear-cheese-garlic', 'Roast pear with melted cheese and honeyed garlic', ['pear', 'cheese', 'garlic'], 'starter', 'slate', 'pool:honey', 'pear:half*2', ['cheese:crumble*6'], ['garlic:chip*2', 'herb*6'], 'Halved roast pears with soft cheese melting over them and sweet roast garlic.'),
  d('hot-chicken-lime-avocado', 'Hot sauce chicken with lime and avocado', ['chicken', 'sauce', 'lime'], 'main', 'plate', 'pool:chili', 'chicken:drumstick*2', ['avocado:slice*5'], ['lime:wedge*3', 'herb*8'], 'Drumsticks glazed in hot sauce, cooled with avocado and lime.'),
  d('baked-eggs-tomato-pepper', 'Baked eggs in tomato and pepper', ['eggs', 'tomato', 'pepper'], 'main', 'bowl', 'pool:tomato-sauce', 'eggs:egg*3', ['pepper:slice*6'], ['tomato:half*3', 'herb*10'], 'Eggs baked soft in a pan of tomato and sweet pepper.'),
  d('apple-cheddar-toastie', 'Apple, cheddar and onion toastie', ['apple', 'cheese', 'baguette'], 'snack', 'board', 'none', 'baguette:toast*2', ['apple:slice*5'], ['cheese:crumble*5', 'onion:wheel*2'], 'Toasted bread with melted cheddar, crisp apple slices and onion.'),
  d('spinach-mushroom-omelette', 'Spinach and mushroom omelette', ['eggs', 'spinach', 'mushroom'], 'main', 'plate', 'none', 'eggs:egg*2', ['mushroom:slice*5'], ['spinach:leaf*5', 'herb*6'], 'A soft folded omelette with sautéed mushrooms and wilted spinach.'),
  d('watermelon-lime-chili', 'Watermelon, lime and chili salad', ['watermelon', 'lime', 'sauce'], 'starter', 'plate', 'pool:chili', 'watermelon:cube*7', ['lime:wheel*3'], ['herb*10'], 'Cold watermelon cubes with lime and a slick of chili oil.'),
  d('salmon-avocado-rice', 'Salmon rice bowl with avocado and lime', ['salmon', 'rice', 'avocado'], 'main', 'deep', 'rice', 'salmon:cube*7', ['avocado:slice*5'], ['lime:wedge*1', 'herb*6'], 'Rice topped with cubes of salmon, a fan of avocado and lime.'),
  d('strawberry-milk-pudding', 'Strawberry milk pudding', ['milk', 'strawberry', 'butter'], 'dessert', 'bowl', 'pool:cream', 'strawberry:half*5', ['strawberry:slice*4'], ['herb*5'], 'A soft milk pudding with halved and sliced strawberries.'),
  d('broccoli-lemon-garlic', 'Roast broccoli with lemon and garlic', ['broccoli', 'lemon', 'garlic'], 'main', 'plate', 'pool:herb-oil', 'broccoli:whole', ['lemon:wedge*2'], ['garlic:chip*2', 'herb*6'], 'Charred broccoli with roast garlic and lemon to squeeze.'),
  d('peach-tomato-onion', 'Peach and tomato salad with red onion', ['peach', 'tomato', 'onion'], 'starter', 'plate', 'pool:herb-oil', 'tomato:wedge*5', ['peach:wedge*4'], ['onion:wheel*3', 'herb*10'], 'Ripe peach and tomato wedges with thin red onion and herbs.'),
  d('chicken-grape-skewer', 'Chicken and grape skewers', ['chicken', 'grapes', 'pepper'], 'snack', 'board', 'none', 'chicken:cube*6', ['grapes:berry*6'], ['pepper:slice*4', 'herb*6'], 'Grilled chicken pieces with sweet grapes and pepper.'),
  d('blueberry-pancakes', 'Blueberry pancakes with butter', ['milk', 'blueberries', 'butter'], 'dessert', 'plate', 'none', 'milk:mash', ['blueberries:berry*12'], ['butter:cube*1', 'herb*4'], 'A stack of milk pancakes with blueberries and a pat of butter.'),
  d('orange-salmon-cabbage', 'Orange-glazed salmon on cabbage', ['salmon', 'orange', 'cabbage'], 'main', 'plate', 'leaves:cabbage', 'salmon:fillet', ['orange:wheel*3'], ['herb*8'], 'Salmon glazed with orange on a bed of soft cabbage leaves.'),
  d('stuffed-peppers', 'Stuffed peppers with rice and cheese', ['pepper', 'rice', 'cheese'], 'main', 'plate', 'pool:tomato-sauce', 'pepper:half*2', ['cheese:crumble*6'], ['herb*8'], 'Pepper halves filled with rice and baked under melted cheese.'),
  d('potato-onion-soup', 'Creamy potato and onion soup', ['potato', 'onion', 'milk'], 'starter', 'bowl', 'soup:potato', 'potato:cube*5', ['onion:wheel*3'], ['herb*8'], 'A velvety potato soup with milk, sweet onion and herbs.'),
  d('caesar-romaine-egg', 'Romaine with egg and crisp croutons', ['romaine', 'eggs', 'baguette'], 'starter', 'plate', 'leaves:romaine', 'eggs:half*2', ['baguette:cube*6'], ['cheese:crumble*5', 'herb*4'], 'Crisp romaine with soft eggs, toasted croutons and shaved cheese.'),
  d('pear-grape-cheese-board', 'Pear, grapes and cheese board', ['pear', 'grapes', 'cheese'], 'snack', 'board', 'none', 'cheese:wedge', ['pear:slice*4'], ['grapes:berry*8'], 'A wedge of cheese with sliced pear and a handful of grapes.'),
  d('steak-mushroom-pepper', 'Steak, mushroom and pepper skewers', ['steak', 'mushroom', 'pepper'], 'main', 'board', 'none', 'steak:cube*6', ['mushroom:half*4'], ['pepper:slice*4', 'herb*6'], 'Charred steak cubes with mushrooms and sweet pepper.'),
  d('lemon-chicken-spinach', 'Lemon butter chicken with spinach', ['chicken', 'lemon', 'spinach'], 'main', 'plate', 'pool:brown-butter', 'chicken:drumstick*2', ['spinach:leaf*6'], ['lemon:wheel*3'], 'Roast drumsticks in lemon butter over wilted spinach.'),
  d('apple-tart', 'Apple tart on butter pastry', ['apple', 'butter', 'milk'], 'dessert', 'plate', 'pool:cream', 'apple:slice*9', ['butter:cube*1'], ['herb*4'], 'Thin apple slices fanned in a circle on buttery pastry, with cream.'),
  d('avocado-toast-tomato', 'Avocado toast with tomato and lime', ['baguette', 'avocado', 'tomato'], 'snack', 'board', 'none', 'baguette:toast*2', ['avocado:slice*6'], ['tomato:wheel*3', 'lime:wedge*1'], 'Toast piled with avocado slices, tomato and a squeeze of lime.'),
  d('egg-fried-rice-broccoli', 'Fried rice with egg and broccoli', ['rice', 'eggs', 'broccoli'], 'main', 'deep', 'rice', 'eggs:egg*1', ['broccoli:whole*2'], ['herb*8'], 'Fried rice with a crisp-edged egg and charred broccoli.'),
  d('garlic-mushroom-toast', 'Garlic mushrooms on toast', ['mushroom', 'garlic', 'baguette'], 'snack', 'board', 'none', 'baguette:toast*2', ['mushroom:half*6'], ['garlic:chip*1', 'herb*8'], 'Buttery garlic mushrooms heaped on toasted bread.'),
  d('citrus-berry-salad', 'Orange, strawberry and blueberry salad', ['orange', 'strawberry', 'blueberries'], 'dessert', 'bowl', 'pool:honey', 'orange:wheel*4', ['strawberry:half*5'], ['blueberries:berry*9', 'herb*4'], 'Orange wheels, halved strawberries and blueberries in honey.'),
  d('salmon-spinach-lemon', 'Salmon with spinach and lemon cream', ['salmon', 'spinach', 'lemon'], 'main', 'plate', 'pool:cream', 'salmon:fillet', ['spinach:leaf*5'], ['lemon:wheel*3'], 'Seared salmon on wilted spinach with a lemon cream sauce.'),
  d('cabbage-apple-slaw', 'Cabbage slaw with apple and lime', ['cabbage', 'apple', 'lime'], 'starter', 'bowl', 'leaves:cabbage', 'apple:slice*6', ['lime:wedge*2'], ['herb*8'], 'Crunchy cabbage with crisp apple and lime.'),
  d('hasselback-cheese-onion', 'Hasselback potato with cheese and onion', ['potato', 'cheese', 'onion'], 'main', 'plate', 'pool:brown-butter', 'potato:whole', ['cheese:crumble*5'], ['onion:wheel*3', 'herb*6'], 'A roast potato fanned open, melted cheese and sweet onion.'),
  d('peach-melba', 'Peach melba with milk ice and berries', ['peach', 'milk', 'strawberry'], 'dessert', 'bowl', 'pool:berry-sauce', 'peach:half*2', ['milk:mash'], ['strawberry:half*4'], 'Poached peach halves with milk ice and a berry sauce.'),
  d('steak-romaine-tomato', 'Steak salad with romaine and tomato', ['steak', 'romaine', 'tomato'], 'main', 'plate', 'leaves:romaine', 'steak:steak', ['tomato:wedge*4'], ['herb*6'], 'Sliced rare steak over crisp romaine and tomatoes.'),
  d('chicken-rice-chili', 'Chicken rice with cabbage and chili', ['chicken', 'rice', 'sauce'], 'main', 'deep', 'rice', 'chicken:cube*6', ['cabbage:leaf*3'], ['herb*6'], 'Rice with tender chicken, soft cabbage and chili sauce.'),
  d('pepper-peach-cheese', 'Grilled pepper and peach with cheese', ['pepper', 'peach', 'cheese'], 'starter', 'slate', 'pool:herb-oil', 'pepper:half*2', ['peach:wedge*4'], ['cheese:crumble*5', 'herb*6'], 'Charred pepper and peach with crumbled cheese.'),
  d('mushroom-risotto', 'Mushroom risotto with butter', ['rice', 'mushroom', 'butter'], 'main', 'bowl', 'mash:risotto', 'mushroom:half*5', ['butter:cube*1'], ['herb*8'], 'Creamy risotto finished with butter and seared mushrooms.'),
  d('blueberry-lemon-cheesecake', 'Blueberry and lemon cheesecake', ['blueberries', 'lemon', 'cheese'], 'dessert', 'plate', 'pool:berry-sauce', 'cheese:wedge', ['blueberries:berry*9'], ['lemon:wheel*2'], 'A slice of cheesecake with blueberries and lemon.'),
  d('tomato-melon-gazpacho', 'Tomato and watermelon gazpacho', ['tomato', 'watermelon', 'pepper'], 'starter', 'bowl', 'soup:tomato', 'watermelon:cube*5', ['tomato:half*2'], ['pepper:slice*3', 'herb*6'], 'Chilled tomato and melon soup with diced melon and pepper.'),
  d('pear-spinach-orange', 'Pear and spinach salad with orange', ['pear', 'spinach', 'orange'], 'starter', 'plate', 'leaves:spinach', 'pear:slice*5', ['orange:wheel*3'], ['herb*6'], 'Sliced pear with spinach leaves and orange wheels.'),
  d('roast-chicken-potato-garlic', 'Roast drumsticks with potato and garlic', ['chicken', 'potato', 'garlic'], 'main', 'plate', 'pool:brown-butter', 'chicken:drumstick*2', ['potato:wedge*5'], ['garlic:chip*2', 'herb*6'], 'Golden drumsticks with roast potatoes and garlic.'),
  d('broccoli-cheese-bake', 'Broccoli cheese bake', ['broccoli', 'cheese', 'milk'], 'main', 'bowl', 'pool:cheese-sauce', 'broccoli:whole*2', ['cheese:crumble*6'], ['herb*4'], 'Broccoli baked in a bubbling cheese sauce.'),
  d('salmon-avocado-crisp-rice', 'Salmon and avocado on crisp rice', ['salmon', 'avocado', 'rice'], 'snack', 'slate', 'none', 'rice:cube*4', ['salmon:slice*4'], ['avocado:slice*4', 'herb*4'], 'Crisp rice cakes topped with salmon and avocado.'),
  d('steak-apple-onion', 'Steak with apple and onion', ['steak', 'apple', 'onion'], 'main', 'plate', 'pool:jus', 'steak:steak', ['apple:wedge*4'], ['onion:wheel*3', 'herb*4'], 'Seared steak with caramelised apple and onion.'),
  d('strawberry-grape-tart', 'Strawberry and grape tart', ['strawberry', 'grapes', 'butter'], 'dessert', 'plate', 'pool:cream', 'strawberry:half*6', ['grapes:berry*6'], ['herb*4'], 'A buttery tart crowded with strawberries and grapes.'),
  d('shakshuka-spinach', 'Shakshuka with spinach and bread', ['eggs', 'tomato', 'baguette'], 'main', 'bowl', 'pool:tomato-sauce', 'eggs:egg*2', ['baguette:toast*2'], ['spinach:leaf*4', 'herb*6'], 'Eggs in spiced tomato with spinach and toasted bread.'),
  d('lemon-garlic-salmon', 'Lemon garlic salmon', ['salmon', 'lemon', 'garlic'], 'main', 'plate', 'pool:brown-butter', 'salmon:fillet', ['lemon:wheel*3'], ['garlic:chip*2', 'herb*6'], 'Pan-seared salmon with lemon and roast garlic.'),
  d('tomato-cheese-caprese', 'Tomato and cheese with basil', ['tomato', 'cheese', 'spinach'], 'starter', 'plate', 'pool:herb-oil', 'tomato:wheel*5', ['cheese:slice*4'], ['spinach:leaf*4', 'herb*6'], 'Overlapping tomato and soft cheese slices with green leaves.'),
  d('mushroom-steak-garlic', 'Steak with mushrooms and garlic', ['steak', 'mushroom', 'garlic'], 'main', 'slate', 'pool:jus', 'steak:steak', ['mushroom:half*4'], ['garlic:chip*2', 'herb*6'], 'Sliced steak with seared mushrooms and roast garlic.'),
  d('avocado-egg-rice', 'Avocado and egg rice bowl', ['avocado', 'eggs', 'rice'], 'main', 'deep', 'rice', 'eggs:egg*1', ['avocado:slice*5'], ['herb*6'], 'Warm rice with a soft egg and a fan of avocado.'),
  d('pepper-onion-skillet', 'Pepper and onion skillet', ['pepper', 'onion', 'garlic'], 'main', 'bowl', 'pool:tomato-sauce', 'pepper:slice*7', ['onion:wheel*4'], ['garlic:chip*2', 'herb*6'], 'Sweet peppers and onions softened with garlic.'),
  d('grape-chicken-salad', 'Chicken salad with grapes and romaine', ['chicken', 'grapes', 'romaine'], 'starter', 'plate', 'leaves:romaine', 'chicken:cube*6', ['grapes:berry*7'], ['herb*6'], 'Tender chicken with sweet grapes on crisp romaine.'),
  d('pear-blue-cheese-toast', 'Pear and cheese toasts', ['pear', 'cheese', 'baguette'], 'snack', 'board', 'none', 'baguette:toast*3', ['pear:slice*4'], ['cheese:crumble*5', 'herb*4'], 'Toasts with melted cheese and thin pear slices.'),
  d('watermelon-feta-mint', 'Watermelon with cheese and mint', ['watermelon', 'cheese', 'lime'], 'starter', 'plate', 'none', 'watermelon:cube*7', ['cheese:crumble*6'], ['lime:wedge*1', 'herb*10'], 'Watermelon cubes with salty crumbled cheese and mint.'),
  d('peach-salmon-skewers', 'Salmon and peach skewers', ['salmon', 'peach', 'lime'], 'main', 'board', 'none', 'salmon:cube*6', ['peach:wedge*4'], ['lime:wedge*2', 'herb*6'], 'Grilled salmon and peach with lime.'),
  d('potato-egg-salad', 'Potato and egg salad', ['potato', 'eggs', 'onion'], 'starter', 'bowl', 'none', 'potato:cube*6', ['eggs:half*3'], ['onion:wheel*3', 'herb*8'], 'Warm potatoes with soft eggs and red onion.'),
  d('cabbage-steak-rolls', 'Cabbage rolls with steak and tomato', ['cabbage', 'steak', 'tomato'], 'main', 'plate', 'pool:tomato-sauce', 'cabbage:leaf*3', ['steak:cube*4'], ['tomato:half*2', 'herb*6'], 'Soft cabbage leaves with steak in a tomato sauce.'),
  d('apple-pear-crumble', 'Apple and pear crumble', ['apple', 'pear', 'butter'], 'dessert', 'bowl', 'pool:cream', 'apple:cube*6', ['pear:cube*5'], ['butter:crumble*6'], 'Baked apple and pear under a buttery crumble.'),
  d('lime-avocado-mousse', 'Lime and avocado mousse', ['lime', 'avocado', 'milk'], 'dessert', 'glass', 'drink:avocado', 'lime:wheel*1', [], ['herb*2'], 'A silky green avocado and lime mousse with a lime wheel.'),
  d('strawberry-milkshake', 'Strawberry milkshake', ['strawberry', 'milk', 'blueberries'], 'drink', 'glass', 'drink:strawberry', 'strawberry:half*1', [], ['blueberries:berry*2'], 'A thick strawberry milkshake topped with a berry.'),
  d('orange-lime-cooler', 'Orange and lime cooler', ['orange', 'lime', 'grapes'], 'drink', 'glass', 'drink:orange', 'orange:wheel*1', [], ['lime:wheel*1'], 'A cold orange and lime drink with a grape garnish.'),
  d('blueberry-smoothie', 'Blueberry and peach smoothie', ['blueberries', 'peach', 'milk'], 'drink', 'glass', 'drink:blueberry', 'peach:wedge*1', [], ['blueberries:berry*3'], 'A purple blueberry and peach smoothie.'),
  d('watermelon-cooler', 'Watermelon and lime cooler', ['watermelon', 'lime', 'strawberry'], 'drink', 'glass', 'drink:watermelon', 'watermelon:cube*1', [], ['lime:wheel*1'], 'A pink watermelon drink with lime.'),
  d('tomato-juice-pepper', 'Tomato, pepper and lemon juice', ['tomato', 'pepper', 'lemon'], 'drink', 'glass', 'drink:tomato', 'lemon:wheel*1', [], ['herb*2'], 'A savoury tomato and pepper juice with lemon.'),
  d('spinach-apple-juice', 'Spinach and apple green juice', ['spinach', 'apple', 'lime'], 'drink', 'glass', 'drink:green', 'apple:slice*1', [], ['lime:wheel*1'], 'A bright green juice of spinach, apple and lime.'),
  d('grape-pear-spritz', 'Grape and pear spritz', ['grapes', 'pear', 'lemon'], 'drink', 'glass', 'drink:grape', 'pear:slice*1', [], ['grapes:berry*2'], 'A sparkling grape and pear drink with lemon.'),
  d('peach-chili-salmon', 'Peach and chili salsa with salmon', ['peach', 'sauce', 'salmon'], 'starter', 'plate', 'none', 'salmon:slice*5', ['peach:cube*6'], ['herb*8'], 'Raw salmon with a chunky peach and chili salsa.'),
  d('butter-garlic-broccoli-rice', 'Garlic butter broccoli rice', ['broccoli', 'butter', 'rice'], 'main', 'deep', 'rice', 'broccoli:whole*2', ['butter:cube*1'], ['garlic:chip*1', 'herb*6'], 'Rice with charred broccoli in garlic butter.'),
  d('egg-avocado-toast', 'Egg and avocado toast', ['eggs', 'avocado', 'baguette'], 'snack', 'board', 'none', 'baguette:toast*2', ['eggs:egg*1'], ['avocado:slice*4', 'herb*4'], 'Toast with a soft egg and avocado.'),
  d('cheese-onion-tart', 'Cheese and onion tart', ['cheese', 'onion', 'butter'], 'main', 'plate', 'pool:cream', 'cheese:wedge', ['onion:wheel*5'], ['herb*6'], 'A buttery tart with melting cheese and sweet onion rings.'),
  d('tomato-rice-soup', 'Tomato and rice soup', ['tomato', 'rice', 'garlic'], 'starter', 'bowl', 'soup:tomato', 'rice:mash', ['tomato:half*3'], ['garlic:chip*1', 'herb*6'], 'A warm tomato soup with soft rice and garlic.'),
  d('chicken-pepper-stew', 'Chicken and pepper stew', ['chicken', 'pepper', 'potato'], 'main', 'bowl', 'soup:pepper', 'chicken:cube*6', ['pepper:slice*4'], ['potato:cube*4', 'herb*6'], 'A hearty stew of chicken, pepper and potato.'),
  d('salmon-cabbage-lime', 'Salmon on cabbage with lime', ['salmon', 'cabbage', 'lime'], 'main', 'plate', 'leaves:cabbage', 'salmon:fillet', ['lime:wheel*3'], ['herb*6'], 'Seared salmon on soft cabbage with lime.'),
  d('orange-chicken-rice', 'Orange chicken with rice', ['chicken', 'orange', 'rice'], 'main', 'deep', 'rice', 'chicken:cube*6', ['orange:wheel*2'], ['herb*6'], 'Sticky orange chicken over rice.'),
  d('lemon-potato-wedges', 'Lemon roast potatoes with garlic', ['potato', 'lemon', 'garlic'], 'snack', 'board', 'none', 'potato:wedge*7', ['lemon:wedge*2'], ['garlic:chip*2', 'herb*6'], 'Crisp potato wedges roasted with lemon and garlic.'),
  d('peach-cheese-board', 'Peach and cheese board', ['peach', 'cheese', 'grapes'], 'snack', 'board', 'none', 'cheese:wedge', ['peach:wedge*4'], ['grapes:berry*6'], 'Cheese with ripe peach wedges and grapes.'),
  d('mushroom-egg-rice', 'Mushroom and egg rice', ['mushroom', 'eggs', 'rice'], 'main', 'deep', 'rice', 'eggs:egg*1', ['mushroom:half*4'], ['herb*6'], 'Rice with seared mushrooms and a fried egg.'),
  d('avocado-tomato-salad', 'Avocado and tomato salad', ['avocado', 'tomato', 'onion'], 'starter', 'plate', 'pool:herb-oil', 'avocado:half*2', ['tomato:wedge*4'], ['onion:wheel*3', 'herb*6'], 'Halved avocados with tomato wedges and red onion.'),
  d('strawberry-cheese-toast', 'Strawberry and cheese toast', ['strawberry', 'cheese', 'baguette'], 'snack', 'board', 'none', 'baguette:toast*2', ['strawberry:slice*6'], ['cheese:crumble*4', 'herb*3'], 'Toast with soft cheese and sliced strawberries.'),
  d('apple-chicken-salad', 'Chicken and apple salad', ['chicken', 'apple', 'spinach'], 'starter', 'plate', 'leaves:spinach', 'chicken:cube*5', ['apple:slice*5'], ['herb*6'], 'Chicken with crisp apple on spinach leaves.'),
  d('steak-potato-mash', 'Steak with mash and peppers', ['steak', 'potato', 'pepper'], 'main', 'plate', 'pool:jus', 'steak:steak', ['potato:mash'], ['pepper:slice*4', 'herb*4'], 'Seared steak on creamy mash with sweet peppers.'),
  d('grape-cheese-salad', 'Grape and cheese salad', ['grapes', 'cheese', 'romaine'], 'starter', 'plate', 'leaves:romaine', 'cheese:crumble*7', ['grapes:berry*8'], ['herb*4'], 'Romaine with sweet grapes and crumbled cheese.'),
  d('pear-butter-cake', 'Pear and butter cake', ['pear', 'butter', 'milk'], 'dessert', 'plate', 'pool:cream', 'pear:half*2', ['butter:cube*1'], ['herb*3'], 'Soft butter cake with baked pear halves and cream.'),
  d('blueberry-yogurt-bowl', 'Blueberry and peach milk bowl', ['blueberries', 'peach', 'milk'], 'dessert', 'bowl', 'pool:cream', 'peach:slice*5', ['blueberries:berry*12'], ['herb*3'], 'Creamy milk with peach slices and blueberries.'),
  d('salmon-potato-cakes', 'Salmon and potato cakes', ['salmon', 'potato', 'lemon'], 'main', 'plate', 'pool:cream', 'potato:mash', ['salmon:cube*4'], ['lemon:wedge*2', 'herb*6'], 'Golden salmon and potato cakes with lemon.'),
  d('tomato-egg-toast', 'Tomato and egg toast', ['tomato', 'eggs', 'baguette'], 'snack', 'board', 'none', 'baguette:toast*2', ['eggs:half*2'], ['tomato:wheel*3', 'herb*4'], 'Toast with tomato slices and soft eggs.'),
  d('cabbage-potato-colcannon', 'Cabbage and potato mash', ['cabbage', 'potato', 'butter'], 'main', 'bowl', 'mash:potato', 'cabbage:leaf*3', ['butter:cube*1'], ['herb*6'], 'Buttery potato mash folded with soft cabbage.'),
  d('lime-chili-chicken', 'Lime chili chicken', ['chicken', 'lime', 'sauce'], 'main', 'slate', 'pool:chili', 'chicken:drumstick*3', ['lime:wedge*3'], ['herb*8'], 'Drumsticks in chili sauce with lime.'),
  d('mushroom-spinach-toast', 'Mushroom and spinach toast', ['mushroom', 'spinach', 'baguette'], 'snack', 'board', 'none', 'baguette:toast*2', ['mushroom:slice*5'], ['spinach:leaf*3', 'herb*4'], 'Toast with mushrooms and wilted spinach.'),
  d('orange-pear-salad', 'Orange and pear salad', ['orange', 'pear', 'spinach'], 'starter', 'plate', 'leaves:spinach', 'orange:wheel*4', ['pear:slice*4'], ['herb*6'], 'Orange wheels and pear on spinach.'),
  d('steak-garlic-rice', 'Garlic steak rice bowl', ['steak', 'garlic', 'rice'], 'main', 'deep', 'rice', 'steak:cube*6', ['garlic:chip*1'], ['herb*8'], 'Rice topped with seared steak and garlic.'),
  d('peach-butter-toast', 'Peach and butter toast', ['peach', 'butter', 'baguette'], 'snack', 'board', 'none', 'baguette:toast*2', ['peach:slice*6'], ['butter:cube*2'], 'Toast with butter and soft peach slices.'),
  d('roast-tomato-garlic', 'Roast tomatoes with garlic and cheese', ['tomato', 'garlic', 'cheese'], 'starter', 'slate', 'pool:herb-oil', 'tomato:half*4', ['garlic:chip*2'], ['cheese:crumble*5', 'herb*6'], 'Roast tomato halves with garlic and cheese.'),
  d('apple-cabbage-steak', 'Steak with apple slaw', ['steak', 'apple', 'cabbage'], 'main', 'plate', 'leaves:cabbage', 'steak:steak', ['apple:slice*4'], ['herb*6'], 'Sliced steak with a fresh apple and cabbage slaw.'),
  d('grape-peach-salad', 'Grape and peach fruit salad', ['grapes', 'peach', 'lime'], 'dessert', 'bowl', 'pool:honey', 'peach:wedge*5', ['grapes:berry*8'], ['lime:wheel*2'], 'Peach wedges and grapes with honey and lime.'),
  d('egg-spinach-rice', 'Egg and spinach rice', ['eggs', 'spinach', 'rice'], 'main', 'deep', 'rice', 'eggs:egg*1', ['spinach:leaf*4'], ['herb*4'], 'Rice with a fried egg and spinach.'),
  d('lemon-cheese-dessert', 'Lemon cheese pots with berries', ['lemon', 'cheese', 'strawberry'], 'dessert', 'bowl', 'pool:cream', 'strawberry:half*4', ['lemon:wheel*2'], ['herb*3'], 'Lemon cream cheese with strawberries.'),
  d('onion-potato-gratin', 'Potato and onion gratin', ['potato', 'onion', 'cheese'], 'main', 'bowl', 'pool:cheese-sauce', 'potato:wheel*8', ['onion:wheel*3'], ['herb*4'], 'Thin potato slices baked with onion and cheese.'),
  d('watermelon-salmon-poke', 'Watermelon and salmon poke', ['watermelon', 'salmon', 'rice'], 'main', 'deep', 'rice', 'salmon:cube*5', ['watermelon:cube*5'], ['herb*6'], 'Rice with salmon and watermelon cubes.'),
  d('pepper-egg-toast', 'Pepper and egg toast', ['pepper', 'eggs', 'baguette'], 'snack', 'board', 'none', 'baguette:toast*2', ['eggs:egg*1'], ['pepper:slice*4', 'herb*4'], 'Toast with a fried egg and sweet peppers.'),
  d('broccoli-salmon-rice', 'Salmon and broccoli rice', ['broccoli', 'salmon', 'rice'], 'main', 'deep', 'rice', 'salmon:cube*5', ['broccoli:whole*2'], ['herb*4'], 'Rice bowl with salmon and broccoli.'),
];
