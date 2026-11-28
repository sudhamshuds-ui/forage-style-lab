import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three';
import { REGISTRY } from '../../registry';
import { SURFACE_NETS } from './surfaceNets';
import { composedDish } from '../../../dishes/compose/build';
import { pickDish, cookSeed } from '../../../dishes/compose/pick';

/** Every mesh's points, in order. */
function points(geometries: BufferGeometry[]): number[] {
  const out: number[] = [];
  for (const g of geometries) out.push(...(g.getAttribute('position').array as Float32Array));
  return out;
}

function both(build: () => BufferGeometry[]): [number[], number[]] {
  SURFACE_NETS.narrowBand = false;
  const exact = points(build());
  SURFACE_NETS.narrowBand = true;
  return [exact, points(build())];
}

// R10 (the Cook lag): the coarse pass only skips reading the field far from the surface, so every
// mesh comes out the same, point for point.
describe('surface nets, read near the surface only', () => {
  it('builds every pantry ingredient exactly as reading every point did', () => {
    for (const entry of REGISTRY) {
      if (typeof entry.form !== 'function') continue;
      const form = entry.form as (o: object) => { geometry: BufferGeometry }[];
      const [exact, banded] = both(() => form({ state: 'whole', seed: 7 }).map((p) => p.geometry));
      expect(banded.length, entry.spec.id).toBe(exact.length);
      expect(banded, entry.spec.id).toEqual(exact);
    }
  }, 300000);

  it('builds the composed dishes exactly as before (no physics: the height map)', () => {
    const tables: [string[], string, string, number][] = [
      [['baguette', 'broccoli', 'tomato'], 'snack', 'savoury', 0],
      [['steak', 'potato'], 'main', 'savoury', 0],
      [['chicken', 'rice', 'tomato'], 'main', 'savoury', 0],
      [['salmon', 'pepper', 'avocado'], 'snack', 'savoury', 0],
      [['potato', 'milk', 'onion'], 'starter', 'savoury', 0],
    ];
    for (const [ids, course, taste, wild] of tables) {
      const choices = { course, taste, wild } as never;
      const idea = pickDish(ids, choices, cookSeed(ids, choices, 0));
      const [exact, banded] = both(() => (composedDish(idea).entry.form as (o: object) => { geometry: BufferGeometry }[])({ state: 'whole', seed: 1 }).map((p) => p.geometry));
      expect(banded, idea.title).toEqual(exact);
    }
  }, 300000);
});
