import type { BufferGeometry } from 'three';
import { spinProfile, type ProfilePoint } from '../../ingredients/forms/kit/bowl';

/**
 * Tableware: plates and wide shallow bowls, thrown on a wheel (spun from a side outline, like the
 * rice bowl). One recipe makes both: a flat well in the middle that rises into a rim.
 *
 * Each comes with `floor(x, z)`, the height of its top surface at any point, so food can be set
 * down on it (the salmon on the plate, the mushrooms in the bowl).
 *
 * The map is the bowl kit's: u 0 on the outside, 1 on the inside; v the height as a share, so the
 * glaze skin paints them like the rice bowl (pooled glaze, a soft rim line, iron specks).
 */
export interface WareShape {
  /** Outer radius at the rim (cm). */
  radius: number;
  /** Radius of the flat well in the middle (cm). */
  well: number;
  /** Height of the rim's top (cm). */
  rim: number;
  /** Height of the well's floor (cm): the foot plus the thickness. */
  floor: number;
  /** Radius of the foot ring it stands on (cm). */
  foot: number;
  /** Thickness of the wall (cm). */
  wall: number;
  /** How the side rises from the well to the rim: 1 straight, 2 a soft curve, 3+ flatter then steep. */
  curve: number;
}

export interface Ware {
  geometry: BufferGeometry;
  /** The top surface's height at (x, z): the floor of the well, then up the side. */
  floor: (x: number, z: number) => number;
  shape: WareShape;
}

/** The top surface's height at a distance from the middle. */
function top(s: WareShape, r: number): number {
  if (r <= s.well) return s.floor;
  const t = Math.min(1, (r - s.well) / (s.radius - s.wall * 0.5 - s.well));
  return s.floor + (s.rim - s.wall * 0.5 - s.floor) * t ** s.curve;
}

export function ware(s: WareShape, segments = 96): Ware {
  const points: ProfilePoint[] = [];
  const v = (y: number) => y / s.rim;
  const steps = 26;
  const footHeight = s.floor - s.wall;
  // Underneath: a shallow hollow inside the foot ring, the ring it stands on.
  points.push({ r: 0, y: footHeight * 0.7, u: 0, v: 0 });
  points.push({ r: s.foot - 0.5, y: footHeight * 0.7, u: 0, v: 0 });
  points.push({ r: s.foot - 0.25, y: 0.03, u: 0, v: 0 });
  points.push({ r: s.foot, y: 0, u: 0, v: 0 });
  points.push({ r: s.foot + 0.2, y: 0.05, u: 0, v: 0 });
  points.push({ r: s.foot + 0.3, y: footHeight, u: 0, v: v(footHeight) });
  // Up the underside: the top surface less the wall's thickness.
  const start = s.foot + 0.45;
  const end = s.radius - s.wall * 0.5;
  for (let i = 0; i <= steps; i++) {
    const r = start + ((end - start) * i) / steps;
    const y = Math.max(footHeight, top(s, r) - s.wall);
    points.push({ r, y, u: 0, v: v(y) });
  }
  // Over the rim: a rounded lip from the outside to the inside.
  const lipY = s.rim - s.wall * 0.5;
  for (let i = 1; i < 6; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 6;
    points.push({ r: end + Math.cos(a) * s.wall * 0.5, y: lipY - s.wall * 0.5 + (Math.sin(a) + 1) * s.wall * 0.5, u: i / 6, v: 1 });
  }
  // Down the inside to the middle.
  for (let i = steps; i >= 0; i--) {
    const r = s.well + ((end - s.well) * i) / steps;
    const y = top(s, r);
    points.push({ r, y, u: 1, v: v(y) });
  }
  for (let i = 1; i <= 4; i++) {
    const r = s.well * (1 - i / 4);
    points.push({ r: i === 4 ? 0 : r, y: s.floor, u: 1, v: v(s.floor) });
  }
  const geometry = spinProfile(points, segments);
  return { geometry, floor: (x, z) => top(s, Math.hypot(x, z)), shape: s };
}

/** A dinner plate: a wide flat well and a low, gently curved rim (about 27 cm). */
export const DINNER_PLATE: WareShape = { radius: 13.5, well: 8.2, rim: 2.1, floor: 0.75, foot: 7.2, wall: 0.42, curve: 1.7 };

/** A wide, shallow pasta bowl: a small well, sides that rise in a soft curve (about 25 cm). */
export const PASTA_BOWL: WareShape = { radius: 12.5, well: 4.5, rim: 4.6, floor: 0.8, foot: 5, wall: 0.45, curve: 1.6 };


/** A big deep soup bowl (about 19 cm across, 7 cm tall): a small well and steep, gently curved sides. */
export const SOUP_BOWL: WareShape = { radius: 9.5, well: 3.6, rim: 6.8, floor: 0.9, foot: 4.2, wall: 0.5, curve: 1.25 };

/** A small dessert bowl for a set pudding (about 13 cm across, 5.5 cm tall). */
export const PUDDING_BOWL: WareShape = { radius: 6.5, well: 2.6, rim: 5.5, floor: 0.8, foot: 3, wall: 0.4, curve: 1.3 };

/** The inside radius of ware at a height (where a liquid at that level meets its side). */
export function innerRadiusAt(s: WareShape, y: number): number {
  const span = s.rim - s.wall * 0.5 - s.floor;
  const t = Math.min(1, Math.max(0, (y - s.floor) / span)) ** (1 / s.curve);
  return s.well + t * (s.radius - s.wall * 0.5 - s.well);
}
