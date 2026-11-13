import { Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundDrape, drapeStemmedLeaf, stemmedLeaf, stemmedLeafGeometry } from './kit/leafy';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { sweepGeometry } from './kit/sweep';

/**
 * Spinach (archetype: leafy). Round 2's sixth ingredient, the first of the leafy kit
 * (docs/ingredients/r2-plan.md).
 *
 * After the user's references (2026-11-12): a tied bunch, not separate leaves ("treat it like a
 * bunch not individual leaves"). A watercolour bunch lying on its side: the stems gathered and tied
 * with a band, the leaves bursting out of the top in every direction, each its own size, facing its
 * own way, folded and curling differently; stem and leaf one shape ("dont treat stem and leaf as a
 * seperate object"). The first try (seven flat leaves fanned on the table, all folded alike) is in
 * history.
 *
 * How it is built, like making up a bunch by hand:
 *   1. The stems run along the bunch's axis, packed round it: squeezed in at the tie, splaying a
 *      little at both ends; a few stems without a blade keep the bottom of the bundle full.
 *   2. Each stem flows into its leaf (the kit's stemmedLeaf: round stem, flattening and widening
 *      into the blade, its ridge running on as the midrib). The leaf leaves the bunch at its own
 *      angle, faces its own way, with its own fold, twist and curl.
 *   3. Leaves are laid innermost first; where one would pass through a leaf already there, its
 *      whole blade slides out as one piece and its stem eases out from the tie to meet it (the
 *      kit's round drape), and none dips into the table. Round 3 (the user, 2026-11-13: leaves
 *      "bending and folding weirdly", "stem and leaf detached", "bad obvious intersections", more
 *      leaves): pushing blades out ring by ring had bent them and kinked the stems; the bends are
 *      gentler, each stem curves out to meet its blade, and there are 27 leaves, not 18. Making
 *      the whole bunch one surface was tried and rejected (better for romaine and cabbage; its
 *      kit, kit/leafMass.ts, is kept).
 *   4. The tie: a band of two strands round the stems.
 *
 * Pieces: blade, every leaf with its stem (one shape each), merged; stem, the stems without a
 * blade; tie, the band (`chili`, a warm red-orange like the reference's).
 */

/** How many leaves round the outside, and inside. */
const OUTER = 18;
const INNER = 9;
/** Along the bunch's axis (cm): the cut ends, the tie. */
const CUT = -8;
const TIE = -4;
/** The stems' radius (cm). */
const STEM_R = 0.17;
/** The gap kept between one leaf and the next (cm). */
const CLEAR = 0.12;
/** The bundle's radius along the axis: splayed at the cut end, squeezed at the tie, opening out toward the leaves. */
function bundleRadius(s: number): number {
  return 0.8 + 0.35 * smoothstep(-5, -8, s) + 0.55 * smoothstep(-3.5, 1.5, s);
}

/** A spinach leaf's outline: a long tapering base out of the stem, widest past the middle, a round tip. */
function outline(u: number): number {
  const t = Math.min(1, u);
  return Math.sin(Math.PI * t ** 1.2) ** 0.75 * (0.35 + 0.65 * Math.min(1, t / 0.35));
}

/** The bunch lying on its side, resting on the table (the default). */
export const buildSpinach: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Spinach: the "${state}" form is not built yet (whole only for now).`);
  // Its axis along the table, the cut ends toward the front left, the leaves toward the back right.
  return buildBunch(seed, new Vector3(1, 0, -0.55).normalize(), true, true);
};

/**
 * A variation (the user, 2026-11-13: "levitating above floor upright at an angle"): the same bunch
 * standing up, tilted, stems down and leaves up, nothing resting on the table (the registry's
 * `float` lifts it off the floor). Its leaves go all the way round: none is pressed flat.
 */
export const buildSpinachFloating: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Spinach: the "${state}" form is not built yet (whole only for now).`);
  // No clearing push here: the user liked the bunch packed close, leaves straight off their stems,
  // as it came out without it (2026-11-13: "it was nice at this step").
  return buildBunch(seed, new Vector3(0.62, 1, -0.3).normalize(), false, false);
};

function buildBunch(seed: number, axis: Vector3, onTable: boolean, clearing: boolean) {
  const random = seededRandom(seed ^ 0x5b1a7c);
  // "Up" round the axis: the world's up, square to the axis.
  const up = new Vector3(0, 1, 0).addScaledVector(axis, -axis.y).normalize();
  const side = new Vector3().crossVectors(axis, up).normalize();
  // The axis sits so the stems at the cut end rest on the table.
  const origin = new Vector3(0, 0.8 + 0.35 + STEM_R, 0);
  const radial = (angle: number) => up.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle));
  const at = (s: number, angle: number, r: number) => origin.clone().addScaledVector(axis, s).addScaledVector(radial(angle), r);

  const drape = new RoundDrape(origin, axis, up, -12, 22);
  const leaves: { order: number; build: () => BufferGeometry }[] = [];

  // Each leaf: its place round the bundle, its stem, and its blade, every one its own.
  const makeLeaf = (angle: number, ring: number, inner: boolean) => {
    const cut = CUT + signed(random) * 0.5;
    const start = inner ? 1.2 + random() * 2 : -0.6 + random() * 1.8;
    // Out from the bunch at its own angle (inner leaves close to the axis).
    // Kept close to the bunch's axis (a bunch, not a flower), so neighbours overlap and fill it.
    const firstAngle = inner ? 0.08 + random() * 0.25 : 0.35 + random() * 0.45;
    const twistAt = angle + signed(random) * 0.03;
    const roll = signed(random) * 0.45;
    const size = inner ? 0.55 + random() * 0.3 : 0.8 + random() * 0.4;
    // Gentle, natural bends (the user: leaves "bending and folding weirdly", one curled right over
    // into a loop): a soft arch along the leaf and a tip that dips or lifts a little, never more.
    const arc = signed(random) * 0.35;
    const curl = -0.15 + random() * 0.55;
    const cup = 0.15 + random() * 0.45;
    const ruffle = 0.06 + random() * 0.08;
    const waves = 2 + random() * 2;
    const twist = signed(random) * 0.3;
    const phase = random() * Math.PI * 2;
    const stemRadius = STEM_R * (0.85 + random() * 0.3);

    // The whole leaf, stem and blade, leaning `outAngle` out from the bunch's axis.
    const shape = (outAngle: number) => {
      const along = axis.clone().multiplyScalar(Math.cos(outAngle)).addScaledVector(radial(angle), Math.sin(outAngle)).normalize();
      // The stem: along the bundle to the tie, then curving out so it meets its blade already
      // heading the blade's way (no elbow where stem turns into leaf). The point before the blade
      // is never pulled in past the bundle's side (a steep leaf would drag it across the axis).
      const bladeStart = at(start, twistAt, bundleRadius(start) * ring);
      const lead = Math.max(1, (start - TIE) * 0.45);
      const preS = start - lead * Math.cos(outAngle);
      const preR = Math.max(bundleRadius(preS) * ring * 0.9, bundleRadius(start) * ring - lead * Math.sin(outAngle));
      const stem = [...[cut, (cut + TIE) / 2, TIE].map((s) => at(s, twistAt, bundleRadius(s) * ring)), at(preS, twistAt, preR), bladeStart];
      return stemmedLeaf({
        stem,
        along,
        up: radial(angle).applyAxisAngle(along, roll),
        length: 9 * size,
        width: 5.2 * size,
        outline,
        lift: (u) => arc * Math.sin(Math.PI * u) + curl * smoothstep(0.4, 1, u) ** 2,
        // Cupped upward a little (the way a spinach leaf holds itself), never folded shut or inside out.
        cup,
        ruffle,
        waves,
        twist,
        phase,
        stemRadius,
        stemRings: 14,
        bladeRings: 20,
        around: 12,
      });
    };
    leaves.push({
      // Laid innermost first, then outward by how far each leaf leans out.
      order: (inner ? 0 : 1) + firstAngle,
      build: () => {
        // Where it would pass through a leaf already laid, the whole blade slides out as one piece
        // and the stem eases out from the tie to meet it (kit: drapeStemmedLeaf, rigid). Pushing
        // the blade out ring by ring bent it oddly and kinked the stem (the user, 2026-11-13: "stem
        // and leaf detached"); leaning whole leaves further out splayed the bunch into a broom.
        const leaf = shape(firstAngle);
        if (clearing) drapeStemmedLeaf(leaf, drape, CLEAR, onTable ? 0.08 : -Infinity);
        return stemmedLeafGeometry(leaf);
      },
    });
  };

  // Round the outside, spread evenly with a little jitter (none straight down: those would only
  // press flat into the table), and a few inside.
  // In the air there is no table to press into: leaves all the way round.
  const span = onTable ? 5.2 : 2 * Math.PI;
  for (let i = 0; i < OUTER; i++) {
    const angle = -span / 2 + (span * (i + 0.5)) / OUTER + signed(random) * 0.12;
    makeLeaf(angle, 1, false);
  }
  for (let i = 0; i < INNER; i++) makeLeaf((2 * Math.PI * i) / INNER + random() * 0.5, 0.45, true);
  // Stems without a blade along the bottom of the bundle, so it reads full from below and the side.
  const fillers: BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const angle = Math.PI - 0.45 + 0.45 * i + signed(random) * 0.05;
    const cut = CUT + signed(random) * 0.5;
    const end = -0.5 + random();
    const path = [cut, (cut + TIE) / 2, TIE, (TIE + end) / 2, end].map((s) => at(s, angle, bundleRadius(s)));
    fillers.push(sweepGeometry({ points: path, radius: (t) => STEM_R * Math.sqrt(Math.min(1, t / 0.03)) * Math.sqrt(Math.min(1, (1 - t) / 0.08)), rings: 18, segments: 8 }));
  }

  const blades = leaves.sort((a, b) => a.order - b.order).map((l) => l.build());

  // The tie: two strands round the stems at the tie.
  const ties: BufferGeometry[] = [];
  for (const offset of [-0.22, 0.22]) {
    const r = bundleRadius(TIE) + STEM_R * 2 + 0.1;
    const loop = Array.from({ length: 25 }, (_, k) => at(TIE + offset, (2 * Math.PI * k) / 24, r));
    ties.push(sweepGeometry({ points: loop, radius: () => 0.12, rings: 48, segments: 8 }));
  }
  for (const g of [...fillers, ...ties]) g.deleteAttribute('uv');

  return finishPieces([
    { role: 'blade', geometry: mergeGeometries(blades)! },
    { role: 'stem', geometry: mergeGeometries(fillers)! },
    { role: 'tie', geometry: mergeGeometries(ties)! },
  ]);
};
