import type { Brush, Pattern } from './params';

/**
 * Painters: the looks that Randomize picks from, for Playful strokes.
 *
 * Think of each painter as a style preset: a matched set of brush settings
 * that belong together, the way a real painter's habits do. Randomize picks a
 * painter (a different one each time), then rolls each setting inside that
 * painter's range, so every roll is a little different but always reads as
 * that painter.
 *
 * Every number is a 0..100 slider value, given as a [lowest, highest] range.
 *   type        which brush (flat, round, palette knife, dry brush)
 *   size        how big each stroke is on the ingredient
 *   length      how long each stroke is, compared with its width
 *   texture     how much the bristles streak the paint
 *   loose       how freely strokes wander off the exact spot and angle
 *   colourBreak how different neighbouring strokes are in colour
 *               (high: separate dabs of colour that mix in your eye)
 *   followForm  100: strokes run along the form's edges and turns;
 *               0: every stroke runs the same diagonal, like hatching
 *   backdrop    how big the strokes on the wall and table are
 */

export type Range = [number, number];

export interface Painter {
  id: string;
  /** Shown in the panel as "After {name}". */
  name: string;
  /** One short line under the name, in plain words. */
  note: string;
  type: Brush;
  pattern: Pattern;
  size: Range;
  length: Range;
  texture: Range;
  loose: Range;
  colourBreak: Range;
  followForm: Range;
  backdrop: Range;
}

export const PAINTERS: Painter[] = [
  {
    // Claude Monet: short, separate dabs of colour, side by side, that shimmer
    // and mix in your eye. The wall and table shimmer too.
    id: 'monet',
    name: 'Monet',
    note: 'Short, broken dabs of colour that shimmer.',
    type: 'round',
    pattern: 'none',
    size: [24, 34],
    length: [30, 45],
    texture: [25, 45],
    loose: [70, 90],
    colourBreak: [65, 85],
    followForm: [35, 55],
    backdrop: [22, 36],
  },
  {
    // Paul Cézanne: small, square-ish patches laid in parallel diagonals,
    // building the form like tiles. Calm and structured.
    id: 'cezanne',
    name: 'Cézanne',
    note: 'Small parallel patches that build the form like tiles.',
    type: 'flat',
    pattern: 'none',
    size: [46, 58],
    length: [22, 34],
    texture: [15, 30],
    loose: [20, 35],
    colourBreak: [50, 70],
    followForm: [10, 25],
    backdrop: [35, 50],
  },
  {
    // John Singer Sargent: a few broad, confident strokes, wet into wet, each
    // one following the form. Calm colour, big simple shapes.
    id: 'sargent',
    name: 'Sargent',
    note: 'A few broad, confident strokes that follow the form.',
    type: 'flat',
    pattern: 'none',
    size: [62, 78],
    length: [70, 90],
    texture: [10, 25],
    loose: [30, 45],
    colourBreak: [15, 30],
    followForm: [85, 100],
    backdrop: [75, 95],
  },
];

/** The painter with this id (falls back to the first one). */
export function findPainter(id: string): Painter {
  return PAINTERS.find((p) => p.id === id) ?? PAINTERS[0];
}
