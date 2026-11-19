import { describe, expect, it } from 'vitest';
import { fitsPlate, planSvg, type Plan } from './kit/plan';
import { SALMON_PLAN } from './forms/salmonPeach';

// (Node's file tools and environment, typed here: the project's type-check runs without Node's types.)
declare const process: { env: Record<string, string | undefined> };
const nodeFs = 'node:fs';

/**
 * Every dish's plating plan (its top-view drawing in simple shapes) fits its plate. With
 * WRITE_PLANS=1 the drawings are written to docs/dishes/plans/ (npm run plans).
 */
const PLANS: Record<string, Plan> = { 'dish-salmon-peach': SALMON_PLAN };

describe('plating plans', () => {
  for (const [id, plan] of Object.entries(PLANS)) {
    it(`${id} fits its plate`, async () => {
      expect(fitsPlate(plan)).toBe(true);
      const svg = planSvg(plan, { foam: '#e6ecb4', salmon: '#e8a080', peach: '#e48a3c', lime: '#6aa83a' });
      expect(svg).toContain('<svg');
      if (process.env.WRITE_PLANS) {
        const fs = (await import(/* @vite-ignore */ nodeFs)) as { writeFileSync: (path: string, data: string) => void };
        fs.writeFileSync(`docs/dishes/plans/${id}.svg`, svg);
      }
    });
  }
});
