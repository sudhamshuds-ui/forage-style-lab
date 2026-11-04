import { describe, expect, it } from 'vitest';
import { findPalette } from '../palettes';
import { hexToOklch } from '../utils/colour';
import { FAMILIES } from './families';
import { REGISTRY, parsePart, pickOther } from './registry';
import { seededRandom } from './forms/kit/random';

const hueGap = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

describe('ingredient registry', () => {
  it('starts with the apple, the lemon and the orange', () => {
    expect(REGISTRY.map((e) => e.spec.id).slice(0, 3)).toEqual(['apple', 'lemon', 'orange']);
    expect(REGISTRY[0].form).toBe('procedural-apple');
  });

  it('has unique ids and every spec field filled in', () => {
    const ids = REGISTRY.map((e) => e.spec.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { spec } of REGISTRY) {
      expect(spec.name.length, spec.id).toBeGreaterThan(0);
      expect(spec.forms.length, spec.id).toBeGreaterThan(0);
      expect(spec.size_cm.every((cm) => cm > 0), spec.id).toBe(true);
      expect(spec.parts.length, spec.id).toBeGreaterThan(0);
      expect(spec.notes.length, spec.id).toBeGreaterThan(0);
      expect(FAMILIES[spec.family], spec.id).toBeDefined();
    }
  });

  it('suggests real rooms at least 70 degrees round the wheel (up to straight opposite)', () => {
    for (const [id, family] of Object.entries(FAMILIES)) {
      const subject = hexToOklch(family.colours.base);
      for (const roomId of family.rooms) {
        const room = findPalette(roomId);
        expect(room, `${id}: ${roomId}`).toBeDefined();
        const gap = hueGap(hexToOklch(room!.colours.wall).h, subject.h);
        expect(gap, `${id} in ${roomId}: ${gap.toFixed(0)} degrees`).toBeGreaterThanOrEqual(70);
      }
    }
  });

  it('Shuffle ingredient always picks a different one', () => {
    const random = seededRandom(1);
    for (let i = 0; i < 200; i++) {
      for (const { spec } of REGISTRY) expect(pickOther(spec.id, random).spec.id).not.toBe(spec.id);
    }
  });

  it('reads part names: glow parts and parts in another family', () => {
    expect(parsePart('peel')).toEqual({ role: 'peel', family: undefined });
    expect(parsePart('flesh:glow')).toEqual({ role: 'flesh_glow', family: undefined });
    expect(parsePart('rind@green')).toEqual({ role: 'rind', family: 'green' });
  });
});
