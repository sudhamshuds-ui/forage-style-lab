import { Euler, Matrix4, Quaternion, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { riceBowlParts } from '../../ingredients/forms/rice';
import { finishPieces, type FormBuilder } from '../../ingredients/forms/kit/piece';
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

  // The avocado: five slices fanned on the right like fallen dominoes, each leaning back on the
  // one behind. Every slice is a pale green lens with a slightly bigger dark green one right
  // behind it (its skin), so each reads as its own slice with a dark rim, never one green disc.
  const slices: BufferGeometry[] = [];
  const peels: BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    // Shingled: each slice lies along the rice, tipped up on its long edge so it rests on the
    // next one, and the row curves a little. Lying like this they read as slices from every
    // side (standing in a row they hid behind each other and looked like one disc).
    const x = 2.5 - 0.5 * Math.sin(t * Math.PI);
    const z = -2.3 + t * 3.9;
    const lean = new Euler(0.65, 1.25 - t * 0.5, 0, 'YXZ');
    const y = surfaceAt(x, z) + 0.55;
    // A long, flat lens: 5 cm long, 2.2 cm wide, under half a centimetre thick.
    const slice = plain(new SphereGeometry(1, 28, 14));
    slice.scale(2.5, 0.2, 1.1);
    place(slice, new Vector3(x, y, z), lean);
    slices.push(slice);
    const peel = plain(new SphereGeometry(1, 28, 14));
    peel.scale(2.62, 0.18, 1.2);
    place(peel, new Vector3(x, y - 0.12, z), lean);
    peels.push(peel);
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

  return finishPieces([
    { role: 'rice', geometry: rice },
    { role: 'bowl', geometry: bowl },
    { role: 'cubes', geometry: mergeGeometries(cubes)! },
    { role: 'slices', geometry: mergeGeometries(slices)! },
    { role: 'peel', geometry: mergeGeometries(peels)! },
    { role: 'seeds', geometry: mergeGeometries(seeds)! },
  ]);
};
