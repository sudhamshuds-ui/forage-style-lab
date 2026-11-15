import { Matrix4 } from 'three';
import { bodyMap, rest, sculpt } from './kit/maps';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { smoothMax, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { flattenBase, roundBody } from './kit/round';

/**
 * Garlic (archetype: round). Round 3, batch 1, after the user's references (Figma node 184:349:
 * an oil bulb with lilac streaks; a bulb with two loose cloves): one bulb standing, two cloves
 * lying in front.
 *
 * What makes it garlic, not an onion: a squat bulb swollen into cloves (soft lobes with shallow
 * grooves between them, each lobe its own size, blended round the bulb, the pepper's lesson),
 * shoulders that pull up into a dry, papery neck (it grows out of the bulb, the onion's lesson),
 * cut off a little ragged at the top; a flat root end. A clove is a curved teardrop: a blunt root
 * end, a pointed tip, one flatter side.
 *
 * One piece, bulb (the bulb and the two cloves merged, the `garlic` skin). Maps
 * (kit/maps.ts): uv.x height share (a clove: along it, 0 at its root end), uv.y 0 for the bulb and
 * 1 for a clove; ownPos the point in the body's own frame.
 */
const WIDTH = 5.9;
const HEIGHT = 6.1;

export const buildGarlic: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Garlic: the "${state}" form is not built yet (the bulb and two cloves only for now).`);
  const random = seededRandom(seed ^ 0x6a711c);
  const half = HEIGHT / 2;
  const bulb = roundBody({
    halfLength: half,
    radius: (x) => {
      const t = (x + half) / HEIGHT;
      // The bulb: squat and full; the neck: slim, flaring a little where it was cut.
      const body = (WIDTH / 2) * Math.sin(Math.PI * Math.min(1, t / 0.72)) ** 0.6;
      // The neck (the user, 2026-11-15: "like a tree trunk too thick and upright"): slim and
      // tapering, the shoulders sweeping up into it in one long hollow curve, a small dry flare
      // where it was cut.
      const neck = t < 0.5 ? -2 : 0.36 - 0.11 * smoothstep(0.62, 0.93, t) + 0.08 * smoothstep(0.93, 1, t);
      return smoothMax(body, neck, 1.7) * Math.sqrt(Math.min(1, (1 - t) / 0.012));
    },
    lying: false,
    lopsided: 0.55,
    random,
    flatBase: 0.3,
    rings: 60,
    segments: 64,
  });
  // The cloves: soft lobes round the bulb, each its own width and swell, blended.
  const cloves = 8;
  const turn0 = random() * Math.PI * 2;
  const edges = Array.from({ length: cloves }, (_, i) => turn0 + ((i + signed(random) * 0.22) * Math.PI * 2) / cloves);
  const swell = Array.from({ length: cloves }, () => 0.02 + random() * 0.035);
  sculpt(bulb, (x, y0, z) => {
    // (The recipe builds the body round its middle: measure the height from its foot.)
    const y = y0 + half;
    const a = Math.atan2(z, x);
    const onBulb = smoothstep(0.1, 1.2, y) * (1 - smoothstep(HEIGHT * 0.5, HEIGHT * 0.72, y));
    let k = 1;
    let weight = 0;
    let bulge = 0;
    for (let i = 0; i < cloves; i++) {
      const d = Math.atan2(Math.sin(a - edges[i]), Math.cos(a - edges[i]));
      // A shallow groove at each clove's edge; each lobe's swell weighted by how near it is.
      k -= 0.055 * Math.exp(-((d / 0.13) ** 2)) * onBulb;
      const next = edges[(i + 1) % cloves];
      const mid = Math.atan2(Math.sin(a - (edges[i] + Math.atan2(Math.sin(next - edges[i]), Math.cos(next - edges[i])) / 2)), 1);
      const w = Math.exp(-((mid / 0.35) ** 2));
      weight += w;
      bulge += w * swell[i];
    }
    k += (bulge / Math.max(weight, 1e-3)) * onBulb;
    // The neck twists a little and leans.
    const up = smoothstep(HEIGHT * 0.7, HEIGHT, y);
    // The neck leans and bends over a little, as a dried stalk does (never bolt upright).
    return [x * k + 0.95 * up ** 1.6 - 0.12 * Math.sin(up * Math.PI), y0 - 0.25 * up * up, z * k + 0.45 * up ** 1.8];
  });
  bodyMap(bulb, () => 0);
  rest(bulb);
  bulb.translate(-0.6, 0, -1.6);

  const clove = (length: number, fat: number, turn: number, at: [number, number], bend: number) => {
    const h = length / 2;
    const g = roundBody({
      halfLength: h,
      // A teardrop: blunt at the root end (-x), fattest a third along, tapering to a point.
      radius: (x) => {
        const t = (x + h) / length;
        return fat * Math.sin(Math.PI * Math.min(1, t) ** 0.62) ** 0.85 * (1 - 0.35 * t);
      },
      lying: true,
      lopsided: 0.4,
      random,
      flatBase: 0,
      rings: 30,
      segments: 28,
    });
    // Curved like a crescent, flatter on its inner side.
    sculpt(g, (x, y, z) => {
      const t = x / h;
      const inner = z < 0 ? 0.62 : 1;
      return [x, y * 0.9, z * inner + bend * (1 - t * t)];
    });
    // Its map first (along it, in its own frame), then lay it down and place it.
    const p = g.getAttribute('position');
    bodyMap(g, () => 1);
    const uv = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) uv.setX(i, (p.getX(i) + h) / length);
    flattenBase(g, 0.12);
    let low = Infinity;
    for (let i = 0; i < p.count; i++) low = Math.min(low, p.getY(i));
    g.translate(0, -low, 0);
    g.applyMatrix4(new Matrix4().makeRotationY(turn));
    g.translate(at[0], 0, at[1]);
    return g;
  };
  // One piece (the bulb and its two cloves), so contact shadows come from where each one rests.
  return finishPieces([{ role: 'bulb', geometry: mergeGeometries([bulb, clove(3.5, 0.95, 0.5, [1.9, 1.5], 0.4), clove(3.1, 0.85, -2.6, [-1.5, 2.3], 0.35)])! }]);
};
