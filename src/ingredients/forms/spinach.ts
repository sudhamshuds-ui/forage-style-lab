import { CatmullRomCurve3, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Drape, leafSheet, liftSheet, pointsOf, writeBack } from './kit/leafy';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { cutEnd, sweepGeometry } from './kit/sweep';

/**
 * Spinach (archetype: leafy). Round 2's sixth ingredient, the first of the leafy kit
 * (docs/ingredients/r2-plan.md), after the user's reference (Figma node 148:18, a small bunch of
 * flat-leaf spinach on long stems).
 *
 * What makes it spinach, not lettuce or basil:
 *   - spoon-shaped leaves, rounded at the tip, narrowing into a long slim stem,
 *   - a pale midrib and side veins on a deep, mottled green, a little glossy,
 *   - a small bunch: the stems gathered side by side at their cut ends, the leaves fanning out.
 *
 * How it is built, like dropping leaves on the table one by one: each leaf is a sheet from the
 * leafy kit (outline, cup, wavy edge, a curl at the tip) on a stem (a slim tube). They are laid
 * bottom first, each draped over what is already there (the kit's Drape height map), so no two
 * leaves ever pass through each other and none lies exactly at table height.
 *
 * Pieces: blade, every leaf merged into one sheet piece painted on both sides (the `spinach` skin
 * paints the veins, the mottling and the paler underside from its map); stem, every stem merged
 * (`leaf`).
 */

/** How many leaves in the bunch. */
const LEAVES = 7;
/** Leaf blade size (cm), before each leaf's own variation. */
const BLADE = { length: 9, width: 5 };
/** Stem length (cm) from the cut end to the blade, and its radius. */
const STEM = { length: 7.5, radius: 0.18 };
/** Leaf mesh density (along, across). */
const ROWS = 22;
const COLS = 12;

/**
 * A spinach leaf's outline: it widens slowly out of the stem (a long tapering base, never a
 * heart), is widest a little past the middle and ends in a round tip (never a point).
 */
function outline(u: number): number {
  const t = Math.min(1, u);
  return Math.sin(Math.PI * t ** 1.2) ** 0.75 * (0.35 + 0.65 * Math.min(1, t / 0.35));
}

export const buildSpinach: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Spinach: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x5b1a7c);

  // The stems at the front, the leaves fanning away from the camera (-Z) on a slight diagonal,
  // their tips curling up: a leaf rising away from the low card camera shows it its face, like a
  // ramp (a flat bunch lying side on, or pointing at the camera, read as a thin green sliver; the
  // steak's lesson: tilt a flat ingredient's top toward the camera).
  const main = -Math.PI / 2 + 0.35;
  const along = new Vector3(Math.cos(main), 0, Math.sin(main));
  const sideways = new Vector3(-along.z, 0, along.x);
  const start = along.clone().multiplyScalar(-(STEM.length + BLADE.length) / 2);

  // A gentle slope round each placed leaf, so the next one tilts over it instead of folding.
  const drape = new Drape({ x: -16, z: -16 }, 32, 0.15, 0.35, 0);
  const blades: BufferGeometry[] = [];
  const stems: BufferGeometry[] = [];

  // Leaves laid bottom first: the outer ones lower, the middle ones on top (a fan, like the
  // reference), each with its own size, spread and curl.
  const order = Array.from({ length: LEAVES }, (_, i) => i).sort((a, b) => Math.abs(b - (LEAVES - 1) / 2) - Math.abs(a - (LEAVES - 1) / 2));
  for (const i of order) {
    const spread = (i - (LEAVES - 1) / 2) / ((LEAVES - 1) / 2); // -1 to 1 across the fan
    // Each leaf its own: a wider fan with uneven gaps, sizes from small inner leaves to big outer
    // ones, stems of different lengths (all one size and angle read as a row of stamps).
    const turn = main + spread * 0.5 + signed(random) * 0.15;
    const direction = new Vector3(Math.cos(turn), 0, Math.sin(turn));
    const size = 0.72 + random() * 0.45;
    const stemLength = STEM.length * (0.7 + random() * 0.55);
    // The cut ends lie side by side; the stems fan out toward their leaves.
    const cut = start.clone().addScaledVector(sideways, spread * 1.1).addScaledVector(along, signed(random) * 0.4);
    const bladeBase = cut.clone().addScaledVector(direction, stemLength);
    // The blade's base rests a little up on the bundled stems (more for the middle leaves), so
    // each leaf slopes gently down to its tip and shows its face, not its edge.
    // (Only a little: raised more, the leaves hovered like stacked shelves.)
    bladeBase.y = 0.12 + 0.18 * (1 - Math.abs(spread)) * (0.7 + random() * 0.6);

    // The blade: a gentle arc along its length, the tip curling up, cupped, its edge waving.
    const arc = 0.3 + random() * 0.5;
    const curl = 0.7 + random() * 0.7;
    const blade = leafSheet({
      base: bladeBase,
      turn,
      length: BLADE.length * size,
      width: BLADE.width * size,
      outline,
      lift: (u) => arc * Math.sin(Math.PI * u) + curl * smoothstep(0.35, 1, u) ** 2,
      cup: 0.5 + random() * 0.45,
      ruffle: 0.1 + random() * 0.08,
      waves: 2.5 + random() * 1.5,
      tilt: signed(random) * 0.6,
      rows: ROWS,
      cols: COLS,
      phase: random() * Math.PI * 2,
    });
    const points = pointsOf(blade);
    liftSheet(points, ROWS, COLS, drape, 0.08);
    drape.lift(points, 0.05);
    writeBack(blade, points);

    // The stem: from its cut end along the table, rising into the blade's midrib (it runs a
    // little way into the blade, so the two always meet).
    const midrib = points[Math.floor(COLS / 2)];
    const into = midrib.clone().addScaledVector(direction, 0.6);
    // It eases up into the blade over its last third (a sharp rise read as an elbow).
    const rising = (t: number) => STEM.radius + (midrib.y - STEM.radius) * smoothstep(0.55, 1, t);
    const path = new CatmullRomCurve3([
      cut.clone().setY(STEM.radius),
      cut.clone().lerp(midrib, 0.35).setY(rising(0.35)).addScaledVector(sideways, signed(random) * 0.3),
      cut.clone().lerp(midrib, 0.7).setY(rising(0.7)),
      midrib.clone(),
      into.clone().setY(midrib.y + 0.02),
    ]).getSpacedPoints(16);
    const lifted = path.slice(0, -2);
    drape.lift(lifted, STEM.radius + 0.03);
    lifted.forEach((p, k) => path[k].copy(p));
    stems.push(
      sweepGeometry({
        points: path,
        // Slim, a little thicker at the cut end, a soft bevel where it was cut.
        radius: (t) => STEM.radius * (1.1 - 0.35 * t) * cutEnd(t, 0.03),
        rings: 24,
        segments: 8,
      }),
    );
    drape.add(path, STEM.radius * 2.5);
    drape.add(points, 0.7);
    blades.push(blade);
  }
  for (const s of stems) s.deleteAttribute('uv');

  return finishPieces([
    { role: 'blade', geometry: mergeGeometries(blades)!, doubleSided: true },
    { role: 'stem', geometry: mergeGeometries(stems)! },
  ]);
};
