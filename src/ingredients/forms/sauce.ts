import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { smoothMax, smoothstep, ellipse } from './kit/lathe';
import { finishPieces, type FormBuilder, type FormPiece } from './kit/piece';
import { flatEnds, revolve, revolvedPoint, ribs, roundedSquare, wrapSheet } from './kit/vessel';

/**
 * Sauce (archetype: contained). Spec: 6.5 x 13.2 x 6.5 cm, standing up.
 * After the user's reference (Figma, "sauce ref"): a squat hot sauce bottle.
 *
 * What makes it this bottle, not a jar or a ketchup bottle:
 *   - a squat body with a soft square cross-section (a flat face for the label)
 *     that flares out toward its base, so the silhouette reads as a soft
 *     triangle, with rounded shoulders running into a short neck,
 *   - a big, tall screw cap with vertical ridges, narrower at the bottom
 *     (by the collar) and wider at the top,
 *   - a collar ring where the cap meets the neck,
 *   - a thick glass base under the dark sauce,
 *   - a printed hot sauce label wrapped all the way round (`WITH_PRINTED_LABEL`): bold
 *     hand-lettered words, a flame, a chili and doodled borders, painted by the shader,
 *   - (switched off, the user 2026-11-05: `WITH_LABEL`) the earlier layered label,
 *     like a little poster: a red wrap round the front, a band at the top with two
 *     gold marks, a cream panel in a gold frame, a small red seal and a few dark
 *     brush marks (abstract, never real lettering).
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   sauce_glow  the bottle full of sauce (the glow name lets light through at thin edges)
 *   glass       the thick glass base
 *   collar      the ring under the cap
 *   cap         the ridged screw cap
 *   wrap        the label's red wrap round the front and a little round the sides
 *   frame       the gold frame round the panel, and the two gold marks on the top band
 *   label       the printed label, wrapped round the body (its artwork is a shader texture)
 *   panel       the cream paper panel (old layered label, off)
 *   seal        the small red seal on the panel
 *   marks       a few dark brush marks on the panel, like hand lettering
 * The label's layers are open sheets (painted both sides), each a hair above the one below.
 * Gloss, the see-through glass look and any lettering are the shader's job, never geometry.
 */

/** Half the body's width across its flat faces (cm): 6.5 cm wide. */
const BODY = 3.25;
/**
 * The label is switched off (the user, 2026-11-05: a plain bottle). Its code stays, so it
 * can come back by setting this to true.
 */
const WITH_LABEL = false;
/** The printed hot sauce label (on): wrapped round the body, artwork painted by the shader. */
const WITH_PRINTED_LABEL = true;
/** Where the printed label sits on the body (cm), on the straight part below the shoulders. */
const LABEL_BOTTOM = 1.45;
const LABEL_TOP = 7.15;
/** How much taller the bottle is than the first version (cm): everything above the base moves up. */
const LONGER = 1.2;
/** The body block: from the table to where the shoulders end. */
const BODY_TOP = 7.4 + LONGER;
/** How much narrower the body is at the shoulders than at the base (the soft triangle). */
const BODY_TAPER = 0.11;
/**
 * How square the body is from above (2 round, higher boxier). 6.5: crisp corners with
 * a small rounded bevel (the user, 2026-11-05: "edges too round, make them sharper").
 */
const SQUARENESS = 6.5;
/** The neck: its radius and where it ends (hidden under the cap). */
const NECK = 1.5;
const NECK_TOP = 9.2 + LONGER;
/** The cap: radius, bottom and top (the top of the whole bottle). */
const CAP = 2.35;
const CAP_BOTTOM = 8.55 + LONGER;
const CAP_TOP = 12.0 + LONGER;
/** The collar ring under the cap: its bottom and top. */
const COLLAR_BOTTOM = 8.05 + LONGER;
const COLLAR_TOP = 8.75 + LONGER;
/** The glass base: how thick it shows, and how far it stands proud of the sauce. */
const GLASS_TOP = 1.05;
const GLASS_LIFT = 0.05;

/** The body's radius at height y: a soft block with round shoulders flowing into the neck. */
function bodyRadius(y: number): number {
  if (y <= 0 || y >= NECK_TOP) return 0;
  const t = y / BODY_TOP; // 0 at the table, 1 at the shoulders
  // Flat at the bottom with a crisp edge (it stands), square shoulders at the top.
  const power = y < BODY_TOP / 2 ? 12 : 5;
  const u = Math.abs(2 * t - 1);
  const block = t >= 1 ? 0 : BODY * (1 - u ** power) ** (1 / power);
  // The neck: a short rod with a rounded top, only above the shoulders.
  const rod = (y < NECK_TOP - 0.3 ? NECK : ellipse(y - (NECK_TOP - 0.3), 0.3, NECK)) * smoothstep(4.5 + LONGER, 5.5 + LONGER, y);
  // Wide at the base, narrowing toward the shoulders: the soft triangle of the silhouette.
  const taper = 1 - BODY_TAPER * smoothstep(0, BODY_TOP, y);
  // A soft fillet where shoulder meets neck. Generous on purpose: a tighter bend caught the
  // shader's rim glint as a hard white sliver on the shoulder (the user saw it as a glitch).
  return smoothMax(block * taper, rod, 1.0);
}

/** The body's cross-section: a soft square low down, easing to round at the neck. */
function bodySection(angle: number, y: number): number {
  const square = roundedSquare(angle, SQUARENESS);
  return 1 + (square - 1) * (1 - smoothstep(BODY_TOP - 1.4, BODY_TOP + 0.2, y));
}

/** A point on the body's surface (cm). */
function onBody(angle: number, y: number): [number, number, number] {
  return revolvedPoint(angle, y, bodyRadius(y) * bodySection(angle, y));
}

export const buildSauce: FormBuilder = ({ state }) => {
  if (state !== 'whole') throw new Error(`Sauce: the "${state}" form is not built yet (whole only for now).`);

  const sauce = revolve({ bottom: 0, top: NECK_TOP, radius: bodyRadius, section: bodySection, rings: 40, segments: 64 });

  // The thick glass base: the bottom of the body, a hair larger, closing in just above.
  const glass = revolve({
    bottom: -GLASS_LIFT,
    top: GLASS_TOP + 0.25,
    radius: (y) => (y < GLASS_TOP ? bodyRadius(Math.max(y, 0.02)) + GLASS_LIFT : ellipse(y - GLASS_TOP, 0.25, bodyRadius(GLASS_TOP) + GLASS_LIFT)),
    section: bodySection,
    rings: 12,
    segments: 64,
  });

  // The collar: a thick, soft ring round the neck, just under the cap.
  const collar = revolve({
    bottom: COLLAR_BOTTOM,
    top: COLLAR_TOP,
    radius: (y) => flatEnds(y, COLLAR_BOTTOM, COLLAR_TOP, 1.95, 6),
    rings: 10,
    segments: 48,
  });

  // The screw cap: a tall can with rounded edges and vertical ridges, quieter near its top
  // edge. It tapers: narrower at the bottom by the collar, full width at the top.
  const cap = revolve({
    bottom: CAP_BOTTOM,
    top: CAP_TOP,
    radius: (y) => flatEnds(y, CAP_BOTTOM, CAP_TOP, CAP, 12) * (0.9 + 0.1 * smoothstep(CAP_BOTTOM, CAP_TOP - 0.4, y)),
    section: (angle, y) => 1 + (ribs(angle, 24, 0.035) - 1) * (1 - smoothstep(CAP_TOP - 0.7, CAP_TOP - 0.25, y)),
    rings: 20,
    segments: 96,
  });

  const pieces: FormPiece[] = [
    { role: 'sauce_glow', geometry: sauce },
    { role: 'glass', geometry: glass },
    { role: 'collar', geometry: collar },
    { role: 'cap', geometry: cap },
  ];
  // The printed label (the user, 2026-11-05: "like hot sauce"): one sheet wrapped all the
  // way round the body, with its own map so the shader can print the artwork on it
  // (src/shading/labelArt.ts: hand-lettered words, a flame, a chili, doodled borders).
  if (WITH_PRINTED_LABEL) {
    const front = Math.PI / 2;
    pieces.push({
      role: 'label',
      geometry: wrapSheet({
        surface: onBody,
        // Once round, starting and ending at the back, so the front is the middle of the map.
        angles: [front - Math.PI + 0.001, front + Math.PI - 0.001],
        heights: [LABEL_BOTTOM, LABEL_TOP],
        lift: 0.04,
        columns: 112,
        rows: 10,
        mapped: true,
      }),
      doubleSided: true,
    });
  }
  if (WITH_LABEL) pieces.push(...buildLabel());
  return finishPieces(pieces);
};

/**
 * The label (switched off: `WITH_LABEL`), built up in layers on the front face (a quarter
 * turn is the front), each a hair above the one below, like layers in a comp. `sheet`
 * places one by its angle either side of the centre line and its heights.
 */
function buildLabel(): FormPiece[] {
  const front = Math.PI / 2;
  const sheet = (from: number, to: number, low: number, high: number, lift: number, columns: number, rows: number, round = false) =>
    wrapSheet({ surface: onBody, angles: [front + from, front + to], heights: [low, high], lift, columns, rows, round });
  // 1. The red wrap: round the front face and a little round each side.
  const wrap = sheet(-0.95, 0.95, 1.3, 5.85, 0.03, 30, 16);
  // 2. The gold frame behind the panel, and two small gold marks on the top band.
  const frame = mergeGeometries([
    sheet(-0.47, 0.47, 1.9, 4.85, 0.045, 14, 10),
    sheet(-0.24, -0.08, 5.15, 5.6, 0.045, 6, 4, true),
    sheet(0.0, 0.16, 5.15, 5.6, 0.045, 6, 4, true),
  ]);
  // 3. The cream paper panel inside the frame.
  const label = sheet(-0.41, 0.41, 2.05, 4.7, 0.06, 14, 10);
  // 4. A small red seal on the panel's left.
  const seal = sheet(-0.34, -0.22, 2.75, 4.1, 0.075, 6, 8, true);
  // 5. A few dark brush marks, like hand lettering (abstract, not real letters): long
  //    ovals, so each reads as one dab of a brush, thick in the middle, thin at the ends.
  //    Two columns, read top to bottom like a short word (and never like a face).
  const marks = mergeGeometries([
    // First column: a tall stroke, a short tick to its right, a dab below.
    sheet(-0.15, -0.07, 3.0, 4.4, 0.075, 4, 8, true),
    sheet(-0.05, 0.05, 3.85, 4.05, 0.075, 6, 4, true),
    sheet(-0.13, -0.02, 2.3, 2.75, 0.075, 4, 6, true),
    // Second column: a cross stroke on top, a tall stroke, a short foot.
    sheet(0.08, 0.3, 4.12, 4.34, 0.075, 8, 4, true),
    sheet(0.15, 0.23, 2.85, 4.2, 0.075, 4, 8, true),
    sheet(0.15, 0.3, 2.35, 2.55, 0.075, 6, 4, true),
  ]);

  return [
    { role: 'wrap', geometry: wrap, doubleSided: true },
    { role: 'frame', geometry: frame, doubleSided: true },
    { role: 'panel', geometry: label, doubleSided: true },
    { role: 'seal', geometry: seal, doubleSided: true },
    { role: 'marks', geometry: marks, doubleSided: true },
  ];
}
