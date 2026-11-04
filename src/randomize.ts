import { PAINTERS, findPainter, type Range } from './painters';
import type { Settings } from './params';

/**
 * Randomize: a fresh painter, for the Playful strokes style.
 *
 * It picks a painter from src/painters.ts (always a different one from the
 * painter on screen now), then rolls each stroke setting inside that
 * painter's range. Like picking a style preset and nudging it: every roll is
 * a little different, but always reads as that painter.
 *
 * Only the stroke settings change (they live in the Brush group in
 * params.ts, hidden from the panel). Everything else stays as it is: the
 * colours, the light, the shape, the refined paint settings, and the Playful
 * switch itself.
 */

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const roll = ([low, high]: Range) => Math.round(low + Math.random() * (high - low));

export function randomStrokes(current: Settings): Settings {
  const next = structuredClone(current);
  const others = PAINTERS.filter((p) => p.id !== current.brush.painter);
  const painter = pick(others.length > 0 ? others : PAINTERS);
  Object.assign(next.brush, paintLike(painter.id));
  return next;
}

/** One roll of a painter's look: the stroke settings, each inside the painter's range. */
export function paintLike(id: string): Partial<Settings['brush']> {
  const p = findPainter(id);
  return {
    painter: p.id,
    type: p.type,
    pattern: p.pattern,
    size: roll(p.size),
    length: roll(p.length),
    texture: roll(p.texture),
    loose: roll(p.loose),
    colourBreak: roll(p.colourBreak),
    followForm: roll(p.followForm),
    backdrop: roll(p.backdrop),
  };
}
