import { beforeAll, describe, expect, it } from 'vitest';
import { TRAITS } from '../../ingredients/traits';
import { seededRandom } from '../../ingredients/forms/kit/random';
import { loadPhysics } from '../kit/physics';
import { LAST_QA, composedDish } from './build';
import { cookSeed, pickDish } from './pick';
import type { FormBuilder } from '../../ingredients/forms/kit/piece';

declare const process: { env: Record<string, string | undefined> };
const nodeFs = 'node:fs';

/**
 * The world dish plating QA (world-dishes-brief.md 6.5): 50 random cooks that land on a world dish,
 * built with real physics: nothing apart, floating, towering (a pancake stack is the one allowed
 * stack) or lost, and the widest gap at most 0.5 cm. WRITE_QA=1 writes docs/dishes/qa-world.md.
 */
describe('world dish plating QA', () => {
  beforeAll(async () => {
    await loadPhysics();
  });

  it('plates 50 random world dishes cleanly', () => {
    const ids = Object.keys(TRAITS);
    const random = seededRandom(20261125);
    const rows: string[] = [];
    const failing: string[] = [];
    let built = 0;
    for (let tries = 0; built < 50 && tries < 400; tries++) {
      const n = 1 + Math.floor(random() * 3);
      const table = [...new Set(Array.from({ length: n }, () => ids[Math.floor(random() * ids.length)]))];
      const choices = { course: ['Starter', 'Main', 'Dessert', 'Snack', 'Drink'][Math.floor(random() * 5)], taste: ['Savoury', 'Sweet', 'Both'][Math.floor(random() * 3)], wild: Math.floor(random() * 101) };
      const idea = pickDish(table, choices, cookSeed(table, choices));
      if (!idea.world) continue;
      built++;
      (composedDish(idea).entry.form as FormBuilder)({ state: 'whole', seed: 3 });
      const qa = LAST_QA.get(idea.id)!;
      const missing = table.filter((id) => !qa.served?.includes(id) && !idea.blended?.includes(id));
      const problems = [
        missing.length ? `missing ${missing.join(', ')}` : '',
        qa.apart ? `${qa.apart} apart` : '',
        qa.floating ? `${qa.floating} floating` : '',
        qa.towering ? `${qa.towering} towering` : '',
        qa.lost ? `${qa.lost} lost` : '',
        qa.widestGap > 0.5 ? `gap ${qa.widestGap.toFixed(2)} cm` : '',
      ].filter(Boolean);
      const name = `${table.join(' + ')} (${choices.course}, ${choices.taste}, wild ${choices.wild})`;
      if (problems.length) failing.push(`${name} ${idea.title}: ${problems.join(', ')}`);
      rows.push(`| ${name} | ${idea.title} | ${idea.world.cuisine} | ${idea.layout} | ${qa.widestGap.toFixed(2)} | ${problems.length ? problems.join(', ') : 'pass'} |`);
    }
    if (process.env.WRITE_QA) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return import(/* @vite-ignore */ nodeFs).then((fs: { writeFileSync: (p: string, d: string) => void }) => {
        fs.writeFileSync('docs/dishes/qa-world.md', ['# World dish plating QA', '', `${built - failing.length} of ${built} pass (apart, floating, towering, lost: 0; widest gap at most 0.5 cm).`, '', '| Table | Dish | Cuisine | Layout | Widest gap | Result |', '|---|---|---|---|---|---|', ...rows, ''].join('\n'));
        expect(failing, failing.join('\n')).toEqual([]);
      });
    }
    expect(built).toBe(50);
    expect(failing, failing.join('\n')).toEqual([]);
  }, 1800000);
});
