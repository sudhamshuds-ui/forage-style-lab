import { describe, expect, it } from 'vitest';
import { DISHES } from './dishes';
import type { FormBuilder } from '../ingredients/forms/kit/piece';

describe('dishes', () => {
  // A part with no frame of its own read as a zero point in the flesh skin, and on Mac graphics
  // cards its angle came out "not a number": the face painted black (the user, 2026-11-18).
  it('every part carries its own frame, with no broken numbers', () => {
    for (const dish of DISHES) {
      const pieces = (dish.entry.form as FormBuilder)({ state: 'whole', seed: 3 });
      for (const piece of pieces) {
        const own = piece.geometry.getAttribute('ownPos');
        expect(own, `${dish.entry.spec.id} ${piece.role} has no ownPos`).toBeTruthy();
        const pos = piece.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i += 7) {
          expect(Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))).toBe(true);
          expect(Number.isFinite(own.getX(i) + own.getY(i) + own.getZ(i))).toBe(true);
        }
      }
    }
  }, 60000);

  it('every part named in a dish has a family', () => {
    for (const dish of DISHES) {
      const named = new Set(dish.entry.spec.parts.map((p) => p.split('@')[0].replace(':glow', '_glow')));
      const pieces = (dish.entry.form as FormBuilder)({ state: 'whole', seed: 3 });
      for (const piece of pieces) expect(named.has(piece.role) || piece.role === dish.entry.spec.parts[0], `${dish.entry.spec.id}: ${piece.role}`).toBe(true);
    }
  }, 60000);
});
