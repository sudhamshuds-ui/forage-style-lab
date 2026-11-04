import { describe, expect, it } from 'vitest';
import { Box3, type BufferAttribute } from 'three';
import { buildBroccoli } from './broccoli';
import { seedFromId } from './kit/random';
import { cmToUnits } from '../scale';

describe('broccoli lying down', () => {
  const pieces = buildBroccoli({ state: 'whole', seed: seedFromId('broccoli') });
  const lowest = (index: number) => new Box3().setFromBufferAttribute(pieces[index].geometry.getAttribute('position') as BufferAttribute).min.y;

  it('rests on the table with both its crown and its cut stalk end (never floating)', () => {
    expect(lowest(0)).toBeCloseTo(0, 5); // the crown
    expect(lowest(1)).toBeLessThan(cmToUnits(0.05)); // the trunk's cut end
  });

  it('nothing dips below the table', () => {
    for (let i = 0; i < pieces.length; i++) expect(lowest(i), pieces[i].role).toBeGreaterThanOrEqual(-1e-6);
  });
});
