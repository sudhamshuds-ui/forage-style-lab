import { BoxGeometry, CylinderGeometry, Euler, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { spinProfile, type ProfilePoint } from '../ingredients/forms/kit/bowl';
import { seededRandom } from '../ingredients/forms/kit/random';

/**
 * Cuts: the forms an ingredient can take once a knife (or a blender) has been at it.
 *
 * Every cut is built from the same few facts about the ingredient (how wide it is) and about
 * where it is going (how wide the vessel's surface is, how much it holds), so any round fruit
 * or vegetable can take any cut. A cut comes back as two layers, like a two-colour print:
 *   flesh  the inside of the ingredient (its flesh colour)
 *   skin   the bits of peel still showing: a slice's rim, one face of some cubes
 *
 * Shapes only, in centimetres, resting on y = 0 (the vessel's surface), centred on the middle.
 */
/** The preparations (the panel calls this row "Prep": the user, 2026-11-16). */
export const CUTS = ['Whole', 'Sliced', 'Diced', 'Chopped', 'Puree'] as const;
export type Cut = (typeof CUTS)[number];

export interface CutShape {
  flesh: BufferGeometry;
  /** Missing when no peel shows (a puree). */
  skin?: BufferGeometry;
  /** A puree's bottle: the clear, empty part above the sauce, and its cap. */
  bottle?: BufferGeometry;
  cap?: BufferGeometry;
}

export interface CutOptions {
  /** Half the ingredient's width (cm). */
  radius: number;
  /** The radius of the surface it goes on (cm), and how much that holds (1 is a medium vessel). */
  room: number;
  holds: number;
  seed: number;
}

const place = (geometry: BufferGeometry, at: Vector3, turn: Euler) =>
  geometry.applyMatrix4(new Matrix4().compose(at, new Quaternion().setFromEuler(turn), new Vector3(1, 1, 1)));
/** A shape with no texture map (a map on a piece would be read as a leaf's). */
const plain = <T extends BufferGeometry>(geometry: T): T => {
  geometry.deleteAttribute('uv');
  return geometry;
};

/**
 * Slices: round discs across the ingredient, laid in a curving row, each tipped up on the one
 * before it like fallen dominoes. The disc's rim is peel; its faces are flesh.
 */
function sliced(o: CutOptions): CutShape {
  const random = seededRandom(o.seed ^ 0x51ce5);
  const count = Math.max(3, Math.round(6 * o.holds));
  const r = Math.min(o.radius * 0.94, o.room * 0.62);
  const thick = 0.55;
  const flesh: BufferGeometry[] = [];
  const skin: BufferGeometry[] = [];
  // The row runs across the surface on a gentle arc, as long as the surface allows.
  const span = Math.min(o.room * 1.5, count * r * 0.7);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = (t - 0.5) * span;
    const z = -0.22 * span * Math.sin(t * Math.PI) + 0.11 * span;
    // Each leans back on its neighbour; the first lies almost flat.
    const lean = i === 0 ? 0.12 : 0.5 + random() * 0.12;
    const turn = new Euler(0, 0.35 - t * 0.7 + (random() - 0.5) * 0.12, -lean, 'YZX');
    const size = r * (0.9 + random() * 0.14);
    // The middle of a tipped disc sits above the surface by the part of it that hangs below.
    const y = thick / 2 + Math.sin(lean) * size * 0.92;
    const at = new Vector3(x, y, z);
    // Peel: the full disc. Flesh: a slightly smaller, slightly thicker disc inside it, so the
    // faces are flesh and only the rim shows peel.
    skin.push(place(plain(new CylinderGeometry(size, size, thick, 40, 1)), at, turn));
    flesh.push(place(plain(new CylinderGeometry(size - 0.14, size - 0.14, thick + 0.03, 40, 1)), at, turn));
  }
  return { flesh: mergeGeometries(flesh)!, skin: mergeGeometries(skin)! };
}

/**
 * A cube in the heap, seen from above as a rectangle: its middle, half its size each way, and
 * its turn. A cube lying flat is a square; one leaning on a neighbour covers a longer patch.
 */
interface Die {
  x: number;
  z: number;
  hx: number;
  hz: number;
  yaw: number;
  /** The height of its underside and its size (for a flat cube). */
  y: number;
  s: number;
  /** A leaning cube: nothing may be set down on it. */
  leaning?: boolean;
  /** Where the cube itself goes (its middle and its turn), ready for the mesh. */
  matrix: Matrix4;
}

/** The four corners of a die's footprint, seen from above. */
function corners(d: Die, shrink = 1): [number, number][] {
  const hx = d.hx * shrink;
  const hz = d.hz * shrink;
  const c = Math.cos(d.yaw);
  const n = Math.sin(d.yaw);
  return [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([px, pz]) => [d.x + px * c - pz * n, d.z + px * n + pz * c]);
}

/** Do two footprints overlap? (They do unless some edge of one has the other wholly beyond it.) */
function footprintsOverlap(a: Die, b: Die, shrink = 1): boolean {
  const ca = corners(a, shrink);
  const cb = corners(b, shrink);
  for (const [points, others] of [[ca, cb], [cb, ca]] as const) {
    for (let i = 0; i < 4; i++) {
      const [x1, z1] = points[i];
      const [x2, z2] = points[(i + 1) % 4];
      // The edge's outward direction; if every corner of the other is beyond it, they are apart.
      const nx = z2 - z1;
      const nz = -(x2 - x1);
      if (others.every(([x, z]) => (x - x1) * nx + (z - z1) * nz > 1e-6)) return false;
    }
  }
  return true;
}

/** Is a point inside a die's footprint (shrunk a little, so "on the edge" does not count)? */
function inside(d: Die, x: number, z: number): boolean {
  const c = Math.cos(-d.yaw);
  const n = Math.sin(-d.yaw);
  const lx = (x - d.x) * c - (z - d.z) * n;
  const lz = (x - d.x) * n + (z - d.z) * c;
  return Math.abs(lx) < d.hx * 0.84 && Math.abs(lz) < d.hz * 0.84;
}

/**
 * A heap of cubes, built the way you would build one by hand, in two passes.
 *
 * 1. Flat cubes are set down one at a time: on the table, or squarely on top of the highest
 *    cube under them, middle over it, inside a mound-shaped height limit (without the limit
 *    they built a tower).
 * 2. Leaning cubes are added round them (the user, 2026-11-16: "tilt resting on eachother on
 *    some ... right now all are straight"): each stands on one bottom edge on the table and
 *    tips over until its top edge rests against the side of a cube beside it, like a book
 *    leaning on a bookend. The lean is worked out exactly, so it touches and never cuts in.
 *
 * `side` is the cube's size: dice are about 1.3 cm; finely chopped pieces a quarter of that,
 * and many more of them. Edges are sharp, with no bevel. Some cubes keep the peel on one face.
 */
function cubes(o: CutOptions, side: number, perMedium: number): CutShape {
  const random = seededRandom(o.seed ^ 0xd1ced);
  const count = Math.max(4, Math.round(perMedium * o.holds));
  // About one in six leans; the rest lie flat.
  const leaners = Math.round(count * 0.16);
  const flats = count - leaners;
  // How far the heap spreads: tight enough that cubes land on each other and it mounds.
  const spread = side * Math.sqrt(flats) * 0.5;
  /** How high the heap may stand in its middle: about a third as high as it is wide. */
  const peak = Math.max(side * 1.05, spread * 0.62);
  const dice: Die[] = [];
  const up = new Vector3(0, 1, 0);

  // 1. The flat ones.
  for (let i = 0; i < flats; i++) {
    const s = side * (0.85 + random() * 0.3);
    for (let attempt = 0; attempt < 24; attempt++) {
      // More land near the middle than at the edge; later attempts look further out.
      const reach = spread * (0.8 + attempt * 0.035);
      const a = random() * Math.PI * 2;
      const rn = random() ** 1.2;
      const die: Die = { x: Math.cos(a) * reach * rn, z: Math.sin(a) * reach * rn, hx: s / 2, hz: s / 2, y: 0, s, yaw: random() * Math.PI, matrix: new Matrix4() };
      const under = dice.filter((other) => footprintsOverlap(die, other));
      let fits = under.length === 0;
      if (!fits) {
        // It rests on the highest thing under it, only if its middle is over that cube, and
        // only while the heap stays a mound: tall in the middle, low at the edge.
        const top = Math.max(...under.map((other) => other.y + other.s));
        const holders = under.filter((other) => other.y + other.s > top - 1e-4);
        const limit = peak * Math.max(0, 1 - Math.hypot(die.x, die.z) / (spread * 1.15));
        if (top <= limit && holders.some((other) => inside(other, die.x, die.z))) {
          die.y = top;
          fits = true;
        }
      }
      if (!fits) continue;
      die.matrix.compose(new Vector3(die.x, die.y + s / 2, die.z), new Quaternion().setFromAxisAngle(up, -die.yaw), new Vector3(1, 1, 1));
      dice.push(die);
      break;
    }
  }

  // 2. The leaning ones, each against the side of a cube standing on the table.
  const onTable = dice.filter((d) => d.y === 0);
  for (let i = 0; i < leaners && onTable.length > 0; i++) {
    const s = side * (0.85 + random() * 0.3);
    for (let attempt = 0; attempt < 16; attempt++) {
      const prop = onTable[Math.floor(random() * onTable.length)];
      // One of the prop's four sides, and a spot along it.
      const face = prop.yaw + (Math.floor(random() * 4) * Math.PI) / 2;
      const nx = Math.cos(face);
      const nz = Math.sin(face);
      const along = (random() - 0.5) * prop.s * 0.5;
      // How far it tips: enough that its top edge meets the prop's side below the prop's top.
      // Only a gentle tip, as if nudged against its neighbour: a steep one stood balanced on
      // its edge and looked ready to fall (the user, 2026-11-16: "the cubes dont balance right").
      // A cube too tall for its prop would need a steep tip, so it is left out.
      const least = Math.acos(Math.min(1, (prop.s * 0.96) / s));
      if (least > 0.2) continue;
      const tip = Math.max(least + 0.03, 0.1 + random() * 0.16);
      // Seen from the side, measuring out from the prop's face: its near bottom edge stands
      // `gap` away, and the cube tips back by `tip` until its top edge touches the face.
      const gap = s * Math.sin(tip);
      const reach = gap + s * Math.cos(tip);
      const fx = prop.x + nx * (prop.s / 2) - nz * along;
      const fz = prop.z + nz * (prop.s / 2) + nx * along;
      const die: Die = { x: fx + (nx * reach) / 2, z: fz + (nz * reach) / 2, hx: reach / 2, hz: s / 2, y: 0, s, yaw: face, leaning: true, matrix: new Matrix4() };
      // Free ground only: it may touch its prop, nothing else.
      if (dice.some((other) => other !== prop && footprintsOverlap(die, other)) || footprintsOverlap(die, prop, 0.97)) continue;
      // The cube's own three directions: along its tipped base, up its tipped side, and across.
      const base = new Vector3(nx, 0, nz).multiplyScalar(Math.cos(tip)).addScaledVector(up, Math.sin(tip));
      const rise = new Vector3(nx, 0, nz).multiplyScalar(-Math.sin(tip)).addScaledVector(up, Math.cos(tip));
      const across = new Vector3().crossVectors(base, rise);
      const middle = new Vector3(fx + nx * gap, 0, fz + nz * gap).addScaledVector(base, s / 2).addScaledVector(rise, s / 2);
      die.matrix.makeBasis(base, rise, across).setPosition(middle);
      dice.push(die);
      break;
    }
  }

  const flesh: BufferGeometry[] = [];
  const skin: BufferGeometry[] = [];
  for (const d of dice) {
    flesh.push(plain(new BoxGeometry(d.s, d.s, d.s)).applyMatrix4(d.matrix));
    // About four in ten keep the peel on one face (an apple cube with one red side): a thin
    // sheet set into the top or one of the sides, a hair proud of it.
    if (random() < 0.42) {
      const sheet = plain(new BoxGeometry(d.s * 1.004, d.s * 0.07, d.s * 1.004));
      const sides: [Vector3, Euler][] = [
        [new Vector3(0, d.s * 0.468, 0), new Euler(0, 0, 0)],
        [new Vector3(d.s * 0.468, 0, 0), new Euler(0, 0, Math.PI / 2)],
        [new Vector3(-d.s * 0.468, 0, 0), new Euler(0, 0, Math.PI / 2)],
        [new Vector3(0, 0, d.s * 0.468), new Euler(Math.PI / 2, 0, 0)],
        [new Vector3(0, 0, -d.s * 0.468), new Euler(Math.PI / 2, 0, 0)],
      ];
      const [offset, flat] = sides[Math.floor(random() * sides.length)];
      place(sheet, offset, flat);
      skin.push(sheet.applyMatrix4(d.matrix));
    }
  }
  return { flesh: mergeGeometries(flesh)!, skin: skin.length ? mergeGeometries(skin)! : undefined };
}

/**
 * A puree comes in a squeeze bottle (the user's reference, 2026-11-16: a clear sauce bottle
 * with a cone cap). The bottle is half full: its lower part is the puree's colour, the part
 * above it clear plastic, and the cap a third piece. More of it means more bottles, one to three, standing together.
 */
function bottles(o: CutOptions): CutShape {
  const random = seededRandom(o.seed ^ 0x9a7ee);
  const count = Math.max(1, Math.min(3, Math.round(o.holds * 1.4)));
  const spots: [number, number][][] = [[[0, 0]], [[-3.4, 0.4], [3.4, -0.4]], [[-3.6, 1.6], [3.6, 1.2], [0.2, -3.4]]];
  const bodies: BufferGeometry[] = [];
  const caps: BufferGeometry[] = [];
  const clears: BufferGeometry[] = [];
  const point = (r: number, y: number, v: number): ProfilePoint => ({ r, y, u: 0, v });
  for (const [x, z] of spots[count - 1]) {
    const k = 0.92 + random() * 0.16;
    const R = 3.1 * k;
    const H = 13.5 * k;
    // Half full (the user, 2026-11-16), each bottle a little differently.
    const fill = H * (0.42 + random() * 0.1);
    // The sauce: the lower part of the bottle, with a rounded foot and a flat top.
    const sauce: ProfilePoint[] = [point(0, 0.12, 0), point(R - 0.5, 0.12, 0), point(R - 0.12, 0.3, 0), point(R, 0.8, 0), point(R, fill, 0.5), point(0, fill, 0.5)];
    bodies.push(plain(spinProfile(sauce, 44)).translate(x, 0, z));
    // The empty part above it: clear plastic, straight sides, then a shoulder curving in to the neck.
    const empty: ProfilePoint[] = [point(0, fill, 0.5), point(R, fill, 0.5), point(R, H * 0.78, 0.7)];
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      empty.push(point(R * 0.52 + R * 0.48 * Math.cos(a), H * 0.78 + H * 0.12 * Math.sin(a), 0.8));
    }
    empty.push(point(R * 0.52, H * 0.93, 0.9), point(0, H * 0.93, 1));
    clears.push(plain(spinProfile(empty, 44)).translate(x, 0, z));
    // The cap: a screw collar, then a cone nozzle with a small flat tip.
    const c0 = H * 0.9;
    const cap: ProfilePoint[] = [
      point(0, c0, 0), point(R * 0.62, c0, 0), point(R * 0.64, c0 + 0.15, 0), point(R * 0.64, c0 + 1.5 * k, 0), point(R * 0.56, c0 + 1.75 * k, 0),
      point(R * 0.3, c0 + 2.6 * k, 0), point(R * 0.16, c0 + 4.6 * k, 0), point(R * 0.13, c0 + 4.75 * k, 0), point(0, c0 + 4.75 * k, 0),
    ];
    caps.push(plain(spinProfile(cap, 36)).translate(x, 0, z));
  }
  return { flesh: mergeGeometries(bodies)!, bottle: mergeGeometries(clears)!, cap: mergeGeometries(caps)! };
}

export function buildCut(cut: Exclude<Cut, 'Whole'>, options: CutOptions): CutShape {
  if (cut === 'Sliced') return sliced(options);
  if (cut === 'Diced') return cubes(options, 1.3, 44);
  if (cut === 'Chopped') return cubes(options, 0.34, 190);
  return bottles(options);
}
