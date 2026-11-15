import { BufferAttribute, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { spinProfile, type ProfilePoint } from './kit/bowl';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';

/**
 * Mushrooms (archetype: round). Round 3, batch 1, after the user's references (Figma node
 * 184:349: a watercolour cluster of brown mushrooms, stems showing): seven chestnut mushrooms in a
 * small heap, all tipped over the way they fall and leaning in together, stems and gills showing.
 *
 * Each mushroom is one outline spun round its axis (the bowl kit's `spinProfile`): a domed cap,
 * its rim rolling under, the gills rising in to the stem, a stout stem with a rounded cut end.
 * A tipped mushroom rests on its cap's rim and the end of its stem, as a real one does.
 *
 * One piece, `cap` (all four merged). Maps: uv.x which part (0 the cap's top, 0.5 the gills, 1 the
 * stem, blending between), uv.y how far out or along; ownPos the point in the mushroom's own
 * upright frame (so the gills' lines run out from the stem however it lies), with each mushroom's
 * own number added to its height (ownPos.y, whole tens).
 */
interface Shape {
  cap: number;
  dome: number;
  stem: number;
  length: number;
}

function outline(s: Shape): ProfilePoint[] {
  const rim = s.length;
  const points: ProfilePoint[] = [{ r: 0, y: rim + s.dome, u: 0, v: 0 }];
  // The dome, from the top down to the rim.
  for (let k = 1; k <= 14; k++) {
    const a = (Math.PI / 2) * (k / 14);
    points.push({ r: s.cap * Math.sin(a) ** 0.92, y: rim + s.dome * Math.cos(a) ** 1.15, u: 0, v: k / 14 });
  }
  // The rim rolls under.
  points.push({ r: s.cap * 0.985, y: rim - 0.16, u: 0.15, v: 1 });
  points.push({ r: s.cap * 0.93, y: rim - 0.3, u: 0.28, v: 1 });
  points.push({ r: s.cap * 0.84, y: rim - 0.33, u: 0.4, v: 0.95 });
  // The gills: rising in toward the stem.
  for (let k = 1; k <= 6; k++) {
    const t = k / 6;
    points.push({ r: s.cap * 0.84 + (s.stem * 1.08 - s.cap * 0.84) * t, y: rim - 0.33 + 0.5 * t ** 1.4, u: 0.5, v: 1 - t });
  }
  // The stem: a soft collar under the gills, a slight swell, a rounded cut end.
  for (let k = 1; k <= 10; k++) {
    const t = k / 10;
    const y = (rim + 0.1) * (1 - t) + 0.22 * t;
    points.push({ r: s.stem * (1 + 0.1 * Math.sin(Math.PI * t) + 0.06 * t), y, u: 0.62 + 0.38 * Math.min(1, t * 3), v: t });
  }
  points.push({ r: s.stem * 0.95, y: 0.06, u: 1, v: 1 });
  points.push({ r: s.stem * 0.6, y: 0, u: 1, v: 1 });
  points.push({ r: 0, y: 0, u: 1, v: 1 });
  return points;
}

/** Is a point (in a mushroom's upright frame) inside it? A cap dome and a stem, a little generous. */
function inside(s: Shape, p: Vector3): boolean {
  const r = Math.hypot(p.x, p.z);
  if (p.y > -0.1 && p.y < s.length + 0.1 && r < s.stem * 1.2 + 0.1) return true;
  const dy = (p.y - (s.length - 0.3)) / (s.dome + 0.4);
  return p.y > s.length - 0.4 && (r / (s.cap + 0.1)) ** 2 + dy * dy < 1;
}

export const buildMushroom: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Mushroom: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x3a54);
  // A small heap, after the reference (the user, 2026-11-15: "the way they are placed feels wrong,
  // some are levitating and upright. the composition isnt working"): five mushrooms tipped over
  // and leaning in together, none standing. Each has its place and the way its stem points along
  // the table (`down`); stems mostly point in toward the middle and the camera, so the caps face
  // out, and one in the middle shows its cap. They are laid middle first; each next one slides in
  // until it just touches the heap.
  // (Seven now, each pointing its own way: the user, 2026-11-15, "maybe increase number, and
  // random rotation". The first sits in the middle; the others come in from all round, their
  // stems turned at random rather than all toward the middle.)
  const COUNT = 7;
  const plan = Array.from({ length: COUNT }, (_, n) => {
    if (n === 0) return { at: [0.2, -0.3], down: random() * Math.PI * 2, size: 1.02 };
    const around = ((n - 1) / (COUNT - 1)) * Math.PI * 2 + signed(random) * 0.35;
    return { at: [Math.cos(around) * 3, Math.sin(around) * 3], down: random() * Math.PI * 2, size: 0.74 + random() * 0.34 };
  });
  const placed: { shape: Shape; matrix: Matrix4 }[] = [];
  const meshes: BufferGeometry[] = [];
  plan.forEach((m, n) => {
    const shape: Shape = { cap: 2.5 * m.size * (1 + signed(random) * 0.05), dome: 2.05 * m.size * (1 + signed(random) * 0.1), stem: 1.0 * m.size, length: 2.5 * m.size * (1 + signed(random) * 0.08) };
    const ph = random() * Math.PI * 2;
    const g = spinProfile(outline(shape), 44, (angle, y) => (y > shape.length - 0.5 ? 1 + 0.035 * Math.cos(2 * angle + ph) + 0.025 * Math.cos(3 * angle + ph * 2) : 1 + 0.03 * Math.cos(2 * angle + ph)));
    // The outline runs from the cap's top down (the bowl kit's runs from the foot up), so the
    // faces come out wound inward: turn them round.
    const index = g.getIndex()!;
    for (let t = 0; t < index.count; t += 3) {
      const b = index.getX(t + 1);
      index.setX(t + 1, index.getX(t + 2));
      index.setX(t + 2, b);
    }
    // Its own frame for the skin, before it is laid down.
    const p = g.getAttribute('position') as BufferAttribute;
    const own = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) own.set([p.getX(i), p.getY(i) + n * 10, p.getZ(i)], i * 3);
    g.setAttribute('ownPos', new BufferAttribute(own, 3));
    // Tipped over, resting on its cap's rim and the end of its stem. The tilt is found, not
    // guessed: the angle at which the cap's lowest point and the stem's lowest point are level
    // (with a guessed tilt one end hovered a little: "levitating").
    const roll = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), random() * Math.PI * 2);
    const turnAt = (tilt: number) => {
      const stemWay = new Vector3(Math.cos(m.down) * Math.cos(tilt), -Math.sin(tilt), Math.sin(m.down) * Math.cos(tilt));
      return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), stemWay.negate()).multiply(roll);
    };
    const v = new Vector3();
    const lows = (q: Quaternion) => {
      let cap = Infinity;
      let stem = Infinity;
      for (let i = 0; i < p.count; i++) {
        const y = v.fromBufferAttribute(p, i).applyQuaternion(q).y;
        if (p.getY(i) > shape.length - 0.6) cap = Math.min(cap, y);
        else if (p.getY(i) < 0.6) stem = Math.min(stem, y);
      }
      return cap - stem;
    };
    let lo = 0;
    let hi = 1.3;
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (lows(turnAt(mid)) < 0) lo = mid;
      else hi = mid;
    }
    const turn = turnAt((lo + hi) / 2);
    const lay = (x: number, z: number) => {
      const matrix = new Matrix4().compose(new Vector3(x, 0, z), turn, new Vector3(1, 1, 1));
      let low = Infinity;
      for (let i = 0; i < p.count; i++) low = Math.min(low, v.fromBufferAttribute(p, i).applyMatrix4(matrix).y);
      matrix.setPosition(x, -low, z);
      return matrix;
    };
    const hits = (matrix: Matrix4) => {
      for (const other of placed) {
        const inverse = other.matrix.clone().invert();
        for (let i = 0; i < p.count; i += 2) if (inside(other.shape, v.fromBufferAttribute(p, i).applyMatrix4(matrix).applyMatrix4(inverse))) return true;
      }
      return false;
    };
    // From well outside, slide in along the line to the middle until it touches the heap (or
    // reaches the middle, for the first one), then step back out a hair so they just touch.
    const away = new Vector3(m.at[0], 0, m.at[1]);
    if (away.lengthSq() < 0.5) away.set(0, 0, -1);
    const reach0 = placed.length === 0 ? 0 : away.length();
    away.normalize();
    let reach = placed.length === 0 ? 0 : reach0 + 7;
    let matrix = lay(m.at[0], m.at[1]);
    if (placed.length > 0) {
      matrix = lay(away.x * reach, away.z * reach);
      while (reach > 0.2 && !hits(matrix)) {
        reach -= 0.1;
        matrix = lay(away.x * reach, away.z * reach);
      }
      reach += 0.12;
      matrix = lay(away.x * reach, away.z * reach);
    }
    placed.push({ shape, matrix });
    g.applyMatrix4(matrix);
    meshes.push(g);
  });
  return finishPieces([{ role: 'cap', geometry: mergeGeometries(meshes)! }]);
};
