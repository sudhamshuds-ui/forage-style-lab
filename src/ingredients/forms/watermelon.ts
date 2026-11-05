import { CircleGeometry, Matrix4, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { finishPieces, type FormBuilder, type FormPiece } from './kit/piece';
import { seededRandom } from './kit/random';
import { liftRegion, relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { wedgeDistance, type WedgeShape } from './kit/wedge';

/**
 * Watermelon (archetype: wedge). Board 08's card: two triangular wedges, rind down, one
 * leaning; "Rind is a separate green shell. Pale band between flesh and rind glows." Black
 * seeds as flat shapes (painted deep plum here: never black). L, an 18 cm wedge.
 *
 * Each wedge is a slice of a round melon, cut into a triangle: a flat slab (3 cm thick) with
 * its point at the melon's centre and the rind along its curved bottom. It stands on that
 * curve, point up, like on the card.
 *
 * The pair is built here, in the form, not by the shared cluster layout: the front wedge
 * leans over (turned about its own point, so its rind still rests on the table), the back
 * one stands upright behind it and to the right. The layout cannot lean a piece.
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   flesh_glow  the red flesh: one closed slab per wedge (the first is the hero)
 *   band_glow   the pale band between flesh and rind, lifted off the slab as a thin skin
 *   rind        the green shell: the curved back and a strip of each face, lifted the same way
 *   seeds       flat teardrop seeds on both cut faces
 * The band and rind are skins lifted off the flesh's own surface (like the cheese's rind), so
 * the slab shades as one piece with no seam, and the board's "separate shell" is its own layer.
 */

/** Grid size for meshing (cm), and how round the slab's edges are (two cells or more). */
const CELL = 0.36;
const ROUNDING = 0.75;
/** The slice (cm): from the point to the outside of the rind, its thickness, half its angle. */
const RADIUS = 16;
const THICK = 3;
const HALF_ANGLE = 0.42;
/** How deep the green rind and the pale band reach in from the outside (cm). */
const RIND = 1.0;
const BAND = 1.9;

/** How each wedge sits: its lean (radians, about its point), turn, and where it stands (cm). */
const WEDGES = [
  // In front and to the left, leaning over toward the other, its cut face to the camera.
  { lean: -0.36, turn: 0.12, x: -4.2, z: 2.1, grow: 1.0 },
  // Behind and to the right, partly hidden by the front one (as on the card), standing up.
  { lean: 0.05, turn: -0.18, x: 2.2, z: -2.6, grow: 0.94 },
];

/** A flat teardrop seed (cm), lying in the XZ plane facing up, its tip toward +X. */
function seedShape(): BufferGeometry {
  const seed = new CircleGeometry(1, 12);
  const p = seed.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    // Along (x) and across (y) before laying it down: narrower toward the tip.
    const along = p.getX(i);
    const across = p.getY(i);
    p.setXY(i, along * 0.42, across * 0.24 * (1 - 0.45 * Math.max(0, along)));
  }
  seed.deleteAttribute('uv'); // a map would make it a leaf
  seed.rotateX(-Math.PI / 2);
  return seed;
}

export const buildWatermelon: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Watermelon: the "${state}" form is not built yet (wedges only for now).`);

  const random = seededRandom(seed ^ 0x3e10);
  const flesh: BufferGeometry[] = [];
  const bands: BufferGeometry[] = [];
  const rinds: BufferGeometry[] = [];
  const seeds: BufferGeometry[] = [];

  for (const place of WEDGES) {
    const shape: WedgeShape = { radius: RADIUS * place.grow, height: THICK, halfAngle: HALF_ANGLE, rounding: ROUNDING };
    const R = shape.radius;
    // A gentle seeded wobble on the cut faces, so they are cut by hand, never machined.
    const k = [0.3 + random() * 0.3, 0.3 + random() * 0.3, random() * 6.28];
    const slab = (x: number, y: number, z: number) =>
      wedgeDistance(shape, x, y, z) + 0.03 * Math.sin(k[0] * x + k[1] * z + k[2]) * Math.min(1, Math.hypot(x, z) / 3);

    // Mesh it in its own space: standing on its face, the point at the origin, the slice
    // running along +X to the rind. The grid starts at odd offsets (never on a flat face).
    const min = new Vector3(-0.913, -0.617, -R * Math.sin(HALF_ANGLE) - 0.909);
    const max = new Vector3(R + 0.6, THICK + 0.6, R * Math.sin(HALF_ANGLE) + 0.6);
    const mesh = relaxOnSurface(surfaceNets(slab, min, max, CELL), slab, CELL);
    mesh.computeVertexNormals();

    // The pale band and the green rind: skins lifted off the slab's own surface, by how far
    // each point is from the melon's centre (the slice's point).
    const reach = (x: number, z: number) => Math.hypot(x, z);
    const band = liftRegion(mesh, (x, _y, z) => Math.min(reach(x, z) - (R - BAND), R - RIND - reach(x, z)), 0.012);
    const rind = liftRegion(mesh, (x, _y, z) => reach(x, z) - (R - RIND), 0.012);

    // Seeds: a loose ring of flat teardrops on both cut faces, tips toward the centre.
    const drops: BufferGeometry[] = [];
    const count = 5 + Math.floor(random() * 3);
    // A little off the face, clear of its gentle wobble (at 0.02 the wobble buried them).
    for (const face of [THICK + 0.09, -0.09]) {
      for (let i = 0; i < count; i++) {
        const angle = HALF_ANGLE * 0.75 * (2 * ((i + 0.5 + (random() - 0.5) * 0.5) / count) - 1);
        const r = R * (0.5 + 0.22 * random());
        const drop = seedShape();
        // Face down on the far face (flipped first), then the tip toward the centre, a
        // little askew.
        if (face < 0) drop.rotateX(Math.PI);
        drop.rotateY(Math.PI - angle + (random() - 0.5) * 0.5);
        drop.translate(Math.cos(angle) * r, face, Math.sin(angle) * r);
        drops.push(drop);
      }
    }
    const pips = mergeGeometries(drops);

    // Stand it up on its rind, point up, its top face toward the camera (+Z), then lean,
    // turn and place it. Every layer of this wedge moves together.
    const stand = new Matrix4()
      .makeTranslation(place.x, 0, place.z)
      .multiply(new Matrix4().makeRotationY(place.turn))
      .multiply(new Matrix4().makeRotationZ(place.lean))
      .multiply(new Matrix4().makeRotationZ(-Math.PI / 2))
      .multiply(new Matrix4().makeRotationX(Math.PI / 2))
      .multiply(new Matrix4().makeTranslation(0, -THICK / 2, 0));
    const layers = [mesh, band, rind, pips];
    for (const g of layers) g.applyMatrix4(stand);
    // Each wedge rests on the table on its own rind.
    mesh.computeBoundingBox();
    const lift = -mesh.boundingBox!.min.y;
    for (const g of layers) g.translate(0, lift, 0);

    flesh.push(mesh);
    bands.push(band);
    rinds.push(rind);
    seeds.push(pips);
  }

  const pieces: FormPiece[] = [
    ...flesh.map((geometry) => ({ role: 'flesh_glow', geometry })),
    { role: 'band_glow', geometry: mergeGeometries(bands), doubleSided: true, keepNormals: true },
    { role: 'rind', geometry: mergeGeometries(rinds), doubleSided: true, keepNormals: true },
    { role: 'seeds', geometry: mergeGeometries(seeds), doubleSided: true },
  ];
  return finishPieces(pieces);
};
