import { Box3, Vector3, type BufferAttribute } from 'three';
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
} as const;

/** Small parts that may stick out past an ingredient's real size (a stem, a leaf, a calyx). */
export const SMALL_PARTS = ['stem', 'leaf', 'calyx'];

/** The pieces that make up the ingredient's real size: everything but its small parts. */
export function bodyPieces(pieces: FormPiece[]): FormPiece[] {
  const body = pieces.filter((p) => !SMALL_PARTS.includes(p.role));
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
  const centre = geometry.boundingBox!.getCenter(new Vector3());
  const position = geometry.getAttribute('position') as BufferAttribute;
  const normal = geometry.getAttribute('normal') as BufferAttribute;
  const p = new Vector3();
  const n = new Vector3();
  let outward = 0;
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).sub(centre);
    n.fromBufferAttribute(normal, i);
    if (p.dot(n) > 0) outward++;
  }
  return outward / position.count;
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
): string {
  const size = sizeInCm(bodyPieces(pieces));
  const whole = sizeInCm(pieces);
  const budget = TRIANGLE_BUDGET[spec.archetype];
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
