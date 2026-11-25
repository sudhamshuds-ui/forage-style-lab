import { describe, expect, it } from 'vitest';
import { TRAITS } from '../../ingredients/traits';
import { BASE_FAMILY, SKEWERS } from './elements';
import { readPart } from './layout';
import { cookSeed, pickDish, type CookChoices } from './pick';

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

describe('pickDish', () => {
  it('always cooks a dish the composer can build', () => {
    for (const { ids, choices, seed } of everyCook()) {
      const idea = pickDish(ids, choices, seed);
      const where = `${ids.join('+')} ${choices.course} ${choices.taste} ${choices.wild}`;
      expect(idea.layout, where).toBeDefined();
      for (const p of piecesOf(idea)) {
        const allowed = Object.values(TRAITS[p.ingredient]?.forms ?? {}).flat();
        expect(allowed, `${where}: ${p.ingredient}:${p.form}`).toContain(p.form);
        expect(p.count, where).toBeGreaterThan(0);
      }
      const ok = idea.base === 'none' || idea.base === 'rice' || idea.base === 'drink:milk' || idea.base in BASE_FAMILY;
      expect(ok, `${where}: base ${idea.base}`).toBe(true);
      expect(idea.title, where).not.toMatch(/—/);
      expect(idea.description, where).not.toMatch(/—/);
    }
  });

  it('puts every table ingredient in the dish, and only table ingredients in heroes', () => {
    for (const { ids, choices, seed } of everyCook()) {
      const idea = pickDish(ids, choices, seed);
      const where = `${ids.join('+')} ${choices.course} ${choices.taste} ${choices.wild}`;
      for (const h of idea.heroes) expect(ids, where).toContain(h);
      const used = new Set(piecesOf(idea).map((p) => p.ingredient));
      const base = idea.base.split(':')[1] ?? idea.base;
      for (const p of piecesOf(idea)) if (p.form === 'skewer') for (const bead of SKEWERS[p.ingredient]) used.add(bead.ingredient);
      for (const id of ids) {
        const inBase =
          base === id || idea.base === id || (id === 'sauce' && idea.base.startsWith('pool:')) || (id === 'butter' && idea.base === 'pool:brown-butter') ||
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
      if (ids.includes('romaine') && !ids.includes('rice')) expect(idea.base).toBe('leaves:romaine');
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
    const steakDrink = pickDish(['steak'], { course: 'Drink', taste: 'Savoury', wild: 0 }, 1);
    expect(steakDrink.ware).not.toBe('glass');
  });
});
