import { BufferAttribute, CatmullRomCurve3, Vector3 } from 'three';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';
import { calyxPiece } from './kit/stemLeaf';
import { cutEnd, sweepGeometry } from './kit/sweep';

/**
 * Orange bell pepper (archetype: round). Round 2's second ingredient (docs/ingredients/r2-plan.md).
 *
 * What makes it a bell pepper, not an orange or a pumpkin:
 *   - a blocky, squarish body with four lobes of uneven size, soft grooves running down between
 *     them, deepest at the top and the bottom,
 *   - full, rounded shoulders that dip into a deep well round the stem,
 *   - the lobes ending underneath in four soft bumps it stands on (never a smooth bottom),
 *   - a thick, curved green stem with a flared, star-like calyx lying on the shoulders, its end cut
 *     (a small pale cut face, softly bevelled).
 *
 * Pieces, like layers in a pre-comp:
 *   body    the pepper (a lathe with a lobed cross-section). The glossy skin, the deeper grooves,
 *           a soft streak along the lobes and the translucent glow are painted by the shader (the
 *           `pepper` skin) from a map on the body.
 *   calyx   the flared star at the stem's foot, lying on the shoulders.
 *   stem    the thick, curved stem.
 */

/** Real size (cm): about 9 wide and 8.5 tall, standing on its feet. */
const WIDTH = 9;
const HEIGHT = 8.6;
/** How deep the grooves between the lobes cut in (a share of the radius), top and middle. */
const GROOVE_TOP = 0.2;
const GROOVE_MIDDLE = 0.1;
const GROOVE_FOOT = 0.24;

export const buildPepper: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Pepper: the "${state}" form is not built yet (whole only for now).`);

  const random = seededRandom(seed ^ 0x9e99e);
  const half = HEIGHT / 2;
  const R = WIDTH / 2;
  // Four lobes of uneven size: each its own share of the turn and its own fullness.
  const lobeTurn = random() * Math.PI * 2;
  // A light touch of variation, about 5% (the user, 2026-11-12: a fully organic round "is too
  // deformed... like the prev version with 5% deform"): each lobe a little its own size and bulge,
  // each groove a little its own depth, the lobes turning only slightly from feet to shoulders.
  const lobeSizes = Array.from({ length: 4 }, () => 1 + signed(random) * 0.025);
  const bulgeAt = Array.from({ length: 4 }, () => signed(random) * 0.5);
  const bulgeBy = Array.from({ length: 4 }, () => 0.01 + random() * 0.02);
  const grooveDepth = Array.from({ length: 4 }, () => 0.9 + random() * 0.2);
  const spiral = 0.04 + random() * 0.04;

  /** How far into a groove a point is (0 on a lobe's middle, 1 in a groove), round the body. */
  const grooveAt = (angle: number, u = 0) => {
    const a = angle - lobeTurn - spiral * u;
    // Four grooves, a little unevenly spaced.
    const warped = a + 0.12 * Math.sin(a * 2 + 1.3) + 0.06 * Math.sin(a * 3 + 0.4);
    const g = 1 - Math.abs(Math.cos(2 * warped));
    return g ** 2.2;
  };

  /** The profile: radius (cm) at x along the axis, from the feet (-half) to the well (+half). */
  const profile = (x: number) => {
    const t = x / half;
    // A blocky body (round 1's, which the user preferred): a squared-off ellipse, a touch fuller at
    // the shoulders than at the feet.
    const squareness = 3.6;
    const r = R * Math.max(0, 1 - Math.abs(t) ** squareness) ** (1 / squareness);
    return r * (1 + 0.04 * t);
  };

  const body = roundBody({
    halfLength: half,
    radius: profile,
    lying: false,
    lopsided: 0.42,
    random,
    // A deep well round the stem; a small pit under the feet.
    poleDimple: { depth: 1.1, width: 1.5, ends: 'end' },
    flatBase: 0.1,
    crossSection: (u, angle) => {
      // Grooves deepest at the top and at the feet, shallower round the middle.
      const depth = GROOVE_MIDDLE + (GROOVE_TOP - GROOVE_MIDDLE) * smoothstep(0.2, 0.85, u) + (GROOVE_FOOT - GROOVE_MIDDLE) * smoothstep(-0.3, -0.9, u);
      // Each lobe's own fullness (bulging most at its own height) and each groove's own depth,
      // blended smoothly round the body: taken lobe by lobe, they jumped where two lobes met and
      // left a stepped, jagged groove.
      let size = 0;
      let deep = 0;
      let weightSize = 0;
      let weightDeep = 0;
      for (let i = 0; i < 4; i++) {
        const centre = lobeTurn + spiral * u + (i * Math.PI) / 2;
        const toLobe = Math.exp((Math.cos(angle - centre) - 1) / 0.25);
        const toGroove = Math.exp((Math.cos(angle - centre - Math.PI / 4) - 1) / 0.08);
        size += toLobe * (lobeSizes[i] + bulgeBy[i] * Math.exp(-(((u - bulgeAt[i]) / 0.45) ** 2)));
        weightSize += toLobe;
        deep += toGroove * grooveDepth[i];
        weightDeep += toGroove;
      }
      size /= weightSize;
      deep /= weightDeep;
      return size * (1 - depth * deep * grooveAt(angle, u));
    },
    rings: 60,
    segments: 96,
  });

  // The feet: the lobes' bottoms push down into four soft bumps it stands on, the grooves between
  // them lifting off the table (done on the upright body, before it is finished).
  const pos = body.getAttribute('position');
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    const g = grooveAt(angle, -1);
    const low = 1 - smoothstep(minY, minY + 2.2, y);
    const rFrom = Math.hypot(x, z) / R;
    // Lift the grooves and the middle of the underside; the lobes' bottoms stay down as feet.
    const lift = low * (0.55 * g + 0.5 * (1 - smoothstep(0.25, 0.75, rFrom)));
    pos.setY(i, y + lift);
    // The shader's map: x the height as a share of the pepper, y how deep in a groove.
    uv[2 * i] = (y - minY) / HEIGHT;
    uv[2 * i + 1] = g;
  }
  body.setAttribute('uv', new BufferAttribute(uv, 2));

  // The top of the well: the lathe's end pole, now pointing up.
  const wellBottom = new Vector3().fromBufferAttribute(pos, pos.count - 1);

  // The calyx: a flared star at the stem's foot, lying in the well and up onto the shoulders.
  const calyx = calyxPiece({ base: wellBottom.clone().add(new Vector3(0, 0.1, 0)), radius: 1.35, height: 0.32, points: 5, turn: random() * Math.PI });

  // The stem, after the reference: thick, flaring where it grows out of the calyx, rising and then
  // arching over to one side like a hook, its end cut with a small soft bevel (never a stick).
  const lean = random() * Math.PI * 2;
  const base = wellBottom.clone().add(new Vector3(0, 0.05, 0));
  const out = new Vector3(Math.cos(lean), 0, Math.sin(lean));
  const stemPoints = [
    base.clone(),
    base.clone().add(new Vector3(0, 1.2, 0)).addScaledVector(out, 0.15),
    base.clone().add(new Vector3(0, 2.1, 0)).addScaledVector(out, 0.7),
    base.clone().add(new Vector3(0, 2.35, 0)).addScaledVector(out, 1.5),
    base.clone().add(new Vector3(0, 1.95, 0)).addScaledVector(out, 2.2),
  ];
  const stem = sweepGeometry({
    points: new CatmullRomCurve3(stemPoints).getSpacedPoints(14),
    // Flared at the foot, thick along its length, a little fuller where it was cut.
    radius: (t) => (0.5 + 0.45 * (1 - smoothstep(0, 0.2, t)) + 0.06 * smoothstep(0.75, 1, t)) * cutEnd(1 - t, 0.05),
    rings: 40,
    segments: 16,
    // A little ridged, like a real pepper stem.
    around: (_t, a) => 1 + 0.07 * Math.cos(5 * a),
  });

  return finishPieces([
    { role: 'body_glow', geometry: body },
    { role: 'calyx', geometry: calyx },
    { role: 'stem', geometry: stem },
  ]);
};
