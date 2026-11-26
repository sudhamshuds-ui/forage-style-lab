import WORLD from '../worldDishes.json';
import { seededRandom } from '../../ingredients/forms/kit/random';
import { FAMILIES, type FamilyId } from '../../ingredients/families';
import { componentGarnish, componentPiece, type DishComponent } from './components';
import type { LayoutId } from './layouts';
import { SKEWERS } from './elements';

/**
 * The world dish library (docs/forage-specs/world-dishes-brief.md, sections 2 to 4): 236 real dishes
 * from 40 cuisines. Cook first looks for a real dish that fits the table and the choices; only when
 * none scores well enough does it fall back to the template generator (`pickDish` in pick.ts).
 *
 * Like casting from a book of recipes: the table's ingredients are always the stars (every one of
 * them stays on the plate), the dish lends its name, its plating layout and the small finishing
 * touches it is known for (sumac dust, pistachio, a quenelle of cream).
 */
export interface WorldDish {
  id: string;
  name: string;
  cuisine: string;
  region: string;
  course: 'starter' | 'main' | 'dessert' | 'snack' | 'drink';
  taste: 'savoury' | 'sweet' | 'both';
  heroes: string[];
  coreIngredients: string[];
  supportingComponents: string[];
  vessel: string;
  layout: LayoutId;
  platingNotes: string;
  blurb: string;
  sourceUrl: string;
  /** What the dish must look like on the card (scripts/world-looks.py). */
  looks: Looks;
}

/**
 * A world dish's looks note (the user, 2026-11-26: "World dishes must look like the real dish"):
 * its vessel, its base, the shape of each piece, its signature finish, what it must never show, and
 * what the renderer cannot paint yet (`needs`: such a dish is refused, a template dish cooks).
 */
export interface Looks {
  vessel: 'bowl' | 'deep-bowl' | 'kadai' | 'ramekin' | 'plate' | 'board' | 'glass' | 'tart';
  base: { colour: string; texture: string; family: FamilyId; from?: string } | null;
  pieces: { ingredient: string; shape: string; sink: 'none' | 'third' | 'half'; size_cm?: number; required?: boolean }[];
  finish: string;
  never: string[];
  needs: string[];
  savoury?: boolean;
  /** The note's minimum to claim the name (docs/forage-specs/world-dish-looks.json). */
  claim?: string[];
  /** The note serves ice cream (a quenelle or a scoop); otherwise no scoop is ever added. */
  scoop?: boolean;
  /** The note serves whipped cream or a cream cap; otherwise none is added. */
  whip?: boolean;
}

/** Vessels the renderer can paint, and the layouts each means. */
export const VESSEL_LAYOUTS: Record<string, LayoutId[]> = {
  plate: ['circular-plate', 'tartare-crudo', 'composed-plate', 'mash-plate', 'skewer-platter', 'plated-dessert', 'pancake-stack', 'leaf-salad', 'dessert-bowl'],
  bowl: ['skillet-bake', 'dessert-bowl', 'leaf-salad', 'soup-bowl', 'circular-plate', 'mash-plate', 'pancake-stack', 'tartare-crudo', 'rice-bowl'],
  'deep-bowl': ['rice-bowl', 'soup-bowl', 'skillet-bake', 'circular-plate'],
  board: ['toast-board', 'skewer-platter'],
  glass: ['glass-drink'],
  tart: ['tart'],
};

/** True when the renderer can paint this dish as its looks note says (honest-names rule). */
export function renderable(dish: WorldDish): boolean {
  const looks = dish.looks;
  if (!looks || looks.needs.length) return false;
  if (!VESSEL_LAYOUTS[looks.vessel]?.includes(dish.layout)) return false;
  if (looks.base && !FAMILIES[looks.base.family]) return false;
  return true;
}

export const WORLD_DISHES = WORLD as WorldDish[];

/** Below this, the template generator cooks instead (brief 2.3). */
export const MATCH_THRESHOLD = 4.0;

const CLASSIC_CUISINES = new Set(['American', 'British', 'French', 'Italian', 'Spanish', 'Mexican', 'Indian', 'Japanese', 'Greek']);

interface Choices {
  course: string;
  taste: string;
  wild: number;
}

/**
 * Hard filters of our own, on top of the brief's: a dish's layout has to be honest for this table
 * (a rice bowl needs the rice, a salad its leaves, mash its potato), and the user's rules hold (a
 * main is always plated, never a salad or a soup).
 */
function legalFor(dish: WorldDish, table: string[], course: string): boolean {
  const has = (id: string) => table.includes(id);
  if (course === 'main' && (dish.layout === 'leaf-salad' || dish.layout === 'soup-bowl')) return false;
  // A dessert is a dessert dish, and only a dessert is (a savoury salmon dish for Dessert, or pancakes
  // for a starter, read as mistakes).
  if ((course === 'dessert') !== (dish.course === 'dessert')) return false;
  if (['starter', 'main'].includes(course) && ['pancake-stack', 'tart', 'dessert-bowl', 'plated-dessert'].includes(dish.layout)) return false;
  if (dish.layout === 'rice-bowl' && !has('rice')) return false;
  if (dish.layout === 'leaf-salad' && !['romaine', 'spinach', 'cabbage'].some(has)) return false;
  if (dish.layout === 'mash-plate' && !has('potato')) return false;
  if (dish.layout === 'skewer-platter' && !['chicken', 'steak', 'salmon'].some((p) => has(p) && SKEWERS[p].some((bead) => bead.ingredient !== p && has(bead.ingredient)))) return false;
  if (course !== 'drink' && dish.layout === 'glass-drink') return false;
  return true;
}

/** Words a dish name uses for each pantry ingredient (a name that says "steak" needs the steak). */
export const NAME_WORDS: Record<string, RegExp> = {
  steak: /steak|beef|bistec|lomo|bulgogi|carne/, salmon: /salmon|lox|gravlax/, chicken: /chicken|pollo|poulet|joojeh|murgh|tikka/,
  eggs: /\begg|omelet|frittata|tortilla|shakshuka|tamago|chawanmushi/, potato: /potato|aloo|batat|patata|rösti|rosti|frites|\bfries|\bchips\b|\bhash\b|gratin|\bmash/, rice: /\brice|risotto|pilaf|polo|paella/,
  baguette: /bread|toast|bruschetta|crostini|tartine|banh mi|dakos/, milk: /\bmilk|latte|lassi/, cheese: /cheese|feta|parmesan|halloumi|gorgonzola|paneer|ricotta|gibna|mozzarella|burrata|pecorino|cheddar|gruy|manchego|queso|comt|brie|camembert|raclette|reblochon|mascarpone|halloumi|kashkaval|haloumi/,
  strawberry: /strawberr/, blueberries: /blueberr/, grapes: /grape/, watermelon: /watermelon|subak|tangmo|bateeikh/, apple: /apple|aeble/, pear: /\bpear/,
  peach: /peach|melba/, orange: /orange/, lemon: /lemon/, lime: /\blime/, tomato: /tomat|pomodoro/, avocado: /avocado|guacamole/, mushroom: /mushroom/,
  spinach: /spinach|esfenaj|palak/, cabbage: /cabbage|slaw|kimchi/, broccoli: /broccoli/, pepper: /pepper|pimiento/, onion: /onion/, garlic: /garlic/, romaine: /romaine|caesar/,
};

/**
 * The pantry ingredients one line of a note's minimum to claim the name asks for: every one it
 * names ("tomato slices and white mozzarella"), or one of them where it offers a choice ("lemon or
 * lime"). Colour words are not ingredients ("coral-orange puree", "lime-green", "salmon pink").
 */
export function claimNeeds(line: string): { ids: string[]; anyOf: boolean } {
  let text = line.toLowerCase();
  if (/^(no|never|not)\b/.test(text)) return { ids: [], anyOf: false };
  text = text
    .replace(/\b(coral|golden|bright|deep|pale|burnt|red|reddish|yellow|amber|vibrant|warm)[- ]orange\b/g, ' ')
    .replace(/\borange[- ](red|yellow|gold|golden|brown|tinted|hued|pink)\b/g, ' ')
    .replace(/\b(lime|lemon|salmon|peach|tomato|cherry|mushroom|avocado|butter|cream)[- ](green|yellow|pink|red|coloured|colored|toned|tinted|brown|white)\b/g, ' ');
  const ids = Object.keys(NAME_WORDS).filter((id) => NAME_WORDS[id].test(text));
  return { ids, anyOf: /\bor\b/.test(text) };
}

/** True when the table shows everything the note's minimum to claim the name asks for. */
export function claimMet(dish: WorldDish, table: string[]): boolean {
  return (dish.looks.claim ?? []).every((line) => {
    const { ids, anyOf } = claimNeeds(line);
    return !ids.length || (anyOf ? ids.some((id) => table.includes(id)) : ids.every((id) => table.includes(id)));
  });
}

/** Brief 2.2: how well a dish fits the table and the choices (-Infinity when it cannot be cooked). */
export function scoreWorldDish(dish: WorldDish, table: string[], choices: Choices): number {
  const course = choices.course.toLowerCase();
  const taste = choices.taste.toLowerCase();
  // Hard filters (2.1): drinks only for Drink; at least one table ingredient in the dish.
  if ((course === 'drink') !== (dish.course === 'drink')) return -Infinity;
  const overlap = table.filter((id) => dish.coreIngredients.includes(id) || dish.heroes.includes(id));
  if (overlap.length === 0) return -Infinity;
  if (!legalFor(dish, table, course)) return -Infinity;
  // Only a dish the renderer can paint as it really looks, and never with what it must not show
  // (palak paneer never has chicken).
  if (!renderable(dish)) return -Infinity;
  if (table.some((id) => dish.looks.never.some((word) => word === id || word === `${id}s`))) return -Infinity;
  // Never a name that promises what is not on the plate ("Classic Steak Tartare" with no steak).
  const name = dish.name.toLowerCase();
  if (dish.heroes.some((id) => !table.includes(id) && NAME_WORDS[id]?.test(name))) return -Infinity;
  // The dish's lead hero is on the table (a "Cilbir" is eggs), and the name never promises what the
  // pantry cannot plate (duck, lamb, prawns).
  if (!table.includes(dish.heroes[0])) return -Infinity;
  // Every ingredient the note's minimum to claim the name shows has to be on the table (Colcannon
  // is mash with cabbage; Palak Paneer needs the spinach and the paneer).
  if (!claimMet(dish, table)) return -Infinity;
  // R7: the pieces the note shows are on the table (a Caprese is tomato and mozzarella; only what
  // it shows "if on table" may be missing) ...
  if (dish.looks.pieces.some((p) => p.required !== false && !table.includes(p.ingredient))) return -Infinity;
  // ... and every table ingredient has its place in the dish: a piece, the base, or the recipe (rice
  // never vanishes into a gazpacho, a tomato is never stood on a lemon rice).
  const place = new Set([...dish.heroes, ...dish.coreIngredients, ...dish.looks.pieces.map((p) => p.ingredient), ...(dish.looks.base?.from ? [dish.looks.base.from] : [])]);
  if (table.some((id) => !place.has(id))) return -Infinity;
  if (/duck|lamb|pork|shrimp|prawn|tuna|\bcod\b|crab|bacon|\bham\b|turkey|tofu|noodle|pasta|ramen|udon|spaghetti|coffee|ca phe/.test(name)) return -Infinity;
  let score = 0;
  for (const id of table) {
    if (dish.heroes.includes(id)) score += 3.5;
    else if (dish.coreIngredients.includes(id)) score += 1.5;
  }
  if (table.every((id) => dish.coreIngredients.includes(id) || dish.heroes.includes(id))) score += 4.0;
  score -= 0.8 * dish.heroes.filter((id) => !table.includes(id)).length;
  const adjacent = (a: string, b: string) => [a, b].includes('starter') && (['snack', 'main'].includes(a) || ['snack', 'main'].includes(b)) && a !== b;
  if (dish.course === course) score += 3.0;
  else if (adjacent(dish.course, course)) score += 0.5;
  else score -= 3.5;
  if (dish.taste === taste) score += 2.5;
  else if (dish.taste === 'both' || taste === 'both') score += 1.2;
  else score -= 3.0;
  const regional = !CLASSIC_CUISINES.has(dish.cuisine);
  if (choices.wild <= 30) score += (regional ? 0 : 1.5) + (dish.taste !== 'both' ? 0.5 : 0);
  else if (choices.wild <= 70) score += regional ? 1.2 : 0;
  else score += (regional ? 2.0 : 0) + (dish.taste === 'both' ? 1.8 : 0);
  return score;
}

/**
 * Brief 2.2 and 2.3: the world dish for this cook, or undefined (the template generator cooks).
 * Classic takes the top scorer; Regional one of the top two; Unhinged one of the top four within
 * 1.5 points of the best, picked with the cook's seed (the same cook, the same dish).
 */
export function pickWorldDish(table: string[], choices: Choices, seed: number, attempt = 0): WorldDish | undefined {
  const scored = WORLD_DISHES.map((dish) => ({ dish, score: scoreWorldDish(dish, table, choices) }))
    .filter((d) => Number.isFinite(d.score))
    .sort((a, b) => b.score - a.score || a.dish.id.localeCompare(b.dish.id));
  if (!scored.length || scored[0].score < MATCH_THRESHOLD) return undefined;
  const random = seededRandom((seed ^ 0x3017d) >>> 0);
  const good = scored.filter((d) => d.score >= MATCH_THRESHOLD);
  // Pressing Cook again with the same table (R4: repeat cooks should differ more): Classic walks
  // through the best few fitting dishes in turn; a step out picks among the top three.
  if (choices.wild <= 30) {
    const close = good.filter((d) => d.score >= good[0].score - 4).slice(0, 3);
    return close[attempt % close.length].dish;
  }
  if (choices.wild <= 70) return good[Math.floor(random() * Math.min(attempt ? 3 : 2, good.length))].dish;
  // Unhinged: never the Classic pick when another dish is near (Wild has to show).
  const classic = [...scored].sort((a, b) => scoreWorldDish(b.dish, table, { ...choices, wild: 0 }) - scoreWorldDish(a.dish, table, { ...choices, wild: 0 }) || a.dish.id.localeCompare(b.dish.id))[0]?.dish;
  const others = good.filter((d) => d.dish !== classic);
  // Only the classic dish fits: Unhinged cooks a template dish instead, so Wild still shows.
  if (!others.length) return undefined;
  const pool = others;
  const near = pool.filter((d) => d.score >= pool[0].score - 1.5).slice(0, 4);
  return near[Math.floor(random() * near.length)].dish;
}

/** The pantry ids a component phrase names ("lime wheel", "strawberry half"): kept only if on the table. */
const PANTRY_WORDS: [RegExp, string][] = [
  [/\blime\b/, 'lime'], [/\blemon\b/, 'lemon'], [/\borange\b/, 'orange'], [/strawberr/, 'strawberry'], [/blueberr/, 'blueberries'],
  [/\bpepper strip|charred pepper|roast pepper/, 'pepper'], [/\bgarlic\b/, 'garlic'], [/\bonion|shallot/, 'onion'], [/\btomato/, 'tomato'],
  [/\bapple\b/, 'apple'], [/\bpear\b/, 'pear'], [/\bpeach/, 'peach'], [/\bgrape/, 'grapes'], [/avocado/, 'avocado'], [/mushroom/, 'mushroom'],
  [/\bbread|toast|crouton|pita|naan|tortilla|flatbread|injera|crostini/, 'baguette'], [/parmesan|feta|cheese/, 'cheese'],
];

/**
 * Brief section 3: a dish's supporting components as render components. Only what the library can
 * paint, and never a pantry ingredient the table did not bring (a lime wheel without a lime, bread
 * without bread: the user's rule, "never invent"). Sweet dishes get no herbs or savoury oils
 * (filtered again by the sweet rule in pick.ts).
 */
export function worldComponents(dish: WorldDish, table: string[], sweet: boolean): DishComponent[] {
  const out: DishComponent[] = [];
  const add = (c: DishComponent) => {
    if (!out.some((o) => o.kind === c.kind && o.family === c.family)) out.push(c);
  };
  for (const raw of dish.supportingComponents) {
    const text = raw.toLowerCase();
    const names = PANTRY_WORDS.find(([re]) => re.test(text));
    if (names && !table.includes(names[1])) continue;
    if (names) continue; // a table ingredient: it is on the plate already as a piece
    if (/quenelle|ice cream|gelato|sorbet/.test(text) && !/whipped/.test(text)) {
      if (dish.looks?.scoop !== false) add(componentPiece('quenelle', 'ice-cream', 1, 'beside'));
    }
    else if (/whipped|cream (dollop|cloud|swirl)|chantilly|foam|mascarpone/.test(text)) {
      if (dish.looks?.whip !== false) add(componentPiece('whip', 'cream', 1, 'on-hero-allowed'));
    }
    else if (/pancake|crepe|tart shell|pastry|crust/.test(text)) continue; // the layout's own vehicle
    else if (/sponge|biscuit|shortbread|\bcake\b|tuile|wafer|brittle/.test(text)) add(componentPiece('tuile', 'pastry', 1, 'beside'));
    else if (/smear|puree|purée|hummus|toum|labneh|yogurt|tahini/.test(text)) add(componentPiece('smear', 'cream-sauce', 1, 'beside'));
    else if (/syrup|honey|caramel|maple|molasses/.test(text)) {
      // Syrups only on a sweet dish (R4: never syrup on a savoury plate).
      if (sweet) add(componentGarnish('gel', /maple|caramel|molasses/.test(text) ? 'caramel' : 'honey', 7));
    }
    else if (/pomegranate|barberr|cranberr/.test(text)) add(componentGarnish('gel', 'berry-sauce', 9));
    else if (/pistachio|pine nut|almond|walnut|hazelnut|sesame|seed|nut/.test(text)) {
      add({ ...componentGarnish('gel', /pistachio/.test(text) ? 'leaf' : 'pastry', 11), label: /pistachio/.test(text) ? 'chopped pistachios' : /sesame|seed/.test(text) ? 'toasted seeds' : 'toasted nuts' });
    }
    else if (/olive/.test(text) && !/oil/.test(text)) add(componentGarnish('gel', 'ink', 7));
    else if (/sumac|chili flake|paprika|berbere|chili lime salt/.test(text)) add(componentGarnish('gel', 'chili-oil', 13));
    else if (/cinnamon|sugar dust|cocoa|nutmeg/.test(text)) add(componentGarnish('gel', 'caramel', 13));
    else if (/chive/.test(text)) add({ ...componentGarnish('oil-dot', 'herb-oil', 7), label: 'snipped chives and a few drops of oil' });
    else if (/chili oil|chili dot|harissa/.test(text)) add(componentGarnish('oil-dot', 'chili-oil', 9));
    else if (/lemon oil|citrus oil|lime oil/.test(text)) add(componentGarnish('oil-dot', 'citrus-oil', 9));
    else if (/oil|gloss|dressing|vinaigrette/.test(text)) add(componentGarnish('oil-dot', 'herb-oil', 9));
    else if (/herb|cilantro|parsley|mint|dill|basil|thyme|chive|scallion|microgreen|fronds|leaves|leaf|sprig|oregano|tarragon/.test(text)) add(componentGarnish('microherb', 'leaf', 9));
  }
  // What the looks note forbids (herbs on a dessert, syrup on a savoury dish, whipped cream, oil).
  const never = (dish.looks?.never ?? []).map((w) => w.toLowerCase());
  const banned = (c: DishComponent) =>
    (c.kind === 'microherb' && never.some((w) => /^(savoury )?herbs\b/.test(w))) ||
    (['honey', 'caramel'].includes(c.family) && c.kind === 'gel' && never.some((w) => /^(sweet )?syrup/.test(w))) ||
    (c.part?.startsWith('whip:') && never.some((w) => /^(sweet )?whipped cream/.test(w))) ||
    (c.kind === 'oil-dot' && never.some((w) => /^savoury oil/.test(w)));
  const kept = out.filter((c) => !banned(c));
  // Sweet dishes: no herbs or savoury oils, whatever the recipe garnishes with.
  return sweet ? kept.filter((c) => c.kind !== 'microherb' && !['herb-oil', 'chili-oil', 'citrus-oil'].includes(c.family)) : kept;
}

/** Shapes that are one piece (a steak, a fillet, a dome of mash or smashed avocado). */
const SINGLE_SHAPES = ['steak', 'fillet', 'mash', 'smash', 'toast', 'drumstick', 'roll'];

interface LooksSlots {
  hero: { id: string; form: string; count: number };
  support: { id: string; form: string; count: number }[];
  accent: { id: string; form: string; count: number }[];
  inBase: string[];
  base: string;
}

/**
 * Render the dish from its looks note: each table ingredient takes the note's shape, the ingredient
 * that makes the base (spinach in a palak gravy) goes into it, and the base takes the note's colour.
 * Returns the base's colour family and its texture in words (for the caption).
 */
export function applyLooks(slots: LooksSlots, dish: WorldDish, table: string[]): { family?: FamilyId; texture?: string } {
  const looks = dish.looks;
  const pieces = () => [slots.hero, ...slots.support, ...slots.accent];
  for (const want of looks.pieces) {
    if (!table.includes(want.ingredient)) continue;
    // A piece the note shows that went into the base (the milk of a panna cotta's dome): out again.
    if (want.shape === 'mash' && !pieces().some((p) => p.id === want.ingredient) && slots.inBase.includes(want.ingredient)) {
      slots.inBase.splice(slots.inBase.indexOf(want.ingredient), 1);
      const piece = { id: want.ingredient, form: want.shape, count: 1 };
      // (The dome leads; a quenelle or cream standing in for it gives way.)
      if (['quenelle', 'whip', 'puree'].includes(slots.hero.id) || want.shape === 'mash') {
        if (!['quenelle', 'whip', 'puree'].includes(slots.hero.id)) slots.support.unshift(slots.hero);
        slots.hero = piece;
      } else slots.support.push(piece);
    }
    for (const p of pieces()) {
      if (p.id !== want.ingredient || p.form === want.shape) continue;
      // (A slice of toast is only ever the vehicle; beside the food, bread stays croutons.)
      if (want.shape === 'toast' && p !== slots.hero) continue;
      p.form = want.shape;
      // (A carved chicken breast is one piece, already sliced.)
      if (SINGLE_SHAPES.includes(want.shape) || (want.ingredient === 'chicken' && want.shape === 'slice')) p.count = 1;
      else if (['lemon', 'lime', 'orange'].includes(want.ingredient) && p !== slots.hero) p.count = Math.min(Math.max(1, p.count), 2);
      else if (p.count < 3) p.count = want.shape === 'egg' ? Math.max(1, p.count) : 3;
    }
  }
  const from = looks.base?.from;
  if (from && table.includes(from) && /gravy|soup|puree|broth|curry/.test(looks.base!.texture)) {
    // The base's own ingredient is the gravy or soup: out of the pieces, into the bowl.
    slots.support = slots.support.filter((p) => p.id !== from);
    slots.accent = slots.accent.filter((p) => p.id !== from);
    if (slots.hero.id === from) slots.hero = slots.support.shift() ?? slots.accent.shift() ?? slots.hero;
    if (!slots.inBase.includes(from)) slots.inBase.push(from);
    slots.base = `soup:${from}`;
  }
  // A set or simmered pudding (Muhallabieh, kheer, sutlac): the milk (or rice) fills a small bowl,
  // smooth to its rim; what sits on it is the table's other pieces, or a thin glaze of the note's
  // finish. Never a scoop of ice cream (R7).
  if (looks.base && /pudding|set milk|kheer/.test(looks.base.texture)) {
    const inside = [looks.base.from, 'milk', 'rice'].filter((id): id is string => !!id && table.includes(id));
    for (const id of inside) {
      slots.support = slots.support.filter((p) => p.id !== id);
      slots.accent = slots.accent.filter((p) => p.id !== id);
      if (!slots.inBase.includes(id)) slots.inBase.push(id);
    }
    if (inside.includes(slots.hero.id) || ['quenelle', 'whip', 'puree', 'smear'].includes(slots.hero.id)) {
      const glaze: FamilyId = /rose/.test(looks.finish) ? 'drink-pink' : /saffron|caramel|brown|cinnamon/.test(looks.finish) ? 'caramel' : 'honey';
      const table1 = (list: { id: string }[]) => list.findIndex((p) => table.includes(p.id));
      const fromSupport = table1(slots.support);
      const fromAccent = table1(slots.accent);
      slots.hero = fromSupport >= 0 ? slots.support.splice(fromSupport, 1)[0] : fromAccent >= 0 ? slots.accent.splice(fromAccent, 1)[0] : { id: 'puree', form: glaze, count: 1 };
    }
    slots.base = 'soup:pudding';
  }
  return { family: looks.base?.family, texture: looks.base?.texture };
}
