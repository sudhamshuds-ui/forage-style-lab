import { describe, expect, it } from 'vitest';
import { backdropLayout } from './backdropLayout';

describe('backdropLayout', () => {
  it('keeps every arrangement calm, with the window light around the apple', () => {
    for (let v = 0; v <= 100; v++) {
      const b = backdropLayout(v);
      // Distances are in apple radii, so the patch always reaches the apple and its shadow.
      expect(b.patchOffset).toBeGreaterThanOrEqual(0.3);
      expect(b.patchOffset).toBeLessThanOrEqual(1.2);
      expect(b.patchLength).toBeGreaterThanOrEqual(2.5);
      expect(b.patchLength).toBeLessThanOrEqual(4.5);
      expect(b.patchWidth).toBeGreaterThanOrEqual(1.6);
      expect(b.patchWidth).toBeLessThanOrEqual(2.6);
      expect(Math.abs(b.patchTurn)).toBeLessThanOrEqual(0.35);
      expect(b.contrast).toBeGreaterThanOrEqual(0);
      expect(b.contrast).toBeLessThanOrEqual(1);
      expect(b.slabShift).toBeGreaterThanOrEqual(0);
      expect(b.slabShift).toBeLessThanOrEqual(100);
    }
  });

  it('gives the same arrangement for the same value', () => {
    expect(backdropLayout(37)).toEqual(backdropLayout(37));
  });

  it('changes as the slider moves', () => {
    expect(backdropLayout(0)).not.toEqual(backdropLayout(100));
  });
});
