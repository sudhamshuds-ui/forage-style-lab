import { BufferAttribute, CatmullRomCurve3, Matrix4, Vector3, type BufferGeometry } from 'three';
import { finishPieces, type FormBuilder, type FormPiece } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { flattenBase, roundBody } from './kit/round';
import { relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { sweepGeometry } from './kit/sweep';
import { roundedIntersection } from './kit/wedge';

/**
 * Avocado (archetype: round, whole and cut). Round 2's third ingredient: one whole and one half
 * with its pit (the user, 2026-11-11).
 *
 * What makes it an avocado, not a pear or a mango:
 *   - a pear shape: a full, round bottom and a narrower, rounded top, never a point,
 *   - a short woody stem nub at the top,
 *   - cut lengthwise: a flat face of creamy yellow flesh turning bright green toward a thin dark
 *     skin, and a big, round, glossy brown pit sitting proud of the face in the wide end.
 *
 * Pieces, like layers in a pre-comp:
 *   skin_glow  the whole avocado (a lathe, lying on its side) and the half (a distance field cut
 *              lengthwise along its axis, the cut edge softly rounded), both one role: the skin's
 *              pebbling and specks and the cut face's flesh are painted by the shader (the
 *              `avocado` skin) from a map (on the face, how far in from the skin).
 *   pit        the pit, a slightly egg-shaped ball half sunk into the half's face.
 *   stem       the short woody nub on the whole one.
 */

/** The avocado along its axis (cm): its ends, and its width at the fullest. */
const BOTTOM = -5;
const TIP = 5.2;
const RADIUS = 3.55;
/** Where the bulb is fullest (the pit sits there), cm along the axis. */
const BULB = { at: -1.4 };
/** The pit: its radius (cm) and how far it sits below the face (its centre, cm). */
const PIT_R = 1.85;
const PIT_SINK = 0.35;
const CELL = 0.17;
/** The gap left between the two (cm). */
const GAP = 0.08;

/**
 * The profile: radius (cm) at x along the axis, from the bottom to the top. A pear: an egg that
 * narrows toward the top in one smooth sweep, with the faintest waist (two blended balls read as
 * a peanut), fullest a third of the way up from the bottom, round at both ends.
 */
function profile(x: number): number {
  const t = (2 * (x - BOTTOM)) / (TIP - BOTTOM) - 1;
  if (t <= -1 || t >= 1) return 0;
  const egg = Math.sqrt(1 - t * t);
  const pear = 1 - 0.4 * t - 0.04 * t * t + 0.06 * Math.exp(-(((t - 0.55) / 0.25) ** 2));
  return RADIUS * egg * pear * 1.04;
}

interface Piece {
  geometries: { role: string; geometry: BufferGeometry }[];
  body: BufferGeometry;
  /** Is a point (in the piece's own frame) inside its body? */
  inside: (p: Vector3, margin: number) => boolean;
  pose: Matrix4;
}

function place(piece: Piece, m: Matrix4): void {
  for (const g of piece.geometries) g.geometry.applyMatrix4(m);
  piece.pose.premultiply(m);
}

function restOnTable(piece: Piece, settle: number): void {
  piece.body.computeBoundingBox();
  place(piece, new Matrix4().makeTranslation(0, -piece.body.boundingBox!.min.y, 0));
  flattenBase(piece.body, settle);
}

/** The whole avocado, lying on its side (axis along x), with its stem nub. */
function makeWhole(random: () => number): Piece {
  const half = (TIP - BOTTOM) / 2;
  const middle = (TIP + BOTTOM) / 2;
  const body = roundBody({
    halfLength: half,
    radius: (x) => profile(x + middle),
    lying: true,
    lopsided: 0.45,
    random,
    // A small soft dimple where the stem was.
    poleDimple: { depth: 0.15, width: 0.6, ends: 'end' },
    flatBase: 0,
    rings: 52,
    segments: 56,
  });
  body.translate(middle, 0, 0);
  const pos = body.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) uv[2 * i] = (pos.getX(i) - BOTTOM) / (TIP - BOTTOM);
  body.setAttribute('uv', new BufferAttribute(uv, 2));

  // The stem nub: short, woody, a little bent, growing out of the top's dimple.
  const tip = new Vector3().fromBufferAttribute(pos, pos.count - 1);
  const bend = signed(random) * 0.15;
  const stem = sweepGeometry({
    points: new CatmullRomCurve3([tip.clone().add(new Vector3(-0.25, 0, 0)), tip.clone().add(new Vector3(0.3, bend, 0.05)), tip.clone().add(new Vector3(0.6, bend * 2, 0.12))]).getSpacedPoints(6),
    radius: (t) => 0.22 * (1 - 0.25 * t) * Math.sqrt(Math.min(1, (1 - t) / 0.08 + 0.2)),
    rings: 12,
    segments: 10,
  });
  const inside = (p: Vector3, margin: number) => p.x > BOTTOM && p.x < TIP && Math.hypot(p.y, p.z) < profile(p.x) * 1.05 + margin;
  return { geometries: [{ role: 'skin_glow', geometry: body }, { role: 'stem', geometry: stem }], body, inside, pose: new Matrix4() };
}

/** The half, cut lengthwise (the cut face is the plane z = 0, the skin below it), with its pit. */
function makeHalf(): Piece {
  const pitAt = new Vector3(BULB.at + 0.2, 0, -PIT_SINK);
  // The body: inside the avocado and below the cut, the cut's edge softly rounded (a real cut edge
  // catches a line of light; never a sharp crease).
  const avocado = (x: number, y: number, z: number) => {
    const r = profile(x);
    const along = Math.max(BOTTOM - x, x - TIP, 0);
    return (r > 0 ? Math.hypot(y, z) - r : Math.hypot(y, z)) + along;
  };
  const field = (x: number, y: number, z: number) => roundedIntersection([avocado(x, y, z), z], 0.18);
  const min = new Vector3(BOTTOM - 0.513, -RADIUS - 0.407, -RADIUS - 0.411);
  const max = new Vector3(TIP + 0.5, RADIUS + 0.4, 0.5);
  const body = relaxOnSurface(surfaceNets(field, min, max, CELL), field, CELL);

  // The shader's map: x how far along the avocado (0 bottom, 1 top); y, on the cut face only, how
  // far in from the skin (0 at the skin, 1 on the middle line).
  body.computeVertexNormals();
  const pos = body.getAttribute('position');
  const normal = body.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    uv[2 * i] = (x - BOTTOM) / (TIP - BOTTOM);
    const r = profile(x);
    // On the face (its normal points up out of the cut), fading out over the rounded edge by the
    // normal, so the face's colour meets the skin's softly instead of in a ragged line.
    const facing = Math.min(1, Math.max(0, (normal.getZ(i) - 0.55) / 0.35));
    uv[2 * i + 1] = facing > 0 && r > 0 ? Math.max(0.0001, (1 - Math.abs(pos.getY(i)) / r) * facing) : 0;
  }
  body.setAttribute('uv', new BufferAttribute(uv, 2));

  // The pit: a slightly egg-shaped ball, half sunk into the face's wide end.
  const pitField = (x: number, y: number, z: number) => Math.hypot((x - pitAt.x) / 1.1, y - pitAt.y, z - pitAt.z) - PIT_R;
  const pitMin = new Vector3(pitAt.x - PIT_R * 1.2 - 0.03, -PIT_R - 0.17, -0.07);
  const pitMax = new Vector3(pitAt.x + PIT_R * 1.2 + 0.1, PIT_R + 0.15, PIT_R + 0.2);
  // Only the part above the face shows; the rest is inside the flesh (closed by the face's plane).
  const pitShown = (x: number, y: number, z: number) => Math.max(pitField(x, y, z), -z - 0.05);
  const pit = relaxOnSurface(surfaceNets(pitShown, pitMin, pitMax, CELL * 0.8), pitShown, CELL * 0.8);

  const inside = (p: Vector3, margin: number) => p.z < margin && p.x > BOTTOM && p.x < TIP && Math.hypot(p.y, p.z) < profile(p.x) * 1.02 + margin;
  return { geometries: [{ role: 'skin_glow', geometry: body }, { role: 'pit', geometry: pit }], body, inside, pose: new Matrix4() };
}

/** Slide `mover` toward `still` until the bodies just touch, checking every point against shapes. */
function slideUntilTouching(mover: Piece, still: Piece, direction: Vector3): void {
  const probe = new Vector3();
  const overlaps = () => {
    const stillInv = still.pose.clone().invert();
    const moverInv = mover.pose.clone().invert();
    const a = mover.body.getAttribute('position');
    for (let i = 0; i < a.count; i += 3) if (still.inside(probe.fromBufferAttribute(a, i).applyMatrix4(stillInv), GAP)) return true;
    const b = still.body.getAttribute('position');
    for (let i = 0; i < b.count; i += 3) if (mover.inside(probe.fromBufferAttribute(b, i).applyMatrix4(moverInv), GAP)) return true;
    return false;
  };
  place(mover, new Matrix4().makeTranslation(-direction.x * 14, 0, -direction.z * 14));
  for (let i = 0; i < 300; i++) {
    place(mover, new Matrix4().makeTranslation(direction.x * 0.05, 0, direction.z * 0.05));
    if (overlaps()) {
      place(mover, new Matrix4().makeTranslation(-direction.x * 0.05, 0, -direction.z * 0.05));
      return;
    }
  }
}

export const buildAvocado: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Avocado: the "${state}" form is not built yet.`);
  const random = seededRandom(seed ^ 0xa70ca);

  // The whole one lies behind, on its side, its top toward the back right.
  const whole = makeWhole(random);
  place(whole, new Matrix4().makeRotationY(0.55));
  restOnTable(whole, 0.15);

  // The half lies in front on its skin, its face up and tipped toward the camera and the light,
  // its wide end (the pit) toward the front left.
  const half = makeHalf();
  // Face up (its normal +z turns to +y), then tipped toward the camera, then turned.
  place(half, new Matrix4().makeRotationX(-Math.PI / 2));
  place(half, new Matrix4().makeRotationX(0.62));
  place(half, new Matrix4().makeRotationY(-0.35 + signed(random) * 0.05));
  restOnTable(half, 0.12);
  slideUntilTouching(half, whole, new Vector3(-0.2, 0, -1).normalize());

  const pieces: FormPiece[] = [...whole.geometries, ...half.geometries];
  return finishPieces(pieces);
};

