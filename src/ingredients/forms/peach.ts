import { Vector3, type BufferAttribute } from 'three';
import { bodyMap, sculpt } from './kit/maps';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';
import { leafPiece, stemPiece } from './kit/stemLeaf';

/**
 * Peach (archetype: round). Round 3, batch 1, after the user's references (Figma node 184:349:
 * two oil paintings of whole peaches with their leaves): a pair of whole peaches (the cluster
 * layout arranges two seeded variants), each with a leaf.
 *
 * What makes it a peach: round and a little heart-shaped, a deep dip at the stem, and the seam: a
 * soft crease running from the stem down one side, with a fuller cheek each side of it. Velvet
 * skin, never glossy (the `peach` skin: gold to rose blush, a pale bloom at the outline).
 *
 * Pieces: skin_glow (the hero), stem (a woody nub) and leaf.
 */
const WIDTH = 7.1;
const HEIGHT = 6.7;

/**
 * The peach's body alone, standing, built round its middle, with its map (dishes cut it).
 * `smooth`: no cleft, no cheeks and only a shallow stem dip, for slices (cut through, the cleft
 * and the dip showed as bumps in every wedge: the user, 2026-11-19).
 */
export function peachBody(random: () => number, smooth = false) {
  const radius = WIDTH / 2;
  const half = HEIGHT / 2 + 0.28;
  const skin = roundBody({
    halfLength: half,
    radius: (x) => radius * (1 - Math.min(1, Math.abs(x) / half) ** 2.15) ** (1 / 2.15),
    lying: false,
    lopsided: 0.6,
    random,
    poleDimple: { depth: smooth ? 0.1 : 0.55, width: 1.0, ends: 'end' },
    flatBase: 0.2,
    rings: 44,
    segments: 60,
  });
  // The seam (at angle 0 round the fruit, toward +x): a soft crease from the stem down the side,
  // fading out near the foot, with a fuller cheek each side of it.
  if (!smooth) sculpt(skin, (x, y, z) => {
    // The peach's signature (the user, 2026-11-15: "missing their iconic peach bump"): a clear
    // cleft from the stem right down the side to the tip, deepest at the shoulder, with a full,
    // rounded cheek bulging each side of it, one a little fuller than the other.
    const a = Math.atan2(z, x);
    // (The recipe builds the body round its middle: measure the height from its foot.)
    const h = (y + half) / (2 * half);
    const along = smoothstep(0.02, 0.3, h) * (0.55 + 0.45 * smoothstep(0.35, 0.95, h));
    const crease = Math.exp(-((a / 0.17) ** 2));
    const cheekA = Math.exp(-(((a - 0.5) / 0.42) ** 2));
    const cheekB = Math.exp(-(((a + 0.5) / 0.42) ** 2));
    const k = 1 - 0.17 * crease * along + (0.075 * cheekA + 0.055 * cheekB) * along;
    // The cleft runs on into the dip at the stem, and ends in a small soft point underneath.
    const dip = 0.25 * crease * smoothstep(0.75, 1, h);
    const tip = 0.12 * Math.exp(-((Math.hypot(x, z) / 0.9) ** 2)) * (1 - smoothstep(0, 0.2, h));
    return [x * k, y - dip - tip * 0, z * k];
  });
  const position = skin.getAttribute('position') as BufferAttribute;
  const top = new Vector3().fromBufferAttribute(position, position.count - 1);
  bodyMap(skin);
  return { skin, top, half };
}

export const buildPeach: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Peach: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x9eac4);
  const { skin, top } = peachBody(random);

  const stem = stemPiece({ base: top.clone().add(new Vector3(0, -0.05, 0)), height: 0.5, footRadius: 0.22, neckRadius: 0.15, lean: 0.25, leanTurn: random() * Math.PI * 2, segments: 10 });
  // One long, slim leaf from the stem, arching out over the shoulder and down.
  const turn = Math.PI * (0.55 + random() * 0.9);
  const leaf = leafPiece({
    base: top.clone().add(new Vector3(Math.cos(turn) * 0.1, 0.3, Math.sin(turn) * 0.1)),
    turn,
    length: 5.6 + random() * 1.2,
    width: 1.7 + random() * 0.3,
    lift: (d) => 0.5 * d - 0.13 * d * d,
    fold: 0.3,
    twist: signed(random) * 0.5,
    rows: 18,
  });

  return finishPieces([
    { role: 'skin_glow', geometry: skin },
    { role: 'stem', geometry: stem },
    { role: 'leaf', geometry: leaf, doubleSided: true },
  ]);
};
