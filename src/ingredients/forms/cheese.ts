import { Vector3 } from 'three';
import { smoothMax } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { roundedIntersection, wedgeSides, type WedgeShape } from './kit/wedge';

/**
 * Cheese (archetype: wedge). Spec (board 08): one wedge with four to six round
 * holes, some cut open on the faces. 12 cm long, about 5.5 cm tall and 7 cm
 * across the back.
 *
 * What makes it a cheese wedge, not a cake slice: flat, clean cut faces with
 * softly rounded edges, a thin rind along the curved back (the wheel's rim),
 * and round holes (the cheese's "eyes", bubbles inside it) that open as smooth
 * round craters wherever a cut face slices through one.
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   cheese  the paste: the wedge with its holes
 *   rind    the thin rind along the curved back
 * Both are one distance field, split where the rind begins, and meshed with
 * surface nets, so the holes cut cleanly into any face and there are no ledges.
 */

/** The wedge, in centimetres (see kit/wedge.ts). */
/**
 * Rounding 0.6: the bevel must span about two grid cells (CELL), or the mesher builds it as
 * a little staircase that catches light step by step (a saw-toothed edge).
 */
const SHAPE: WedgeShape = { radius: 12, height: 5.5, halfAngle: 0.3, rounding: 0.6 };
/** How thick the rind is along the back. */
const RIND = 0.38;
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
  ].map(([x, y, z, r]) => [x, y, z, r * grow] as [number, number, number, number]);
}

export const buildCheese: FormBuilder = ({ state }) => {
  if (state !== 'whole') throw new Error(`Cheese: the "${state}" form is not built yet (whole wedge only for now).`);

  const bubbles = holes();
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

  // The paste: the wedge, stopping where the rind begins. Relaxed onto its surface, so its
  // long edges come out straight and clean (no terracing).
  const paste = (x: number, y: number, z: number) =>
    carve(roundedIntersection(wedgeSides(SHAPE, x, y, z, SHAPE.radius - RIND), SHAPE.rounding), x, y, z);
  const cheese = relaxOnSurface(surfaceNets(paste, min, max, CELL), paste, CELL);

  // The rind: the last few millimetres of the wedge, along its curved back.
  const shell = (x: number, y: number, z: number) => {
    const sides = wedgeSides(SHAPE, x, y, z);
    // Inside the rind: beyond where the paste stops.
    sides.push(SHAPE.radius - RIND - Math.hypot(x, z));
    return roundedIntersection(sides, SHAPE.rounding * 0.6);
  };
  const rind = relaxOnSurface(surfaceNets(shell, min, max, CELL), shell, CELL);

  return finishPieces([
    { role: 'cheese', geometry: cheese },
    { role: 'rind', geometry: rind },
  ]);
};
