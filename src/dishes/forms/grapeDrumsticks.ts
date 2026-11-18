import { Box3, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import { buildChicken } from '../../ingredients/forms/chicken';
import { buildTomato } from '../../ingredients/forms/tomato';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { inCm, plate, posed, roles, setDown, surfaceOf } from '../kit/place';
import { pool, wobble } from '../kit/pool';
import { DINNER_PLATE, ware } from '../kit/ware';

/**
 * Grape-lacquered drumsticks on tomato jam (chicken + grapes + tomato; unhinged).
 * After the generated reference on the Figma page "Dish refs (generated)" (node 214:7).
 *
 * Three of the pantry's drumsticks standing up on their bulbs, bones to the sky, lacquered dark
 * and glossy with a grape glaze; a pool of tomato jam under them, halved grapes in it, and cherry
 * tomatoes (the pantry's tomato, small) with their green stars, one cut open.
 */

/** A drumstick stood on its bulb, the knuckle straight up (leaning `lean` radians toward `turn`). */
function standingDrumstick(seed: number, lean: number, turn: number): FormPiece[] {
  const pieces = roles(inCm(buildChicken({ state: 'whole', seed })), { meat_glow: 'meat_glow', knuckle: 'knuckle' });
  const centre = (role: string) => {
    const box = new Box3();
    for (const p of pieces.filter((q) => q.role === role)) {
      p.geometry.computeBoundingBox();
      box.union(p.geometry.boundingBox!);
    }
    return box.getCenter(new Vector3());
  };
  const axis = centre('knuckle').sub(centre('meat_glow')).normalize();
  const up = new Quaternion().setFromUnitVectors(axis, new Vector3(0, 1, 0));
  const leanQ = new Quaternion().setFromAxisAngle(new Vector3(Math.cos(turn), 0, Math.sin(turn)), lean);
  return posed(pieces, new Matrix4().makeRotationFromQuaternion(leanQ.multiply(up)));
}

/** A grape, halved, lying cut face up. */
function grapeHalf(random: () => number): FormPiece[] {
  const g = new SphereGeometry(1, 28, 18);
  g.scale(0.95, 1.1, 0.95);
  g.deleteAttribute('uv');
  const flesh = (p: Vector3) => ({ uv: [Math.min(1, Math.hypot(p.x, p.y / 1.1) / 0.95), 0] });
  const cut = cutPieces([{ role: 'grape_glow', geometry: g }], knife(new Vector3(0, 0, 0), new Vector3(0, 0, 1)), 'grapeFlesh', flesh);
  return posed(cut, { tip: -Math.PI / 2 + 0.2, turn: random() * 6 });
}

export const buildGrapeDrumsticks: FormBuilder = ({ seed }) => {
  const random = seededRandom(seed ^ 0xd2);
  const dish = ware(DINNER_PLATE);
  const parts: FormPiece[] = [];

  // The tomato jam: a wide glossy pool, its edge in soft lobes.
  const jam = pool({
    outline: wobble(8.8, [[2, 0.1, random() * 6], [3, 0.08, random() * 6], [7, 0.04, random() * 6]]),
    at: [0, 0.6],
    depth: 0.45,
    edge: 0.35,
    floor: dish.floor,
    bumps: (x, z) => 0.12 * Math.max(0, Math.sin(x * 2.1 + Math.cos(z * 1.7) * 2) * Math.sin(z * 2.4 + 1)),
  });
  parts.push({ role: 'jam', geometry: jam });
  const onJam = surfaceOf([{ role: 'jam', geometry: jam }], dish.floor);

  // Three drumsticks standing in a loose triangle, the back one tallest, leaning apart a little.
  const stands: [number, number, number, number][] = [[0, -2.4, 0.12, -1.6], [-3.2, 1.6, 0.2, 2.6], [3.1, 1.4, 0.18, 0.6]];
  const sticks: FormPiece[] = [];
  stands.forEach(([x, z, lean, turn], k) => {
    const d = posed(standingDrumstick((seed + k * 7919) >>> 0, lean, turn), { at: [x, 0, z], turn: random() * Math.PI * 2 });
    setDown(d, onJam, 0.3);
    sticks.push(...d);
  });
  parts.unshift(...sticks);

  // Halved grapes in the jam round the front.
  for (let k = 0; k < 6; k++) {
    const a = 0.3 + (k / 6) * Math.PI * 1.6 + signed(random) * 0.15;
    const r = 6.0 + signed(random) * 0.8;
    const g = posed(grapeHalf(random), { at: [Math.cos(a) * r, 0, Math.sin(a) * r * 0.85 + 1] });
    setDown(g, onJam, 0.25);
    parts.push(...g);
  }

  // Cherry tomatoes with their stars: two whole and one cut open, in the middle of the group.
  const cherries: [number, number, boolean][] = [[0.2, 2.6, false], [-1.2, 4.6, true], [5.6, -2.4, false]];
  cherries.forEach(([x, z, cut], k) => {
    let t = roles(inCm(buildTomato({ state: 'whole', seed: (seed + 31 * k) >>> 0 })), { skin_glow: 'tomato_glow', calyx: 'calyx', star: 'calyx', stem: 'calyx' });
    t = posed(t, { scale: 0.42 });
    if (cut) {
      t = t.filter((p) => p.role === 'tomato_glow');
      t = cutPieces(t, knife(new Vector3(0, 1.4, 0), new Vector3(0, 1, 0)), 'tomatoFlesh', 'radial');
    }
    const placed = posed(t, { at: [x, 0, z], turn: random() * 6 });
    setDown(placed, onJam, 0.2);
    parts.push(...placed);
  });

  parts.push({ role: 'plate', geometry: dish.geometry });
  return plate(parts);
};
