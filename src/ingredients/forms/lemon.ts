import { ellipse, smoothMax, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';

/**
 * Lemon (archetype: round). Spec: 7 x 5 x 5 cm, lying on its side.
 *
 * What makes it a lemon, not an egg or a small melon: a fat oval body that
 * narrows into a little pointed nipple at each end, with a soft inward curve
 * (the "neck") where body meets nipple. The two ends are never quite the
 * same: one nipple is a touch bigger.
 *
 * The profile is two simple shapes blended together, like two shape layers
 * merged with a soft fillet:
 *   - the body: an oval whose ends taper to a point (not round like an
 *     egg's), so the lemon narrows toward each tip,
 *   - the nipples: a thin rod with rounded tips, running end to end.
 * A smooth maximum takes whichever is bigger and rounds the corner between
 * them, which gives the soft neck.
 *
 * The peel's pebbling is the shader's job, never geometry.
 */

/** Real size (cm), from the spec. */
const LENGTH = 7;
const WIDTH = 5;

/** Body: a little shorter than the whole lemon, so the nipples poke out. */
const BODY_HALF_LENGTH = 3.2;
/** How the body narrows toward its ends: 0.5 is a round egg end, 1 a cone. */
const BODY_TAPER = 0.72;
/** Where each nipple's round tip starts, and its radius. */
const NIPPLE_START = 2.95;
const NIPPLE_RADIUS = 0.42;
/** How soft the neck between body and nipple is. */
const NECK_SOFTNESS = 0.8;

export const buildLemon: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Lemon: the "${state}" form is not built yet (whole only for now).`);

  const random = seededRandom(seed);
  const half = LENGTH / 2;
  // Each end gets its own nipple size, so the lemon has a front and a back.
  const nipple = { start: 1 + signed(random) * 0.14, end: 1 + signed(random) * 0.14 };

  const radius = (x: number) => {
    const size = x < 0 ? nipple.start : nipple.end;
    const ax = Math.abs(x);
    const t = Math.min(1, ax / BODY_HALF_LENGTH);
    const body = (WIDTH / 2) * (1 - t * t) ** BODY_TAPER;
    // A rod with a rounded tip: full radius up to NIPPLE_START, then a quarter ellipse to the tip.
    const rod = ax < NIPPLE_START ? NIPPLE_RADIUS * size : ellipse(ax - NIPPLE_START, half - NIPPLE_START, NIPPLE_RADIUS * size);
    // The fillet fades out toward the very tip, so the tip still closes to a point.
    const softness = NECK_SOFTNESS * (1 - smoothstep(NIPPLE_START, half, ax));
    return smoothMax(body, rod, softness);
  };

  const peel = roundBody({
    halfLength: half,
    radius,
    lying: true,
    lopsided: 0.5,
    random,
    flatBase: 0.12,
    rings: 46,
    segments: 52,
  });

  return finishPieces([{ role: 'peel', geometry: peel }]);
};
