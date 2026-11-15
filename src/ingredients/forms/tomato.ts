import { Vector3, type BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bodyMap, sculpt } from './kit/maps';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';
import { calyxPiece, leafPiece } from './kit/stemLeaf';
import { cutEnd, sweepGeometry } from './kit/sweep';
import { smoothstep } from './kit/lathe';

/**
 * Tomato (archetype: round). Round 3, batch 1, after the user's references (Figma node 184:349:
 * watercolour and oil tomatoes): one ripe tomato, its green calyx on.
 *
 * What makes it a tomato, not an apple or a ball:
 *   - squat, wider than tall, with full round shoulders and a soft, slightly flat top,
 *   - a few very soft ribs running down from the stem (never a pumpkin),
 *   - a green calyx: five long, slim sepals that arch up and curl back, and a thick stub of stem.
 *
 * Pieces: skin_glow (the hero, the `tomato` skin), calyx (five sepals, the leaf skin) and stem.
 */
const WIDTH = 7.6;
const HEIGHT = 6.7;

export const buildTomato: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Tomato: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x70a70);
  const radius = WIDTH / 2;
  const half = HEIGHT / 2 + 0.3;
  const ribTurn = random() * Math.PI * 2;
  const skin = roundBody({
    halfLength: half,
    // Fuller than an ellipse: round shoulders, a broad base.
    radius: (x) => radius * (1 - Math.min(1, Math.abs(x) / half) ** 2.3) ** (1 / 2.3) * (1 + 0.035 * (x / half)),
    lying: false,
    lopsided: 0.5,
    random,
    poleDimple: { depth: 0.62, width: 1.3, ends: 'end' },
    flatBase: 0.2,
    rings: 44,
    segments: 60,
  });
  // Soft ribs from the stem, fading out by the middle (about 3%: more reads as a pumpkin).
  sculpt(skin, (x, y, z) => {
    // (The recipe builds the body round its middle: measure the height from its foot.)
    const up = smoothstep(HEIGHT * 0.35, HEIGHT, y + half);
    const k = 1 + 0.042 * up * Math.cos(5 * Math.atan2(z, x) + ribTurn) + 0.02 * Math.cos(3 * Math.atan2(z, x) + ribTurn * 2) + 0.012 * Math.cos(2 * Math.atan2(z, x) + ribTurn * 3);
    return [x * k, y, z * k];
  });
  const position = skin.getAttribute('position') as BufferAttribute;
  const top = new Vector3().fromBufferAttribute(position, position.count - 1);
  bodyMap(skin);

  // The calyx, after the references (the user, 2026-11-15: "the leaves can get more detail and
  // form similar to ref"): a small green star lying in the dip, and from it five long, slim
  // sepals, each its own length: they arch up off the shoulder, run out, and curl at the tip
  // (some up, some back down), twisting a little. Then a thick, knuckled stub of stem.
  const turn0 = random() * Math.PI * 2;
  const star = calyxPiece({ base: top.clone().add(new Vector3(0, 0.02, 0)), radius: 0.95, height: 0.2, points: 5, turn: turn0 });
  const sepals = Array.from({ length: 5 }, (_, i) => {
    const turn = turn0 + (i * Math.PI * 2) / 5 + signed(random) * 0.22;
    const length = 2.5 + random() * 1.3;
    const arch = 0.75 + random() * 0.4;
    const curlUp = random() < 0.45;
    return leafPiece({
      base: top.clone().add(new Vector3(Math.cos(turn) * 0.3, 0.1, Math.sin(turn) * 0.3)),
      turn,
      length,
      width: 0.5 + random() * 0.16,
      // Up out of the dip, over the shoulder, then the tip curls up or tucks down.
      lift: (d) => {
        const t = d / length;
        return arch * Math.sin(Math.PI * Math.min(1, t * 1.25)) * 0.8 - 0.55 * t * t * length * 0.22 + (curlUp ? 0.9 : -0.35) * Math.max(0, t - 0.68) ** 2 * length;
      },
      fold: 0.55,
      twist: signed(random) * 1.1,
      rows: 20,
      cols: 4,
    });
  });
  // The stem: thick where it leaves the star, a knuckle, a cut top, leaning.
  const leanTurn = random() * Math.PI * 2;
  const lean = new Vector3(Math.cos(leanTurn), 0, Math.sin(leanTurn));
  const stem = sweepGeometry({
    points: [top.clone().add(new Vector3(0, -0.05, 0)), top.clone().add(new Vector3(0, 0.55, 0)).addScaledVector(lean, 0.08), top.clone().add(new Vector3(0, 1.1, 0)).addScaledVector(lean, 0.3), top.clone().add(new Vector3(0, 1.55, 0)).addScaledVector(lean, 0.62)],
    radius: (t) => (0.3 - 0.1 * t + 0.07 * Math.exp(-(((t - 0.55) / 0.12) ** 2))) * cutEnd(1 - t, 0.12) * Math.sqrt(Math.min(1, t / 0.05)),
    rings: 18,
    segments: 12,
  });

  return finishPieces([
    { role: 'skin_glow', geometry: skin },
    { role: 'calyx', geometry: mergeGeometries(sepals)!, doubleSided: true },
    { role: 'star', geometry: star },
    { role: 'stem', geometry: stem },
  ]);
};
