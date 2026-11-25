import type { FamilyId } from './families';

/**
 * How each pantry ingredient wants to be used on a dish (the composable dishes spec, 2026-11-26).
 *
 * Think of it as a casting sheet: for each ingredient, which parts it can play on a plate (the hero,
 * the generous bunch beside it, a small accent, the base under everything, the sauce, the garnish,
 * or the drink), and in which cuts. The Kitchen's Cook reads this to turn whatever is on the table
 * into one plated dish. Nothing here is painted: colours still come from the families.
 *
 * Every form listed must already be buildable by `makeElement` (src/dishes/compose/elements.ts):
 * either one of its special cases, or a plain cut (half, wedge, wheel, slice, cube) of an ingredient
 * that has a body size in `BODY` (src/dishes/compose/layout.ts).
 */

/** Composition slots a pantry ingredient is allowed to fill. */
export type DishSlot = 'hero' | 'support' | 'accent' | 'base' | 'sauce' | 'garnish' | 'liquid';

export type IngredientCategory = 'protein' | 'produce' | 'starch' | 'dairy' | 'leafy' | 'liquid' | 'condiment';

export type Taste = 'savoury' | 'sweet' | 'both';

export interface IngredientTraits {
  /** Registry id (src/ingredients/registry.ts). */
  id: string;
  category: IngredientCategory;
  taste: Taste;
  /** Preferred slot first, then the others it may take. */
  slots: DishSlot[];
  /** Buildable forms by the slot they are used in. Base, sauce and liquid hold base strings
   * (`rice`, `pool:*`, `leaves:*`, `soup:*`, `mash:*`, `drink:*`), not pieces. */
  forms: Partial<Record<DishSlot | 'stew', string[]>>;
  /** Family on a raw or fresh cut. */
  family: FamilyId;
  /** Family when the dish is cooked; the same when it does not change. */
  cookedFamily: FamilyId;
  /** Sear when the dish is cooked (0: stays fresh). */
  sear: number;
  /** On the table, this ingredient becomes the base (rice, a leaf bed). */
  prefersBase?: boolean;
  /** Forms never to use. Garlic is never a bulb (the user, 2026-11-25); a pepper never a lone
   * whole pepper, chicken never cubes outside skewers and stews (the fix list, 2026-11-25). */
  forbiddenForms?: string[];
}

const t = (row: IngredientTraits): IngredientTraits => row;

export const TRAITS: Record<string, IngredientTraits> = {
  steak: t({ id: 'steak', category: 'protein', taste: 'savoury', slots: ['hero', 'support'], forms: { hero: ['steak'], support: ['cube', 'skewer'] }, family: 'beef', cookedFamily: 'rare', sear: 0.9 }),
  salmon: t({ id: 'salmon', category: 'protein', taste: 'savoury', slots: ['hero', 'support', 'accent'], forms: { hero: ['fillet'], support: ['slice', 'cube', 'skewer'], accent: ['slice'] }, family: 'salmon', cookedFamily: 'cooked-salmon', sear: 0.95 }),
  chicken: t({ id: 'chicken', category: 'protein', taste: 'savoury', slots: ['hero', 'support'], forms: { hero: ['slice', 'drumstick', 'torn'], support: ['torn', 'slice', 'skewer'], stew: ['cube'] }, family: 'poultry', cookedFamily: 'poultry', sear: 0.5 }),
  eggs: t({ id: 'eggs', category: 'protein', taste: 'savoury', slots: ['hero', 'support'], forms: { hero: ['egg', 'omelette'], support: ['egg', 'half'] }, family: 'eggshell', cookedFamily: 'albumen', sear: 0 }),
  potato: t({ id: 'potato', category: 'starch', taste: 'savoury', slots: ['support', 'hero', 'base'], forms: { hero: ['mash', 'whole'], support: ['fries', 'wedge', 'cube', 'wheel'], base: ['mash:potato', 'soup:potato'] }, family: 'potato', cookedFamily: 'fries', sear: 0.45 }),
  // Rice has no piece form: it is always the base (a rice bowl).
  rice: t({ id: 'rice', category: 'starch', taste: 'savoury', slots: ['base'], forms: { base: ['rice', 'mash:risotto'] }, family: 'rice', cookedFamily: 'cooked-rice', sear: 0.8, prefersBase: true }),
  baguette: t({ id: 'baguette', category: 'starch', taste: 'savoury', slots: ['hero', 'support'], forms: { hero: ['toast'], support: ['cube'] }, family: 'baked', cookedFamily: 'crumb', sear: 0.7 }),
  broccoli: t({ id: 'broccoli', category: 'produce', taste: 'savoury', slots: ['support', 'hero'], forms: { hero: ['whole'], support: ['whole'] }, family: 'green', cookedFamily: 'green', sear: 0.35 }),
  apple: t({ id: 'apple', category: 'produce', taste: 'both', slots: ['hero', 'support', 'accent'], forms: { hero: ['wedge', 'slice', 'half'], support: ['wedge', 'slice'], accent: ['cube', 'slice'] }, family: 'red', cookedFamily: 'apple-flesh', sear: 0 }),
  pear: t({ id: 'pear', category: 'produce', taste: 'sweet', slots: ['hero', 'support'], forms: { hero: ['half'], support: ['slice', 'cube'] }, family: 'pear', cookedFamily: 'pear-flesh', sear: 0.4 }),
  peach: t({ id: 'peach', category: 'produce', taste: 'sweet', slots: ['hero', 'support', 'accent'], forms: { hero: ['wedge', 'half'], support: ['wedge', 'half'], accent: ['cube', 'slice'] }, family: 'peach', cookedFamily: 'peach-flesh', sear: 0.5 }),
  orange: t({ id: 'orange', category: 'produce', taste: 'both', slots: ['accent', 'support', 'liquid'], forms: { support: ['wheel'], accent: ['wheel'], liquid: ['drink:orange'] }, family: 'orange', cookedFamily: 'orange-flesh', sear: 0 }),
  lemon: t({ id: 'lemon', category: 'produce', taste: 'savoury', slots: ['accent'], forms: { accent: ['wedge', 'wheel'] }, family: 'yellow', cookedFamily: 'lemon-flesh', sear: 0 }),
  lime: t({ id: 'lime', category: 'produce', taste: 'savoury', slots: ['accent', 'liquid'], forms: { accent: ['wheel', 'wedge'], liquid: ['drink:green'] }, family: 'lime', cookedFamily: 'lime-flesh', sear: 0 }),
  strawberry: t({ id: 'strawberry', category: 'produce', taste: 'sweet', slots: ['support', 'accent', 'hero', 'liquid'], forms: { hero: ['half'], support: ['half'], accent: ['slice'], liquid: ['drink:strawberry'] }, family: 'crimson', cookedFamily: 'berry-flesh', sear: 0 }),
  watermelon: t({ id: 'watermelon', category: 'produce', taste: 'both', slots: ['support', 'hero', 'liquid'], forms: { hero: ['cube'], support: ['cube'], liquid: ['drink:watermelon'] }, family: 'melon', cookedFamily: 'melon', sear: 0 }),
  tomato: t({ id: 'tomato', category: 'produce', taste: 'savoury', slots: ['support', 'accent', 'base', 'liquid'], forms: { support: ['wedge', 'half', 'wheel'], accent: ['wedge', 'wheel'], base: ['soup:tomato', 'pool:tomato-sauce'], liquid: ['drink:tomato'] }, family: 'tomato', cookedFamily: 'tomato-flesh', sear: 0.35 }),
  onion: t({ id: 'onion', category: 'produce', taste: 'savoury', slots: ['accent', 'support'], forms: { support: ['wheel'], accent: ['wheel'] }, family: 'onion', cookedFamily: 'onion-flesh', sear: 0 }),
  pepper: t({ id: 'pepper', category: 'produce', taste: 'savoury', slots: ['support', 'accent', 'hero'], forms: { hero: ['half', 'strip'], support: ['strip', 'slice'], accent: ['strip'] }, family: 'pepper', cookedFamily: 'pepper-flesh', sear: 0.4 }),
  avocado: t({ id: 'avocado', category: 'produce', taste: 'savoury', slots: ['support', 'hero', 'liquid'], forms: { hero: ['half'], support: ['slice'], liquid: ['drink:avocado'] }, family: 'avocado', cookedFamily: 'avocado-flesh', sear: 0 }),
  grapes: t({ id: 'grapes', category: 'produce', taste: 'both', slots: ['support', 'accent', 'liquid'], forms: { support: ['berry'], accent: ['berry'], liquid: ['drink:grape'] }, family: 'grape', cookedFamily: 'grape', sear: 0 }),
  blueberries: t({ id: 'blueberries', category: 'produce', taste: 'sweet', slots: ['support', 'accent', 'liquid'], forms: { support: ['berry'], accent: ['berry'], liquid: ['drink:blueberry'] }, family: 'blueberry', cookedFamily: 'blueberry', sear: 0 }),
  mushroom: t({ id: 'mushroom', category: 'produce', taste: 'savoury', slots: ['support', 'hero'], forms: { hero: ['half', 'slice'], support: ['half', 'slice'] }, family: 'mushroom', cookedFamily: 'mushroom', sear: 0.6 }),
  cabbage: t({ id: 'cabbage', category: 'leafy', taste: 'savoury', slots: ['base', 'hero', 'support'], forms: { base: ['leaves:cabbage'], hero: ['wedge'], support: ['leaf', 'roll'] }, family: 'cabbage', cookedFamily: 'cabbage-flesh', sear: 0.85 }),
  spinach: t({ id: 'spinach', category: 'leafy', taste: 'savoury', slots: ['base', 'accent', 'support'], forms: { base: ['leaves:spinach'], support: ['leaf'], accent: ['leaf'] }, family: 'spinach', cookedFamily: 'spinach', sear: 0, prefersBase: true }),
  // Romaine has no piece form: on the table it is always the leaf bed.
  romaine: t({ id: 'romaine', category: 'leafy', taste: 'savoury', slots: ['base'], forms: { base: ['leaves:romaine'] }, family: 'romaine', cookedFamily: 'romaine', sear: 0, prefersBase: true }),
  cheese: t({ id: 'cheese', category: 'dairy', taste: 'both', slots: ['support', 'accent', 'hero'], forms: { hero: ['wedge', 'cake'], support: ['slice'], accent: ['crumble'] }, family: 'cheese', cookedFamily: 'cheese', sear: 0 }),
  butter: t({ id: 'butter', category: 'dairy', taste: 'both', slots: ['sauce', 'accent', 'hero'], forms: { hero: ['cake', 'pastry'], accent: ['cube', 'crumble'], sauce: ['pool:brown-butter'] }, family: 'butter', cookedFamily: 'brown-butter', sear: 0 }),
  milk: t({ id: 'milk', category: 'dairy', taste: 'both', slots: ['base', 'liquid', 'hero'], forms: { hero: ['pancake', 'mash'], base: ['pool:cream'], liquid: ['drink:milk'] }, family: 'milk', cookedFamily: 'cream', sear: 0, prefersBase: true }),
  // Never a hero, never a modelled bottle: on the table it is the pool under the food.
  sauce: t({ id: 'sauce', category: 'condiment', taste: 'savoury', slots: ['sauce'], forms: { sauce: ['pool:chili'] }, family: 'sauce', cookedFamily: 'chili-oil', sear: 0 }),
  // Always a scatter of crisp golden chips, never a bulb (the user, 2026-11-25).
  garlic: t({ id: 'garlic', category: 'condiment', taste: 'savoury', slots: ['accent', 'garnish'], forms: { accent: ['chip'], garnish: ['chip'] }, family: 'garlic-chip', cookedFamily: 'garlic-chip', sear: 0.5, forbiddenForms: ['whole', 'half', 'bulb'] }),
};

export function traitsFor(id: string): IngredientTraits | undefined {
  return TRAITS[id];
}

/**
 * Who leads the plate when several could (1 = first choice). Proteins first, then the platforms
 * (toast, mash, a cheese wedge), then substantial produce, then berries as a heap. Garlic, sauce,
 * lemon, lime and romaine never lead (99) unless nothing else is there.
 */
const PRIORITY: Record<string, number> = {
  steak: 1, salmon: 1, chicken: 1, eggs: 1,
  baguette: 2, potato: 2, cheese: 2,
  peach: 3, pear: 3, apple: 3, avocado: 3, watermelon: 3, pepper: 3, mushroom: 3, cabbage: 3, broccoli: 3, tomato: 3,
  strawberry: 4, grapes: 4, blueberries: 4,
  milk: 5, butter: 5, spinach: 6, orange: 6,
  lemon: 99, lime: 99, garlic: 99, sauce: 99, romaine: 99, rice: 99,
};

export function heroPriority(id: string): number {
  return PRIORITY[id] ?? 50;
}

/** Every form any trait may use as a piece (makeElement special cases plus the plain cuts). */
export const BUILDABLE_FORMS = [
  'whole', 'half', 'wedge', 'wheel', 'slice', 'cube', 'fillet', 'steak', 'drumstick', 'egg', 'berry', 'leaf', 'crumble',
  'toast', 'mash', 'skewer', 'roll', 'omelette', 'cake', 'pancake', 'pastry', 'fries', 'chip', 'strip', 'torn',
];
