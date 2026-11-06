import { BufferAttribute, Matrix4, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { finishPieces, type FormBuilder, type FormPiece } from './kit/piece';
import { seededRandom } from './kit/random';
import { liftRegion, relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { wedgeDistance, type WedgeShape } from './kit/wedge';

/**
 * Watermelon (archetype: wedge). Board 08's card: two triangular wedges, rind down, one
 * leaning; "Rind is a separate green shell. Pale band between flesh and rind glows." Seeds
 * as dark shapes (deep plum here: never black). L, an 18 cm wedge.
 *
 * Each wedge is a slice of a round melon, cut into a triangle: a slab 4 cm thick with its
 * point at the melon's centre and the rind along its curved side.
 *
 * Composition after the user's reference (2026-11-06), and it has to balance:
 *   - the front wedge lies on one of its straight cut sides (flat on the table, stable), its
 *     rind standing up on the left and its point to the right, its cut face to the camera,
 *   - the back wedge stands upright on its rind, point up, behind and to the right. On its
 *     curved rind it can only rest straight up (leaning, it would roll back), so it does.
 * The pair is built here, in the form, not by the shared cluster layout, which cannot lay a
 * piece on its side.
 *
 * The flesh's colours, from red through a pale band into the green rind, are one soft
 * gradient painted by the shader (the `melon` skin), from a map on the flesh: x runs from the
 * melon's centre (0) to the outside (1), on into the dark rind and its stripes (the separate
 * shell piece is switched off: WITH_SHELL).
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   flesh_glow  one closed slab per wedge (the first is the hero; both get its skin)
 *   rind        the dark green shell: the curved back and a thin edge on each face, lifted
 *               off the slab's own surface like the cheese's rind, so there is no seam; its
 *               own map carries the shader's stripes (the melonRind skin)
 *   seeds       a few glossy seeds, half sunk into the cut faces
 */

/** Grid size for meshing (cm), and how round the slab's edges are (two cells or more). */
const CELL = 0.28;
const ROUNDING = 0.62;
/** The slice (cm): from the point to the outside of the rind, its thickness, half its angle. */
const RADIUS = 16;
const THICK = 4;
const HALF_ANGLE = 0.42;
/** How far in from the outside the dark rind shell reaches (cm). */
const SHELL = 0.32;
/**
 * The separate dark-green shell piece is switched off (the user, 2026-11-06: its edge read as a
 * hard ledge on the faces). The flesh's own gradient now runs on into the dark rind and its
 * stripes (the melon skin). Set true to bring the shell back.
 */
const WITH_SHELL = false;

/**
 * Each wedge: how it is tipped about its point (radians), turned, where its point stands (cm),
 * its size, and its seeds on the front and back faces (angle across the slice, -1 to 1, and
 * distance from the centre, a share of the radius). Placed by hand, a loose few, never in
 * pairs that read as eyes.
 */
const WEDGES = [
  {
    // Lying on its lower cut side: tipped so that side is level (a quarter turn plus the half angle).
    lean: -(Math.PI / 2 + HALF_ANGLE),
    turn: -0.12,
    x: 6.5,
    z: 2.6,
    grow: 1.0,
    // A loose row across the slice: two above one read as a face.
    seeds: { front: [[-0.42, 0.6], [-0.02, 0.67], [0.38, 0.62]], back: [[0.2, 0.55], [-0.3, 0.66]] },
  },
  {
    // Standing upright on its rind, behind and to the right.
    lean: 0,
    turn: 0.22,
    x: 3.2,
    z: -3.9,
    grow: 0.94,
    seeds: { front: [[0.15, 0.58], [-0.35, 0.68]], back: [[-0.1, 0.62]] },
  },
];

/** A seed (cm): a glossy teardrop bead lying flat (thin along Y), its tip toward +X. */
function seedBead(): BufferGeometry {
  const bead = new SphereGeometry(1, 12, 8);
  const p = bead.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const along = p.getX(i);
    const narrow = 1 - 0.45 * Math.max(0, along);
    p.setXYZ(i, along * 0.5, p.getY(i) * 0.16, p.getZ(i) * 0.3 * narrow);
  }
  bead.deleteAttribute('uv'); // a map would make it a leaf
  return bead;
}

export const buildWatermelon: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Watermelon: the "${state}" form is not built yet (wedges only for now).`);

  const random = seededRandom(seed ^ 0x3e10);
  const flesh: BufferGeometry[] = [];
  const shells: BufferGeometry[] = [];
  const seeds: BufferGeometry[] = [];

  for (const place of WEDGES) {
    const shape: WedgeShape = { radius: RADIUS * place.grow, height: THICK, halfAngle: HALF_ANGLE, rounding: ROUNDING };
    const R = shape.radius;
    // A gentle seeded wobble on the cut faces, so they are cut by hand, never machined.
    const k = [0.3 + random() * 0.3, 0.3 + random() * 0.3, random() * 6.28];
    const slab = (x: number, y: number, z: number) =>
      wedgeDistance(shape, x, y, z) + 0.03 * Math.sin(k[0] * x + k[1] * z + k[2]) * Math.min(1, Math.hypot(x, z) / 3);

    // Mesh it in its own space: lying on a face, the point at the origin, the slice running
    // along +X to the rind. The grid starts at odd offsets (never on a flat face).
    const min = new Vector3(-0.913, -0.617, -R * Math.sin(HALF_ANGLE) - 0.909);
    const max = new Vector3(R + 0.6, THICK + 0.6, R * Math.sin(HALF_ANGLE) + 0.6);
    const mesh = relaxOnSurface(surfaceNets(slab, min, max, CELL), slab, CELL);
    mesh.computeVertexNormals();

    // The map for the shader's flesh-to-rind gradient: how far out from the melon's centre
    // (0 to 1), and the angle across the slice (-1 to 1).
    const pos = mesh.getAttribute('position');
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[2 * i] = Math.hypot(pos.getX(i), pos.getZ(i)) / R;
      uv[2 * i + 1] = Math.atan2(pos.getZ(i), pos.getX(i)) / HALF_ANGLE;
    }
    mesh.setAttribute('uv', new BufferAttribute(uv, 2));

    // The dark green shell: the outermost skin, lifted off the slab's own surface.
    const shell = liftRegion(mesh, (x, _y, z) => Math.hypot(x, z) - (R - SHELL), 0.012);
    // Its own map, for the shader's stripes: across the slice (the melon's angle, -1 to 1) and
    // across the slab's thickness (0 to 1).
    const sp = shell.getAttribute('position');
    const suv = new Float32Array(sp.count * 2);
    for (let i = 0; i < sp.count; i++) {
      suv[2 * i] = Math.atan2(sp.getZ(i), sp.getX(i)) / HALF_ANGLE;
      suv[2 * i + 1] = sp.getY(i) / THICK;
    }
    shell.setAttribute('uv', new BufferAttribute(suv, 2));

    // Seeds: a few glossy beads half sunk into each cut face, tips toward the centre.
    const beads: BufferGeometry[] = [];
    for (const [faceY, list] of [
      [THICK, place.seeds.front],
      [0, place.seeds.back],
    ] as const) {
      for (const [across, out] of list) {
        const angle = across * HALF_ANGLE;
        const bead = seedBead();
        // On the far face, flipped to face out.
        if (faceY === 0) bead.rotateX(Math.PI);
        bead.rotateY(Math.PI - angle + (random() - 0.5) * 0.5);
        // Its middle just under the face: the bead stands a little proud, the rest is buried.
        bead.translate(Math.cos(angle) * R * out, faceY + (faceY === 0 ? 0.05 : -0.05), Math.sin(angle) * R * out);
        beads.push(bead);
      }
    }
    const pips = mergeGeometries(beads);

    // Stand it up, its top face toward the camera (+Z), then tip, turn and place it. Every
    // layer of this wedge moves together.
    const stand = new Matrix4()
      .makeTranslation(place.x, 0, place.z)
      .multiply(new Matrix4().makeRotationY(place.turn))
      .multiply(new Matrix4().makeRotationZ(place.lean))
      .multiply(new Matrix4().makeRotationZ(-Math.PI / 2))
      .multiply(new Matrix4().makeRotationX(Math.PI / 2))
      .multiply(new Matrix4().makeTranslation(0, -THICK / 2, 0));
    const layers = [mesh, shell, pips];
    for (const g of layers) g.applyMatrix4(stand);
    // Each wedge rests on the table on its own.
    mesh.computeBoundingBox();
    const lift = -mesh.boundingBox!.min.y;
    for (const g of layers) g.translate(0, lift, 0);

    flesh.push(mesh);
    shells.push(shell);
    seeds.push(pips);
  }

  const pieces: FormPiece[] = [
    ...flesh.map((geometry) => ({ role: 'flesh_glow', geometry })),
    ...(WITH_SHELL ? [{ role: 'rind', geometry: mergeGeometries(shells), doubleSided: true, keepNormals: true }] : []),
    { role: 'seeds', geometry: mergeGeometries(seeds) },
  ];
  return finishPieces(pieces);
};
