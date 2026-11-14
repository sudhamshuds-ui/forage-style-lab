import { Box3, Vector3, type BufferAttribute, type BufferGeometry } from 'three';
import { unitsToCm } from '../../scale';
import type { FormPiece } from './piece';

/**
 * Measuring tools for forms: the "rulers and guides" used by the tests and
 * by the dev report in the browser console (`styleLab.report()`).
 */

/** Triangle budget per archetype (board 07). */
export const TRIANGLE_BUDGET = {
  round: [2000, 6000],
  small: [1000, 3000],
  long: [2000, 5000],
  block: [1000, 4000],
  wedge: [2000, 5000],
  // Board 07 says 6k to 12k. Raised to 18k (2026-11-04): the user asked for a much bumpier
  // broccoli crown, which needs a denser mesh to keep its many lumps round.
  branching: [6000, 18000],
  leafy: [1000, 3000],
  contained: [0, 1000],
  // The ninth archetype (the user, 2026-11-14): flat things, a fried egg, bacon, tortillas.
  flat: [1000, 16000],
} as const;

/** Small parts that may stick out past an ingredient's real size (a stem, a leaf, a calyx, a butter curl). */
export const SMALL_PARTS = ['stem', 'leaf', 'calyx', 'curl'];

/**
 * Props: what an ingredient rests on, not the ingredient itself (the butter's paper sheet;
 * later a plate or a board). Left out of its real size and of the card's subject zone (the
 * framing only keeps a prop inside the card).
 */
export const PROPS = ['paper'];

/** The pieces that make up the ingredient's real size: everything but its small parts and props. */
export function bodyPieces(pieces: FormPiece[]): FormPiece[] {
  const body = pieces.filter((p) => !SMALL_PARTS.includes(p.role) && !PROPS.includes(p.role));
  return body.length > 0 ? body : pieces;
}

/** The box around all pieces together, in scene units. */
export function boundsOf(pieces: FormPiece[]): Box3 {
  const box = new Box3();
  for (const piece of pieces) {
    piece.geometry.computeBoundingBox();
    box.union(piece.geometry.boundingBox!);
  }
  return box;
}

/** Width (x), height (y) and depth (z) of the whole form, in centimetres. */
export function sizeInCm(pieces: FormPiece[]): [number, number, number] {
  const size = boundsOf(pieces).getSize(new Vector3());
  return [unitsToCm(size.x), unitsToCm(size.y), unitsToCm(size.z)];
}

export function triangleCount(pieces: FormPiece[]): number {
  let count = 0;
  for (const { geometry } of pieces) {
    count += (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3;
  }
  return count;
}

/** True if every position and normal is a real number (no NaN or Infinity). */
export function allFinite(pieces: FormPiece[]): boolean {
  for (const { geometry } of pieces) {
    for (const name of ['position', 'normal']) {
      const attribute = geometry.getAttribute(name) as BufferAttribute | undefined;
      if (!attribute) return false;
      for (const value of attribute.array as Float32Array) if (!Number.isFinite(value)) return false;
    }
  }
  return true;
}

/**
 * How many normals point outward (0 to 1), measured from the piece's centre.
 * Good for closed, mostly convex pieces (fruit, eggs). A soft neck or a dimple
 * points a few normals sideways, so tests ask for "almost all", not all.
 */
export function outwardFraction(piece: FormPiece): number {
  const { geometry } = piece;
  const position = geometry.getAttribute('position') as BufferAttribute;
  const normal = geometry.getAttribute('normal') as BufferAttribute;
  // A piece can hold several separate bodies (a bunch of grapes merged into one piece): measure
  // each point from the centre of its own body, or a berry's inner side would count as inward.
  const body = bodiesOf(geometry);
  const centres = new Map<number, { sum: Vector3; count: number }>();
  const p = new Vector3();
  for (let i = 0; i < position.count; i++) {
    const entry = centres.get(body[i]) ?? { sum: new Vector3(), count: 0 };
    entry.sum.add(p.fromBufferAttribute(position, i));
    entry.count++;
    centres.set(body[i], entry);
  }
  const n = new Vector3();
  let outward = 0;
  for (let i = 0; i < position.count; i++) {
    const entry = centres.get(body[i])!;
    p.fromBufferAttribute(position, i).addScaledVector(entry.sum, -1 / entry.count);
    n.fromBufferAttribute(normal, i);
    if (p.dot(n) > 0) outward++;
  }
  return outward / position.count;
}

/**
 * Which separate body each point belongs to: points joined by triangles share a body (a
 * union-find over the triangles' corners). Without an index, the whole piece is one body.
 */
function bodiesOf(geometry: BufferGeometry): number[] {
  const count = geometry.getAttribute('position').count;
  const parent = Array.from({ length: count }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const index = geometry.index;
  if (!index) return parent.map(() => 0);
  for (let t = 0; t < index.count; t += 3) {
    const a = find(index.getX(t));
    parent[find(index.getX(t + 1))] = a;
    parent[find(index.getX(t + 2))] = a;
  }
  return parent.map((_, i) => find(i));
}

/**
 * The volume a closed piece encloses (scene units cubed), from its faces. If the faces are
 * wound inside-out (normals pointing in), this comes out negative: a reliable "faces point
 * outward" check for any shape, bent tubes included.
 */
export function signedVolume(piece: FormPiece): number {
  const { geometry } = piece;
  const position = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.index;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  let volume = 0;
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(position, index ? index.getX(i) : i);
    b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2);
    volume += a.dot(b.cross(c)) / 6;
  }
  return volume;
}

/** A plain-text summary for the console: size against the spec and the triangle budget. */
export function formReport(
  pieces: FormPiece[],
  spec: { size_cm: [number, number, number]; archetype: keyof typeof TRIANGLE_BUDGET },
  ownBudget?: readonly [number, number],
): string {
  const size = sizeInCm(bodyPieces(pieces));
  const whole = sizeInCm(pieces);
  const budget = ownBudget ?? TRIANGLE_BUDGET[spec.archetype];
  const box = boundsOf(pieces);
  const f = (v: number) => v.toFixed(2);
  return [
    `size (cm)   ${size.map(f).join(' x ')}   spec ${spec.size_cm.join(' x ')}   (body)`,
    `with parts  ${whole.map(f).join(' x ')}`,
    `off by      ${size.map((v, i) => `${(((v - spec.size_cm[i]) / spec.size_cm[i]) * 100).toFixed(1)}%`).join(', ')}`,
    `bottom y    ${box.min.y.toFixed(5)}`,
    `triangles   ${triangleCount(pieces)}   budget ${budget[0]} to ${budget[1]}`,
    `pieces      ${pieces.map((p) => p.role).join(', ')}`,
  ].join('\n');
}
