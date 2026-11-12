import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
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
}

export function leafSheet(o: LeafSheetOptions): BufferGeometry {
  const cos = Math.cos(o.turn);
  const sin = Math.sin(o.turn);
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
      const y = o.lift(u) + cupHere * edge ** 1.6 + wave + o.tilt * v * (1 - 0.6 * smoothstep(0.75, 1, u));
      const d = u * o.length;
      positions.push(o.base.x + d * cos - across * sin, o.base.y + y, o.base.z + d * sin + across * cos);
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
