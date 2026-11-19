import { BufferAttribute, BufferGeometry } from 'three';
import type { Table } from './place';

/**
 * Pouring: a sauce poured over food, spreading the way a thick liquid does (the user, 2026-11-19:
 * "can u use some liquid physics...and pour the foam on top of the fillet ... rather than this
 * awkward dollop").
 *
 * A small flow simulation on a height map, like water on a terrain in a game: the plate and
 * everything on it (the table) is the ground; the sauce is poured in, a little at a time, at a few
 * spots; every step each cell passes some of its sauce to lower neighbours, so it runs downhill,
 * spreads over the top, pools in hollows and spills over the edges. A thick sauce has a yield: it
 * stops moving once the slope of its surface is gentle, so it sets in soft rounded tongues instead
 * of draining away. Then the settled sauce is turned into a sheet lying on the food, its edges
 * thinning to nothing (no cut-out line).
 *
 * Built in centimetres. The sheet's map: x 0 where the sauce is deepest, 1 at its thin edge (the
 * sauce skin paints thin edges paler).
 */
export interface PourOptions {
  /** Where to pour (cm) and how much (cubic cm) at each spot. */
  sources: { x: number; z: number; amount: number }[];
  /** The area to simulate: its middle and half size (cm). */
  centre: [number, number];
  half: number;
  /** Grid size (cm) and how many steps to let it flow. */
  cell?: number;
  steps?: number;
  /** How steep the sauce's own surface must be before it moves (cm per cell): its thickness. */
  yieldHeight?: number;
  /** Share of the difference passed on each step (0 to 0.25). */
  rate?: number;
}

export function pour(table: Table, o: PourOptions): BufferGeometry {
  const cell = o.cell ?? 0.15;
  const n = Math.ceil((o.half * 2) / cell) + 1;
  const x0 = o.centre[0] - o.half;
  const z0 = o.centre[1] - o.half;
  const ground = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) ground[j * n + i] = table.height(x0 + i * cell, z0 + j * cell);
  const depth = new Float32Array(n * n);
  const flow = new Float32Array(n * n);
  const steps = o.steps ?? 900;
  const yieldHeight = o.yieldHeight ?? 0.05;
  const rate = o.rate ?? 0.2;
  const pourSteps = Math.floor(steps * 0.45);
  const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let step = 0; step < steps; step++) {
    // Pour a little each step for the first part of the run.
    if (step < pourSteps) {
      for (const s of o.sources) {
        const i = Math.round((s.x - x0) / cell);
        const j = Math.round((s.z - z0) / cell);
        // Spread over a small round mouth, so it lands as a stream, not a needle.
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
          if (di * di + dj * dj > 5) continue;
          const k = (j + dj) * n + (i + di);
          if (k >= 0 && k < n * n) depth[k] += s.amount / (pourSteps * 21 * cell * cell);
        }
      }
    }
    flow.fill(0);
    for (let j = 1; j < n - 1; j++) {
      for (let i = 1; i < n - 1; i++) {
        const k = j * n + i;
        const d = depth[k];
        if (d <= 1e-5) continue;
        const h = ground[k] + d;
        let total = 0;
        const out = [0, 0, 0, 0];
        neighbours.forEach(([di, dj], m) => {
          const kk = (j + dj) * n + (i + di);
          const drop = h - (ground[kk] + depth[kk]) - yieldHeight;
          if (drop > 0) {
            out[m] = drop * rate;
            total += out[m];
          }
        });
        if (total <= 0) continue;
        // Never more than it holds.
        const scale = Math.min(1, d / total);
        neighbours.forEach(([di, dj], m) => {
          if (!out[m]) return;
          const amount = out[m] * scale;
          flow[k] -= amount;
          flow[(j + dj) * n + (i + di)] += amount;
        });
      }
    }
    for (let k = 0; k < n * n; k++) depth[k] = Math.max(0, depth[k] + flow[k]);
  }

  // A soft blur, so the edges are round and the stair steps of the grid melt away.
  const soft = new Float32Array(n * n);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 1; j < n - 1; j++) {
      for (let i = 1; i < n - 1; i++) {
        const k = j * n + i;
        soft[k] = depth[k] * 0.4 + (depth[k - 1] + depth[k + 1] + depth[k - n] + depth[k + n]) * 0.15;
      }
    }
    depth.set(soft);
  }

  // The sheet: the grid's triangles where the sauce lies, each cut along the sauce's edge (where
  // its depth falls to nothing), so the outline runs smoothly instead of in the grid's steps.
  const wet = 0.012;
  const deepest = Math.max(...depth);
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  type P = { x: number; z: number; g: number; d: number };
  const at = (k: number): P => ({ x: x0 + (k % n) * cell, z: z0 + Math.floor(k / n) * cell, g: ground[k], d: depth[k] - wet });
  const emit = (p: P) => {
    const d = Math.max(0, p.d);
    positions.push(p.x, p.g + d + 0.02, p.z);
    uvs.push(1 - Math.min(1, d / Math.max(0.01, deepest * 0.6)), 0);
    return positions.length / 3 - 1;
  };
  const between = (a: P, b: P): P => {
    const t = a.d / (a.d - b.d);
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, g: a.g + (b.g - a.g) * t, d: 0 };
  };
  const triangle = (a: P, b: P, c: P) => {
    const tri = [a, b, c];
    const inside = tri.filter((p) => p.d > 0).length;
    if (inside === 0) return;
    const polygon: P[] = [];
    for (let m = 0; m < 3; m++) {
      const p = tri[m];
      const q = tri[(m + 1) % 3];
      if (p.d > 0) polygon.push(p);
      if (p.d > 0 !== q.d > 0) polygon.push(between(p, q));
    }
    const ids = polygon.map(emit);
    for (let m = 1; m + 1 < ids.length; m++) index.push(ids[0], ids[m], ids[m + 1]);
  };
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      if (Math.max(depth[a], depth[a + 1], depth[a + n], depth[a + n + 1]) <= wet) continue;
      // Wound so the sheet faces up.
      triangle(at(a), at(a + n), at(a + 1));
      triangle(at(a + 1), at(a + n), at(a + n + 1));
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  g.setIndex(index);
  return g;
}
