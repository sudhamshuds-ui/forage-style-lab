import { bodyMap, sculpt } from './kit/maps';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { flattenBase, roundBody } from './kit/round';

/**
 * Potato (archetype: round). Round 3, batch 1, after the user's references (Figma node 184:349:
 * two watercolour potatoes side by side; a heap of small ones): a pair (the cluster layout
 * arranges two seeded variants, each its own shape).
 *
 * What makes it a potato: a lopsided oblong lying on its side, never an egg: one end fuller, broad
 * soft lumps and one shallow waist, a slightly flattened cross-section, and a few eyes (small
 * dimples, each with a soft brow). Its colours and earthy specks are the `potato` skin.
 */
const LENGTH = 10;
const HEIGHT = 5.9;
const DEPTH = 6.8;

export const buildPotato: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Potato: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x907a70);
  const half = LENGTH / 2;
  const fuller = signed(random) * 0.12;
  const waistAt = signed(random) * 0.3;
  const ph = Array.from({ length: 6 }, () => random() * Math.PI * 2);
  const skin = roundBody({
    halfLength: half,
    radius: (x) => {
      const t = x / half;
      // A blunt oblong (fuller than an ellipse), one end fuller, one shallow waist.
      const base = (1 - Math.min(1, Math.abs(t)) ** 2.6) ** (1 / 2.6);
      return (HEIGHT / 2) * base * (1 + fuller * t) * (1 - 0.06 * Math.exp(-(((t - waistAt) / 0.3) ** 2)));
    },
    lying: true,
    lopsided: 1,
    random,
    flatBase: 0,
    crossSection: (u, angle) => 1 + 0.05 * Math.sin(2 * angle + ph[0] + u * 1.3) + 0.035 * Math.sin(3 * angle + ph[1] - u * 2.1),
    rings: 48,
    segments: 52,
  });
  // Wider than tall, and a few eyes: small dimples, each with a soft raised brow on one side.
  const eyes = Array.from({ length: 6 }, () => ({ x: signed(random) * half * 0.75, a: random() * Math.PI * 2, size: 0.32 + random() * 0.2 }));
  sculpt(skin, (x, y, z) => {
    let nz = z * (DEPTH / HEIGHT);
    let ny = y;
    const a = Math.atan2(nz, ny);
    const r = Math.hypot(ny, nz);
    let k = 1;
    for (const e of eyes) {
      const da = Math.atan2(Math.sin(a - e.a), Math.cos(a - e.a)) * r;
      const d2 = ((x - e.x) ** 2 + da * da) / (e.size * e.size);
      k -= (0.13 * e.size * Math.exp(-d2)) / Math.max(1, r);
      k += (0.06 * e.size * Math.exp(-(((x - e.x - e.size * 0.9) ** 2 + da * da) / (e.size * e.size * 1.5)))) / Math.max(1, r);
    }
    ny *= k;
    nz *= k;
    return [x, ny, nz];
  });
  flattenBase(skin, 0.25);
  bodyMap(skin);
  return finishPieces([{ role: 'skin', geometry: skin }]);
};
