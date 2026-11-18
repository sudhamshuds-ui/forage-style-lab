import { Euler, Matrix4, Quaternion, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { riceBowlParts } from '../../ingredients/forms/rice';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import { avocadoBody, avocadoProfile } from '../../ingredients/forms/avocado';
import { cutPieces, knife } from '../kit/cut';
import { plate, posed, setDown, surfaceOf } from '../kit/place';
import { seededRandom } from '../../ingredients/forms/kit/random';

/**
 * Watermelon "tuna" rice bowl: the first dish built in code (after the generated reference on
 * the Figma page "Dish refs (generated)").
 *
 * It is the pantry's own rice bowl with toppings laid on the rice, like adding layers to a
 * pre-comp:
 *   cubes   seared watermelon in rounded cubes, heaped on one side (they pass for tuna)
 *   slices  a fan of avocado slices on the other side, each with its dark skin (`peel`) behind it
 *   seeds   a scatter of dark sesame
 *
 * The cut and cooked forms of ingredients (sliced, diced, seared) will come from the user's
 * "forms of an ingredient" tool later; these toppings are simple stand-ins built here.
 */

/** A shape with only what the pieces need (no texture map: a map would be read as a leaf's). */
function plain(geometry: BufferGeometry): BufferGeometry {
  geometry.deleteAttribute('uv');
  return geometry;
}

/**
 * An avocado slice: a thin lengthwise slice from near the fruit's side (two parallel cuts), lying
 * flat with a cut face up: creamy yellow in the middle, bright green toward the dark skin round it.
 */
function avocadoSlice(random: () => number, thickness: number): FormPiece[] {
  const body = avocadoBody(random);
  const flesh = (p: Vector3) => ({ uv: [0.5, Math.max(0.05, avocadoProfile(p.y) - Math.hypot(p.x, p.z))] });
  const at = 2.3;
  let pieces: FormPiece[] = [{ role: 'avocado_glow', geometry: body }];
  pieces = cutPieces(pieces, knife(new Vector3(at + thickness, 0, 0), new Vector3(1, 0, 0)), 'avocado_glow', flesh);
  pieces = cutPieces(pieces, knife(new Vector3(at, 0, 0), new Vector3(-1, 0, 0)), 'avocado_glow', flesh);
  // Flat (the cut faces up and down), centred, its length along x.
  const flat = posed(pieces, { roll: Math.PI / 2, at: [0, -(at + thickness / 2), 0] });
  return posed(flat, { roll: 0, turn: Math.PI / 2, scale: 0.62 });
}

export const buildWatermelonBowl: FormBuilder = ({ seed }) => {
  const { rice, bowl, surfaceAt, radius } = riceBowlParts(seed);
  const random = seededRandom(seed ^ 0xd15b);
  const place = (geometry: BufferGeometry, at: Vector3, turn: Euler) =>
    geometry.applyMatrix4(new Matrix4().compose(at, new Quaternion().setFromEuler(turn), new Vector3(1, 1, 1)));

  // The watermelon: nine rounded cubes in a loose heap on the left, each turned its own way,
  // a second layer resting on the first.
  const cubes: BufferGeometry[] = [];
  const spots: [number, number, number][] = [
    [-3.1, 1.3, 0], [-1.5, 2.3, 0], [-3.5, -0.5, 0], [-1.6, 0.4, 0], [-2.7, -2.2, 0], [-0.9, -1.5, 0],
    [-2.4, 0.9, 1], [-1.8, -1.0, 1], [-2.9, 2.9, 0], [-0.2, 0.6, 0],
  ];
  for (const [x, z, layer] of spots) {
    const size = 1.25 + random() * 0.3;
    const cube = plain(new RoundedBoxGeometry(size, size * (0.85 + random() * 0.2), size * (0.9 + random() * 0.2), 4, size * 0.2));
    const y = surfaceAt(x, z) + size * (0.2 + layer * 0.62);
    place(cube, new Vector3(x, y, z), new Euler((random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5));
    cubes.push(cube);
  }

  // The avocado: five real slices (the pantry's avocado cut into thin wedges, each with its dark
  // skin along the back), fanned on the right, leaning on each other.
  const slices: FormPiece[] = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const slice = posed(avocadoSlice(random, 0.5), { tip: 0.35 });
    const x = 2.3 - 0.4 * Math.sin(t * Math.PI);
    const z = -2.2 + t * 3.8;
    const laid = posed(slice, { turn: 1.4 - t * 0.5, at: [x, 0, z] });
    const below = surfaceOf(slices, () => -10);
    setDown(laid, (px, pz) => Math.max(surfaceAt(px, pz), below(px, pz) - 0.35), 0.1);
    slices.push(...laid);
  }

  // Sesame: small dark seeds over the cubes and the rice between.
  const seeds: BufferGeometry[] = [];
  for (let i = 0; i < 26; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * radius * 0.62;
    const x = -1.2 + Math.cos(a) * r * 0.8;
    const z = Math.sin(a) * r;
    const seed3 = plain(new SphereGeometry(1, 8, 6));
    seed3.scale(0.2, 0.09, 0.12);
    // On whatever is highest here: a cube if one is under it, else the rice.
    let y = surfaceAt(x, z) + 0.06;
    for (const [cx, cz, layer] of spots) {
      if (Math.abs(x - cx) < 0.6 && Math.abs(z - cz) < 0.6) y = Math.max(y, surfaceAt(cx, cz) + 1.4 * (0.2 + layer * 0.62) + 0.68);
    }
    place(seed3, new Vector3(x, y, z), new Euler((random() - 0.5) * 0.6, random() * Math.PI, (random() - 0.5) * 0.6));
    seeds.push(seed3);
  }

  return plate([
    { role: 'rice', geometry: rice },
    { role: 'bowl', geometry: bowl },
    { role: 'cubes', geometry: mergeGeometries(cubes)! },
    ...slices,
    { role: 'seeds', geometry: mergeGeometries(seeds)! },
  ]);
};
