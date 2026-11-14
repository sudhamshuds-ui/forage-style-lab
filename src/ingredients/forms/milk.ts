import { BufferAttribute, BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';
import { flatEnds, revolve, ribs } from './kit/vessel';

/**
 * Milk carton (archetype: contained). Round 2's twelfth ingredient, after the user's reference
 * (Figma node 148:3, a gable-top carton with a green screw cap and a green print; the form only:
 * the print is our own design, never the reference's brand, see src/shading/labelArt.ts).
 *
 * The carton tool, built here first: a box built as rings up its height. Above the shoulder the
 * front and back lean in to meet along a ridge (the gable), the two ends fold inward in a soft V,
 * and a flat fin stands along the ridge where the carton is sealed.
 *
 * What makes it a milk carton, not a box:
 *   - tall and square, crisp folded edges (each a small bevel), faces that bulge a hair,
 *   - the gable roof with its folded-in ends and the sealed fin on top,
 *   - a ribbed screw cap on a collar, on the front slope.
 *
 * Pieces: carton (the hero: its map runs once round the four faces, u, and up the whole height,
 * v, so the `carton` skin can print the artwork on it) and cap (the print's green).
 */

/** Half the width (x) and depth (z), the shoulder, the ridge and the top of the fin (cm). */
const HALF = 3.5;
const SHOULDER = 16.2;
const RIDGE = 19.5;
const TOP = 20.4;
const CORNER = 0.32;
const FIN = 0.13;
/** Points along each face and round each corner. */
const ALONG = 7;
const ARC = 4;

export const buildMilk: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Milk: the "${state}" form is not built yet (the carton only for now).`);
  const random = seededRandom(seed ^ 0x3117c);
  const lean = [(random() - 0.5) * 0.02, (random() - 0.5) * 0.02];
  const wave = random() * Math.PI * 2;

  /** One ring of the carton at a height: `t` runs 0 at the shoulder to 1 at the ridge (0 below). */
  const ring = (y: number, t: number, inset = 0) => {
    const hx = HALF - inset;
    const hz = (HALF - inset) * (1 - t) + FIN * t;
    const r = Math.min(CORNER, hz * 0.9);
    // The faces bulge a hair (a full carton is never dead flat), most at mid height.
    const bulge = t > 0 ? 0 : 0.07 * Math.sin((Math.PI * y) / SHOULDER);
    const points: { x: number; z: number; u: number }[] = [];
    // Corners in order: front-left, front-right, back-right, back-left (u runs once round).
    const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
    for (let f = 0; f < 4; f++) {
      const [ax, az] = corners[f];
      const [bx, bz] = corners[(f + 1) % 4];
      const side = f % 2 === 1;
      for (let k = 0; k <= ALONG; k++) {
        const q = k / ALONG;
        let x = (ax + (bx - ax) * q) * (hx - r) + (side ? ax * r : 0);
        let z = (az + (bz - az) * q) * (hz - r) + (side ? 0 : az * r);
        const out = bulge * Math.sin(Math.PI * q);
        if (side) {
          // The gable's ends fold inward in a soft V, deepest at the ridge.
          x = ax * (hx + out - 1.5 * t * Math.sin(Math.PI * q) ** 0.8);
        } else {
          z = az * (hz + out);
        }
        points.push({ x, z, u: (f + 0.06 + 0.88 * q) / 4 });
      }
      // The corner: a small rounded bevel, turning from this face to the next.
      for (let k = 1; k < ARC; k++) {
        const a = ((Math.PI / 2) * k) / ARC;
        const cx = bx * (hx - r);
        const cz = bz * (hz - r);
        const from = side ? [bx, 0] : [0, bz];
        const to = side ? [0, bz] : [bx, 0];
        points.push({ x: cx + r * (from[0] * Math.cos(a) + to[0] * Math.sin(a)), z: cz + r * (from[1] * Math.cos(a) + to[1] * Math.sin(a)), u: (f + 0.94 + 0.12 * (k / ARC)) / 4 });
      }
    }
    return points.map((p) => ({ x: p.x + lean[0] * y, y, z: p.z + lean[1] * y + (y > RIDGE ? 0.05 * Math.sin(p.x * 1.1 + wave) * ((y - RIDGE) / (TOP - RIDGE)) : 0), u: p.u }));
  };

  // The heights, with extra rings close to every fold so each fold stays crisp (a fold shared
  // between two far-apart rings shades as one long smear).
  const rings: ReturnType<typeof ring>[] = [ring(0, 0, 0.14), ring(0.14, 0), ring(0.45, 0)];
  for (let y = 2.6; y < SHOULDER - 1; y += 2.6) rings.push(ring(y, 0));
  rings.push(ring(SHOULDER - 0.45, 0), ring(SHOULDER - 0.12, 0), ring(SHOULDER, 0));
  for (const t of [0.04, 0.14, 0.38, 0.66, 0.9, 0.97, 1]) rings.push(ring(SHOULDER + (RIDGE - SHOULDER) * t, t));
  rings.push(ring(RIDGE + 0.12, 1), ring(RIDGE + 0.5, 1), ring(TOP - 0.06, 1), ring(TOP, 1, 0.04));

  const count = rings[0].length;
  const positions: number[] = [];
  const uvs: number[] = [];
  // Each ring has one extra point at its end (the same place as its first, with u = 1), so the
  // artwork wraps without a smeared seam.
  for (const points of rings) {
    for (let j = 0; j <= count; j++) {
      const p = points[j % count];
      positions.push(p.x, p.y, p.z);
      uvs.push(j === count ? 1 + points[0].u : p.u, p.y / TOP);
    }
  }
  const at = (i: number, j: number) => i * (count + 1) + j;
  const index: number[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < count; j++) index.push(at(i, j), at(i + 1, j + 1), at(i + 1, j), at(i, j), at(i, j + 1), at(i + 1, j + 1));
  }
  // The underside and the top of the fin: a fan each.
  const under = positions.length / 3;
  positions.push(0, 0, 0);
  uvs.push(0.5, 0);
  const over = under + 1;
  const last = rings.length - 1;
  positions.push(lean[0] * TOP, TOP, lean[1] * TOP);
  uvs.push(0.5, 1);
  for (let j = 0; j < count; j++) {
    index.push(under, at(0, j + 1), at(0, j));
    index.push(over, at(last, j), at(last, j + 1));
  }
  const carton = new BufferGeometry();
  carton.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  carton.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  carton.setIndex(index);

  // The screw cap on its collar, standing square on the front slope.
  const collar = revolve({ bottom: -0.1, top: 0.3, radius: (y) => flatEnds(y, -0.1, 0.3, 1.5, 5), rings: 8, segments: 48 });
  const top = revolve({
    bottom: 0.18,
    top: 1.3,
    radius: (y) => flatEnds(y, 0.18, 1.3, 1.28, 7),
    section: (angle, y) => (y < 1.12 ? ribs(angle, 30, 0.035) : 1),
    rings: 18,
    segments: 120,
  });
  const cap = mergeGeometries([collar, top])!;
  const slope = Math.atan2(HALF - FIN, RIDGE - SHOULDER);
  cap.rotateX(Math.PI / 2 - slope);
  cap.translate(0, SHOULDER + (RIDGE - SHOULDER) * 0.47, (HALF - FIN) * 0.53 + FIN);

  return finishPieces([
    { role: 'carton', geometry: carton },
    { role: 'cap', geometry: cap },
  ]);
};
