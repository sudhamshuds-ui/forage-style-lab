import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CHOICES } from '../../kitchen/panel';
import { TRAITS } from '../../ingredients/traits';
import { loadPhysics } from '../kit/physics';
import { composedDish } from './build';
import { cookSeed, pickDish } from './pick';
import type { FormBuilder } from '../../ingredients/forms/kit/piece';

/**
 * The fix list's P3.1 regression: the first Cook with the panel's default choices must always give a
 * dish. Every pantry ingredient alone on the table is cooked once, the Kitchen's way (`pickDish`,
 * then `composedDish` built with physics), and must build without throwing and with pieces in it.
 */
describe('Cook with the default choices', () => {
  beforeAll(async () => {
    await loadPhysics();
  });

  it('cooks every ingredient alone into a dish on the first press', () => {
    const failed: string[] = [];
    for (const id of Object.keys(TRAITS)) {
      try {
        const idea = pickDish([id], DEFAULT_CHOICES, cookSeed([id], DEFAULT_CHOICES, 0));
        const pieces = (composedDish(idea).entry.form as FormBuilder)({ state: 'whole', seed: 3 });
        if (!pieces.length) failed.push(`${id}: no pieces`);
      } catch (error) {
        failed.push(`${id}: ${(error as Error).message}`);
      }
    }
    expect(failed, failed.join('\n')).toEqual([]);
  }, 600000);
});
