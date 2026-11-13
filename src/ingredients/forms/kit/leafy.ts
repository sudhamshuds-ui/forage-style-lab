import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Vector3 } from 'three';
import { smoothstep } from './lathe';

/**
 * The leafy kit (round 2: spinach first, then romaine and napa cabbage).
 *
 *   leafSheet  one leaf: a sheet shaped by its outline, softly cupped along its midrib, its edge a
 *              little wavy, its tip curling. Painted on both sides (`doubleSided` on its piece),
 *              so it has no thickness to model. Its map: x from the base of the blade (0) to the
 *              tip (1), y across (0 one edge, 0.5 the midrib, 1 the other edge).
 *   Drape      a height map of everything already laid on the table. Laying leaves one by one,
 *              each settles over the ones below (like leaves dropped on each other), so no two
 *              sheets ever pass through each other, and none sits exactly at table height (two
 *              surfaces at the same depth flicker: the broccoli and butter lesson).
 */

export interface LeafSheetOptions {
  /** Where the blade starts (cm, its base on the midrib). */
  base: Vector3;
  /** Which way the leaf points, on the table (radians round Y; 0 = +X). */
  turn: number;
  /** Blade length and widest width (cm). */
  length: number;
  width: number;
  /** Half-width at u (0 base to 1 tip), as a share of half the widest width. */
  outline: (u: number) => number;
  /** Height of the midrib above the base at u (cm): the leaf's gentle arc and its tip's curl. */
  lift: (u: number) => number;
  /** How much the two halves rise from the midrib (cm at the edge): the cup. */
  cup: number;
  /** How wavy the edge is (cm up and down), and how many waves along each side. */
  ruffle: number;
  waves: number;
  /** A slight roll of the whole blade to one side (cm at the edge). */
  tilt: number;
  /** Mesh density along and across. */
  rows: number;
  cols: number;
  /** Seeded phase for the ruffle, so each leaf waves its own way. */
  phase: number;
  /** A twist along its length (radians at the tip): the blade turns round its midrib. */
  twist?: number;
  /**
   * Its own frame, for a leaf that does not lie on the table (a bunch): `along` points down the
   * midrib, `up` out of its face. Without it, the leaf lies on the table along `turn`.
   */
  frame?: { along: Vector3; up: Vector3 };
}

export function leafSheet(o: LeafSheetOptions): BufferGeometry {
  const along = o.frame ? o.frame.along.clone().normalize() : new Vector3(Math.cos(o.turn), 0, Math.sin(o.turn));
  const up = o.frame ? o.frame.up.clone().addScaledVector(along, -o.frame.up.dot(along)).normalize() : new Vector3(0, 1, 0);
  const side = new Vector3().crossVectors(along, up).normalize();
  const point = new Vector3();
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i <= o.rows; i++) {
    const u = i / o.rows;
    const half = Math.max(0.05, (o.width / 2) * o.outline(u));
    for (let j = 0; j <= o.cols; j++) {
      const v = (j / o.cols) * 2 - 1;
      const across = v * half;
      const edge = Math.abs(v);
      // The cup rises toward the edges; the edge waves; the whole blade rolls a little.
      // (Calmed toward the tip, where the two halves meet: waving out of step there notched it.)
      const wave = o.ruffle * edge ** 2 * Math.sin(o.waves * Math.PI * u + o.phase + (v > 0 ? 0 : 1.7)) * (1 - smoothstep(0.75, 0.97, u));
      // The cup fades out toward the tip (and a little at the base): cupped right to the tip, the
      // two halves met in a V-notch along the midrib that read as a pale slit.
      const cupHere = o.cup * smoothstep(0, 0.15, u) * (1 - smoothstep(0.7, 1, u));
      const lift = cupHere * edge ** 1.6 + wave + o.tilt * v * (1 - 0.6 * smoothstep(0.75, 1, u));
      // The twist turns the cross-section round the midrib, more toward the tip.
      const angle = (o.twist ?? 0) * u;
      const out = across * Math.cos(angle) - lift * Math.sin(angle);
      const height = o.lift(u) + across * Math.sin(angle) + lift * Math.cos(angle);
      const d = u * o.length;
      point.copy(o.base).addScaledVector(along, d).addScaledVector(up, height).addScaledVector(side, out);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, j / o.cols);
    }
  }
  const index: number[] = [];
  const at = (i: number, j: number) => i * (o.cols + 1) + j;
  for (let i = 0; i < o.rows; i++) {
    for (let j = 0; j < o.cols; j++) {
      const a = at(i, j);
      const b = at(i, j + 1);
      const c = at(i + 1, j);
      const d = at(i + 1, j + 1);
      // Wound so the leaf's top faces up.
      index.push(a, b, c, b, d, c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(index);
  return geometry;
}

/**
 * A height map over the table (cm). `lift` raises a set of points so each sits at least `clear`
 * above whatever is already there; `add` then puts them on the map, each as a soft cone (never a
 * step). Lay the bottom leaf first.
 */
export class Drape {
  private readonly cells: Float32Array;
  constructor(
    private readonly min: { x: number; z: number },
    private readonly size: number,
    private readonly cell: number,
    /** How fast the cone round a placed point falls away (cm down per cm out). */
    private readonly slope = 0.9,
    floor = 0,
  ) {
    const n = Math.ceil(size / cell) + 1;
    this.cells = new Float32Array(n * n).fill(floor);
  }

  private index(x: number, z: number): number {
    const n = Math.ceil(this.size / this.cell) + 1;
    const i = Math.round((x - this.min.x) / this.cell);
    const k = Math.round((z - this.min.z) / this.cell);
    if (i < 0 || k < 0 || i >= n || k >= n) return -1;
    return k * n + i;
  }

  /** The height already there under (x, z). */
  heightAt(x: number, z: number): number {
    const at = this.index(x, z);
    return at < 0 ? 0 : this.cells[at];
  }

  /** Lift each point to clear what is already below it (does not add them to the map). */
  lift(points: Vector3[], clear: number): number {
    let most = 0;
    for (const p of points) {
      const rise = Math.max(0, this.heightAt(p.x, p.z) + clear - p.y);
      p.y += rise;
      most = Math.max(most, rise);
    }
    return most;
  }

  /** Add points to the map, each as a soft cone, so whatever is laid next drapes smoothly over it. */
  add(points: Vector3[], radius: number): void {
    const n = Math.ceil(this.size / this.cell) + 1;
    const reach = Math.ceil(radius / this.cell);
    for (const p of points) {
      const ci = Math.round((p.x - this.min.x) / this.cell);
      const ck = Math.round((p.z - this.min.z) / this.cell);
      for (let dk = -reach; dk <= reach; dk++) {
        for (let di = -reach; di <= reach; di++) {
          const i = ci + di;
          const k = ck + dk;
          if (i < 0 || k < 0 || i >= n || k >= n) continue;
          const distance = Math.hypot(di, dk) * this.cell;
          if (distance > radius) continue;
          const h = p.y - distance * this.slope;
          const at = k * n + i;
          if (h > this.cells[at]) this.cells[at] = h;
        }
      }
    }
  }
}

/** The points of a geometry as vectors (they write back with `writeBack`). */
export function pointsOf(geometry: BufferGeometry): Vector3[] {
  const position = geometry.getAttribute('position');
  const points: Vector3[] = [];
  for (let i = 0; i < position.count; i++) points.push(new Vector3().fromBufferAttribute(position, i));
  return points;
}

export function writeBack(geometry: BufferGeometry, points: Vector3[]): void {
  const position = geometry.getAttribute('position');
  points.forEach((p, i) => position.setXYZ(i, p.x, p.y, p.z));
  position.needsUpdate = true;
}

/**
 * Drape a sheet like cloth over cloth: work out how far each point must rise to clear what is
 * below, then spread that rise out smoothly across the sheet (each round, a point takes the larger
 * of what it needs and the average round it), so the leaf tilts gently over the one below. Lifting
 * only the points that needed it folded the leaf into a steep wall (spinach, 2026-11-12).
 */
export function liftSheet(points: Vector3[], rows: number, cols: number, drape: Drape, clear: number, rounds = 40): void {
  const at = (i: number, j: number) => i * (cols + 1) + j;
  const need = points.map((p) => Math.max(0, drape.heightAt(p.x, p.z) + clear - p.y));
  let rise = need.slice();
  for (let r = 0; r < rounds; r++) {
    const next = rise.slice();
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= cols; j++) {
        let sum = 0;
        let count = 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ii = i + di;
          const jj = j + dj;
          if (ii < 0 || jj < 0 || ii > rows || jj > cols) continue;
          sum += rise[at(ii, jj)];
          count++;
        }
        const k = at(i, j);
        next[k] = Math.max(need[k], sum / count);
      }
    }
    rise = next;
  }
  points.forEach((p, k) => (p.y += rise[k]));
}

/**
 * Smooth a sheet's lift after draping (a few rounds on its grid), never letting it sink below
 * where draping put it: the drape can leave small creases where it lifted part of a leaf.
 */
export function smoothSheet(points: Vector3[], rows: number, cols: number, rounds: number): void {
  const at = (i: number, j: number) => i * (cols + 1) + j;
  for (let r = 0; r < rounds; r++) {
    const next = points.map((p) => p.y);
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= cols; j++) {
        let sum = 0;
        let count = 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ii = i + di;
          const jj = j + dj;
          if (ii < 0 || jj < 0 || ii > rows || jj > cols) continue;
          sum += points[at(ii, jj)].y;
          count++;
        }
        const k = at(i, j);
        next[k] = Math.max(points[k].y, points[k].y * 0.5 + (sum / count) * 0.5);
      }
    }
    next.forEach((y, k) => (points[k].y = y));
  }
}

/**
 * The round drape, for a bunch: the same idea as Drape, but round an axis (the bunch's stems).
 * For each place along the axis and each angle round it, it keeps how far out the leaves laid so
 * far reach. Laying the inner leaves first, each next leaf is pushed out to clear them, smoothly
 * (`liftSheetOut`), so no two leaves pass through each other however they point.
 */
export class RoundDrape {
  private readonly cells: Float32Array;
  private readonly steps: number;
  private readonly turns: number;
  constructor(
    readonly origin: Vector3,
    readonly axis: Vector3,
    readonly up: Vector3,
    private readonly from: number,
    readonly to: number,
    private readonly cell = 0.2,
    private readonly slope = 0.35,
  ) {
    this.steps = Math.ceil((to - from) / cell) + 1;
    this.turns = 180;
    this.cells = new Float32Array(this.steps * this.turns).fill(0);
  }

  /** Where a point is round the axis: along it, the angle round it, and how far out. */
  measure(p: Vector3): { s: number; angle: number; r: number; out: Vector3 } {
    const rel = p.clone().sub(this.origin);
    const s = rel.dot(this.axis);
    const radial = rel.addScaledVector(this.axis, -s);
    const r = radial.length();
    const side = new Vector3().crossVectors(this.axis, this.up);
    const angle = Math.atan2(radial.dot(side), radial.dot(this.up));
    const out = r > 1e-6 ? radial.divideScalar(r) : this.up.clone();
    return { s, angle, r, out };
  }

  private index(s: number, angle: number): number {
    const i = Math.round((s - this.from) / this.cell);
    if (i < 0 || i >= this.steps) return -1;
    const k = ((Math.round(((angle + Math.PI) / (2 * Math.PI)) * this.turns) % this.turns) + this.turns) % this.turns;
    return k * this.steps + i;
  }

  reachAt(s: number, angle: number): number {
    const at = this.index(s, angle);
    return at < 0 ? 0 : this.cells[at];
  }

  /** Add points: each leaves a soft cone, measured along the axis and round it (in cm). */
  add(points: Vector3[], radius: number): void {
    for (const p of points) {
      const { s, angle, r } = this.measure(p);
      const reachSteps = Math.ceil(radius / this.cell);
      const angleStep = (2 * Math.PI) / this.turns;
      const reachTurns = Math.min(this.turns / 2, Math.ceil(radius / Math.max(0.3, r) / angleStep));
      for (let di = -reachSteps; di <= reachSteps; di++) {
        for (let dk = -reachTurns; dk <= reachTurns; dk++) {
          const ss = s + di * this.cell;
          const aa = angle + dk * angleStep;
          const distance = Math.hypot(di * this.cell, dk * angleStep * r);
          if (distance > radius) continue;
          const at = this.index(ss, aa);
          if (at < 0) continue;
          const h = r - distance * this.slope;
          if (h > this.cells[at]) this.cells[at] = h;
        }
      }
    }
  }
}

/**
 * Push a sheet out from the axis to clear what is already there, the push spread smoothly over the
 * sheet (like liftSheet, round the axis instead of up from the table).
 */
export function liftSheetOut(points: Vector3[], rows: number, cols: number, drape: RoundDrape, clear: number, rounds = 40): void {
  const at = (i: number, j: number) => i * (cols + 1) + j;
  const measured = points.map((p) => drape.measure(p));
  const need = measured.map((m) => Math.max(0, drape.reachAt(m.s, m.angle) + clear - m.r));
  let rise = need.slice();
  for (let r = 0; r < rounds; r++) {
    const next = rise.slice();
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= cols; j++) {
        let sum = 0;
        let count = 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ii = i + di;
          const jj = j + dj;
          if (ii < 0 || jj < 0 || ii > rows || jj > cols) continue;
          sum += rise[at(ii, jj)];
          count++;
        }
        const k = at(i, j);
        next[k] = Math.max(need[k], sum / count);
      }
    }
    rise = next;
  }
  points.forEach((p, k) => p.addScaledVector(measured[k].out, rise[k]));
}


/**
 * One leaf on its stem as a single closed shape (the user, 2026-11-12: "dont treat stem and leaf
 * as a seperate object"): a round stem that flattens and widens into the blade, its ridge running
 * on as the midrib, the blade thinning out to its edges. Built as rings along a centreline; each
 * ring's shape morphs from a circle (the stem) to a thin, cupped lens (the blade).
 *
 * Its map: x from -1 at the stem's cut end to 0 where the blade starts, then to 1 at the tip; y
 * across the blade, 0 to 1 on the top face and 1 to 2 on the underside (0.5 and 1.5: the midrib).
 */
export interface StemmedLeafOptions {
  /** The stem's centreline, from its cut end to where the blade starts (cm). */
  stem: Vector3[];
  /** The blade: which way it runs from the stem's end, and which way its face looks. */
  along: Vector3;
  up: Vector3;
  length: number;
  width: number;
  outline: (u: number) => number;
  /** Height of the midrib off the blade's straight line, along `up`, at u (cm). */
  lift: (u: number) => number;
  cup: number;
  ruffle: number;
  waves: number;
  twist: number;
  phase: number;
  /** One side of the blade rolled up (cm at its edge; + the right side, - the left), optional. */
  edgeRoll?: number;
  /** The stem's radius (cm). */
  stemRadius: number;
  /** Rings along the stem and the blade, and points round each ring. */
  stemRings: number;
  bladeRings: number;
  around: number;
}

export interface StemmedLeaf {
  /** Every ring's points (first ring at the cut end), and each ring's centre. */
  rings: Vector3[][];
  centres: Vector3[];
  /** Ring index where the blade starts. */
  bladeStart: number;
  uvs: number[];
}

export function stemmedLeaf(o: StemmedLeafOptions): StemmedLeaf {
  const along = o.along.clone().normalize();
  const bladeEnd = o.stem[o.stem.length - 1];
  // The whole centreline: the stem, then the blade's midrib (its lift along `up`).
  const upBase = o.up.clone().addScaledVector(along, -o.up.dot(along)).normalize();
  const bladePoints: Vector3[] = [];
  for (let k = 1; k <= 8; k++) {
    const u = k / 8;
    bladePoints.push(bladeEnd.clone().addScaledVector(along, u * o.length).addScaledVector(upBase, o.lift(u)));
  }
  const stemCurve = new CatmullRomCurve3(o.stem);
  const bladeCurve = new CatmullRomCurve3([bladeEnd.clone(), ...bladePoints]);
  const rings: Vector3[][] = [];
  const centres: Vector3[] = [];
  const uvs: number[] = [];
  const ringCount = o.stemRings + o.bladeRings;
  const tangent = new Vector3();
  for (let k = 0; k <= ringCount; k++) {
    const onStem = k < o.stemRings;
    const t = onStem ? k / o.stemRings : (k - o.stemRings) / o.bladeRings;
    const centre = onStem ? stemCurve.getPointAt(t) : bladeCurve.getPointAt(t);
    (onStem ? stemCurve.getTangentAt(t) : bladeCurve.getTangentAt(Math.min(t, 0.999))).normalize();
    tangent.copy(onStem ? stemCurve.getTangentAt(t) : bladeCurve.getTangentAt(Math.min(t, 0.999))).normalize();
    // The ring's frame: `up` kept square to the centreline.
    const up = upBase.clone().addScaledVector(tangent, -upBase.dot(tangent)).normalize();
    const side = new Vector3().crossVectors(tangent, up).normalize();
    // The shape: a circle on the stem, morphing into the blade's thin lens over its first stretch.
    const u = onStem ? 0 : t;
    const blend = onStem ? 0 : smoothstep(0, 0.12, u);
    const half = Math.max(o.stemRadius * (1 - 0.3 * blend), (o.width / 2) * o.outline(u) * blend);
    // The midrib: thick where it leaves the stem, thinning toward the tip.
    const thick = onStem ? o.stemRadius : o.stemRadius * (1 - blend) + (0.035 + 0.05 * (1 - u)) * blend;
    // A stem tapers a little toward the blade; its cut end is softly bevelled.
    const stemScale = onStem ? (1.08 - 0.12 * t) * Math.sqrt(Math.min(1, (t + 0.004) / 0.03)) : 1;
    const angle = o.twist * u;
    const cupHere = o.cup * smoothstep(0, 0.15, u) * (1 - smoothstep(0.7, 1, u)) * blend;
    const ring: Vector3[] = [];
    for (let j = 0; j < o.around; j++) {
      const psi = (2 * Math.PI * j) / o.around;
      const x = Math.cos(psi);
      const y = Math.sin(psi);
      const across = x * half * stemScale;
      const edge = Math.abs(x);
      // The cup lifts the blade's halves; the edge waves (calmed at the tip).
      const wave = o.ruffle * blend * edge ** 2 * Math.sin(o.waves * Math.PI * u + o.phase + (x > 0 ? 0 : 1.7)) * (1 - smoothstep(0.75, 0.97, u));
      // One edge rolled up (spinach: a side of some leaves curls over), fading out at both ends.
      const rollSide = Math.max(0, (o.edgeRoll ?? 0) > 0 ? x : -x);
      const roll = Math.abs(o.edgeRoll ?? 0) * blend * rollSide ** 2.2 * smoothstep(0.08, 0.35, u) * (1 - smoothstep(0.8, 1, u));
      const rise = cupHere * edge ** 1.6 + wave + roll;
      // The lens: thickest at the midrib, thin at the edges.
      const depth = y * thick * stemScale * (onStem ? 1 : Math.sqrt(Math.max(0, 1 - edge * edge * 0.98)) * 0.6 + 0.4 * (1 - edge));
      const out = across * Math.cos(angle) - (rise + depth) * Math.sin(angle);
      const height = across * Math.sin(angle) + (rise + depth) * Math.cos(angle);
      ring.push(centre.clone().addScaledVector(side, out).addScaledVector(up, height));
      const x01 = onStem ? -1 + t : u;
      const y01 = (1 - x) / 2 + (y < 0 ? 1 : 0);
      uvs.push(x01, y01);
    }
    rings.push(ring);
    centres.push(centre);
  }
  return { rings, centres, bladeStart: o.stemRings, uvs };
}

/**
 * The finished mesh of a stemmed leaf (rings joined round and along, both ends closed). With `id`
 * (0..1, the leaf's own number) every point carries it as `ownPos.x`, so the skin can give each
 * leaf its own veins and wrinkles.
 */
export function stemmedLeafGeometry(leaf: StemmedLeaf, id?: number): BufferGeometry {
  const around = leaf.rings[0].length;
  const positions: number[] = [];
  for (const ring of leaf.rings) for (const p of ring) positions.push(p.x, p.y, p.z);
  const uvs = leaf.uvs.slice();
  // The two end caps: one point each, in the middle of the first and last rings.
  const first = leaf.rings[0].reduce((a, p) => a.add(p), new Vector3()).divideScalar(around);
  const last = leaf.rings[leaf.rings.length - 1].reduce((a, p) => a.add(p), new Vector3()).divideScalar(around);
  const startCap = positions.length / 3;
  positions.push(first.x, first.y, first.z);
  uvs.push(-1, 0.5);
  const endCap = positions.length / 3;
  positions.push(last.x, last.y, last.z);
  uvs.push(1, 0.5);
  const index: number[] = [];
  const at = (k: number, j: number) => k * around + (j % around);
  for (let k = 0; k < leaf.rings.length - 1; k++) {
    for (let j = 0; j < around; j++) index.push(at(k, j), at(k + 1, j), at(k + 1, j + 1), at(k, j), at(k + 1, j + 1), at(k, j + 1));
  }
  const n = leaf.rings.length - 1;
  for (let j = 0; j < around; j++) {
    index.push(startCap, at(0, j + 1), at(0, j));
    index.push(endCap, at(n, j), at(n, j + 1));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(index);
  if (id !== undefined) {
    const own = new Float32Array((positions.length / 3) * 3);
    for (let i = 0; i < own.length; i += 3) own[i] = id;
    geometry.setAttribute('ownPos', new BufferAttribute(own, 3));
  }
  return geometry;
}

/**
 * Let a stemmed leaf's blade settle under its own weight onto what is already on the table (the
 * `Drape` height map: the table, the stems, the leaves laid before it), like cloth: each point
 * rises only as far as it needs to rest `clear` above what is below, and the rise spreads softly
 * over the leaf (`stiffness` rounds), so it tents over a leaf beneath and folds round its edge
 * instead of keeping a gap from it (the user, 2026-11-13: leaves "dont want to fold on top of
 * eachother or around eachother"). Top and bottom of the blade move together (it keeps its
 * thickness); the stem takes the rise up gently from `stemFrom` (a share of its length). Then the
 * blade is added to the map, so the next leaf rests on it.
 */
export function settleStemmedLeaf(leaf: StemmedLeaf, drape: Drape, clear: number, stiffness = 24, stemFrom = 0.6): void {
  const n = leaf.rings.length;
  const around = leaf.rings[0].length;
  const start = leaf.bladeStart;
  // How far each point must rise (the blade only), the same for a point and its partner on the
  // other face.
  const need = leaf.rings.map((ring, k) => ring.map((p) => (k < start ? 0 : Math.max(0, drape.heightAt(p.x, p.z) + clear - p.y))));
  for (let k = start; k < n; k++)
    for (let j = 0; j < around; j++) {
      const partner = (around - j) % around;
      const both = Math.max(need[k][j], need[k][partner]);
      need[k][j] = both;
      need[k][partner] = both;
    }
  // Spread it softly over the blade (along and across, round the ring).
  let rise = need.map((row) => row.slice());
  for (let r = 0; r < stiffness; r++) {
    rise = rise.map((row, k) =>
      row.map((_, j) => {
        if (k < start) return 0;
        const prev = rise[Math.max(start, k - 1)][j];
        const next = rise[Math.min(n - 1, k + 1)][j];
        const left = row[(j + 1) % around];
        const right = row[(j + around - 1) % around];
        return Math.max(need[k][j], (prev + next + left + right) / 4);
      }),
    );
  }
  // The blade's base rise, taken up gently along the stem.
  const baseRise = Math.max(...rise[start]);
  const from = Math.round(start * stemFrom);
  leaf.rings.forEach((ring, k) => {
    const lift = (j: number) => (k >= start ? rise[k][j] : baseRise * smoothstep(from, start, k));
    ring.forEach((p, j) => (p.y += lift(j)));
    leaf.centres[k].y += k >= start ? Math.max(...rise[k]) : baseRise * smoothstep(from, start, k);
  });
  for (let k = start; k < n; k++) drape.add(leaf.rings[k], 0.5);
}

/**
 * Push a stemmed leaf's blade out from the bunch's axis to clear what is already there (ring by
 * ring, the push spread smoothly along the leaf), lift any ring that would dip into the table, and
 * add the leaf to the round drape.
 */
export function drapeStemmedLeaf(leaf: StemmedLeaf, drape: RoundDrape, clear: number, table: number, stemFrom = 0.5): void {
  const n = leaf.rings.length;
  const start = leaf.bladeStart;
  // The blade moves as one piece (the user, 2026-11-13: pushing it out ring by ring bent the leaf
  // oddly and kinked the stem where it meets the blade, "stem and leaf detached"): by the most any
  // of its rings needs, all in one direction (outward at its base).
  let most = 0;
  for (let k = start; k < n; k++)
    for (const p of leaf.rings[k]) {
      const m = drape.measure(p);
      most = Math.max(most, drape.reachAt(m.s, m.angle) + clear - m.r);
    }
  // The stem takes the move up gently, from the tie (`stemFrom`, a share of the stem) to the blade.
  const from = Math.round(start * stemFrom);
  const rise = leaf.rings.map((_, k) => (k >= start ? most : most * smoothstep(from, start, k)));
  const out = drape.measure(leaf.centres[start]).out;
  if (most > 0)
    leaf.rings.forEach((ring, k) => {
      for (const p of ring) p.addScaledVector(out, rise[k]);
      leaf.centres[k].addScaledVector(out, rise[k]);
    });
  // The table: no ring dips below it (the lift spread along the leaf too).
  const low = leaf.rings.map((ring) => Math.max(0, table - Math.min(...ring.map((p) => p.y))));
  let lift = low.slice();
  for (let r = 0; r < 30; r++) {
    const next = lift.slice();
    for (let k = 0; k < n; k++) next[k] = Math.max(low[k], ((lift[k - 1] ?? lift[k]) + (lift[k + 1] ?? lift[k])) / 2);
    lift = next;
  }
  leaf.rings.forEach((ring, k) => {
    for (const p of ring) p.y += lift[k];
    leaf.centres[k].y += lift[k];
  });
  for (let k = leaf.bladeStart; k < n; k++) drape.add(leaf.rings[k], 0.6);
}
