import { Euler, Matrix4, Quaternion, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { riceBowlParts } from '../../ingredients/forms/rice';
import { avocadoBody, avocadoProfile } from '../../ingredients/forms/avocado';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { cutPieces, knife } from '../kit/cut';
import { Table, plate, posed } from '../kit/place';

/**
 * Watermelon "tuna" rice bowl (rice + watermelon + avocado; a main, unexpected).
 * After the generated reference (Figma node 214:5) and the user's notes (node 240:56,
 * 2026-11-18: "half watermelon half avocado over the rice ... slices stacked like the ref form a
 * curve ... the elements should lay on the rice gently ... add some colour to the rice").
 *
 * The pantry's rice bowl, the rice warmer (cooked), with the toppings resting on it: seared
 * watermelon cubes grouped over the left half, a fan of avocado slices over the right half in a
 * curve, each slice a D cut across a half avocado (dark skin round its dome, creamy flesh to
 * bright green), leaning on the one before; black sesame over the cubes.
 */

/** A rounded cube with its flesh map: 0 in its middle, 1 at its corners (seared edges). */
function cube(size: number, random: () => number): BufferGeometry {
  const g = new RoundedBoxGeometry(size, size * (0.85 + random() * 0.2), size * (0.9 + random() * 0.2), 4, size * 0.18);
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) uv.setXY(i, Math.min(1, Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)) / (size * 0.8)), 0);
  return g;
}

/**
 * Avocado slices like the user's reference photo: a half avocado lying cut side down, sliced
 * across into D-shaped slices (the dark skin round the dome, the flat side down). Built in the
 * fruit's own frame (standing, its axis up): the half is z <= 0, each slice a band of height.
 */
function avocadoSlices(random: () => number, count: number, thickness: number): FormPiece[][] {
  const body = avocadoBody(random);
  // The flesh's map, for the avocado skin: y how far in from the skin (cm), so the flesh runs
  // creamy yellow at the middle to bright green at the skin.
  const flesh = (p: Vector3) => ({ uv: [0.5, Math.max(0.05, avocadoProfile(p.y) - Math.hypot(p.x, p.z))] });
  const half = cutPieces([{ role: 'avocado_glow', geometry: body }], knife(new Vector3(), new Vector3(0, 0, 1)), 'avocado_glow', flesh);
  const slices: FormPiece[][] = [];
  const start = -2.6;
  for (let k = 0; k < count; k++) {
    const y0 = start + k * thickness;
    let s = cutPieces(half, knife(new Vector3(0, y0 + thickness, 0), new Vector3(0, 1, 0)), 'avocado_glow', flesh);
    s = cutPieces(s, knife(new Vector3(0, y0, 0), new Vector3(0, -1, 0)), 'avocado_glow', flesh);
    // Standing on its flat side, dome up, its faces looking along z; centred on its foot.
    const up = posed(s, new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, 0))));
    slices.push(posed(up, { at: [0, 0, -(y0 + thickness / 2)] }));
  }
  return slices;
}

export const buildWatermelonBowl: FormBuilder = ({ seed }) => {
  // The rice nearly level with the rim, gently domed (the reference), so the toppings lie over it.
  const { rice, bowl, surfaceAt } = riceBowlParts(seed, 0.35);
  const random = seededRandom(seed ^ 0xd15b);
  const table = new Table(surfaceAt, 0.15);
  const parts: FormPiece[] = [{ role: 'rice', geometry: rice }, { role: 'bowl', geometry: bowl }];

  // The watermelon: rounded cubes grouped over the left half, a few on a second layer, each set
  // down where it lands on the rice and its neighbours.
  const spots: [number, number][] = [[-3.0, -1.6], [-1.5, -2.4], [-3.4, 0.2], [-1.8, -0.6], [-3.0, 1.9], [-1.4, 1.2], [-0.4, -1.3], [-0.6, 0.6], [-2.3, -0.8], [-2.0, 0.9], [-1.0, 2.4]];
  for (const [x, z] of spots) {
    const size = 1.3 + random() * 0.25;
    const c: FormPiece[] = [{ role: 'cubes', geometry: cube(size, random) }];
    const turned = posed(c, { turn: random() * Math.PI, tip: signed(random) * 0.25, roll: signed(random) * 0.25 });
    parts.push(...table.rest(posed(turned, { at: [x, 14, z + 0.8] }), { tilt: 0.3, sink: 0.12 }));
  }

  // The avocado fan over the right half: slices leaning forward on each other along a curve.
  const slices = avocadoSlices(random, 7, 0.55);
  slices.forEach((slice, k) => {
    const t = k / (slices.length - 1);
    // Along a gentle arc from the back to the front, the fan turning as it goes.
    const x = 1.6 + 1.4 * Math.sin(t * Math.PI * 0.9);
    const z = -2.2 + t * 5.4;
    // Tipped back onto the slice behind it, its face looking up and toward the camera.
    const leaned = posed(posed(slice, { tip: -0.95, scale: 0.56 }), { turn: -0.35 + t * 0.7 });
    parts.push(...table.rest(posed(leaned, { at: [x, 14, z] }), { tilt: 0.06, sink: 0.08 }));
  });

  // Black sesame over the cubes and the rice beside them.
  const seeds: BufferGeometry[] = [];
  for (let i = 0; i < 30; i++) {
    const x = -2.2 + signed(random) * 2.0;
    const z = signed(random) * 2.8;
    const s = new SphereGeometry(1, 8, 6);
    s.scale(0.2, 0.09, 0.12);
    s.applyMatrix4(new Matrix4().compose(new Vector3(x, table.height(x, z) + 0.05, z), new Quaternion().setFromEuler(new Euler(0, random() * Math.PI, 0)), new Vector3(1, 1, 1)));
    seeds.push(s);
  }
  for (const s of seeds) parts.push({ role: 'seeds', geometry: s });
  return plate(parts);
};
