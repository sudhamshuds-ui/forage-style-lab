import { beforeAll, describe, expect, it } from 'vitest';
import { CATALOG } from '../catalog';
import { LAST_QA, composedDish } from './build';
import { loadPhysics } from '../kit/physics';
import type { FormBuilder } from '../../ingredients/forms/kit/piece';

// (Node's file tools and environment, typed here: the project's type-check runs without Node's types.)
declare const process: { env: Record<string, string | undefined> };
const nodeFs = 'node:fs';

/**
 * The QA passes the user asked for on every round (2026-11-22, DESIGN.md): cohesion (no piece
 * standing apart) and physics (nothing floating, nothing passing through, everything at rest).
 * The third, painting, is checked by eye against the pantry's apple and orange.
 * With WRITE_QA=1 the table is written to docs/dishes/qa.md (npm run qa).
 */
describe('dish QA', () => {
  beforeAll(async () => {
    await loadPhysics();
  });

  it('every composed dish passes cohesion and physics', async () => {
    const rows: string[] = [];
    const failing: string[] = [];
    for (const idea of CATALOG) {
      (composedDish(idea).entry.form as FormBuilder)({ state: 'whole', seed: 3 });
      const qa = LAST_QA.get(idea.id)!;
      const problems = [
        qa.apart ? `${qa.apart} apart` : '',
        qa.floating ? `${qa.floating} floating` : '',
        qa.loose ? `${qa.loose} loose on the table` : '',
        qa.deepest > 1 ? `overlap ${qa.deepest.toFixed(1)} cm` : '',
        qa.restless ? `${qa.restless} moving` : '',
        qa.lost ? `${qa.lost} lost` : '',
      ].filter(Boolean);
      if (problems.length) failing.push(`${idea.id}: ${problems.join(', ')}`);
      rows.push(`| ${idea.id} | ${qa.widestGap.toFixed(1)} | ${qa.apart} | ${qa.floating} | ${qa.deepest.toFixed(2)} | ${qa.restless} | ${problems.length ? problems.join(', ') : 'pass'} |`);
    }
    if (process.env.WRITE_QA) {
      const fs = (await import(/* @vite-ignore */ nodeFs)) as { writeFileSync: (path: string, data: string) => void };
      fs.writeFileSync(
        'docs/dishes/qa.md',
        `# Dish QA (cohesion and physics)\n\nWritten by \`npm run qa\`. Widest gap: cm from a piece to its nearest neighbour, seen from above. Apart: pieces more than 1 cm from any other. Floating: pieces touching nothing. Overlap: the deepest a piece sits inside another (cm; over 1 cm counts as a problem). Moving: pieces not at rest.\n\n${failing.length} of ${CATALOG.length} dishes have a problem.\n\n| Dish | Widest gap | Apart | Floating | Overlap | Moving | Result |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`,
      );
    }
    expect(failing, failing.join('\n')).toEqual([]);
  }, 900000);
});
