import { seededRandom } from '../../ingredients/forms/kit/random';
import { TRAITS, heroPriority } from '../../ingredients/traits';
import type { FamilyId } from '../../ingredients/families';
import type { DishIdea } from '../catalog';
import { componentGarnish, componentPiece, isComponent, type DishComponent } from './components';
import { SKEWERS } from './elements';
import { BODY, elementInfo } from './layout';
import { glassFor, takesIce } from '../kit/glass';
import { WORLD_DISHES, applyLooks, pickWorldDish, worldComponents } from './world';
import { layoutById, type LayoutId, type LayoutSpec } from './layouts';

/**
 * The Kitchen's Cook (the composable dishes spec, 2026-11-26; reworked by the fix list, 2026-11-25):
 * the ingredients on the table (one, two or three) plus the cooking choices become one plated dish
 * idea, which the composer then builds and paints like any other dish.
 *
 * Rule based and seeded, never an AI model: the same table, choices and seed always cook the same
 * dish; another seed varies counts, cuts, sides and sometimes the ware, never the plating rules.
 *
 * Like art directing a shoot, in four steps:
 * 1. `pickArchetype`: the course picks the kind of dish (Dessert: a tart, a plated dessert, a
 *    pudding bowl or pancakes; Drink: always a glass; ...). Wild picks how far from the classic.
 * 2. `assignSlots`: who plays which part: the hero, the bunch beside it, the accents, the base.
 * 3. `chooseComponents`: the library pieces that complete the dish (a tart shell, cream, a
 *    quenelle, a smear, oil dots, microherbs). The table's ingredients stay the only heroes.
 * 4. `titleDish`: a short dish name (3 to 5 words, at most 32 characters) and one sentence.
 */

export interface CookChoices {
  /** 'Starter' | 'Main' | 'Dessert' | 'Snack' | 'Drink' (the Kitchen panel's own words). */
  course: string;
  /** 'Savoury' | 'Sweet' | 'Both'. */
  taste: string;
  /** 0 to 100: Classic to Unhinged. */
  wild: number;
}

type Course = DishIdea['course'];

interface Piece {
  id: string;
  form: string;
  count: number;
}

export interface Slots {
  layout: LayoutSpec;
  hero: Piece;
  support: Piece[];
  accent: Piece[];
  base: string;
  /** Table ingredients used as the base or sauce (they appear, but not as pieces). */
  inBase: string[];
  ware: DishIdea['ware'];
  course: Course;
  /** The table ingredient the dish is named after (the hero's own, or the one inside a tart). */
  star: string;
  /** The dish's chosen sauce (the pool, or for a dry dish the smear and drizzle beside it). */
  sauce: string;
  /** A sweet dish (Group 1): only sweet-compatible pieces, no herbs, no savoury garnish. */
  sweet?: boolean;
  /** Savoury table ingredients made sweet for a sweet dish (a curd, a jam, a brittle). */
  made?: DishComponent[];
  /** The one savoury piece kept on purpose in an Unhinged sweet dish (one egg with a tart). */
  twist?: Piece;
  /** A world dish's base in its own words ("smooth, fully green spinach gravy"), for the caption. */
  texture?: string;
}

/** The longest a title may be: it must fit on one line on the result screen (the fix list). */
export const TITLE_MAX = 32;

const PROTEINS = ['steak', 'salmon', 'chicken', 'eggs'];
const LEAFY = ['romaine', 'spinach', 'cabbage'];
const BERRIES = ['strawberry', 'blueberries', 'grapes'];
const CITRUS = ['lemon', 'lime', 'orange'];
/** What can go in a tart or on pancakes: fruit, and the dairy that makes a cream or cheese tart. */
const TART_FILLING = ['apple', 'pear', 'peach', 'strawberry', 'blueberries', 'grapes', 'lemon', 'lime', 'orange', 'cheese', 'butter', 'milk', 'watermelon'];
/** What is good cut small and raw: a crudo or a tartare. */
const CRUDO = ['salmon', 'steak', 'watermelon', 'peach', 'tomato', 'avocado', 'pear', 'apple', 'strawberry'];

/** True for ingredients that read sweet as they are (fruit, dairy). */
const SWEET_OK_TASTE = (id: string) => TRAITS[id]?.taste === 'sweet' || TRAITS[id]?.taste === 'both';

/** Layouts that are sweet dishes, whatever the taste chip says. */
const SWEET_LAYOUTS: LayoutId[] = ['tart', 'plated-dessert', 'dessert-bowl', 'pancake-stack'];

/** A sweet dish: a dessert, a sweet layout, or toast chosen sweet (strawberry toast). */
export function isSweetDish(layout: LayoutId, course: string, taste: string, ids: string[] = []): boolean {
  // Toast is sweet only when what goes on it is sweet (strawberry toast); salmon on toast stays
  // savoury whatever the taste chip says (it got "green syrup" beside it, R4).
  const sweetToast = taste === 'Sweet' && layout === 'toast-board' && ids.every((id) => SWEET_OK_TASTE(id) || ['baguette', 'butter', 'milk'].includes(id));
  return course.toLowerCase() === 'dessert' || SWEET_LAYOUTS.includes(layout) || sweetToast;
}

/** A piece a sweet dish may carry as it is. Citrus wheels, herbs, a fried egg, croutons do not. */
export function sweetPiece(id: string, form: string): boolean {
  if (isComponent(id) || id === 'whip' || id === 'tart') return true;
  if (id === 'baguette') return form === 'toast';
  if (id === 'milk') return form === 'pancake' || form === 'mash';
  if (id === 'lemon' || id === 'lime') return false;
  return SWEET_OK_TASTE(id);
}

/**
 * What a savoury table ingredient becomes in a sweet dish (Group 1): kept, but made sweet, never
 * dropped: an egg is a custard, citrus a curd, a tomato a jam, meat a brittle shard of caramel.
 */
const SWEETENED: Record<string, { kind: 'smear' | 'gel' | 'tuile'; family: FamilyId; label: string }> = {
  eggs: { kind: 'smear', family: 'custard', label: 'a vanilla egg custard' },
  lemon: { kind: 'smear', family: 'lemon-flesh', label: 'a lemon curd' },
  lime: { kind: 'smear', family: 'lime-flesh', label: 'a lime curd' },
  tomato: { kind: 'gel', family: 'tomato-sauce', label: 'beads of tomato jam' },
  pepper: { kind: 'gel', family: 'pepper-flesh', label: 'beads of sweet pepper jam' },
  onion: { kind: 'smear', family: 'caramel', label: 'a sweet onion jam' },
  garlic: { kind: 'gel', family: 'honey', label: 'beads of garlic honey' },
  avocado: { kind: 'smear', family: 'avocado-flesh', label: 'an avocado mousse' },
  spinach: { kind: 'gel', family: 'lime-flesh', label: 'beads of green spinach syrup' },
  romaine: { kind: 'gel', family: 'lime-flesh', label: 'beads of green syrup' },
  cabbage: { kind: 'gel', family: 'lime-flesh', label: 'beads of green syrup' },
  broccoli: { kind: 'gel', family: 'lime-flesh', label: 'beads of green syrup' },
  mushroom: { kind: 'gel', family: 'caramel', label: 'beads of mushroom caramel' },
  potato: { kind: 'tuile', family: 'pastry', label: 'a candied potato crisp' },
  rice: { kind: 'tuile', family: 'pastry', label: 'a puffed rice crisp' },
  baguette: { kind: 'tuile', family: 'pastry', label: 'a toasted bread crisp' },
  steak: { kind: 'tuile', family: 'caramel', label: 'a steak caramel brittle' },
  chicken: { kind: 'tuile', family: 'caramel', label: 'a chicken skin brittle' },
  salmon: { kind: 'tuile', family: 'caramel', label: 'a salmon praline' },
  sauce: { kind: 'smear', family: 'caramel', label: 'a chili caramel' },
};

/** A number from a string (for seeds): the same text always gives the same number. */
export function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The seed for a cook: the table (in any order), the course, the taste, and which attempt this is. */
export function cookSeed(ids: string[], choices: CookChoices, attempt = 0): number {
  return hashText([...ids].sort().join('+') + `|${choices.course}|${choices.taste}|${attempt}`);
}

function between(random: () => number, [lo, hi]: [number, number]): number {
  return lo + Math.floor(random() * (hi - lo + 1));
}

/** Odd counts read as natural (3, 5, 7): an even roll is nudged up by one. */
function odd(n: number): number {
  return n % 2 === 0 ? n + 1 : n;
}

/** Calm, a step out, or unhinged: the three bands Wild works in. */
function band(wild: number): 0 | 1 | 2 {
  return wild < 30 ? 0 : wild < 70 ? 1 : 2;
}

/**
 * The dish archetypes this table can become for its course, the classic first (the fix list's
 * per-course table). Drink is always a glass. Rice is always a rice bowl and romaine a leaf bed,
 * except as a drink or a dessert.
 */
export function layoutCandidates(ids: string[], course: Course, taste: string): LayoutId[] {
  const has = (id: string) => ids.includes(id);
  const out: LayoutId[] = [];
  const add = (id: LayoutId) => !out.includes(id) && out.push(id);
  const protein = ids.some((id) => PROTEINS.includes(id));
  if (course === 'drink') return ['glass-drink'];
  if (course === 'dessert') {
    // Rice is a rice pudding. A table with nothing sweet becomes a vehicle dessert (a custard or
    // cream tart, pancakes) carrying the rest made sweet (Group 1: never leaves or a fried egg).
    if (has('rice')) return ['dessert-bowl'];
    const fruit = ids.some((id) => TART_FILLING.includes(id));
    if (!ids.some((id) => SWEET_OK_TASTE(id))) return ['tart', 'pancake-stack'];
    if (has('milk') && !fruit) add('pancake-stack');
    if (fruit) add('tart');
    add('plated-dessert');
    add('dessert-bowl');
    add('pancake-stack');
    return out;
  }
  if (has('rice')) return ['rice-bowl'];
  // A main is always plated, never a salad or a soup (Group 1): its leaves are wilted beside the food.
  if (has('romaine') && course !== 'main') return ['leaf-salad'];
  const threaded = ['chicken', 'steak', 'salmon'].find((p) => has(p) && SKEWERS[p].some((bead) => bead.ingredient !== p && has(bead.ingredient)));
  const skillet = (has('eggs') && ids.some((id) => ['tomato', 'pepper', 'mushroom', 'spinach'].includes(id))) || (has('broccoli') && has('cheese'));
  const soupy = ['potato', 'tomato', 'pepper'].some(has);
  if (course === 'starter') {
    if (has('salmon') || has('steak')) add('tartare-crudo');
    if (ids.some((id) => LEAFY.includes(id))) add('leaf-salad');
    if (soupy && !protein) add('soup-bowl');
    add('composed-plate');
    if (ids.some((id) => CRUDO.includes(id))) add('tartare-crudo');
    // A salad only when the table brings leaves (a "salad" of chicken and onion had none, item B).
    if (ids.some((id) => LEAFY.includes(id))) add('leaf-salad');
    return out;
  }
  if (course === 'snack') {
    if (threaded) add('skewer-platter');
    // A sweet snack of fruit or milk is pancakes first; anything else is toast.
    const sweetSnack = taste !== 'Savoury' && ids.some((id) => TART_FILLING.includes(id));
    if (sweetSnack && !ids.includes('baguette')) add('pancake-stack');
    add('toast-board');
    if (sweetSnack) add('pancake-stack');
    return out;
  }
  // Main.
  if (skillet) add('skillet-bake');
  if (has('baguette') && !protein) add('toast-board');
  add('circular-plate');
  // Mash only when the table brings the potato (never a library mash: the P0 list).
  if (has('potato')) add('mash-plate');
  if (threaded) add('skewer-platter');
  // A main is always a plated dish, never a soup (item H); soup is a starter.
  void soupy;
  return out;
}

/**
 * The archetype for this cook. Classic (Wild under 30) takes the first; a step out (30 to 69)
 * either of the first two; Unhinged (70 and up) one of the others, never the classic, so Wild 0
 * and Wild 100 always come out as different dishes when the table allows.
 */
export function pickArchetype(ids: string[], choices: CookChoices, random: () => number): LayoutSpec {
  const course = choices.course.toLowerCase() as Course;
  const candidates = layoutCandidates(ids, course, choices.taste);
  const b = band(choices.wild);
  const n = candidates.length;
  const index = b === 0 || n === 1 ? 0 : b === 1 ? Math.floor(random() * Math.min(2, n)) : 1 + Math.floor(random() * (n - 1));
  return layoutById(candidates[index])!;
}

/** The older name, kept for callers. */
export const pickLayout = pickArchetype;

/**
 * The sauce, chosen for the dish (the fix list: never the berry sauce on every fruit dish). The
 * table's own sauce first; then by archetype, taste and who the heroes are.
 */
function chooseSauce(layout: LayoutSpec, ids: string[], lead: string, taste: string, wild: number, sweetDish = false): string {
  const has = (id: string) => ids.includes(id);
  const sweet = sweetDish || ['tart', 'plated-dessert', 'dessert-bowl', 'pancake-stack'].includes(layout.id);
  if (has('sauce') && !sweet) return has('tomato') ? 'pool:tomato-sauce' : 'pool:chili';
  // Pancakes take a syrup, never a fruit sauce (item 5): maple, honey or caramel.
  if (layout.id === 'pancake-stack') return wild < 30 ? 'pool:maple' : wild < 70 ? (CITRUS.includes(lead) || lead === 'peach' ? 'pool:honey' : 'pool:maple') : 'pool:caramel';
  if (sweet) {
    if (BERRIES.includes(lead)) return 'pool:berry-sauce';
    if (['apple', 'pear', 'milk', 'butter', 'cheese', 'rice'].includes(lead)) return 'pool:caramel';
    if (CITRUS.includes(lead) || ['peach', 'watermelon'].includes(lead)) return 'pool:honey';
    return ids.some((id) => BERRIES.includes(id)) ? 'pool:berry-sauce' : 'pool:caramel';
  }
  if (layout.id === 'skillet-bake') return has('cheese') || has('broccoli') ? 'pool:cheese-sauce' : 'pool:tomato-sauce';
  if (ids.some((id) => ['lemon', 'lime'].includes(id))) return 'pool:citrus-oil';
  if (has('butter')) return 'pool:brown-butter';
  if (['steak', 'chicken', 'mushroom'].includes(lead)) return 'pool:jus';
  if (['salmon', 'eggs', 'potato'].includes(lead)) return has('milk') || wild < 50 ? 'pool:cream' : 'pool:herb-oil';
  if (has('milk')) return 'pool:cream';
  if (lead === 'tomato') return 'pool:tomato-sauce';
  if (lead === 'pepper' && taste !== 'Sweet' && wild >= 50) return 'pool:chili';
  if (layout.id === 'tartare-crudo' || layout.id === 'composed-plate') return 'pool:citrus-oil';
  if (taste === 'Sweet') return 'pool:honey';
  return 'pool:herb-oil';
}

/** The family of a sauce (for smears, oil dots and gels that match it). */
const SAUCE_FAMILY: Record<string, FamilyId> = {
  'pool:caramel': 'caramel', 'pool:maple': 'maple', 'pool:berry-sauce': 'berry-sauce', 'pool:honey': 'honey', 'pool:citrus-oil': 'citrus-oil', 'pool:chili': 'chili-oil',
  'pool:herb-oil': 'herb-oil', 'pool:jus': 'jus', 'pool:cream': 'cream-sauce', 'pool:tomato-sauce': 'tomato-sauce', 'pool:cheese-sauce': 'cheese-sauce',
  'pool:brown-butter': 'brown-butter',
};

/** The juice a drink is made of: the juiciest table ingredient, else a savoury glass. */
const DRINK_OF: Record<string, string> = {
  watermelon: 'drink:watermelon', strawberry: 'drink:strawberry', orange: 'drink:orange', apple: 'drink:apple', pear: 'drink:pear', peach: 'drink:peach',
  grapes: 'drink:grape', blueberries: 'drink:blueberry', lime: 'drink:lime', lemon: 'drink:lemon', tomato: 'drink:tomato', pepper: 'drink:pepper',
  spinach: 'drink:spinach', avocado: 'drink:avocado', cabbage: 'drink:green', romaine: 'drink:green', broccoli: 'drink:green', milk: 'drink:milk',
  cheese: 'drink:milk', butter: 'drink:milk', rice: 'drink:horchata', sauce: 'drink:bloody',
};
const JUICE_ORDER = ['watermelon', 'strawberry', 'orange', 'apple', 'pear', 'peach', 'grapes', 'blueberries', 'lime', 'lemon', 'tomato', 'pepper', 'spinach', 'avocado', 'cabbage', 'romaine', 'broccoli', 'sauce', 'rice', 'milk', 'cheese', 'butter'];
/** The cut that rests against the glass. */
const GLASS_CUT: Record<string, string> = {
  watermelon: 'cube', strawberry: 'half', orange: 'wheel', apple: 'slice', pear: 'slice', peach: 'slice', grapes: 'berry', blueberries: 'berry',
  lime: 'wheel', lemon: 'wheel', tomato: 'wheel', pepper: 'strip', avocado: 'slice', spinach: 'leaf', onion: 'wheel',
};

/** Unhinged's other cut by the glass. */
const GLASS_CUT_WILD: Record<string, string> = { orange: 'wedge', apple: 'wedge', pear: 'half', peach: 'wedge', lime: 'wedge', lemon: 'wedge', strawberry: 'slice', pepper: 'slice' };

/** The cut a fruit takes on a tart or pancakes. */
const TOPPING_CUT: Record<string, string> = {
  apple: 'slice', pear: 'slice', peach: 'slice', strawberry: 'half', blueberries: 'berry', grapes: 'berry', lemon: 'wheel', lime: 'wheel', orange: 'wheel',
  cheese: 'crumble', watermelon: 'cube', tomato: 'wheel', avocado: 'slice', pepper: 'strip', mushroom: 'slice', onion: 'wheel', spinach: 'leaf', cabbage: 'leaf',
  baguette: 'cube', potato: 'wheel', salmon: 'ribbon', eggs: 'egg', broccoli: 'half', garlic: 'chip', chicken: 'slice', steak: 'steak',
};
/** How many of a topping, by its cut. */
function toppingCount(form: string, random: () => number): number {
  // (True-size pieces: fewer of them, so they fit their platform without piling.)
  if (form === 'berry') return between(random, [7, 9]);
  if (form === 'ribbon') return between(random, [4, 5]);
  if (form === 'flake') return between(random, [7, 9]);
  if (form === 'slice' || form === 'strip') return odd(between(random, [5, 7]));
  if (form === 'crumble' || form === 'chip') return between(random, [5, 7]);
  if (form === 'whole' || form === 'egg') return 1;
  return odd(between(random, [5, 7]));
}

/** True when the slots serve this table ingredient: as a piece, the vehicle (toast, mash) or in the base. */
export function servedBy(slots: Pick<Slots, 'hero' | 'support' | 'accent' | 'inBase' | 'layout'>, id: string): boolean {
  if (slots.hero.id === id || slots.support.some((p) => p.id === id) || slots.accent.some((p) => p.id === id) || slots.inBase.includes(id)) return true;
  return id === 'baguette' && slots.layout.id === 'toast-board';
}

/**
 * Counts that fit at true size (R4: pieces are never shrunk to fit): a cut of a big fruit (an orange
 * wheel is 7 cm) comes in threes at most, a middling one in fours; a rice bowl holds five of anything.
 */
function capForTrueSize(slots: Slots): void {
  const many = ['wheel', 'half', 'wedge', 'slice', 'cube', 'berry', 'strip'];
  for (const p of [slots.hero, ...slots.support, ...slots.accent]) {
    if (!many.includes(p.form) || p.id === 'baguette') continue;
    const r = BODY[p.id]?.r ?? 2;
    const cap = r >= 3.2 ? 3 : r >= 2.4 ? 4 : 99;
    p.count = Math.min(p.count, cap, slots.layout.id === 'rice-bowl' ? 5 : 99);
  }
  // An area budget (cm², seen from above): what the vessel holds at true size without piling. The
  // biggest group gives up a piece at a time, never below one, so every ingredient still shows.
  const budget: Partial<Record<LayoutId, number>> = { 'rice-bowl': 50, 'soup-bowl': 110, 'skillet-bake': 170, 'dessert-bowl': 150 };
  const limit = budget[slots.layout.id] ?? (['toast-board', 'tart', 'pancake-stack', 'glass-drink', 'mash-plate'].includes(slots.layout.id) ? Infinity : 300);
  const area = (p: Piece) => {
    if (isComponent(p.id)) return 0;
    const info = elementInfo(p.id, p.form);
    return (info.shape === 'rect' ? info.w! * info.h! : info.shape === 'half' ? (Math.PI * info.r! ** 2) / 2 : Math.PI * info.r! ** 2) * p.count;
  };
  const groups = [slots.hero, ...slots.support, ...slots.accent];
  for (let guard = 0; guard < 40 && groups.reduce((sum, p) => sum + area(p), 0) > limit; guard++) {
    const biggest = groups.filter((p) => p.count > 1).sort((a, b) => area(b) - area(a))[0];
    if (!biggest) break;
    biggest.count--;
  }
}

/** Forms only an archetype may use: skewers, pancakes and mash. */
const ARCHETYPE_FORMS = ['skewer', 'pancake', 'mash'];

/** A table ingredient's cut for a role, from its traits (skewers only as a skewer hero). */
function formFor(id: string, slot: 'hero' | 'support' | 'accent', wild: number, random: () => number, dessert = false): string | undefined {
  // A tall cheesecake only for dessert (the fix list: a savoury cheese is a wedge or a melt).
  // Platform forms belong to their own archetype (pancakes to the stack, mash to the mash plate):
  // never picked as a plain cut, so a savoury starter never becomes pancakes (the P0 list).
  const forms = (TRAITS[id]?.forms[slot] ?? []).filter((f) => !ARCHETYPE_FORMS.includes(f) && (dessert || !['cake', 'pastry'].includes(f)));
  if (!forms.length) return undefined;
  // Classic takes the first (the signature cut); higher Wild may take another.
  return wild >= 30 && forms.length > 1 && random() < (wild >= 70 ? 0.7 : 0.4) ? forms[1 + Math.floor(random() * (forms.length - 1))] : forms[0];
}

/** Who plays which part. Every table ingredient appears, in a slot and form its traits allow. */
export function assignSlots(ids: string[], choices: CookChoices, layout: LayoutSpec, random: () => number): Slots {
  const course = choices.course.toLowerCase() as Course;
  const wild = choices.wild;
  const left = new Set(ids);
  const inBase: string[] = [];
  const take = (id: string) => left.delete(id);
  const sweetFirst = course === 'dessert' || choices.taste === 'Sweet';
  // A sweet dish is led by something sweet whenever the table has it (Group 1: never an egg first).
  const rank = (id: string) => heroPriority(id) - (sweetFirst && TRAITS[id]?.taste !== 'savoury' ? (course === 'dessert' ? 10 : 2.5) : 0);
  const byRank = (list: string[]) => [...list].sort((a, b) => rank(a) - rank(b));

  let base = 'none';
  let hero = undefined as Piece | undefined;
  let star = byRank(ids)[0];
  const heroFrom = (id: string, form: string, count: number) => {
    hero = { id, form, count };
    take(id);
  };
  const support: Piece[] = [];
  const accent: Piece[] = [];

  // ---- The base: what the food sits in ----
  if (layout.id === 'rice-bowl') (base = 'rice'), take('rice'), inBase.push('rice');
  if (layout.id === 'leaf-salad') {
    const leafy = ['romaine', 'spinach', 'cabbage'].find((id) => left.has(id));
    if (leafy) (base = `leaves:${leafy}`), take(leafy), inBase.push(leafy);
  }
  if (layout.id === 'soup-bowl') {
    const soup = ['potato', 'tomato', 'pepper'].find((id) => left.has(id));
    // No soup ingredient on the table: a cream soup, still in the deep soup bowl.
    base = soup ? `soup:${soup}` : 'soup:cream';
    // The soup's own ingredient is the soup (not fries floating in it), when something else can go in.
    if (soup && [...left].some((id) => id !== soup && id !== 'milk')) take(soup), inBase.push(soup);
    if (left.has('milk')) take('milk'), inBase.push('milk');
  }
  if (layout.id === 'dessert-bowl' && left.has('rice')) (base = 'mash:risotto'), take('rice'), inBase.push('rice');

  if (layout.id === 'glass-drink') {
    // Any juicable hero makes the drink; milk makes it a shake; a table with nothing to juice
    // becomes a savoury glass, a golden consommé (named so in the title).
    const fruit = JUICE_ORDER.find((id) => left.has(id) && id !== 'milk' && id !== 'cheese' && id !== 'butter');
    const pour = fruit ?? JUICE_ORDER.find((id) => left.has(id));
    base = pour ? DRINK_OF[pour] : 'drink:consomme';
    star = pour ?? byRank(ids)[0];
    if (pour) take(pour), inBase.push(pour);
    for (const dairy of ['milk', 'cheese', 'butter']) if (left.has(dairy)) take(dairy), inBase.push(dairy);
    // The cut against the glass: the drink's own fruit where it has one; else a lemon wheel.
    // Unhinged stacks a little heap of it against the glass, in another cut where there is one.
    const cut = pour && GLASS_CUT[pour];
    const wildCut = pour && GLASS_CUT_WILD[pour] && Object.values(TRAITS[pour].forms).flat().includes(GLASS_CUT_WILD[pour]) ? GLASS_CUT_WILD[pour] : undefined;
    const heap = band(wild) === 2;
    // Only what is on the table (Group 2: a lemon wheel appeared with no lemon). The rim garnish is
    // the drink's own fruit, else another table ingredient with a cut; with nothing to cut, a cap of
    // whipped cream (a staple), never an invented fruit.
    // (By a glass, broccoli is a small halved floret, never a whole head.)
    // Leaves beside a glass read as litter: cabbage and romaine are blended into the drink.
    const GLASS_PIECE: Record<string, string> = { broccoli: 'half', cabbage: 'blend', romaine: 'blend' };
    const garnishFrom = [...left].find((id) => GLASS_CUT[id]);
    if (cut) hero = { id: pour!, form: heap && wildCut ? wildCut : cut, count: heap ? 3 : 1 };
    else if (garnishFrom) (hero = { id: garnishFrom, form: GLASS_CUT[garnishFrom], count: 1 }), take(garnishFrom);
    else {
      // Nothing to cut: the table's other ingredient is the garnish beside the glass (a savoury
      // glass never gets a cap of cream); only a glass of nothing but its drink gets the cream.
      const other = [...left].find((id) => !['milk', 'butter', 'cheese', 'sauce', 'rice'].includes(id) && GLASS_PIECE[id] !== 'blend' && (GLASS_PIECE[id] ?? formFor(id, 'support', 0, random) ?? formFor(id, 'accent', 0, random)));
      if (other) (hero = { id: other, form: GLASS_PIECE[other] ?? formFor(other, 'support', 0, random) ?? formFor(other, 'accent', 0, random)!, count: 1 }), take(other);
      else hero = heap ? { id: 'quenelle', form: 'ice-cream', count: 1 } : { id: 'whip', form: 'cream', count: 1 };
    }
    // Unhinged piles it on: three of the garnish (by the glass) instead of one.
    if (heap && !isComponent(hero.id)) hero.count = 3;
    // Every other table ingredient shows: a cut by the glass, or a small piece beside it (a crisp of
    // bread, a slice of steak), never hidden in the glass where nobody sees it.
    for (const id of [...left]) {
      const c = GLASS_CUT[id];
      const piece = c ?? GLASS_PIECE[id] ?? formFor(id, 'support', 0, random) ?? formFor(id, 'accent', 0, random) ?? formFor(id, 'hero', 0, random);
      if (piece && !['mash', 'pancake', 'cake', 'pastry', 'blend'].includes(piece)) support.push({ id, form: piece, count: c === 'berry' || heap ? 3 : 1 });
      else inBase.push(id);
      take(id);
    }
    return { layout, hero, support, accent, base, inBase, ware: 'glass', course: 'drink', star, sauce: 'none' };
  }

  // The table's sauce never becomes a piece: it is the pool (or the drizzle on a dry layout).
  if (left.has('sauce') && !isSweetDish(layout.id, course, choices.taste, ids)) {
    if (base === 'none') base = left.has('tomato') ? 'pool:tomato-sauce' : 'pool:chili';
    take('sauce');
    inBase.push('sauce');
  } else if (left.has('sauce')) {
    // In a sweet dish the hot sauce is a chili caramel (made sweet below), never a pool.
    take('sauce');
    inBase.push('sauce');
  }

  // ---- The hero ----
  const b = band(wild);
  switch (layout.id) {
    case 'tart':
    case 'pancake-stack': {
      // The vehicle is the platform; the table's best filling is the star on it.
      const filling = byRank([...left].filter((id) => TART_FILLING.includes(id) && id !== 'butter' && id !== 'milk'));
      // Eggs in a tart are its custard (Group 1: an egg in a dessert is never a fried egg); in pancakes,
      // they are in the batter.
      const custard = left.has('eggs');
      // A citrus tart is a curd tart: the lemon or lime is its filling, not wheels on top.
      const curd = filling.length === 0 ? (['lemon', 'lime'] as const).find((id) => left.has(id)) : undefined;
      const vehicle = layout.id === 'tart' ? componentPiece('tart', curd ? (curd === 'lemon' ? 'lemon-flesh' : 'lime-flesh') : custard ? 'custard' : left.has('milk') || left.has('cheese') || filling.length === 0 ? 'cream' : 'pastry', 1, 'under').part! : 'milk:pancake';
      if (curd && layout.id === 'tart') take(curd), inBase.push(curd), (star = curd);
      if (custard) take('eggs'), inBase.push('eggs');
      // Pancakes come as a stack of three or four (item 5).
      hero = { id: vehicle.split(':')[0], form: vehicle.split(':')[1], count: layout.id === 'pancake-stack' ? between(random, [3, 4]) : 1 };
      if (layout.id === 'pancake-stack' && left.has('milk')) take('milk');
      if (left.has('butter')) take('butter'), inBase.push('butter');
      if (left.has('milk')) take('milk'), inBase.push('milk');
      const top = filling[0] ?? byRank([...left])[0];
      if (top) {
        const form = TOPPING_CUT[top] ?? formFor(top, 'support', wild, random) ?? 'slice';
        support.push({ id: top, form, count: toppingCount(form, random) });
        take(top);
        star = top;
      } else star = ids.includes('milk') ? 'milk' : ids.includes('butter') ? 'butter' : star;
      break;
    }
    case 'skewer-platter': {
      const p = ['chicken', 'steak', 'salmon'].find((id) => left.has(id) && SKEWERS[id].some((bd) => bd.ingredient !== id && left.has(bd.ingredient)));
      if (p) {
        // Two skewers: a third crowded the plate and rolled off it.
        heroFrom(p, 'skewer', 2);
        // Its partners are already threaded on the stick: they are in the dish, not a second heap.
        for (const bead of SKEWERS[p]) if (left.has(bead.ingredient)) take(bead.ingredient), inBase.push(bead.ingredient);
        star = p;
      }
      break;
    }
    case 'toast-board': {
      // Toast is the vehicle: the table's bread, or the library's.
      if (left.has('baguette')) take('baguette');
      // Two slices (item 6); one crostini under a whole seared salmon fillet (item D).
      hero = { id: 'baguette', form: 'toast', count: 2 };
      break;
    }
    case 'mash-plate': {
      // Only cooked when the table has a potato (layoutCandidates).
      if (left.has('potato')) heroFrom('potato', 'mash', 1);
      break;
    }
    case 'skillet-bake': {
      // Two fried eggs fit a pan with their vegetables round them; three crowded it.
      if (left.has('eggs')) heroFrom('eggs', b === 2 && random() < 0.5 ? 'omelette' : 'egg', 2);
      else if (left.has('broccoli')) heroFrom('broccoli', 'whole', 3);
      break;
    }
    case 'soup-bowl': {
      const p = byRank([...left].filter((id) => id !== 'baguette' && (id === 'eggs' || TRAITS[id]?.forms.stew?.length || TRAITS[id]?.forms.support?.includes('cube'))));
      if (p[0] === 'eggs') heroFrom('eggs', 'egg', 2);
      else if (p[0]) heroFrom(p[0], TRAITS[p[0]].forms.stew?.[0] ?? 'cube', between(random, [5, 7]));
      break;
    }
    case 'rice-bowl': {
      // Proper pieces laid in the rice: sliced or torn chicken, salmon slices, an egg (the fix list).
      const p = byRank([...left].filter((id) => TRAITS[id]?.forms.hero?.length || TRAITS[id]?.forms.support?.length));
      const lead = p[0];
      if (lead === 'eggs') heroFrom('eggs', 'egg', 1);
      else if (lead === 'chicken') heroFrom('chicken', b === 0 ? 'slice' : random() < 0.5 ? 'torn' : 'slice', 1);
      else if (lead === 'chicken' || lead === 'steak') heroFrom(lead, 'steak', 1);
      else if (lead === 'salmon') heroFrom('salmon', b === 2 ? 'cube' : 'slice', b === 2 ? 7 : 5);
      else if (lead) {
        const form = formFor(lead, 'support', wild, random) ?? formFor(lead, 'hero', wild, random)!;
        heroFrom(lead, form, form === 'whole' ? 1 : odd(between(random, [5, 7])));
        if (lead === 'avocado') hero!.count = 5;
      }
      if (hero && hero.id === 'chicken' && hero.form === 'torn') hero.count = odd(between(random, [7, 9]));
      break;
    }
    case 'tartare-crudo': {
      // Cut small or thin and packed as one mound (raw: a crudo is never seared).
      // (Only an ingredient that can be cut into pieces leads; milk alone goes into the sauce.)
      const cuttable = (id: string) => !!(formFor(id, 'support', 0, random) ?? formFor(id, 'hero', 0, random) ?? TRAITS[id]?.forms.accent?.[0]);
      const lead = byRank([...left].filter((id) => CRUDO.includes(id)))[0] ?? byRank([...left].filter(cuttable))[0];
      if (lead) {
        const cut = lead === 'salmon' ? (b === 0 ? 'slice' : 'cube') : lead === 'avocado' ? 'slice' : lead === 'tomato' ? 'wedge' : 'cube';
        const allowed = Object.values(TRAITS[lead]?.forms ?? {}).flat();
        heroFrom(lead, allowed.includes(cut) ? cut : formFor(lead, 'support', wild, random) ?? formFor(lead, 'hero', wild, random) ?? TRAITS[lead]?.forms.accent?.[0] ?? 'cube', cut === 'slice' ? 5 : odd(between(random, [7, 9])));
      }
      break;
    }
    case 'composed-plate': {
      // The hero cut properly: citrus in thin wheels (a carpaccio), the rest in its signature cut.
      const lead = byRank([...left])[0];
      if (lead && ['lemon', 'lime', 'orange'].includes(lead)) heroFrom(lead, 'wheel', 3);
      break;
    }
    default:
      break;
  }

  if (!hero) {
    // The highest-ranking ingredient that can lead, in its signature cut.
    // In a salad or a soup the bread is croutons, never the hero (a toast slab on the leaves).
    const crouton = ['leaf-salad', 'soup-bowl'].includes(layout.id);
    const lead = byRank([...left].filter((id) => !(crouton && id === 'baguette') && formFor(id, 'hero', 0, random, course === 'dessert')))[0];
    if (lead) {
      const form = formFor(lead, 'hero', wild, random, course === 'dessert')!;
      // Big single pieces lead alone (a cheese wedge, a cabbage wedge, a sliced chicken breast);
      // small cuts lead as a group; a pepper is a pair of charred halves or a bunch of strips.
      let count = 1;
      if (form === 'drumstick') count = 2;
      else if (form === 'egg') count = between(random, [1, 2]);
      else if (form === 'whole' && lead === 'broccoli') count = 2;
      else if (lead === 'pepper') count = form === 'half' ? 2 : 5;
      else if (form === 'torn') count = odd(between(random, [7, 9]));
      else if (['half', 'wedge', 'cube', 'whole'].includes(form) && !['cabbage', 'avocado', 'cheese'].includes(lead)) count = odd(between(random, [3, 5]));
      else if (form === 'slice' && !['chicken'].includes(lead)) count = odd(between(random, [5, 7]));
      heroFrom(lead, form, count);
    }
  }
  if (!hero) {
    // Nothing can lead (lime, garlic, sauce on their own): the most substantial accent becomes a
    // generous group, still honestly plated. With everything already in the base (romaine alone),
    // crispy garlic over the leaves leads.
    const any = byRank([...left]).find((id) => TRAITS[id]?.forms.accent?.length || TRAITS[id]?.forms.support?.length);
    if (any) {
      const form = (TRAITS[any].forms.accent ?? TRAITS[any].forms.support!)[0];
      heroFrom(any, form, any === 'garlic' ? 9 : 5);
    } else if (course === 'dessert') hero = { id: 'whip', form: 'cream', count: 3 };
    else hero = { id: 'whip', form: 'cream', count: 1 };
  }
  // (Never invented garlic: the last resort is a staple, a little whipped cream.)
  hero ??= { id: 'whip', form: 'cream', count: 1 };
  if (ids.includes(hero.id) && !['tart', 'pancake-stack', 'toast-board'].includes(layout.id)) star = hero.id;

  // ---- The support bunch, then accents: generous counts (volume, never one lonely piece) ----
  const platform = layout.packing === 'platform';
  const supportCount = (form: string) => (['steak', 'fillet', 'drumstick'].includes(form) ? 1 : form === 'fries' ? between(random, [12, 16]) : form === 'whole' ? 2 : form === 'egg' ? 2 : form === 'half' && platform ? 3 : between(random, layout.support));
  for (const id of byRank([...left])) {
    const traits = TRAITS[id];
    if (!traits) continue;
    // Garlic is always a handful of chips; lemon and lime are accents.
    const asAccent = id === 'garlic' || (!traits.forms.support?.length && traits.forms.accent?.length) || (support.length >= 1 && traits.forms.accent?.length);
    if (!asAccent && traits.forms.support?.length) {
      let form = formFor(id, 'support', wild, random)!;
      if (platform && form === 'fries') form = 'wedge';
      if (platform && TOPPING_CUT[id]) form = TOPPING_CUT[id];
      // Bread beside a plated dish is croutons (a whole slice found no room on the plate, R4).
      if (!platform && id === 'baguette' && form === 'toast') form = 'cube';
      // Salmon on toast lies flat and cut to size (R4): smoked-style ribbons, or seared flakes on a
      // step out; never a whole fillet block.
      if (layout.id === 'toast-board' && id === 'salmon') form = band(wild) >= 1 && random() < 0.5 ? 'flake' : 'ribbon';
      // A carved breast or a steak is one piece (sliced), never four of them.
      const single = ['steak', 'fillet', 'drumstick'].includes(form) || (id === 'chicken' && form === 'slice' && !platform);
      // Avocado slices fan in a short curve of five to seven (twelve read as a pile of cucumber).
      const fan = id === 'avocado' && form === 'slice' ? odd(between(random, [5, 6])) : form === 'leaf' ? between(random, [4, 5]) : undefined;
      support.push({ id, form, count: single ? 1 : fan ?? Math.max(1, supportCount(form)) });
    } else if (traits.forms.accent?.length) {
      const form = formFor(id, 'accent', wild, random)!;
      // Never one lonely piece: strips and wheels come at least in threes.
      // Citrus as an accent is a couple of small wedges at true size (one in a bowl of rice): whole
      // wheels at full size crowded the plate and fell off it (R4).
      const citrus = ['lemon', 'lime', 'orange'].includes(id);
      if (citrus) accent.push({ id, form: 'wedge', count: layout.id === 'rice-bowl' ? 1 : 2 });
      else accent.push({ id, form, count: id === 'garlic' ? 5 : Math.max(['strip', 'wheel', 'slice'].includes(form) ? 3 : 1, odd(between(random, layout.accent))) });
    } else if (traits.forms.support?.length) {
      const form = formFor(id, 'support', wild, random)!;
      support.push({ id, form, count: supportCount(form) });
    } else if (traits.forms.base?.length || traits.forms.sauce?.length) {
      // Base-only ingredients that did not get the base (milk on a plate): they are in the sauce.
      inBase.push(id);
    }
    take(id);
  }
  // A second protein never sits beside the first as a second giant: it is cut small.
  for (const s of support) if (PROTEINS.includes(s.id) && PROTEINS.includes(hero.id) && s.id !== 'eggs') s.form = s.id === 'chicken' ? 'torn' : TRAITS[s.id].forms.support?.includes('cube') ? 'cube' : s.form;

  // ---- The sauce ----
  const wantsPool = layout.wantsUnderPool || layout.id === 'circular-plate';
  if (wantsPool && (base === 'none' || base === 'pool:chili') && !inBase.includes('sauce')) base = chooseSauce(layout, ids, star, choices.taste, wild, isSweetDish(layout.id, course, choices.taste, ids));
  if (base === 'none' && wantsPool) base = chooseSauce(layout, ids, star, choices.taste, wild, isSweetDish(layout.id, course, choices.taste, ids));
  // Milk or butter that went into the sauce is the sauce (it must be on the plate, as the caption says).
  // A toast board has no pool (a cream pool spread over the board, item 6): milk and butter are in the toast.
  const sauceable = (base === 'none' || base.startsWith('pool:')) && layout.id !== 'toast-board';
  if (inBase.includes('milk') && sauceable && !inBase.includes('sauce') && !['tart', 'pancake-stack'].includes(layout.id)) base = 'pool:cream';
  else if (inBase.includes('butter') && sauceable && !inBase.includes('sauce') && !['tart', 'pancake-stack'].includes(layout.id)) base = 'pool:brown-butter';

  // (No garlic chips unless the table brought garlic: never invent an ingredient, Group 2.)

  // The ware: Unhinged always takes the layout's alternative; a step out sometimes does.
  const ware = layout.wildWare && (b === 2 || (b === 1 && random() < 0.3)) ? layout.wildWare : layout.ware;
  // A sweet dish carries only sweet-compatible pieces (Group 1). Classic and a step out: every
  // savoury piece is made sweet (an egg a custard, a lime a curd, a tomato a jam). Unhinged keeps one
  // savoury piece, a single one, on purpose (one fried egg by a tart), never a pile of leftovers.
  const sweet = isSweetDish(layout.id, course, choices.taste, ids);
  const made: DishComponent[] = [];
  let twist: Piece | undefined;
  if (sweet) {
    const savoury = [...support, ...accent].filter((p) => !sweetPiece(p.id, p.form));
    // The twist is something with a presence (an egg, a slice of meat, a pepper strip), never a lone leaf.
    const candidates = savoury.filter((p) => p.form !== 'leaf' && p.id !== 'lemon' && p.id !== 'lime');
    if (b === 2 && candidates.length) {
      twist = candidates.find((p) => p.id === 'eggs') ?? candidates[0];
      twist.count = 1;
      if (twist.id === 'eggs') twist.form = 'egg';
      if (twist.id === 'chicken') twist.form = 'slice';
      savoury.splice(savoury.indexOf(twist), 1);
    }
    const sweeten = (id: string) => {
      const m = SWEETENED[id];
      if (!m || made.some((c) => c.from === id)) return;
      const c = m.kind === 'gel' ? componentGarnish('gel', m.family, 7) : componentPiece(m.kind, m.family, 1, 'beside');
      made.push({ ...c, label: m.label, from: id });
    };
    for (const p of savoury) {
      for (const list of [support, accent]) if (list.includes(p)) list.splice(list.indexOf(p), 1);
      inBase.push(p.id);
      sweeten(p.id);
    }
    // A savoury lead in a sweet dish is a scoop of custard ice cream (an egg) or the ingredient made
    // sweet beside a scoop of vanilla.
    if (!sweetPiece(hero.id, hero.form)) {
      inBase.push(hero.id);
      if (hero.id !== 'eggs') sweeten(hero.id);
      hero = { id: 'quenelle', form: hero.id === 'eggs' ? 'custard' : 'ice-cream', count: 1 };
    }
    // Savoury table ingredients already in the base (a lime in the sauce) are made sweet too.
    const curdTart = hero.id === 'tart' && ['lemon-flesh', 'lime-flesh'].includes(hero.form);
    for (const id of inBase) if (ids.includes(id) && !SWEET_OK_TASTE(id) && !['eggs', 'rice', 'baguette', 'milk', 'butter'].includes(id) && !(curdTart && ['lemon', 'lime'].includes(id))) sweeten(id);
    if (ids.includes('eggs') && !made.some((c) => c.from === 'eggs') && !['tart', 'pancake-stack'].includes(layout.id) && hero.form !== 'custard' && twist?.id !== 'eggs') sweeten('eggs');
  }

  // Never drop an ingredient (the P0 list): one that found no part above joins as an accent in any
  // cut it has, or goes into the sauce.
  for (const id of ids) {
    if (servedBy({ hero, support, accent, inBase, layout } as Slots, id)) continue;
    const forms = TRAITS[id]?.forms;
    const form = forms && [...(forms.accent ?? []), ...(forms.support ?? []), ...(forms.hero ?? [])].find((f) => !ARCHETYPE_FORMS.includes(f) && f !== 'cake' && f !== 'pastry');
    if (form) accent.push({ id, form, count: Math.max(3, odd(between(random, layout.accent))) });
    else inBase.push(id);
  }
  const dishCourse: Course = course === 'drink' ? 'snack' : course;
  const sauce = base.startsWith('pool:') ? base : chooseSauce(layout, ids, star, choices.taste, wild, isSweetDish(layout.id, course, choices.taste, ids));
  return { layout, hero, support, accent, base, inBase, ware, course: dishCourse, star, sauce, sweet, made, twist };
}

/**
 * The library pieces that complete the dish (the fix list's per-course table). Classic keeps a
 * calm set; a step out adds one; Unhinged reaches for the unusual ones (gel, a tuile), still
 * cohesive. Pieces go into the idea's parts, garnish into its components.
 */
export function chooseComponents(slots: Slots, wild: number, random: () => number = Math.random): DishComponent[] {
  const b = band(wild);
  const sauce = SAUCE_FAMILY[slots.sauce];
  const out: DishComponent[] = [];
  const oil: FamilyId = slots.sauce === 'pool:chili' ? 'chili-oil' : slots.sauce === 'pool:citrus-oil' ? 'citrus-oil' : 'herb-oil';
  const gelFamily: FamilyId = BERRIES.includes(slots.star) ? 'berry-sauce' : slots.star === 'lime' ? 'lime-flesh' : slots.star === 'lemon' ? 'lemon-flesh' : slots.star === 'orange' ? 'orange-flesh' : sauce === 'caramel' ? 'honey' : 'berry-sauce';
  const savouryGel: FamilyId = slots.base === 'pool:tomato-sauce' ? 'herb-oil' : 'tomato-sauce';
  const hasTable = (id: string) => slots.inBase.includes(id) || slots.hero.id === id || slots.support.some((p) => p.id === id);
  switch (slots.layout.id) {
    case 'tart':
      // Shell (the hero), cream on it, ice cream beside; then a smear of the chosen sauce, a crumb.
      out.push(componentPiece('whip', 'cream', b === 2 ? 3 : 1, 'on-hero-allowed'));
      out.push(componentPiece('quenelle', 'ice-cream', 1, 'beside'));
      if (b >= 1) out.push(componentPiece('smear', sauce ?? 'caramel', 1, 'beside'));
      if (b === 2) out.push(componentPiece('tuile', 'pastry', 1, 'beside'), componentGarnish('gel', gelFamily, 7));
      break;
    case 'pancake-stack':
      out.push(componentPiece('whip', 'cream', 1, 'on-hero-allowed'));
      if (b >= 1) out.push(componentGarnish('gel', gelFamily, 5));
      if (b === 2) out.push(componentPiece('quenelle', 'ice-cream', 1, 'beside'));
      break;
    case 'plated-dessert':
      out.push(componentPiece('quenelle', 'ice-cream', 1, 'beside'));
      out.push(componentPiece('smear', sauce ?? 'caramel', 1, 'beside'));
      if (b >= 1) out.push(componentPiece('tuile', 'pastry', 1, 'beside'));
      if (b === 2) out.push(componentGarnish('gel', gelFamily, 7), componentGarnish('microherb', 'leaf', 5));
      break;
    case 'dessert-bowl':
      out.push(componentPiece('quenelle', 'ice-cream', 1, 'beside'));
      if (b >= 1) out.push(componentPiece('whip', 'cream', 1, 'beside'));
      if (b === 2) out.push(componentPiece('tuile', 'pastry', 1, 'beside'), componentGarnish('gel', gelFamily, 5));
      break;
    case 'tartare-crudo':
      out.push(componentGarnish('oil-dot', oil, 9), componentGarnish('microherb', 'leaf', 9));
      if (b >= 1) out.push(componentPiece('tuile', 'pastry', 1, 'beside'));
      if (b === 2) out.push(componentGarnish('gel', savouryGel, 5));
      break;
    case 'composed-plate':
      out.push(componentPiece('smear', slots.star === 'lemon' || slots.star === 'lime' ? 'cream-sauce' : sauce ?? 'cream-sauce', 1, 'beside'));
      out.push(componentGarnish('oil-dot', oil, 7), componentGarnish('microherb', 'leaf', 7));
      if (b >= 1) out.push(componentPiece('tuile', 'pastry', 1, 'beside'));
      if (b === 2) out.push(componentGarnish('gel', savouryGel, 5));
      break;
    case 'leaf-salad':
      // Croutons only from the table's own bread (item A: never invented); the baguette is then a
      // support piece, cut in cubes.
      out.push(componentGarnish('microherb', 'leaf', 7));
      if (b >= 1) out.push(componentGarnish('oil-dot', oil, 7));
      if (b === 2) out.push(componentPiece('tuile', 'pastry', 1, 'beside'));
      break;
    case 'soup-bowl':
      // Bread only when the table brings it (item A): then it is croutons in the soup.
      out.push(componentGarnish('oil-dot', oil, 9));
      if (b >= 1) out.push(componentGarnish('microherb', 'leaf', 7));
      if (b === 2) out.push(componentGarnish('gel', savouryGel, 5));
      break;
    case 'rice-bowl':
      // In the rice, never beside it: herbs and oil, gel beads for Unhinged (a puree or a tuile slid
      // off the rice and was lost).
      out.push(componentGarnish('microherb', 'leaf', 7));
      if (b >= 1) out.push(componentGarnish('oil-dot', oil, 7));
      if (b === 2) out.push(componentGarnish('gel', savouryGel, 5));
      break;
    case 'glass-drink':
      // The drink's froth or meniscus is its finish (the glass itself is the vehicle).
      out.push({ kind: 'foam', family: 'foam', role: 'drink', count: 1, place: 'on-base' });
      break;
    case 'toast-board':
      out.push(componentGarnish('microherb', 'leaf', 9));
      if (b >= 1) out.push(componentGarnish('oil-dot', oil, 7));
      if (b === 2) out.push(componentGarnish('gel', savouryGel, 5));
      break;
    case 'skewer-platter':
      out.push(componentPiece('smear', sauce ?? 'herb-oil', 1, 'beside'), componentGarnish('microherb', 'leaf', 7));
      if (b === 2) out.push(componentGarnish('gel', savouryGel, 5));
      break;
    default:
      // Mains: a real accompaniment beside the hero (a puree when the table brings none), oil dots
      // and microherbs; Unhinged adds a crisp tuile and gel beads.
      // Never a mash puree unless the table brought the potato (the P0 list: no invented mash).
      if (slots.support.length === 0 && !['mash-plate', 'rice-bowl'].includes(slots.layout.id)) out.push(componentPiece('puree', hasTable('potato') ? 'mash' : 'cream-sauce', 1, 'beside'));
      out.push(componentGarnish('oil-dot', oil, 7));
      // A step out varies the finish from dish to dish (the fix list: not the same herb-and-shaving
      // stamp on every main): microherbs, a smear of the sauce, or a crisp tuile.
      if (b === 1) {
        const pickOne = Math.floor(random() * 3);
        if (pickOne === 0) out.push(componentGarnish('microherb', 'leaf', 7));
        // (A smear only where there is no pool already: the two together crowded the plate.)
        else if (pickOne === 1 && sauce && !slots.base.startsWith('pool:')) out.push(componentPiece('smear', sauce, 1, 'beside'));
        else out.push(componentPiece('tuile', 'pastry', 1, 'beside'));
      }
      if (b === 2) out.push(componentGarnish('microherb', 'leaf', 7));
      if (b === 2) out.push(componentPiece('tuile', 'pastry', 1, 'beside'), componentGarnish('gel', savouryGel, 5));
  }
  if (slots.sweet) {
    // A sweet dish keeps only sweet finishes (Group 1): no herbs, croutons, savoury oils or gels.
    const savouryFamilies: FamilyId[] = ['herb-oil', 'chili-oil', 'citrus-oil', 'tomato-sauce', 'jus', 'leaf', 'cream-sauce'];
    for (let i = out.length - 1; i >= 0; i--) {
      const c = out[i];
      if (c.kind === 'microherb' || c.kind === 'crouton' || savouryFamilies.includes(c.family)) out.splice(i, 1);
    }
    // Sweet toast: whipped cream and honey over the fruit.
    if (slots.layout.id === 'toast-board') out.push(componentPiece('whip', 'cream', 1, 'on-hero-allowed'), componentGarnish('gel', 'honey', 7));
  }
  // Savoury table ingredients made sweet (a curd, a jam, a brittle) come last, as they are.
  out.push(...(slots.made ?? []));
  return out;
}

const NOUN: Record<string, string> = {
  steak: 'steak', salmon: 'salmon', chicken: 'chicken', eggs: 'egg', potato: 'potato', rice: 'rice', baguette: 'bread', broccoli: 'broccoli',
  apple: 'apple', pear: 'pear', peach: 'peach', orange: 'orange', lemon: 'lemon', lime: 'lime', strawberry: 'strawberry', watermelon: 'watermelon',
  tomato: 'tomato', onion: 'red onion', pepper: 'pepper', avocado: 'avocado', grapes: 'grape', blueberries: 'blueberry', mushroom: 'mushroom',
  cabbage: 'cabbage', spinach: 'spinach', romaine: 'romaine', cheese: 'cheese', butter: 'butter', milk: 'milk', sauce: 'chili', garlic: 'garlic', cream: 'cream',
};
const PLURAL: Record<string, string> = {
  strawberry: 'strawberries', blueberries: 'blueberries', grapes: 'grapes', peach: 'peaches', tomato: 'tomatoes', potato: 'potatoes', mushroom: 'mushrooms',
  apple: 'apples', pear: 'pears', lemon: 'lemons', lime: 'limes', orange: 'oranges', pepper: 'peppers', eggs: 'eggs', avocado: 'avocado',
};

/** How a piece is named in a title ("fries", "crispy garlic", "peach wedges"). */
function pieceWords(p: Piece): string {
  const n = NOUN[p.id] ?? p.id;
  switch (p.form) {
    case 'fries': return 'fries';
    case 'chip': return 'crispy garlic';
    case 'mash': return p.id === 'milk' ? 'milk pudding' : 'mash';
    case 'toast': return 'toast';
    case 'egg': return p.count > 1 ? 'eggs' : 'egg';
    case 'omelette': return 'omelette';
    case 'cake': return `${n} cake`;
    case 'pancake': return 'pancakes';
    case 'skewer': return `${n} skewers`;
    case 'berry': return PLURAL[p.id] ?? n;
    case 'wheel': return p.id === 'onion' ? 'red onion' : n;
    case 'strip': return 'roast pepper';
    case 'torn': return 'pulled chicken';
    case 'crumble': return n;
    default: return n;
  }
}

const COOKED: Record<string, string> = { steak: 'Seared', salmon: 'Seared', chicken: 'Roast', potato: 'Golden', mushroom: 'Seared', cabbage: 'Roast', pepper: 'Roast', peach: 'Grilled', pear: 'Roast', eggs: 'Soft', broccoli: 'Charred', tomato: 'Roast', onion: 'Roast' };
const SAUCE_WORDS: Record<string, string> = {
  'pool:jus': 'jus', 'pool:cream': 'cream sauce', 'pool:herb-oil': 'herb oil', 'pool:berry-sauce': 'berry sauce', 'pool:brown-butter': 'brown butter',
  'pool:chili': 'chili oil', 'pool:tomato-sauce': 'tomato sauce', 'pool:cheese-sauce': 'cheese sauce', 'pool:honey': 'honey', 'pool:citrus-oil': 'citrus oil',
  'pool:caramel': 'caramel', 'pool:maple': 'maple syrup',
};
const DRINK_WORDS: Record<string, string> = {
  'drink:apple': 'Apple cider cooler', 'drink:pear': 'Pear juice spritz', 'drink:peach': 'Peach iced tea', 'drink:lemon': 'Classic fresh lemonade', 'drink:lime': 'Fresh lime cooler',
  'drink:orange': 'Fresh orange juice', 'drink:strawberry': 'Fresh strawberry cooler', 'drink:watermelon': 'Fresh watermelon cooler', 'drink:grape': 'Sparkling grape spritz',
  'drink:blueberry': 'Blueberry lemonade', 'drink:tomato': 'Tomato juice with celery', 'drink:pepper': 'Roast pepper cooler', 'drink:spinach': 'Green spinach juice',
  'drink:avocado': 'Avocado lime smoothie', 'drink:green': 'Green garden juice', 'drink:milk': 'Thick vanilla milkshake', 'drink:horchata': 'Cinnamon rice horchata',
  'drink:bloody': 'Spiced tomato chili sip', 'drink:consomme': 'Clear golden consommé',
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A title fits on one line, has at least two words, and never repeats one ("Rice rice bowl"). */
const fits = (t: string) => {
  const words = t.toLowerCase().trim().split(/\s+/);
  const content = words.filter((w) => !['with', 'and', 'on', 'a'].includes(w));
  // 3 to 5 words, one line (the user's rule for titles).
  return t.length <= TITLE_MAX && words.length >= 3 && words.length <= 5 && new Set(content).size === content.length;
};

/** The first candidate that fits on one line (at most 32 characters, at least two words). */
function firstFit(candidates: string[], fallback: string): string {
  return cap(candidates.find((c) => fits(cap(c))) ?? fallback);
}

/** How a piece reads in a sentence ("a fan of avocado slices", "crisp garlic chips"). */
function piecePhrase(p: Piece): string {
  if (p.id === 'quenelle') return p.form === 'custard' ? 'a scoop of egg custard ice cream' : 'a scoop of vanilla ice cream';
  if (p.id === 'tart') return p.form === 'custard' ? 'a vanilla custard tart' : p.form === 'lemon-flesh' ? 'a lemon curd tart' : p.form === 'lime-flesh' ? 'a lime curd tart' : 'a crisp pastry tart';
  const n = NOUN[p.id] ?? p.id;
  const many = p.count > 1;
  switch (p.form) {
    case 'slice': return p.id === 'avocado' ? 'a fan of avocado slices' : p.id === 'chicken' ? 'sliced roast chicken' : p.id === 'steak' ? 'sliced steak' : many ? `${n} slices` : `a slice of ${n}`;
    case 'steak': return p.id === 'chicken' ? 'a carved chicken breast' : 'a seared steak, sliced';
    case 'fillet': return `a ${p.id === 'salmon' ? 'salmon' : n} fillet with a seared top`;
    case 'wheel': return p.id === 'onion' ? 'rings of red onion' : many ? `${n} wheels` : `a ${n} wheel`;
    case 'wedge': return `${n} wedges`;
    case 'half': return many ? `${n} halves` : `half a ${n}`;
    case 'cube': return p.id === 'baguette' ? 'golden croutons' : `diced ${n}`;
    case 'strip': return 'roast pepper strips';
    case 'torn': return 'pulled chicken';
    case 'chip': return 'crisp garlic chips';
    case 'crumble': return `crumbled ${n}`;
    case 'berry': return PLURAL[p.id] ?? n;
    case 'leaf': return `${n} leaves`;
    case 'fries': return 'golden fries';
    case 'drumstick': return 'roast drumsticks';
    case 'egg': return many ? 'fried eggs' : 'a fried egg';
    case 'omelette': return 'a soft omelette';
    case 'skewer': return `${n} skewers`;
    case 'whole': return many ? PLURAL[p.id] ?? n : `a whole ${n}`;
    case 'toast': return many ? 'two slices of toast' : 'a slice of toast';
    case 'mash': return 'a low dome of buttery mash';
    case 'pancake': return 'a stack of pancakes';
    default: return pieceWords(p);
  }
}

/** A list in words: "a, b and c". */
const listOf = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

/**
 * One sentence for the card, written from what is on the plate (item B: never leaves that are not
 * there) and varied by the seed (item 11: not the same "over cream sauce, finished with drops of oil"
 * every time).
 */
function describeDish(slots: Slots, components: DishComponent[], random: () => number): string {
  const { layout, hero, support, accent, base } = slots;
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length) % list.length];
  const sauceWords = SAUCE_WORDS[base] ?? (slots.sauce !== 'none' ? SAUCE_WORDS[slots.sauce] : undefined);
  // On a platform (toast, mash, a tart) the topping leads and the vehicle is the "where".
  const platform = ['toast-board', 'mash-plate', 'tart'].includes(layout.id) && support.length > 0;
  const toppings = [...support, ...accent].filter((p) => !(p.id === hero.id && p.form === hero.form));
  const lead = platform ? piecePhrase(toppings[0]) : piecePhrase(hero);
  const sides = (platform ? toppings.slice(1) : toppings).map(piecePhrase);
  if (layout.id === 'glass-drink') {
    const glass = slots.texture ? cap(slots.texture) : DRINK_WORDS[base] ?? 'A cold drink';
    // "Over ice" only when the glass has ice in it (Group 3).
    const kind = glassFor(base);
    return takesIce(base, kind)
      ? pick([`${glass} over ice, ${lead} on the rim.`, `${glass}, poured over ice and finished with ${lead}.`])
      : pick([`${glass}, poured cold, ${lead} on the rim.`, `${glass}, served chilled with ${lead}.`]);
  }
  // Where it sits: only what is really under it.
  let where = '';
  if (slots.texture && (base.startsWith('soup:') || base.startsWith('pool:'))) where = `in ${slots.texture.startsWith('a ') ? '' : 'a '}${slots.texture}`;
  else if (slots.texture && base === 'rice') where = `over ${slots.texture}`;
  else if (base.startsWith('soup:')) where = pick([`in a velvety ${NOUN[base.split(':')[1]]} soup`, `floating in a creamy ${NOUN[base.split(':')[1]]} soup`]);
  else if (base === 'rice') where = pick(['over warm mixed rice', 'on a bowl of herbed rice']);
  else if (base.startsWith('leaves:')) where = pick([`tossed with crisp ${NOUN[base.split(':')[1]]} leaves`, `on a mound of ${NOUN[base.split(':')[1]]} leaves`]);
  else if (base === 'mash:risotto') where = 'in a creamy rice pudding';
  else if (layout.id === 'tart') where = 'in a crisp pastry shell';
  else if (layout.id === 'pancake-stack') where = `, ${sauceWords ?? 'syrup'} poured over`;
  else if (layout.id === 'toast-board') where = platform ? pick([`piled on ${hero.count > 1 ? 'two slices of ' : ''}toasted bread`, `on golden ${hero.count > 1 ? 'toasts' : 'toast'}`]) : 'golden from the pan';
  else if (layout.id === 'mash-plate') where = platform ? pick(['on a low dome of buttery mash', 'over a swirl of potato mash']) : '';
  else if (sauceWords) where = pick([`over ${sauceWords}`, `on a pool of ${sauceWords}`, `with ${sauceWords} spooned round`]);
  const extras = components
    .map((c) => c.label ?? ({ quenelle: 'a scoop of ice cream', 'whipped-cream': 'whipped cream', smear: 'a swipe of sauce', tuile: 'a crisp tuile', puree: 'a silky puree', gel: 'bright gel beads', 'oil-dot': pick(['a few drops of oil', 'a thread of oil']), microherb: pick(['microherbs', 'a scatter of fresh herbs']) } as Record<string, string>)[c.kind])
    .filter(Boolean);
  // A sweet dish names its made-sweet ingredients first (a lime curd), and its one Unhinged savoury
  // piece as the deliberate contrast it is.
  extras.sort((a, b) => Number(components.some((c) => c.label === b)) - Number(components.some((c) => c.label === a)));
  const twistAt = slots.twist ? sides.indexOf(piecePhrase(slots.twist)) : -1;
  if (twistAt >= 0) sides.splice(twistAt, 1);
  // (No finish that repeats the lead or a side: "a scoop of custard ice cream ... a scoop of ice cream".)
  const opening = (t: string) => t.toLowerCase().split(' ').slice(0, 3).join(' ');
  const said = [lead, ...sides].map(opening);
  for (let i = extras.length - 1; i >= 0; i--) if (said.includes(opening(extras[i]))) extras.splice(i, 1);
  const withSides = sides.length ? ` with ${listOf(sides.slice(0, 2))}` : '';
  const finish = extras.length ? pick([`, finished with ${extras[0]}`, `. ${cap(extras[0])} to finish`, `, ${extras[0]} on the side`]) : '';
  const twist = slots.twist ? `, and ${piecePhrase(slots.twist).replace(/^an? /, 'a single ')} for contrast` : '';
  // (Never say the same thing twice: "a crisp pastry tart in a crisp pastry shell".)
  if (where && lead.toLowerCase().includes(where.replace(/^(in|on|over) (a |an )?/, '').split(' ').slice(0, 2).join(' '))) where = '';
  const sentence = `${cap(lead)}${withSides}${twist}${where ? ` ${where}` : ''}${finish}.`;
  return sentence.replace(/\s+/g, ' ').replace(/ ,/g, ',');
}

/** A short dish name in sentence case and one sentence for the card (no em dashes). */
export function titleDish(slots: Slots, cooked: boolean, components: DishComponent[] = [], random: () => number = () => 0): { title: string; description: string } {
  const { layout, hero, support, accent, base } = slots;
  // In a sweet dish a savoury star is named as what it became ("lime curd tart", Group 1).
  const madeStar = slots.sweet ? slots.made?.find((c) => c.from === slots.star) : undefined;
  const star = madeStar ? madeStar.label!.replace(/^(an? |beads of )/, '').replace(/^vanilla egg custard$/, 'egg custard') : NOUN[slots.star] ?? slots.star;
  const heroWords = pieceWords(hero);
  const sides = support.map(pieceWords).filter((w) => w !== heroWords);
  const bits = accent.map(pieceWords);
  const sauce = SAUCE_WORDS[base];
  const has = (kind: string) => components.some((c) => c.kind === kind);
  const cream = has('quenelle') ? 'ice cream' : has('whipped-cream') ? 'cream' : '';
  const side1 = sides[0] ?? bits[0];
  let candidates: string[];
  switch (layout.id) {
    case 'tart': {
      const second = support.find((p) => p.id !== slots.star);
      candidates = [
        `${star} tart with ${cream || 'cream'}`,
        second ? `${star} and ${NOUN[second.id]} tart` : '',
        `${star} tart`,
        slots.star === 'milk' || slots.star === 'butter' ? 'Vanilla custard tart' : '',
      ];
      if (slots.star === 'cheese') candidates.unshift('Baked cheese tart with cream');
      break;
    }
    case 'pancake-stack': candidates = [`pancakes with ${PLURAL[slots.star] ?? star}`, `${star} pancakes with cream`, `${star} pancakes`, 'Buttermilk pancakes']; break;
    case 'plated-dessert': candidates = [`caramelised ${star} with ${cream || 'cream'}`, `${star} with ${cream || 'cream'}`, `${star} and ${sauce ?? 'cream'}`, `${star} dessert`]; break;
    case 'dessert-bowl':
      candidates = base === 'mash:risotto' ? [`rice pudding with ${PLURAL[slots.star] ?? star}`, 'Creamy rice pudding'] : [`${star} pudding with ${cream || 'cream'}`, `${star} cream pudding`, `${star} pudding`];
      if (slots.star === 'milk') candidates.unshift(side1 ? `milk pudding with ${side1}` : 'Vanilla milk pudding');
      break;
    case 'tartare-crudo':
      candidates = slots.star === 'steak' ? [`steak tartare with ${sauce ?? 'herb oil'}`, 'Steak tartare with herbs'] : [`${star} crudo with ${sauce ?? 'citrus oil'}`, `${star} crudo`, `raw ${star} crudo`];
      break;
    case 'composed-plate':
      candidates = ['lemon', 'lime', 'orange'].includes(slots.star)
        ? [`${star} carpaccio with ${sauce ?? 'herb oil'}`, `${star} carpaccio`]
        : [`${cooked && COOKED[hero.id] && !heroWords.startsWith(COOKED[hero.id].toLowerCase()) ? `${COOKED[hero.id]} ` : ''}${heroWords} with ${sauce ?? 'herbs'}`, `${heroWords} with ${side1 ?? 'herbs'}`, `${star} starter plate`];
      break;
    case 'glass-drink':
      candidates = slots.inBase.includes('milk') && base !== 'drink:milk' ? [`thick ${star} milkshake`, `${star} milk shake`] : [DRINK_WORDS[base] ?? `fresh ${star} cooler`, `fresh ${star} cooler`];
      break;
    case 'rice-bowl': candidates = [`${star} rice bowl${side1 ? ` with ${side1}` : ''}`, `${star} rice bowl`, `mixed rice bowl with ${heroWords}`, 'Herbed mixed rice bowl']; break;
    case 'leaf-salad': {
      // Named after the leaves when the hero is only a scatter on them (romaine with crispy garlic).
      const leaves = base.startsWith('leaves:') ? NOUN[base.split(':')[1]] : '';
      candidates = hero.form === 'chip' && leaves ? [`${leaves} salad with ${heroWords}`, `${leaves} salad`] : [side1 ? `${heroWords} salad with ${side1}` : '', leaves ? `${heroWords} and ${leaves} salad` : '', `${heroWords} green salad`, `${star} green salad`];
      break;
    }
    case 'toast-board': {
      // Never a plain "X on toast" (item 11): the topping names the toast.
      // The topping in the singular, as a name: "blueberry toast", "avocado toast".
      const first = support[0] ? NOUN[support[0].id] ?? support[0].id : star;
      const second = sides[1] ?? bits[0];
      candidates = slots.sweet
        ? [second ? `${first} toast with ${second}` : '', `${first} toast with cream`, `${first} and honey toast`, 'Sweet toast with cream']
        : [second ? `${first} toast with ${second}` : '', `${first} toast with herbs`, `${first} crostini with herbs`, 'Toast with fresh herbs'];
      break;
    }
    case 'soup-bowl': candidates = base === `soup:${hero.id}` ? [`creamy ${NOUN[hero.id]} soup${side1 ? ` with ${side1}` : ''}`, `creamy ${NOUN[hero.id]} soup`] : [`${cap(base.startsWith('soup:') ? NOUN[base.split(':')[1]] : 'creamy')} soup with ${heroWords}`, `${base.startsWith('soup:') ? NOUN[base.split(':')[1]] : star} soup`, `${star} soup`]; break;
    case 'skewer-platter': candidates = [`${heroWords} with ${sauce ?? 'herbs'}`, `${heroWords}`, `grilled ${star} skewers`]; break;
    case 'skillet-bake': candidates = hero.id === 'eggs' ? [`baked ${heroWords} with ${side1 ?? 'herbs'}`, `baked ${heroWords} skillet`] : [`${heroWords} cheese bake`, `${star} skillet bake`]; break;
    case 'mash-plate': candidates = [side1 ? `${side1} with buttery mash` : '', side1 ? `${side1} and potato mash` : '', 'Buttery mash with herbs']; break;
    default: {
      const lead = `${cooked && COOKED[hero.id] && !heroWords.toLowerCase().startsWith(COOKED[hero.id].toLowerCase()) ? `${COOKED[hero.id]} ` : ''}${heroWords}`;
      candidates = [`${lead} with ${side1 ?? sauce ?? 'herbs'}`, `${lead} with ${sauce ?? 'herbs'}`, side1 ? `${heroWords} with ${side1}` : '', `${lead} plate`, `${star} plate`];
    }
  }
  const title = firstFit(candidates.filter(Boolean), `${cap(star)} tasting plate`);
  const description = describeDish(slots, components, random);
  return { title, description };
}

/** The table and the choices as one plated dish idea. Never throws, never the stand-in salmon. */
export function pickDish(ids: string[], choices: CookChoices, seed: number, options: { world?: string; attempt?: number } = {}): DishIdea {
  const table = [...new Set(ids)].filter((id) => TRAITS[id]).slice(0, 3);
  if (!table.length) table.push('apple');
  const random = seededRandom(seed);
  // A real world dish first (world-dishes-brief.md): it lends the name, the layout and its finishing
  // touches; the table's ingredients still fill the plate. Otherwise the templates cook.
  // (Tests may name the world dish, to check it renders as its looks note says.)
  const attempt = options.attempt ?? 0;
  const world = options.world ? WORLD_DISHES.find((d) => d.id === options.world) : pickWorldDish(table, choices, seed, attempt);
  // Another press of Cook at Classic varies like a step out (other cuts, another layout), still
  // within the sweet rules (they follow the Wild band, which this never raises to Unhinged).
  const varied = attempt % 2 === 1 && choices.wild < 30 ? { ...choices, wild: 45 } : choices;
  // A second press at Classic takes the next archetype in line when there is one.
  const candidates = layoutCandidates(table, choices.course.toLowerCase() as Course, choices.taste);
  const archetype = attempt > 0 && choices.wild < 30 && candidates.length > 1 ? layoutById(candidates[attempt % candidates.length])! : pickArchetype(table, varied, random);
  const layout = (world && layoutById(world.layout)) || archetype;
  const slots = assignSlots(table, varied, layout, random);
  // A world dish is rendered from its looks note: the shapes, the base and its colour.
  const look = world ? applyLooks(slots, world, table) : {};
  const GENERIC_TEXTURES = ['a glossy sauce pool', 'a smooth drink', 'a smooth soup', 'a sparkling drink', 'mixed rice with herb and vegetable flecks', 'a clear broth'];
  if (look.texture && !GENERIC_TEXTURES.includes(look.texture)) slots.texture = look.texture;
  capForTrueSize(slots);
  const components = chooseComponents(slots, varied.wild, random);
  if (world) for (const c of worldComponents(world, table, !!slots.sweet)) if (!components.some((o) => o.kind === c.kind && o.family === c.family)) components.push(c);
  const part = (p: Piece) => `${p.id}:${p.form}${p.count > 1 ? `*${p.count}` : ''}`;
  const raw = ['tartare-crudo', 'leaf-salad', 'glass-drink'].includes(layout.id) || slots.course === 'dessert';
  const made = titleDish(slots, !raw, components, seededRandom(seed ^ 0x7e57));
  // A world dish keeps its real name; its caption still says what is on the plate, and where from.
  const title = world ? world.name : made.title;
  const description = world ? `${made.description.replace(/\.$/, '')}, the ${world.cuisine} way.` : made.description;
  const heroes = [...table, ...table, ...table].slice(0, 3) as [string, string, string];
  const pieces = components.filter((c) => c.part).map((c) => c.part!);
  // On a platform, library cream sits with the toppings (on it); everything else beside.
  return {
    id: `gen-${table.slice().sort().join('-')}-${seed.toString(36)}`,
    title,
    heroes,
    course: slots.course,
    description,
    ware: slots.ware,
    base: slots.base,
    big: part(slots.hero),
    medium: slots.support.map(part),
    // Herbs only on a savoury dish (Group 1: never savoury herbs on pancakes, tarts or sweet toast).
    small: [...slots.accent.map(part), ...pieces, ...(slots.sweet ? [] : [`herb*${slots.layout.savoryGarnish ? 8 : 3}`])],
    layout: slots.layout.id,
    seed,
    archetype: slots.layout.id,
    components,
    table,
    blended: [...new Set(slots.inBase)],
    sauce: slots.sauce,
    sweet: slots.sweet,
    baseFamily: look.family,
    world: world ? { id: world.id, cuisine: world.cuisine, region: world.region } : undefined,
  };
}
