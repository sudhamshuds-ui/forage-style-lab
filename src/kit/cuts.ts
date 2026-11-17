import { BoxGeometry, BufferGeometry, CylinderGeometry, Euler, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bowlInner, bowlProfile, moundGeometry, spinProfile, type BowlShape } from '../ingredients/forms/kit/bowl';
import { UNITS_PER_CM } from '../ingredients/scale';
import { WEDGE_FACES, wedgeCorners, type Heap } from './tumble';
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
  /** The quantity itself (1 to 5): how many cups of puree. */
  count: number;
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

/** The two kinds of heap: how big a piece is (cm), how many in a middle helping, the share of wedges, and the most there can be. */
export const HEAPS = {
  // Dice: about a third of them wedges.
  Diced: { side: 1.3, perMedium: 44, wedges: 0.3, most: 140 },
  // Chopped: tiny blocks only (a wedge that small reads as a block anyway, and blocks settle
  // faster), and never more than the physics can keep up with.
  Chopped: { side: 0.4, perMedium: 70, wedges: 0, most: 200 },
} as const;
export type HeapCut = keyof typeof HEAPS;
export const isHeap = (cut: Cut): cut is HeapCut => cut === 'Diced' || cut === 'Chopped';
/** How many pieces a helping is. */
export const heapCount = (cut: HeapCut, holds: number) => Math.min(HEAPS[cut].most, Math.max(4, Math.round(HEAPS[cut].perMedium * holds)));

/**
 * A heap as shapes to draw: every piece's flesh merged into one shape, the peel sheets into
 * another. The pieces live in the physics (tumble.ts); `write` copies where they are now into
 * the shapes, so it can be called every frame while they fall.
 *
 * The pieces are not perfect cubes: each block's three sides differ a little, and some are
 * wedges (half a block, cut corner to corner). Edges are sharp. About four in ten blocks keep
 * the peel on one face (an apple cube with one red side).
 */
export interface HeapMesh {
  flesh: BufferGeometry;
  skin?: BufferGeometry;
  write(): void;
}

export function heapMesh(heap: Heap, side: number): HeapMesh {
  // Scene units per unit of the physics (a piece is about one unit big there).
  const k = side * UNITS_PER_CM;
  interface Layer {
    /** For each piece that has something in this layer: its body and its own corners and directions. */
    parts: { body: Heap['pieces'][number]['body']; positions: Float32Array; normals: Float32Array; at: number }[];
    positions: number[];
  }
  const layers: { flesh: Layer; skin: Layer } = { flesh: { parts: [], positions: [] }, skin: { parts: [], positions: [] } };
  const take = (layer: Layer, body: Layer['parts'][number]['body'], geometry: BufferGeometry) => {
    const positions = geometry.getAttribute('position').array as Float32Array;
    const normals = geometry.getAttribute('normal').array as Float32Array;
    layer.parts.push({ body, positions: new Float32Array(positions), normals: new Float32Array(normals), at: layer.positions.length });
    for (const value of positions) layer.positions.push(value);
  };
  heap.pieces.forEach((piece, index) => {
    const [a, b, c] = piece.half;
    if (piece.kind === 'wedge') return take(layers.flesh, piece.body, wedgeGeometry(piece.half));
    take(layers.flesh, piece.body, new BoxGeometry(2 * a, 2 * b, 2 * c).toNonIndexed());
    // The peel: a thin sheet set into one face, a hair proud of it. Which blocks, and which
    // face, depend only on the piece's number, so the heap keeps its peel as it is rebuilt.
    const random = seededRandom(index * 4441 + 7);
    if (random() >= 0.42) return;
    const thin = 0.07;
    const faces: [BufferGeometry, [number, number, number]][] = [
      [new BoxGeometry(2 * a * 1.004, 2 * b * thin, 2 * c * 1.004), [0, b * (1 - thin) + 0.004, 0]],
      [new BoxGeometry(2 * a * thin, 2 * b * 1.004, 2 * c * 1.004), [a * (1 - thin) + 0.004, 0, 0]],
      [new BoxGeometry(2 * a * 1.004, 2 * b * 1.004, 2 * c * thin), [0, 0, c * (1 - thin) + 0.004]],
    ];
    const [sheet, offset] = faces[Math.floor(random() * faces.length)];
    const way = random() < 0.5 ? -1 : 1;
    take(layers.skin, piece.body, sheet.toNonIndexed().translate(offset[0] * way, offset[1] * way, offset[2] * way));
  });

  const build = (layer: Layer) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(layer.positions.length), 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(new Float32Array(layer.positions.length), 3));
    return geometry;
  };
  const flesh = build(layers.flesh);
  const skin = layers.skin.parts.length ? build(layers.skin) : undefined;

  const write = () => {
    for (const [layer, geometry] of [[layers.flesh, flesh], [layers.skin, skin]] as const) {
      if (!geometry) continue;
      const positions = geometry.getAttribute('position').array as Float32Array;
      const normals = geometry.getAttribute('normal').array as Float32Array;
      for (const part of layer.parts) {
        const { x, y, z } = part.body.position;
        const q = part.body.quaternion;
        // The body's turn as nine numbers (a rotation matrix), worked out once per piece.
        const xx = q.x * q.x, yy = q.y * q.y, zz = q.z * q.z, xy = q.x * q.y, xz = q.x * q.z, yz = q.y * q.z, wx = q.w * q.x, wy = q.w * q.y, wz = q.w * q.z;
        const m = [1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy), 2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx), 2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy)];
        for (let i = 0; i < part.positions.length; i += 3) {
          const px = part.positions[i], py = part.positions[i + 1], pz = part.positions[i + 2];
          const nx = part.normals[i], ny = part.normals[i + 1], nz = part.normals[i + 2];
          const o = part.at + i;
          positions[o] = (m[0] * px + m[1] * py + m[2] * pz + x) * k;
          positions[o + 1] = (m[3] * px + m[4] * py + m[5] * pz + y) * k;
          positions[o + 2] = (m[6] * px + m[7] * py + m[8] * pz + z) * k;
          normals[o] = m[0] * nx + m[1] * ny + m[2] * nz;
          normals[o + 1] = m[3] * nx + m[4] * ny + m[5] * nz;
          normals[o + 2] = m[6] * nx + m[7] * ny + m[8] * nz;
        }
      }
      geometry.getAttribute('position').needsUpdate = true;
      geometry.getAttribute('normal').needsUpdate = true;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
  };
  write();
  return { flesh, skin, write };
}

/**
 * A puree is served in a small cup, like a little bowl (the user, 2026-11-17: "lets keep
 * sauce in a small cup similar to bowl, lets get rid of bottle"). The cup is white china; the
 * puree fills it almost to the rim, its top stirred into a swirl. More of it means more cups,
 * one to five, every cup the same size, set out so they never touch.
 */
function cups(o: CutOptions): CutShape {
  const random = seededRandom(o.seed ^ 0x9a7ee);
  const count = Math.max(1, Math.min(5, o.count));
  const shape: BowlShape = { rim: 3.5, height: 3.3, foot: 2.5, footHeight: 0.3, wall: 0.3, fullness: 3.2 };
  // Where the cups stand: neighbours a rim's width plus a finger apart (7.6 cm, middle to middle).
  const gap = shape.rim * 2 + 0.6;
  const ring = (n: number, turn: number): [number, number][] => {
    // n cups evenly round a circle, sized so neighbours are `gap` apart.
    const r = gap / (2 * Math.sin(Math.PI / n));
    return Array.from({ length: n }, (_, i) => [Math.cos(turn + (i / n) * Math.PI * 2) * r, Math.sin(turn + (i / n) * Math.PI * 2) * r]);
  };
  const spots: [number, number][] = count === 1 ? [[0, 0]] : count === 2 ? [[-gap / 2, 0.4], [gap / 2, -0.4]] : ring(count, count === 3 ? Math.PI / 2 : count === 4 ? Math.PI / 4 : -Math.PI / 2);
  const sauces: BufferGeometry[] = [];
  const shells: BufferGeometry[] = [];
  for (const [x, z] of spots) {
    shells.push(plain(spinProfile(bowlProfile(shape, 16), 48)).translate(x, 0, z));
    // The puree: filled to just under the rim, domed a little, with a spiral ridge winding in
    // to the middle as if a spoon had been drawn through it, and a small peak where it lifted.
    const edge = shape.height * 0.8;
    const twist = random() * Math.PI * 2;
    const way = random() < 0.5 ? -1 : 1;
    sauces.push(
      moundGeometry({
        radius: bowlInner(shape, edge) + 0.06,
        edge,
        rings: 30,
        segments: 64,
        height: (px, pz, rn) => {
          const spiral = Math.sin(way * Math.atan2(pz, px) + rn * 13 + twist);
          return 0.2 * (1 - rn * rn) + 0.15 * spiral * Math.sin(Math.PI * Math.min(1, rn * 1.15)) + 0.22 * Math.exp(-((rn / 0.16) ** 2));
        },
      }).translate(x, 0, z),
    );
  }
  return { flesh: mergeGeometries(sauces)!, bottle: mergeGeometries(shells)! };
}

/** The cuts that are built in one go (the heaps, diced and chopped, are built by `heapMesh`). */
export function buildCut(cut: 'Sliced' | 'Puree', options: CutOptions): CutShape {
  return cut === 'Sliced' ? sliced(options) : cups(options);
}
