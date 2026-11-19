import { describe, expect, it } from 'vitest';
import { DISHES } from './dishes';
import type { FormBuilder } from '../ingredients/forms/kit/piece';

// Each dish built once and shared by the checks (106 dishes: about a minute and a half).
const built = new Map<string, ReturnType<FormBuilder>>();
function build(dish: (typeof DISHES)[number]) {
  if (!built.has(dish.entry.spec.id)) built.set(dish.entry.spec.id, (dish.entry.form as FormBuilder)({ state: 'whole', seed: 3 }));
  return built.get(dish.entry.spec.id)!;
}

describe('dishes', () => {
  // A part with no frame of its own read as a zero point in the flesh skin, and on Mac graphics
  // cards its angle came out "not a number": the face painted black (the user, 2026-11-18).
  it('every part carries its own frame, with no broken numbers', () => {
    for (const dish of DISHES) {
      const pieces = build(dish);
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
  }, 600000);

  it('every part named in a dish has a family', () => {
    for (const dish of DISHES) {
      const named = new Set(dish.entry.spec.parts.map((p) => p.split('@')[0].replace(':glow', '_glow')));
      const pieces = build(dish);
      for (const piece of pieces) expect(named.has(piece.role) || piece.role === dish.entry.spec.parts[0], `${dish.entry.spec.id}: ${piece.role}`).toBe(true);
    }
  }, 600000);

  // DESIGN.md: white plates are pristine (the user, 2026-11-19: "plate is still not clear white").
  it('a porcelain plate is painted pristine (no speckled glaze)', () => {
    for (const dish of DISHES) {
      const plateFamily = dish.entry.spec.parts.find((p) => p.startsWith('plate@'))?.split('@')[1];
      const skin = dish.entry.partSkins?.plate;
      if (plateFamily === 'porcelain' && skin) expect(skin.amount, dish.entry.spec.id).toBeLessThanOrEqual(0.15);
    }
  });
});
