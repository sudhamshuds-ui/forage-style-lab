import { describe, expect, it } from 'vitest';
import { seededRandom } from './kit/random';
import { isHeld, settlePile } from './blueberries';

describe('blueberry pile', () => {
  // A berry up in the pile held on one side only looks as if it should roll off (the user,
  // 2026-11-12). Every berry is on the table or held from below on every side, for many seeds.
  it.each([0, 1, 7, 42, 1234, 99999])('holds every berry in balance (seed %i)', (seed) => {
    const berries = settlePile(seededRandom(seed ^ 0xb1e0b));
    const shaky = berries.filter((b) => !isHeld(b, berries));
    expect(shaky.length).toBe(0);
  });
});
