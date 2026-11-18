import { Box3, Vector3 } from 'three';
import { buildSteak } from '../../ingredients/forms/steak';
import { buildBlueberries } from '../../ingredients/forms/blueberries';
import { buildGarlic } from '../../ingredients/forms/garlic';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { inCm, plate, posed, roles, setDown, surfaceOf } from '../kit/place';
import { pool, wobble } from '../kit/pool';
import { ware, type WareShape } from '../kit/ware';

/**
 * Tomahawk with blueberry and garlic glaze (steak + blueberries + garlic; a main, wild).
 * After the generated reference on the Figma page "Dish refs (generated)" (node 214:4).
 *
 * On a deep blue platter: the pantry's tomahawk, seared, its eye carved into thick slices laid
 * like shingles (rare and rosy inside, a browned crust round each), the rest of it with its long
 * bone behind them; a dark blueberry glaze pooled round the slices, blueberries heaped beside, a
 * roast garlic bulb by the bone.
 */
const PLATTER: WareShape = { radius: 16, well: 11, rim: 2.3, floor: 0.75, foot: 9, wall: 0.45, curve: 1.8 };

function boxOf(pieces: FormPiece[]): Box3 {
  const box = new Box3();
  for (const p of pieces) {
    p.geometry.computeBoundingBox();
    box.union(p.geometry.boundingBox!);
  }
  return box;
}

export const buildTomahawkBerry: FormBuilder = ({ seed }) => {
  const random = seededRandom(seed ^ 0x70b4);
  const dish = ware(PLATTER);
  const parts: FormPiece[] = [];

  // The steak, a little smaller (it is 37 cm in the pantry), its eye toward -x.
  const steak = posed(roles(inCm(buildSteak({ state: 'whole', seed })), { meat: 'meat', bone: 'bone' }), { scale: 0.78 });
  const box = boxOf(steak);
  const eyeStart = box.min.x;
  // Carve the eye: three slices across it, each about 2.3 cm thick; the rest stays on the bone.
  const cuts = [eyeStart + 3.2, eyeStart + 5.6, eyeStart + 8.0, eyeStart + 10.4];
  const slices: FormPiece[][] = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    let slice = cutPieces(steak.filter((p) => p.role === 'meat'), knife(new Vector3(cuts[k], 0, 0), new Vector3(-1, 0, 0)), 'rare', 'radial');
    slice = cutPieces(slice, knife(new Vector3(cuts[k + 1], 0, 0), new Vector3(1, 0, 0)), 'rare', 'radial');
    slices.push(slice);
  }
  const rest = cutPieces(steak, knife(new Vector3(cuts[cuts.length - 1], 0, 0), new Vector3(-1, 0, 0)), 'rare', 'radial');

  // The rest of the steak and its bone, behind and to the right, the bone running up and out.
  const back = posed(rest, { turn: -0.5, at: [-2.5, 0, -4.5] });
  setDown(back, dish.floor, 0.05);
  parts.push(...back);

  // The glaze: a dark pool under the slices, its edge running out in soft lobes.
  const glaze = pool({
    outline: wobble(7.2, [[2, 0.16, random() * 6], [3, 0.1, random() * 6], [6, 0.05, random() * 6]]),
    at: [-2.5, 3.0],
    depth: 0.3,
    edge: 0.4,
    floor: dish.floor,
  });
  glaze.scale(1.15, 1, 0.8);
  parts.push({ role: 'glaze', geometry: glaze });

  // The slices: each laid on a cut face, shingled from left to right in front of the bone, the
  // rosy face of each showing past the one before.
  slices.forEach((slice, k) => {
    const centre = boxOf(slice).getCenter(new Vector3());
    const laid = posed(posed(slice, { at: [-centre.x, -centre.y, -centre.z] }), { roll: Math.PI / 2 - 0.5, turn: 0.35 + signed(random) * 0.08 });
    const placed = posed(laid, { at: [-6.5 + k * 3.6, 0, 3.4 + k * 0.3] });
    setDown(placed, surfaceOf(parts.filter((p) => p.role === 'glaze' || p.role === 'meat' || p.role === 'rare'), dish.floor), 0.15);
    parts.push(...placed);
  });

  // Blueberries heaped on the right, a few rolled into the glaze.
  const berries = posed(inCm(buildBlueberries({ state: 'whole', seed })), { scale: 1.05, at: [7.0, 0, 3.2] });
  setDown(berries, surfaceOf(parts.filter((p) => p.role === 'glaze'), dish.floor), 0.1);
  parts.push(...berries);

  // A roast garlic bulb and its cloves by the bone, seared golden.
  const garlic = posed(roles(inCm(buildGarlic({ state: 'whole', seed })), { bulb: 'garlic' }), { scale: 0.85, turn: 0.8, at: [7.5, 0, -4.0] });
  setDown(garlic, dish.floor, 0.05);
  parts.push(...garlic);

  parts.unshift(...parts.splice(parts.findIndex((p) => p.role === 'meat'), 1));
  parts.push({ role: 'plate', geometry: dish.geometry });
  return plate(parts);
};
