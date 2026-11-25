import { BufferAttribute, BufferGeometry, Matrix4, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bodyMap, rest } from './kit/maps';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';
import { leafPiece, stemPiece } from './kit/stemLeaf';

/**
 * Lime (archetype: round, whole and cut). Round 3, batch 1, after the user's references (Figma
 * node 184:349: a heap of lime wedges; a whole lime with its stem and leaves; slices in a bowl):
 * one whole lime behind, two wedges lying in front.
 *
 * The wedge tool, built here first (the lemon and the orange can reuse it): a slice of a round
 * fruit cut along its axis, built as three clean sheets (the curved peel and the two flat cut
 * faces) rather than a meshed field, so its cut edges stay clean (the avocado's lesson). A wedge
 * rests the way a real one does: lying on one cut face, the other tipped up toward the camera.
 *
 * Pieces: peel_glow (the whole lime and the wedges, one piece: the `lime` skin paints the peel
 * and, where the map's y is 1, the cut flesh), stem and leaf. Maps: uv.x height share on the
 * whole fruit, or how far out from the wedge's inner edge (0) to the peel (1) on a cut face; uv.y
 * 0 on peel, 1 on a cut face; ownPos the point in the body's own frame (a face: x along the
 * wedge, y out from the edge, z which face).
 */
const RADIUS = 2.65;
const HALF = 2.75;
const profile = (x: number) => RADIUS * (1 - Math.min(1, Math.abs(x) / HALF) ** 2.25) ** (1 / 2.25);

/** One wedge, its axis along x, its inner edge on the axis, `angle` wide (radians). */
function wedge(angle: number, lumps: number): BufferGeometry {
  const along = 26;
  const across = 10;
  const out = 9;
  const positions: number[] = [];
  const uvs: number[] = [];
  const own: number[] = [];
  const index: number[] = [];
  const half = angle / 2;
  const at = (x: number, r: number, a: number) => [x, r * Math.cos(a), r * Math.sin(a)] as const;
  const xAt = (i: number) => -HALF * Math.cos((Math.PI * i) / along);
  const rAt = (i: number) => profile(xAt(i)) * (1 + lumps * Math.sin(xAt(i) * 1.7 + 1));
  /** A sheet of (rows + 1) by (cols + 1) points; `flip` keeps its front facing outward. */
  const sheet = (rows: number, cols: number, point: (i: number, j: number) => { p: readonly [number, number, number]; uv: [number, number]; own: [number, number, number] }, flip: boolean) => {
    const start = positions.length / 3;
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= cols; j++) {
        const v = point(i, j);
        positions.push(...v.p);
        uvs.push(...v.uv);
        own.push(...v.own);
      }
    }
    const id = (i: number, j: number) => start + i * (cols + 1) + j;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (flip) index.push(id(i, j), id(i + 1, j + 1), id(i + 1, j), id(i, j), id(i, j + 1), id(i + 1, j + 1));
        else index.push(id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j), id(i + 1, j + 1), id(i, j + 1));
      }
    }
  };
  // The peel.
  sheet(along, across, (i, j) => {
    const a = -half + (angle * j) / across;
    const p = at(xAt(i), rAt(i), a);
    return { p, uv: [0.5, 0], own: [p[0], p[1], p[2]] };
  }, true);
  // The two cut faces: from the inner edge out to the peel.
  for (const side of [-1, 1]) {
    sheet(along, out, (i, j) => {
      const share = j / out;
      return { p: at(xAt(i), rAt(i) * share, side * half), uv: [share, 1], own: [xAt(i) / HALF, share, side] };
    }, side < 0);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  g.setAttribute('ownPos', new BufferAttribute(new Float32Array(own), 3));
  g.setIndex(index);
  // Lay it on one cut face: that face flat on the table, the other tipped up.
  g.applyMatrix4(new Matrix4().makeRotationX(-(Math.PI / 2 - half)));
  return g;
}

/** The whole lime alone, standing, built round its middle, with its map (dishes cut it into wheels). */
export function limeBody(random: () => number): BufferGeometry {
  const whole = roundBody({
    halfLength: HALF,
    radius: profile,
    lying: false,
    lopsided: 0.5,
    random,
    poleDimple: { depth: 0.07, width: 0.45, ends: 'end' },
    flatBase: 0.2,
    rings: 40,
    segments: 52,
  });
  bodyMap(whole, () => 0);
  return whole;
}

/** The lime's half height and radius (cm). */
export const LIME_SIZE = { half: HALF, radius: RADIUS };

export const buildLime: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Lime: the "${state}" form is not built yet (the whole lime and two wedges only for now).`);
  const random = seededRandom(seed ^ 0x11e3);

  // The whole lime, standing: a slightly oval ball with a small nipple under it and a dip on top.
  const whole = limeBody(random);
  const position = whole.getAttribute('position') as BufferAttribute;
  const top = new Vector3().fromBufferAttribute(position, position.count - 1);
  // Stand it on the table (the recipe builds it round its middle), then put it in its place.
  const place = new Vector3(-1.7, rest(whole), -2.4);
  whole.translate(place.x, 0, place.z);
  top.add(place);

  // Two wedges in front, each its own width and turn, slid clear of the whole lime.
  const wedges = [
    { angle: 1.02, turn: 0.35, at: new Vector3(2.3, 0, 1.5) },
    { angle: 0.86, turn: -0.75, at: new Vector3(-3.1, 0, 2.6) },
  ].map((w) => {
    const g = wedge(w.angle + signed(random) * 0.06, 0.012);
    g.applyMatrix4(new Matrix4().makeRotationY(w.turn));
    // Slide it forward until no point of it is inside the whole lime.
    const p = g.getAttribute('position');
    let z = w.at.z;
    for (let step = 0; step < 60; step++) {
      let hit = false;
      for (let i = 0; i < p.count && !hit; i++) {
        const dx = p.getX(i) + w.at.x - place.x;
        const dz = p.getZ(i) + z - place.z;
        const dy = p.getY(i) - HALF;
        hit = (dx * dx + dz * dz) / (RADIUS + 0.05) ** 2 + (dy * dy) / (HALF + 0.05) ** 2 < 1;
      }
      if (!hit) break;
      z += 0.1;
    }
    g.translate(w.at.x, 0, z);
    return g;
  });

  const stem = stemPiece({ base: top.clone().add(new Vector3(0, -0.04, 0)), height: 0.9, footRadius: 0.15, neckRadius: 0.09, lean: 0.25, leanTurn: random() * Math.PI * 2, segments: 8 });
  const leaves = [0, 1].map((k) => {
    const turn = Math.PI * (0.9 + k * 0.95) + signed(random) * 0.3;
    return {
      role: 'leaf',
      doubleSided: true,
      geometry: leafPiece({
        base: top.clone().add(new Vector3(Math.cos(turn) * 0.05, 0.55 + k * 0.2, Math.sin(turn) * 0.05)),
        turn,
        length: 3.4 + random() * 0.8,
        width: 1.0 + random() * 0.25,
        lift: (d) => 0.22 * d - 0.09 * d * d,
        fold: 0.3,
        twist: signed(random) * 0.5,
      }),
    };
  });
  // (The whole lime has no ownPos frame of its own beyond its position: bodyMap set it before it moved.)
  return finishPieces([{ role: 'peel_glow', geometry: mergeGeometries([whole, ...wedges])! }, { role: 'stem', geometry: stem }, ...leaves]);
};
