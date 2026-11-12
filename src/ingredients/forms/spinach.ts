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
 *   3. Leaves are laid innermost first; each is pushed out to clear those already there (the kit's
 *      round drape), so none passes through another, and none dips into the table.
 *   4. The tie: a band of two strands round the stems.
 *
 * Pieces: blade, every leaf with its stem (one shape each), merged; stem, the stems without a
 * blade; tie, the band (`chili`, a warm red-orange like the reference's).
 */

/** How many leaves round the outside, and inside. */
const OUTER = 13;
const INNER = 5;
/** Along the bunch's axis (cm): the cut ends, the tie. */
const CUT = -8;
const TIE = -4;
/** The stems' radius (cm). */
const STEM_R = 0.17;
/** The bundle's radius along the axis: splayed at the cut end, squeezed at the tie, opening out toward the leaves. */
function bundleRadius(s: number): number {
  return 0.8 + 0.35 * smoothstep(-5, -8, s) + 0.55 * smoothstep(-3.5, 1.5, s);
}

/** A spinach leaf's outline: a long tapering base out of the stem, widest past the middle, a round tip. */
function outline(u: number): number {
  const t = Math.min(1, u);
  return Math.sin(Math.PI * t ** 1.2) ** 0.75 * (0.35 + 0.65 * Math.min(1, t / 0.35));
}

export const buildSpinach: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Spinach: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x5b1a7c);

  // The bunch lies on its side: its axis along the table, the cut ends toward the front left, the
  // leaves toward the back right.
  const axis = new Vector3(1, 0, -0.55).normalize();
  const up = new Vector3(0, 1, 0);
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
    const stem = [cut, (cut + TIE) / 2, TIE, (TIE + start) / 2, start].map((s) => at(s, angle + signed(random) * 0.03, bundleRadius(s) * ring));
    // Out from the bunch at its own angle (inner leaves close to the axis), facing outward and then
    // rolled its own way; its own fold (up, flat or down), twist and curl (forward or back).
    const outAngle = inner ? 0.1 + random() * 0.35 : 0.45 + random() * 0.7;
    const along = axis.clone().multiplyScalar(Math.cos(outAngle)).addScaledVector(radial(angle), Math.sin(outAngle)).normalize();
    const roll = signed(random) * 0.8;
    const face = radial(angle).applyAxisAngle(along, roll);
    const size = inner ? 0.55 + random() * 0.3 : 0.8 + random() * 0.4;
    const arc = signed(random) * 0.9;
    const curl = signed(random) * 1.2;
    const leaf = stemmedLeaf({
      stem,
      along,
      up: face,
      length: 9 * size,
      width: 5.2 * size,
      outline,
      lift: (u) => arc * Math.sin(Math.PI * u) + curl * smoothstep(0.4, 1, u) ** 2,
      cup: -0.4 + random() * 1.3,
      ruffle: 0.08 + random() * 0.12,
      waves: 2 + random() * 2,
      twist: signed(random) * 0.7,
      phase: random() * Math.PI * 2,
      stemRadius: STEM_R * (0.85 + random() * 0.3),
      stemRings: 14,
      bladeRings: 22,
      around: 14,
    });
    leaves.push({
      // Laid innermost first, then outward by how far each leaf leans out.
      order: (inner ? 0 : 1) + outAngle,
      build: () => {
        drapeStemmedLeaf(leaf, drape, 0.12, 0.08);
        return stemmedLeafGeometry(leaf);
      },
    });
  };

  // Round the outside, spread evenly with a little jitter (none straight down: those would only
  // press flat into the table), and a few inside.
  for (let i = 0; i < OUTER; i++) {
    const angle = -2.6 + (5.2 * (i + 0.5)) / OUTER + signed(random) * 0.12;
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
