import { CylinderGeometry, Euler, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { moundGeometry } from '../ingredients/forms/kit/bowl';
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
 * A heap of cubes. `side` is the cube's size: dice are about 1.3 cm with crisp edges, finely
 * chopped pieces under half of that and more jumbled. Some cubes keep the peel on one face.
 */
function cubes(o: CutOptions, side: number, perMedium: number, jumble: number): CutShape {
  const random = seededRandom(o.seed ^ 0xd1ced);
  const count = Math.max(4, Math.round(perMedium * o.holds));
  const flesh: BufferGeometry[] = [];
  const skin: BufferGeometry[] = [];
  // The heap: a low dome. Pieces are dropped at random over a disc; each sits at the dome's
  // height there, so the middle stands taller than the edge.
  const spread = Math.min(o.room * 0.8, side * Math.sqrt(count) * 0.62);
  const height = side * Math.max(0.6, Math.sqrt(count) * 0.34);
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2;
    const rn = Math.sqrt(random());
    const x = Math.cos(a) * spread * rn;
    const z = Math.sin(a) * spread * rn;
    const s = side * (0.82 + random() * 0.36);
    // Lower pieces lie flat; higher up they tumble.
    const lift = height * (1 - rn * rn) * random();
    const tumble = jumble + (lift / Math.max(height, 0.01)) * 0.6;
    const turn = new Euler((random() - 0.5) * tumble, random() * Math.PI * 2, (random() - 0.5) * tumble);
    const at = new Vector3(x, s / 2 + lift, z);
    // Crisp edges: only a hair of bevel (the user: "not very bevelled...sharp edge").
    flesh.push(place(plain(new RoundedBoxGeometry(s, s, s, 2, s * 0.05)), at, turn));
    // About four in ten keep the peel on one face (an apple cube with one red side).
    if (random() < 0.42) {
      const face = plain(new RoundedBoxGeometry(s * 0.97, s * 0.1, s * 0.97, 1, s * 0.03));
      // On one of its sides, picked at random, before the cube's own turn.
      const sides: [Vector3, Euler][] = [
        [new Vector3(0, s * 0.47, 0), new Euler(0, 0, 0)],
        [new Vector3(s * 0.47, 0, 0), new Euler(0, 0, Math.PI / 2)],
        [new Vector3(0, 0, s * 0.47), new Euler(Math.PI / 2, 0, 0)],
      ];
      const [offset, flat] = sides[Math.floor(random() * sides.length)];
      place(face, offset, flat);
      skin.push(place(face, at, turn));
    }
  }
  return { flesh: mergeGeometries(flesh)!, skin: skin.length ? mergeGeometries(skin)! : undefined };
}

/** A puree: one smooth, soft mound with a swirl on top, as if dropped from a spoon. */
function puree(o: CutOptions): CutShape {
  const random = seededRandom(o.seed ^ 0x9a7ee);
  const radius = Math.min(o.room * 0.92, 3.2 * Math.sqrt(o.holds) + o.radius * 0.5);
  const high = Math.min(radius * 0.42, 2.6);
  const twist = random() * Math.PI * 2;
  const flesh = moundGeometry({
    radius,
    edge: 0.02,
    rings: 36,
    segments: 80,
    height: (x, z, rn) => {
      const dome = high * (1 - rn * rn) ** 0.7;
      // The spoon's swirl: a soft spiral ridge, fading toward the edge and at the very top.
      const swirl = 0.16 * Math.sin(Math.atan2(z, x) * 2 + rn * 9 + twist) * Math.sin(Math.PI * rn) * (1 - rn);
      return (dome + swirl * high) * (1 - rn ** 6);
    },
  });
  return { flesh };
}

export function buildCut(cut: Exclude<Cut, 'Whole'>, options: CutOptions): CutShape {
  if (cut === 'Sliced') return sliced(options);
  if (cut === 'Diced') return cubes(options, 1.3, 22, 0.25);
  if (cut === 'Chopped') return cubes(options, 0.55, 60, 0.9);
  return puree(options);
}
