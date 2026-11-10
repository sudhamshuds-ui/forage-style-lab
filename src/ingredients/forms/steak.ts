import { Vector3 } from 'three';
import { smoothMin, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';
import { liftRegion, relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { sweepGeometry } from './kit/sweep';
import { roundedIntersection } from './kit/wedge';

/**
 * Steak (archetype: block). Board 08's card: "Raw. Fat cap along one edge as a separate part, a
 * few marbling shapes." The user chose the cut (2026-11-10, two references): a **tomahawk**,
 * a thick bone-in ribeye with a long rib bone. A first, plain slab read as a bean, then as a
 * shapeless piece ("this doesnt look aesthetic").
 *
 * What makes it a tomahawk, not a chop or a slab:
 *   - a thick, rounded ribeye "eye" (a rounded square lobe), tapering into a neck of meat along
 *     the bone,
 *   - a long, slightly curved rib bone running out of the neck, its knobby tip resting on the
 *     table (the steak lies flat, the bone dips down to meet the table),
 *   - a pale fat rim round the top edge and the upper sides,
 *   - on the cut face, big muscle sections separated by pale fat seams and fine marbling: the
 *     shader's job (the `marbled` skin), never geometry.
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   meat  the ribeye and its neck, one piece (a distance field meshed with surface nets)
 *   fat   the fat rim, lifted off the meat's own surface (like the cheese's rind), no seam
 *   bone  the rib bone, a sweep (a tube along a curve)
 */

/** The eye: its centre is the origin; half its length (x) and half its width (z), cm. */
const EYE = { halfX: 7.5, halfZ: 6.5 };
/** How thick the steak is (cm). */
const HEIGHT = 4.5;
/** The neck of meat along the bone: from the eye out to here (x, cm), tapering. */
const NECK_END = 16;
/** The bone: its radius, and how far it runs (x, cm). */
const BONE_RADIUS = 1.25;
const BONE_END = 29;
/** How round the top edges are, and the meshing grid (cm). */
const ROUNDING = 0.8;
const CELL = 0.32;
/** How far in from the edge the fat rim reaches on the top (cm). */
const FAT = 0.65;

export const buildSteak: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Steak: the "${state}" form is not built yet (the whole steak only for now).`);

  const random = seededRandom(seed ^ 0x70a4a);
  const lumps = Array.from({ length: 4 }, (_, i) => ({ k: i + 2, a: 0.06 / (1 + i * 0.5), phase: random() * Math.PI * 2 }));

  /** The outline (cm, negative inside): the eye's rounded square, smoothly joined to the neck. */
  const outline = (x: number, z: number) => {
    // The eye: a rounded square (a superellipse), a little lumpy round its edge.
    const qx = x / EYE.halfX;
    const qz = z / EYE.halfZ;
    const angle = Math.atan2(qz, qx);
    let r = 1;
    for (const l of lumps) r += l.a * Math.sin(l.k * angle + l.phase);
    const n = 2.6;
    const eye = ((Math.abs(qx) ** n + Math.abs(qz) ** n) ** (1 / n) - r) * Math.min(EYE.halfX, EYE.halfZ);
    // The neck: a tapering strip from inside the eye out along the bone (+x), toward the back.
    const t = Math.max(0, Math.min(1, (x - 2) / (NECK_END - 2)));
    const centreZ = -1.8 - 0.8 * t;
    const half = 4.8 * (1 - t) ** 1.3 + 1.5 * t;
    const along = Math.max(2 - x, x - NECK_END, 0);
    const across = Math.abs(z - centreZ) - half;
    const neck = Math.hypot(along, Math.max(across, 0)) + Math.min(Math.max(across, -along), 0);
    return smoothMin(eye, neck, 2.0);
  };

  /** The top's height (cm): a gently domed eye, the neck thinning toward the bone. */
  const topAt = (x: number, z: number) => {
    const edge = Math.min(1, Math.hypot(x / EYE.halfX, z / EYE.halfZ));
    const neck = smoothstep(3, NECK_END, x);
    return HEIGHT * (0.9 + 0.1 * (1 - edge * edge)) * (1 - 0.5 * neck);
  };

  const meat = (x: number, y: number, z: number) => {
    const bulge = 0.2 * Math.sin(Math.PI * Math.min(1, Math.max(0, y / HEIGHT)));
    // Only the top edge is rounded; the underside meets the table flush (a rounded bottom edge
    // showed the floor's contact shade as a dashed line round it).
    return Math.max(roundedIntersection([y - topAt(x, z), outline(x, z) - bulge], ROUNDING), -y);
  };

  const min = new Vector3(-EYE.halfX - 1.613, -0.617, -EYE.halfZ - 1.409);
  const max = new Vector3(NECK_END + 1.6, HEIGHT + 0.8, EYE.halfZ + 1.4);
  const mesh = relaxOnSurface(surfaceNets(meat, min, max, CELL), meat, CELL);
  mesh.computeVertexNormals();

  // The fat rim: a band round the edge on the top, and down the upper part of the side walls.
  const fat = liftRegion(
    mesh,
    (x, y, z) => {
      const wander = 0.3 * Math.sin(0.8 * x + 1.1) + 0.2 * Math.sin(1.7 * z + 0.4);
      // Round the eye only: the neck along the bone stays red meat (all fat, it read as a paddle).
      const band = FAT * (1 - smoothstep(4, 9, x)) + wander * (1 - smoothstep(4, 9, x)) + outline(x, z) - 0.3 * smoothstep(4, 9, x);
      // Only the upper part of the wall: down to half way, the front read as a thick white slab.
      const high = y - topAt(x, z) * 0.7;
      return Math.min(band, high);
    },
    0.012,
  );

  // The bone: from inside the neck out to its tip, a gentle curve, dipping down so its knobby
  // tip rests on the table.
  const boneY = topAt(NECK_END, -2.6) * 0.5;
  const tipZ = -4.6;
  const points = [
    new Vector3(NECK_END - 4, boneY, -2.4),
    new Vector3(NECK_END, boneY, -2.6),
    new Vector3((NECK_END + BONE_END) / 2, (boneY + BONE_RADIUS * 1.3) / 2 + 0.2, (-2.6 + tipZ) / 2 - 0.3),
    new Vector3(BONE_END, BONE_RADIUS * 1.3, tipZ),
  ];
  const bone = sweepGeometry({
    points,
    // Even along its length, swelling into a rounded knob at the tip; its start is buried in
    // the meat.
    radius: (t) => {
      const knob = 1 + 0.3 * smoothstep(0.82, 0.97, t);
      const tipRound = Math.sqrt(Math.max(0, 1 - Math.max(0, (t - 0.97) / 0.03) ** 2));
      const startRound = Math.sqrt(Math.min(1, t / 0.04));
      return BONE_RADIUS * knob * tipRound * startRound;
    },
    rings: 48,
    segments: 18,
    // A rib bone is flatter than round.
    around: (_t, a) => 1 / Math.hypot(Math.cos(a), Math.sin(a) / 0.75),
  });

  return finishPieces([
    { role: 'meat', geometry: mesh },
    { role: 'fat', geometry: fat, doubleSided: true, keepNormals: true },
    { role: 'bone', geometry: bone },
  ]);
};
