import { BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';
import { relaxOnSurface, surfaceNets } from '../../ingredients/forms/kit/surfaceNets';
import { roundedIntersection } from '../../ingredients/forms/kit/wedge';
import { salmonFillet, type FilletShape } from '../../ingredients/forms/salmon';
import { limeBody, LIME_SIZE } from '../../ingredients/forms/lime';
import { leafPiece } from '../../ingredients/forms/kit/stemLeaf';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { Table, clearOf, plate, posed } from '../kit/place';
import { pool, wobble } from '../kit/pool';
import { DINNER_PLATE, ware } from '../kit/ware';
import type { Plan } from '../kit/plan';

/**
 * Seared salmon, seared peach, lime foam (salmon + peach + lime; fine dining, a main).
 * After the generated reference (Figma node 214:2) and the user's notes and plating sketch
 * (Figma node 234:251, 2026-11-18).
 *
 * Centre plating, big, medium, small: a round pool of pale lime foam in the middle of a cream
 * plate; the salmon (big) lying across it, a thick seared portion, a spoon of foam on it; seared
 * peach wedges (medium) beside it on the right and the left; thin lime wheels (small) in two
 * clusters, overlapping each other; flecks of herb. Nothing ever on top of the salmon but the
 * foam, every piece resting on the plate or on its neighbours (the table's `rest`).
 */

/**
 * The cooked portion (the user's watercolour, 2026-11-18): a thick, squarish block cut from the
 * loin, its top nearly level with a soft groove down the middle and the belly side only a little
 * lower, its top edges well rounded; the cut ends show the fat's arcs.
 */
const COOKED_PORTION: FilletShape = {
  length: 13,
  width: 6.2,
  height: 3.4,
  midline: -0.2,
  rounding: 0.6,
  backDrop: 0.12,
  bellyDrop: 0.26,
  groove: 0.22,
  // A rough, lumpy seared top (the user, 2026-11-19: "rough, bumpy and not shine like plastic").
  crust: 0.07,
  // From the side (the user's sketch, 2026-11-19): a short end, the top rising in a long gentle
  // arc to its peak about 40% along, then a long slope down to a thin tail.
  along: (t) => {
    const rise = 0.45 + 0.55 * Math.sin((Math.PI / 2) * Math.min(1, t / 0.4));
    const fall = t <= 0.4 ? 1 : 1 - 0.82 * ((t - 0.4) / 0.6) ** 1.25;
    return rise * fall;
  },
};

/** A rotation that turns a direction to point straight down. */
function alignDown(direction: Vector3): Matrix4 {
  const q = new Quaternion().setFromUnitVectors(direction.clone().normalize(), new Vector3(0, -1, 0));
  return new Matrix4().makeRotationFromQuaternion(q);
}

/**
 * A peach wedge with soft, rounded edges (the user's photo, 2026-11-19: "all the edges are uniform
 * and sharp"): one smooth form, the peach's round body and two cuts through its stone's axis
 * blended with rounded corners, meshed whole (surface nets), one piece painted by the flesh skin
 * from the stone out to the skin.
 * Laid on one cut face (either), the other turned to look along +z.
 */
function peachWedge(random: () => number, angle: number): FormPiece[] {
  const R = 3.55;
  const H = 3.45;
  const a = random() * Math.PI * 2;
  const n1 = new Vector3(Math.sin(a), 0, -Math.cos(a));
  const n2 = new Vector3(-Math.sin(a + angle), 0, Math.cos(a + angle));
  const lump = random() * 6;
  const body = (x: number, y: number, z: number) => {
    // A soft, slightly lopsided ball (no cleft, no stem dip: cut through they read as bumps).
    const k = 1 + 0.03 * Math.sin(2 * Math.atan2(z, x) + lump) + 0.02 * Math.sin(3 * y + lump);
    const q = Math.hypot(x / (R * k), y / H, z / (R * k));
    return (q - 1) * Math.min(R, H);
  };
  const shape = (x: number, y: number, z: number) => roundedIntersection([body(x, y, z), x * n1.x + z * n1.z, x * n2.x + z * n2.z], 0.32);
  const cell = 0.11;
  const geometry = relaxOnSurface(surfaceNets(shape, new Vector3(-R - 0.6, -H - 0.6, -R - 0.6), new Vector3(R + 0.6, H + 0.6, R + 0.6), cell), shape, cell);
  // One piece, one paint, like the watermelon (the user, 2026-11-19: no line where skin meets
  // flesh): its map runs 0 at the stone's axis to 1 at the rim of the cut faces, and on past 1 to
  // 1.3 over the skin, blending across the rounded edge, so the flesh fades into the red skin.
  const pos = geometry.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const own = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const toSkin = Math.abs(body(x, y, z));
    const toCut = Math.min(Math.abs(x * n1.x + z * n1.z), Math.abs(x * n2.x + z * n2.z));
    const t = Math.min(1, Math.max(0, (toCut - toSkin + 0.3) / 0.6));
    const skinness = t * t * (3 - 2 * t);
    uv[2 * i] = Math.min(1, Math.hypot(x, z) / R) * (1 - skinness) + 1.3 * skinness;
    own.set([x, y, z], 3 * i);
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setAttribute('ownPos', new BufferAttribute(own, 3));
  const pieces: FormPiece[] = [{ role: 'peachFlesh', geometry }];
  const flip = random() < 0.5;
  // Lying on a cut face: the cut's outward direction (minus its plane normal) turned down.
  const down = alignDown((flip ? n2 : n1).clone());
  const up = (flip ? n1 : n2).clone().applyMatrix4(down);
  const toCamera = Math.atan2(up.x, up.z);
  return posed(posed(pieces, down), { turn: -toCamera });
}

/** A thin lime wheel: the lime cut across its middle, flesh both sides. */
function limeWheel(random: () => number, thickness: number): FormPiece[] {
  const whole = limeBody(random);
  // The flesh skin's map: x 0 at the middle, 1 at the peel; y counts the ten segments round it.
  const turn = random() * 6;
  const flesh = (p: Vector3) => ({ uv: [Math.min(1, Math.hypot(p.x, p.z) / LIME_SIZE.radius), ((Math.atan2(p.z, p.x) + Math.PI) / (2 * Math.PI)) * 10 + turn + 0.001] });
  let pieces: FormPiece[] = [{ role: 'lime_glow', geometry: whole }];
  const y = signed(random) * 0.3;
  pieces = cutPieces(pieces, knife(new Vector3(0, y + thickness / 2, 0), new Vector3(0, 1, 0)), 'limeFlesh', flesh);
  pieces = cutPieces(pieces, knife(new Vector3(0, y - thickness / 2, 0), new Vector3(0, -1, 0)), 'limeFlesh', flesh);
  return posed(pieces, { at: [0, -y, 0] });
}

/** A fleck of herb: a tiny leaf lying flat. */
function herb(random: () => number, x: number, y: number, z: number): FormPiece {
  return {
    role: 'herb',
    doubleSided: true,
    geometry: leafPiece({ base: new Vector3(x, y, z), turn: random() * Math.PI * 2, length: 0.3 + random() * 0.22, width: 0.14 + random() * 0.06, lift: () => 0.02, fold: 0.1, twist: 0, rows: 4, cols: 2 }),
  };
}

// The plating, measured from the user's top-view sketch (Figma node 234:251, 2026-11-18; "u can
// clearly see the difference...in sizes, rotation and placement", 2026-11-19): a foam circle on the
// golden circle (the plate's radius over phi), filling most of the well; the salmon (big, 13 x 6
// cm) across it, its long side about 18 degrees off front-to-back, a little left of the middle;
// round it, in the salmon's own frame (u along it from its back end, v across it, cm): three small
// lime wheels past its back corner, two by its front side opposite (small), peach wedges (medium)
// by its back side, against its other side and off its front corner, cut faces toward it. The plan
// below draws exactly these numbers (docs/dishes/plans/dish-salmon-peach.svg).
const centre = new Vector3(-2.2, 0, 0.5);
const along = new Vector3(0.315, 0, 0.949).normalize();
const right = new Vector3(0.949, 0, -0.315);
const at = (u: number, v: number) => centre.clone().addScaledVector(along, u).addScaledVector(right, v);
const FOAM = { at: [-0.7, 0] as [number, number], r: 8.7 };
const WEDGES: [number, number][] = [[-4.0, -4.1], [0.35, 4.5], [3.7, 6.5]];
const WHEELS: [number, number][] = [[-4.3, 4.4], [-3.4, 6.6], [-2.0, 4.5], [-1.3, -5.0], [0.6, -3.6]];

/** The salmon dish's plan, from straight above (the shapes the dish is built from). */
export const SALMON_PLAN: Plan = {
  title: 'Seared salmon, caramelised peach, lime foam',
  plate: DINNER_PLATE.radius,
  well: DINNER_PLATE.well,
  shapes: [
    { kind: 'circle', label: 'foam', size: 'ground', at: FOAM.at, r: FOAM.r },
    { kind: 'rect', label: 'salmon', size: 'big', at: [centre.x, centre.z], w: 6.2, h: 13, angle: (-Math.atan2(along.x, along.z) * 180) / Math.PI, round: 0.8 },
    ...WEDGES.map(([u, v]) => {
      const p = at(u, v);
      const toSalmon = at(u, 0).sub(p);
      return { kind: 'half' as const, label: 'peach', size: 'medium' as const, at: [p.x, p.z] as [number, number], r: 2.1, angle: (Math.atan2(toSalmon.x, -toSalmon.z) * 180) / Math.PI };
    }),
    ...WHEELS.map(([u, v]) => {
      const p = at(u, v);
      return { kind: 'circle' as const, label: 'lime', size: 'small' as const, at: [p.x, p.z] as [number, number], r: 1.75 };
    }),
  ],
  notes: [
    'Big: the salmon, a little left of the middle. Medium: three peach wedges.',
    'Small: five thin lime wheels in two clusters, on a diagonal across the salmon.',
    'Circular: the foam on the golden circle; the garnish rings the salmon in odd numbers.',
  ],
};

export const buildSalmonPeach: FormBuilder = ({ seed }) => {
  const random = seededRandom(seed ^ 0x5a1e);
  const dish = ware(DINNER_PLATE);
  const table = new Table(dish.floor);
  const parts: FormPiece[] = [];

  // The foam: a round pool filling most of the well, full of bubbles of several sizes.
  const bubbles = Array.from({ length: 220 }, () => {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 8.2;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, r: 0.16 + random() ** 2 * 0.42 };
  });
  const foamBumps = (cx: number, cz: number, list: typeof bubbles) => (x: number, z: number) => {
    let h = 0;
    for (const b of list) {
      const d = Math.hypot(x - cx - b.x, z - cz - b.z) / b.r;
      if (d < 1) h = Math.max(h, Math.sqrt(1 - d * d) * b.r * 0.75);
    }
    return h;
  };
  const foam = pool({
    outline: wobble(FOAM.r, [[3, 0.025, random() * 6], [5, 0.02, random() * 6], [9, 0.012, random() * 6]]),
    at: FOAM.at,
    depth: 0.4,
    floor: dish.floor,
    edge: 0.3,
    bumps: foamBumps(-0.7, 0, bubbles),
    rings: 48,
    segments: 140,
  });
  table.add([{ role: 'foam', geometry: foam }]);

  // The salmon along its axis (its local length is x: turned so x runs along `along`).
  const fillet: FormPiece[] = [{ role: 'salmon_glow', geometry: salmonFillet(seed, COOKED_PORTION) }];
  const salmon = table.rest(posed(fillet, { turn: Math.atan2(-along.z, along.x), at: [centre.x, 3, centre.z] }), { tilt: 0.08, sink: 0.22 });
  parts.push(...salmon);
  // What garnish must stay clear of: the salmon alone.
  const keep = new Table(dish.floor);
  keep.add(salmon);
  const middle: [number, number] = [centre.x, centre.z];

  // (No foam on the salmon: a dollop and then a poured ribbon were both taken off, the user,
  // 2026-11-19: "just remove the foam on top". The pour tool stays in kit/pour.ts.)
  parts.push({ role: 'plate', geometry: dish.geometry });
  parts.push({ role: 'foam', geometry: foam });

  // Seared peach wedges (medium, about 4 cm across), their cut faces toward the salmon, resting
  // against its sides, never on it.
  for (const [u, v] of WEDGES) {
    const spot = at(u, v);
    const toSalmon = Math.atan2(centre.x + along.x * u - spot.x, centre.z + along.z * u - spot.z);
    // Each turned its own way (the user: "more variety in rotation on these wedges").
    const w = posed(peachWedge(random, 0.75 + random() * 0.25), { turn: toSalmon + signed(random) * 0.75, scale: 0.6 + random() * 0.06 });
    parts.push(...table.rest(clearOf(posed(w, { at: [spot.x, 4, spot.z] }), keep, middle, 0.05), { tilt: 0.3, sink: 0.12 }));
  }

  // Thin lime wheels (small, about 3.5 cm), overlapping like fallen coins: three past the back
  // right corner, two by the front left side.
  for (const [u, v] of WHEELS) {
    const spot = at(u, v);
    const wheel = posed(limeWheel(random, 0.2), { turn: random() * 6, scale: 0.66 });
    parts.push(...table.rest(clearOf(posed(wheel, { at: [spot.x, 4, spot.z] }), keep, middle, 0.05), { tilt: 0.5, sink: 0.08 }));
  }

  // Flecks of herb over the salmon and the foam.
  for (let k = 0; k < 26; k++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 7.5;
    const x = Math.cos(a) * r - 0.7;
    const z = Math.sin(a) * r;
    parts.push(herb(random, x, table.height(x, z) + 0.03, z));
  }

  return plate(parts);
};
