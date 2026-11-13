import { Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Drape, settleStemmedLeaf, stemmedLeaf, stemmedLeafGeometry } from './kit/leafy';
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
 *   3. Round 5 (the user's notes on round 4, 2026-11-13: leaves bending upward, not folding over
 *      or round each other, too little folding, all alike): each blade leaves its stem almost
 *      level and sags under its own weight; laid lowest first, it settles like cloth onto the
 *      table, the stems and the leaves already there (the kit's settleStemmedLeaf on a Drape
 *      height map), folding over and round them. Four outlines, a wide size range, mixed folds.
 *   4. The tie: a band of two strands round the stems.
 *
 * Pieces: blade, every leaf with its stem (one shape each), merged; stem, the stems without a
 * blade; tie, the band (`chili`, a warm red-orange like the reference's).
 */

/** How many leaves round the outside, and inside. */
const OUTER = 11;
const INNER = 3;
const BOTTOM = 5;
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

/** The bunch lying on its side, resting on the table (the default). */
export const buildSpinach: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Spinach: the "${state}" form is not built yet (whole only for now).`);
  // Its axis along the table, the cut ends toward the front left, the leaves toward the back right.
  return buildBunch(seed, new Vector3(1, 0, -0.55).normalize(), true);
};

/** Leaf outlines (half-width at u, 0 at the stem to 1 at the tip): every leaf one of these. */
const OUTLINES: { shape: (u: number) => number; width: number }[] = [
  // Spade: broad low down, tapering to a soft point.
  { shape: (u) => Math.sin(Math.PI * Math.min(1, u) ** 1.25) ** 0.7 * (0.3 + 0.7 * Math.min(1, u / 0.3)), width: 0.6 },
  // Spoon: an even oval, round at the tip.
  { shape: (u) => Math.sin(Math.PI * Math.min(1, u)) ** 0.55 * (0.4 + 0.6 * Math.min(1, u / 0.25)), width: 0.66 },
  // Long and narrow (a young leaf).
  { shape: (u) => Math.sin(Math.PI * Math.min(1, u) ** 1.1) ** 0.9, width: 0.4 },
  // Arrow: two small lobes near the stem (flat-leaf spinach often has them).
  {
    shape: (u) => Math.sin(Math.PI * Math.min(1, u) ** 1.25) ** 0.7 * (0.3 + 0.7 * Math.min(1, u / 0.3)) + 0.28 * Math.exp(-(((u - 0.13) / 0.06) ** 2)),
    width: 0.58,
  },
];

function buildBunch(seed: number, axis: Vector3, onTable: boolean) {
  const random = seededRandom(seed ^ 0x5b1a7c);
  // "Up" round the axis: the world's up, square to the axis.
  const up = new Vector3(0, 1, 0).addScaledVector(axis, -axis.y).normalize();
  const side = new Vector3().crossVectors(axis, up).normalize();
  // The axis sits so the stems at the cut end rest on the table.
  // The bundle's axis sits so its bottom stems rest on the table at the band.
  const origin = new Vector3(0, bundleRadius(TIE) + STEM_R, 0);
  const radial = (angle: number) => up.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle));
  // A point in the bundle, never below a stem resting on the table (the user, 2026-11-13: the
  // bunch looked like it was levitating, its cut ends in the air).
  const at = (s: number, angle: number, r: number) => {
    const p = origin.clone().addScaledVector(axis, s).addScaledVector(radial(angle), r);
    if (onTable) p.y = Math.max(p.y, STEM_R + 0.02);
    return p;
  };

  // Everything already on the table, as a height map: the stems first, then each leaf as it lands.
  const drape = new Drape({ x: -16, z: -16 }, 32, 0.15, 0.9, onTable ? 0 : -100);

  // Each leaf: where it leaves the bundle, its stem, and a blade that is every way its own (the
  // user, 2026-11-13: "all the leaves look the same, same shape, same size, same cut, same folds
  // same wrinkles"). Its blade leaves the stem almost level and sags under its own weight down to
  // the table, never up ("in reality no leaves can bend upward like that").
  const makeLeaf = (angle: number, ring: number, id: number, flare?: number) => {
    const cut = CUT + signed(random) * 0.6;
    const start = flare !== undefined ? -2.6 + random() * 0.8 : (ring < 1 ? 0 : -2.6) + random() * (ring < 1 ? 3.5 : 6.5);
    const bladeStart = at(start, angle, bundleRadius(start) * ring);
    // Heading, seen from above (the user's drawn outlines, 2026-11-13): the leaves start just past
    // the band and widen out from it in a soft V, tips staggered; long and low from the side.
    const heading = flare ?? Math.sin(angle) * 0.5 + signed(random) * 0.15;
    const along = axis.clone().multiplyScalar(Math.cos(heading)).addScaledVector(side, Math.sin(heading));
    along.y = 0;
    along.normalize();
    const outline = OUTLINES[Math.floor(random() * OUTLINES.length)];
    // Young inner leaves small, outer ones big, a wide spread.
    const size = flare !== undefined ? 0.45 + random() * 0.15 : ring < 1 ? 0.5 + random() * 0.35 : 0.7 + random() * 0.6;
    const length = 9 * size;
    const width = length * (outline.width * 0.85 + signed(random) * 0.06);
    // Its fall: level out of the stem (the user: too much piled up on top), then a sag that would take its tip below
    // the table; settling brings it to rest on the table or on the leaves below.
    const pitch = 0;
    // (Long and low, tapering to a point, after the user's sketch: the blades drop early.)
    const drop = bladeStart.y + 1.6 + random() * 1.2;
    const sag = 1 + random() * 0.5;
    // A few leaves get a crease across, where the blade bent over something.
    const crease = random() < 0.35 ? -(0.2 + random() * 0.25) : 0;
    const creaseAt = 0.35 + random() * 0.35;
    // Its fold: most cupped, some folded along the midrib (half closed), some with an edge rolled.
    const fold = random();
    // In a closed bunch many are folded along the midrib.
    const cup = fold < 0.4 ? 0.9 + random() * 0.9 : 0.15 + random() * 0.5;
    const edgeRoll = fold > 0.8 ? signed(random) * (0.5 + random() * 0.7) : 0;
    const leaf = stemmedLeaf({
      // Straight on from the band into the blade (a point back along the blade made the top
      // stems bend oddly just before their leaves, the user 2026-11-13).
      stem: [...[cut, (cut + TIE) / 2, TIE].map((s) => at(s, angle, bundleRadius(s) * ring)), bladeStart],
      along,
      up: new Vector3(0, 1, 0),
      length,
      width,
      outline: outline.shape,
      lift: (u) => pitch * length * u - (pitch * length + drop) * u ** sag + crease * Math.exp(-(((u - creaseAt) / 0.14) ** 2)),
      cup,
      edgeRoll,
      ruffle: 0.05 + random() * 0.15,
      waves: 2 + random() * 3,
      twist: signed(random) * 0.5,
      phase: random() * Math.PI * 2,
      stemRadius: STEM_R * (0.8 + random() * 0.4),
      stemRings: 14,
      bladeRings: 20,
      around: 12,
    });
    return { leaf, id, height: bladeStart.y + (ring < 1 ? -0.5 : 0), weight: length * width * Math.sin(heading) };
  };

  // Round the top and sides of the bundle (none underneath: those would only press flat into the
  // table), and a few young ones inside.
  const all: ReturnType<typeof makeLeaf>[] = [];
  const span = onTable ? 3.2 : 2 * Math.PI;
  for (let i = 0; i < OUTER; i++) all.push(makeLeaf(-span / 2 + (span * (i + 0.5)) / OUTER + signed(random) * 0.15, 1, random()));
  for (let i = 0; i < INNER; i++) all.push(makeLeaf(signed(random) * 1.6, 0.5, random()));
  // The stems round the bottom have leaves too, lying on the table first (the user, 2026-11-13: "the
  // bottom stems here dont have leaves").
  for (let i = 0; i < BOTTOM; i++) all.push(makeLeaf(Math.PI - 1.1 + (2.2 * (i + 0.5)) / BOTTOM + signed(random) * 0.1, 0.9, random()));

  // Balanced seen from above (the user: "looks heavy on the right side with top shot"): if one
  // side carries more leaf, one more leaf goes out on the other.
  const lean = all.reduce((sum, l) => sum + l.weight, 0);
  if (Math.abs(lean) > 2) all.push(makeLeaf(-Math.sign(lean) * (1.1 + random() * 0.3), 1, random()));

  // The stems go on the map first; then the leaves land lowest first, each settling onto the ones
  // before (the user: leaves should "fold on top of eachother or around eachother").
  for (const { leaf } of all) for (let k = 0; k < leaf.bladeStart; k++) drape.add(leaf.rings[k], 0.3);
  const blades = all
    .sort((a, b) => a.height - b.height)
    .map(({ leaf, id }) => {
      settleStemmedLeaf(leaf, drape, CLEAR, 8);
      return stemmedLeafGeometry(leaf, id);
    });

  // Stems without a blade along the bottom of the bundle, so it reads full from below and the side.
  const fillers: BufferGeometry[] = [];
  // (Only inside the bundle now, ending just past the band, hidden: the bottom stems carry leaves.)
  for (let i = 0; i < 3; i++) {
    const angle = signed(random) * Math.PI;
    const cut = CUT + signed(random) * 0.5;
    const end = TIE + 0.6 + random() * 0.6;
    const path = [cut, (cut + TIE) / 2, TIE, (TIE + end) / 2, end].map((s) => at(s, angle, bundleRadius(s) * 0.45));
    fillers.push(sweepGeometry({ points: path, radius: (t) => STEM_R * Math.sqrt(Math.min(1, t / 0.03)) * Math.sqrt(Math.min(1, (1 - t) / 0.08)), rings: 18, segments: 8 }));
  }

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
}
