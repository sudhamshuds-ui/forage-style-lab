import { smoothMax, smoothstep, ellipse } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { flatEnds, revolve, revolvedPoint, ribs, roundedSquare, wrapSheet } from './kit/vessel';

/**
 * Sauce (archetype: contained). Spec: 6.5 x 12 x 6.5 cm, standing up.
 * After the user's reference (Figma, "sauce ref"): a squat hot sauce bottle.
 *
 * What makes it this bottle, not a jar or a ketchup bottle:
 *   - a squat body with a soft square cross-section (a flat face for the label)
 *     and full, rounded shoulders that run into a short neck,
 *   - a big, tall screw cap with vertical ridges, almost as wide as the body,
 *   - a collar ring where the cap meets the neck,
 *   - a thick glass base under the dark sauce,
 *   - a paper label on the front face, with a coloured band across its top.
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   sauce_glow  the bottle full of sauce (the glow name lets light through at thin edges)
 *   glass       the thick glass base
 *   collar      the ring under the cap
 *   cap         the ridged screw cap
 *   label       the paper label (an open sheet, painted both sides)
 *   band        the coloured band across the label's top
 * Gloss, the see-through glass look and any lettering are the shader's job, never geometry.
 */

/** Half the body's width across its flat faces (cm): 6.5 cm wide. */
const BODY = 3.25;
/** The body block: from the table to where the shoulders end. */
const BODY_TOP = 7.4;
/** How square the body is from above (2 round, higher boxier). */
const SQUARENESS = 3.4;
/** The neck: its radius and where it ends (hidden under the cap). */
const NECK = 1.5;
const NECK_TOP = 9.2;
/** The cap: radius, bottom and top (the top of the whole bottle). */
const CAP = 2.35;
const CAP_BOTTOM = 8.55;
const CAP_TOP = 12.0;
/** The glass base: how thick it shows, and how far it stands proud of the sauce. */
const GLASS_TOP = 1.05;
const GLASS_LIFT = 0.05;

/** The body's radius at height y: a soft block with round shoulders flowing into the neck. */
function bodyRadius(y: number): number {
  if (y <= 0 || y >= NECK_TOP) return 0;
  const t = y / BODY_TOP; // 0 at the table, 1 at the shoulders
  // Flatter at the bottom (it stands), rounder at the top (the shoulders).
  const power = y < BODY_TOP / 2 ? 6 : 2.6;
  const u = Math.abs(2 * t - 1);
  const block = t >= 1 ? 0 : BODY * (1 - u ** power) ** (1 / power);
  // The neck: a short rod with a rounded top, only above the shoulders.
  const rod = (y < NECK_TOP - 0.3 ? NECK : ellipse(y - (NECK_TOP - 0.3), 0.3, NECK)) * smoothstep(4.5, 5.5, y);
  // A soft fillet where shoulder meets neck.
  return smoothMax(block, rod, 1.1);
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
  const collar = revolve({ bottom: 8.05, top: 8.75, radius: (y) => flatEnds(y, 8.05, 8.75, 1.95, 3), rings: 10, segments: 48 });

  // The screw cap: a tall can with rounded edges and vertical ridges, quieter near its top edge.
  const cap = revolve({
    bottom: CAP_BOTTOM,
    top: CAP_TOP,
    radius: (y) => flatEnds(y, CAP_BOTTOM, CAP_TOP, CAP, 7),
    section: (angle, y) => 1 + (ribs(angle, 24, 0.035) - 1) * (1 - smoothstep(CAP_TOP - 0.7, CAP_TOP - 0.25, y)),
    rings: 20,
    segments: 96,
  });

  // The label on the front face (a quarter turn is the front), and its band across the top.
  const front = Math.PI / 2;
  const label = wrapSheet({ surface: onBody, angles: [front - 0.66, front + 0.66], heights: [1.5, 5.7], lift: 0.03, columns: 20, rows: 14 });
  const band = wrapSheet({ surface: onBody, angles: [front - 0.66, front + 0.66], heights: [4.85, 5.7], lift: 0.05, columns: 20, rows: 4 });

  return finishPieces([
    { role: 'sauce_glow', geometry: sauce },
    { role: 'glass', geometry: glass },
    { role: 'collar', geometry: collar },
    { role: 'cap', geometry: cap },
    { role: 'label', geometry: label, doubleSided: true },
    { role: 'band', geometry: band, doubleSided: true },
  ]);
};
