import { GROUPS, SPECS, isVisible, type Settings, type Spec } from './params';
import { PALETTES, applyPalette } from './palettes';

/**
 * Randomize: new values that still look good.
 *
 * Only visible controls change. Hidden ones (shape, lighting) keep their values.
 *   - sliders pick from their "nice" range in params.ts
 *   - lists pick any option
 *   - toggles marked `random: true` flip a coin
 *   - the colour combo is one of the presets
 */

const between = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

export function randomSettings(current: Settings): Settings {
  const next = structuredClone(current);

  for (const { key: group } of GROUPS) {
    const values = next[group] as unknown as Record<string, unknown>;
    for (const [key, spec] of Object.entries(SPECS[group]) as [string, Spec][]) {
      if (!isVisible(group, spec)) continue;
      if (spec.kind === 'slider' && spec.random !== false) {
        const raw = between(spec.nice[0], spec.nice[1]);
        values[key] = Math.round(raw / spec.step) * spec.step;
      } else if (spec.kind === 'list' && spec.random) {
        values[key] = pick(spec.options).value;
      } else if (spec.kind === 'toggle' && spec.random) {
        values[key] = Math.random() < 0.6;
      } else if (spec.kind === 'pad') {
        values[key] = {
          x: Number(between(spec.nice.x[0], spec.nice.x[1]).toFixed(2)),
          y: Number(between(spec.nice.y[0], spec.nice.y[1]).toFixed(2)),
        };
      }
    }
  }

  applyPalette(next, pick(PALETTES));
  return next;
}
