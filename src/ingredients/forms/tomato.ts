import { Vector3, type BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bodyMap, sculpt } from './kit/maps';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';
import { leafPiece, stemPiece } from './kit/stemLeaf';
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
const HEIGHT = 6.3;

export const buildTomato: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Tomato: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x70a70);
  const radius = WIDTH / 2;
  const half = HEIGHT / 2 + 0.3;
  const ribTurn = random() * Math.PI * 2;
  const skin = roundBody({
    halfLength: half,
    // Fuller than an ellipse: round shoulders, a broad base.
    radius: (x) => radius * (1 - Math.min(1, Math.abs(x) / half) ** 2.5) ** (1 / 2.5),
    lying: false,
    lopsided: 0.5,
    random,
    poleDimple: { depth: 0.5, width: 1.25, ends: 'end' },
    flatBase: 0.2,
    rings: 44,
    segments: 60,
  });
  // Soft ribs from the stem, fading out by the middle (about 3%: more reads as a pumpkin).
  sculpt(skin, (x, y, z) => {
    const up = smoothstep(HEIGHT * 0.35, HEIGHT, y);
    const k = 1 + 0.03 * up * Math.cos(5 * Math.atan2(z, x) + ribTurn) + 0.012 * Math.cos(3 * Math.atan2(z, x) + ribTurn * 2);
    return [x * k, y, z * k];
  });
  const position = skin.getAttribute('position') as BufferAttribute;
  const top = new Vector3().fromBufferAttribute(position, position.count - 1);
  bodyMap(skin);

  // The calyx: five long sepals, each its own length and curl, arching up then back down.
  const turn0 = random() * Math.PI * 2;
  const sepals = Array.from({ length: 5 }, (_, i) => {
    const turn = turn0 + (i * Math.PI * 2) / 5 + signed(random) * 0.25;
    const length = 2.0 + random() * 0.9;
    const rise = 0.5 + random() * 0.35;
    const curl = 0.2 + random() * 0.14;
    return leafPiece({
      base: top.clone().add(new Vector3(Math.cos(turn) * 0.12, 0.08, Math.sin(turn) * 0.12)),
      turn,
      length,
      width: 0.62 + random() * 0.2,
      lift: (d) => rise * d - curl * d * d,
      fold: 0.35,
      twist: signed(random) * 0.6,
      rows: 12,
      cols: 4,
    });
  });
  const stem = stemPiece({
    base: top.clone().add(new Vector3(0, -0.02, 0)),
    height: 1.25,
    footRadius: 0.34,
    neckRadius: 0.2,
    lean: 0.3,
    leanTurn: random() * Math.PI * 2,
  });

  return finishPieces([
    { role: 'skin_glow', geometry: skin },
    { role: 'calyx', geometry: mergeGeometries(sepals)!, doubleSided: true },
    { role: 'stem', geometry: stem },
  ]);
};
