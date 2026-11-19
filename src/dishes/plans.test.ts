import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { fitsPlate, planSvg, type Plan } from './kit/plan';
import { SALMON_PLAN } from './forms/salmonPeach';

/**
 * Every dish's plating plan (its top-view drawing in simple shapes) fits its plate. With
 * WRITE_PLANS=1 the drawings are written to docs/dishes/plans/ (npm run plans).
 */
const PLANS: Record<string, Plan> = { 'dish-salmon-peach': SALMON_PLAN };

describe('plating plans', () => {
  for (const [id, plan] of Object.entries(PLANS)) {
    it(`${id} fits its plate`, () => {
      expect(fitsPlate(plan)).toBe(true);
      const svg = planSvg(plan, { foam: '#e6ecb4', salmon: '#e8a080', peach: '#e48a3c', lime: '#6aa83a' });
      expect(svg).toContain('<svg');
      if (process.env.WRITE_PLANS) writeFileSync(`docs/dishes/plans/${id}.svg`, svg);
    });
  }
});
