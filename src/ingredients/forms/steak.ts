import { BufferAttribute, CatmullRomCurve3, Vector3 } from 'three';
import { smoothMin, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';
import { relaxOnSurface, surfaceNets } from './kit/surfaceNets';
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
 *   (the fat rim is painted on the meat by the shader as a soft gradient, the `marbled` skin;
 *   a lifted fat piece had a harsh edge)
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

  // The bone's path (cm): it leaves the neck low and level, then curves gently (bowing toward
  // the back, then back out) to its tip, which rests on the table, like the references.
  const boneY = topAt(NECK_END, -2.6) * 0.42;
  const bonePath = new CatmullRomCurve3([
    new Vector3(NECK_END - 4.5, boneY, -2.4),
    new Vector3(NECK_END, boneY, -2.6),
    new Vector3(NECK_END + 5, boneY * 0.85, -3.6),
    new Vector3(NECK_END + 10, boneY * 0.65, -3.9),
    new Vector3(BONE_END, BONE_RADIUS * 1.25, -3.2),
  ]);
  /** Distance from (x, y, z) to the bone's line near the neck, and how far along it (0..1). */
  // Sampled once (asking the curve for points inside the distance field was far too slow).
  const boneSamples = Array.from({ length: 49 }, (_, i) => bonePath.getPointAt((i / 48) * 0.45));
  const nearBone = (p: Vector3) => {
    let best = Infinity;
    let at = 0;
    for (let i = 0; i < boneSamples.length; i++) {
      const d = boneSamples[i].distanceToSquared(p);
      if (d < best) { best = d; at = (i / 48) * 0.45; }
    }
    return { d: Math.sqrt(best), t: at };
  };
  const probe = new Vector3();

  const meat = (x: number, y: number, z: number) => {
    const bulge = 0.2 * Math.sin(Math.PI * Math.min(1, Math.max(0, y / HEIGHT)));
    // Only the top edge is rounded; the underside meets the table flush (a rounded bottom edge
    // showed the floor's contact shade as a dashed line round it).
    let d = roundedIntersection([y - topAt(x, z), outline(x, z) - bulge], ROUNDING);
    // Where bone meets meat (the references): the meat wraps up round the bone in a sleeve that
    // thins along it and runs out a little way past the neck, so the bone grows out of the meat
    // instead of poking out of a flat edge.
    if (x > NECK_END - 6 && x < NECK_END + 4 && y < boneY + BONE_RADIUS * 3 && Math.abs(z + 2.8) < BONE_RADIUS * 3.5) {
      const { d: r, t } = nearBone(probe.set(x, y, z));
      const along = (t / 0.45) * (bonePath.getLength() * 0.45);
      const sleeveEnd = NECK_END - (NECK_END - 4.5) + 2.5;
      const thick = BONE_RADIUS * (1.9 - 0.85 * smoothstep(0, sleeveEnd, along));
      const sleeve = along > sleeveEnd ? Infinity : r - thick;
      d = smoothMin(d, sleeve, 1.2);
    }
    return Math.max(d, -y);
  };

  const min = new Vector3(-EYE.halfX - 1.613, -0.617, -EYE.halfZ - 1.409);
  const max = new Vector3(NECK_END + 4.6, HEIGHT + 0.8, EYE.halfZ + 1.4);
  const mesh = relaxOnSurface(surfaceNets(meat, min, max, CELL), meat, CELL);
  mesh.computeVertexNormals();

  // The fat rim is painted by the shader as a soft gradient (the user, 2026-11-10: the lifted fat
  // layer's hard edge was "just too harsh"). Its map on the meat: x is how far in from the edge
  // (cm), y the height as a share of the top, so the shader can fade the fat in from the edge and
  // down the upper wall. The neck along the bone stays red meat.
  const pos = mesh.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const neck = smoothstep(4, 9, x);
    uv[2 * i] = -outline(x, z) + neck * 6;
    uv[2 * i + 1] = pos.getY(i) / topAt(x, z);
  }
  mesh.setAttribute('uv', new BufferAttribute(uv, 2));

  // The bone, after the references: slender in the middle, swelling toward a flared, rounded
  // knob at its end (never a flat-cut stick), flatter than round, its start buried in the meat.
  const bone = sweepGeometry({
    points: bonePath.getSpacedPoints(12),
    radius: (t) => {
      const waist = 1 - 0.18 * Math.sin(Math.PI * smoothstep(0.15, 0.8, t));
      const knob = 1 + 0.4 * smoothstep(0.78, 0.93, t);
      // A rounded end over the last 8%, and a rounded start inside the meat.
      const tip = Math.sqrt(Math.max(0, 1 - Math.max(0, (t - 0.92) / 0.08) ** 2));
      const start = Math.sqrt(Math.min(1, t / 0.05));
      return BONE_RADIUS * waist * knob * tip * start;
    },
    rings: 64,
    segments: 20,
    // Flatter than round, turning a little along its length.
    around: (t, a) => 1 / Math.hypot(Math.cos(a + t * 0.6), Math.sin(a + t * 0.6) / 0.72),
  });

  return finishPieces([
    { role: 'meat', geometry: mesh },
    { role: 'bone', geometry: bone },
  ]);
};
