import { Box3, Vector3 } from 'three';
import { buildSteak } from '../../ingredients/forms/steak';
import { buildBlueberries, oneBlueberry } from '../../ingredients/forms/blueberries';
import { garlicBulb } from '../../ingredients/forms/garlic';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { Table, clearOf, inCm, plate, posed, roles } from '../kit/place';
import { pool, wobble } from '../kit/pool';
import { ware, type WareShape } from '../kit/ware';

/**
 * Tomahawk with blueberry and garlic glaze (steak + blueberries + garlic; a main, wild).
 * After the generated reference (Figma node 214:4) and the user's notes and plating sketch
 * (node 237:30, 2026-11-18: "same plating approach as salmon dish. circular").
 *
 * Centre plating on a deep blue platter: a round pool of dark blueberry glaze; the rest of the
 * tomahawk (big) at the back with its long bone running away, its eye carved into slices shingled
 * toward the front (rare and rosy inside, a dark crust round each); a halved roast garlic bulb by
 * the bone, its cut face up and seared; blueberries heaped beside the slices and scattered over
 * the plate. The glaze is drizzled over everything.
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

/** Pieces moved so the middle of their box is at the origin. */
function centred(pieces: FormPiece[]): FormPiece[] {
  const c = boxOf(pieces).getCenter(new Vector3());
  return posed(pieces, { at: [-c.x, -c.y, -c.z] });
}

/** Half a garlic bulb, cut across, the cut face up: cloves round its middle, seared at the edges. */
function garlicHalf(random: () => number): FormPiece[] {
  const bulb = garlicBulb(random);
  bulb.computeBoundingBox();
  const at = bulb.boundingBox!.max.y * 0.42;
  const centre = bulb.boundingBox!.getCenter(new Vector3());
  // The face's map: x from the middle (0) to the skin (1), y counts the nine cloves round it.
  const flesh = (p: Vector3) => ({ uv: [Math.min(1, Math.hypot(p.x - centre.x, p.z - centre.z) / 3.0), ((Math.atan2(p.z - centre.z, p.x - centre.x) + Math.PI) / (2 * Math.PI)) * 9 + 0.3] });
  return cutPieces([{ role: 'garlic', geometry: bulb }], knife(new Vector3(0, at, 0), new Vector3(0, 1, 0)), 'garlicCut', flesh);
}

export const buildTomahawkBerry: FormBuilder = ({ seed }) => {
  const random = seededRandom(seed ^ 0x70b4);
  const dish = ware(PLATTER);
  const table = new Table(dish.floor);
  const parts: FormPiece[] = [];

  // The glaze: a round dark pool in the middle of the platter.
  const glaze = pool({ outline: wobble(10.2, [[3, 0.03, random() * 6], [5, 0.025, random() * 6], [8, 0.015, random() * 6]]), at: [0, 0.3], depth: 0.32, edge: 0.3, floor: dish.floor, rings: 40, segments: 128 });
  table.add([{ role: 'glaze', geometry: glaze }]);

  // The steak, a little smaller (37 cm in the pantry), its eye toward -x.
  const steak = posed(roles(inCm(buildSteak({ state: 'whole', seed })), { meat: 'meat', bone: 'bone' }), { scale: 0.74 });
  const eyeStart = boxOf(steak).min.x;
  // Carve four slices from the eye, about 1.9 cm thick; the rest stays on the bone.
  const cuts = [eyeStart + 1.6, eyeStart + 3.5, eyeStart + 5.4, eyeStart + 7.3, eyeStart + 9.2];
  const slices: FormPiece[][] = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    let slice = cutPieces(steak.filter((p) => p.role === 'meat'), knife(new Vector3(cuts[k], 0, 0), new Vector3(-1, 0, 0)), 'rare', 'radial');
    slice = cutPieces(slice, knife(new Vector3(cuts[k + 1], 0, 0), new Vector3(1, 0, 0)), 'rare', 'radial');
    slices.push(slice);
  }
  const rest = cutPieces(steak, knife(new Vector3(cuts[cuts.length - 1], 0, 0), new Vector3(-1, 0, 0)), 'rare', 'radial');

  // The rest of the steak at the back left, its bone running away from the camera and a little
  // right (the sketch's upright bone), its cut face toward the slices.
  const back = posed(centred(rest), { turn: Math.PI / 2 - 0.25 });
  const backBox = boxOf(back);
  const backPlaced = table.rest(posed(back, { at: [-2.4, 6, -2.4 - backBox.max.z] }), { tilt: 0.05, sink: 0.12 });
  parts.push(...backPlaced);

  // The slices, each laid on a cut face (rosy face up), shingled from the back toward the front
  // right, each overlapping the one before: they lean on each other.
  slices.forEach((slice, k) => {
    const laid = posed(centred(slice), { roll: Math.PI / 2 });
    // Long side left to right (the sketch), each one a step nearer the camera than the last.
    const placed = posed(laid, { turn: Math.PI / 2 + 0.18 + signed(random) * 0.05, at: [-2.6 + k * 0.6, 8, 0.9 + k * 2.5] });
    parts.push(...table.rest(placed, { tilt: 0.3, sink: 0.08 }));
  });

  // The halved roast garlic by the bone, cut face up.
  const garlic = posed(centred(garlicHalf(random)), { scale: 0.9, turn: random() * 6 });
  parts.push(...table.rest(posed(garlic, { at: [3.8, 6, -5.6] }), { tilt: 0.2, sink: 0.1 }));
  // What the berries keep clear of: the meat and the garlic.
  const keep = new Table(dish.floor);
  keep.add(parts);

  // Blueberries: a heap to the right of the slices, and a few scattered over the plate.
  const heap = posed(centred(inCm(buildBlueberries({ state: 'whole', seed }))), { scale: 0.95 });
  parts.push(...table.rest(clearOf(posed(heap, { at: [5.0, 6, 1.8] }), keep, [0, 0], 0.15), { tilt: 0.15, sink: 0.12 }));
  const strays: [number, number][] = [[-7.6, 2.4], [-7.2, 4.3], [-5.3, 3.9], [-2.4, 6.2], [-1.0, 6.6], [-2.2, 7.5], [5.6, 3.0], [6.6, -2.2], [-6.4, -4.6]];
  for (const [x, z] of strays) {
    const single: FormPiece[] = [{ role: 'berry', geometry: oneBlueberry(random) }];
    parts.push(...table.rest(clearOf(posed(single, { at: [x + signed(random) * 0.3, 6, z + signed(random) * 0.3] }), keep, [0, 0], 0.1), { tilt: 0.3, sink: 0.08 }));
  }

  parts.unshift(...parts.splice(parts.findIndex((p) => p.role === 'meat'), 1));
  parts.push({ role: 'glaze', geometry: glaze });
  parts.push({ role: 'plate', geometry: dish.geometry });
  return plate(parts);
};
