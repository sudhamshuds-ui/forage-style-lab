import { Vector3 } from 'three';
import { buildBread } from '../../ingredients/forms/bread';
import { strawberryBody } from '../../ingredients/forms/strawberry';
import { paperSheet } from '../../ingredients/forms/kit/block';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { inCm, plate, posed, setDown, surfaceOf } from '../kit/place';
import { pool, wobble } from '../kit/pool';

/**
 * Strawberry and melted cheese baguette (baguette + cheese + strawberry; street food, a snack).
 * After the generated reference on the Figma page "Dish refs (generated)" (node 214:3).
 *
 * Two pieces of the pantry's baguette, each sliced open like a sandwich: strawberry slices on the
 * crumb, melted cheese running over them, a little strawberry jam, the top crust lifted and tipped
 * open. One rests on the other, on a crumpled sheet of baking paper.
 */

/** A section of the baguette, `length` cm long, cut from its middle. */
function loafSection(seed: number, length: number): FormPiece[] {
  let pieces = inCm(buildBread({ state: 'baguette', seed }));
  // The loaf lies along x; two cuts across it, keeping the middle.
  pieces = cutPieces(pieces, knife(new Vector3(length / 2, 0, 0), new Vector3(1, 0, 0)), 'crumb');
  pieces = cutPieces(pieces, knife(new Vector3(-length / 2, 0, 0), new Vector3(-1, 0, 0)), 'crumb');
  return pieces;
}

/**
 * The flesh's map on a cut through a berry: 0 along its pale heart (the axis), 1 at the red skin,
 * measured against the berry's width at that height, so the heart runs the length of the berry.
 */
function berryFlesh(half: number, profileAt: (t: number) => number) {
  return (p: Vector3) => {
    const width = Math.max(0.2, profileAt(Math.min(1, Math.max(0, (half - p.y) / (2 * half)))));
    return { uv: [Math.min(1, Math.hypot(p.x, p.z) / width), 0] };
  };
}

/** A strawberry slice, lying flat: the berry cut lengthwise, `thickness` cm thick. */
function berrySlice(random: () => number, thickness: number): FormPiece[] {
  const { berry, half, profileAt } = strawberryBody(random);
  const flesh = berryFlesh(half, profileAt);
  let pieces: FormPiece[] = [{ role: 'berry_glow', geometry: berry }];
  pieces = cutPieces(pieces, knife(new Vector3(0, 0, thickness / 2), new Vector3(0, 0, 1)), 'berryFlesh', flesh);
  pieces = cutPieces(pieces, knife(new Vector3(0, 0, -thickness / 2), new Vector3(0, 0, -1)), 'berryFlesh', flesh);
  // Lay it flat (its cut faces up and down), tip pointing along x.
  return posed(pieces, { tip: -Math.PI / 2 });
}

/** A strawberry half: cut lengthwise, standing on its round back, its cut face toward +z. */
function berryHalf(random: () => number): FormPiece[] {
  const { berry, half, profileAt } = strawberryBody(random);
  const flesh = berryFlesh(half, profileAt);
  const pieces = cutPieces([{ role: 'berry_glow', geometry: berry }], knife(new Vector3(0, 0, 0), new Vector3(0, 0, 1)), 'berryFlesh', flesh);
  // Tip forward a little, so the face looks up toward the camera, and lie the berry along x.
  return posed(pieces, { roll: Math.PI / 2 + 0.25, tip: -0.35 });
}

function sandwich(seed: number, random: () => number): FormPiece[] {
  const section = loafSection(seed, 12);
  // Slice it open, a little below the middle.
  const cutAt = 3.2;
  const bottom = cutPieces(section, knife(new Vector3(0, cutAt, 0), new Vector3(0, 1, 0)), 'crumb');
  const top = cutPieces(section, knife(new Vector3(0, cutAt, 0), new Vector3(0, -1, 0)), 'crumb');
  const parts: FormPiece[] = [...bottom];
  // The crumb's height (a little lower past the bread's edge, so what hangs over droops softly).
  const onBread = (x: number, z: number) => cutAt - 0.5 * Math.max(0, Math.abs(x) - 5.8) - 0.5 * Math.max(0, Math.abs(z) - 3.6);

  // Strawberry slices lying flat at the back, and a row of halves along the front edge, their
  // red and pale cut faces turned out (the reference shows the berries' insides in the filling).
  const slices: FormPiece[] = [];
  for (let k = 0; k < 5; k++) {
    const x = -4.4 + k * 2.2 + signed(random) * 0.3;
    const z = -1.4 + signed(random) * 0.4;
    const s = posed(berrySlice(random, 0.5), { turn: random() * Math.PI * 2, scale: 1.05 + random() * 0.15 });
    const placed = posed(s, { at: [x, 0, z] });
    setDown(placed, surfaceOf(slices, onBread), 0.05);
    slices.push(...placed);
  }
  for (let k = 0; k < 4; k++) {
    const x = -4.2 + k * 2.8 + signed(random) * 0.3;
    const h = posed(berryHalf(random), { turn: signed(random) * 0.25, scale: 1.1 + random() * 0.1 });
    const placed = posed(h, { at: [x, 0, 2.1 + signed(random) * 0.2] });
    setDown(placed, onBread, 0.25);
    slices.push(...placed);
  }
  parts.push(...slices);
  const filled = surfaceOf(slices, onBread);

  // Melted cheese over the strawberries, running toward the front edge in soft lobes.
  const cheese = pool({
    outline: wobble(5.4, [[2, 0.32, 0.2], [5, 0.08, random() * 6], [7, 0.06, random() * 6]]),
    at: [0, 0.4],
    depth: 0.35,
    edge: 0.45,
    floor: (x, z) => filled(x, z * 1.0) - 0.15,
    rings: 30,
    segments: 120,
  });
  // Squash it into the sandwich's long shape.
  cheese.scale(1, 1, 0.62);
  parts.push({ role: 'cheese', geometry: cheese });
  // The top crust, lifted over the filling and tipped open toward the front.
  const lift = Math.max(...[[0, 0], [-3, 1], [3, -1], [2, 1.5], [-2, -1.5], [-3, -1], [3, 1]].map(([x, z]) => filled(x, z))) - cutAt + 0.15;
  parts.push(...posed(posed(top, { at: [0, lift, 4.3] }).map((p) => p), { tip: -0.16, at: [0, 0, -4.3] }));
  return parts;
}

export const buildBerryBaguette: FormBuilder = ({ seed }) => {
  const random = seededRandom(seed ^ 0xb46e);
  const parts: FormPiece[] = [];

  // The baking paper: a crumpled sheet, soft hills and sharper creases, its corners lifting.
  const creases = Array.from({ length: 9 }, () => ({ a: random() * Math.PI, at: signed(random) * 8, k: 0.12 + random() * 0.2 }));
  const paper = paperSheet({
    length: 30,
    width: 24,
    angle: 0.35,
    columns: 90,
    rows: 72,
    ragged: (u, v) => [0.03 * Math.sin(9 * v + 1) * Math.abs(u) ** 3, 0.03 * Math.sin(7 * u + 2) * Math.abs(v) ** 3],
    height: (x, z, u, v) => {
      let h = 0.08;
      for (const c of creases) {
        const d = x * Math.cos(c.a) + z * Math.sin(c.a) - c.at;
        h += c.k * Math.exp(-Math.abs(d) * 1.4) * (0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.4 + c.at));
      }
      const corner = Math.max(0, Math.abs(u) * Math.abs(v) - 0.45);
      return h + corner * 3.5 + Math.max(0, Math.abs(u) - 0.85) * 2;
    },
  });
  parts.push({ role: 'paper', geometry: paper, doubleSided: true });

  // The lower sandwich on the paper, the upper one resting across it.
  const lower = posed(sandwich(seed, random), { turn: 0.3, at: [-0.4, 0, 1.2] });
  setDown(lower, () => 0.15, 0);
  parts.unshift(...lower);
  const upper = posed(sandwich((seed + 7919) >>> 0, random), { turn: -0.15, roll: 0.06, at: [0.6, 0, -0.6] });
  setDown(upper, surfaceOf(lower, () => 0), 0.25);
  parts.push(...upper);
  return plate(parts);
};
