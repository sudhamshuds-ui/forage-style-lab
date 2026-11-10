import { Vector3 } from 'three';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';
import { liftRegion, relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { roundedIntersection } from './kit/wedge';

/**
 * Steak (archetype: block). Board 08's card: "Raw. Fat cap along one edge as a separate part,
 * a few marbling shapes." L, 20 x 12 x 3 cm, Pink and raw.
 *
 * What makes it a raw steak, not a slab of salmon, a slice of ham or a cushion:
 *   - an irregular cut outline, like the card: straight-ish sides meeting at softened corners,
 *     a lobe at one end and a notch in the near side where a bone sat (a smooth oval read as a
 *     bean), never a rounded rectangle,
 *   - a flat underside resting on the table and a gently domed, softly uneven top, thicker at
 *     the back (the fat side) than the front, so the top slopes toward the camera, thinner at
 *     the edges, the side walls slightly bulging, its edges softly rounded (it is soft meat),
 *   - a pale fat cap along the back long edge (as on the card: seen over the top as a pale rim
 *     along the far edge), wrapping that side wall and a strip of the top. Wrapped round an end
 *     too, it read as a blunt pale cap,
 *   - marbling: thin pale branching veins and a few flecks, painted by the shader (the
 *     `marbled` skin), never geometry.
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   meat  the slab, one piece (a distance field meshed with surface nets)
 *   fat   the fat cap, lifted off the meat's own surface (like the cheese's rind), so the two
 *         meet with no seam; it shades exactly like the surface under it
 */

/** Half the length (x) and half the width (z) of the outline, and the height (cm). */
const HALF_LENGTH = 9.4;
const HALF_WIDTH = 6;
const HEIGHT = 2.7;
/** How round the edges are (cm): two grid cells or more, or they come out saw-toothed. */
const ROUNDING = 0.7;
const CELL = 0.3;
/** How far the fat cap reaches in from the back edge (cm), on the top and down the side. */
const FAT = 2.0;

export const buildSteak: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Steak: the "${state}" form is not built yet (the whole steak only for now).`);

  const random = seededRandom(seed ^ 0x57ea4);
  // The top's gentle unevenness.
  const bumps = Array.from({ length: 3 }, () => ({ kx: 0.25 + random() * 0.3, kz: 0.3 + random() * 0.4, phase: random() * Math.PI * 2 }));

  /**
   * The outline, as a distance on the table (cm, negative inside). After the card (the user,
   * 2026-11-10: "very rounded, make it similar to the ref, a bit jagged"): a cut of meat, not an
   * oval. Straight-ish sides meeting at corners (only softened a little, it is soft meat), a
   * lobe at the right end, and a notch in the near side where a bone sat. The corners are placed
   * by hand (x along the steak, z toward the camera, cm), nudged a little by the seed, and every
   * side wavers gently.
   */
  const corners: [number, number][] = [
    [-9.4, 2.4], [-9.7, -1.2], [-7.9, -4.4], [-4.6, -5.5], [-0.6, -5.1], [3.4, -6.1],
    [7.1, -5.5], [9.3, -3.1], [9.6, 0.7], [8.1, 4.2], [5.1, 5.6], [2.7, 4.9],
    [1.3, 3.0], [-0.3, 4.3], [-3.5, 5.3], [-7.1, 4.9],
  ].map(([x, z]) => [x + (random() - 0.5) * 0.5, z + (random() - 0.5) * 0.5]);
  const waver = Array.from({ length: 2 }, () => ({ k: 0.9 + random() * 0.8, phase: random() * Math.PI * 2 }));
  const outline = (x: number, z: number) => {
    // Distance to the polygon (its nearest side), negative inside.
    let d = Infinity;
    let inside = false;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
      const [ax, az] = corners[j];
      const [bx, bz] = corners[i];
      const ex = bx - ax;
      const ez = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
      d = Math.min(d, Math.hypot(x - ax - ex * t, z - az - ez * t));
      if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
    }
    let edge = inside ? -d : d;
    for (const w of waver) edge += 0.12 * Math.sin(w.k * (x + 0.7 * z) + w.phase);
    return edge;
  };

  /** The top's height (cm): domed, thinner toward the edges, softly uneven. */
  const topAt = (x: number, z: number) => {
    const edge = Math.min(1, Math.hypot(x / HALF_LENGTH, z / HALF_WIDTH));
    let h = HEIGHT * (0.86 + 0.14 * (1 - edge * edge));
    // Thicker at the back (the fat side, like a real ribeye) and thinner at the front, so the
    // top slopes toward the camera and its marbling and far fat rim show from the low view (flat,
    // it read as a thin disc).
    h *= 1 + 0.28 * (-z / HALF_WIDTH);
    for (const b of bumps) h += 0.06 * Math.sin(b.kx * x + b.kz * z + b.phase);
    return h;
  };

  const meat = (x: number, y: number, z: number) => {
    // The side walls bulge a little at mid-height, like soft meat.
    const bulge = 0.18 * Math.sin(Math.PI * Math.min(1, Math.max(0, y / HEIGHT)));
    // Only the top edge is rounded; the underside meets the table flush, like soft meat resting
    // on a board. A rounded bottom edge curled up off the table, and the floor's contact shade
    // showed through the hairline gap as a dashed line round the steak.
    return Math.max(roundedIntersection([y - topAt(x, z), outline(x, z) - bulge], ROUNDING), -y);
  };

  // The grid starts at odd offsets, so its lines never sit exactly on a flat face.
  const min = new Vector3(-HALF_LENGTH - 1.613, -0.617, -HALF_WIDTH * 1.2 - 1.409);
  const max = new Vector3(HALF_LENGTH + 1.6, HEIGHT + 0.8, HALF_WIDTH * 1.2 + 1.4);
  const mesh = relaxOnSurface(surfaceNets(meat, min, max, CELL), meat, CELL);
  mesh.computeVertexNormals();

  // The fat cap: along the back (-z) long edge, from about a quarter of the way in from each
  // end, fading out toward the ends; the band reaches FAT cm in from the edge, with a softly
  // wandering inner line. Lifted off the meat's own surface, so there is no seam.
  const fat = liftRegion(
    mesh,
    (x, _y, z) => {
      // Full along most of the back, fading out toward both ends.
      const along = 1 - smoothstep(0.65, 0.97, Math.abs(x) / HALF_LENGTH);
      const wander = 0.25 * Math.sin(0.9 * x + 1.3) + 0.12 * Math.sin(2.3 * x);
      // The back half only.
      const side = smoothstep(-0.5, 0.8, -z);
      return Math.min(FAT * along + wander + outline(x, z), side - 0.5);
    },
    0.012,
  );

  return finishPieces([
    { role: 'meat', geometry: mesh },
    { role: 'fat', geometry: fat, doubleSided: true, keepNormals: true },
  ]);
};
