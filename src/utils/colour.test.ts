import { describe, expect, it } from 'vitest';
import { hexToOklch, oklchToHex } from './colour';

describe('hexToOklch', () => {
  it('reads white as light and grey', () => {
    const w = hexToOklch('#ffffff');
    expect(w.l).toBeCloseTo(1, 2);
    expect(w.c).toBeLessThan(0.001);
  });

  it('round-trips through oklchToHex', () => {
    const c = hexToOklch(oklchToHex(0.6, 0.12, 30));
    expect(c.l).toBeCloseTo(0.6, 2);
    expect(c.c).toBeCloseTo(0.12, 2);
    expect(c.h).toBeCloseTo(30, 0);
  });
});
