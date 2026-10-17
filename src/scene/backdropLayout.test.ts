import { describe, expect, it } from 'vitest';
import { backdropLayout } from './backdropLayout';

describe('backdropLayout', () => {
  it('keeps every arrangement calm and the light patch on the table', () => {
    for (let v = 0; v <= 100; v++) {
      const b = backdropLayout(v);
      expect(b.horizon).toBeGreaterThanOrEqual(0.28);
      expect(b.horizon).toBeLessThanOrEqual(0.48);
      expect(Math.abs(b.tilt)).toBeLessThanOrEqual(0.12);
      expect(b.patchCentre.y).toBeLessThan(b.horizon);
      expect(b.patchCentre.x).toBeGreaterThanOrEqual(0.15);
      expect(b.patchCentre.x).toBeLessThanOrEqual(0.85);
      expect(b.patchWidth).toBeGreaterThanOrEqual(0.08);
      expect(b.patchWidth).toBeLessThanOrEqual(0.22);
      expect(b.contrast).toBeGreaterThanOrEqual(0);
      expect(b.contrast).toBeLessThanOrEqual(1);
    }
  });

  it('gives the same arrangement for the same value', () => {
    expect(backdropLayout(37)).toEqual(backdropLayout(37));
  });

  it('changes as the slider moves', () => {
    expect(backdropLayout(0)).not.toEqual(backdropLayout(100));
  });
});
