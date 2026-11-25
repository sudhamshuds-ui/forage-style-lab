import { describe, expect, it } from 'vitest';
import { fitsPlate, planSvg, type Plan } from './kit/plan';
import { SALMON_PLAN } from './forms/salmonPeach';
import { CATALOG } from './catalog';
import { planFills } from './compose/layout';
import { planFor, TRACES } from './compose/traces';

// (Node's file tools and environment, typed here: the project's type-check runs without Node's types.)
declare const process: { env: Record<string, string | undefined> };
const nodeFs = 'node:fs';

/**
 * Every dish's plating plan (its top-view drawing in simple shapes) fits its plate. With
 * WRITE_PLANS=1 the drawings are written to docs/dishes/plans/ (npm run plans), and the composed
 * plans as one JSON file for the Figma page of 2D compositions.
 */
const PLANS: Record<string, { plan: Plan; fills: Record<string, string> }> = {
  'dish-salmon-peach': { plan: SALMON_PLAN, fills: { foam: '#e6ecb4', salmon: '#e8a080', peach: '#e48a3c', lime: '#6aa83a' } },
};
// Traced plans follow their reference, which may let a piece lean over the rim (bread on a bowl,
// a skewer past the board): up to 4 cm; a drink's fruit lies on the table, so drinks are not held to it.
const OVERHANG: Record<string, number> = {};
for (const idea of CATALOG) {
  const composed = planFor(idea);
  PLANS[`dish-${idea.id}`] = { plan: composed.plan, fills: planFills(composed) };
  if (TRACES[idea.id]) OVERHANG[`dish-${idea.id}`] = idea.ware === 'glass' ? Infinity : 4;
}

async function write(path: string, data: string): Promise<void> {
  const fs = (await import(/* @vite-ignore */ nodeFs)) as { writeFileSync: (path: string, data: string) => void };
  fs.writeFileSync(path, data);
}

describe('plating plans', () => {
  it('has a plan for every dish in the catalogue', () => {
    expect(Object.keys(PLANS).length).toBe(CATALOG.length + 1);
  });
  for (const [id, { plan, fills }] of Object.entries(PLANS)) {
    it(`${id} fits its plate`, async () => {
      expect(fitsPlate(plan, OVERHANG[id] ?? 0), id).toBe(true);
      const svg = planSvg(plan, fills);
      expect(svg).toContain('<svg');
      if (process.env.WRITE_PLANS) await write(`docs/dishes/plans/${id}.svg`, svg);
    });
  }
  it('writes the plans for Figma', async () => {
    if (!process.env.WRITE_PLANS) return;
    const all = CATALOG.map((idea) => ({ id: idea.id, ...PLANS[`dish-${idea.id}`] }));
    await write('docs/dishes/plans/catalog-plans.json', JSON.stringify(all));
  });
});
