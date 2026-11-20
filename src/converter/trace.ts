import { Vector3 } from 'three';
import { DINNER_PLATE, PASTA_BOWL, type WareShape } from '../dishes/kit/ware';
import type { Size } from '../dishes/kit/plan';
import { fitCamera, pixelToLevel, rimErrorPixels, worldToPixel, type CameraFit, type Picture, type Rim } from './camera';

/**
 * A traced painting: the plate's rim and an outline round each piece, in the painting's pixels.
 * Like masks drawn on a layer over the painting, each tagged with what it is.
 */
export interface TracedPiece {
  /** What it is on the plan (salmon, peach, lime, foam). */
  label: string;
  /** The pantry ingredient it is made from. */
  ingredient: string;
  size: Size;
  /** How tall it stands (cm): tells how high each point of its outline is (its top edge or its foot). */
  height: number;
  /** Round what shows of it, in the painting's pixels. */
  outline: [number, number][];
}

export interface DishTrace {
  dish: string;
  /** The painting's file in references/dishes/. */
  painting: string;
  picture: Picture;
  ware: 'dinner' | 'pasta';
  /** The lens (vertical field of view, degrees). */
  fov: number;
  /** Points on the plate's outer edge. */
  rim: [number, number][];
  pieces: TracedPiece[];
}

export const WARES: Record<DishTrace['ware'], WareShape> = { dinner: DINNER_PLATE, pasta: PASTA_BOWL };

/** The rim circle the camera is matched to: the lip's outer edge, at the lip's height. */
export function rimOf(shape: WareShape): Rim {
  return { radius: shape.radius, height: shape.rim - shape.wall * 0.5 };
}

export interface Footprint {
  piece: TracedPiece;
  /** The outline laid on the plate, seen from straight above (cm, x right, z toward the viewer). */
  points: [number, number][];
  /** Where it stands: the plate's surface under its middle (cm). */
  base: number;
  centre: [number, number];
  /** Its long and short sides (cm) and the long side's turn (degrees, clockwise on a plan). */
  length: number;
  width: number;
  angle: number;
}

/** The plate's surface height at (x, z). */
export function wareFloor(shape: WareShape, x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r <= shape.well) return shape.floor;
  const t = Math.min(1, (r - shape.well) / (shape.radius - shape.wall * 0.5 - shape.well));
  return shape.floor + (shape.rim - shape.wall * 0.5 - shape.floor) * t ** shape.curve;
}

/**
 * A piece's footprint: its outline laid on the plate, as seen from straight above.
 *
 * An outline round a tall piece (the salmon) takes in its top and the side facing the camera, so
 * reading every point at the plate would stretch it away from the camera. Each point is read at
 * the height it belongs to instead: where the outline faces up the picture, it is the piece's top
 * edge (read at its full height); where it faces down the picture, it is where the piece meets the
 * plate (read at the plate); in between, in between. Like knowing which edge of a cut-out is its
 * top when tracing a photo.
 */
export function footprint(fit: CameraFit, picture: Picture, shape: WareShape, piece: TracedPiece): Footprint | null {
  const outline = piece.outline;
  const n = outline.length;
  // Which way round the outline runs (so "outward" is known for every point).
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const turn = area > 0 ? 1 : -1;
  let base = shape.floor;
  let points: [number, number][] = [];
  for (let pass = 0; pass < 3; pass++) {
    // How high each point is, as a share of the piece's height: 1 on its top edge, 0 at its foot.
    const shares: number[] = [];
    for (let i = 0; i < n; i++) {
      const [px, py] = outline[i];
      const [ax, ay] = outline[(i - 1 + n) % n];
      const [bx, by] = outline[(i + 1) % n];
      // Outward, in picture pixels (y down).
      let nx = (by - ay) * turn, ny = -(bx - ax) * turn;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
      // "Up" for a standing thing at this spot of the picture.
      const foot = pixelToLevel(fit, picture, px, py, base);
      if (!foot) return null;
      const a = worldToPixel(fit, picture, foot);
      const b = worldToPixel(fit, picture, foot.clone().setY(base + 1));
      let share = 0.5;
      if (a && b) {
        const ux = b[0] - a[0], uy = b[1] - a[1];
        const ul = Math.hypot(ux, uy) || 1;
        share = Math.min(1, Math.max(0, 0.5 + 4 * ((nx * ux + ny * uy) / ul)));
      }
      shares.push(share);
    }
    // A side (a run of points facing sideways) rises from the foot to the top: its points climb
    // with their distance along it, from the foot end to the top end.
    const decided = (k: number) => shares[k] <= 0.1 || shares[k] >= 0.9;
    const heights = [...shares];
    if (shares.some((_, k) => decided(k))) {
      for (let i = 0; i < n; i++) {
        if (decided(i)) continue;
        let back = i, ahead = i, dBack = 0, dAhead = 0;
        while (!decided(back)) {
          const prev = (back - 1 + n) % n;
          dBack += Math.hypot(outline[back][0] - outline[prev][0], outline[back][1] - outline[prev][1]);
          back = prev;
        }
        while (!decided(ahead)) {
          const next = (ahead + 1) % n;
          dAhead += Math.hypot(outline[next][0] - outline[ahead][0], outline[next][1] - outline[ahead][1]);
          ahead = next;
        }
        const from = shares[back] >= 0.9 ? 1 : 0;
        const to = shares[ahead] >= 0.9 ? 1 : 0;
        if (from !== to) heights[i] = from + (to - from) * (dBack / (dBack + dAhead || 1));
      }
    }
    const hits = outline.map(([px, py], i) => pixelToLevel(fit, picture, px, py, base + piece.height * heights[i]));
    if (hits.some((h) => !h)) return null;
    points = hits.map((h) => [h!.x, h!.z]);
    const [cx, cz] = areaCentre(points);
    base = wareFloor(shape, cx, cz);
  }
  const centre = areaCentre(points);
  const { length, width, angle } = spread(points, centre);
  return { piece, points, base, centre, length, width, angle };
}

/** The middle of a polygon's area. */
function areaCentre(points: [number, number][]): [number, number] {
  let a = 0, x = 0, z = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[(i + 1) % points.length];
    const c = x0 * z1 - x1 * z0;
    a += c;
    x += (x0 + x1) * c;
    z += (z0 + z1) * c;
  }
  if (Math.abs(a) < 1e-9) return points[0];
  return [x / (3 * a), z / (3 * a)];
}

/**
 * Long side, short side and turn: the tightest box that fits round the footprint (tried at every
 * degree, keeping the smallest), like drawing a bounding box rotated to hug the shape.
 */
function spread(points: [number, number][], [cx, cz]: [number, number]): { length: number; width: number; angle: number } {
  let best = { area: Infinity, length: 0, width: 0, theta: 0 };
  for (let deg = 0; deg < 180; deg += 0.5) {
    const theta = (deg * Math.PI) / 180;
    const ux = Math.cos(theta), uz = Math.sin(theta);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [x, z] of points) {
      const u = (x - cx) * ux + (z - cz) * uz;
      const v = -(x - cx) * uz + (z - cz) * ux;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u);
      minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
    const area = (maxU - minU) * (maxV - minV);
    if (area < best.area - 1e-9) {
      const long = maxU - minU >= maxV - minV;
      best = { area, length: long ? maxU - minU : maxV - minV, width: long ? maxV - minV : maxU - minU, theta: long ? theta : theta + Math.PI / 2 };
    }
  }
  // On a plan the turn is clockwise on the page from "up the page" (-z), for the long side.
  let angle = (Math.atan2(Math.cos(best.theta), -Math.sin(best.theta)) * 180) / Math.PI;
  angle = ((angle % 180) + 180) % 180;
  return { length: best.length, width: best.width, angle };
}

export interface Solved {
  fit: CameraFit;
  /** How far the rim points sit from the matched rim, in pixels (under 2 is a good match). */
  rimError: number;
  footprints: Footprint[];
}

/** Match the camera and lay every outline on the plate. */
export function solveTrace(trace: DishTrace): Solved {
  const shape = WARES[trace.ware];
  const rim = rimOf(shape);
  const { fit } = fitCamera(trace.rim, trace.picture, rim, trace.fov);
  const rimError = rimErrorPixels(fit, trace.picture, rim, trace.rim);
  const footprints = trace.pieces.map((p) => footprint(fit, trace.picture, shape, p)).filter((f): f is Footprint => !!f);
  return { fit, rimError, footprints };
}

/** The camera's height above the table (cm) and its angle down onto the plate (degrees). */
export function describeCamera(fit: CameraFit): { height: number; angle: number; distance: number } {
  const position = new Vector3(0, fit.dist * Math.sin(fit.elev), fit.dist * Math.cos(fit.elev));
  return { height: position.y, angle: (fit.elev * 180) / Math.PI, distance: fit.dist };
}

/** The outer hull of a cloud of points seen from above (like shrink-wrapping them). */
export function convexHull(points: [number, number][]): [number, number][] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: [number, number][] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Middle, long side, short side and turn of a shape seen from above (cm, plan degrees). */
export function measurePoints(points: [number, number][]): { centre: [number, number]; length: number; width: number; angle: number } {
  const centre = areaCentre(points);
  return { centre, ...spread(points, centre) };
}
