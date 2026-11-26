import { describe, expect, it } from 'vitest';
import { REGISTRY } from '../../ingredients/registry';
import { TRAITS } from '../../ingredients/traits';
import { DEFAULT_CHOICES } from '../../kitchen/panel';
import { LAYOUTS } from './layouts';
import { readPart } from './layout';
import { cookSeed, pickDish, type CookChoices } from './pick';
import { VESSEL_LAYOUTS, WORLD_DISHES, renderable } from './world';
import { BASE_FAMILY, makeElement } from './elements';
import { seededRandom } from '../../ingredients/forms/kit/random';

/** The world dish library's acceptance checks (world-dishes-brief.md, section 6). */
const cook = (ids: string[], choices: CookChoices, attempt = 0) => pickDish(ids, choices, cookSeed(ids, choices, attempt));
const pieces = (idea: ReturnType<typeof pickDish>) => [idea.big, ...idea.medium, ...idea.small].map(readPart);

describe('world dish library', () => {
  it('has clean data: short one-line names, no dashes, known ingredients and layouts (6.1)', () => {
    const pantry = new Set(REGISTRY.map((entry) => entry.spec.id));
    const layouts = new Set<string>(LAYOUTS.map((l) => l.id));
    for (const dish of WORLD_DISHES) {
      expect(dish.name.length, dish.name).toBeLessThanOrEqual(32);
      expect(dish.name + dish.blurb, dish.id).not.toMatch(/[—–]/);
      expect(['starter', 'main', 'dessert', 'snack', 'drink']).toContain(dish.course);
      expect(['savoury', 'sweet', 'both']).toContain(dish.taste);
      for (const id of [...dish.heroes, ...dish.coreIngredients]) expect(pantry.has(id), `${dish.id}: ${id}`).toBe(true);
      expect(layouts.has(dish.layout), `${dish.id}: ${dish.layout}`).toBe(true);
    }
  });

  it('cooks every pantry ingredient alone into a named dish (6.2)', () => {
    // A world dish wherever the library has one this table may legally be (the user's rules win: a
    // Main is never a salad, so apple alone as a savoury Main is a template dish); never a bare name.
    let world = 0;
    for (const id of Object.keys(TRAITS)) {
      const idea = cook([id], DEFAULT_CHOICES);
      if (idea.world) world++;
      expect(idea.title.toLowerCase(), id).not.toBe(id);
      expect(idea.title.split(/\s+/).length, idea.title).toBeGreaterThanOrEqual(idea.world ? 1 : 3);
    }
    // (Fewer since the looks notes: a dish the renderer cannot paint as it looks is refused, and a
    // single ingredient rarely shows everything a dish's minimum to claim its name asks for.)
    expect(world).toBeGreaterThanOrEqual(10);
  });

  it('matches the key combinations (6.3)', () => {
    expect(cook(['watermelon', 'cheese'], { course: 'Starter', taste: 'Both', wild: 0 }).title).toBe('Gibna wa Bateeikh');
    // (At Classic the brief's scoring prefers the Italian omelette; the Persian dish leads at Unhinged.)
    expect([0, 50, 100].flatMap((wild) => [0, 1, 2].map((n) => cook(['spinach', 'eggs'], { course: 'Main', taste: 'Savoury', wild }, n).title))).toContain('Nargesi Esfenaj');
    // (The hand-authored note's minimum to claim the name: smashed avocado, tomato and lime.)
    const guac = cook(['avocado', 'tomato', 'lime'], { course: 'Starter', taste: 'Savoury', wild: 0 });
    expect(guac.title).toBe('Mexican Guacamole');
    expect(pieces(guac).some((p) => p.ingredient === 'avocado' && ['half', 'pit'].includes(p.form))).toBe(false);
    // Tomato and bread: Salmorejo ties for first (with two toasts); a step out reaches it within a few
    // presses, a soup in the deep bowl with the table's bread in it (bread only when chosen, rule A).
    const soups = [0, 1, 2, 3, 4, 5].map((n) => cook(['tomato', 'baguette', 'eggs'], { course: 'Starter', taste: 'Savoury', wild: 50 }, n));
    // (The note's minimum to claim the name includes its egg garnish.)
    const tomatoBread = soups.find((idea) => idea.layout === 'soup-bowl')!;
    expect(tomatoBread?.title).toBe('Cordoban Salmorejo');
    expect(pieces(tomatoBread).some((p) => p.ingredient === 'baguette')).toBe(true);
    const pancakes = cook(['blueberries', 'milk'], { course: 'Dessert', taste: 'Sweet', wild: 0 });
    expect([pancakes.title, pancakes.layout]).toEqual(['Blueberry Pancakes', 'pancake-stack']);
    expect(pancakes.sauce).not.toBe('pool:berry-sauce');
    const cider = cook(['apple'], { course: 'Drink', taste: 'Sweet', wild: 0 });
    expect([cider.title, cider.ware]).toEqual(['Spiced Apple Cider', 'glass']);
  });

  it('lets Wild choose another dish (6.4)', () => {
    for (const ids of [['watermelon', 'salmon', 'onion'], ['chicken', 'rice']]) {
      const a = cook(ids, { course: 'Main', taste: 'Savoury', wild: 0 });
      const b = cook(ids, { course: 'Main', taste: 'Savoury', wild: 100 });
      expect(a.title, ids.join('+')).not.toBe(b.title);
    }
  });

  it('keeps every table ingredient, whatever the dish (2.3)', () => {
    const ids = Object.keys(TRAITS);
    let seen = 0;
    for (let i = 0; i < 400; i++) {
      const table = [ids[(i * 7) % ids.length], ids[(i * 13 + 5) % ids.length], ids[(i * 29 + 11) % ids.length]].filter((id, k, all) => all.indexOf(id) === k);
      const choices = { course: ['Starter', 'Main', 'Dessert', 'Snack', 'Drink'][i % 5], taste: ['Savoury', 'Sweet', 'Both'][i % 3], wild: [0, 40, 100][i % 3] };
      const idea = cook(table, choices);
      if (idea.world) seen++;
      const used = new Set(pieces(idea).map((p) => p.ingredient));
      for (const id of table) expect(used.has(id) || idea.blended?.includes(id), `${table} ${JSON.stringify(choices)}: ${idea.title} lost ${id}`).toBe(true);
    }
    expect(seen).toBeGreaterThan(150);
  });

  it('renders every choosable world dish as its looks note says (Group 1c)', () => {
    const failing: string[] = [];
    let checked = 0;
    for (const dish of WORLD_DISHES.filter(renderable)) {
      const table = dish.heroes.filter((id) => TRAITS[id]);
      const choices = { course: cap(dish.course), taste: cap(dish.taste), wild: 0 };
      const idea = pickDish(table, choices, cookSeed(table, choices), { world: dish.id });
      checked++;
      const looks = dish.looks;
      const problems: string[] = [];
      if (!VESSEL_LAYOUTS[looks.vessel].includes(idea.layout!)) problems.push(`vessel ${looks.vessel} but layout ${idea.layout}`);
      if (looks.base) {
        const family = idea.baseFamily ?? BASE_FAMILY[idea.base];
        if (family !== looks.base.family) problems.push(`base ${looks.base.family} but ${family}`);
        if (idea.base === 'none' && idea.ware !== 'deep') problems.push(`base ${looks.base.texture} but none painted`);
      }
      const shown = pieces(idea);
      for (const want of looks.pieces) {
        if (!table.includes(want.ingredient) || idea.blended?.includes(want.ingredient)) continue;
        if (!shown.some((p) => p.ingredient === want.ingredient && p.form === want.shape)) problems.push(`${want.ingredient} ${want.shape} but ${shown.filter((p) => p.ingredient === want.ingredient).map((p) => p.form).join('/') || 'none'}`);
      }
      for (const word of looks.never) if (shown.some((p) => p.ingredient === word)) problems.push(`shows ${word}`);
      if (problems.length) failing.push(`${dish.id}: ${problems.join('; ')}`);
    }
    expect(checked).toBeGreaterThan(150);
    expect(failing, failing.join('\n')).toEqual([]);
  });

  it('can build every piece shape a looks note asks for', () => {
    const shapes = new Set(WORLD_DISHES.filter(renderable).flatMap((d) => d.looks.pieces.map((p) => `${p.ingredient}:${p.shape}`)));
    for (const key of shapes) {
      const [ingredient, form] = key.split(':');
      expect(() => makeElement({ ingredient, form, count: 1 } as never, seededRandom(1), 1), key).not.toThrow();
    }
  }, 120000);

  it('refuses the dishes the renderer cannot paint (honest names)', () => {
    for (const id of ['adjaruli-khachapuri', 'austrian-kaiserschmarrn', 'creme-brulee']) expect(renderable(WORLD_DISHES.find((d) => d.id === id)!), id).toBe(false);
    for (const id of ['palak-paneer', 'persian-doogh']) expect(renderable(WORLD_DISHES.find((d) => d.id === id)!), id).toBe(true);
    const palak = pickDish(['spinach', 'cheese'], { course: 'Main', taste: 'Savoury', wild: 0 }, 1, { world: 'palak-paneer' });
    expect(palak.baseFamily).toBe('green-gravy');
    expect(pieces(palak).some((p) => p.ingredient === 'cheese' && p.form === 'cube')).toBe(true);
    const doogh = pickDish(['milk', 'lemon'], { course: 'Drink', taste: 'Savoury', wild: 0 }, 1, { world: 'persian-doogh' });
    expect(doogh.description).not.toMatch(/vanilla|milkshake/i);
  });
});

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
