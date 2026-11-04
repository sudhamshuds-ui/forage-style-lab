import { Vector3, type BufferGeometry } from 'three';
import { smoothMin } from './lathe';
import { surfaceNets } from './surfaceNets';

/**
 * Kit recipe for the top of the **branching** archetype (broccoli, cauliflower,
 * a grape bunch): a few soft blobs blended into one smooth, lumpy mass.
 *
 * Board 07: "Tops are a few soft blobs blended together and smoothed. Keep
 * three to five big masses, never hundreds of bumps."
 *
 * Think of each blob as a ball of clay. They are merged with a soft fillet
 * (a smooth minimum of their distance fields), so where two balls meet the
 * join is a gentle valley, not a crease. The clay is turned into a mesh with
 * surface nets (surfaceNets.ts): it follows every lump and valley exactly,
 * with no ledges, however many lumps there are.
 *
 * All sizes in centimetres. The buds and texture are the shader's job.
 */
export interface Blob {
  centre: Vector3;
  radius: number;
}

export interface CrownOptions {
  blobs: Blob[];
  /** How soft the joins between blobs are (cm): larger is a smoother valley. */
  softness: number;
  /** Size of the grid boxes (cm): smaller is finer, and more triangles. */
  cell: number;
}

/** The blended distance from a point to the clay: negative inside, positive outside. */
export function crownDistance(p: Vector3, blobs: Blob[], softness: number): number {
  let d = Infinity;
  for (const blob of blobs) {
    const one = p.distanceTo(blob.centre) - blob.radius;
    d = d === Infinity ? one : smoothMin(d, one, softness);
  }
  return d;
}

export function crownGeometry(options: CrownOptions): BufferGeometry {
  const { blobs, softness } = options;
  // The box the crown fits in, with a little room round it.
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const blob of blobs) {
    min.min(blob.centre.clone().subScalar(blob.radius + softness));
    max.max(blob.centre.clone().addScalar(blob.radius + softness));
  }
  min.subScalar(options.cell);
  max.addScalar(options.cell);
  const p = new Vector3();
  return surfaceNets((x, y, z) => crownDistance(p.set(x, y, z), blobs, softness), min, max, options.cell);
}
