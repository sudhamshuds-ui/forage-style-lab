import { BufferAttribute, Vector3 } from 'three';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';
import { leafPiece, stemPiece } from './kit/stemLeaf';

/**
 * Orange (archetype: round). Spec: 8 cm wide, standing up, small stem and leaf.
 *
 * What makes it an orange, not an apple or a ball: an almost-round body,
 * just a little squashed (wider than tall) with full, soft shoulders; a
 * shallow dimple at the top where a small green stem sits, and a smaller
 * one underneath (the navel). One leaf rises from the stem and arcs out to
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

  const stem = stemPiece({
    base: top.clone().add(new Vector3(0, -0.12, 0)),
    height: 0.55,
    footRadius: 0.45,
    neckRadius: 0.2,
    lean: 0.2 + random() * 0.15,
    leanTurn: random() * Math.PI * 2,
  });

  // The leaf rises from the stem, then arcs over: up to about 1 cm above the stem's foot.
  const leafTurn = Math.PI * 0.85 + signed(random) * 0.12;
  const leaf = leafPiece({
    base: top.clone().add(new Vector3(Math.cos(leafTurn) * 0.25, 0.3, Math.sin(leafTurn) * 0.25)),
    turn: leafTurn,
    length: 3.2,
    width: 1.6,
    lift: (d) => 0.6 * d - 0.1 * d * d,
    fold: 0.3,
    twist: 0.35,
  });

  return finishPieces([
    { role: 'peel', geometry: peel },
    { role: 'stem', geometry: stem },
    { role: 'leaf', geometry: leaf, doubleSided: true },
  ]);
};
