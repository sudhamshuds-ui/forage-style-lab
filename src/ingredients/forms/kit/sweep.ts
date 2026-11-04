import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Vector3 } from 'three';

/**
 * The sweep: a round tube along a curve, its radius following a profile,
 * like a brush stroke with pressure. Used for stalks and branches now, and
 * for the long archetype later (carrot, drumstick, baguette).
 *
 * The curve runs through a few points (a smooth Catmull-Rom spline). Each end
 * closes with a single point (no seam, no hole). If the radius is still wide
 * at an end, that end is a flat cut with a soft rounded rim, like a cut stalk;
 * if it narrows to nothing, the end is round.
 */
export interface SweepOptions {
  /** Points the tube passes through, in centimetres. */
  points: Vector3[];
  /** Radius (cm) at `t`, from 0 (first point) to 1 (last point). */
  radius: (t: number) => number;
  /** Rings along the curve, and points round each ring. */
  rings: number;
  segments: number;
  /**
   * Optional shape of the cross-section: a radius multiplier at `t` and `angle`
   * round the tube. Soft ribs on a broccoli stalk, for example.
   */
  around?: (t: number, angle: number) => number;
}

export function sweepGeometry(options: SweepOptions): BufferGeometry {
  const { rings, segments } = options;
  const curve = new CatmullRomCurve3(options.points, false, 'centripetal');
  // Directions round the tube at each ring, turning smoothly with the curve.
  const frames = curve.computeFrenetFrames(rings + 1, false);
  const positions: number[] = [];
  const point = new Vector3();
  const offset = new Vector3();

  const at = (t: number) => Math.min(rings + 1, Math.max(0, Math.round(t * (rings + 1))));

  // Start pole, rings, end pole: the same layout as the lathe.
  curve.getPointAt(0, point);
  positions.push(point.x, point.y, point.z);
  for (let i = 1; i <= rings; i++) {
    // Rings bunch up at the ends, where a cut rim or a round tip needs them.
    const t = (1 - Math.cos((Math.PI * i) / (rings + 1))) / 2;
    curve.getPointAt(t, point);
    const frame = at(t);
    const r = Math.max(0, options.radius(t));
    for (let j = 0; j < segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      const rib = options.around ? options.around(t, a) : 1;
      offset
        .copy(frames.normals[frame])
        .multiplyScalar(Math.cos(a) * r * rib)
        .addScaledVector(frames.binormals[frame], Math.sin(a) * r * rib);
      positions.push(point.x + offset.x, point.y + offset.y, point.z + offset.z);
    }
  }
  curve.getPointAt(1, point);
  positions.push(point.x, point.y, point.z);

  const ringStart = (i: number) => 1 + (i - 1) * segments;
  const endPole = 1 + rings * segments;
  const indices: number[] = [];
  for (let j = 0; j < segments; j++) {
    const next = (j + 1) % segments;
    // Wound like the lathe, so the faces (and normals) point outward.
    indices.push(0, ringStart(1) + next, ringStart(1) + j);
    for (let i = 1; i < rings; i++) {
      const a = ringStart(i) + j;
      const b = ringStart(i) + next;
      const c = ringStart(i + 1) + j;
      const d = ringStart(i + 1) + next;
      indices.push(a, b, c, b, d, c);
    }
    indices.push(ringStart(rings) + j, ringStart(rings) + next, endPole);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * A radius profile for a cut end: full width almost to the end, then a quick,
 * soft round-off over the last `bevel` of the length (a rounded rim, not a crease).
 */
export function cutEnd(t: number, bevel: number): number {
  return Math.sqrt(Math.min(1, t / bevel));
}
