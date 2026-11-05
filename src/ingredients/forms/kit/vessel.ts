import { BufferAttribute, BufferGeometry } from 'three';
import { latheGeometry } from './lathe';

/**
 * The vessel kit (archetype: contained): bottles, jars, caps and collars.
 *
 * `revolve` spins a profile around the upright axis, like a revolve in a 3D
 * app or clay on a potter's wheel, standing up (Y), from `bottom` to `top`.
 * Two optional extras change the cross-section (the shape you see from above):
 *   - `roundedSquare`: a square with soft corners, for a bottle with a flat
 *     label face (1 is a circle-ish square, higher numbers are boxier),
 *   - `ribs`: vertical ridges round the side, for a screw cap.
 *
 * `wrapSheet` lays a thin sheet (a label, a band) onto a vessel's surface.
 *
 * Shape only: no colours, no gloss. The Style Lab paints the glass and the sauce.
 */

export interface RevolveOptions {
  /** Height of the lowest and highest point, in cm. */
  bottom: number;
  top: number;
  /** Radius at height y (cm). It should reach 0 at the bottom and the top. */
  radius: (y: number) => number;
  /** How much wider than `radius` the shape is at this angle and height (1 = round). */
  section?: (angle: number, y: number) => number;
  /** Rings along the height, and points round each ring. */
  rings: number;
  segments: number;
}

/**
 * Where a revolved point lands. `angle` goes round the axis: 0 faces -X, a
 * quarter turn (PI / 2) faces the front (+Z), the side the camera sees first.
 */
export function revolvedPoint(angle: number, y: number, r: number): [number, number, number] {
  return [-Math.cos(angle) * r, y, Math.sin(angle) * r];
}

export function revolve(options: RevolveOptions): BufferGeometry {
  const { bottom, top, radius, section, rings, segments } = options;
  const half = (top - bottom) / 2;
  const middle = (top + bottom) / 2;
  const geometry = latheGeometry({
    halfLength: half,
    radius: (x) => radius(middle + x),
    rings,
    segments,
    // The lathe spins round X; widen each point by the cross-section first.
    shape: section
      ? (point, _u, angle) => {
          const k = section(angle, middle + point.x);
          point.y *= k;
          point.z *= k;
        }
      : undefined,
  });
  // Stand it up: the lathe's X axis becomes Y (up). A rotation keeps the faces facing out.
  geometry.rotateZ(Math.PI / 2);
  geometry.translate(0, middle, 0);
  return geometry;
}

/**
 * A profile with flat ends and rounded edges, like a can or a cap:
 * full radius in the middle, curving in only near the ends. `power` sets how
 * square the edges are (2 is an oval end, 8 a crisp but still rounded edge).
 */
export function flatEnds(y: number, bottom: number, top: number, radius: number, power: number): number {
  const t = (2 * (y - bottom)) / (top - bottom) - 1;
  if (t <= -1 || t >= 1) return 0;
  return radius * (1 - Math.abs(t) ** power) ** (1 / power);
}

/**
 * A rounded square seen from above (a "superellipse"): 1 on the flat faces,
 * a little more toward the corners. `squareness` 2 is a circle, 3 to 4 a soft
 * square bottle, higher numbers boxier.
 */
export function roundedSquare(angle: number, squareness: number): number {
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  return 1 / (c ** squareness + s ** squareness) ** (1 / squareness);
}

/** Vertical ridges: `count` round the side, each pushing out by `depth` (a share of the radius). */
export function ribs(angle: number, count: number, depth: number): number {
  return 1 + depth * (0.5 + 0.5 * Math.cos(angle * count));
}

export interface SheetOptions {
  /** The surface point (cm) at this angle and height, before lifting it off the surface. */
  surface: (angle: number, y: number) => [number, number, number];
  /** Angle range round the axis, and height range. */
  angles: [number, number];
  heights: [number, number];
  /** How far the sheet floats off the surface (cm), so it never flickers into it. */
  lift: number;
  /** Grid points across and up. */
  columns: number;
  rows: number;
  /** Round (an oval) instead of a rectangle: a seal or a dot. */
  round?: boolean;
  /**
   * Give the sheet its own map (u across, v up, 0 to 1), so artwork can be painted on it
   * (a printed label). Only labels: a piece with a map is otherwise treated as a leaf.
   */
  mapped?: boolean;
}

/**
 * A thin sheet hugging a vessel, like a label wrapped round a bottle. It is
 * open (painted on both sides, like a leaf), lifted a hair off the surface
 * along the outward direction.
 */
export function wrapSheet(options: SheetOptions): BufferGeometry {
  const { surface, angles, heights, lift, columns, rows, round, mapped } = options;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      // Across and up, -1 to 1. A round sheet squeezes its square grid into an oval.
      let a = (2 * i) / columns - 1;
      let b = (2 * j) / rows - 1;
      if (round) [a, b] = [a * Math.sqrt(1 - (b * b) / 2), b * Math.sqrt(1 - (a * a) / 2)];
      const angle = angles[0] + ((angles[1] - angles[0]) * (a + 1)) / 2;
      const y = heights[0] + ((heights[1] - heights[0]) * (b + 1)) / 2;
      const [x, , z] = surface(angle, y);
      const out = Math.hypot(x, z) || 1;
      positions.push(x + (x / out) * lift, y, z + (z / out) * lift);
      uvs.push(i / columns, j / rows);
    }
  }
  const indices: number[] = [];
  const at = (i: number, j: number) => j * (columns + 1) + i;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      // Wound so the front of the sheet faces outward.
      indices.push(at(i, j), at(i, j + 1), at(i + 1, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  if (mapped) geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  return geometry;
}
