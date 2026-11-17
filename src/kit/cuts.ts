import { BoxGeometry, BufferGeometry, CylinderGeometry, Euler, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bowlInner, bowlProfile, moundGeometry, spinProfile, type BowlShape } from '../ingredients/forms/kit/bowl';
import { WEDGE_FACES, tumble, wedgeCorners } from './tumble';
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
  /** A puree's cup. */
  bottle?: BufferGeometry;
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

/** A wedge as a shape to draw: flat faces, sharp edges (the same corners the physics used). */
function wedgeGeometry(half: [number, number, number]): BufferGeometry {
  const corners = wedgeCorners(...half);
  const positions: number[] = [];
  for (const face of WEDGE_FACES) {
    // Each face as a fan of triangles from its first corner.
    for (let i = 1; i < face.length - 1; i++) for (const k of [face[0], face[i], face[i + 1]]) positions.push(...corners[k]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  // Flat faces: every triangle's own direction (and the same layers as a block, so they merge).
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A heap of small pieces, dropped and settled with real physics (tumble.ts): each rests on the
 * table or on its neighbours at whatever tilt it landed, so nothing cuts into anything and
 * nothing balances where it could not.
 *
 * `side` is a piece's size in cm: dice are about 1.3 cm, finely chopped pieces a quarter of
 * that and many more of them. The pieces are not perfect cubes: each block's three sides
 * differ a little, and some are wedges (half a block, cut corner to corner). Edges are sharp.
 * Some blocks keep the peel on one face.
 */
function heap(o: CutOptions, side: number, perMedium: number, wedges: number, most: number): CutShape {
  const random = seededRandom(o.seed ^ 0xd1ced);
  const count = Math.min(most, Math.max(4, Math.round(perMedium * o.holds)));
  const scale = new Matrix4().makeScale(side, side, side);
  const flesh: BufferGeometry[] = [];
  const skin: BufferGeometry[] = [];
  for (const piece of tumble(count, wedges)) {
    const [a, b, c] = piece.half;
    // The settle is worked out with pieces about one unit big: place each, then scale to size.
    const set = (geometry: BufferGeometry) => geometry.applyMatrix4(piece.matrix).applyMatrix4(scale);
    if (piece.kind === 'wedge') {
      flesh.push(set(wedgeGeometry(piece.half)));
      continue;
    }
    flesh.push(set(plain(new BoxGeometry(2 * a, 2 * b, 2 * c)).toNonIndexed()));
    // About four in ten blocks keep the peel on one face (an apple cube with one red side):
    // a thin sheet set into that face, a hair proud of it.
    if (random() < 0.42) {
      const thin = 0.07;
      const faces: [BufferGeometry, Vector3][] = [
        [new BoxGeometry(2 * a * 1.004, 2 * b * thin, 2 * c * 1.004), new Vector3(0, b * (1 - thin) + 0.004, 0)],
        [new BoxGeometry(2 * a * thin, 2 * b * 1.004, 2 * c * 1.004), new Vector3(a * (1 - thin) + 0.004, 0, 0)],
        [new BoxGeometry(2 * a * 1.004, 2 * b * 1.004, 2 * c * thin), new Vector3(0, 0, c * (1 - thin) + 0.004)],
      ];
      const [sheet, offset] = faces[Math.floor(random() * faces.length)];
      if (random() < 0.5) offset.negate();
      skin.push(set(plain(sheet).toNonIndexed().translate(offset.x, offset.y, offset.z)));
    }
  }
  return { flesh: mergeGeometries(flesh)!, skin: skin.length ? mergeGeometries(skin)! : undefined };
}

/**
 * A puree is served in a small cup, like a little bowl (the user, 2026-11-17: "lets keep
 * sauce in a small cup similar to bowl, lets get rid of bottle"). The cup is white china with
 * straight-ish sides; the puree fills it almost to the rim, its top gently swirled. More of it
 * means more cups, one to three, standing together.
 */
function cups(o: CutOptions): CutShape {
  const random = seededRandom(o.seed ^ 0x9a7ee);
  const count = Math.max(1, Math.min(3, Math.round(o.holds * 1.4)));
  const spots: [number, number][][] = [[[0, 0]], [[-3.7, 0.5], [3.7, -0.5]], [[-3.9, 1.8], [3.9, 1.4], [0.2, -3.9]]];
  const sauces: BufferGeometry[] = [];
  const shells: BufferGeometry[] = [];
  for (const [x, z] of spots[count - 1]) {
    const k = 0.9 + random() * 0.2;
    const shape: BowlShape = { rim: 3.5 * k, height: 3.3 * k, foot: 2.5 * k, footHeight: 0.3, wall: 0.3, fullness: 3.2 };
    shells.push(plain(spinProfile(bowlProfile(shape, 16), 48)).translate(x, 0, z));
    // The puree: filled to just under the rim, a soft swirl on top as if stirred with a spoon.
    const edge = shape.height * 0.8;
    const twist = random() * Math.PI * 2;
    sauces.push(
      moundGeometry({
        radius: bowlInner(shape, edge) + 0.06,
        edge,
        rings: 20,
        segments: 48,
        height: (px, pz, rn) => (0.22 * (1 - rn * rn) + 0.07 * Math.sin(Math.atan2(pz, px) * 2 + rn * 8 + twist) * Math.sin(Math.PI * rn)) * k,
      }).translate(x, 0, z),
    );
  }
  return { flesh: mergeGeometries(sauces)!, bottle: mergeGeometries(shells)! };
}

export function buildCut(cut: Exclude<Cut, 'Whole'>, options: CutOptions): CutShape {
  if (cut === 'Sliced') return sliced(options);
  // Dice: about a third of them wedges. Chopped: tiny blocks only (a wedge that small reads as
  // a block anyway, and blocks settle faster), and never more than the settle can do quickly.
  if (cut === 'Diced') return heap(options, 1.3, 44, 0.3, 140);
  if (cut === 'Chopped') return heap(options, 0.4, 70, 0, 200);
  return cups(options);
}
