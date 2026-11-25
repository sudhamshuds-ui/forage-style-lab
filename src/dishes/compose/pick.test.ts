import { describe, expect, it } from 'vitest';
import { TRAITS } from '../../ingredients/traits';
import { BASE_FAMILY, SKEWERS } from './elements';
import { readPart } from './layout';
import { TITLE_MAX, cookSeed, pickDish, type CookChoices } from './pick';
import { isComponent } from './components';

const COURSES = ['Starter', 'Main', 'Dessert', 'Snack', 'Drink'];
const TASTES = ['Savoury', 'Sweet', 'Both'];
const WILD = [0, 60, 100];

const PAIRS_AND_TRIOS: string[][] = [
  ['steak', 'potato'], ['salmon', 'rice'], ['baguette', 'avocado'], ['romaine', 'eggs'], ['lime', 'sauce'],
  ['steak', 'potato', 'garlic'], ['salmon', 'rice', 'avocado'], ['baguette', 'avocado', 'tomato'], ['steak', 'romaine', 'tomato'],
  ['lime', 'garlic', 'sauce'], ['steak', 'blueberries', 'milk'], ['rice', 'baguette', 'potato'], ['strawberry', 'milk', 'blueberries'],
  ['eggs', 'tomato', 'pepper'], ['chicken', 'grapes', 'pepper'], ['potato', 'salmon', 'onion'], ['peach', 'milk', 'strawberry'],
  ['potato', 'onion', 'milk'], ['broccoli', 'cheese', 'milk'], ['steak', 'salmon', 'chicken'], ['cabbage', 'spinach', 'apple'],
  ['butter', 'pear', 'grapes'], ['watermelon', 'lime', 'mushroom'], ['orange', 'lemon', 'lime'],
];

const TABLES = [...Object.keys(TRAITS).map((id) => [id]), ...PAIRS_AND_TRIOS];

function* everyCook(): Generator<{ ids: string[]; choices: CookChoices; seed: number }> {
  for (const ids of TABLES)
    for (const course of COURSES)
      for (const taste of TASTES)
        for (const wild of WILD) {
          const choices = { course, taste, wild };
          yield { ids, choices, seed: cookSeed(ids, choices) };
        }
}

const piecesOf = (idea: ReturnType<typeof pickDish>) => [idea.big, ...idea.medium, ...idea.small].map(readPart).filter((p) => p.form !== 'herb');
/** Library pieces: components, and the pantry forms the library borrows (a pancake, toast, croutons, a mash, a lemon wheel by a glass). */
const LIBRARY = new Set(['milk:pancake', 'baguette:toast', 'baguette:cube', 'potato:mash', 'lemon:wheel']);
const isLibrary = (p: { ingredient: string; form: string }, ids: string[]) => isComponent(p.ingredient) || (!ids.includes(p.ingredient) && LIBRARY.has(`${p.ingredient}:${p.form}`));

describe('pickDish (the P0 list)', () => {
  it('never drops a table ingredient', () => {
    for (const { ids, choices, seed } of everyCook()) {
      const idea = pickDish(ids, choices, seed);
      const parts = piecesOf(idea).map((p) => p.ingredient);
      for (const id of ids) expect(parts.includes(id) || idea.blended?.includes(id), `${ids.join('+')} ${choices.course} ${choices.taste} ${choices.wild}: ${id} missing from ${idea.title}`).toBe(true);
    }
  });

  it('never invents a mash, and every course picks a legal dish type', () => {
    for (const { ids, choices, seed } of everyCook()) {
      const idea = pickDish(ids, choices, seed);
      const where = `${ids.join('+')} ${choices.course} ${choices.taste} ${choices.wild}: ${idea.title}`;
      const pieces = piecesOf(idea);
      if (!ids.includes('potato')) {
        expect(idea.layout, where).not.toBe('mash-plate');
        expect(pieces.some((p) => p.form === 'mash' || (p.ingredient === 'puree' && p.form === 'mash')), where).toBe(false);
      }
      if (choices.course === 'Drink') expect(idea.layout, where).toBe('glass-drink');
      if (choices.course === 'Starter' || choices.course === 'Main') {
        expect(idea.layout, where).not.toBe('pancake-stack');
        expect(pieces.some((p) => p.form === 'pancake'), where).toBe(false);
      }
    }
  });

  it('names and captions match the plate (items A, B, H, 11)', () => {
    const captions = new Set<string>();
    for (const { ids, choices, seed } of everyCook()) {
      const idea = pickDish(ids, choices, seed);
      const where = `${ids.join('+')} ${choices.course} ${choices.taste} ${choices.wild}: ${idea.title} / ${idea.description}`;
      expect(idea.title, where).not.toMatch(/ on /i);
      expect(idea.title.split(/\s+/).length, where).toBeLessThanOrEqual(5);
      expect(idea.title.split(/\s+/).length, where).toBeGreaterThanOrEqual(3);
      if (!idea.base.startsWith('leaves:') && !piecesOf(idea).some((p) => p.form === 'leaf')) expect(idea.description, where).not.toMatch(/leaves/);
      if (!ids.includes('baguette')) expect(piecesOf(idea).some((p) => p.ingredient === 'baguette' && p.form === 'cube'), where).toBe(false);
      if (choices.course === 'Main') expect(idea.layout, where).not.toBe('soup-bowl');
      if (idea.layout === 'leaf-salad') expect(idea.base, where).toMatch(/^leaves:/);
      if (idea.layout === 'pancake-stack' && !ids.includes('sauce')) expect(['pool:maple', 'pool:honey', 'pool:caramel'], where).toContain(idea.base === 'none' ? idea.sauce : idea.base);
      captions.add(idea.description.replace(/^[^,]*/, ''));
    }
    // Captions vary (not one stamp on every plate).
    expect(captions.size).toBeGreaterThan(200);
  });

  it('never shows an avocado half or its seed', () => {
    for (const { ids, choices, seed } of everyCook()) {
      if (!ids.includes('avocado')) continue;
      const idea = pickDish(ids, choices, seed);
      for (const p of piecesOf(idea)) if (p.ingredient === 'avocado') expect(['half', 'pit', 'whole'], `${ids.join('+')} ${choices.course}: ${p.form}`).not.toContain(p.form);
    }
  });
});

describe('pickDish', () => {
  it('always cooks a dish the composer can build', () => {
    for (const { ids, choices, seed } of everyCook()) {
      const idea = pickDish(ids, choices, seed);
      const where = `${ids.join('+')} ${choices.course} ${choices.taste} ${choices.wild}`;
      expect(idea.layout, where).toBeDefined();
      for (const p of piecesOf(idea)) {
        if (isComponent(p.ingredient)) continue;
        const allowed = [...Object.values(TRAITS[p.ingredient]?.forms ?? {}).flat(), ...(isLibrary(p, ids) ? [p.form] : [])];
        expect(allowed, `${where}: ${p.ingredient}:${p.form}`).toContain(p.form);
        expect(p.count, where).toBeGreaterThan(0);
      }
      const ok = idea.base === 'none' || idea.base === 'rice' || idea.base in BASE_FAMILY;
      expect(ok, `${where}: base ${idea.base}`).toBe(true);
      expect(idea.title, where).not.toMatch(/—/);
      expect(idea.description, where).not.toMatch(/—/);
      // The title fits on one line and is a dish name, never one ingredient word (the fix list).
      expect(idea.title.length, `${where}: ${idea.title}`).toBeLessThanOrEqual(TITLE_MAX);
      expect(idea.title.trim().split(/\s+/).length, `${where}: ${idea.title}`).toBeGreaterThanOrEqual(2);
      // No word twice ("Roast roast pepper", "Potato soup with potato").
      const words = idea.title.toLowerCase().split(/\s+/).filter((w) => !['with', 'and', 'on', 'a'].includes(w));
      expect(new Set(words).size, `${where}: ${idea.title}`).toBe(words.length);
      // Every dish has at least one library component beyond a bare pool.
      expect(idea.components?.length ?? 0, `${where}: no components`).toBeGreaterThan(0);
      // Drink is always a glass.
      if (choices.course === 'Drink') expect(idea.ware, where).toBe('glass');
    }
  });

  it('puts every table ingredient in the dish, and only table ingredients in heroes', () => {
    for (const { ids, choices, seed } of everyCook()) {
      const idea = pickDish(ids, choices, seed);
      const where = `${ids.join('+')} ${choices.course} ${choices.taste} ${choices.wild}`;
      for (const h of idea.heroes) expect(ids, where).toContain(h);
      const used = new Set(piecesOf(idea).filter((p) => !isLibrary(p, ids)).map((p) => p.ingredient));
      // In a drink, anything that cannot sit by a glass is in the glass; butter and milk go into a tart or pancakes.
      if (idea.ware === 'glass' || /^(tart|milk:pancake)/.test(idea.big)) for (const id of ids) used.add(id);
      const base = idea.base.split(':')[1] ?? idea.base;
      for (const p of piecesOf(idea)) if (p.form === 'skewer') for (const bead of SKEWERS[p.ingredient]) used.add(bead.ingredient);
      for (const id of ids) {
        const inBase =
          base === id || idea.base === id || (id === 'rice' && idea.base === 'mash:risotto') || (id === 'sauce' && idea.base.startsWith('pool:')) || (id === 'butter' && idea.base === 'pool:brown-butter') ||
          (id === 'milk' && (idea.base === 'pool:cream' || idea.base.startsWith('drink:') || idea.base.startsWith('soup:'))) ||
          (TRAITS[id]?.forms.liquid?.includes(idea.base) ?? false);
        expect(used.has(id) || inBase, `${where}: ${id} missing (${idea.big}; ${idea.medium}; ${idea.small}; ${idea.base})`).toBe(true);
      }
    }
  });

  it('never shows a garlic bulb, never makes the sauce a piece, keeps romaine a bed', () => {
    for (const { ids, choices, seed } of everyCook()) {
      const idea = pickDish(ids, choices, seed);
      for (const p of piecesOf(idea)) {
        if (p.ingredient === 'garlic') expect(p.form).toBe('chip');
        expect(p.ingredient).not.toBe('sauce');
        expect(p.ingredient).not.toBe('romaine');
      }
      if (ids.includes('romaine') && !ids.includes('rice') && idea.ware !== 'glass') expect(idea.base).toBe('leaves:romaine');
    }
  });

  it('cooks the same dish from the same seed, and varies with another', () => {
    const ids = ['steak', 'potato', 'garlic'];
    const choices = { course: 'Main', taste: 'Savoury', wild: 60 };
    expect(pickDish(ids, choices, 7)).toEqual(pickDish(ids, choices, 7));
    const seen = new Set<string>();
    for (let s = 0; s < 12; s++) seen.add(JSON.stringify({ ...pickDish(ids, choices, cookSeed(ids, choices, s)), id: '', seed: 0 }));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('plates the spec examples as described', () => {
    const steakFrites = pickDish(['steak', 'potato', 'garlic'], { course: 'Main', taste: 'Savoury', wild: 0 }, 1);
    expect(steakFrites.layout).toBe('circular-plate');
    expect(steakFrites.big).toBe('steak:steak');
    expect(steakFrites.medium[0]).toMatch(/^potato:fries\*1\d$/);
    expect(steakFrites.small).toContain('garlic:chip*8');
    const bowl = pickDish(['salmon', 'rice', 'avocado'], { course: 'Main', taste: 'Savoury', wild: 0 }, 1);
    expect([bowl.layout, bowl.ware, bowl.base]).toEqual(['rice-bowl', 'deep', 'rice']);
    const toast = pickDish(['baguette', 'avocado', 'tomato'], { course: 'Snack', taste: 'Savoury', wild: 0 }, 1);
    expect([toast.layout, toast.big.split('*')[0]]).toEqual(['toast-board', 'baguette:toast']);
    const drink = pickDish(['strawberry', 'milk', 'blueberries'], { course: 'Drink', taste: 'Sweet', wild: 0 }, 1);
    expect([drink.layout, drink.ware, drink.base]).toEqual(['glass-drink', 'glass', 'drink:strawberry']);
    // A protein drink is a savoury glass, and says so.
    const steakDrink = pickDish(['steak'], { course: 'Drink', taste: 'Savoury', wild: 0 }, 1);
    expect([steakDrink.ware, steakDrink.base, steakDrink.title]).toEqual(['glass', 'drink:consomme', 'Clear golden consommé']);
  });

  it('cooks one apple into a dish for each course (the fix list, P1)', () => {
    for (const wild of [0, 60, 100]) {
      const tart = pickDish(['apple'], { course: 'Dessert', taste: 'Sweet', wild }, 3);
      const library = (tart.components ?? []).filter((c) => c.part);
      expect(['tart', 'plated-dessert', 'dessert-bowl', 'pancake-stack'], tart.title).toContain(tart.layout);
      expect(library.length + (/^(tart|milk:pancake)/.test(tart.big) ? 1 : 0), tart.title).toBeGreaterThanOrEqual(2);
      expect(tart.base).not.toBe('pool:berry-sauce');
      const juice = pickDish(['apple'], { course: 'Drink', taste: 'Sweet', wild }, 3);
      expect([juice.ware, juice.base, juice.big.split(':')[0]]).toEqual(['glass', 'drink:apple', 'apple']);
    }
    const classic = pickDish(['apple'], { course: 'Dessert', taste: 'Sweet', wild: 0 }, 3);
    expect([classic.layout, classic.title]).toEqual(['tart', 'Apple tart with ice cream']);
    const main = pickDish(['apple'], { course: 'Main', taste: 'Savoury', wild: 0 }, 3);
    expect(main.layout).not.toBe(classic.layout);
  });

  it('makes Wild visible: Wild 0 and 100 differ for the same table', () => {
    const sig = (i: ReturnType<typeof pickDish>) => JSON.stringify([i.layout, i.ware, i.big, (i.components ?? []).map((c) => c.kind).sort(), i.medium.map((m) => readPart(m).form)]);
    let same = 0;
    for (const ids of TABLES) for (const course of COURSES) {
      const a = pickDish(ids, { course, taste: 'Savoury', wild: 0 }, cookSeed(ids, { course, taste: 'Savoury', wild: 0 }));
      const b = pickDish(ids, { course, taste: 'Savoury', wild: 100 }, cookSeed(ids, { course, taste: 'Savoury', wild: 100 }));
      if (sig(a) === sig(b)) same++;
    }
    expect(same).toBe(0);
  });

  it('never puts the berry sauce on every fruit dish', () => {
    const lemon = pickDish(['lemon'], { course: 'Starter', taste: 'Sweet', wild: 0 }, 1);
    const apple = pickDish(['apple'], { course: 'Drink', taste: 'Sweet', wild: 100 }, 1);
    const pepperLime = pickDish(['lime', 'pepper'], { course: 'Dessert', taste: 'Both', wild: 100 }, 1);
    for (const idea of [lemon, apple, pepperLime]) expect(idea.base, idea.title).not.toBe('pool:berry-sauce');
    expect(lemon.title).not.toBe('Lemon');
    expect(lemon.base).toBe('pool:citrus-oil');
  });

  it('cuts pepper and chicken properly (the fix list, P2)', () => {
    for (const { ids, choices, seed } of everyCook()) {
      const idea = pickDish(ids, choices, seed);
      const pieces = piecesOf(idea);
      for (const p of pieces) {
        expect(`${p.ingredient}:${p.form}`).not.toBe('pepper:whole');
        if (p.ingredient === 'chicken' && p.form === 'cube') expect(idea.layout).toBe('soup-bowl');
      }
      for (const p of pieces.filter((q) => q.ingredient === 'pepper' && idea.ware !== 'glass')) expect(p.count, `${idea.title}`).toBeGreaterThanOrEqual(2);
    }
    const bowl = pickDish(['chicken', 'rice'], { course: 'Main', taste: 'Savoury', wild: 0 }, 1);
    expect(bowl.big).toBe('chicken:slice');
  });
});
