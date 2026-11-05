/**
 * The wedge kit (archetype: wedge): a slice cut from a round wheel, like a
 * cheese wedge, a slice of cake or pie, a watermelon wedge.
 *
 * It is described as a distance field ("how far am I from the surface?",
 * negative inside) and meshed with surface nets (surfaceNets.ts), so anything
 * subtracted from it (a cheese's holes) cuts clean craters into whichever face
 * it touches.
 *
 * The wedge stands on its flat triangle, the wheel's axis upright (Y), the
 * point (the wheel's centre) at the origin and the slice running along +X out
 * to the curved back (the wheel's rim). All its edges are softly rounded, so
 * each catches a line of light.
 *
 * Shape only, in centimetres: no colours.
 */

export interface WedgeShape {
  /** How far the slice runs from its point to its curved back (the wheel's radius). */
  radius: number;
  /** How tall it stands. */
  height: number;
  /** Half the angle at the point, in radians (a 34 degree slice: about 0.3). */
  halfAngle: number;
  /** How round the edges are (cm). */
  rounding: number;
}

/**
 * A "rounded intersection" of flat-sided pieces: inside where every distance is
 * negative, with every edge and corner rounded by `rounding`, like a soft bevel.
 */
export function roundedIntersection(distances: number[], rounding: number): number {
  let outside = 0;
  let inside = -Infinity;
  for (const d of distances) {
    const q = Math.max(d + rounding, 0);
    outside += q * q;
    inside = Math.max(inside, d + rounding);
  }
  return Math.sqrt(outside) + Math.min(inside, 0) - rounding;
}

/**
 * The flat sides of a wedge at point (x, y, z): its bottom and top, its two cut faces
 * and its curved back. `back` can be moved in to split off a rind.
 */
export function wedgeSides(shape: WedgeShape, x: number, y: number, z: number, back = shape.radius): number[] {
  const s = Math.sin(shape.halfAngle);
  const c = Math.cos(shape.halfAngle);
  return [
    -y, // the bottom, on the table
    y - shape.height, // the top
    -x * s + z * c, // one cut face
    -x * s - z * c, // the other cut face
    Math.hypot(x, z) - back, // the curved back (the wheel's rim)
  ];
}

/** The whole wedge's distance field. */
export function wedgeDistance(shape: WedgeShape, x: number, y: number, z: number): number {
  return roundedIntersection(wedgeSides(shape, x, y, z), shape.rounding);
}
