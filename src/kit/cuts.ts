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
  /** A puree's bottle cap. */
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

/** A cube lying flat on the table or on other cubes: its middle, its size and its turn. */
interface Die {
  x: number;
  z: number;
  /** The height of its underside. */
  y: number;
  s: number;
  yaw: number;
}

/** The four corners of a die's square footprint, seen from above. */
function corners(d: Die, shrink = 1): [number, number][] {
  const h = (d.s / 2) * shrink;
  const c = Math.cos(d.yaw);
  const n = Math.sin(d.yaw);
  return [[-h, -h], [h, -h], [h, h], [-h, h]].map(([px, pz]) => [d.x + px * c - pz * n, d.z + px * n + pz * c]);
}

/** Do two square footprints overlap? (They do unless some edge of one has the other wholly beyond it.) */
function footprintsOverlap(a: Die, b: Die): boolean {
  const ca = corners(a);
  const cb = corners(b);
  for (const [points, others] of [[ca, cb], [cb, ca]] as const) {
    for (let i = 0; i < 4; i++) {
      const [x1, z1] = points[i];
      const [x2, z2] = points[(i + 1) % 4];
      // The edge's outward direction; if every corner of the other square is beyond it, they are apart.
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
  const h = d.s * 0.42;
  return Math.abs(lx) < h && Math.abs(lz) < h;
}

/**
 * A heap of cubes, built the way you would build one by hand: each cube is set down flat, one
 * at a time. It rests on the table, or squarely on top of the highest cube under it, with its
 * middle over that cube so it would really stay there. Nothing is tilted, so no cube cuts into
 * another and none hangs in the air (both happened when cubes were scattered and tipped at
 * random; the user, 2026-11-16).
 *
 * `side` is the cube's size: dice are about 1.3 cm; finely chopped pieces a quarter of that,
 * and many more of them. Edges are sharp, with no bevel. Some cubes keep the peel on one face.
 */
function cubes(o: CutOptions, side: number, perMedium: number): CutShape {
  const random = seededRandom(o.seed ^ 0xd1ced);
  const count = Math.max(4, Math.round(perMedium * o.holds));
  // How far the heap spreads: tight enough that cubes land on each other and it mounds.
  const spread = side * Math.sqrt(count) * 0.5;
  /** How high the heap may stand in its middle: about a third as high as it is wide. */
  const peak = Math.max(side * 1.05, spread * 0.62);
  const dice: Die[] = [];
  for (let i = 0; i < count; i++) {
    const s = side * (0.85 + random() * 0.3);
    let placed: Die | null = null;
    for (let attempt = 0; attempt < 24 && !placed; attempt++) {
      // More land near the middle than at the edge; later attempts look further out.
      const reach = spread * (0.8 + attempt * 0.035);
      const a = random() * Math.PI * 2;
      const rn = random() ** 1.2;
      const die: Die = { x: Math.cos(a) * reach * rn, z: Math.sin(a) * reach * rn, y: 0, s, yaw: random() * Math.PI };
      const under = dice.filter((other) => footprintsOverlap(die, other));
      if (under.length === 0) {
        placed = die;
        break;
      }
      // It rests on the highest thing under it, and only if its middle is over that cube.
      const top = Math.max(...under.map((other) => other.y + other.s));
      const holders = under.filter((other) => other.y + other.s > top - 1e-4);
      // And only while the heap stays a mound: tall in the middle, low at the edge. (Without
      // this limit the cubes kept landing on the topmost one and built a tower.)
      const limit = peak * Math.max(0, 1 - Math.hypot(die.x, die.z) / (spread * 1.15));
      if (top <= limit && holders.some((other) => inside(other, die.x, die.z))) {
        die.y = top;
        placed = die;
      }
    }
    if (placed) dice.push(placed);
  }

  const flesh: BufferGeometry[] = [];
  const skin: BufferGeometry[] = [];
  for (const d of dice) {
    const turn = new Euler(0, -d.yaw, 0);
    const at = new Vector3(d.x, d.y + d.s / 2, d.z);
    flesh.push(place(plain(new BoxGeometry(d.s, d.s, d.s)), at, turn));
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
      skin.push(place(sheet, at, turn));
    }
  }
  return { flesh: mergeGeometries(flesh)!, skin: skin.length ? mergeGeometries(skin)! : undefined };
}

/**
 * A puree comes in a squeeze bottle (the user's reference, 2026-11-16: a clear sauce bottle
 * with a cone cap). The sauce shows through the bottle, so the body takes the puree's colour;
 * the cap is a second piece. More of it means more bottles, one to three, standing together.
 */
function bottles(o: CutOptions): CutShape & { cap: BufferGeometry } {
  const random = seededRandom(o.seed ^ 0x9a7ee);
  const count = Math.max(1, Math.min(3, Math.round(o.holds * 1.4)));
  const spots: [number, number][][] = [[[0, 0]], [[-3.4, 0.4], [3.4, -0.4]], [[-3.6, 1.6], [3.6, 1.2], [0.2, -3.4]]];
  const bodies: BufferGeometry[] = [];
  const caps: BufferGeometry[] = [];
  const point = (r: number, y: number, v: number): ProfilePoint => ({ r, y, u: 0, v });
  for (const [x, z] of spots[count - 1]) {
    const k = 0.92 + random() * 0.16;
    const R = 3.1 * k;
    const H = 13.5 * k;
    // The body: a straight-sided bottle with a rounded foot and a shoulder curving in to the neck.
    const body: ProfilePoint[] = [point(0, 0.12, 0), point(R - 0.5, 0.12, 0), point(R - 0.12, 0.3, 0), point(R, 0.8, 0)];
    body.push(point(R, H * 0.78, 0.7));
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      body.push(point(R * 0.52 + R * 0.48 * Math.cos(a), H * 0.78 + H * 0.12 * Math.sin(a), 0.8));
    }
    body.push(point(R * 0.52, H * 0.93, 0.9), point(0, H * 0.93, 1));
    bodies.push(plain(spinProfile(body, 44)).translate(x, 0, z));
    // The cap: a screw collar, then a cone nozzle with a small flat tip.
    const c0 = H * 0.9;
    const cap: ProfilePoint[] = [
      point(0, c0, 0), point(R * 0.62, c0, 0), point(R * 0.64, c0 + 0.15, 0), point(R * 0.64, c0 + 1.5 * k, 0), point(R * 0.56, c0 + 1.75 * k, 0),
      point(R * 0.3, c0 + 2.6 * k, 0), point(R * 0.16, c0 + 4.6 * k, 0), point(R * 0.13, c0 + 4.75 * k, 0), point(0, c0 + 4.75 * k, 0),
    ];
    caps.push(plain(spinProfile(cap, 36)).translate(x, 0, z));
  }
  return { flesh: mergeGeometries(bodies)!, cap: mergeGeometries(caps)! };
}

export function buildCut(cut: Exclude<Cut, 'Whole'>, options: CutOptions): CutShape {
  if (cut === 'Sliced') return sliced(options);
  if (cut === 'Diced') return cubes(options, 1.3, 22);
  if (cut === 'Chopped') return cubes(options, 0.34, 190);
  return bottles(options);
}
