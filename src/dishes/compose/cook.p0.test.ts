import { beforeAll, describe, expect, it } from 'vitest';
import { LAST_QA, composedDish } from './build';
import { loadPhysics } from '../kit/physics';
import { cookSeed, pickDish, type CookChoices } from './pick';
import { readPart } from './layout';
import type { FormBuilder } from '../../ingredients/forms/kit/piece';

/**
 * The P0 list (the user's artifact test, 2026-11-25), built with real physics, three presses each:
 * every table ingredient ends on the plate (as a piece or cooked into the base), nothing floats, and
 * a rice bowl, a drink or a soup loses nothing.
 */
const FIXTURE: [string[], CookChoices][] = [
  [['avocado'], { course: 'Main', taste: 'Savoury', wild: 60 }],
  [['avocado'], { course: 'Snack', taste: 'Savoury', wild: 0 }],
  [['avocado', 'tomato'], { course: 'Snack', taste: 'Savoury', wild: 60 }],
  [['tomato', 'pepper'], { course: 'Main', taste: 'Savoury', wild: 60 }],
  [['tomato', 'milk'], { course: 'Starter', taste: 'Savoury', wild: 60 }],
  [['chicken', 'rice'], { course: 'Main', taste: 'Savoury', wild: 0 }],
  [['chicken', 'rice'], { course: 'Main', taste: 'Savoury', wild: 100 }],
  [['strawberry'], { course: 'Drink', taste: 'Sweet', wild: 60 }],
  [['apple'], { course: 'Drink', taste: 'Sweet', wild: 100 }],
  [['potato', 'onion', 'milk'], { course: 'Starter', taste: 'Savoury', wild: 10 }],
  [['tomato', 'onion'], { course: 'Starter', taste: 'Savoury', wild: 0 }],
];

describe('the P0 list, built', () => {
  beforeAll(async () => {
    await loadPhysics();
  });

  it('serves every table ingredient, floats nothing, loses nothing in bowls, glasses and soups', () => {
    const failing: string[] = [];
    for (const [ids, choices] of FIXTURE)
      for (const attempt of [0, 1, 2]) {
        const idea = pickDish(ids, choices, cookSeed(ids, choices, attempt));
        (composedDish(idea).entry.form as FormBuilder)({ state: 'whole', seed: 3 });
        const qa = LAST_QA.get(idea.id)!;
        const missing = ids.filter((id) => !qa.served?.includes(id) && !idea.blended?.includes(id));
        const vessel = ['rice-bowl', 'glass-drink', 'soup-bowl'].includes(idea.layout!);
        const avocadoHalf = [idea.big, ...idea.medium, ...idea.small].map(readPart).some((p) => p.ingredient === 'avocado' && p.form === 'half');
        const problems = [
          missing.length ? `missing ${missing.join(', ')}` : '',
          qa.floating ? `${qa.floating} floating` : '',
          vessel && qa.lost ? `${qa.lost} lost` : '',
          avocadoHalf ? 'avocado half' : '',
        ].filter(Boolean);
        if (problems.length) failing.push(`${ids.join(' + ')} ${choices.course} wild ${choices.wild} #${attempt} (${idea.layout}, ${idea.title}): ${problems.join(', ')}`);
      }
    expect(failing, failing.join('\n')).toEqual([]);
  }, 900000);
});
