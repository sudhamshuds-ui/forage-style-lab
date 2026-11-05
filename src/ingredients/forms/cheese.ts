import { Vector3 } from 'three';
import { smoothMax } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';
import { liftRegion, relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { roundedIntersection, wedgeSides, type WedgeShape } from './kit/wedge';

/**
 * Cheese (archetype: wedge). Spec (board 08): one wedge with four to six round
 * holes, some cut open on the faces. 12 cm long, about 5.5 cm tall and 7 cm
 * across the back.
 *
 * What makes it a cheese wedge, not a cake slice: cut faces with softly rounded
 * edges, a thin rind along the curved back (the wheel's rim), and round holes
 * (the cheese's "eyes", bubbles inside it) that open as round craters wherever a
 * face slices through one, including round bites out of its edges, so its outline
 * is never a ruler-straight line. The faces wobble very gently, cut by hand.
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   cheese  the whole wedge with its holes, one piece (meshed with surface nets)
 *   rind    the back of that same surface, lifted off as a thin skin: never a separate
 *           slab (one looked like a cushion stuck on the back, the user, 2026-11-05)
 */

/** The wedge, in centimetres (see kit/wedge.ts). */
/**
 * Rounding 0.6: the bevel must span about two grid cells (CELL), or the mesher builds it as
 * a little staircase that catches light step by step (a saw-toothed edge).
 */
const SHAPE: WedgeShape = { radius: 12, height: 5.5, halfAngle: 0.3, rounding: 0.6 };
/** Where the rind begins: this far in from the curved back, in the middle of its bevel. */
const RIND = 0.3;
/** How gently the cut faces wobble (cm): enough to feel cut by hand, never lumpy. */
const WOBBLE = 0.07;
/** How soft the rim of each hole is where it opens on a face. */
const HOLE_SOFTNESS = 0.18;
/** The grid size for meshing: smaller is smoother, but heavier. */
const CELL = 0.3;

/**
 * The holes: round bubbles in the cheese (centre x, y, z and radius, cm). Each bubble's
 * centre sits a little *under* a face (`depth`, a share of its radius), so the face cuts
 * it open into a round hole with an overhanging rim and a deep inside that falls into
 * shadow, never a shallow pale dish. One sits on the top edge, opened on two faces.
 * Placed by hand, like a still life: varied sizes, never in a row, none in the rind.
 */
function holes(): [number, number, number, number][] {
  const t = Math.tan(SHAPE.halfAngle);
  const c = Math.cos(SHAPE.halfAngle);
  const top = SHAPE.height;
  // A point `depth` radii inside the front cut face (z positive), at (x, y).
  const front = (x: number, y: number, r: number, depth: number): [number, number, number, number] => [
    x + Math.sin(SHAPE.halfAngle) * depth * r,
    y,
    x * t - c * depth * r,
    r,
  ];
  /** Every hole a little bigger than first placed (the user's card shows generous eyes). */
  const grow = 1.3;
  return [
    // On the top: centres below the top face.
    [5.2, top - 0.35, 0.2, 0.75],
    [8.4, top - 0.45, -0.9, 0.95],
    // On the front cut face, the one the camera sees.
    front(7.0, 2.6, 0.85, 0.35),
    front(9.8, 1.4, 0.62, 0.3),
    front(4.2, 3.6, 0.55, 0.3),
    front(5.4, 1.2, 0.42, 0.25),
    // Opened on two faces: the top edge at the front.
    [10.3, top - 0.35, 10.3 * t - 0.25, 0.72],
    // On the far cut face.
    [6.6, 2.0, -(6.6 * t) + 0.3, 0.7],
    // Bites out of the edges, so the outline is never a straight line: centred right on
    // an edge, they take a round notch out of it (the user, 2026-11-05).
    [3.1, top + 0.05, 3.1 * t + 0.05, 0.48], // the top front edge, near the point
    [7.6, top + 0.08, 7.6 * t + 0.08, 0.38], // the top front edge, further back
    [8.4, 0.1, 8.4 * t + 0.05, 0.42], // the bottom front edge
    [1.5, 3.4, 0.0, 0.38], // the point's upright edge
    [5.2, top + 0.05, -(5.2 * t) - 0.05, 0.42], // the top far edge
  ].map(([x, y, z, r]) => [x, y, z, r * grow] as [number, number, number, number]);
}

export const buildCheese: FormBuilder = ({ state }) => {
  if (state !== 'whole') throw new Error(`Cheese: the "${state}" form is not built yet (whole wedge only for now).`);

  const bubbles = holes();
  // A very gentle wobble across the faces (seeded, the same on every load): a few slow
  // waves, so the cut faces look cut by hand, not machined.
  const random = seededRandom(0x5eed);
  const waves = Array.from({ length: 3 }, () => ({
    k: [0.5 + random() * 0.5, 0.5 + random() * 0.5, 0.5 + random() * 0.5],
    phase: random() * Math.PI * 2,
  }));
  const wobble = (x: number, y: number, z: number) =>
    (WOBBLE / waves.length) * waves.reduce((sum, w) => sum + Math.sin(w.k[0] * x + w.k[1] * y + w.k[2] * z + w.phase), 0);
  /** Carve the holes out of a distance (a soft subtraction, so each crater has a gentle rim). */
  const carve = (d: number, x: number, y: number, z: number) => {
    for (const [cx, cy, cz, r] of bubbles) {
      d = smoothMax(d, r - Math.hypot(x - cx, y - cy, z - cz), HOLE_SOFTNESS);
    }
    return d;
  };

  // The grid starts at odd offsets, so its lines never sit exactly on a flat face (the
  // table plane at y = 0 did, and the mesher made a saw-toothed bottom edge).
  const min = new Vector3(-0.613, -0.617, -4.409);
  const max = new Vector3(SHAPE.radius + 0.6, SHAPE.height + 0.6, 4.4);

  // The whole wedge, one piece: gently wobbling faces, holes and bites carved out. The
  // wobble stays off the table face, so it still sits flat. Relaxed onto its surface, so its
  // long edges come out clean (no terracing).
  const wedge = (x: number, y: number, z: number) => {
    const sides = wedgeSides(SHAPE, x, y, z);
    const w = wobble(x, y, z);
    for (let i = 1; i < sides.length; i++) sides[i] += w;
    return carve(roundedIntersection(sides, SHAPE.rounding), x, y, z);
  };
  const cheese = relaxOnSurface(surfaceNets(wedge, min, max, CELL), wedge, CELL);
  cheese.computeVertexNormals();

  // The rind: the back of that same surface, lifted off as a thin skin, cut along a clean
  // line in the middle of the back bevel. It keeps the cheese's own normals, so it shades
  // exactly like the surface under it: one piece of cheese, with a rind.
  const rind = liftRegion(cheese, (x, _y, z) => Math.hypot(x, z) - (SHAPE.radius - RIND), 0.012);

  return finishPieces([
    { role: 'cheese', geometry: cheese },
    { role: 'rind', geometry: rind, doubleSided: true, keepNormals: true },
  ]);
};
