import { BufferAttribute } from 'three';
import { bowlInner, bowlProfile, moundGeometry, spinProfile, type BowlShape } from './kit/bowl';
import { smoothstep } from './kit/lathe';
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
  const bowl = spinProfile(bowlProfile(BOWL), 72, (angle, y) => 1 + 0.012 * Math.cos(2 * angle + ph[0]) * (y / BOWL.height));

  // The rice: its edge sits a little below the rim, tucked into the wall; the dome rises well
  // above it, lumpy with clumps.
  const edge = BOWL.height - 0.75;
  const radius = bowlInner(BOWL, edge) + 0.12;
  const lumps = (x: number, z: number) =>
    0.3 * Math.sin(x * 1.05 + ph[1]) * Math.sin(z * 1.15 + ph[2]) +
    0.2 * Math.sin(x * 2.3 + z * 0.7 + ph[3]) * Math.sin(z * 2.1 - x * 0.5 + ph[4]) +
    0.13 * Math.abs(Math.sin(x * 3.9 + ph[5]) * Math.sin(z * 4.3 + ph[6])) +
    0.08 * Math.sin(x * 6.7 + z * 2.0 + ph[7]) * Math.sin(z * 7.1 - x * 1.6 + ph[8]);
  const rice = moundGeometry({
    radius,
    edge,
    rings: 56,
    segments: 120,
    height: (x, z, rn) => {
      // A heaped dome, its top a little off centre, flatter on one side.
      const off = Math.hypot((x - 0.5) / radius, (z + 0.3) / radius);
      const dome = 3.7 * Math.max(0, 1 - Math.min(1, off) ** 2.1) ** 0.75 + 0.5 * (1 - rn * rn);
      return (dome + 1.5 * lumps(x, z)) * smoothstep(1, 0.86, rn) + 0.25 * (1 - rn);
    },
  });
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
