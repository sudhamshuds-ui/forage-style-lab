import { BufferAttribute, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bowlInner, bowlProfile, moundGeometry, spinProfile, type BowlShape } from './kit/bowl';
import { latheGeometry, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';

/**
 * Rice bowl (archetype: contained). Round 2's eleventh ingredient, after the user's reference
 * (Figma node 148:9: steamed white rice heaped in a green glazed bowl, its inside rim an orange
 * brown). The first container with something in it; the bowl kit (kit/bowl.ts) is built here.
 *
 * What makes it a bowl of rice:
 *   - a round, deep bowl on a small foot, soft throwing rings round its outside, a real wall with
 *     a rounded rim,
 *   - the rice heaped well above the rim in a lumpy dome, never a smooth scoop: clumps the size
 *     of a fingertip, the grains themselves painted by the shader (the `rice` skin).
 *
 * Pieces: rice (the hero) and bowl (the `glaze` family; its own skin paints the pooled glaze, the
 * rings and the orange-brown inside rim from the bowl's map: u 0 outside to 1 inside, v height).
 */

const BOWL: BowlShape = { rim: 6.6, height: 6.4, foot: 2.9, footHeight: 0.7, wall: 0.42, fullness: 1.75, ridges: { count: 4, depth: 0.04 } };

export const buildRice: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Rice: the "${state}" form is not built yet (the bowl only for now).`);
  const random = seededRandom(seed ^ 0x51ce);
  const ph = Array.from({ length: 12 }, () => random() * Math.PI * 2);

  // The bowl: never a perfect circle (a hand-thrown bowl is a touch oval, its rim a touch uneven).
  const bowl = spinProfile(bowlProfile(BOWL), 56, (angle, y) => 1 + 0.012 * Math.cos(2 * angle + ph[0]) * (y / BOWL.height));

  // The rice: its edge sits a little below the rim, tucked into the wall; the dome rises well
  // above it, lumpy with clumps.
  const edge = BOWL.height - 0.75;
  const radius = bowlInner(BOWL, edge) + 0.12;
  const lumps = (x: number, z: number) =>
    0.3 * Math.sin(x * 1.05 + ph[1]) * Math.sin(z * 1.15 + ph[2]) +
    0.2 * Math.sin(x * 2.3 + z * 0.7 + ph[3]) * Math.sin(z * 2.1 - x * 0.5 + ph[4]) +
    0.13 * Math.abs(Math.sin(x * 3.9 + ph[5]) * Math.sin(z * 4.3 + ph[6])) +
    0.08 * Math.sin(x * 6.7 + z * 2.0 + ph[7]) * Math.sin(z * 7.1 - x * 1.6 + ph[8]);
  /** The mound's height above its edge at a point (cm). */
  const moundAt = (x: number, z: number) => {
    const rn = Math.min(1, Math.hypot(x, z) / radius);
    // A heaped dome, its top a little off centre, flatter on one side, lumpy with clumps.
    const off = Math.hypot((x - 0.5) / radius, (z + 0.3) / radius);
    const dome = 3.7 * Math.max(0, 1 - Math.min(1, off) ** 2.1) ** 0.75 + 0.5 * (1 - rn * rn);
    return (dome + 1.5 * lumps(x, z)) * smoothstep(1, 0.86, rn) + 0.25 * (1 - rn);
  };
  const mound = moundGeometry({ radius, edge, rings: 40, segments: 88, height: (x, z) => moundAt(x, z) });

  // Real grains (the user, 2026-11-15: "i want some visible grain forms seen, match the ref, it
  // looks like 1 blob of icecream"): hundreds of small grains lying on the mound, each its own
  // size, pointing its own way, half sunk in, some tipped up so they break the outline, more of
  // them toward the edge where the reference shows them best. The mound under them is the mass of
  // rice between; the skin paints its grains too.
  const grainOf = (length: number, fat: number) =>
    latheGeometry({ halfLength: length / 2, radius: (x) => fat * Math.sqrt(Math.max(0, 1 - (x / (length / 2)) ** 2)) ** 0.8, rings: 3, segments: 6 });
  const grains: BufferGeometry[] = [];
  const up = new Vector3(0, 1, 0);
  for (let n = 0; n < 380; n++) {
    // (The square root spreads them evenly over the disc; the extra power crowds a few more to the edge.)
    const rn = Math.sqrt(random()) ** 0.85 * 0.97;
    const a = random() * Math.PI * 2;
    const x = Math.cos(a) * radius * rn;
    const z = Math.sin(a) * radius * rn;
    const y = edge + moundAt(x, z);
    // The mound's slope here, for the way the surface faces.
    const e = 0.08;
    const normal = new Vector3(moundAt(x - e, z) - moundAt(x + e, z), 2 * e, moundAt(x, z - e) - moundAt(x, z + e)).normalize();
    const length = 0.62 + random() * 0.3;
    const fat = 0.135 + random() * 0.035;
    const g = grainOf(length, fat);
    // Lying along the surface, pointing any way round, some tipped up a little.
    const along = new Vector3(Math.cos(a * 7 + n), 0, Math.sin(a * 7 + n));
    along.addScaledVector(normal, -along.dot(normal)).normalize();
    along.addScaledVector(normal, (random() - 0.45) * 0.3).normalize();
    const turn = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), along);
    // Sunk well into the mound (the user, 2026-11-15: "i like the grains, but its too much noise...
    // blend them a bit into the main form"): only the top third or so of each grain stands proud.
    const at = new Vector3(x, y, z).addScaledVector(normal, fat * (-0.35 + random() * 0.45));
    g.applyMatrix4(new Matrix4().compose(at, turn, new Vector3(1, 1, 1)));
    // Never below the mound's edge (inside the bowl's wall).
    if (at.y > edge + 0.05 && up.dot(normal) > 0.2) grains.push(g);
  }
  const rice = mergeGeometries([mound, ...grains])!;
  // The rice's map for the skin: x how near the bowl's rim (1 at the edge), y height above the edge (cm).
  const pos = rice.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[2 * i] = Math.min(1, Math.hypot(pos.getX(i), pos.getZ(i)) / radius);
    uv[2 * i + 1] = pos.getY(i) - edge;
  }
  rice.setAttribute('uv', new BufferAttribute(uv, 2));

  return finishPieces([
    { role: 'rice', geometry: rice },
    { role: 'bowl', geometry: bowl },
  ]);
};
