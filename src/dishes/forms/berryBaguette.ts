import { BufferAttribute, Vector3, type BufferGeometry } from 'three';
import { buildBread } from '../../ingredients/forms/bread';
import { strawberryBody } from '../../ingredients/forms/strawberry';
import { paperSheet } from '../../ingredients/forms/kit/block';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { Table, inCm, plate, posed } from '../kit/place';
import { pool, wobble } from '../kit/pool';

/**
 * Strawberry and melted cheese baguette (baguette + cheese + strawberry; street food, a snack).
 * After the generated reference (Figma node 214:3) and the user's notes (node 235:258,
 * 2026-11-18: "weakest one ... recreate this").
 *
 * Two pieces of the pantry's baguette, each a pressed, toasted sandwich: the loaf cut into a
 * short piece, puffed and pressed out of round (never a neat cylinder), split, its lower half
 * spread with melted cheese that oozes over the edge, strawberry slices and halves on it with a
 * spoon of jam running between them, the top half resting right on the filling (no gap). The cut
 * ends face the camera, showing the layers. One piece rests across the other, on crumpled baking
 * paper.
 */

/** A soft, seeded bump field (cm), for pressing the bread out of round. */
function lumps(random: () => number) {
  const waves = Array.from({ length: 6 }, () => ({ k: new Vector3(signed(random), signed(random) * 0.6, signed(random)).multiplyScalar(0.35 + random() * 0.5), phase: random() * 6 }));
  return (p: Vector3) => waves.reduce((sum, w) => sum + Math.sin(p.dot(w.k) + w.phase), 0) / waves.length;
}

/** Move every point of a shape (and its own frame stays where it was). */
function deform(geometry: BufferGeometry, move: (p: Vector3) => Vector3): void {
  const pos = geometry.getAttribute('position') as BufferAttribute;
  const p = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    const q = move(p.fromBufferAttribute(pos, i).clone());
    pos.setXYZ(i, q.x, q.y, q.z);
  }
  pos.needsUpdate = true;
}

/**
 * A piece of the loaf, `length` cm long, from its middle: pressed a little flatter, puffed in
 * soft lumps, one end a little wider, so it reads as torn and toasted bread, not a turned tube.
 */
function breadPiece(seed: number, random: () => number, length: number): FormPiece[] {
  let pieces = inCm(buildBread({ state: 'baguette', seed }));
  const bump = lumps(random);
  const flare = 0.06 + random() * 0.05;
  for (const piece of pieces) {
    deform(piece.geometry, (p) => {
      const b = bump(p);
      // Pressed: the top comes down a little more than the sides; puffed in soft lumps.
      const fine = bump(p.clone().multiplyScalar(2.6));
      const y = p.y * (0.86 + 0.1 * b + 0.035 * fine);
      const swell = 1 + 0.12 * b + 0.04 * fine + flare * (p.x / 16);
      return new Vector3(p.x + 0.3 * bump(p.clone().multiplyScalar(1.7)), y, p.z * swell);
    });
  }
  // The cut ends: slightly slanted, as a knife goes through a loaf.
  pieces = cutPieces(pieces, knife(new Vector3(length / 2, 0, 0), new Vector3(1, 0, 0.12).normalize()), 'crumb');
  pieces = cutPieces(pieces, knife(new Vector3(-length / 2, 0, 0), new Vector3(-1, 0, 0.08).normalize()), 'crumb');
  // Centred on its middle.
  return posed(pieces, { at: [0, 0, 0] });
}

/** The flesh's map on a cut through a berry: 0 along its pale heart, 1 at the red skin. */
function berryFlesh(half: number, profileAt: (t: number) => number) {
  return (p: Vector3) => {
    const width = Math.max(0.2, profileAt(Math.min(1, Math.max(0, (half - p.y) / (2 * half)))));
    return { uv: [Math.min(1, Math.hypot(p.x, p.z) / width), 0] };
  };
}

/** A strawberry slice, lying flat: cut lengthwise, `thickness` cm thick. */
function berrySlice(random: () => number, thickness: number): FormPiece[] {
  const { berry, half, profileAt } = strawberryBody(random);
  const flesh = berryFlesh(half, profileAt);
  let pieces: FormPiece[] = [{ role: 'berry_glow', geometry: berry }];
  pieces = cutPieces(pieces, knife(new Vector3(0, 0, thickness / 2), new Vector3(0, 0, 1)), 'berryFlesh', flesh);
  pieces = cutPieces(pieces, knife(new Vector3(0, 0, -thickness / 2), new Vector3(0, 0, -1)), 'berryFlesh', flesh);
  return posed(pieces, { tip: -Math.PI / 2 });
}

/**
 * One sandwich, its cut end toward +x. Built whole and filled on a table of its own (bottom bread,
 * melted cheese, strawberry slices, jam, the top bread set right down on them), then cut across
 * its front with the knife, so the bread, the cheese, the berries and the jam all show their
 * layers at the cut, like the reference. The cheese oozes over the bread's sides.
 */
function sandwich(seed: number, random: () => number): FormPiece[] {
  const bread = breadPiece(seed, random, 15);
  const splitAt = 2.9;
  const bottom = cutPieces(bread, knife(new Vector3(0, splitAt, 0), new Vector3(0, 1, 0)), 'crumb');
  const top = cutPieces(bread, knife(new Vector3(0, splitAt, 0), new Vector3(0, -1, 0)), 'crumb');
  // (Nothing past the bread's edge falls away: the table's floor is just under the crumb.)
  const table = new Table(() => splitAt - 0.4, 0.15);
  table.add(bottom);

  // Melted cheese spread over the crumb, oozing a little way over its sides in soft lobes.
  const cheese = pool({
    outline: (a) => (1 / Math.hypot(Math.cos(a) / 7.0, Math.sin(a) / 4.7)) * (1 + 0.06 * Math.sin(5 * a + seed) + 0.05 * Math.sin(9 * a + seed * 2)),
    at: [0, 0],
    depth: 0.3,
    edge: 0.3,
    floor: (x, z) => table.height(x, z) - 0.04,
    rings: 30,
    segments: 120,
  });
  table.add([{ role: 'cheese', geometry: cheese }]);

  // Strawberry slices lying flat in two loose rows along the sandwich, overlapping a little.
  const slices: FormPiece[][] = [];
  for (let k = 0; k < 10; k++) {
    const x = -6 + (k % 5) * 2.7 + signed(random) * 0.3;
    const z = (k < 5 ? -1.2 : 1.2) + signed(random) * 0.3;
    const s = posed(berrySlice(random, 0.65), { turn: random() * Math.PI * 2, scale: 1.05 });
    slices.push(table.rest(posed(s, { at: [x, 8, z] }), { tilt: 0.08, sink: 0.2 }));
  }

  // Strawberry jam spooned over the berries, dark and glossy, running into the gaps.
  const jam = pool({
    outline: wobble(4.2, [[2, 0.2, random() * 6], [3, 0.12, random() * 6], [6, 0.06, random() * 6]]),
    at: [0, 0],
    depth: 0.16,
    edge: 0.45,
    floor: (x, z) => table.height(x, z) - 0.06,
    rings: 26,
    segments: 110,
  });
  jam.scale(1.45, 1, 0.75);
  table.add([{ role: 'jam', geometry: jam }]);

  // The top half set right down on the filling: no gap.
  const lid = table.rest(posed(top, { at: [0, 1.2, 0] }), { tilt: 0.06, sink: 0.04, add: false });

  // Cut across the front: every layer shows its section.
  const front = knife(new Vector3(4.6, 0, 0), new Vector3(1, 0, -0.1).normalize());
  const parts: FormPiece[] = [
    ...cutPieces(bottom, front, 'crumb'),
    ...cutPieces(lid, front, 'crumb'),
    ...cutPieces([{ role: 'cheese', geometry: cheese }], front, 'cheese'),
    ...cutPieces([{ role: 'jam', geometry: jam }], front, 'jam'),
    ...slices.flatMap((slice) => cutPieces(slice, front, 'berryFlesh', 'radial')),
  ];

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

  // The two sandwiches, their cut ends toward the camera (+x turned to +z): the lower one on the
  // paper, the upper one resting across it, a little back and turned.
  const table = new Table(() => 0.25, 0.2);
  const lower = table.rest(posed(sandwich(seed, random), { turn: -Math.PI / 2 + 0.25, at: [-0.3, 2, 1.3] }), { tilt: 0.06 });
  const upper = table.rest(posed(sandwich((seed + 7919) >>> 0, random), { turn: -Math.PI / 2 - 0.18, at: [0.6, 12, -1.0] }), { tilt: 0.18, sink: 0.1 });
  parts.push(...lower, ...upper);
  parts.push({ role: 'paper', geometry: paper, doubleSided: true });
  return plate(parts);
};
