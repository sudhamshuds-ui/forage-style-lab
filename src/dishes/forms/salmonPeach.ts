import { Matrix4, Quaternion, Vector3 } from 'three';
import { buildSalmon } from '../../ingredients/forms/salmon';
import { peachBody } from '../../ingredients/forms/peach';
import { limeBody, LIME_SIZE } from '../../ingredients/forms/lime';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { inCm, plate, posed, roles, setDown, surfaceOf } from '../kit/place';
import { pool, wobble } from '../kit/pool';
import { DINNER_PLATE, ware } from '../kit/ware';

/**
 * Seared salmon, charred peach, lime foam (salmon + peach + lime; fine dining, a main).
 * After the generated reference on the Figma page "Dish refs (generated)" (node 214:2).
 *
 * On a cream stoneware plate: a pool of pale lime foam, the salmon fillet lying across it, three
 * peach wedges and three lime wheels tucked round it, leaning on the plate and on each other.
 * Everything is the pantry's own: the same salmon, the peach cut into wedges with the knife, the
 * lime cut into wheels.
 */

/** A peach half: cut through the stone's axis, laid skin down with its flesh up (grilled). */
function peachHalf(random: () => number): FormPiece[] {
  const { skin } = peachBody(random);
  // The flesh's map: 0 at the stone's axis, 1 at the skin.
  const flesh = (p: Vector3) => ({ uv: [Math.min(1, Math.hypot(p.x, p.z) / 3.55), 0] });
  const a = random() * Math.PI * 2;
  const n = new Vector3(Math.cos(a), 0, Math.sin(a));
  const pieces = cutPieces([{ role: 'peach_glow', geometry: skin }], knife(new Vector3(), n), 'peachFlesh', flesh);
  // Face up: the cut's normal turned to point up (its skin down).
  return posed(pieces, alignDown(n.clone().negate()));
}

/** A rotation that turns a direction to point straight down. */
function alignDown(direction: Vector3) {
  const q = new Quaternion().setFromUnitVectors(direction.clone().normalize(), new Vector3(0, -1, 0));
  return new Matrix4().makeRotationFromQuaternion(q);
}

/** A lime wheel: the lime cut across its middle, a slice `thickness` cm thick, flesh both sides. */
function limeWheel(random: () => number, thickness: number): FormPiece[] {
  const whole = limeBody(random);
  // Its map for the cut flesh (the lime skin reads uv.y 1 as cut, uv.x 0 at the middle, 1 at the peel).
  // The flesh skin's map: x 0 at the middle, 1 at the peel; y counts the ten segments round it.
  const turn = random() * 6;
  const flesh = (p: Vector3) => ({ uv: [Math.min(1, Math.hypot(p.x, p.z) / LIME_SIZE.radius), ((Math.atan2(p.z, p.x) + Math.PI) / (2 * Math.PI)) * 10 + turn + 0.001] });
  let pieces: FormPiece[] = [{ role: 'lime_glow', geometry: whole }];
  const y = signed(random) * 0.3;
  pieces = cutPieces(pieces, knife(new Vector3(0, y + thickness / 2, 0), new Vector3(0, 1, 0)), 'limeFlesh', flesh);
  pieces = cutPieces(pieces, knife(new Vector3(0, y - thickness / 2, 0), new Vector3(0, -1, 0)), 'limeFlesh', flesh);
  return posed(pieces, { at: [0, -y, 0] });
}

export const buildSalmonPeach: FormBuilder = ({ seed }) => {
  const random = seededRandom(seed ^ 0x5a1e);
  const dish = ware(DINNER_PLATE);
  const parts: FormPiece[] = [];

  // The foam: a soft pale pool, a little off centre, full of small bubbles.
  const bubbles = Array.from({ length: 140 }, () => ({ x: signed(random) * 6.5, z: signed(random) * 6.5, r: 0.12 + random() * 0.26 }));
  const foam = pool({
    outline: wobble(6.6, [[2, 0.14, random() * 6], [3, 0.09, random() * 6], [5, 0.05, random() * 6]]),
    at: [1.2, 0.6],
    depth: 0.45,
    floor: dish.floor,
    edge: 0.35,
    bumps: (x, z) => {
      let h = 0;
      for (const b of bubbles) {
        const d = Math.hypot(x - 1.2 - b.x, z - 0.6 - b.z) / b.r;
        if (d < 1) h = Math.max(h, Math.sqrt(1 - d * d) * b.r * 0.7);
      }
      return h;
    },
  });

  // The salmon: the pantry's fillet, a little smaller (a portion), lying across the foam.
  const salmon = posed(roles(inCm(buildSalmon({ state: 'whole', seed })), { flesh_glow: 'salmon_glow' }), { turn: 0.45, scale: 0.78 });
  // Centre it, then set it down in the foam.
  const centred = posed(salmon, { at: [-0.4, 0, -0.6] });
  setDown(centred, surfaceOf([{ role: 'foam', geometry: foam }], dish.floor), 0.12);
  parts.push(...centred);
  parts.push({ role: 'plate', geometry: dish.geometry });
  parts.push({ role: 'foam', geometry: foam });

  // Grilled peach halves, flesh up, round the front and left of the salmon, each tipped a little.
  const halfSpots: [number, number, number, number][] = [[-5.4, 1.4, 0.4, 0.25], [-2.6, 5.0, -0.5, 0.2], [5.2, -3.6, 1.9, 0.3]];
  for (const [x, z, turn, tip] of halfSpots) {
    const h = posed(peachHalf(random), { turn, tip, scale: 0.72 });
    const placed = posed(h, { at: [x, 0, z] });
    setDown(placed, surfaceOf(parts.filter((p) => p.role === 'foam'), dish.floor), 0.15);
    parts.push(...placed);
  }

  // Lime wheels on the foam to the right and in front, lying almost flat, a little apart.
  const wheelSpots: [number, number, number, number][] = [[5.6, 1.6, 0.5, 0.12], [3.0, 5.0, -0.4, 0.1], [0.9, 4.2, 1.2, 0.16]];
  for (const [x, z, turn, tip] of wheelSpots) {
    const wheel = posed(limeWheel(random, 0.5), { turn, tip, scale: 0.92 });
    const placed = posed(wheel, { at: [x, 0, z] });
    setDown(placed, surfaceOf(parts.filter((p) => p.role === 'foam'), dish.floor), 0.12);
    parts.push(...placed);
  }

  return plate(parts);
};
