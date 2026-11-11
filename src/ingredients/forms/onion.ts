import { BufferAttribute, CatmullRomCurve3, Vector3 } from 'three';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';
import { sweepGeometry } from './kit/sweep';
import { UNITS_PER_CM } from '../scale';

/**
 * Red onion (archetype: round). Round 2's first ingredient (docs/ingredients/r2-plan.md).
 *
 * What makes it an onion, not a plum or a beetroot:
 *   - a squat, slightly lopsided bulb, widest a little above the middle, standing on its root
 *     end (a soft pit where the roots were trimmed),
 *   - shoulders that sweep up in a concave curve into a narrow neck (one grows out of the other),
 *   - the neck ending in a dry, twisted, papery tip that leans to one side (the onion's
 *     signature, like the drumstick's knuckle), shaped, never cut flat.
 *
 * Pieces, like layers in a pre-comp:
 *   bulb  the bulb and its neck, one lathe (the round kit). The purple skin, its pale veins,
 *         the papery flakes, the root patch and the neck drying toward its tip are painted by
 *         the shader (the `onion` skin) from a map on the bulb, never separate layers.
 *   tip   the dry papery tip: two or three twisted ribbons growing out of the neck.
 */

/** The whole onion, root to the top of its neck (cm), and the bulb's width. */
const HEIGHT = 9.4;
const WIDTH = 8;
/** Where the bulb is widest along the axis (cm from the middle; the axis runs root to neck). */
const BULB_CENTRE = -1.4;
/** The bulb's height below its widest point (cm). */
const BULB_BELOW = 3.3;
/** The neck: its radius where it leaves the bulb and at its top (cm). */
const NECK_BASE = 0.75;
const NECK_TOP = 0.42;

export const buildOnion: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Onion: the "${state}" form is not built yet (whole only for now).`);

  const random = seededRandom(seed ^ 0x0a10a);
  const half = HEIGHT / 2;

  /** The profile: radius (cm) at x along the axis, from the root (-half) to the neck's top (+half). */
  const radius = (x: number) => {
    const R = WIDTH / 2;
    if (x <= BULB_CENTRE) {
      // Below the widest point: a round bottom, a little flatter underneath (a power above 2
      // squares it off softly).
      const t = (BULB_CENTRE - x) / BULB_BELOW;
      return R * Math.max(0, 1 - t ** 2.4) ** (1 / 2.4);
    }
    // Above it: one sweep from the full shoulder up into the neck, concave near the top (the
    // shoulders pull up into the neck, so the neck grows out of the bulb, never stuck on it).
    const s = Math.min(1, (x - BULB_CENTRE) / (half - BULB_CENTRE));
    const neckAt = NECK_BASE + (NECK_TOP - NECK_BASE) * s;
    let r = neckAt + (R - neckAt) * Math.max(0, 1 - s ** 2.3) ** 2.1;
    // The top of the neck closes in a small round end.
    const capStart = half - NECK_TOP;
    if (x > capStart) r = Math.min(r, NECK_TOP * Math.sqrt(Math.max(0, 1 - ((x - capStart) / NECK_TOP) ** 2)));
    return r;
  };

  const bulb = roundBody({
    halfLength: half,
    radius,
    lying: false,
    lopsided: 0.6,
    random,
    // The root end: a soft pit where the roots were trimmed.
    poleDimple: { depth: 0.35, width: 1.1, ends: 'start' },
    flatBase: 0.18,
    // A few broad, soft swellings round the bulb (its layers are never quite even), fading
    // toward the neck and the root.
    crossSection: (u, angle) => 1 + 0.025 * (1 - u * u) * Math.sin(5 * angle + 1.3) + 0.015 * Math.sin(2 * angle + 0.4),
    rings: 64,
    segments: 64,
  });

  // The map the shader paints from: x is the height as a share of the onion (0 at the root,
  // 1 at the top of the neck). Taken before the tip is added, so the tip does not stretch it.
  const finished = finishPieces([{ role: 'bulb_glow', geometry: bulb }]);
  const pos = bulb.getAttribute('position');
  let top = 0;
  for (let i = 0; i < pos.count; i++) top = Math.max(top, pos.getY(i));
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[2 * i] = pos.getY(i) / top;
    uv[2 * i + 1] = 0;
  }
  bulb.setAttribute('uv', new BufferAttribute(uv, 2));

  // Where the neck's top is now (the finish moved and scaled the bulb into scene units).
  let neckTop = new Vector3();
  let best = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > best) {
      best = pos.getY(i);
      neckTop = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
  }

  // The dry tip: two or three twisted papery ribbons growing out of the neck (starting inside
  // it), leaning to one side, each ending in a fine, frayed point. Built in centimetres, then
  // scaled like the bulb.
  const cm = UNITS_PER_CM;
  const lean = random() * Math.PI * 2;
  const ribbons = 4;
  const tips = Array.from({ length: ribbons }, (_, k) => {
    const turn = lean + (k - 1.5) * 0.45 + signed(random) * 0.2;
    const length = 1.1 + random() * 0.6 - k * 0.1;
    const out = 0.5 + random() * 0.4;
    const base = new Vector3(neckTop.x / cm, neckTop.y / cm - 0.55, neckTop.z / cm);
    const points = [0, 0.33, 0.66, 1].map((t) => {
      const bend = out * t * t;
      return new Vector3(
        base.x + Math.cos(turn) * bend + Math.cos(turn + 1.6) * 0.12 * Math.sin(t * 5 + k),
        base.y + length * t,
        base.z + Math.sin(turn) * bend + Math.sin(turn + 1.6) * 0.12 * Math.sin(t * 5 + k),
      );
    });
    const geometry = sweepGeometry({
      points: new CatmullRomCurve3(points).getSpacedPoints(10),
      // Widest just above the neck, tapering to a fine point (a dry, frayed end, never cut).
      radius: (t) => 0.3 * (1 - t) ** 0.9 * Math.sqrt(Math.min(1, t / 0.04 + 0.4)),
      rings: 26,
      segments: 10,
      // A flat ribbon that twists along its length, like dry onion skin.
      around: (t, a) => 1 / Math.hypot(Math.cos(a + t * 2.4 + k), Math.sin(a + t * 2.4 + k) / 0.32),
    });
    geometry.scale(cm, cm, cm);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return { role: 'tip', geometry };
  });

  return [...finished, ...tips];
};
