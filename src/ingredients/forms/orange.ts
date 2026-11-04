import { BufferAttribute, Vector3 } from 'three';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';
import { calyxPiece, leafPiece, stemPiece } from './kit/stemLeaf';

/**
 * Orange (archetype: round). Spec: 8 cm wide, standing up, small stem and leaf.
 *
 * What makes it an orange, not an apple or a ball: an almost-round body,
 * just a little squashed (wider than tall) with full, soft shoulders; a
 * shallow dimple at the top holding a small green star (the calyx) with a
 * short, thin stem, and a smaller dimple underneath (the navel). One leaf
 * grows from the stem and arcs out to
 * the left, toward the key light, so it breaks the round outline: that is
 * what makes the silhouette read as an orange rather than a ball.
 *
 * The peel's pores are the shader's job, never geometry.
 */

/** Real size (cm), from the spec: 8 cm wide, a touch shorter than wide. */
const WIDTH = 8;
const HEIGHT = 7.5;
/** 2 is a plain ellipse; a little more gives the fuller shoulders of an orange. */
const FULLNESS = 2.3;

export const buildOrange: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Orange: the "${state}" form is not built yet (whole only for now).`);

  const random = seededRandom(seed);
  const radius = WIDTH / 2;
  // A little extra height, because the two dimples and the flat base take some away.
  const half = HEIGHT / 2 + 0.28;
  // The profile: a slightly squared-off half-ellipse, `half` tall and `radius` wide.
  const profile = (x: number) => {
    const t = Math.min(1, Math.abs(x) / half);
    return radius * (1 - t ** FULLNESS) ** (1 / FULLNESS);
  };

  const peel = roundBody({
    halfLength: half,
    radius: profile,
    lying: false,
    lopsided: 0.35,
    random,
    poleDimple: { depth: 0.32, width: 1.0 },
    flatBase: 0.15,
    rings: 40,
    segments: 52,
  });

  // The top of the dimple is the last point the lathe made (its end pole, now pointing up).
  const position = peel.getAttribute('position') as BufferAttribute;
  const top = new Vector3().fromBufferAttribute(position, position.count - 1);

  // The calyx lies in the dimple, half sunk into the peel.
  const calyx = calyxPiece({ base: top.clone(), radius: 0.62, height: 0.16, points: 5, turn: random() * Math.PI });

  // A short, thin stem: barely wider at the foot, like a snipped twig.
  const stemHeight = 0.5;
  const stem = stemPiece({
    base: top.clone().add(new Vector3(0, -0.04, 0)),
    height: stemHeight,
    footRadius: 0.17,
    neckRadius: 0.12,
    lean: 0.12,
    leanTurn: random() * Math.PI * 2,
  });

  // The leaf grows out of the stem's side near its top, then rises and arcs over.
  const leafTurn = Math.PI * 0.85 + signed(random) * 0.12;
  const leaf = leafPiece({
    base: top.clone().add(new Vector3(Math.cos(leafTurn) * 0.06, stemHeight * 0.7, Math.sin(leafTurn) * 0.06)),
    turn: leafTurn,
    length: 3.2,
    width: 1.6,
    lift: (d) => 0.6 * d - 0.1 * d * d,
    fold: 0.3,
    twist: 0.35,
  });

  return finishPieces([
    { role: 'peel', geometry: peel },
    { role: 'calyx', geometry: calyx },
    { role: 'stem', geometry: stem },
    { role: 'leaf', geometry: leaf, doubleSided: true },
  ]);
};
