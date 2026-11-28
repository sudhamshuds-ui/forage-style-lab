import { describe, expect, it } from 'vitest';
import { ROAST_RAMP, roastAt, roastHex } from './roastRamp';
import { hexToOklch } from '../utils/colour';

// R10: one roast ramp for every browning, vibrant all the way: golden, orange, caramel, red-brown.
describe('the roast ramp', () => {
  it('every stop has chroma 0.12 or more and a warm hue (40 to 75 degrees)', () => {
    for (const [, a, b] of ROAST_RAMP) {
      expect(Math.hypot(a, b)).toBeGreaterThanOrEqual(0.12);
      const hue = (Math.atan2(b, a) * 180) / Math.PI;
      expect(hue).toBeGreaterThanOrEqual(40);
      expect(hue).toBeLessThanOrEqual(75);
    }
  });

  it('gets strictly darker from golden to red-brown', () => {
    for (let i = 1; i < ROAST_RAMP.length; i++) expect(ROAST_RAMP[i][0]).toBeLessThan(ROAST_RAMP[i - 1][0]);
  });

  it('stays warm and saturated between the stops too, and its colours are in gamut', () => {
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const [, a, b] = roastAt(t);
      expect(Math.hypot(a, b)).toBeGreaterThanOrEqual(0.12);
      const { c, h } = hexToOklch(roastHex(t));
      expect(c).toBeGreaterThan(0.1);
      expect(h).toBeGreaterThan(35);
      expect(h).toBeLessThan(80);
    }
  });
});
