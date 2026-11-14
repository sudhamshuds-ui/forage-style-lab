import { BufferAttribute, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LeafMass, type MassLeaf } from './kit/leafMass';
import { stemmedLeafGeometry, type StemmedLeaf } from './kit/leafy';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';

/**
 * Cabbage (archetype: leafy). Round 2's eighth ingredient, the last leafy one, after the user's
 * references (2026-11-14: two watercolour green cabbages, "this is the form ref for cabbage"; it
 * replaces the napa cabbage first tried here, which is in history).
 *
 * A round head sitting upright:
 *   1. The head: a ball of pale leaves wrapped over it, one blended surface (the kit's leaf mass,
 *      as for the romaine's inner head): a core ball and leaves laid on it like shingles, each at
 *      its own height, so their edges cross the head in soft arcs.
 *   2. The wrapper leaves: big, darker, separate leaves cupped round the head from below, their
 *      tops flaring out and curling a little, laid as shingles round it (the romaine's outer leaves,
 *      wrapped round a ball instead of along a log).
 * The veins (a pale midrib, side veins branching out) and colours are the cabbage skin's.
 */

/** The head's radius (cm) and how high its middle sits. */
const R = 6.2;
const CY = R * 0.92;
const WRAPPERS = 7;

/** A direction from the head's middle: theta from straight down (0) to straight up (pi). */
function dir(theta: number, phi: number): Vector3 {
  return new Vector3(Math.sin(theta) * Math.cos(phi), -Math.cos(theta), Math.sin(theta) * Math.sin(phi));
}

/** The volume a closed mesh encloses (positive when its faces point outward). */
function signedVolumeOf(g: BufferGeometry): number {
  const p = g.getAttribute('position');
  const index = g.getIndex()!;
  let v = 0;
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t), b = index.getX(t + 1), c = index.getX(t + 2);
    v += (p.getX(a) * (p.getY(b) * p.getZ(c) - p.getZ(b) * p.getY(c)) - p.getY(a) * (p.getX(b) * p.getZ(c) - p.getZ(b) * p.getX(c)) + p.getZ(a) * (p.getX(b) * p.getY(c) - p.getY(b) * p.getX(c))) / 6;
  }
  return v;
}

export const buildCabbage: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Cabbage: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x6ab1e);
  const centre = new Vector3(0, CY, 0);

  // 1. The head: leaves over the upper ball, spread evenly (a spiral of directions), each pointing
  //    up and over the top, as a cabbage's head leaves wrap it.
  const leaves: MassLeaf[] = [];
  const COUNT = 16;
  for (let i = 0; i < COUNT; i++) {
    const yDir = 0.95 - (1.2 * (i + 0.5)) / COUNT;
    const ring = Math.sqrt(1 - yDir * yDir);
    const turn = i * 2.39996 + signed(random) * 0.2;
    const normal = new Vector3(ring * Math.cos(turn), yDir, ring * Math.sin(turn)).normalize();
    // Up and over: toward the top, turned a little each its own way.
    const upOver = new Vector3(0, 1, 0).addScaledVector(normal, -normal.y);
    if (upOver.lengthSq() < 1e-3) upOver.set(Math.cos(turn), 0, Math.sin(turn));
    const along = upOver.normalize().applyAxisAngle(normal, signed(random) * 0.5);
    const length = R * (1.5 + random() * 0.4);
    const rank = random();
    const middle = centre.clone().addScaledVector(normal, R - 0.35 + rank * 0.3);
    leaves.push({
      base: middle.clone().addScaledVector(along, -length * 0.45),
      along,
      normal,
      length,
      width: R * (1.2 + random() * 0.35),
      widest: 0.55 + random() * 0.1,
      thickness: 0.36,
      bend: R,
      bendAcross: R,
      crinkle: 0.03,
      crinkleScale: 1.6,
      lobes: 0.03,
      rimLift: -0.1,
      tipCurl: -0.2,
      wave: 0.15 + random() * 0.1,
      waves: 4,
      phase: random() * Math.PI * 2,
      fold: 0,
      // The head's leaves: layers 0 and 1 (paler), for the skin.
      id: (0.2 + random() * 1.6) / 3,
    });
  }
  const mass = new LeafMass({
    core: [{ centre, radii: new Vector3(R - 0.45, R - 0.45, R - 0.45) }],
    leaves,
    stems: [],
    coreSoftness: 1,
    leafSoftness: 0.4,
    stemSoftness: 0.1,
    joinSoftness: 0.4,
    table: 0,
    cell: 0.36,
    smoothRounds: 6,
  });
  const head = mass.geometry();
  // The skin's map: x how pale (the midrib), y how green (the head is pale green, its top lighter).
  {
    const map = head.getAttribute('uv') as BufferAttribute;
    const leafMap = new Float32Array(map.count * 2);
    for (let i = 0; i < map.count; i++) {
      const u = Math.max(0.001, map.getX(i));
      const across = Math.abs(map.getY(i) - 0.5) * 2;
      leafMap[i * 2] = u;
      leafMap[i * 2 + 1] = (map.getY(i) - 0.5) * 2;
      const ribHalf = 0.14 - 0.08 * u;
      const rib = 1 - smoothstep(ribHalf * 0.5, ribHalf * 1.4, across);
      map.setXY(i, rib * (1 - 0.5 * u), 0.4 + 0.25 * u);
    }
    head.setAttribute('leafMap', new BufferAttribute(leafMap, 2));
  }

  // 2. The wrapper leaves: cupped round the head from near its base, their tops flaring out.
  const wrappers: BufferGeometry[] = [];
  const turn0 = random() * Math.PI * 2;
  const ringsAlong = 40;
  const around = 18;
  for (let i = 0; i < WRAPPERS; i++) {
    const phi0 = turn0 + (2 * Math.PI * i) / WRAPPERS + signed(random) * 0.15;
    // From low on the head up past its middle (some taller, some shorter).
    const theta0 = 0.55 + random() * 0.15;
    const theta1 = 1.75 + random() * 0.55;
    const span = (Math.PI / WRAPPERS) * (1.35 + random() * 0.25);
    const flare = 1.6 + random() * 1.6;
    const ruffle = 0.3 + random() * 0.25;
    const waves = 4 + random() * 3;
    const phase = random() * Math.PI * 2;
    const id = (2.1 + random() * 0.8) / 3;
    const rings: Vector3[][] = [];
    const centres: Vector3[] = [];
    const uvs: number[] = [];
    for (let k = 0; k <= ringsAlong; k++) {
      const u = k / ringsAlong;
      const theta = theta0 + (theta1 - theta0) * u;
      // The outline: narrow at the base, widest past the middle, a round top.
      const tip = u > 0.7 ? Math.sqrt(Math.max(0, 1 - ((u - 0.7) / 0.3) ** 2)) : 1;
      const halfAngle = span * (0.45 + 0.55 * smoothstep(0, 0.6, u)) * tip + 0.02;
      const ring: Vector3[] = [];
      for (let j = 0; j < around; j++) {
        const psi = (2 * Math.PI * j) / around;
        const c = Math.cos(psi);
        const side = Math.sin(psi);
        const edge = Math.abs(c);
        const phi = phi0 + (c * halfAngle) / Math.max(0.35, Math.sin(theta));
        // Off the head: a little clear of it, the shingle tilt, the flaring top, a ruffled edge.
        let r = R + 0.15 + 0.3 * c * (0.5 + 0.5 * smoothstep(0, 0.25, u));
        r += flare * smoothstep(0.35, 1, u) ** 2 * (0.7 + 0.3 * edge);
        r += ruffle * smoothstep(0.3, 0.9, u) * edge ** 2.5 * Math.sin(waves * Math.PI * u * 2 + phase + c * 3);
        const thick = (0.05 + 0.13 * (1 - smoothstep(0, 0.5, edge)) * (1 - 0.6 * u)) * (0.4 + 0.6 * Math.sqrt(Math.max(0, 1 - c * c)));
        r += side * thick;
        const p = centre.clone().addScaledVector(dir(theta, phi), r);
        p.y = Math.max(p.y, 0.08);
        ring.push(p);
        uvs.push(u, (1 - c) / 2);
      }
      rings.push(ring);
      centres.push(centre.clone().addScaledVector(dir(theta, phi0), R));
    }
    const g = stemmedLeafGeometry({ rings, centres, bladeStart: 0, uvs } as StemmedLeaf, id);
    const map = g.getAttribute('uv') as BufferAttribute;
    const own = g.getAttribute('ownPos') as BufferAttribute;
    const leafMap = new Float32Array(map.count * 2);
    for (let v = 0; v < map.count; v++) {
      const u = Math.min(1, Math.max(0.001, map.getX(v)));
      const across = Math.abs(map.getY(v) - 0.5) * 2;
      leafMap[v * 2] = u;
      leafMap[v * 2 + 1] = 1 - 2 * map.getY(v);
      const ribHalf = 0.16 - 0.1 * u;
      const rib = 1 - smoothstep(ribHalf * 0.5, ribHalf * 1.4, across);
      // Pale at the base where it leaves the stem, the rib pale, the blade a full green.
      map.setXY(v, Math.max(rib * 0.8, 1 - smoothstep(0.02, 0.18, u)), 0.75 + 0.25 * u);
      own.setXYZ(v, id, 0, smoothstep(0.7, 1, across));
    }
    g.setAttribute('leafMap', new BufferAttribute(leafMap, 2));
    if (signedVolumeOf(g) < 0) {
      const index = g.getIndex()!;
      for (let t = 0; t < index.count; t += 3) {
        const a = index.getX(t + 1);
        index.setX(t + 1, index.getX(t + 2));
        index.setX(t + 2, a);
      }
    }
    wrappers.push(g);
  }

  return finishPieces([
    { role: 'head', geometry: head, keepNormals: true },
    { role: 'head', geometry: mergeGeometries(wrappers)! },
  ]);
};
