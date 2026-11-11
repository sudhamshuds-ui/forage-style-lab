import { BufferAttribute, CatmullRomCurve3, Matrix4, Vector3, type BufferGeometry } from 'three';
import { flattenBase, roundBody } from './kit/round';
import { finishPieces, type FormBuilder, type FormPiece } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { sweepGeometry } from './kit/sweep';

/**
 * Red onion (archetype: round). Round 2's first ingredient (docs/ingredients/r2-plan.md), after
 * the user's watercolour reference (2026-11-11).
 *
 * What makes it an onion, not a plum or a beetroot:
 *   - a round, slightly lopsided globe, a little flatter at the root end,
 *   - full shoulders that pull up into a short, twisted neck (one grows out of the other), its
 *     dry papery tip curling over to one side, shaped, never cut flat,
 *   - a tuft of fine, dry roots at the root end,
 *   - lying tipped on its side, the root end low on one side and the neck curling up on the other
 *     (as in the reference), resting on the curve of the globe.
 *
 * Pieces, like layers in a pre-comp:
 *   bulb_glow  the globe and its neck, one lathe (the round kit). The violet skin, its fine
 *              darker lines from root to neck, the pale bands, papery flakes, the root patch and
 *              the neck drying toward its tip are painted by the shader (the `onion` skin).
 *   tip        the dry papery neck tip: a few twisted ribbons curling over.
 *   roots      the root tuft: short, fine, wiry roots splaying from the root plate.
 *
 * Built upright first (the axis along y, root down), then tipped over. Each point keeps where it
 * was in the upright onion (`ownPos`), so the painted lines still run from root to neck.
 */

/** The upright onion, root to the top of its neck (cm), and the globe's width. */
const HEIGHT = 9.3;
const WIDTH = 8;
/** Where the globe is widest along the axis (cm from the middle). */
const BULB_CENTRE = -1.3;
/** The globe's height below its widest point (cm). */
const BULB_BELOW = 3.4;
/** The neck: its radius where it leaves the shoulders and at its top (cm). */
const NECK_BASE = 0.7;
const NECK_TOP = 0.42;
/** How far the onion is tipped over from upright (radians): its neck leans up and to the right. */
const TIP_OVER = 0.62;

export const buildOnion: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Onion: the "${state}" form is not built yet (whole only for now).`);

  const random = seededRandom(seed ^ 0x0a10a);
  const half = HEIGHT / 2;

  /** The profile: radius (cm) at x along the axis, from the root (-half) to the neck's top (+half). */
  const radius = (x: number) => {
    const R = WIDTH / 2;
    if (x <= BULB_CENTRE) {
      // Below the widest point: round, a little flatter at the root end.
      const t = (BULB_CENTRE - x) / BULB_BELOW;
      return R * Math.max(0, 1 - t ** 2.3) ** (1 / 2.3);
    }
    // Above it: full, round shoulders that pull up into a short neck, concave only near the top.
    const s = Math.min(1, (x - BULB_CENTRE) / (half - BULB_CENTRE));
    const neckAt = NECK_BASE + (NECK_TOP - NECK_BASE) * s;
    let r = neckAt + (R - neckAt) * Math.max(0, 1 - s ** 2.2) ** 2.3;
    const capStart = half - NECK_TOP;
    if (x > capStart) r = Math.min(r, NECK_TOP * Math.sqrt(Math.max(0, 1 - ((x - capStart) / NECK_TOP) ** 2)));
    return r;
  };

  const bulb = roundBody({
    halfLength: half,
    radius,
    lying: false,
    lopsided: 0.6,
    random,
    // The root end: a soft pit where the roots grow from.
    poleDimple: { depth: 0.3, width: 1.0, ends: 'start' },
    // It rests on its side once tipped over: flattened after the tip (below), not here.
    flatBase: 0,
    // A few broad, soft swellings round the globe (its layers are never quite even).
    crossSection: (u, angle) => 1 + 0.025 * (1 - u * u) * Math.sin(5 * angle + 1.3) + 0.015 * Math.sin(2 * angle + 0.4),
    rings: 64,
    segments: 64,
  });
  // Upright, the axis is y: the root's centre is at -half, the neck's top at +half.

  // The dry neck tip: a few twisted papery ribbons growing out of the neck (starting inside it)
  // and curling over to one side, each ending in a fine, frayed point.
  const curl = random() * Math.PI * 2;
  const tips: BufferGeometry[] = Array.from({ length: 4 }, (_, k) => {
    const turn = curl + (k - 1.5) * 0.4 + signed(random) * 0.2;
    const length = 1.3 + random() * 0.6 - k * 0.12;
    const points = [0, 0.3, 0.6, 1].map((t) => {
      // Up, then over: the ribbon bends further the higher it gets.
      const over = 1.1 * t * t;
      return new Vector3(Math.cos(turn) * over, half - 0.5 + length * t - 0.35 * t * t * t, Math.sin(turn) * over);
    });
    return sweepGeometry({
      points: new CatmullRomCurve3(points).getSpacedPoints(10),
      radius: (t) => 0.3 * (1 - t) ** 0.9 * Math.sqrt(Math.min(1, t / 0.04 + 0.4)),
      rings: 24,
      segments: 10,
      // A flat ribbon that twists along its length, like dry onion skin.
      around: (t, a) => 1 / Math.hypot(Math.cos(a + t * 2.6 + k), Math.sin(a + t * 2.6 + k) / 0.32),
    });
  });

  // The root tuft: short, fine, wiry roots splaying out from the root plate, a little uneven.
  const roots: BufferGeometry[] = Array.from({ length: 9 }, (_, k) => {
    const around = (k / 9) * Math.PI * 2 + signed(random) * 0.35;
    const spread = 0.35 + random() * 0.5;
    const length = 0.7 + random() * 0.6;
    const start = new Vector3(Math.cos(around) * 0.25, -half + 0.25, Math.sin(around) * 0.25);
    const points = [0, 0.35, 0.7, 1].map((t) => {
      const out = spread * length * t;
      const kink = 0.12 * Math.sin(t * 7 + k);
      return new Vector3(
        start.x + Math.cos(around + kink) * out,
        start.y - length * t * (0.85 - 0.35 * t),
        start.z + Math.sin(around + kink) * out,
      );
    });
    return sweepGeometry({
      points: new CatmullRomCurve3(points).getSpacedPoints(8),
      radius: (t) => 0.06 * (1 - 0.7 * t) * Math.sqrt(Math.min(1, t / 0.05 + 0.3)),
      rings: 14,
      segments: 6,
    });
  });

  // Remember where every point of the globe sits in the upright onion, and its height as a share
  // of the onion (0 at the root, 1 at the neck's top): the shader paints from both.
  const pos = bulb.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const own = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    uv[2 * i] = (pos.getY(i) + half) / HEIGHT;
    own[3 * i] = pos.getX(i);
    own[3 * i + 1] = pos.getY(i);
    own[3 * i + 2] = pos.getZ(i);
  }
  bulb.setAttribute('uv', new BufferAttribute(uv, 2));
  bulb.setAttribute('ownPos', new BufferAttribute(own, 3));

  // Tip it over onto its side: the neck leans up and to the right, the root end low on the left,
  // turned a little toward the camera so the root tuft shows.
  const tilt = new Matrix4().makeRotationZ(-TIP_OVER).premultiply(new Matrix4().makeRotationY(0.35));
  for (const geometry of [bulb, ...tips, ...roots]) geometry.applyMatrix4(tilt);
  // It settles a little where it rests on the curve of the globe.
  flattenBase(bulb, 0.12);
  let low = Infinity;
  for (let i = 0; i < pos.count; i++) low = Math.min(low, pos.getY(i));
  // Nothing may sink below the table (a root reaching down would poke through it).
  for (const geometry of [...tips, ...roots]) {
    const p = geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) if (p.getY(i) < low + 0.05) p.setY(i, low + 0.05);
  }

  const pieces: FormPiece[] = [
    { role: 'bulb_glow', geometry: bulb },
    ...tips.map((geometry) => ({ role: 'tip', geometry })),
    ...roots.map((geometry) => ({ role: 'roots', geometry })),
  ];
  return finishPieces(pieces);
};
