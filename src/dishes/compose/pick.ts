import { seededRandom } from '../../ingredients/forms/kit/random';
import { TRAITS, heroPriority, type IngredientTraits } from '../../ingredients/traits';
import type { DishIdea } from '../catalog';
import { SKEWERS } from './elements';
import { layoutById, type LayoutId, type LayoutSpec } from './layouts';

/**
 * The Kitchen's Cook (the composable dishes spec, 2026-11-26, step 5): the ingredients on the table
 * (one, two or three) plus the cooking choices become one plated dish idea, which the composer then
 * builds and paints like any other dish.
 *
 * Rule based and seeded, never an AI model: the same table, choices and seed always cook the same
 * dish; another seed varies counts, cuts, sides and sometimes the ware, never the plating rules.
 *
 * Three steps, like art directing a shoot:
 * 1. `pickLayout`: which plating recipe suits this table and course (layouts.ts).
 * 2. `assignSlots`: who plays which part: the hero, the bunch beside it, the accents, the base.
 * 3. `titleDish`: a short catalogue-style name and one sentence for the card.
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
}

const PROTEINS = ['steak', 'salmon', 'chicken', 'eggs'];
const LEAFY = ['romaine', 'spinach', 'cabbage'];
const LIQUID_OK = (id: string) => TRAITS[id]?.slots.includes('liquid') || id === 'milk';

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

/**
 * The layouts that fit this table, best first (the spec's priority table). High Wild may take the
 * second; the last is always the circular plate, so there is always an answer.
 */
export function layoutCandidates(ids: string[], course: Course, taste: string): LayoutId[] {
  const has = (id: string) => ids.includes(id);
  const traits = ids.map((id) => TRAITS[id]).filter(Boolean) as IngredientTraits[];
  const protein = ids.some((id) => PROTEINS.includes(id));
  const out: LayoutId[] = [];
  const add = (id: LayoutId) => !out.includes(id) && out.push(id);
  // Base-only ingredients decide first: rice is always a rice bowl, romaine always a leaf bed.
  if (has('rice')) add('rice-bowl');
  if (has('romaine')) add('leaf-salad');
  if (course === 'drink' && ids.some(LIQUID_OK)) add('glass-drink');
  if (course === 'dessert' || (taste === 'Sweet' && !protein)) {
    add('dessert-bowl');
    if (ids.some(LIQUID_OK)) add('glass-drink');
  }
  if (has('baguette') && (course === 'snack' || course === 'starter')) add('toast-board');
  if (ids.some((id) => LEAFY.includes(id)) && (course === 'starter' || protein)) add('leaf-salad');
  if ((has('eggs') && ids.some((id) => ['tomato', 'pepper', 'mushroom', 'spinach'].includes(id))) || (has('broccoli') && has('cheese'))) add('skillet-bake');
  const threaded = ['chicken', 'steak', 'salmon'].find((p) => has(p) && SKEWERS[p].some((bead) => bead.ingredient !== p && has(bead.ingredient)));
  if (threaded) add('skewer-platter');
  if ((has('potato') && has('milk')) || (has('tomato') && course === 'starter' && traits.length > 1 && !protein)) add('soup-bowl');
  if (has('potato') && !has('steak') && !has('chicken')) add('mash-plate');
  if (has('baguette')) add('toast-board');
  add('circular-plate');
  // A drink was asked for but nothing can be poured: plate it instead (never a "steak drink").
  // A glass only when everything on the table can be poured or laid beside it: fruit, vegetables,
  // dairy. Meat, sauce, garlic, bread, rice and leaves never go next to a drink.
  const drinkable = ids.every((id) => ['produce', 'dairy'].includes(TRAITS[id]?.category ?? '') && id !== 'mushroom' && id !== 'onion');
  return out.filter((id) => id !== 'glass-drink' || (ids.some(LIQUID_OK) && drinkable));
}

export function pickLayout(ids: string[], choices: CookChoices, random: () => number): LayoutSpec {
  const course = choices.course.toLowerCase() as Course;
  const candidates = layoutCandidates(ids, course, choices.taste);
  // Base-only ingredients (rice, romaine) pin their layout; otherwise Unhinged may take the runner-up.
  const pinned = ids.includes('rice') || ids.includes('romaine');
  const pick = !pinned && choices.wild >= 70 && candidates.length > 2 && random() < 0.5 ? candidates[1] : candidates[0];
  return layoutById(pick)!;
}

/** The pool a dish sits in when no table ingredient makes one. */
function defaultPool(layout: LayoutSpec, heroId: string, ids: string[]): string {
  if (layout.id === 'dessert-bowl') return ids.some((id) => ['strawberry', 'blueberries', 'grapes'].includes(id)) ? 'pool:cream' : 'pool:berry-sauce';
  if (layout.id === 'skillet-bake') return ids.includes('cheese') || ids.includes('broccoli') ? 'pool:cheese-sauce' : 'pool:tomato-sauce';
  if (['steak', 'chicken', 'mushroom'].includes(heroId)) return 'pool:jus';
  if (['salmon', 'eggs', 'potato'].includes(heroId)) return 'pool:cream';
  return 'pool:herb-oil';
}

/** Who plays which part. Every table ingredient appears, in a slot and form its traits allow. */
export function assignSlots(ids: string[], choices: CookChoices, layout: LayoutSpec, random: () => number): Slots {
  const course = choices.course.toLowerCase() as Course;
  const wild = choices.wild;
  const left = new Set(ids);
  const inBase: string[] = [];
  const take = (id: string) => left.delete(id);
  const formFor = (id: string, slot: 'hero' | 'support' | 'accent') => {
    // A skewer is only ever the hero of the skewer layout (it threads its own partners).
    const forms = (TRAITS[id]?.forms[slot] ?? []).filter((f) => f !== 'skewer');
    if (!forms.length) return undefined;
    // Classic takes the first (the signature cut); higher Wild may take another.
    return wild >= 30 && forms.length > 1 && random() < 0.5 ? forms[1 + Math.floor(random() * (forms.length - 1))] : forms[0];
  };
  const sweetFirst = course === 'dessert' || choices.taste === 'Sweet';
  const rank = (id: string) => heroPriority(id) - (sweetFirst && TRAITS[id]?.taste !== 'savoury' ? 2.5 : 0);

  // The base first: what the food sits in.
  let base = 'none';
  if (layout.id === 'rice-bowl') (base = 'rice'), take('rice'), inBase.push('rice');
  if (layout.id === 'leaf-salad') {
    const leafy = ['romaine', 'spinach', 'cabbage'].find((id) => left.has(id));
    if (leafy) (base = `leaves:${leafy}`), take(leafy), inBase.push(leafy);
  }
  if (layout.id === 'soup-bowl') {
    const soup = ['potato', 'tomato', 'pepper'].find((id) => left.has(id));
    base = soup ? `soup:${soup}` : 'pool:cream';
    if (left.has('milk')) take('milk'), inBase.push('milk');
  }
  if (layout.id === 'glass-drink') {
    // The juiciest pourable ingredient becomes the drink (milk makes it a shake: the fruit leads its colour).
    const fruit = ids.find((id) => id !== 'milk' && TRAITS[id]?.slots.includes('liquid'));
    const pour = fruit ?? 'milk';
    base = TRAITS[pour]?.forms.liquid?.[0] ?? 'drink:milk';
    if (left.has('milk')) take('milk'), inBase.push('milk');
    if (fruit && ids.filter((id) => id !== 'milk').length > 1) take(fruit), inBase.push(fruit);
  }
  // Sauce, butter and milk make the pool when the layout wants one.
  if (base === 'none' && (layout.wantsUnderPool || layout.id === 'circular-plate')) {
    if (left.has('sauce')) (base = left.has('tomato') ? 'pool:tomato-sauce' : 'pool:chili'), take('sauce'), inBase.push('sauce');
    else if (left.has('butter') && layout.id !== 'dessert-bowl') (base = 'pool:brown-butter'), take('butter'), inBase.push('butter');
    else if (left.has('milk') && layout.id !== 'dessert-bowl') (base = 'pool:cream'), take('milk'), inBase.push('milk');
  }
  // A sauce on a dry layout (a board) still never becomes a piece: it is drizzled, so it is the base.
  if (left.has('sauce')) (base = base === 'none' ? 'pool:chili' : base), take('sauce'), inBase.push('sauce');

  // The hero.
  let hero: Piece | undefined;
  const heroFrom = (id: string, form: string, count: number) => {
    hero = { id, form, count };
    take(id);
  };
  if (layout.id === 'toast-board' && left.has('baguette')) heroFrom('baguette', 'toast', between(random, [1, 2]));
  if (!hero && layout.id === 'mash-plate') {
    if (left.has('potato')) heroFrom('potato', 'mash', 1);
    else if (left.has('milk')) heroFrom('milk', 'mash', 1);
  }
  if (!hero && layout.id === 'skewer-platter') {
    const p = ['chicken', 'steak', 'salmon'].find((id) => left.has(id) && SKEWERS[id].some((b) => b.ingredient !== id && left.has(b.ingredient)));
    if (p) {
      heroFrom(p, 'skewer', between(random, [2, 3]));
      // Its partners are already threaded on the stick: they are in the dish, not a second heap.
      for (const bead of SKEWERS[p]) if (left.has(bead.ingredient)) take(bead.ingredient), inBase.push(bead.ingredient);
    }
  }
  if (!hero && layout.id === 'skillet-bake') {
    // Two fried eggs fit a pan with their vegetables round them; three crowded it.
    if (left.has('eggs')) heroFrom('eggs', wild >= 40 && random() < 0.35 ? 'omelette' : 'egg', 2);
    else if (left.has('broccoli')) heroFrom('broccoli', 'whole', 3);
  }
  if (!hero && layout.id === 'dessert-bowl') {
    if (left.has('milk')) heroFrom('milk', random() < 0.5 ? 'pancake' : 'mash', 1);
    else if (left.has('butter')) heroFrom('butter', random() < 0.5 ? 'cake' : 'pastry', 1);
    else if (left.has('cheese') && wild < 70) heroFrom('cheese', 'cake', 1);
  }
  if (!hero && layout.id === 'soup-bowl') {
    const p = [...left].filter((id) => id === 'eggs' || TRAITS[id]?.forms.support?.includes('cube')).sort((a, b) => rank(a) - rank(b))[0];
    if (p === 'eggs') heroFrom('eggs', 'egg', 2);
    else if (p) heroFrom(p, 'cube', between(random, [5, 7]));
  }
  if (!hero && layout.id === 'rice-bowl') {
    const p = [...left].filter((id) => TRAITS[id]?.forms.support?.includes('cube') || id === 'eggs').sort((a, b) => rank(a) + (a === 'baguette' ? 1 : 0) - rank(b) - (b === 'baguette' ? 1 : 0))[0];
    if (p === 'eggs') heroFrom('eggs', 'egg', 1);
    else if (p) heroFrom(p, 'cube', between(random, [5, 7]));
  }
  if (!hero) {
    // The highest-ranking ingredient that can lead, in its signature cut.
    const lead = [...left].filter((id) => TRAITS[id]?.forms.hero?.length).sort((a, b) => rank(a) - rank(b))[0];
    if (lead) {
      const form = formFor(lead, 'hero')!;
      // Big single pieces lead alone (a cheese wedge, a cabbage wedge, a pepper half); small cuts lead as a group.
      const many = ['half', 'wedge', 'cube', 'slice', 'whole', 'egg', 'drumstick'].includes(form) && !['pepper', 'cabbage', 'avocado', 'cheese'].includes(lead);
      const count = form === 'drumstick' ? 2 : form === 'egg' ? between(random, [1, 2]) : form === 'whole' && lead === 'broccoli' ? 2 : many ? odd(between(random, [3, 5])) : 1;
      heroFrom(lead, form, count);
    }
  }
  if (!hero) {
    // Nothing can lead (lime, garlic, sauce on their own): the most substantial accent becomes a
    // generous group, still honestly plated. With everything already in the base (romaine alone),
    // crispy garlic over the leaves leads: garlic chips are one of the auto garnishes.
    const any = [...left].find((id) => TRAITS[id]?.forms.accent?.length || TRAITS[id]?.forms.support?.length);
    if (any) {
      const form = (TRAITS[any].forms.accent ?? TRAITS[any].forms.support!)[0];
      heroFrom(any, form, any === 'garlic' ? 9 : 5);
    } else hero = { id: 'garlic', form: 'chip', count: 9 };
  }

  // The support bunch, then accents: generous counts (volume, never one lonely piece).
  const support: Piece[] = [];
  const accent: Piece[] = [];
  const supportCount = (form: string) => (form === 'fries' ? between(random, [12, 16]) : form === 'whole' ? 2 : form === 'egg' ? 2 : form === 'skewer' ? 2 : between(random, layout.support));
  const rest = [...left].sort((a, b) => rank(a) - rank(b));
  for (const id of rest) {
    const traits = TRAITS[id];
    if (!traits) continue;
    // Garlic is always a handful of chips; lemon and lime are accents.
    const asAccent = id === 'garlic' || (!traits.forms.support?.length && traits.forms.accent?.length) || (support.length >= 1 && traits.forms.accent?.length);
    if (!asAccent && traits.forms.support?.length) {
      let form = formFor(id, 'support')!;
      if (layout.packing === 'platform' && form === 'fries') form = 'wedge';
      support.push({ id, form, count: Math.max(layout.support[0] ? 1 : 0, supportCount(form)) || 3 });
    } else if (traits.forms.accent?.length) {
      const form = formFor(id, 'accent')!;
      accent.push({ id, form, count: id === 'garlic' ? 8 : odd(between(random, layout.accent)) });
    } else if (traits.forms.support?.length) {
      support.push({ id, form: formFor(id, 'support')!, count: supportCount(formFor(id, 'support')!) });
    }
    take(id);
  }
  // A second protein never sits beside the first as a second giant: it is cut small.
  for (const s of support) if (PROTEINS.includes(s.id) && PROTEINS.includes(hero!.id) && TRAITS[s.id].forms.support?.includes('cube')) s.form = 'cube';

  // The pool, if the layout wants one and nothing on the table made it.
  if (base === 'none' && layout.wantsUnderPool) base = defaultPool(layout, hero!.id, ids);
  if (base === 'none' && layout.id === 'circular-plate') base = defaultPool(layout, hero!.id, ids);

  // A savoury seared main gets a small scatter of garlic chips (never a bulb), at mid or high Wild.
  if (!ids.includes('garlic') && layout.id === 'circular-plate' && course === 'main' && wild >= 40 && accent.length < 2) accent.push({ id: 'garlic', form: 'chip', count: 7 });

  // The ware: high Wild may swap to the layout's alternative.
  const ware = layout.wildWare && wild >= 30 && random() < (wild >= 70 ? 0.6 : 0.3) ? layout.wildWare : layout.ware;
  return { layout, hero: hero!, support, accent, base, inBase, ware, course: layout.id === 'glass-drink' ? 'drink' : course === 'drink' ? 'snack' : course };
}

const NOUN: Record<string, string> = {
  steak: 'steak', salmon: 'salmon', chicken: 'chicken', eggs: 'egg', potato: 'potato', rice: 'rice', baguette: 'bread', broccoli: 'broccoli',
  apple: 'apple', pear: 'pear', peach: 'peach', orange: 'orange', lemon: 'lemon', lime: 'lime', strawberry: 'strawberry', watermelon: 'watermelon',
  tomato: 'tomato', onion: 'red onion', pepper: 'pepper', avocado: 'avocado', grapes: 'grape', blueberries: 'blueberry', mushroom: 'mushroom',
  cabbage: 'cabbage', spinach: 'spinach', romaine: 'romaine', cheese: 'cheese', butter: 'butter', milk: 'milk', sauce: 'chili', garlic: 'garlic',
};

/** How a piece is named in a title ("potato fries", "crispy garlic", "peach wedges"). */
function pieceWords(p: Piece): string {
  const n = NOUN[p.id] ?? p.id;
  switch (p.form) {
    case 'fries': return 'fries';
    case 'chip': return 'crispy garlic';
    case 'mash': return p.id === 'milk' ? 'milk pudding' : 'potato rösti';
    case 'toast': return 'toast';
    case 'fillet': case 'steak': case 'drumstick': return n;
    case 'egg': return p.count > 1 ? 'eggs' : 'egg';
    case 'omelette': return 'omelette';
    case 'cake': return `${n} cake`;
    case 'pastry': return 'butter pastry';
    case 'pancake': return 'pancakes';
    case 'skewer': return `${n} skewers`;
    case 'berry': return p.id === 'grapes' ? 'grapes' : 'blueberries';
    case 'wheel': return p.id === 'onion' ? 'red onion rings' : `${n} slices`;
    case 'crumble': return `${n} crumbs`;
    case 'whole': return n;
    case 'leaf': return n;
    case 'cube': return p.id === 'baguette' ? 'croutons' : `${n}`;
    default: return n;
  }
}

const COOKED: Record<string, string> = { steak: 'Seared', salmon: 'Seared', chicken: 'Roast', potato: 'Golden', mushroom: 'Seared', cabbage: 'Roast', pepper: 'Roast', peach: 'Caramelised', pear: 'Roast', eggs: 'Soft' };

const POOL_WORDS: Record<string, string> = {
  'pool:jus': 'a rich jus', 'pool:cream': 'a soft cream sauce', 'pool:herb-oil': 'bright herb oil', 'pool:berry-sauce': 'a berry sauce', 'pool:brown-butter': 'brown butter',
  'pool:chili': 'chili oil', 'pool:tomato-sauce': 'tomato sauce', 'pool:cheese-sauce': 'a melting cheese sauce', 'pool:honey': 'honey', 'pool:citrus-oil': 'citrus oil',
};

const and = (words: string[]) => (words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A short catalogue-style title in sentence case and one sentence for the card (no em dashes). */
export function titleDish(slots: Slots, cooked: boolean): { title: string; description: string } {
  const { layout, hero, support, accent, base } = slots;
  const heroWords = pieceWords(hero);
  const sides = support.map(pieceWords);
  const bits = accent.map(pieceWords);
  const inBaseWords = slots.inBase.filter((id) => !['rice', 'romaine', 'spinach', 'cabbage', 'sauce', 'butter', 'milk'].includes(id)).map((id) => NOUN[id]);
  const all = and([...sides, ...bits.slice(0, 1)]);
  let title: string;
  switch (layout.id) {
    case 'rice-bowl': title = `${cap(NOUN[hero.id])} ${cooked ? 'rice bowl' : 'poke bowl'}${sides.length ? ` with ${and(sides)}` : ''}`; break;
    case 'leaf-salad': title = `${cap(NOUN[hero.id])} salad${all ? ` with ${all}` : ''}`; break;
    case 'toast-board': title = `${cap(and([...sides, ...bits.slice(0, 1)]) || 'Golden')} toast`; break;
    case 'soup-bowl': title = `${cap(base.startsWith('soup:') ? NOUN[base.split(':')[1]] : 'Creamy')} soup with ${and([heroWords, ...sides].slice(0, 2))}`; break;
    case 'skewer-platter': title = `${cap(heroWords)}${inBaseWords.length ? ` with ${and(inBaseWords)}` : ''}`; break;
    case 'glass-drink': {
      const fruit = base.split(':')[1];
      const kind = slots.inBase.includes('milk') ? (fruit === 'milk' ? 'Vanilla milkshake' : `${cap(NOUN[fruit] ?? fruit)} milkshake`) : `${cap(NOUN[fruit] ?? fruit)} cooler`;
      title = kind;
      break;
    }
    case 'dessert-bowl': title = `${cap(heroWords)}${all ? ` with ${all}` : ''}`; break;
    case 'skillet-bake': title = hero.id === 'eggs' ? `Baked ${heroWords} with ${and(sides.concat(bits).slice(0, 2)) || 'herbs'}` : `${cap(heroWords)} cheese bake`; break;
    case 'mash-plate': title = `${cap(and(sides.concat(bits).slice(0, 2)) || 'Herbs')} on ${heroWords}`; break;
    default: title = `${cooked && COOKED[hero.id] ? `${COOKED[hero.id]} ${heroWords}` : cap(heroWords)}${all ? ` with ${all}` : ''}`;
  }
  const pool = POOL_WORDS[base];
  const description =
    layout.id === 'glass-drink'
      ? `${title}, poured cold with fresh fruit beside the glass.`
      : `${title}, ${pool ? `plated over ${pool}` : base.startsWith('soup:') ? `in a velvety ${NOUN[base.split(':')[1]]} soup` : layout.id === 'rice-bowl' ? 'over warm rice' : layout.id === 'leaf-salad' ? 'on a bed of crisp leaves' : 'plated together'} and finished with herbs.`;
  return { title: cap(title), description };
}

/** The table and the choices as one plated dish idea. Never throws, never the stand-in salmon. */
export function pickDish(ids: string[], choices: CookChoices, seed: number): DishIdea {
  const table = [...new Set(ids)].filter((id) => TRAITS[id]).slice(0, 3);
  if (!table.length) table.push('apple');
  const random = seededRandom(seed);
  const layout = pickLayout(table, choices, random);
  const slots = assignSlots(table, choices, layout, random);
  const part = (p: Piece) => `${p.id}:${p.form}${p.count > 1 ? `*${p.count}` : ''}`;
  const freshWords = /salad|poke|cooler|milkshake/i;
  const draft = titleDish(slots, true);
  const cooked = slots.course !== 'drink' && slots.course !== 'dessert' && !freshWords.test(draft.title);
  const { title, description } = titleDish(slots, cooked);
  const heroes = [...table, ...table, ...table].slice(0, 3) as [string, string, string];
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
    small: [...slots.accent.map(part), `herb*${slots.layout.savoryGarnish ? 8 : 3}`],
    layout: slots.layout.id,
    seed,
  };
}
