import { BufferAttribute, BufferGeometry } from 'three';

/**
 * The bowl kit (archetype: contained): a bowl or dish thrown on a wheel, and what is heaped in it.
 *
 * `spinProfile` spins an outline round the upright axis, like a revolve in a 3D app. Unlike the
 * vessel kit's `revolve` (one radius per height), the outline is a path of points, so it can run
 * up the outside of a bowl, over its rim and back down the inside: a real wall with a thickness.
 *
 * `bowlProfile` draws that path for a round bowl standing on a small foot.
 *
 * `moundGeometry` is what fills it (rice, later lentils, chickpeas, salt): a heaped dome described
 * by a height at every point, closed underneath, its edge tucked into the bowl's wall.
 *
 * Shape only, in centimetres: no colours.
 */

export interface ProfilePoint {
  /** Distance from the axis and height (cm). */
  r: number;
  y: number;
  /** The map the skin reads: u (0 outside, 1 inside) and v (height as a share of the bowl). */
  u: number;
  v: number;
}

/** Spin a path of points round the upright axis. It starts and ends on the axis (r = 0). */
export function spinProfile(profile: ProfilePoint[], segments: number, wobble?: (angle: number, y: number) => number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const last = profile.length - 1;
  const push = (p: ProfilePoint, angle: number) => {
    const k = wobble ? wobble(angle, p.y) : 1;
    positions.push(Math.cos(angle) * p.r * k, p.y, Math.sin(angle) * p.r * k);
    uvs.push(p.u, p.v);
  };
  push(profile[0], 0);
  for (let i = 1; i < last; i++) for (let j = 0; j < segments; j++) push(profile[i], (2 * Math.PI * j) / segments);
  push(profile[last], 0);
  const at = (i: number, j: number) => 1 + (i - 1) * segments + (j % segments);
  const end = 1 + (last - 1) * segments;
  const index: number[] = [];
  for (let j = 0; j < segments; j++) {
    index.push(0, at(1, j), at(1, j + 1));
    for (let i = 1; i < last - 1; i++) index.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1));
    index.push(end, at(last - 1, j + 1), at(last - 1, j));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(index);
  return geometry;
}

export interface BowlShape {
  /** The rim's outer radius, the bowl's height, the foot's radius and height, the wall's thickness (cm). */
  rim: number;
  height: number;
  foot: number;
  footHeight: number;
  wall: number;
  /** How full the sides are: 2 is a half ball, higher is boxier, lower more of a cone. */
  fullness: number;
  /** Soft throwing rings round the outside: how many, and how deep (cm). */
  ridges?: { count: number; depth: number };
}

/** The outer wall's radius at a height. */
export function bowlOuter(shape: BowlShape, y: number): number {
  const t = Math.min(1, Math.max(0, (y - shape.footHeight) / (shape.height - shape.footHeight)));
  const side = shape.foot + (shape.rim - shape.foot) * (1 - (1 - t) ** shape.fullness) ** (1 / shape.fullness);
  const ridge = shape.ridges ? shape.ridges.depth * Math.sin(t * Math.PI * 2 * shape.ridges.count) * Math.sin(Math.PI * t) : 0;
  return side + ridge;
}

/** The inner wall's radius at a height (the outer wall without its ridges, less the wall's thickness). */
export function bowlInner(shape: BowlShape, y: number): number {
  return bowlOuter({ ...shape, ridges: undefined }, y) - shape.wall;
}

/** The path of a bowl: under its foot, up the outside, over the rim, down the inside. */
export function bowlProfile(shape: BowlShape, steps = 28): ProfilePoint[] {
  const { height: h, foot, footHeight, wall } = shape;
  const points: ProfilePoint[] = [];
  const v = (y: number) => y / h;
  // Under the foot: a shallow hollow, then the foot ring it stands on.
  points.push({ r: 0, y: footHeight * 0.55, u: 0, v: 0 });
  points.push({ r: foot - wall * 1.6, y: footHeight * 0.55, u: 0, v: 0 });
  points.push({ r: foot - wall * 1.2, y: 0.04, u: 0, v: 0 });
  points.push({ r: foot - wall * 0.9, y: 0, u: 0, v: 0 });
  points.push({ r: foot - 0.08, y: 0, u: 0, v: 0 });
  points.push({ r: foot, y: 0.08, u: 0, v: v(0.08) });
  points.push({ r: foot - 0.04, y: footHeight * 0.8, u: 0, v: v(footHeight * 0.8) });
  // Up the outside.
  for (let i = 0; i <= steps; i++) {
    const y = footHeight + ((h - wall / 2 - footHeight) * i) / steps;
    points.push({ r: bowlOuter(shape, y), y, u: 0, v: v(y) });
  }
  // Over the rim: a half circle, from the outside to the inside.
  const top = h - wall / 2;
  const mid = bowlOuter(shape, top) - wall / 2;
  for (let i = 1; i < 6; i++) {
    const a = (Math.PI * i) / 6;
    points.push({ r: mid + (Math.cos(a) * wall) / 2, y: top + (Math.sin(a) * wall) / 2, u: i / 6, v: 1 });
  }
  // Down the inside to the middle of the floor.
  const floor = footHeight + wall;
  for (let i = steps; i >= 0; i--) {
    const y = floor + ((top - floor) * i) / steps;
    const r = Math.max(0, bowlInner(shape, y + (footHeight - floor) * (1 - i / steps) * 0.999 + 0) );
    points.push({ r: i === 0 ? r * 0.6 : r, y, u: 1, v: v(y) });
  }
  points.push({ r: 0, y: floor - 0.05, u: 1, v: v(floor) });
  return points;
}

export interface MoundOptions {
  /** The mound's radius at its edge and the height of that edge (cm). */
  radius: number;
  edge: number;
  /** The height above the edge at (x, z); `rn` runs 0 at the middle to 1 at the edge. */
  height: (x: number, z: number, rn: number) => number;
  rings: number;
  segments: number;
}

/** A heaped dome in a bowl: rings from the middle out, closed underneath with a flat disc. */
export function moundGeometry(o: MoundOptions): BufferGeometry {
  const positions: number[] = [0, o.edge + o.height(0, 0, 0), 0];
  for (let i = 1; i <= o.rings; i++) {
    const rn = i / o.rings;
    for (let j = 0; j < o.segments; j++) {
      const a = (2 * Math.PI * j) / o.segments;
      const x = Math.cos(a) * o.radius * rn;
      const z = Math.sin(a) * o.radius * rn;
      positions.push(x, o.edge + (i === o.rings ? 0 : o.height(x, z, rn)), z);
    }
  }
  const under = positions.length / 3;
  positions.push(0, o.edge - 0.3, 0);
  const at = (i: number, j: number) => 1 + (i - 1) * o.segments + (j % o.segments);
  const index: number[] = [];
  for (let j = 0; j < o.segments; j++) {
    index.push(0, at(1, j + 1), at(1, j));
    for (let i = 1; i < o.rings; i++) index.push(at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i + 1, j));
    index.push(under, at(o.rings, j), at(o.rings, j + 1));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(index);
  return geometry;
}
