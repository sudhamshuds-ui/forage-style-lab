import { BufferAttribute, BufferGeometry, type Vector3 } from 'three';

/**
 * Surface nets: turn a distance field (a shape described as "how far am I from
 * the surface?", negative inside) into a clean mesh.
 *
 * Think of a 3D grid of tiny boxes laid over the shape. Every box the surface
 * passes through gets one point, placed where the surface crosses that box's
 * edges (averaged). Neighbouring points are joined into squares across every
 * grid edge the surface cuts. The result is one closed, even mesh that follows
 * the shape exactly, however many lumps it has: no ledges, no stretched walls.
 */
export function surfaceNets(
  distance: (x: number, y: number, z: number) => number,
  min: Vector3,
  max: Vector3,
  cell: number,
): BufferGeometry {
  const nx = Math.ceil((max.x - min.x) / cell);
  const ny = Math.ceil((max.y - min.y) / cell);
  const nz = Math.ceil((max.z - min.z) / cell);
  const px = nx + 1;
  const py = ny + 1;

  // 1. The distance at every grid point.
  const values = new Float32Array(px * py * (nz + 1));
  const at = (i: number, j: number, k: number) => i + px * (j + py * k);
  for (let k = 0; k <= nz; k++)
    for (let j = 0; j <= ny; j++)
      for (let i = 0; i <= nx; i++) values[at(i, j, k)] = distance(min.x + i * cell, min.y + j * cell, min.z + k * cell);

  // 2. One point in every box the surface passes through.
  const cellIndex = new Int32Array(nx * ny * nz).fill(-1);
  const cellAt = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  const positions: number[] = [];
  const corners: [number, number, number][] = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  const edges: [number, number][] = [
    [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const v = new Float32Array(8);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) {
          v[c] = values[at(i + corners[c][0], j + corners[c][1], k + corners[c][2])];
          if (v[c] < 0) inside++;
        }
        if (inside === 0 || inside === 8) continue;
        // Average where the surface crosses the box's edges.
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let count = 0;
        for (const [a, b] of edges) {
          if (v[a] < 0 === v[b] < 0) continue;
          const t = v[a] / (v[a] - v[b]);
          sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t;
          sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t;
          sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t;
          count++;
        }
        cellIndex[cellAt(i, j, k)] = positions.length / 3;
        positions.push(min.x + (i + sx / count) * cell, min.y + (j + sy / count) * cell, min.z + (k + sz / count) * cell);
      }

  // 3. A square across every grid edge the surface cuts, wound so it faces outward.
  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, outwardPositive: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (outwardPositive) indices.push(a, b, c, a, c, d);
    else indices.push(a, c, b, a, d, c);
  };
  for (let k = 0; k <= nz; k++)
    for (let j = 0; j <= ny; j++)
      for (let i = 0; i <= nx; i++) {
        const here = values[at(i, j, k)] < 0;
        // Edge along x: the four boxes round it, in the (y, z) plane.
        if (i < nx && j > 0 && k > 0 && j < ny && k < nz && here !== values[at(i + 1, j, k)] < 0) {
          quad(cellIndex[cellAt(i, j - 1, k - 1)], cellIndex[cellAt(i, j, k - 1)], cellIndex[cellAt(i, j, k)], cellIndex[cellAt(i, j - 1, k)], here);
        }
        // Edge along y: the four boxes round it, in the (z, x) plane.
        if (j < ny && i > 0 && k > 0 && i < nx && k < nz && here !== values[at(i, j + 1, k)] < 0) {
          quad(cellIndex[cellAt(i - 1, j, k - 1)], cellIndex[cellAt(i - 1, j, k)], cellIndex[cellAt(i, j, k)], cellIndex[cellAt(i, j, k - 1)], here);
        }
        // Edge along z: the four boxes round it, in the (x, y) plane.
        if (k < nz && i > 0 && j > 0 && i < nx && j < ny && here !== values[at(i, j, k + 1)] < 0) {
          quad(cellIndex[cellAt(i - 1, j - 1, k)], cellIndex[cellAt(i, j - 1, k)], cellIndex[cellAt(i, j, k)], cellIndex[cellAt(i - 1, j, k)], here);
        }
      }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Smooth a surface-nets mesh while keeping it on the true surface: like smoothing a path
 * in Illustrator while its points stay on the curve. Surface nets can leave a long edge
 * that runs at an angle across the grid slightly terraced (stairs on a diagonal). Each
 * round, every point moves part of the way toward the average of its neighbours, then is
 * pulled back exactly onto the surface along the distance field's slope.
 *
 * `cell` is the grid size the mesh was built with (it sets how finely the slope is measured).
 */
export function relaxOnSurface(
  geometry: BufferGeometry,
  distance: (x: number, y: number, z: number) => number,
  cell: number,
  rounds = 3,
  amount = 0.5,
): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.index!;
  const count = position.count;
  // Who is next to whom: every pair of points that share a triangle edge.
  const neighbours: Set<number>[] = Array.from({ length: count }, () => new Set<number>());
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t);
    const b = index.getX(t + 1);
    const c = index.getX(t + 2);
    neighbours[a].add(b).add(c);
    neighbours[b].add(a).add(c);
    neighbours[c].add(a).add(b);
  }
  const p = position.array as Float32Array;
  const next = new Float32Array(p.length);
  const h = cell * 0.25;
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < count; i++) {
      // 1. Toward the neighbours' average.
      let ax = 0;
      let ay = 0;
      let az = 0;
      for (const n of neighbours[i]) {
        ax += p[3 * n];
        ay += p[3 * n + 1];
        az += p[3 * n + 2];
      }
      const size = neighbours[i].size || 1;
      let x = p[3 * i] + ((ax / size - p[3 * i]) * amount);
      let y = p[3 * i + 1] + ((ay / size - p[3 * i + 1]) * amount);
      let z = p[3 * i + 2] + ((az / size - p[3 * i + 2]) * amount);
      // 2. Back onto the surface: two small steps down the distance field's slope.
      for (let step = 0; step < 2; step++) {
        const d = distance(x, y, z);
        const gx = (distance(x + h, y, z) - distance(x - h, y, z)) / (2 * h);
        const gy = (distance(x, y + h, z) - distance(x, y - h, z)) / (2 * h);
        const gz = (distance(x, y, z + h) - distance(x, y, z - h)) / (2 * h);
        const g2 = gx * gx + gy * gy + gz * gz;
        if (g2 < 1e-8) break;
        x -= (d * gx) / g2;
        y -= (d * gy) / g2;
        z -= (d * gz) / g2;
      }
      next[3 * i] = x;
      next[3 * i + 1] = y;
      next[3 * i + 2] = z;
    }
    p.set(next);
  }
  position.needsUpdate = true;
  return geometry;
}

/**
 * Lift a region of a surface off as a thin skin, like peeling a printed area off a mask:
 * a cheese's rind is the back of the cheese's own surface, never a separate slab.
 *
 * `inside` is positive where the skin should be. Triangles that cross its edge are cut
 * exactly along it (marching triangles), so the skin's edge is a clean line, not a zigzag
 * of whole triangles. The skin floats `lift` (cm) off the surface along its normals, and
 * keeps the surface's own normals, so it shades exactly like what is under it.
 * The geometry needs its normals computed first.
 */
export function liftRegion(geometry: BufferGeometry, inside: (x: number, y: number, z: number) => number, lift: number): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const normal = geometry.getAttribute('normal') as BufferAttribute;
  const index = geometry.index!;
  const out: number[] = [];
  const outN: number[] = [];
  type V = { p: [number, number, number]; n: [number, number, number]; f: number };
  const vertex = (i: number): V => {
    const p: [number, number, number] = [position.getX(i), position.getY(i), position.getZ(i)];
    return { p, n: [normal.getX(i), normal.getY(i), normal.getZ(i)], f: inside(p[0], p[1], p[2]) };
  };
  // A point on the edge between a (inside) and b (outside), where `inside` is exactly 0.
  const cross = (a: V, b: V): V => {
    const t = a.f / (a.f - b.f);
    const p = a.p.map((v, k) => v + (b.p[k] - v) * t) as [number, number, number];
    const n = a.n.map((v, k) => v + (b.n[k] - v) * t) as [number, number, number];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return { p, n: [n[0] / l, n[1] / l, n[2] / l], f: 0 };
  };
  const emit = (...vs: V[]) => {
    for (const v of vs) {
      out.push(v.p[0] + v.n[0] * lift, v.p[1] + v.n[1] * lift, v.p[2] + v.n[2] * lift);
      outN.push(v.n[0], v.n[1], v.n[2]);
    }
  };
  for (let t = 0; t < index.count; t += 3) {
    const tri = [vertex(index.getX(t)), vertex(index.getX(t + 1)), vertex(index.getX(t + 2))];
    const ins = tri.map((v) => v.f > 0);
    const count = ins.filter(Boolean).length;
    if (count === 0) continue;
    if (count === 3) {
      emit(tri[0], tri[1], tri[2]);
      continue;
    }
    // Rotate so the odd one out comes first, keeping the winding (the face direction).
    const odd = count === 1 ? ins.indexOf(true) : ins.indexOf(false);
    const [a, b, c] = [tri[odd], tri[(odd + 1) % 3], tri[(odd + 2) % 3]];
    const ab = cross(a, b);
    const ac = cross(a, c);
    if (count === 1) emit(a, ab, ac); // only the corner a is inside
    else emit(ab, b, c, ab, c, ac); // a is outside: the quad b, c, ac, ab
  }
  const skin = new BufferGeometry();
  skin.setAttribute('position', new BufferAttribute(new Float32Array(out), 3));
  skin.setAttribute('normal', new BufferAttribute(new Float32Array(outN), 3));
  return skin;
}
