import { beforeAll, describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three';
import { composedDish } from './build';
import { cookSeed, pickDish } from './pick';
import { loadPhysics } from '../kit/physics';
import { seedFromId } from '../../ingredients/forms/kit/random';

type Built = { role: string; geometry: BufferGeometry }[];
const points = (pieces: Built) => pieces.map((p) => [p.role, Array.from(p.geometry.getAttribute('position').array as Float32Array)]);

// R10 (the Cook lag): a dish built in slices, pausing between them, is the same dish as one built in one go.
describe('a dish built in slices', () => {
  beforeAll(async () => {
    await loadPhysics();
  });
  const tables: [string[], string, string, number][] = [
    [['baguette', 'broccoli', 'tomato'], 'snack', 'savoury', 0],
    [['steak', 'potato'], 'main', 'savoury', 0],
    [['chicken', 'rice', 'tomato'], 'main', 'savoury', 0],
    [['salmon', 'rice', 'avocado'], 'main', 'savoury', 0],
  ];
  for (const [ids, course, taste, wild] of tables) {
    it(`${ids.join(', ')}: the same pieces, and no slice much over its budget`, () => {
      const choices = { course, taste, wild } as never;
      const idea = pickDish(ids, choices, cookSeed(ids, choices, 0));
      const whole = composedDish(idea);
      const once = (whole.entry.form as (o: object) => Built)({ state: 'whole', seed: seedFromId(whole.entry.spec.id) >>> 0 });
      const dish = composedDish(idea);
      const steps = dish.prebuild!(4);
      let longest = 0;
      let slices = 0;
      for (;;) {
        const t = performance.now();
        const next = steps.next();
        longest = Math.max(longest, performance.now() - t);
        slices++;
        if (next.done) break;
      }
      const sliced = (dish.entry.form as (o: object) => Built)({ state: 'whole', seed: seedFromId(dish.entry.spec.id) >>> 0 });
      expect(points(sliced)).toEqual(points(once));
      expect(slices).toBeGreaterThan(10);
      // (Node, a 4 ms budget: the longest slice left is one physics step or one piece's last pass.)
      expect(longest).toBeLessThan(400);
    }, 120000);
  }
});
