import { BufferAttribute, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { flattenBase, roundBody } from './kit/round';
import { leafPiece, stemPiece } from './kit/stemLeaf';

/**
 * Strawberry (archetype: small). Spec: 3.5 cm from calyx to tip, lying on its side.
 *
 * What makes it a strawberry, not a cherry or a tomato: a heart-shaped body,
 * widest just below the shoulders and tapering to a soft, rounded point; a
 * star of thin green sepals spread over the shoulders like a little collar;
 * a short green stem. The seeds are pale flecks painted by the shader (skin:
 * seeds), never geometry.
 *
 * It is built standing up (calyx on top), where the sepals are easy to lay
 * over the shoulders, then laid down with its calyx lifted to the left
 * (toward the key light) and its tip resting on the table, like the
 * references. Small archetype: the seed gives each berry its own lean and
 * shape, so a cluster of three never looks copy-pasted.
 */

/** Real size (cm): 3.5 long, about 3 wide. */
const LENGTH = 3.5;
const WIDTH = 3.0;
/** How far down the rounded shoulder reaches, as a fraction of the way from calyx to tip. */
const SHOULDER = 0.25;
/** How the body narrows to the tip: lower keeps the belly full and the tip round. */
const TAPER = 0.55;
/** How far the calyx end lifts off the table as it lies (radians from flat). */
const TILT = 0.32;
const SEPALS = 7;

export const buildStrawberry: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Strawberry: the "${state}" form is not built yet (whole only for now).`);

  const random = seededRandom(seed);
  // A little extra length, because the calyx dimple takes some away.
  const half = LENGTH / 2 + 0.06;
  // The widest point of the profile below is about 0.93 of this radius.
  const radius = (WIDTH / 2 / 0.93) * (1 + signed(random) * 0.04);
  const taper = TAPER + signed(random) * 0.06;

  /** Radius at `t`, from 0 at the calyx (top) to 1 at the tip. */
  const profileAt = (t: number) => {
    const shoulder = Math.min(1, t / SHOULDER);
    const along = Math.min(1, t);
    // A rounded top, a full belly, then a soft taper to a rounded point (a heart, not a cone).
    return radius * Math.sqrt(1 - (1 - shoulder) ** 2) * (1 - along ** 1.5) ** taper;
  };

  // Standing up, the lathe runs from the tip (bottom) to the calyx (top).
  const berry = roundBody({
    halfLength: half,
    radius: (x) => profileAt((half - x) / (2 * half)),
    lying: false,
    lopsided: 0.55,
    random,
    poleDimple: { depth: 0.12, width: 0.45, ends: 'end' },
    flatBase: 0,
    rings: 26,
    segments: 36,
  });

  // The calyx centre: the lathe's end pole, now at the top of the dimple.
  const position = berry.getAttribute('position') as BufferAttribute;
  const top = new Vector3().fromBufferAttribute(position, position.count - 1);

  /** Height of the shoulder at a distance `d` from the axis (the sepals follow it). */
  const shoulderHeight = (d: number) => {
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * 0.6;
      if (profileAt(t) >= d) return half - t * 2 * half;
    }
    return half - 1.2 * half;
  };

  // Sepals: thin pointed leaves radiating from the centre, hugging the shoulders, tips lifting a little.
  const sepals = [];
  for (let i = 0; i < SEPALS; i++) {
    const turn = (i / SEPALS) * Math.PI * 2 + signed(random) * 0.25;
    const length = 1.1 + signed(random) * 0.2;
    const start = 0.12;
    sepals.push(
      leafPiece({
        base: top.clone().add(new Vector3(Math.cos(turn) * start, 0.03, Math.sin(turn) * start)),
        turn,
        length,
        width: 0.42,
        lift: (d) => shoulderHeight(start + d) - top.y + 0.04 + 0.25 * (d / length) ** 3,
        fold: 0.1,
        twist: signed(random) * 0.3,
        rows: 6,
        cols: 3,
      }),
    );
  }
  const calyx = mergeGeometries(sepals)!;
  for (const sepal of sepals) sepal.dispose();

  const stem = stemPiece({
    base: top.clone().add(new Vector3(0, -0.04, 0)),
    height: 0.7,
    footRadius: 0.11,
    neckRadius: 0.07,
    lean: 0.35,
    leanTurn: random() * Math.PI * 2,
    segments: 8,
  });

  // Lay it down: the top (calyx) turns to the left, lifted a little, the tip resting on the table.
  for (const geometry of [berry, calyx, stem]) geometry.rotateZ(Math.PI / 2 - TILT);
  flattenBase(berry, 0.08);

  return finishPieces([
    { role: 'berry_glow', geometry: berry },
    { role: 'calyx', geometry: calyx, doubleSided: true },
    { role: 'stem', geometry: stem },
  ]);
};
