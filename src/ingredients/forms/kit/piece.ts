import { Box3, type BufferGeometry } from 'three';
import { UNITS_PER_CM } from '../../scale';

/**
 * Pieces: what every form builder hands back.
 *
 * A form is a small set of pieces, each named by its role from the spec
 * (`peel`, `flesh_glow`, `pith`, `stem`). Think of them as layers in a
 * pre-comp: the Style Lab gives each layer its own colours, and a `_glow`
 * name tells the shader light passes through it. Pieces carry shape only:
 * no colours, no materials, no lights.
 */
export interface FormPiece {
  /** The role from the spec, e.g. `peel` or `flesh_glow`. */
  role: string;
  /** Real size, in scene units, with smooth normals. */
  geometry: BufferGeometry;
  /** Thin, open pieces (a leaf) are painted on both sides. */
  doubleSided?: boolean;
  /**
   * Keep the normals the piece already has (a skin lifted off another piece, like a cheese's
   * rind), so it shades exactly like the surface under it, with no seam at its edge.
   */
  keepNormals?: boolean;
}

/** Which state to build (`whole`, `half`, ...) and the seed from the ingredient id. */
export interface FormOptions {
  state: string;
  seed: number;
}

export type FormBuilder = (options: FormOptions) => FormPiece[];

/**
 * Finish a set of pieces built in centimetres:
 *   1. scale from centimetres to scene units (real size),
 *   2. move them together so the lowest point sits on the table (y = 0) and
 *      the footprint is centred (origin at the bottom centre),
 *   3. compute smooth normals and bounds.
 */
export function finishPieces(pieces: FormPiece[]): FormPiece[] {
  for (const piece of pieces) piece.geometry.scale(UNITS_PER_CM, UNITS_PER_CM, UNITS_PER_CM);

  const box = new Box3();
  for (const piece of pieces) {
    piece.geometry.computeBoundingBox();
    box.union(piece.geometry.boundingBox!);
  }
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  for (const piece of pieces) {
    piece.geometry.translate(-cx, -box.min.y, -cz);
    if (!piece.keepNormals || !piece.geometry.getAttribute('normal')) piece.geometry.computeVertexNormals();
    piece.geometry.computeBoundingBox();
    piece.geometry.computeBoundingSphere();
  }
  return pieces;
}
