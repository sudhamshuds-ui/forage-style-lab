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
 *   - an organic outline: wider at one end, a gentle waist and a notch on the far side
 *     (the bone side of a cut), lumpy all round, never a rounded rectangle,
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
  // The outline's lumps: a few slow waves round the edge (seeded, the same on every load).
  const lumps = Array.from({ length: 4 }, (_, i) => ({ k: i + 2, a: (0.025 + random() * 0.03) / (1 + i * 0.4), phase: random() * Math.PI * 2 }));
  // The top's gentle unevenness.
  const bumps = Array.from({ length: 3 }, () => ({ kx: 0.25 + random() * 0.3, kz: 0.3 + random() * 0.4, phase: random() * Math.PI * 2 }));

  /**
   * The outline, as a distance on the table (cm, negative inside): an oval, wider at its right
   * end and narrower at its left, with a waist, a notch on the near (+z) side, and lumps.
   */
  const outline = (x: number, z: number) => {
    // Wider at the right end, narrower at the left: the oval's half width changes along x.
    const halfWidth = HALF_WIDTH * (1 + 0.14 * (x / HALF_LENGTH)) * (1 - 0.07 * Math.exp(-((x + 1.5) ** 2) / 10));
    const qx = x / HALF_LENGTH;
    const qz = z / halfWidth;
    const angle = Math.atan2(qz, qx);
    let r = 1;
    for (const l of lumps) r += l.a * Math.sin(l.k * angle + l.phase);
    // The notch on the far side, a little left of centre (where a bone sat).
    r -= 0.13 * Math.exp(-((angle + 1.75) ** 2) / 0.04);
    return (Math.hypot(qx, qz) - r) * Math.min(HALF_LENGTH, halfWidth) * 1.05;
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
