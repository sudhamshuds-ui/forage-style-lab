import { SPECS, type Settings, type Spec } from './params';

/**
 * Randomize: a fresh set of brush strokes, for the Playful strokes style.
 *
 * Only the stroke settings change (they live in the Brush group in
 * params.ts, hidden from the panel): brush type, stroke size and length,
 * bristle texture, pattern (lines, scribble, crosshatch) and how strong it is.
 * Everything else stays as it is: the colours, the light, the shape, the
 * refined paint settings, and the Playful switch itself.
 *   - sliders pick from their "nice" range in params.ts
 *   - lists pick any option (or only from `randomOptions`, when a list has them)
 */

const between = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

export function randomStrokes(current: Settings): Settings {
  const next = structuredClone(current);
  const brush = next.brush as unknown as Record<string, unknown>;

  for (const [key, spec] of Object.entries(SPECS.brush) as [string, Spec][]) {
    if (key === 'classic') continue;
    if (spec.kind === 'slider' && spec.random !== false) {
      brush[key] = Math.round(between(spec.nice[0], spec.nice[1]) / spec.step) * spec.step;
    } else if (spec.kind === 'list') {
      brush[key] = spec.randomOptions ? pick(spec.randomOptions) : pick(spec.options).value;
    }
  }
  return next;
}
