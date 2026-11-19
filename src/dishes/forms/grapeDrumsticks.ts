import { Box3, BufferAttribute, Matrix4, Quaternion, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { buildChicken } from '../../ingredients/forms/chicken';
import { buildTomato } from '../../ingredients/forms/tomato';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { Table, clearOf, inCm, plate, posed, roles } from '../kit/place';
import { pool, wobble } from '../kit/pool';
import { DINNER_PLATE, ware } from '../kit/ware';

/**
 * Grape-lacquered drumsticks on tomato jam (chicken + grapes + tomato; unhinged).
 * After the generated reference (Figma node 214:7) and the user's notes (node 238:45,
 * 2026-11-18: "same circular plating ... place all 3 chicken at an angle ... darker textures of
 * sear ... the bone ends need more rounded deform and white parts need browning ... whole tomato
 * needs heavy deform to look its been cooked").
 *
 * Centre plating: a round pool of tomato jam; three drumsticks standing on their bulbs in the
 * middle, each leaning out at an angle (bones splayed like the reference), lacquered dark red and
 * glossy, their knuckles rounder and roasted brown; a roasted cherry tomato slumped and wrinkled
 * between them; halved grapes in small clusters round the front, leaning on each other.
 */

function boxOf(pieces: FormPiece[]): Box3 {
  const box = new Box3();
  for (const p of pieces) {
    p.geometry.computeBoundingBox();
    box.union(p.geometry.boundingBox!);
  }
  return box;
}

/** Scale a shape about its own middle. */
function swell(geometry: BufferGeometry, by: [number, number, number]): void {
  geometry.computeBoundingBox();
  const c = geometry.boundingBox!.getCenter(new Vector3());
  geometry.translate(-c.x, -c.y, -c.z);
  geometry.scale(...by);
  geometry.translate(c.x, c.y, c.z);
}

/** A drumstick stood on its bulb, leaning `lean` radians outward toward `toward` (an angle round the plate). */
function leaningDrumstick(seed: number, lean: number, toward: number): FormPiece[] {
  const pieces = roles(inCm(buildChicken({ state: 'whole', seed })), { meat_glow: 'meat_glow', knuckle: 'knuckle' });
  const centre = (role: string) => boxOf(pieces.filter((q) => q.role === role)).getCenter(new Vector3());
  const axis = centre('knuckle').sub(centre('meat_glow')).normalize();
  // A rounder, fuller knuckle (the user: "the bone ends need more rounded deform").
  for (const p of pieces) if (p.role === 'knuckle') swell(p.geometry, [1.25, 1.3, 1.3]);
  const up = new Quaternion().setFromUnitVectors(axis, new Vector3(0, 1, 0));
  const out = new Vector3(Math.cos(toward), 0, Math.sin(toward));
  const leanQ = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0).cross(out).normalize(), lean);
  return posed(pieces, new Matrix4().makeRotationFromQuaternion(leanQ.multiply(up)));
}

/** A grape, halved, lying cut face up. */
function grapeHalf(random: () => number): FormPiece[] {
  const g = new SphereGeometry(1, 28, 18);
  g.scale(0.95, 1.1, 0.95);
  g.deleteAttribute('uv');
  const flesh = (p: Vector3) => ({ uv: [Math.min(1, Math.hypot(p.x, p.y / 1.1) / 0.95), 0] });
  const cut = cutPieces([{ role: 'grape_glow', geometry: g }], knife(new Vector3(0, 0, 0), new Vector3(0, 0, 1)), 'grapeFlesh', flesh);
  return posed(cut, { tip: -Math.PI / 2, turn: random() * 6 });
}

/** A roasted cherry tomato: slumped (lower and wider), wrinkled and a little lopsided. */
function roastTomato(seed: number, random: () => number): FormPiece[] {
  const t = posed(roles(inCm(buildTomato({ state: 'whole', seed })), { skin_glow: 'tomato_glow', calyx: 'calyx', star: 'calyx', stem: 'calyx' }), { scale: 0.48 });
  const phase = Array.from({ length: 4 }, () => random() * 6);
  const box = boxOf(t);
  const middle = box.getCenter(new Vector3());
  const height = box.max.y - box.min.y;
  for (const p of t) {
    const pos = p.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) - middle.x;
      const z = pos.getZ(i) - middle.z;
      const h = (pos.getY(i) - box.min.y) / height;
      const a = Math.atan2(z, x);
      // Wrinkles running round it, deeper on the shoulders; the whole thing slumped.
      const wrinkle = 1 + 0.07 * Math.sin(7 * a + phase[0] + h * 3) * Math.sin(Math.PI * h) + 0.05 * Math.sin(3 * a + phase[1]);
      const spread = 1 + 0.18 * (1 - h);
      pos.setXYZ(i, middle.x + x * wrinkle * spread, box.min.y + (pos.getY(i) - box.min.y) * (0.68 + 0.06 * Math.sin(2 * a + phase[2])), middle.z + z * wrinkle * spread);
    }
    pos.needsUpdate = true;
  }
  return t;
}

export const buildGrapeDrumsticks: FormBuilder = ({ seed }) => {
  const random = seededRandom(seed ^ 0xd2);
  const dish = ware(DINNER_PLATE);
  const table = new Table(dish.floor);
  const parts: FormPiece[] = [];

  // The tomato jam: a round glossy pool in the middle, a little chunky.
  const jam = pool({
    outline: wobble(8.0, [[3, 0.03, random() * 6], [5, 0.025, random() * 6], [8, 0.015, random() * 6]]),
    at: [0, 0.4],
    depth: 0.45,
    edge: 0.3,
    floor: dish.floor,
    bumps: (x, z) => 0.12 * Math.max(0, Math.sin(x * 2.1 + Math.cos(z * 1.7) * 2) * Math.sin(z * 2.4 + 1)),
    rings: 40,
    segments: 128,
  });
  table.add([{ role: 'jam', geometry: jam }]);

  // Three drumsticks round the middle, 120 degrees apart, each standing on its own bulb in the
  // jam (set down on the jam alone, so no bulb climbs onto another) and leaning outward.
  const onJam = new Table(dish.floor);
  // The legs alone: what the tomato and the grapes keep clear of.
  const legs = new Table(dish.floor);
  onJam.add([{ role: 'jam', geometry: jam }]);
  const towards = [-Math.PI / 2, Math.PI / 2 + Math.PI / 3, Math.PI / 2 - Math.PI / 3].map((a) => a + signed(random) * 0.08);
  towards.forEach((toward, k) => {
    const d = leaningDrumstick((seed + k * 7919) >>> 0, 0.4 + signed(random) * 0.05, toward);
    const bulb = boxOf(d.filter((p) => p.role === 'meat_glow'));
    const reach = 3.4;
    const at = new Vector3(Math.cos(toward) * reach, 0, Math.sin(toward) * reach + 0.3);
    const placed = onJam.rest(posed(d, { at: [at.x - (bulb.min.x + bulb.max.x) / 2, 8, at.z - (bulb.min.z + bulb.max.z) / 2] }), { tilt: 0, sink: 0.35, add: false });
    parts.push(...placed);
    table.add(placed);
    legs.add(placed);
  });

  // The roasted tomato in the gap at the front, between the two front legs.
  parts.push(...table.rest(clearOf(posed(roastTomato(seed, random), { at: [0, 6, 4.6] }), legs, [0, 0.3], 0.1), { tilt: 0.15, sink: 0.2 }));

  // Halved grapes in three small clusters, in the gaps between the legs, leaning on each other.
  // (The legs lean toward -90, 150 and 30 degrees: the gaps are at 90, 210 and 330.)
  const gaps = [Math.PI / 2 - 0.45, Math.PI / 2 + 0.45, (7 * Math.PI) / 6, -Math.PI / 6];
  for (const gap of gaps) {
    const cx = Math.cos(gap) * 6.4;
    const cz = Math.sin(gap) * 6.4 + 0.3;
    for (let k = 0; k < 2; k++) {
      const g = posed(grapeHalf(random), { at: [cx + signed(random) * 0.8, 6, cz + signed(random) * 0.6], scale: 1.05 });
      parts.push(...table.rest(clearOf(g, legs, [0, 0.3], 0.1), { tilt: 0.35, sink: 0.15 }));
    }
  }

  parts.unshift(...parts.splice(parts.findIndex((p) => p.role === 'meat_glow'), 1));
  parts.push({ role: 'jam', geometry: jam });
  parts.push({ role: 'plate', geometry: dish.geometry });
  return plate(parts);
};
