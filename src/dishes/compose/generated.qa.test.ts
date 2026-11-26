import { beforeAll, describe, expect, it } from 'vitest';
import { LAST_QA, composedDish } from './build';
import { loadPhysics } from '../kit/physics';
import { cookSeed, pickDish, type CookChoices } from './pick';
import type { FormBuilder } from '../../ingredients/forms/kit/piece';

declare const process: { env: Record<string, string | undefined> };
const nodeFs = 'node:fs';

/**
 * QA for the Kitchen's generated dishes (the composable dishes spec, step 6): a fixture of tables and
 * cooking choices, each cooked with pickDish, built with real physics and held to the tighter
 * contract: nothing apart, floating, overlapping more than 1 cm, moving or lost; the widest gap at
 * most 0.5 cm; one centre (every piece near the hero); at least 70% of the garnish over food.
 * With WRITE_QA=1 the table is written to docs/dishes/qa-generated.md (npm run qa:generated).
 */
const FIXTURE: [string[], CookChoices][] = [
  // The six combos from the test session's screenshots (the fix list, 2026-11-25).
  [['pepper', 'avocado', 'salmon'], { course: 'Snack', taste: 'Savoury', wild: 60 }],
  [['sauce', 'cheese'], { course: 'Main', taste: 'Savoury', wild: 60 }],
  [['lemon'], { course: 'Starter', taste: 'Sweet', wild: 0 }],
  [['lime', 'pepper'], { course: 'Dessert', taste: 'Both', wild: 100 }],
  [['chicken', 'rice'], { course: 'Main', taste: 'Savoury', wild: 0 }],
  [['apple'], { course: 'Drink', taste: 'Sweet', wild: 100 }],
  // One apple through every course.
  [['apple'], { course: 'Starter', taste: 'Sweet', wild: 60 }],
  [['apple'], { course: 'Main', taste: 'Savoury', wild: 60 }],
  [['apple'], { course: 'Dessert', taste: 'Sweet', wild: 0 }],
  [['apple'], { course: 'Snack', taste: 'Sweet', wild: 60 }],
  // The extras the fix list names.
  [['lime', 'garlic', 'sauce'], { course: 'Main', taste: 'Savoury', wild: 60 }],
  [['romaine'], { course: 'Main', taste: 'Savoury', wild: 60 }],
  [['pepper', 'lime'], { course: 'Main', taste: 'Savoury', wild: 60 }],
  // The earlier set (kept: they cover the other layouts).
  [['steak', 'potato', 'garlic'], { course: 'Main', taste: 'Savoury', wild: 0 }],
  [['salmon', 'rice', 'avocado'], { course: 'Main', taste: 'Savoury', wild: 20 }],
  [['baguette', 'avocado', 'tomato'], { course: 'Snack', taste: 'Savoury', wild: 10 }],
  [['steak', 'romaine', 'tomato'], { course: 'Starter', taste: 'Savoury', wild: 20 }],
  [['eggs', 'tomato', 'pepper'], { course: 'Main', taste: 'Savoury', wild: 20 }],
  [['chicken', 'grapes', 'pepper'], { course: 'Main', taste: 'Savoury', wild: 50 }],
  [['potato', 'salmon', 'onion'], { course: 'Starter', taste: 'Savoury', wild: 10 }],
  [['peach', 'milk', 'strawberry'], { course: 'Dessert', taste: 'Sweet', wild: 20 }],
  [['potato', 'onion', 'milk'], { course: 'Starter', taste: 'Savoury', wild: 10 }],
  [['strawberry', 'milk', 'blueberries'], { course: 'Drink', taste: 'Sweet', wild: 30 }],
  [['broccoli', 'cheese', 'milk'], { course: 'Main', taste: 'Savoury', wild: 20 }],
  [['chicken', 'lemon', 'spinach'], { course: 'Main', taste: 'Savoury', wild: 30 }],
  [['steak'], { course: 'Main', taste: 'Savoury', wild: 100 }],
];

describe('generated dish QA', () => {
  beforeAll(async () => {
    await loadPhysics();
  });

  it('every generated dish passes the tighter cohesion and physics contract', async () => {
    const rows: string[] = [];
    const failing: string[] = [];
    for (const [ids, choices] of FIXTURE) {
      const idea = pickDish(ids, choices, cookSeed(ids, choices));
      (composedDish(idea).entry.form as FormBuilder)({ state: 'whole', seed: 3 });
      const qa = LAST_QA.get(idea.id)!;
      const garnish = qa.garnishOnFood ?? 1;
      const missing = ids.filter((id) => !qa.served?.includes(id) && !idea.blended?.includes(id));
      const problems = [
        missing.length ? `missing ${missing.join(', ')}` : '',
        qa.apart ? `${qa.apart} apart` : '',
        qa.widestGap > 0.5 ? `gap ${qa.widestGap.toFixed(1)} cm` : '',
        qa.floating ? `${qa.floating} floating` : '',
        qa.loose ? `${qa.loose} loose on the table` : '',
        qa.deepest > 1 ? `overlap ${qa.deepest.toFixed(1)} cm` : '',
        qa.restless ? `${qa.restless} moving` : '',
        qa.lost ? `${qa.lost} lost` : '',
        qa.offCentre ? `${qa.offCentre} off centre` : '',
        qa.towering ? `${qa.towering} towering` : '',
        garnish < 0.7 ? `garnish ${Math.round(garnish * 100)}% on food` : '',
      ].filter(Boolean);
      const name = `${ids.join(' + ')} (${choices.course}, ${choices.taste}, wild ${choices.wild})`;
      if (problems.length) failing.push(`${name}: ${problems.join(', ')}`);
      rows.push(`| ${name} | ${idea.layout} | ${idea.title} | ${qa.widestGap.toFixed(2)} | ${qa.floating} | ${qa.deepest.toFixed(2)} | ${qa.restless} | ${qa.offCentre ?? 0} | ${qa.towering ?? 0} | ${Math.round(garnish * 100)}% | ${problems.length ? problems.join(', ') : 'pass'} |`);
    }
    if (process.env.WRITE_QA) {
      const fs = (await import(/* @vite-ignore */ nodeFs)) as { writeFileSync: (path: string, data: string) => void };
      fs.writeFileSync(
        'docs/dishes/qa-generated.md',
        [
          '# Generated dish QA (the Kitchen\'s Cook)',
          '',
          'Written by `npm run qa:generated`. Each row is a table of ingredients and cooking choices, cooked by `pickDish` and built with physics. The contract (the composable dishes spec): widest gap at most 0.5 cm, nothing floating, overlap at most 1 cm, nothing moving or lost, nothing towering or on its edge, every piece near the hero (off centre 0), at least 70% of the garnish over food or its pool.',
          '',
          `${FIXTURE.length - failing.length} of ${FIXTURE.length} pass.`,
          '',
          '| Table | Layout | Dish | Widest gap | Floating | Overlap | Moving | Off centre | Towering | Garnish on food | Result |',
          '|---|---|---|---|---|---|---|---|---|---|---|',
          ...rows,
          '',
        ].join('\n'),
      );
    }
    expect(failing, failing.join('\n')).toEqual([]);
  }, 1800000);
});
