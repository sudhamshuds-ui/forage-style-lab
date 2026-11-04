import { BufferAttribute, BufferGeometry, Vector3 } from 'three';

/**
 * The lathe: spin a profile curve around an axis to make a round body, like
 * a potter's wheel or a revolve in a 3D app.
 *
 * You describe one thing, the radius at each point along the axis (the
 * profile), and the lathe builds rings of points around it. The axis runs
 * along X, from -halfLength to +halfLength, with one single point at each end
 * (a "pole"), so there is no seam and no hole. Rings sit closer together near
 * the poles, where the curve turns fastest.
 *
 * `shape` gets every point once it is placed, to nudge it (lopsidedness, a
 * flatter base). The result is one smooth, closed, indexed mesh.
 */
export interface LatheOptions {
  /** Half the length along the axis (X), in centimetres. */
  halfLength: number;
  /** Radius at a point `x` along the axis. Should reach 0 at both ends. */
  radius: (x: number) => number;
  /** Rings between the two poles. More rings: a smoother side view. */
  rings: number;
  /** Points around each ring. More segments: a rounder end view. */
  segments: number;
  /**
   * Optional nudge for each point. `u` runs from -1 (start pole) to 1 (end
   * pole), `angle` goes round the axis (0 points up, +Y).
   */
  shape?: (point: Vector3, u: number, angle: number) => void;
}

export function latheGeometry(options: LatheOptions): BufferGeometry {
  const { halfLength, radius, rings, segments, shape } = options;
  const positions: number[] = [];
  const point = new Vector3();

  const add = (u: number, angle: number, r: number) => {
    point.set(u * halfLength, Math.cos(angle) * r, Math.sin(angle) * r);
    shape?.(point, u, angle);
    positions.push(point.x, point.y, point.z);
  };

  // Pole at the start, then the rings, then the pole at the end.
  add(-1, 0, 0);
  for (let i = 1; i <= rings; i++) {
    // Cosine spacing: rings bunch up near the poles, where the profile bends most.
    const u = -Math.cos((Math.PI * i) / (rings + 1));
    const r = Math.max(0, radius(u * halfLength));
    for (let j = 0; j < segments; j++) add(u, (j / segments) * Math.PI * 2, r);
  }
  add(1, 0, 0);

  const ringStart = (i: number) => 1 + (i - 1) * segments;
  const endPole = 1 + rings * segments;
  const indices: number[] = [];
  for (let j = 0; j < segments; j++) {
    const next = (j + 1) % segments;
    // Start cap: a fan from the pole to the first ring.
    indices.push(0, ringStart(1) + next, ringStart(1) + j);
    // Sides: two triangles per square between neighbouring rings.
    for (let i = 1; i < rings; i++) {
      const a = ringStart(i) + j;
      const b = ringStart(i) + next;
      const c = ringStart(i + 1) + j;
      const d = ringStart(i + 1) + next;
      indices.push(a, b, c, b, d, c);
    }
    // End cap: a fan from the last ring to the pole.
    indices.push(ringStart(rings) + j, ringStart(rings) + next, endPole);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  return geometry;
}

/** A "smooth maximum": like Math.max, but rounds off the corner where two curves meet (a fillet). */
export function smoothMax(a: number, b: number, k: number): number {
  if (k <= 0) return Math.max(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

/** A "smooth minimum": the soft-cornered partner of smoothMax. */
export function smoothMin(a: number, b: number, k: number): number {
  return -smoothMax(-a, -b, k);
}

/** 0 below `edge0`, 1 above `edge1`, and an S-shaped ease in between. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Half an ellipse: the radius of a round end, 0 at |x| = length. */
export function ellipse(x: number, length: number, radius: number): number {
  const t = x / length;
  return t >= 1 || t <= -1 ? 0 : radius * Math.sqrt(1 - t * t);
}
