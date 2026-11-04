import { BufferAttribute, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { flattenBase, roundBody } from './kit/round';
import { leafPiece, stemPiece } from './kit/stemLeaf';

/**
 * Strawberry (archetype: small). Spec: 3.5 cm from calyx to tip, lying on its side.
 *
 * What makes it a strawberry, not a cherry, a tomato or a red cone:
 *   - a heart-shaped body, widest just below the shoulders, tapering to a
 *     soft, rounded point,
 *   - and never perfectly round: the sides are softly lobed and uneven, one
 *     shoulder is fuller, and the tip bends a little off centre,
 *   - a ragged ruff of 8 to 10 narrow sepals over the shoulders, each its own
 *     length and width, some lying flat, some curling up and out,
 *   - a thin stem that bends up and away.
 * The seeds are pale flecks painted by the shader (skin: seeds), never geometry.
 *
 * It is built standing up (calyx on top), where the sepals are easy to lay
 * over the shoulders, then laid down with its calyx lifted to the left
 * (toward the key light) and its tip resting on the table, like the
 * references. Small archetype: the seed gives each berry its own lobes,
 * sepals and lean, so a cluster of three never looks copy-pasted.
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

  // Uneven sides: three soft lobes that drift round as they run down the berry, a slight
  // flattening on two sides, and one shoulder fuller than the other (u near 1 is the calyx end).
  const lobeTurn = random() * Math.PI * 2;
  const flatTurn = random() * Math.PI;
  const fullTurn = random() * Math.PI * 2;
  const crossSection = (u: number, angle: number) =>
    1 +
    0.07 * Math.sin(3 * angle + lobeTurn + 1.5 * u) +
    0.03 * Math.cos(2 * (angle - flatTurn)) +
    0.06 * Math.cos(angle - fullTurn) * Math.max(0, u);

  // Standing up, the lathe runs from the tip (bottom) to the calyx (top).
  const berry = roundBody({
    halfLength: half,
    radius: (x) => profileAt((half - x) / (2 * half)),
    lying: false,
    lopsided: 1,
    random,
    poleDimple: { depth: 0.12, width: 0.45, ends: 'end' },
    flatBase: 0,
    rings: 26,
    segments: 36,
    crossSection,
  });

  // The calyx centre: the lathe's end pole, now at the top of the dimple.
  const position = berry.getAttribute('position') as BufferAttribute;
  const top = new Vector3().fromBufferAttribute(position, position.count - 1);

  /**
   * Height of the shoulder at a distance `d` from the axis (the sepals follow it).
   * Past the widest point a sepal stops following the body down, so a long one
   * reaches out over the side instead of diving to the table.
   */
  const shoulderHeight = (d: number) => {
    let widest = { r: 0, t: 0 };
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * 0.6;
      const r = profileAt(t);
      if (r >= d) return half - t * 2 * half;
      if (r > widest.r) widest = { r, t };
    }
    return half - widest.t * 2 * half;
  };

  // Sepals: a ragged ruff. Each one has its own size, curl and twist.
  const count = 8 + Math.floor(random() * 3);
  const sepals = [];
  for (let i = 0; i < count; i++) {
    const turn = (i / count) * Math.PI * 2 + signed(random) * 0.35;
    const length = 0.9 + random() * 0.6;
    const curl = 0.15 + random() * 0.75;
    const start = 0.1;
    sepals.push(
      leafPiece({
        base: top.clone().add(new Vector3(Math.cos(turn) * start, 0.03, Math.sin(turn) * start)),
        turn,
        length,
        width: 0.3 + random() * 0.16,
        // Lie on the shoulder, then curl up and away toward the tip.
        lift: (d) => shoulderHeight(start + d) - top.y + 0.04 + curl * length * 0.6 * (d / length) ** 2,
        fold: 0.35,
        twist: signed(random) * 0.6,
        rows: 8,
        cols: 4,
      }),
    );
  }
  const calyx = mergeGeometries(sepals)!;
  for (const sepal of sepals) sepal.dispose();

  // A thin, wiry stem (never a fat green tube), leaning so that once the berry lies down it bends up and away.
  const stem = stemPiece({
    base: top.clone().add(new Vector3(0, -0.04, 0)),
    height: 0.8,
    footRadius: 0.07,
    neckRadius: 0.042,
    lean: 0.65,
    leanTurn: signed(random) * 0.3,
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
