import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

/**
 * Camera match: where the painter stood, worked out from the plate's rim (like fSpy).
 *
 * The idea in design terms: a plate is a perfect circle of a known size. Seen from above it is a
 * circle; seen from low down it squashes into a thin oval. How squashed it is, how big, and where
 * it sits in the picture tell us the camera's height, tilt and distance. One circle cannot tell a
 * long lens far away from a wide lens close up, so the lens (field of view) is set by hand.
 *
 * World: centimetres, the plate's middle at the origin on the table (y = 0), y up, the camera on
 * the +z side looking toward -z (so +z is "toward the viewer", the same as a dish plan).
 */

export interface CameraFit {
  /** Vertical field of view, degrees (the lens). */
  fov: number;
  /** Distance from the plate's middle (cm). */
  dist: number;
  /** How high the camera is, as an angle above the table (radians). */
  elev: number;
  /** Small turns of the camera away from looking straight at the plate's middle (radians). */
  yaw: number;
  pitch: number;
  roll: number;
}

/** The picture's size in pixels (the rim points and outlines are in these pixels). */
export interface Picture {
  width: number;
  height: number;
}

/** The camera's place and the way it faces. */
export function cameraPose(fit: CameraFit): { position: Vector3; quaternion: Quaternion } {
  const position = new Vector3(0, fit.dist * Math.sin(fit.elev), fit.dist * Math.cos(fit.elev));
  const look = new Matrix4().lookAt(position, new Vector3(0, 0, 0), new Vector3(0, 1, 0));
  const base = new Quaternion().setFromRotationMatrix(look);
  const extra = new Quaternion().setFromEuler(new Euler(fit.pitch, fit.yaw, fit.roll, 'YXZ'));
  return { position, quaternion: base.multiply(extra) };
}

/** The line of sight through a pixel of the picture, as a direction in the world. */
export function rayThrough(fit: CameraFit, picture: Picture, px: number, py: number, quaternion?: Quaternion): Vector3 {
  const q = quaternion ?? cameraPose(fit).quaternion;
  const tan = Math.tan(((fit.fov * Math.PI) / 180) / 2);
  const aspect = picture.width / picture.height;
  const nx = (px / picture.width) * 2 - 1;
  const ny = 1 - (py / picture.height) * 2;
  return new Vector3(nx * tan * aspect, ny * tan, -1).applyQuaternion(q).normalize();
}

/** Where a pixel's line of sight meets the flat level `y` (null if it never does). */
export function pixelToLevel(fit: CameraFit, picture: Picture, px: number, py: number, y: number): Vector3 | null {
  const { position, quaternion } = cameraPose(fit);
  const dir = rayThrough(fit, picture, px, py, quaternion);
  if (Math.abs(dir.y) < 1e-9) return null;
  const t = (y - position.y) / dir.y;
  if (t <= 0) return null;
  return position.clone().addScaledVector(dir, t);
}

/** Where a point in the world lands in the picture (pixels), or null if it is behind the camera. */
export function worldToPixel(fit: CameraFit, picture: Picture, point: Vector3): [number, number] | null {
  const { position, quaternion } = cameraPose(fit);
  const local = point.clone().sub(position).applyQuaternion(quaternion.clone().invert());
  if (local.z >= -1e-6) return null;
  const tan = Math.tan(((fit.fov * Math.PI) / 180) / 2);
  const aspect = picture.width / picture.height;
  const nx = local.x / -local.z / (tan * aspect);
  const ny = local.y / -local.z / tan;
  return [((nx + 1) / 2) * picture.width, ((1 - ny) / 2) * picture.height];
}

/** The plate's rim as the solver sees it: a circle of `radius` cm at height `height` cm. */
export interface Rim {
  radius: number;
  height: number;
}

/** How far each rim point's line of sight misses the rim circle (cm). */
function misses(fit: CameraFit, picture: Picture, rim: Rim, points: [number, number][]): number[] {
  const { position, quaternion } = cameraPose(fit);
  return points.map(([px, py]) => {
    const dir = rayThrough(fit, picture, px, py, quaternion);
    const t = (rim.height - position.y) / dir.y;
    if (!(t > 0)) return 60;
    const hit = position.clone().addScaledVector(dir, t);
    return Math.hypot(hit.x, hit.z) - rim.radius;
  });
}

const KEYS = ['dist', 'elev', 'yaw', 'pitch', 'roll'] as const;

function withValues(fit: CameraFit, values: number[]): CameraFit {
  const next = { ...fit };
  KEYS.forEach((k, i) => (next[k] = values[i]));
  return next;
}

/** Solve a small square system (Gaussian elimination with pivoting). */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-12) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * Fit the camera to the rim points (pixels round the plate's outer edge), with the lens fixed.
 * A Levenberg-Marquardt fit (it nudges the five numbers until every point's line of sight lands
 * on the rim), started from a few guesses, keeping the best.
 */
export function fitCamera(points: [number, number][], picture: Picture, rim: Rim, fov: number): { fit: CameraFit; error: number } {
  let best: { fit: CameraFit; error: number } | null = null;
  for (const dist of [45, 80, 140]) {
    for (const elev of [0.4, 0.7, 1.1]) {
      const start: CameraFit = { fov, dist, elev, yaw: 0, pitch: 0, roll: 0 };
      const result = refine(start, points, picture, rim);
      if (!best || result.error < best.error) best = result;
    }
  }
  return best!;
}

function refine(start: CameraFit, points: [number, number][], picture: Picture, rim: Rim): { fit: CameraFit; error: number } {
  let values = KEYS.map((k) => start[k]);
  const cost = (v: number[]) => misses(withValues(start, v), picture, rim, points).reduce((s, r) => s + r * r, 0);
  let current = cost(values);
  let damping = 1e-3;
  for (let iter = 0; iter < 200; iter++) {
    const r0 = misses(withValues(start, values), picture, rim, points);
    // The slope of every miss against every number (measured by nudging each a little).
    const jac = KEYS.map((_, j) => {
      const step = j === 0 ? 1e-3 * Math.max(1, values[0]) : 1e-5;
      const v = [...values];
      v[j] += step;
      const r1 = misses(withValues(start, v), picture, rim, points);
      return r1.map((r, i) => (r - r0[i]) / step);
    });
    const n = KEYS.length;
    const jtj = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => jac[a].reduce((s, x, i) => s + x * jac[b][i], 0)));
    const jtr = Array.from({ length: n }, (_, a) => jac[a].reduce((s, x, i) => s + x * r0[i], 0));
    let improved = false;
    for (let tries = 0; tries < 10 && !improved; tries++) {
      const m = jtj.map((row, a) => row.map((x, b) => (a === b ? x * (1 + damping) + 1e-9 : x)));
      const delta = solve(m, jtr.map((x) => -x));
      if (!delta) {
        damping *= 10;
        continue;
      }
      const next = values.map((x, i) => x + delta[i]);
      next[0] = Math.max(5, next[0]);
      next[1] = Math.min(Math.PI / 2 - 0.01, Math.max(0.02, next[1]));
      const c = cost(next);
      if (c < current) {
        values = next;
        const gain = current - c;
        current = c;
        damping = Math.max(1e-7, damping / 3);
        improved = true;
        if (gain < 1e-10) iter = 1e9;
      } else {
        damping *= 10;
      }
    }
    if (!improved) break;
  }
  return { fit: withValues(start, values), error: Math.sqrt(current / Math.max(1, points.length)) };
}

/** How far each rim point sits from the fitted rim's outline in the picture (pixels, on average). */
export function rimErrorPixels(fit: CameraFit, picture: Picture, rim: Rim, points: [number, number][]): number {
  const outline: [number, number][] = [];
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * Math.PI * 2;
    const p = worldToPixel(fit, picture, new Vector3(Math.cos(a) * rim.radius, rim.height, Math.sin(a) * rim.radius));
    if (p) outline.push(p);
  }
  // Distance to the nearest stretch of the outline (point to segment).
  const toSegment = (x: number, y: number, [ax, ay]: [number, number], [bx, by]: [number, number]) => {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(ax + dx * t - x, ay + dy * t - y);
  };
  let sum = 0;
  for (const [x, y] of points) {
    let near = Infinity;
    for (let i = 0; i < outline.length; i++) near = Math.min(near, toSegment(x, y, outline[i], outline[(i + 1) % outline.length]));
    sum += near;
  }
  return sum / Math.max(1, points.length);
}
