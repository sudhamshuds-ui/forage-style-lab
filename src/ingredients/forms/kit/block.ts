import { BufferAttribute, BufferGeometry } from 'three';

/**
 * The block kit (archetype: block): butter, steak, tofu, a fish fillet, a cheese block.
 *
 * `blockSides` describes a box with flat faces as distances ("how far am I from each
 * face?"), to be rounded with `roundedIntersection` (wedge.ts) and meshed with surface nets,
 * like the cheese. Anything added to the field (a slumping corner, a drip, a puddle) melts
 * into it smoothly.
 *
 * `paperSheet` builds a sheet lying under the block (a butter wrapper, later a napkin or
 * butcher paper): a flat grid whose height comes from a function, so folds and crumples are
 * just numbers. `fold` is the crease: flat on one side, rising on the other, with a soft but
 * clear bend at the line, like a fold in real paper.
 *
 * Shape only, in centimetres: no colours.
 */

export interface BlockShape {
  /** Along X (cm). */
  length: number;
  /** Up (cm). */
  height: number;
  /** Along Z (cm). */
  width: number;
}

/**
 * The faces of a block standing on the table, centred on the origin: bottom, top, the two
 * ends (X) and the two long sides (Z). `grow` pushes faces out ([ends, sides], cm), for a
 * soft bulge; `sag` lowers the top (cm).
 */
export function blockSides(shape: BlockShape, x: number, y: number, z: number, sag = 0, grow: [number, number] = [0, 0]): number[] {
  return [
    -y, // the bottom, on the table
    y - (shape.height - sag), // the top
    Math.abs(x) - shape.length / 2 - grow[0], // the two ends
    Math.abs(z) - shape.width / 2 - grow[1], // the two long sides
  ];
}

/**
 * A fold in paper: 0 on one side of the line (t < 0), rising with slope 1 on the other,
 * with a bend `softness` cm wide. Folds add up: a sheet with a few of them is a set of
 * flat planes meeting at crease lines, like real paper.
 */
export function fold(t: number, softness: number): number {
  return 0.5 * (t + Math.sqrt(t * t + softness * softness)) - 0.5 * softness;
}

/** A crease ridge (or valley, with a negative height): a tent `width` cm wide each side of the line. */
export function crease(t: number, width: number, softness: number): number {
  return Math.max(0, 1 - Math.sqrt(t * t + softness * softness) / width);
}

export interface PaperOptions {
  /** The sheet's size (cm): along its length and across. */
  length: number;
  width: number;
  /** How far the sheet is turned from the block (radians), so its edges are not parallel. */
  angle: number;
  /** Grid points along and across. */
  columns: number;
  rows: number;
  /**
   * The outline's wobble: a small seeded amount (a share of the size) at a point round the edge,
   * given (u, v) from -1 to 1, so the sheet is never a ruler-straight rectangle.
   */
  ragged?: (u: number, v: number) => [number, number];
  /** The sheet's height at (x, z) in the block's space, and (u, v) on the sheet (-1 to 1). */
  height: (x: number, z: number, u: number, v: number) => number;
}

/** A paper sheet lying on the table under a block: open, painted on both sides. */
export function paperSheet(options: PaperOptions): BufferGeometry {
  const { length, width, angle, columns, rows, ragged, height } = options;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const positions: number[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      const u = (2 * i) / columns - 1;
      const v = (2 * j) / rows - 1;
      const [du, dv] = ragged ? ragged(u, v) : [0, 0];
      const a = (u + du) * (length / 2);
      const b = (v + dv) * (width / 2);
      // Turned by `angle` round the up axis.
      const x = a * cos + b * sin;
      const z = -a * sin + b * cos;
      positions.push(x, height(x, z, u, v), z);
    }
  }
  const indices: number[] = [];
  const at = (i: number, j: number) => j * (columns + 1) + i;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      // Wound so the sheet's front faces up.
      indices.push(at(i, j), at(i, j + 1), at(i + 1, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  return geometry;
}
