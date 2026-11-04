import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { latheGeometry, smoothstep } from './lathe';

/**
 * Stems and leaves for the round archetype (board 07: "Stem and leaf are
 * separate parts"). Both are small, calm shapes: a short stub with a flared
 * foot, and a single leaf with a soft centre fold and a gentle droop. All
 * sizes in centimetres.
 */

export interface StemOptions {
  /** Where the stem's foot sits (the bottom of the top dimple). */
  base: Vector3;
  height: number;
  /** Radius of the flared foot, and of the neck above it. */
  footRadius: number;
  neckRadius: number;
  /** How far it leans from upright (radians), and which way (radians round the up axis). */
  lean: number;
  leanTurn: number;
}

/** A short stub with a flared foot and a rounded tip, standing up from `base`. */
export function stemPiece(options: StemOptions): BufferGeometry {
  const { height, footRadius, neckRadius } = options;
  const geometry = latheGeometry({
    halfLength: height / 2,
    rings: 12,
    segments: 12,
    radius: (x) => {
      const t = (x + height / 2) / height;
      // Flared foot easing into the neck, then rounded off at both ends.
      const r = neckRadius + (footRadius - neckRadius) * (1 - smoothstep(0, 0.45, t));
      return r * Math.sqrt(Math.min(1, t / 0.08)) * Math.sqrt(Math.min(1, (1 - t) / 0.2));
    },
  });
  // Stand it up, foot at the origin, lean it, then move it onto the fruit.
  geometry.rotateZ(Math.PI / 2);
  geometry.translate(0, height / 2, 0);
  geometry.rotateX(options.lean * Math.sin(options.leanTurn));
  geometry.rotateZ(-options.lean * Math.cos(options.leanTurn));
  geometry.translate(options.base.x, options.base.y, options.base.z);
  return geometry;
}

export interface LeafOptions {
  /** Where the leaf's stalk end sits. */
  base: Vector3;
  /** Which way the leaf points, in radians round the up axis (0 = +X, PI / 2 = +Z, toward the front). */
  turn: number;
  length: number;
  width: number;
  /** Height above the base at a distance `d` along the leaf: lets it droop over the fruit's shoulder. */
  lift: (d: number) => number;
  /** How much the two halves fold up from the centre vein (0 = flat). */
  fold: number;
  /** A slight twist along the length (radians at the tip). */
  twist: number;
}

/**
 * One leaf: a shaped sheet, pointed at the tip, widest a little before the
 * middle, folded softly along its centre vein. Painted on both sides
 * (`doubleSided` on its piece), so it has no thickness to model.
 */
export function leafPiece(options: LeafOptions): BufferGeometry {
  const rows = 14;
  const cols = 6;
  const { length, width, fold, twist } = options;
  const cos = Math.cos(options.turn);
  const sin = Math.sin(options.turn);
  const positions: number[] = [];

  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    // Half-width along the leaf: narrow stalk end, widest around 40%, a point at the tip.
    const halfWidth = Math.max(0.02, (width / 2) * Math.sin(Math.PI * u ** 0.8));
    const d = u * length;
    const angle = twist * u;
    for (let j = 0; j <= cols; j++) {
      const v = (j / cols) * 2 - 1;
      // Local leaf space: x along the leaf, z across it, y up.
      const across = v * halfWidth;
      const z = across * Math.cos(angle);
      const y = options.lift(d) + Math.abs(v) * halfWidth * fold + across * Math.sin(angle);
      // Turn the leaf to face its direction, then move it to the base.
      positions.push(options.base.x + d * cos - z * sin, options.base.y + y, options.base.z + d * sin + z * cos);
    }
  }

  const indices: number[] = [];
  const at = (i: number, j: number) => i * (cols + 1) + j;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = at(i, j);
      const b = at(i, j + 1);
      const c = at(i + 1, j);
      const d = at(i + 1, j + 1);
      // Wound so the leaf's top faces up.
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  return geometry;
}
