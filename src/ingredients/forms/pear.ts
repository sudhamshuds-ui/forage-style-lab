import { Vector3, type BufferAttribute } from 'three';
import { bodyMap } from './kit/maps';
import { smoothMax, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';
import { leafPiece } from './kit/stemLeaf';
import { sweepGeometry } from './kit/sweep';

/**
 * Pear (archetype: round). Round 3, batch 1, after the user's references (Figma node 184:349:
 * two oil paintings of a yellow pear with a red-orange blush, a woody stem and two leaves).
 *
 * What makes it a pear: one smooth outline (never two balls, the avocado's lesson): a full, heavy
 * belly low down, shoulders that pull up into a narrower neck, a rounded top with a small dip, a
 * little lopsided, leaning a touch; a long woody stem; two leaves off the stem.
 *
 * Pieces: skin_glow (the hero, the `pear` skin: yellow to green at the neck, a blush on one side,
 * russet freckles), stem (woody) and leaf.
 */
const HEIGHT = 10;
const BELLY = 3.75;
const NECK = 2.0;

export const buildPear: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Pear: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x9ea5);
  const half = HEIGHT / 2 + 0.15;
  const skin = roundBody({
    halfLength: half,
    radius: (x) => {
      // t: 0 at the foot, 1 at the top.
      const t = (x + half) / (2 * half);
      // The outline the user chose (2026-11-15: "this form for pear was better ... looks so bad in
      // the current form", of a later teardrop): a round belly low down and a rounder neck above,
      // joined by a soft waist. Kept exactly; do not smooth the waist away.
      const belly = BELLY * Math.sqrt(Math.max(0, 1 - ((t - 0.32) / 0.335) ** 2));
      const neck = NECK * Math.sqrt(Math.max(0, 1 - ((t - 0.74) / 0.262) ** 2));
      // (The waist's fillet widened from 1.9, the user, 2026-11-15: "make this edge a bit smoother...
      // the middle deform"; the outline is otherwise the same.)
      return smoothMax(belly, neck, 3.1) * Math.sqrt(Math.min(1, t / 0.03)) * Math.sqrt(Math.min(1, (1 - t) / 0.03)) * 0.87;
    },
    lying: false,
    lopsided: 0.75,
    random,
    poleDimple: { depth: 0.22, width: 0.7, ends: 'end' },
    flatBase: 0.22,
    rings: 56,
    segments: 52,
  });
  const position = skin.getAttribute('position') as BufferAttribute;
  const top = new Vector3().fromBufferAttribute(position, position.count - 1);
  bodyMap(skin);

  // The stem: woody, a little thicker at both ends, leaning and bending.
  const leanTurn = random() * Math.PI * 2;
  const lean = new Vector3(Math.cos(leanTurn), 0, Math.sin(leanTurn));
  const stemTop = top.clone().add(new Vector3(0, 2.4, 0)).addScaledVector(lean, 0.75);
  const stem = sweepGeometry({
    points: [top.clone().add(new Vector3(0, -0.15, 0)), top.clone().add(new Vector3(0, 0.9, 0)).addScaledVector(lean, 0.12), top.clone().add(new Vector3(0, 1.8, 0)).addScaledVector(lean, 0.42), stemTop],
    radius: (t) => 0.2 + 0.1 * (1 - smoothstep(0, 0.25, t)) + 0.07 * smoothstep(0.8, 1, t),
    rings: 14,
    segments: 10,
  });
  // Two leaves off the stem, one each side, each its own size and droop.
  const leaves = [0, 1].map((k) => {
    const turn = leanTurn + Math.PI / 2 + k * Math.PI + signed(random) * 0.4;
    return {
      role: 'leaf',
      doubleSided: true,
      geometry: leafPiece({
        base: top.clone().add(new Vector3(0, 1.3 + k * 0.35, 0)).addScaledVector(lean, 0.25 + k * 0.1),
        turn,
        length: 3.6 + random() * 0.8,
        width: 1.9 + random() * 0.4,
        lift: (d) => (0.32 - k * 0.1) * d - (0.07 + random() * 0.0) * d * d,
        fold: 0.35,
        twist: signed(random) * 0.5,
      }),
    };
  });

  return finishPieces([{ role: 'skin_glow', geometry: skin }, { role: 'stem', geometry: stem }, ...leaves]);
};
