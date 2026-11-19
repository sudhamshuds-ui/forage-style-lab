import { BufferAttribute, Euler, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { finishPieces, type FormPiece } from '../../ingredients/forms/kit/piece';
import { UNITS_PER_CM } from '../../ingredients/scale';
import { withFrame } from './cut';

/**
 * Plating: moving ingredients onto a plate, like arranging layers in a comp.
 *
 * A dish is built in centimetres, like an ingredient. Its parts come from the pantry's own forms
 * (the same peach, the same lime), cut with the knife (`cut.ts`), then turned, tipped, scaled and
 * set down on the plate or on each other. At the end, `plate()` joins the parts that share a
 * role (all the lime wheels are one `lime` piece) and finishes them like any form.
 */

/** A pantry form's pieces back in centimetres (forms hand them back finished, in scene units). */
export function inCm(pieces: FormPiece[]): FormPiece[] {
  for (const piece of pieces) {
    piece.geometry = piece.geometry.clone();
    piece.geometry.scale(1 / UNITS_PER_CM, 1 / UNITS_PER_CM, 1 / UNITS_PER_CM);
  }
  return pieces;
}

/** Give pieces new roles (a peach's `skin_glow` becomes the dish's `peach_glow`). Others are dropped. */
export function roles(pieces: FormPiece[], names: Record<string, string>): FormPiece[] {
  return pieces.filter((p) => names[p.role]).map((p) => ({ ...p, role: names[p.role] }));
}

export interface Pose {
  /** Where it goes (cm). */
  at?: [number, number, number];
  /** Turned round the upright axis, then tipped (radians, applied as Euler 'YXZ': turn, tip forward, roll). */
  turn?: number;
  tip?: number;
  roll?: number;
  /** Uniform or per-axis scale. */
  scale?: number | [number, number, number];
}

export function poseMatrix(pose: Pose): Matrix4 {
  const s = pose.scale ?? 1;
  const scale = typeof s === 'number' ? new Vector3(s, s, s) : new Vector3(...s);
  const q = new Quaternion().setFromEuler(new Euler(pose.tip ?? 0, pose.turn ?? 0, pose.roll ?? 0, 'YXZ'));
  return new Matrix4().compose(new Vector3(...(pose.at ?? [0, 0, 0])), q, scale);
}

/** Move a copy of the pieces. */
export function posed(pieces: FormPiece[], pose: Pose | Matrix4): FormPiece[] {
  const m = pose instanceof Matrix4 ? pose : poseMatrix(pose);
  return pieces.map((p) => ({ ...p, geometry: p.geometry.clone().applyMatrix4(m) }));
}

/** The lowest point of the pieces, measured against a surface (a plate's floor): how far above it. */
export function clearance(pieces: FormPiece[], surface: (x: number, z: number) => number): number {
  let low = Infinity;
  for (const p of pieces) {
    const pos = p.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < pos.count; i++) low = Math.min(low, pos.getY(i) - surface(pos.getX(i), pos.getZ(i)));
  }
  return low;
}

/** Set pieces down so they just touch a surface (sunk by `sink` cm, to sit in a sauce or a heap). */
export function setDown(pieces: FormPiece[], surface: (x: number, z: number) => number, sink = 0): FormPiece[] {
  const dy = -clearance(pieces, surface) - sink;
  for (const p of pieces) p.geometry.translate(0, dy, 0);
  return pieces;
}

/** The highest point of pieces near (x, z), for stacking (a garnish on top of whatever is there). */
export function heightAt(pieces: FormPiece[], x: number, z: number, reach: number): number {
  let high = -Infinity;
  for (const p of pieces) {
    const pos = p.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      if (Math.hypot(pos.getX(i) - x, pos.getZ(i) - z) < reach) high = Math.max(high, pos.getY(i));
    }
  }
  return high;
}

/** A surface made of the pieces' tops (a stack: the salmon's back, the sauce under it). */
export function surfaceOf(pieces: FormPiece[], floor: (x: number, z: number) => number, reach = 0.35): (x: number, z: number) => number {
  // A coarse height grid of the pieces' highest points, so a lookup is quick.
  const cell = reach;
  const grid = new Map<string, number>();
  for (const p of pieces) {
    const pos = p.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const key = `${Math.floor(pos.getX(i) / cell)},${Math.floor(pos.getZ(i) / cell)}`;
      grid.set(key, Math.max(grid.get(key) ?? -Infinity, pos.getY(i)));
    }
  }
  return (x, z) => {
    let high = floor(x, z);
    const cx = Math.floor(x / cell);
    const cz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) high = Math.max(high, grid.get(`${cx + i},${cz + j}`) ?? -Infinity);
    return high;
  };
}

/** Join geometries that may carry different attributes: missing ones are filled with zeros. */
export function joinGeometries(list: BufferGeometry[]): BufferGeometry {
  const sizes = new Map<string, number>();
  for (const g of list) for (const [name, a] of Object.entries(g.attributes)) sizes.set(name, (a as BufferAttribute).itemSize);
  const ready = list.map((source) => {
    let g = source;
    for (const [name, size] of sizes) {
      if (!g.getAttribute(name)) {
        g = g === source ? g.clone() : g;
        // A missing frame is where the shape is (never all zeros: see withFrame in cut.ts).
        const filled = name === 'ownPos' ? Float32Array.from(g.getAttribute('position').array as ArrayLike<number>) : new Float32Array(g.getAttribute('position').count * size);
        g.setAttribute(name, new BufferAttribute(filled, size));
      }
    }
    return g.index ? g : mergeVertices(g, 1e-6);
  });
  return mergeGeometries(ready)!;
}

/**
 * Finish a dish: the parts sharing a role become one piece, in the order roles first appear (the
 * first is the hero: it takes the main highlight). Then sized and set on the table like any form.
 */
export function plate(parts: FormPiece[]): FormPiece[] {
  const order: string[] = [];
  const byRole = new Map<string, FormPiece[]>();
  for (const part of parts) {
    if (!byRole.has(part.role)) {
      byRole.set(part.role, []);
      order.push(part.role);
    }
    byRole.get(part.role)!.push(part);
  }
  return finishPieces(
    order.map((role) => {
      const list = byRole.get(role)!;
      // Every part gets its own frame (a missing one read as zero in the shader: black faces).
      for (const p of list) withFrame(p.geometry, false);
      return { role, geometry: joinGeometries(list.map((p) => p.geometry)), doubleSided: list.some((p) => p.doubleSided), keepNormals: list.every((p) => p.keepNormals) };
    }),
  );
}

/**
 * The table: a height map of everything already plated (the plate's floor, the sauce, the food),
 * so the next piece can be set down on it. Like a terrain seen from above: for each small cell,
 * the highest point of anything in it.
 */
export class Table {
  private readonly cells = new Map<number, number>();
  constructor(
    private readonly floor: (x: number, z: number) => number,
    private readonly cell = 0.2,
  ) {}

  private key(x: number, z: number): number {
    return Math.floor(x / this.cell) * 100003 + Math.floor(z / this.cell);
  }

  /** The highest surface at a point. */
  height(x: number, z: number): number {
    const h = this.cells.get(this.key(x, z));
    const f = this.floor(x, z);
    return h === undefined ? f : Math.max(h, f);
  }

  /** Add pieces to the table: every triangle is sampled finely, so a big flat face counts too. */
  add(pieces: FormPiece[]): void {
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    const p = new Vector3();
    const put = (q: Vector3) => {
      const k = this.key(q.x, q.z);
      const h = this.cells.get(k);
      if (h === undefined || q.y > h) this.cells.set(k, q.y);
    };
    for (const piece of pieces) {
      const g = piece.geometry;
      const pos = g.getAttribute('position') as BufferAttribute;
      const index = g.getIndex();
      const count = index ? index.count : pos.count;
      const at = (i: number) => (index ? index.getX(i) : i);
      for (let t = 0; t + 2 < count; t += 3) {
        a.fromBufferAttribute(pos, at(t));
        b.fromBufferAttribute(pos, at(t + 1));
        c.fromBufferAttribute(pos, at(t + 2));
        const longest = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
        const n = Math.max(1, Math.ceil(longest / (this.cell * 0.7)));
        for (let i = 0; i <= n; i++) {
          for (let j = 0; j <= n - i; j++) {
            const u = i / n;
            const v = j / n;
            p.copy(a).multiplyScalar(1 - u - v).addScaledVector(b, u).addScaledVector(c, v);
            put(p);
          }
        }
      }
    }
  }

  /**
   * Set pieces down where they would come to rest: tipped a little each way (up to `tilt`
   * radians), each tip dropped until it touches, and the one whose middle ends lowest kept, the
   * way a real piece rocks and settles onto what is under it. So nothing hovers on one point and
   * nothing sinks into its neighbours. `sink` lets it settle into something soft (a sauce).
   */
  rest(pieces: FormPiece[], options: { tilt?: number; sink?: number; add?: boolean } = {}): FormPiece[] {
    const tilt = options.tilt ?? 0.45;
    const sink = options.sink ?? 0;
    const points: Vector3[] = [];
    let total = 0;
    for (const piece of pieces) total += piece.geometry.getAttribute('position').count;
    const step = Math.max(1, Math.floor(total / 1200));
    let k = 0;
    for (const piece of pieces) {
      const pos = piece.geometry.getAttribute('position') as BufferAttribute;
      for (let i = 0; i < pos.count; i++, k++) if (k % step === 0) points.push(new Vector3().fromBufferAttribute(pos, i));
    }
    const centre = points.reduce((s, q) => s.add(q), new Vector3()).multiplyScalar(1 / points.length);
    const q = new Vector3();
    const rotation = new Matrix4();
    let best = { height: Infinity, drop: 0, ax: 0, az: 0 };
    const steps = tilt > 0 ? 8 : 0;
    for (let i = -steps; i <= steps; i++) {
      for (let j = -steps; j <= steps; j++) {
        const ax = (i / Math.max(1, steps)) * tilt;
        const az = (j / Math.max(1, steps)) * tilt;
        rotation.makeRotationFromEuler(new Euler(ax, 0, az));
        let drop = Infinity;
        for (const point of points) {
          q.copy(point).sub(centre).applyMatrix4(rotation).add(centre);
          drop = Math.min(drop, q.y - this.height(q.x, q.z));
        }
        // The middle's height once dropped; a hair's preference for staying as designed.
        const height = centre.y - drop + (Math.abs(ax) + Math.abs(az)) * 0.01;
        if (height < best.height) best = { height, drop, ax, az };
      }
    }
    const m = new Matrix4()
      .makeTranslation(0, -best.drop - sink, 0)
      .multiply(new Matrix4().makeTranslation(centre.x, centre.y, centre.z))
      .multiply(new Matrix4().makeRotationFromEuler(new Euler(best.ax, 0, best.az)))
      .multiply(new Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z));
    const placed = posed(pieces, m);
    if (options.add !== false) this.add(placed);
    return placed;
  }

  /** True where something on the table stands more than `above` cm over the floor. */
  covered(x: number, z: number, above: number): boolean {
    const h = this.cells.get(this.key(x, z));
    return h !== undefined && h > this.floor(x, z) + above;
  }
}

/**
 * Slide pieces straight out from a point (the hero's middle) until none of them is over the
 * hero: garnish goes beside the salmon, never on it (the user, 2026-11-18). `keep` is a table
 * holding only what must stay clear; the pieces stop `gap` cm past its edge.
 */
export function clearOf(pieces: FormPiece[], keep: Table, from: [number, number], gap = 0.25): FormPiece[] {
  const points: Vector3[] = [];
  for (const piece of pieces) {
    const pos = piece.geometry.getAttribute('position') as BufferAttribute;
    const step = Math.max(1, Math.floor(pos.count / 300));
    for (let i = 0; i < pos.count; i += step) points.push(new Vector3().fromBufferAttribute(pos, i));
  }
  const centre = points.reduce((sum, p) => sum.add(p), new Vector3()).multiplyScalar(1 / points.length);
  const away = new Vector3(centre.x - from[0], 0, centre.z - from[1]);
  if (away.lengthSq() < 1e-6) away.set(0, 0, 1);
  away.normalize();
  const hits = (shift: number) =>
    points.some((p) => {
      for (const [dx, dz] of [[0, 0], [gap, 0], [-gap, 0], [0, gap], [0, -gap]]) {
        if (keep.covered(p.x + away.x * shift + dx, p.z + away.z * shift + dz, 0.3)) return true;
      }
      return false;
    });
  let shift = 0;
  while (shift < 15 && hits(shift)) shift += 0.15;
  return shift === 0 ? pieces : posed(pieces, { at: [away.x * shift, 0, away.z * shift] });
}
