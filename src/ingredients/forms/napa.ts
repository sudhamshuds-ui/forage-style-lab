import { smoothstep } from './kit/lathe';
import type { FormBuilder } from './kit/piece';
import { buildHead } from './romaine';

/**
 * Napa cabbage (archetype: leafy). Round 2's eighth ingredient, the last leafy one, after the
 * user's references (2026-11-13: a head lying on its side with its cut base showing; a painted
 * head; a watercolour napa with mottled cells and broad white ribs).
 *
 * The romaine's approved head (`buildHead` in romaine.ts: a blended inner head with separate outer
 * leaves laid as shingles, the clean cut base), made into a napa: shorter and much fuller, a
 * rounded barrel; broader leaves, more of them; broad white ribs reaching further up, the crinkled
 * pale green only at the top (the napa skin).
 */
const LENGTH = 24;
function napaRadius(x: number): number {
  const t = Math.min(1, Math.max(0, x / LENGTH));
  // A full barrel: a rounded base, swelling quickly, fullest past the middle, easing in at the top.
  return 3.6 + 2.0 * smoothstep(0, 0.4, t) + 0.3 * smoothstep(0.4, 0.75, t) - 0.6 * smoothstep(0.82, 1, t);
}

export const buildNapa: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Napa cabbage: the "${state}" form is not built yet (whole only for now).`);
  return buildHead(seed, { length: LENGTH, radius: napaRadius, outerLeaves: 9, wide: 1.45, salt: 0x4a9a1, cell: 0.42, paleTo: 0.55, greenFrom: 0.42 });
};
