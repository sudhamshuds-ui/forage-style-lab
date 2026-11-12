import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Matrix4, Vector3 } from 'three';
import { finishPieces, type FormBuilder, type FormPiece } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { flattenBase, roundBody } from './kit/round';
import { relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { sweepGeometry } from './kit/sweep';

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
 *   skin_glow  the whole avocado (a lathe, standing on its bottom) and the half (a lathe whose
 *              cross-section is a half disc with rounded corners: the cut face, its softly rounded
 *              edge and the skin in one smooth mesh), both one role: the skin's pebbling, specks
 *              and ripening blotches and the cut face's flesh are painted by the shader (the
 *              `avocado` skin) from a map (on the face, how far in from the skin) and from where
 *              each point sits relative to the pit (`ownPos`, for the hollow round it).
 *   pit        the pit, a slightly egg-shaped ball half sunk into the half's face (glossy).
 *   stem       the short woody nubs on the whole one and on the half's top end.
 */

/** The avocado along its axis (cm): its ends, and its width at the fullest. */
const BOTTOM = -5;
const TIP = 5.2;
const RADIUS = 3.45;
/** The pit: where it sits along the axis (cm, in the wide end), its radius and how far its centre sits below the face. */
const PIT_AT = -1.0;
const PIT_R = 1.85;
const PIT_SINK = 0.35;
/** The half's cut edge: how round it is (cm), never a sharp crease and never a one-cell bevel. */
const EDGE_ROUND = 0.38;
/** The gap left between the two (cm). */
const GAP = 0.08;

/**
 * The profile: radius (cm) at x along the axis, from the bottom to the top. A pear: an egg that
 * narrows toward the top in one smooth sweep, fullest a third of the way up, both ends blunt and
 * round (round 1's ends were a plain ellipse and read as pointy, the user, 2026-11-12: a
 * superellipse keeps them full right to the end).
 */
function profile(x: number): number {
  const t = (2 * (x - BOTTOM)) / (TIP - BOTTOM) - 1;
  if (t <= -1 || t >= 1) return 0;
  const egg = (1 - Math.abs(t) ** 2.4) ** (1 / 2.4);
  const pear = 1 - 0.33 * t - 0.05 * t * t + 0.05 * Math.exp(-(((t - 0.55) / 0.25) ** 2));
  return RADIUS * egg * pear;
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

/** The whole avocado, standing on its round bottom (axis along y), with its stem nub on top. */
function makeWhole(random: () => number): Piece {
  const half = (TIP - BOTTOM) / 2;
  const middle = (TIP + BOTTOM) / 2;
  const body = roundBody({
    halfLength: half,
    radius: (x) => profile(x + middle),
    lying: false,
    lopsided: 0.2,
    random,
    // A small soft dimple where the stem was.
    poleDimple: { depth: 0.15, width: 0.6, ends: 'end' },
    flatBase: 0,
    rings: 56,
    segments: 56,
  });
  body.translate(0, middle, 0);
  const pos = body.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) uv[2 * i] = (pos.getY(i) - BOTTOM) / (TIP - BOTTOM);
  body.setAttribute('uv', new BufferAttribute(uv, 2));

  // The stem nub: short, woody, a little bent, growing out of the top's dimple.
  const tip = new Vector3().fromBufferAttribute(pos, pos.count - 1);
  const bend = 0.12 + random() * 0.1;
  const stem = sweepGeometry({
    points: new CatmullRomCurve3([tip.clone().add(new Vector3(0, -0.25, 0)), tip.clone().add(new Vector3(bend * 0.5, 0.3, 0)), tip.clone().add(new Vector3(bend, 0.6, 0.05))]).getSpacedPoints(6),
    radius: (t) => 0.2 * (1 - 0.25 * t) * Math.sqrt(Math.min(1, (1 - t) / 0.08 + 0.2)),
    rings: 12,
    segments: 10,
  });
  const inside = (p: Vector3, margin: number) => p.y > BOTTOM - margin && p.y < TIP + margin && Math.hypot(p.x, p.z) < profile(p.y) * 1.05 + margin;
  return { geometries: [{ role: 'skin_glow', geometry: body }, { role: 'stem', geometry: stem }], body, inside, pose: new Matrix4() };
}

/**
 * The half's cross-section (y, z), a half disc of radius r below the cut (z <= 0) with both corners
 * rounded by rho: the flat face, a small round fillet, the skin's arc, the other fillet. Each point
 * carries how much it faces out of the cut (1 on the face, fading to 0 over the fillet).
 */
function halfSection(r: number, rho: number, counts: { flat: number; fillet: number; arc: number }): { y: number; z: number; face: number }[] {
  const w = Math.sqrt(Math.max(1e-6, (r - rho) ** 2 - rho ** 2));
  const tilt = Math.atan2(rho, w);
  const out: { y: number; z: number; face: number }[] = [];
  // The face, from -w to w.
  for (let i = 0; i < counts.flat; i++) out.push({ y: -w + (2 * w * i) / counts.flat, z: 0, face: 1 });
  // The fillet at +w: from straight up round to the skin's direction.
  for (let i = 0; i < counts.fillet; i++) {
    const a = Math.PI / 2 - ((Math.PI / 2 + tilt) * i) / counts.fillet;
    out.push({ y: w + rho * Math.cos(a), z: -rho + rho * Math.sin(a), face: (a + tilt) / (Math.PI / 2 + tilt) });
  }
  // The skin's arc, underneath.
  for (let i = 0; i < counts.arc; i++) {
    const a = -tilt - ((Math.PI - 2 * tilt) * i) / counts.arc;
    out.push({ y: r * Math.cos(a), z: r * Math.sin(a), face: 0 });
  }
  // The fillet at -w, back up to the face.
  for (let i = 0; i < counts.fillet; i++) {
    const a = -(Math.PI - tilt) - ((Math.PI / 2 + tilt) * i) / counts.fillet;
    out.push({ y: -w + rho * Math.cos(a), z: -rho + rho * Math.sin(a), face: 1 - (i / counts.fillet) });
  }
  return out;
}

/**
 * The half, cut lengthwise (the cut face is the plane z = 0, the skin below it), with its pit.
 * Built like a lathe whose cross-section is a rounded half disc, so the cut edge is one smooth
 * curve (round 1 used a distance-field mesh whose rounded edge was a single cell wide: the edge's
 * shading stepped in a sawtooth, the user, 2026-11-12).
 */
function makeHalf(): Piece {
  const counts = { flat: 28, fillet: 12, arc: 40 };
  const around = counts.flat + 2 * counts.fillet + counts.arc;
  const rings = 72;
  const positions: number[] = [];
  const uvs: number[] = [];
  const own: number[] = [];
  const push = (x: number, y: number, z: number, u: number, v: number) => {
    positions.push(x, y, z);
    uvs.push(u, v);
    // Where it is in the half's own frame, measured from the pit (cm): the shader shades the flesh
    // round the pit from it.
    own.push(x - PIT_AT, y, z);
  };
  // The ends: one point each, on the axis a touch under the face.
  push(BOTTOM, 0, -0.02, 0, 0);
  for (let k = 1; k < rings; k++) {
    // Rings closer together toward the ends, where the shape turns fastest.
    const s = (1 - Math.cos((Math.PI * k) / rings)) / 2;
    const x = BOTTOM + (TIP - BOTTOM) * s;
    const r = profile(x);
    const rho = Math.min(EDGE_ROUND, 0.42 * r);
    for (const p of halfSection(r, rho, counts)) {
      // The shader's map: x along the avocado (0 bottom, 1 top); y, on the face only, how far in
      // from the skin (0 at the skin, 1 on the middle line), fading out over the rounded edge.
      const inward = 1 - Math.min(1, Math.abs(p.y) / r);
      const v = p.face > 0 ? Math.max(0.0001, inward * p.face * p.face) : 0;
      push(x, p.y, p.z, s, v);
    }
  }
  push(TIP, 0, -0.02, 1, 0);
  const index: number[] = [];
  const ring = (k: number, j: number) => 1 + (k - 1) * around + (j % around);
  const last = 1 + (rings - 1) * around;
  for (let j = 0; j < around; j++) {
    index.push(0, ring(1, j), ring(1, j + 1));
    index.push(last, ring(rings - 1, j + 1), ring(rings - 1, j));
  }
  for (let k = 1; k < rings - 1; k++) {
    for (let j = 0; j < around; j++) {
      const a = ring(k, j);
      const b = ring(k, j + 1);
      const c = ring(k + 1, j);
      const d = ring(k + 1, j + 1);
      index.push(a, d, b, a, c, d);
    }
  }
  const body = new BufferGeometry();
  body.setAttribute('position', new Float32BufferAttribute(positions, 3));
  body.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  body.setAttribute('ownPos', new Float32BufferAttribute(own, 3));
  body.setIndex(index);
  body.computeVertexNormals();

  // The pit: a slightly egg-shaped ball, half sunk into the face's wide end. Only the part above
  // the face shows; the rest is inside the flesh.
  const pitAt = new Vector3(PIT_AT, 0, -PIT_SINK);
  const cell = 0.13;
  const pitField = (x: number, y: number, z: number) => Math.hypot((x - pitAt.x) / 1.1, y - pitAt.y, z - pitAt.z) - PIT_R;
  const pitShown = (x: number, y: number, z: number) => Math.max(pitField(x, y, z), -z - 0.05);
  const pitMin = new Vector3(pitAt.x - PIT_R * 1.2 - 0.03, -PIT_R - 0.17, -0.07);
  const pitMax = new Vector3(pitAt.x + PIT_R * 1.2 + 0.1, PIT_R + 0.15, PIT_R + 0.2);
  const pit = relaxOnSurface(surfaceNets(pitShown, pitMin, pitMax, cell), pitShown, cell);

  // A short woody nub at the top end, cut in half with the rest (it stays on this half).
  const stem = sweepGeometry({
    points: new CatmullRomCurve3([new Vector3(TIP - 0.3, 0, -0.22), new Vector3(TIP + 0.15, 0.02, -0.2), new Vector3(TIP + 0.45, 0.06, -0.16)]).getSpacedPoints(5),
    radius: (t) => 0.17 * (1 - 0.2 * t) * Math.sqrt(Math.min(1, (1 - t) / 0.1 + 0.2)),
    rings: 10,
    segments: 10,
  });

  const inside = (p: Vector3, margin: number) => p.z < margin && p.x > BOTTOM - margin && p.x < TIP + margin && Math.hypot(p.y, p.z) < profile(p.x) * 1.02 + margin;
  return {
    geometries: [{ role: 'skin_glow', geometry: body }, { role: 'pit', geometry: pit }, { role: 'stem', geometry: stem }],
    body,
    inside,
    pose: new Matrix4(),
  };
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

  // After the user's sketch (2026-11-12): the whole one stands upright behind, on the left, its
  // stem up; the half lies in front and to the right, its face tipped toward the camera, its wide
  // end (the pit) by the whole one and its narrow top to the right, leaning back against it.
  const whole = makeWhole(random);
  place(whole, new Matrix4().makeRotationY(random() * Math.PI * 2));
  restOnTable(whole, 0.2);

  const half = makeHalf();
  // Face up (its normal +z turns to +y), then tipped toward the camera, then its top end turned a
  // little away, to the back right.
  place(half, new Matrix4().makeRotationX(-Math.PI / 2));
  place(half, new Matrix4().makeRotationX(0.62));
  place(half, new Matrix4().makeRotationY(0.18 + signed(random) * 0.04));
  restOnTable(half, 0.3);
  slideUntilTouching(half, whole, new Vector3(-0.45, 0, -1).normalize());

  const pieces: FormPiece[] = [...whole.geometries, ...half.geometries];
  return finishPieces(pieces);
};
