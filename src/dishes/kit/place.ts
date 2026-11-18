import { BufferAttribute, Euler, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { finishPieces, type FormPiece } from '../../ingredients/forms/kit/piece';
import { UNITS_PER_CM } from '../../ingredients/scale';

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
        g.setAttribute(name, new BufferAttribute(new Float32Array(g.getAttribute('position').count * size), size));
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
      return { role, geometry: joinGeometries(list.map((p) => p.geometry)), doubleSided: list.some((p) => p.doubleSided) };
    }),
  );
}
