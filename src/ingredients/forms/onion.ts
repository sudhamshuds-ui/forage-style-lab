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
 *   - full shoulders that pull up into a short neck (one grows out of the other), its dry papery
 *     tip curling over to one side, shaped, never cut flat,
 *   - a tuft of fine, dry roots at the root end,
 *   - cut across, rings of pale flesh, each layer edged in violet.
 *
 * Three arrangements, for the user to choose from (2026-11-11):
 *   upright  one onion standing on its root end,
 *   pair     one standing, one lying on its side behind it, just touching,
 *   cut      one standing, and a root half cut across in front, its rings toward the camera.
 *
 * Pieces, like layers in a pre-comp:
 *   bulb_glow  each onion's globe and neck (a lathe, the round kit), or the cut half with its flat
 *              face. The skin's lines, bands, flakes, root patch and drying neck, and the cut
 *              face's rings, are painted by the shader (the `onion` skin), never separate layers.
 *   tip        the dry papery neck tip: a few twisted ribbons curling over.
 *   roots      the root tuft: short, fine, wiry roots splaying from the root plate.
 *
 * Each onion is built upright first (its axis along y, root down), then posed. Every point keeps
 * where it was in the upright onion (`ownPos`), so the painted lines run from root to neck
 * however the onion lies.
 */

/** The upright onion, root to the top of its neck (cm), and the globe's width. */
const HEIGHT = 9.3;
const WIDTH = 8;
const HALF = HEIGHT / 2;
/** Where the globe is widest along the axis (cm from the middle). */
const BULB_CENTRE = -1.3;
/** The globe's height below its widest point (cm). */
const BULB_BELOW = 3.4;
/** The neck: its radius where it leaves the shoulders and at its top (cm). */
const NECK_BASE = 0.7;
const NECK_TOP = 0.42;
/** Where a cut half is cut across (cm along the axis), and the soft round of its rim (cm). */
const CUT_AT = BULB_CENTRE + 0.5;
const CUT_BEVEL = 0.3;
/** The gap left between two onions that touch (cm). */
const GAP = 0.08;

export type OnionArrangement = 'upright' | 'pair' | 'cut';

/** The profile: radius (cm) at x along the upright axis, root (-HALF) to the neck's top (+HALF). */
function profile(x: number): number {
  const R = WIDTH / 2;
  if (x <= BULB_CENTRE) {
    // Below the widest point: round, a little flatter at the root end.
    const t = (BULB_CENTRE - x) / BULB_BELOW;
    return R * Math.max(0, 1 - t ** 2.3) ** (1 / 2.3);
  }
  // Above it: full, round shoulders that pull up into a short neck, concave only near the top.
  const s = Math.min(1, (x - BULB_CENTRE) / (HALF - BULB_CENTRE));
  const neckAt = NECK_BASE + (NECK_TOP - NECK_BASE) * s;
  let r = neckAt + (R - neckAt) * Math.max(0, 1 - s ** 2.2) ** 2.3;
  const capStart = HALF - NECK_TOP;
  if (x > capStart) r = Math.min(r, NECK_TOP * Math.sqrt(Math.max(0, 1 - ((x - capStart) / NECK_TOP) ** 2)));
  return r;
}

/** One onion, upright, in centimetres: its body, and (whole only) its tip; its roots. */
interface Onion {
  body: BufferGeometry;
  parts: { role: string; geometry: BufferGeometry }[];
  /** Is this upright point inside the onion's body (with a margin, cm)? */
  inside: (p: Vector3, margin: number) => boolean;
  /** Where the onion has been posed: upright point to staged point. */
  pose: Matrix4;
}

function makeOnion(random: () => number, cut: boolean): Onion {
  const top = cut ? CUT_AT : HALF;
  // A cut half: the profile holds its full width almost to the cut, then rounds off over a small
  // bevel into a flat face (a real cut edge catches a line of light; never a sharp crease).
  const radius = cut
    ? (x: number) => profile(x) * Math.sqrt(Math.max(0, Math.min(1, (top - x) / CUT_BEVEL)))
    : profile;
  // The lathe runs symmetrically round its middle, so shift the profile to sit on it.
  const halfLength = (top + HALF) / 2;
  const middle = (top - HALF) / 2;
  const body = roundBody({
    halfLength,
    radius: (x) => radius(x + middle),
    lying: false,
    lopsided: 0.6,
    random,
    // The root end: a soft pit where the roots grow from.
    poleDimple: { depth: 0.3, width: 1.0, ends: 'start' },
    flatBase: 0,
    // A few broad, soft swellings round the globe (its layers are never quite even).
    crossSection: (u, angle) => 1 + 0.025 * (1 - u * u) * Math.sin(5 * angle + 1.3) + 0.015 * Math.sin(2 * angle + 0.4),
    rings: cut ? 72 : 64,
    segments: 64,
  });
  body.translate(0, middle, 0);

  // The shader's map: x the height as a share of the onion (0 at the root, 1 at the neck's top);
  // y, on a cut face only, how far in from the rim (0 at the rim, 1 at the centre), for the rings.
  const pos = body.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const own = new Float32Array(pos.count * 3);
  const rimRadius = profile(top - CUT_BEVEL);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    uv[2 * i] = (y + HALF) / HEIGHT;
    // The whole rounded-off cap is the cut face, out to the rim where the bevel starts.
    uv[2 * i + 1] = cut && y > top - CUT_BEVEL * 0.98 ? Math.max(0.0001, 1 - Math.hypot(pos.getX(i), pos.getZ(i)) / rimRadius) : 0;
    own[3 * i] = pos.getX(i);
    own[3 * i + 1] = y;
    own[3 * i + 2] = pos.getZ(i);
  }
  body.setAttribute('uv', new BufferAttribute(uv, 2));
  body.setAttribute('ownPos', new BufferAttribute(own, 3));

  const parts: { role: string; geometry: BufferGeometry }[] = [];
  if (!cut) {
    // The dry neck tip: a few twisted papery ribbons growing out of the neck (starting inside it)
    // and curling over to one side, each ending in a fine, frayed point.
    const curl = random() * Math.PI * 2;
    for (let k = 0; k < 4; k++) {
      const turn = curl + (k - 1.5) * 0.4 + signed(random) * 0.2;
      const length = 1.3 + random() * 0.6 - k * 0.12;
      const points = [0, 0.3, 0.6, 1].map((t) => {
        const over = 1.1 * t * t;
        return new Vector3(Math.cos(turn) * over, HALF - 0.5 + length * t - 0.35 * t * t * t, Math.sin(turn) * over);
      });
      parts.push({
        role: 'tip',
        geometry: sweepGeometry({
          points: new CatmullRomCurve3(points).getSpacedPoints(10),
          radius: (t) => 0.3 * (1 - t) ** 0.9 * Math.sqrt(Math.min(1, t / 0.04 + 0.4)),
          rings: 24,
          segments: 10,
          // A flat ribbon that twists along its length, like dry onion skin.
          around: (t, a) => 1 / Math.hypot(Math.cos(a + t * 2.6 + k), Math.sin(a + t * 2.6 + k) / 0.32),
        }),
      });
    }
  }
  // The root tuft: short, fine, wiry roots splaying out from the root plate, a little uneven.
  for (let k = 0; k < 9; k++) {
    const around = (k / 9) * Math.PI * 2 + signed(random) * 0.35;
    const spread = 0.35 + random() * 0.5;
    const length = 0.7 + random() * 0.6;
    const start = new Vector3(Math.cos(around) * 0.25, -HALF + 0.25, Math.sin(around) * 0.25);
    const points = [0, 0.35, 0.7, 1].map((t) => {
      const out = spread * length * t;
      const kink = 0.12 * Math.sin(t * 7 + k);
      return new Vector3(start.x + Math.cos(around + kink) * out, start.y - length * t * (0.85 - 0.35 * t), start.z + Math.sin(around + kink) * out);
    });
    parts.push({
      role: 'roots',
      geometry: sweepGeometry({
        points: new CatmullRomCurve3(points).getSpacedPoints(8),
        radius: (t) => 0.06 * (1 - 0.7 * t) * Math.sqrt(Math.min(1, t / 0.05 + 0.3)),
        rings: 14,
        segments: 6,
      }),
    });
  }

  // Inside test, from the profile (the lathe's small lopsidedness is covered by the margin).
  const inside = (p: Vector3, margin: number) =>
    p.y > -HALF && p.y < top && Math.hypot(p.x, p.z) < radius(p.y) * 1.05 + margin;
  return { body, parts, inside, pose: new Matrix4() };
}

/** Pose an onion: apply a turn and a move to all its pieces, and remember it. */
function place(onion: Onion, matrix: Matrix4): void {
  onion.body.applyMatrix4(matrix);
  for (const part of onion.parts) part.geometry.applyMatrix4(matrix);
  onion.pose.premultiply(matrix);
}

/**
 * Rest an onion on the table (y = 0): its lowest body point down, then a soft settle. Its roots
 * and tip may never reach below the table: whatever would, is squashed flat along it, like roots
 * pressed under the onion's weight (the user, 2026-11-12: standing on its roots, the onion
 * levitated above the table).
 */
function restOnTable(onion: Onion, settle: number): void {
  onion.body.computeBoundingBox();
  place(onion, new Matrix4().makeTranslation(0, -onion.body.boundingBox!.min.y, 0));
  flattenBase(onion.body, settle);
  onion.body.computeBoundingBox();
  const table = onion.body.boundingBox!.min.y;
  for (const part of onion.parts) {
    const p = part.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const below = table + 0.04 - p.getY(i);
      // Pressed onto the table, and pushed a little outward, as squashed roots splay.
      if (below > 0) {
        const out = Math.min(0.5, below * 0.6);
        const r = Math.hypot(p.getX(i), p.getZ(i)) || 1;
        p.setXYZ(i, p.getX(i) + (p.getX(i) / r) * out, table + 0.04 - Math.min(0.03, below * 0.05), p.getZ(i) + (p.getZ(i) / r) * out);
      }
    }
    p.needsUpdate = true;
  }
}

/**
 * Slide `mover` toward `still` along `direction` (on the table) until their bodies just touch:
 * never inside each other. Checks every point of each body against the other's real shape
 * (the strawberry lesson: points being close is not the same as not overlapping).
 */
function slideUntilTouching(mover: Onion, still: Onion, direction: Vector3): void {
  const step = new Vector3();
  const probe = new Vector3();
  const toOwn = (onion: Onion) => onion.pose.clone().invert();
  const overlaps = () => {
    const stillInv = toOwn(still);
    const moverInv = toOwn(mover);
    const a = mover.body.getAttribute('position');
    for (let i = 0; i < a.count; i += 3) if (still.inside(probe.fromBufferAttribute(a, i).applyMatrix4(stillInv), GAP)) return true;
    const b = still.body.getAttribute('position');
    for (let i = 0; i < b.count; i += 3) if (mover.inside(probe.fromBufferAttribute(b, i).applyMatrix4(moverInv), GAP)) return true;
    return false;
  };
  // Start well apart, then step in until the next step would overlap.
  place(mover, new Matrix4().makeTranslation(-direction.x * 12, 0, -direction.z * 12));
  for (let i = 0; i < 240; i++) {
    step.copy(direction).multiplyScalar(0.05);
    place(mover, new Matrix4().makeTranslation(step.x, 0, step.z));
    if (overlaps()) {
      place(mover, new Matrix4().makeTranslation(-step.x, 0, -step.z));
      return;
    }
  }
}

function piecesOf(onion: Onion): FormPiece[] {
  return [{ role: 'bulb_glow', geometry: onion.body }, ...onion.parts];
}

/** Build one of the three arrangements. */
export function buildOnionArrangement(arrangement: OnionArrangement, seed: number): FormPiece[] {
  const random = seededRandom(seed ^ 0x0a10a);
  const hero = makeOnion(random, false);
  restOnTable(hero, 0.18);
  if (arrangement === 'upright') return finishPieces(piecesOf(hero));

  if (arrangement === 'pair') {
    // The second onion lies on its side behind and to the right, its neck pointing away to the
    // right, root toward the hero, just touching it.
    const lying = makeOnion(random, false);
    place(lying, new Matrix4().makeRotationZ(-1.45).premultiply(new Matrix4().makeRotationY(-0.5)));
    restOnTable(lying, 0.14);
    slideUntilTouching(lying, hero, new Vector3(-0.75, 0, 0.66).normalize());
    // The hero comes after: it is the one in front (both bodies get the hero's skin).
    return finishPieces([...piecesOf(lying), ...piecesOf(hero)]);
  }

  // A root half cut across, in front and to the right, resting on its rounded back with its rings
  // tipped toward the camera and the light; the whole onion stands behind it, to the left.
  const half = makeOnion(random, true);
  place(half, new Matrix4().makeRotationX(1.05).premultiply(new Matrix4().makeRotationY(-0.45)));
  restOnTable(half, 0.12);
  slideUntilTouching(half, hero, new Vector3(-0.55, 0, -0.84).normalize());
  return finishPieces([...piecesOf(hero), ...piecesOf(half)]);
}

/** The registry's builders, one per arrangement. */
export const buildOnion: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Onion: the "${state}" form is not built yet.`);
  return buildOnionArrangement('upright', seed);
};
export const buildOnionPair: FormBuilder = ({ seed }) => buildOnionArrangement('pair', seed);
export const buildOnionCut: FormBuilder = ({ seed }) => buildOnionArrangement('cut', seed);
