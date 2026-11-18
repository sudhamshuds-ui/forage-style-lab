import { Vector3 } from 'three';
import { mushroomUpright } from '../../ingredients/forms/mushroom';
import { buildEgg } from '../../ingredients/forms/egg';
import { leafPiece } from '../../ingredients/forms/kit/stemLeaf';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { inCm, plate, posed, roles, setDown, surfaceOf } from '../kit/place';
import { pool, wobble } from '../kit/pool';
import { PASTA_BOWL, ware } from '../kit/ware';

/**
 * Soft egg in butter-roasted mushrooms (eggs + mushrooms + butter; a starter).
 * After the generated reference on the Figma page "Dish refs (generated)" (node 214:6).
 *
 * In a wide cream bowl: a pool of golden brown butter, a ring of roasted mushrooms (halved to
 * show their pale insides, and whole caps), a soft fried egg in the middle with its yolk up, and
 * a few small herb leaves.
 */
export const buildEggMushroom: FormBuilder = ({ seed }) => {
  const random = seededRandom(seed ^ 0xe95);
  const bowl = ware(PASTA_BOWL);
  const parts: FormPiece[] = [];

  // The brown butter: a golden pool filling the bowl's well.
  const butter = pool({ outline: wobble(8.6, [[3, 0.05, random() * 6], [5, 0.04, random() * 6]]), at: [0, 0], depth: 0.35, edge: 0.3, floor: bowl.floor });
  parts.push({ role: 'butter', geometry: butter });

  // The egg in the middle: the pantry's fried egg (its white and yolk, no pan), a little smaller.
  const egg = posed(roles(inCm(buildEgg({ state: 'whole', seed })), { white: 'white', yolk: 'yolk' }), { scale: 0.8, turn: random() * 6 });
  setDown(egg, surfaceOf([{ role: 'butter', geometry: butter }], bowl.floor), 0.1);
  // The egg goes first: it is the hero (the main highlight, its own skin).
  parts.unshift(...egg);
  const eggSurface = surfaceOf(egg, () => -10);

  // Mushrooms round the egg: halves lying cut face up and whole ones tipped on their side.
  const count = 11;
  for (let k = 0; k < count; k++) {
    const around = (k / count) * Math.PI * 2 + signed(random) * 0.2;
    const reach = 6.7 + signed(random) * 0.5;
    const { geometry } = mushroomUpright(0.62 + random() * 0.18, k, random);
    let m: FormPiece[] = [{ role: 'mushroom', geometry }];
    if (k % 3 !== 2) {
      // Halved through the stem: its pale inside up.
      m = cutPieces(m, knife(new Vector3(0, 0, 0), new Vector3(0, 0, 1)), 'mushroomCut', 'radial');
      m = posed(m, { tip: -Math.PI / 2 + 0.15 });
    } else {
      // Whole, tipped over onto its cap's rim.
      m = posed(m, { tip: -1.1 });
    }
    m = posed(m, { turn: around + Math.PI / 2 + signed(random) * 0.6 });
    const placed = posed(m, { at: [Math.cos(around) * reach, 0, Math.sin(around) * reach] });
    // On the butter and the bowl only (stacked on each other, they rode up into the air).
    setDown(placed, surfaceOf(parts.filter((p) => p.role === 'butter'), bowl.floor), 0.2);
    parts.push(...placed);
  }

  // Herb leaves: small flat-leaf parsley leaves scattered over the mushrooms and the egg's edge.
  const top = surfaceOf(parts.filter((p) => p.role !== 'butter'), bowl.floor);
  for (let k = 0; k < 9; k++) {
    const a = random() * Math.PI * 2;
    const r = 4.5 + random() * 3.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = Math.max(top(x, z), eggSurface(x, z)) + 0.05;
    const leaf = leafPiece({
      base: new Vector3(x, y, z),
      turn: random() * Math.PI * 2,
      length: 1.3 + random() * 0.5,
      width: 0.75 + random() * 0.2,
      lift: (d) => 0.08 * d,
      fold: 0.25,
      twist: signed(random) * 0.3,
      rows: 8,
    });
    parts.push({ role: 'herb', geometry: leaf, doubleSided: true });
  }

  parts.push({ role: 'bowl', geometry: bowl.geometry });
  return plate(parts);
};
