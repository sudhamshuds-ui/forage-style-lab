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
 *   swirl       how much strokes flow in curling currents (Van Gogh)
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
  swirl: Range;
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
    backdrop: [32, 46],
    swirl: [0, 0],
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
    swirl: [0, 0],
  },
  {
    // John Singer Sargent: confident strokes, wet into wet, each one following
    // the form. Calm colour. He is the original Playful strokes look (the
    // settings from before the painters existed, kept by the user's choice),
    // with only a little variation around it.
    id: 'sargent',
    name: 'Sargent',
    note: 'A few broad, confident strokes that follow the form.',
    type: 'flat',
    pattern: 'none',
    size: [50, 60],
    length: [55, 65],
    texture: [30, 40],
    loose: [40, 50],
    colourBreak: [22, 28],
    followForm: [100, 100],
    backdrop: [46, 54],
    swirl: [0, 0],
  },
  {
    // Vincent van Gogh: long, thick, streaky strokes that wrap around the form,
    // in lively broken colour, with the backdrop flowing in curling currents.
    id: 'van-gogh',
    name: 'Van Gogh',
    note: 'Thick strokes that wrap the form, in a swirling room.',
    type: 'flat',
    pattern: 'none',
    size: [30, 40],
    length: [75, 95],
    texture: [55, 75],
    loose: [25, 40],
    colourBreak: [55, 75],
    followForm: [90, 100],
    backdrop: [30, 40],
    swirl: [75, 95],
  },
  {
    // Georges Seurat: pointillism. Tiny dots of colour side by side, which mix
    // in your eye. Everything, room included, is made of dots.
    id: 'seurat',
    name: 'Seurat',
    note: 'Tiny dots of colour that mix in your eye.',
    type: 'round',
    pattern: 'none',
    size: [0, 6],
    length: [0, 5],
    texture: [0, 10],
    loose: [10, 25],
    colourBreak: [70, 90],
    followForm: [40, 60],
    backdrop: [0, 8],
    swirl: [0, 0],
  },
  {
    // Edgar Degas: soft pastel. Long, thin, dry strokes hatched along the form,
    // with the paper showing between the streaks.
    id: 'degas',
    name: 'Degas',
    note: 'Soft pastel hatching, with the paper showing through.',
    type: 'dry',
    pattern: 'lines',
    size: [28, 38],
    length: [80, 100],
    texture: [60, 80],
    loose: [30, 45],
    colourBreak: [35, 55],
    followForm: [60, 80],
    backdrop: [45, 60],
    swirl: [0, 0],
  },
];

/** The painter with this id (falls back to the first one). */
export function findPainter(id: string): Painter {
  return PAINTERS.find((p) => p.id === id) ?? PAINTERS[0];
}
