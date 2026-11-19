import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { fitCamera, pixelToLevel, rimErrorPixels, worldToPixel, type CameraFit } from './camera';

const picture = { width: 512, height: 640 };
const rim = { radius: 13.5, height: 1.9 };

function rimPoints(fit: CameraFit, count: number): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.3;
    points.push(worldToPixel(fit, picture, new Vector3(Math.cos(a) * rim.radius, rim.height, Math.sin(a) * rim.radius))!);
  }
  return points;
}

describe('camera match', () => {
  it('finds a known camera again from its rim', () => {
    const truth: CameraFit = { fov: 30, dist: 62, elev: 0.66, yaw: 0.02, pitch: -0.05, roll: 0.01 };
    const { fit } = fitCamera(rimPoints(truth, 12), picture, rim, truth.fov);
    expect(fit.elev).toBeCloseTo(truth.elev, 2);
    expect(Math.abs(fit.dist - truth.dist) / truth.dist).toBeLessThan(0.01);
    expect(rimErrorPixels(fit, picture, rim, rimPoints(truth, 12))).toBeLessThan(0.2);
  });

  it('a pixel goes out to the table and back to the same pixel', () => {
    const fit: CameraFit = { fov: 28, dist: 70, elev: 0.6, yaw: 0, pitch: 0.03, roll: 0 };
    const hit = pixelToLevel(fit, picture, 300, 380, 0.75)!;
    const back = worldToPixel(fit, picture, hit)!;
    expect(back[0]).toBeCloseTo(300, 3);
    expect(back[1]).toBeCloseTo(380, 3);
  });
});

describe('footprints', () => {
  it('a block traced from the painting measures its real size, not its outline', async () => {
    const { footprint } = await import('./trace');
    const { DINNER_PLATE } = await import('../dishes/kit/ware');
    const fit: CameraFit = { fov: 30, dist: 78, elev: 0.67, yaw: 0, pitch: 0.005, roll: 0.02 };
    // A 12 x 6 cm block, 3.4 cm tall, turned 30 degrees, on the plate's floor.
    const [L, W, H, a] = [12, 6, 3.4, Math.PI / 6];
    const floor = DINNER_PLATE.floor;
    const corners: Vector3[] = [];
    for (const u of [-L / 2, L / 2]) for (const v of [-W / 2, W / 2]) for (const y of [floor, floor + H]) {
      corners.push(new Vector3(u * Math.cos(a) - v * Math.sin(a), y, u * Math.sin(a) + v * Math.cos(a)));
    }
    // Its outline in the picture: the hull of its corners, with points along each edge.
    const px = corners.map((c) => worldToPixel(fit, picture, c)!);
    const hull = convexHull(px);
    const outline: [number, number][] = [];
    hull.forEach((p, i) => {
      const q = hull[(i + 1) % hull.length];
      for (let k = 0; k < 4; k++) outline.push([p[0] + ((q[0] - p[0]) * k) / 4, p[1] + ((q[1] - p[1]) * k) / 4]);
    });
    const f = footprint(fit, picture, DINNER_PLATE, { label: 'block', ingredient: 'x', size: 'big', height: H, outline })!;
    expect(Math.abs(f.length - L)).toBeLessThan(0.5);
    expect(Math.abs(f.width - W)).toBeLessThan(0.5);
    expect(Math.abs(f.angle - 120)).toBeLessThan(2);
    expect(Math.hypot(f.centre[0], f.centre[1])).toBeLessThan(0.6);
  });
});

function convexHull(points: [number, number][]): [number, number][] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: [number, number][] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
