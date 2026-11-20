import { describe, expect, it } from 'vitest';
import { UNITS_PER_CM } from '../ingredients/scale';
import { buildFromTrace, topView } from './build';
import { solveTrace } from './trace';
import { SALMON_PEACH_TRACE } from './traces/salmonPeach';

describe('the dish built from the painting', () => {
  const solved = solveTrace(SALMON_PEACH_TRACE);
  const pieces = buildFromTrace(SALMON_PEACH_TRACE, solved);
  for (const p of pieces) p.geometry.scale(1 / UNITS_PER_CM, 1 / UNITS_PER_CM, 1 / UNITS_PER_CM);

  it('puts the salmon where the painting has it, at its size and turn', () => {
    const traced = solved.footprints.find((f) => f.piece.label === 'salmon')!;
    const built = topView(pieces.filter((p) => p.role === 'salmon_glow'));
    expect(Math.hypot(built.centre[0] - traced.centre[0], built.centre[1] - traced.centre[1])).toBeLessThan(1);
    const turn = Math.abs(((built.angle - traced.angle + 90) % 180 + 180) % 180 - 90);
    expect(turn).toBeLessThan(6);
    expect(Math.abs(built.length - traced.length) / traced.length).toBeLessThan(0.15);
  });

  it('keeps every piece on the plate', () => {
    for (const p of pieces) {
      const view = topView([p]);
      expect(Math.hypot(...view.centre)).toBeLessThan(13.5);
    }
  });
});
