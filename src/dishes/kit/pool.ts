import { BufferAttribute, BufferGeometry } from 'three';

/**
 * Sauce: a pool of something poured on a plate (tomato jam, a glaze, a lime foam, brown butter).
 *
 * A low puddle with a soft wobbly outline: flat and wet on top, its edge rounding down to the
 * plate like a meniscus (no hard cut-out line). It follows the plate's floor under it, so it lies
 * in the well and runs a little way up the side. `bumps` adds what sits in it (a foam's bubbles,
 * a jam's chunks); `outline` gives its shape.
 *
 * Built in centimetres, closed underneath (a flat skin just under the plate's surface).
 */
export interface PoolOptions {
  /** The outline: its radius (cm) at each angle round its middle. */
  outline: (angle: number) => number;
  /** Where its middle is (cm). */
  at: [number, number];
  /** Its depth at the middle (cm). */
  depth: number;
  /** The surface it lies on. */
  floor: (x: number, z: number) => number;
  /** Extra height at a point (cm); `rn` runs 0 at the middle to 1 at the edge. */
  bumps?: (x: number, z: number, rn: number) => number;
  /** How wide the rounded edge is, as a share of the radius (default 0.25). */
  edge?: number;
  rings?: number;
  segments?: number;
}

export function pool(o: PoolOptions): BufferGeometry {
  const rings = o.rings ?? 36;
  const segments = o.segments ?? 96;
  const edge = o.edge ?? 0.25;
  const positions: number[] = [];
  const uvs: number[] = [];
  const height = (x: number, z: number, rn: number) => {
    // A rounded edge: full depth inside, falling in a quarter circle to nothing at the rim.
    const e = Math.min(1, (1 - rn) / edge);
    const shoulder = Math.sqrt(Math.max(0, 1 - (1 - e) ** 2));
    return o.floor(x, z) + o.depth * shoulder + (o.bumps ? o.bumps(x, z, rn) * shoulder : 0);
  };
  const [cx, cz] = o.at;
  positions.push(cx, height(cx, cz, 0), cz);
  uvs.push(0, 0);
  for (let i = 1; i <= rings; i++) {
    // Rings closer together near the edge, where the surface turns.
    const rn = 1 - (1 - i / rings) ** 1.6;
    for (let j = 0; j < segments; j++) {
      const a = (2 * Math.PI * j) / segments;
      const r = o.outline(a) * rn;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      positions.push(x, i === rings ? o.floor(x, z) - 0.02 : height(x, z, rn), z);
      uvs.push(rn, j / segments);
    }
  }
  // Underneath: a flat skin just under the plate's surface, closing it.
  const under = positions.length / 3;
  positions.push(cx, o.floor(cx, cz) - 0.08, cz);
  uvs.push(0, 0);
  const at = (i: number, j: number) => 1 + (i - 1) * segments + (j % segments);
  const index: number[] = [];
  for (let j = 0; j < segments; j++) {
    index.push(0, at(1, j + 1), at(1, j));
    for (let i = 1; i < rings; i++) index.push(at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i + 1, j));
    index.push(under, at(rings, j), at(rings, j + 1));
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  g.setIndex(index);
  return g;
}

/** A wobbly outline: a base radius with a few soft lobes (seeded by the phases given). */
export function wobble(radius: number, lobes: [number, number, number][]): (angle: number) => number {
  return (a) => radius * (1 + lobes.reduce((sum, [k, amount, phase]) => sum + amount * Math.cos(k * a + phase), 0));
}
