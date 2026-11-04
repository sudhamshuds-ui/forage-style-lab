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
