/**
 * The hand checks of docs/forage-specs/test-sheet.json (generated from it): each check's table and
 * controls, so the preview can set one up in a click (R7). Course, taste and wild as on the panel.
 */
export interface TestCheck {
  n: number;
  name: string;
  table: string[];
  course: string;
  taste: string;
  /** -1 (and empty course and taste): leave the controls as they are. */
  wild: number;
}

export const TEST_CHECKS: TestCheck[] = [
  {"n": 1, "name": "Palak Paneer looks honest", "table": ["spinach", "cheese"], "course": "Main", "taste": "Savoury", "wild": 0},
  {"n": 2, "name": "Khachapuri refused unless it is a bread boat", "table": ["baguette", "cheese", "eggs"], "course": "Main", "taste": "Savoury", "wild": 0},
  {"n": 3, "name": "Kaiserschmarrn is torn, not a stack", "table": ["eggs", "milk", "apple"], "course": "Dessert", "taste": "Sweet", "wild": 0},
  {"n": 4, "name": "Crème brûlée is a ramekin, not ice cream", "table": ["milk", "eggs"], "course": "Dessert", "taste": "Sweet", "wild": 0},
  {"n": 5, "name": "Doogh is a savoury yogurt drink", "table": ["milk", "lemon"], "course": "Drink", "taste": "Savoury", "wild": 0},
  {"n": 6, "name": "Salmorejo is a thick cold puree", "table": ["tomato", "baguette", "eggs"], "course": "Starter", "taste": "Savoury", "wild": 0},
  {"n": 7, "name": "Drink from bread, tomato and broccoli uses only the table", "table": ["baguette", "tomato", "broccoli"], "course": "Drink", "taste": "Savoury", "wild": 60},
  {"n": 8, "name": "Milk and red onion drink keeps the onion, invents no lemon", "table": ["milk", "onion"], "course": "Drink", "taste": "Savoury", "wild": 60},
  {"n": 9, "name": "Broccoli and tomato lie flat on toast", "table": ["baguette", "broccoli", "tomato"], "course": "Snack", "taste": "Savoury", "wild": 0},
  {"n": 10, "name": "Salmon on toast is thin ribbons, to scale, droplets touching", "table": ["baguette", "salmon", "avocado"], "course": "Snack", "taste": "Savoury", "wild": 0},
  {"n": 11, "name": "Butter is a pale pat, never a cake block", "table": ["baguette", "butter", "tomato"], "course": "Snack", "taste": "Savoury", "wild": 0},
  {"n": 12, "name": "Potato soup toppings are roast dice, sunk in", "table": ["potato", "milk", "onion"], "course": "Starter", "taste": "Savoury", "wild": 0},
  {"n": 13, "name": "Rice-bowl toppings sink; avocado has no pit", "table": ["salmon", "rice", "avocado"], "course": "Main", "taste": "Savoury", "wild": 0},
  {"n": 14, "name": "Chicken, potato and spinach as a Main is not a salad", "table": ["chicken", "potato", "spinach"], "course": "Main", "taste": "Savoury", "wild": 60},
  {"n": 15, "name": "Romaine as a Main is a bed, not a salad dish", "table": ["romaine", "steak", "tomato"], "course": "Main", "taste": "Savoury", "wild": 0},
  {"n": 16, "name": "Strawberry toast keeps the berries on the bread", "table": ["baguette", "strawberry"], "course": "Dessert", "taste": "Sweet", "wild": 0},
  {"n": 17, "name": "Savoury Wild 0 stays savoury, no syrup", "table": ["steak", "potato", "garlic"], "course": "Main", "taste": "Savoury", "wild": 0},
  {"n": 18, "name": "Sweet Wild 0 dessert stays sweet", "table": ["strawberry", "milk", "blueberries"], "course": "Dessert", "taste": "Sweet", "wild": 0},
  {"n": 19, "name": "Wild 60 does not invent a dishonest world dish", "table": ["watermelon", "cabbage", "strawberry"], "course": "Starter", "taste": "Savoury", "wild": 60},
  {"n": 20, "name": "Wild 100 differs from Wild 0, still honest", "table": ["steak", "potato", "garlic"], "course": "Main", "taste": "Savoury", "wild": 100},
  {"n": 21, "name": "Repeat cooks of the same table vary", "table": ["steak", "potato", "garlic"], "course": "Main", "taste": "Savoury", "wild": 60},
  {"n": 22, "name": "Tomato and milk as a savoury starter is not pancakes", "table": ["tomato", "milk"], "course": "Starter", "taste": "Savoury", "wild": 0},
  {"n": 23, "name": "Highball quality (strawberry milk)", "table": ["strawberry", "milk"], "course": "Drink", "taste": "Sweet", "wild": 0},
  {"n": 24, "name": "Rocks glass (watermelon and lime)", "table": ["watermelon", "lime"], "course": "Drink", "taste": "Sweet", "wild": 0},
  {"n": 25, "name": "Coupe (apple cider)", "table": ["apple"], "course": "Drink", "taste": "Sweet", "wild": 0},
  {"n": 26, "name": "Wine glass (grape spritz)", "table": ["grapes", "lemon"], "course": "Drink", "taste": "Sweet", "wild": 0},
  {"n": 27, "name": "Nick & Nora (lime and milk)", "table": ["lime", "milk"], "course": "Drink", "taste": "Sweet", "wild": 0},
  {"n": 28, "name": "Painterly on, then off again", "table": ["watermelon", "cabbage", "strawberry"], "course": "Starter", "taste": "Savoury", "wild": 60},
  {"n": 29, "name": "Shuffle animation and table replace", "table": ["tomato", "broccoli", "baguette"], "course": "", "taste": "", "wild": -1},
  {"n": 30, "name": "Randomise changes Course, Taste and Wild", "table": ["steak", "potato", "garlic"], "course": "Main", "taste": "Savoury", "wild": 0},
  {"n": 31, "name": "Undo is on the left and actually undoes", "table": ["baguette", "tomato", "broccoli"], "course": "Snack", "taste": "Savoury", "wild": 0},
  {"n": 32, "name": "Tap to remove a table item, without rotating the camera", "table": ["baguette", "tomato", "broccoli"], "course": "Snack", "taste": "Savoury", "wild": 0}
];
