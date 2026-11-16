import type { BufferGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { bowlInner, bowlProfile, spinProfile, type BowlShape, type ProfilePoint } from '../ingredients/forms/kit/bowl';
import type { FamilyId } from '../ingredients/families';

/**
 * Vessels: what the ingredient is served on. Each comes in three sizes; a bigger vessel holds
 * more (the user, 2026-11-16: "plate dimensions control number of ingredient and quant").
 *
 * A vessel is a shape in centimetres standing on the table, plus where food goes on it: the
 * height of the surface the food rests on and how wide that surface is.
 */
export const VESSELS = ['Plate', 'Bowl', 'Board'] as const;
export type VesselKind = (typeof VESSELS)[number];
export const SIZES = ['Small', 'Medium', 'Large'] as const;
export type VesselSize = (typeof SIZES)[number];

export interface Vessel {
  geometry: BufferGeometry;
  /** Its colour family; whether it is shiny ceramic; whether the glaze skin paints it (pooled colour, a warm rim). */
  family: FamilyId;
  glazed: boolean;
  glaze: boolean;
  /** Where food rests (cm above the table) and the radius it may cover (cm). */
  surface: number;
  radius: number;
  /** For a bowl: the inside wall's radius at a height, so round food can settle against it. */
  inner?: (y: number) => number;
  /** How much it holds, as a share of the medium one (drives how many pieces go on it). */
  holds: number;
}

const SCALE: Record<VesselSize, number> = { Small: 0.76, Medium: 1, Large: 1.28 };

/** A dinner plate: a low foot ring, a broad flat well, a gently raised rim. */
function plate(k: number): Vessel {
  const R = 11.5 * k;
  const h = 1.9 * Math.sqrt(k);
  const foot = R * 0.52;
  const well = R * 0.62;
  const v = (y: number) => y / h;
  const out = (r: number, y: number): ProfilePoint => ({ r, y, u: 0, v: v(y) });
  const inn = (r: number, y: number): ProfilePoint => ({ r, y, u: 1, v: v(y) });
  const profile: ProfilePoint[] = [
    out(0, 0.3),
    out(foot - 0.7, 0.3),
    out(foot - 0.45, 0.02),
    out(foot, 0),
    out(foot + 0.2, 0.32),
    out(well + 0.6, 0.5),
    out(R * 0.86, h * 0.72),
    out(R - 0.12, h - 0.2),
    { r: R, y: h - 0.08, u: 0.5, v: 1 },
    inn(R - 0.14, h),
    inn(R * 0.86, h * 0.84),
    inn(well + 0.7, 0.78),
    inn(well, 0.66),
    inn(well * 0.5, 0.62),
    inn(0, 0.62),
  ];
  return { geometry: spinProfile(profile, 72), family: 'milk', glazed: true, glaze: false, surface: 0.64, radius: well, holds: k * k };
}

/** A deep bowl on a small foot (the rice bowl's shape, in three sizes). */
function bowl(k: number): Vessel {
  const shape: BowlShape = { rim: 7.4 * k, height: 6.2 * k, foot: 3.2 * k, footHeight: 0.7, wall: 0.42, fullness: 1.75, ridges: { count: 4, depth: 0.04 } };
  // Food is heaped from about two thirds of the way up.
  const surface = shape.height * 0.62;
  return {
    geometry: spinProfile(bowlProfile(shape), 64),
    family: 'glaze',
    glazed: true,
    glaze: true,
    surface,
    radius: bowlInner(shape, surface) + 0.1,
    inner: (y) => bowlInner(shape, y),
    holds: k * k,
  };
}

/** A wooden serving board: a thick slab with softened edges. */
function board(k: number): Vessel {
  const w = 30 * k;
  const d = 19 * k;
  const t = 1.7;
  const geometry = new RoundedBoxGeometry(w, t, d, 4, 0.5);
  geometry.translate(0, t / 2, 0);
  // No map: a map on a piece would be read as a leaf's.
  geometry.deleteAttribute('uv');
  return { geometry, family: 'wood', glazed: false, glaze: false, surface: t, radius: d * 0.42, holds: k * k };
}

export function buildVessel(kind: VesselKind, size: VesselSize): Vessel {
  const k = SCALE[size];
  if (kind === 'Bowl') return bowl(k);
  if (kind === 'Board') return board(k);
  return plate(k);
}
