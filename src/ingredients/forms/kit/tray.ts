import { BufferAttribute, BufferGeometry } from 'three';

/**
 * The tray kit (archetype: contained): a moulded tray, lid or punnet seen from above, like an
 * egg carton's two halves. A rounded rectangle whose top is a height at every point (cups, walls,
 * a flat lip), standing on a flat underside a little smaller than its top, so its walls lean in.
 *
 * Maps for the skin: uv.x 0 on the top surface to 1 on the outer wall, uv.y height as a share of
 * `tall`. Shape only, in centimetres.
 */
export interface TrayOptions {
  /** Size along x and z (cm), and the height used for the map. */
  width: number;
  depth: number;
  tall: number;
  /** How round the corners are (0 square, 1 an oval). */
  round: number;
  /** The top's height at (x, z); u and v run -1 to 1 across the tray. */
  top: (x: number, z: number, u: number, v: number) => number;
  /** How far the foot is inset from the top's outline (cm) at (u, v) on the outline. */
  inset: (u: number, v: number) => number;
  columns: number;
  rows: number;
}

export function trayGeometry(o: TrayOptions): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  // A square grid squeezed into a rounded rectangle.
  const place = (u: number, v: number) => [(o.width / 2) * u * Math.sqrt(1 - (o.round * v * v) / 2), (o.depth / 2) * v * Math.sqrt(1 - (o.round * u * u) / 2)] as const;
  for (let j = 0; j <= o.rows; j++) {
    for (let i = 0; i <= o.columns; i++) {
      const u = (2 * i) / o.columns - 1;
      const v = (2 * j) / o.rows - 1;
      const [x, z] = place(u, v);
      const y = o.top(x, z, u, v);
      positions.push(x, y, z);
      uvs.push(0, y / o.tall);
    }
  }
  const at = (i: number, j: number) => j * (o.columns + 1) + i;
  const index: number[] = [];
  for (let j = 0; j < o.rows; j++) for (let i = 0; i < o.columns; i++) index.push(at(i, j), at(i, j + 1), at(i + 1, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1));
  // The outline, once round, then the wall down to the foot and the flat underside.
  const edge: [number, number][] = [];
  for (let i = 0; i < o.columns; i++) edge.push([i, 0]);
  for (let j = 0; j < o.rows; j++) edge.push([o.columns, j]);
  for (let i = o.columns; i > 0; i--) edge.push([i, o.rows]);
  for (let j = o.rows; j > 0; j--) edge.push([0, j]);
  const wallTop = positions.length / 3;
  for (const [i, j] of edge) {
    const k = at(i, j) * 3;
    positions.push(positions[k], positions[k + 1], positions[k + 2]);
    uvs.push(1, positions[k + 1] / o.tall);
  }
  const foot = positions.length / 3;
  for (const [i, j] of edge) {
    const u = (2 * i) / o.columns - 1;
    const v = (2 * j) / o.rows - 1;
    const [x, z] = place(u, v);
    const d = Math.hypot(x, z) || 1;
    const inset = o.inset(u, v);
    positions.push(x - (x / d) * inset, 0, z - (z / d) * inset);
    uvs.push(1, 0);
  }
  const middle = positions.length / 3;
  positions.push(0, 0, 0);
  uvs.push(1, 0);
  const n = edge.length;
  for (let k = 0; k < n; k++) {
    const next = (k + 1) % n;
    index.push(wallTop + k, wallTop + next, foot + k, wallTop + next, foot + next, foot + k);
    index.push(middle, foot + k, foot + next);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(index);
  return geometry;
}
