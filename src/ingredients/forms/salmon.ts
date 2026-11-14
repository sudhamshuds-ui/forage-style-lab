import { BufferAttribute, Vector3 } from 'three';
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
const LENGTH = 15.5;
const WIDTH = 8.8;
const HEIGHT = 3.8;
/** Where the middle line runs (z, cm): a little toward the back. */
const MIDLINE = -0.5;
const ROUNDING = 0.36;
const CELL = 0.2;

export const buildSalmon: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Salmon: the "${state}" form is not built yet (the fillet only for now).`);
  const random = seededRandom(seed ^ 0x5a1307);
  const phase = Array.from({ length: 6 }, () => random() * Math.PI * 2);

  /** The top's height at (x, z): the loin's swell, the middle groove, the thin belly (cm). */
  const topAt = (x: number, z: number) => {
    const zc = z - MIDLINE;
    // Across: thickest just behind the middle line, a rounded back, a long fall to the belly.
    const back = 1 - 0.3 * smoothstep(0.8, WIDTH / 2 + MIDLINE + 0.6, -zc) ** 1.6;
    const belly = 1 - 0.56 * smoothstep(0.2, WIDTH / 2 - MIDLINE + 0.4, zc) ** 1.15;
    let h = HEIGHT * (zc < 0 ? back : belly);
    // The groove along the middle line, a little wandering.
    const wander = 0.18 * Math.sin(x * 0.42 + phase[0]);
    h -= 0.2 * Math.exp(-(((zc - wander) / 0.42) ** 2));
    // Along: one end a little thicker, and slow soft swells (flakes of muscle), never flat.
    h *= 1 + 0.07 * (x / (LENGTH / 2)) + 0.035 * Math.sin(x * 0.55 + phase[1]) + 0.025 * Math.sin(x * 1.1 + z * 0.6 + phase[2]);
    return h;
  };
  /** The outline seen from above (cm, negative inside): a soft, slightly skewed rectangle. */
  const outline = (x: number, z: number) => {
    // The two cut ends: not quite square to the fillet, each with a slow wobble.
    const endA = -x - LENGTH / 2 + 0.1 * z + 0.12 * Math.sin(z * 0.9 + phase[3]);
    const endB = x - LENGTH / 2 + 0.14 * z + 0.12 * Math.sin(z * 0.8 + phase[4]);
    // The back and the belly edges: gently bowed and wavering.
    const backEdge = -z - WIDTH / 2 + 0.18 * Math.sin(x * 0.33 + phase[5]) + 0.012 * x * x * 0.3;
    const bellyEdge = z - WIDTH / 2 + 0.25 * Math.sin(x * 0.27 + phase[2]) + 0.1 * Math.sin(x * 0.9 + phase[0]);
    return roundedIntersection([endA, endB, backEdge, bellyEdge], 0.9);
  };
  const flesh = (x: number, y: number, z: number) => {
    const top = topAt(x, z);
    // The walls bulge a hair at mid height; the skin stands a hair proud at the foot.
    const bulge = 0.1 * Math.sin(Math.PI * Math.min(1, Math.max(0, y / top))) + 0.05 * (1 - smoothstep(0.1, 0.32, y));
    // Only the top edge is rounded: the underside meets the table flush (the steak's lesson).
    const d = roundedIntersection([y - top, outline(x, z) - bulge], ROUNDING);
    return Math.max(d, -y);
  };

  const min = new Vector3(-LENGTH / 2 - 1.313, -0.417, -WIDTH / 2 - 1.209);
  const max = new Vector3(LENGTH / 2 + 1.4, HEIGHT + 0.9, WIDTH / 2 + 1.4);
  const mesh = relaxOnSurface(surfaceNets(flesh, min, max, CELL), flesh, CELL);

  const pos = mesh.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const own = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const top = topAt(x, z);
    uv[2 * i] = z - MIDLINE - 0.18 * Math.sin(x * 0.42 + phase[0]);
    uv[2 * i + 1] = y / top;
    own[3 * i] = x;
    own[3 * i + 1] = y;
    own[3 * i + 2] = Math.max(0, top - y);
  }
  mesh.setAttribute('uv', new BufferAttribute(uv, 2));
  mesh.setAttribute('ownPos', new BufferAttribute(own, 3));

  return finishPieces([{ role: 'flesh_glow', geometry: mesh }]);
};
