import { BufferAttribute, Vector3, type BufferGeometry } from 'three';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';
import { relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { roundedIntersection } from './kit/wedge';

/**
 * Salmon (archetype: block). Round 2's ninth ingredient, after the user's reference (Figma node
 * 148:6, a watercolour salmon fillet): one raw portion cut from a side of salmon, skin on.
 *
 * What makes it a salmon fillet, not a slab of anything:
 *   - a soft rectangle with two clean cut ends, never ruler-straight: the back edge thick and
 *     rounded, the belly edge thin and tapering,
 *   - a top that swells: thickest along the loin, a soft groove along the middle line where the
 *     two muscle bands meet, falling away to the thin belly,
 *   - the white fat lines: V shapes across the top meeting on the middle line, and nested arcs on
 *     the cut ends, where the flakes show (painted by the shader, the `salmon` skin),
 *   - a thin, dark silvery skin underneath, showing as a line along the foot of the walls.
 *
 * One piece, `flesh_glow` (a distance field meshed with surface nets, like the steak). Its maps
 * for the skin: uv x: cm across from the middle line (positive toward the belly), y: height as a
 * share of the top; ownPos: x cm along the fillet, y cm up, z cm below the top.
 */

/** Length (x), width (z) and the thickest height (cm). */
const LENGTH = 10.6;
const WIDTH = 7.6;
const HEIGHT = 2.45;
/** Where the middle line runs (z, cm): a little toward the back. */
const MIDLINE = -0.5;
const ROUNDING = 0.36;
const CELL = 0.2;

export const buildSalmon: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Salmon: the "${state}" form is not built yet (the fillet only for now).`);
  return finishPieces([{ role: 'flesh_glow', geometry: salmonFillet(seed) }]);
};

/** A fillet's measurements (cm) and how its top falls away (shares of its height). */
export interface FilletShape {
  length: number;
  width: number;
  height: number;
  midline: number;
  rounding: number;
  /** How far the back and the belly fall from the loin, and how deep the middle groove is. */
  backDrop: number;
  bellyDrop: number;
  groove: number;
  /** Its height along its length, t 0 at one end to 1 at the other, as a share (default level). */
  along?: (t: number) => number;
  /** A seared top's lumpy, uneven crust: how high its bumps stand (cm; default none). */
  crust?: number;
}

/** The pantry's raw fillet. */
export const RAW_FILLET: FilletShape = { length: LENGTH, width: WIDTH, height: HEIGHT, midline: MIDLINE, rounding: ROUNDING, backDrop: 0.3, bellyDrop: 0.56, groove: 0.2 };

/** A fillet with its skin maps (dishes use their own measurements: a thick cooked portion). */
export function salmonFillet(seed: number, f: FilletShape = RAW_FILLET): BufferGeometry {
  const random = seededRandom(seed ^ 0x5a1307);
  const phase = Array.from({ length: 6 }, () => random() * Math.PI * 2);

  /** The top's height at (x, z): the loin's swell, the middle groove, the thin belly (cm). */
  const topAt = (x: number, z: number) => {
    const zc = z - f.midline;
    // Across: thickest just behind the middle line, a rounded back, a long fall to the belly.
    const back = 1 - f.backDrop * smoothstep(0.8, f.width / 2 + f.midline + 0.6, -zc) ** 1.6;
    const belly = 1 - f.bellyDrop * smoothstep(0.2, f.width / 2 - f.midline + 0.4, zc) ** 1.15;
    let h = f.height * (zc < 0 ? back : belly);
    // The groove along the middle line, a little wandering.
    const wander = 0.18 * Math.sin(x * 0.42 + phase[0]);
    h -= f.groove * Math.exp(-(((zc - wander) / 0.42) ** 2));
    // Along: one end a little thicker, and slow soft swells (flakes of muscle), never flat.
    if (f.along) h *= f.along(Math.min(1, Math.max(0, x / f.length + 0.5)));
    if (f.crust) {
      // Lumps of crust in several sizes, so the top is never one smooth sheet.
      h += f.crust * (0.5 * Math.sin(x * 2.3 + phase[3]) * Math.sin(z * 2.7 + phase[4]) + 0.35 * Math.sin(x * 4.1 - z * 1.9 + phase[5]) * Math.sin(z * 4.6 + x * 1.3) + 0.25 * Math.sin(x * 7.3 + z * 5.1) * Math.sin(z * 6.7 - x * 2.9 + phase[1]));
    }
    h *= 1 + 0.07 * (x / (f.length / 2)) + 0.035 * Math.sin(x * 0.55 + phase[1]) + 0.025 * Math.sin(x * 1.1 + z * 0.6 + phase[2]);
    return h;
  };
  /** The outline seen from above (cm, negative inside): a soft, slightly skewed rectangle. */
  const outline = (x: number, z: number) => {
    // The two cut ends: not quite square to the fillet, each with a slow wobble.
    const endA = -x - f.length / 2 + 0.1 * z + 0.12 * Math.sin(z * 0.9 + phase[3]);
    const endB = x - f.length / 2 + 0.14 * z + 0.12 * Math.sin(z * 0.8 + phase[4]);
    // The back and the belly edges: gently bowed and wavering.
    const backEdge = -z - f.width / 2 + 0.18 * Math.sin(x * 0.33 + phase[5]) + 0.012 * x * x * 0.3;
    const bellyEdge = z - f.width / 2 + 0.25 * Math.sin(x * 0.27 + phase[2]) + 0.1 * Math.sin(x * 0.9 + phase[0]);
    return roundedIntersection([endA, endB, backEdge, bellyEdge], 0.9);
  };
  const flesh = (x: number, y: number, z: number) => {
    const top = topAt(x, z);
    // The walls bulge a hair at mid height; the skin stands a hair proud at the foot.
    const bulge = 0.1 * Math.sin(Math.PI * Math.min(1, Math.max(0, y / top))) + 0.05 * (1 - smoothstep(0.1, 0.32, y));
    // Only the top edge is rounded: the underside meets the table flush (the steak's lesson).
    const d = roundedIntersection([y - top, outline(x, z) - bulge], f.rounding);
    return Math.max(d, -y);
  };

  const min = new Vector3(-f.length / 2 - 1.313, -0.417, -f.width / 2 - 1.209);
  const max = new Vector3(f.length / 2 + 1.4, f.height + 0.9, f.width / 2 + 1.4);
  const mesh = relaxOnSurface(surfaceNets(flesh, min, max, CELL), flesh, CELL);

  const pos = mesh.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const own = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const top = topAt(x, z);
    uv[2 * i] = z - f.midline - 0.18 * Math.sin(x * 0.42 + phase[0]);
    uv[2 * i + 1] = y / top;
    own[3 * i] = x;
    own[3 * i + 1] = y;
    own[3 * i + 2] = Math.max(0, top - y);
  }
  mesh.setAttribute('uv', new BufferAttribute(uv, 2));
  mesh.setAttribute('ownPos', new BufferAttribute(own, 3));

  return mesh;
}
