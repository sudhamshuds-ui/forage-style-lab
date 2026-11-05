import { Vector3 } from 'three';
import { smoothMin, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';
import { relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { roundedIntersection } from './kit/wedge';
import { blockSides, crease, fold, paperSheet, type BlockShape } from './kit/block';

/**
 * Butter (archetype: block). Board 08's card: a 12 x 6 x 4 cm block "on a creased paper
 * sheet, one top corner softened and slumping".
 *
 * What makes it butter, not a bar of soap or a block of cheese:
 *   - a block with soft, rounded edges and gently pillowy faces, never a crisp box,
 *   - one top corner (front right, toward the camera) softened in the warmth: it sags,
 *     rounds over and spreads out a little at its foot, into a small pool on the paper,
 *   - two broad melt flows running down from that corner into the pool,
 *   - the wrapper it came in, unfolded under it: flat where the block sits, its flaps
 *     rising a little where they were folded up the sides (fold lines parallel to the
 *     block, diagonal creases at the corners where it was tucked), crumpled here and
 *     there, its edges lifting and one corner curling up.
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   butter  the block, its slump, melt flows and pool: one piece (meshed with surface nets)
 *   paper   the wrapper under it (a prop: left out of the real size and the card framing)
 */

/**
 * The block before it softens (cm). A little under 12 x 6: the slump and the pool at the
 * front right corner spread it out to about 12 x 6.
 */
const BLOCK: BlockShape = { length: 11.0, height: 4.0, width: 5.3 };
/** How round the edges are (cm): at least two grid cells (CELL), or edges come out saw-toothed. */
const ROUNDING = 0.6;
/** The grid size for meshing (cm): smaller is smoother, but heavier. */
const CELL = 0.3;
/** How gently the faces swell and wobble (cm): pillowy, never lumpy. */
const WOBBLE = 0.06;

/** The softened corner: the top front right (toward the camera). */
const CORNER = { x: BLOCK.length / 2, z: BLOCK.width / 2 };
/** How far the softening reaches from the corner (cm). */
const SLUMP_REACH = 2.6;
/** How far the corner sags (cm), how much rounder it gets, and how far its foot spreads. */
const SLUMP_SAG = 1.2;
const SLUMP_ROUND = 1.3;
const SLUMP_SPREAD = 0.5;

/** Where the wrapper sits: a hair under the block, so the block rests on it. */
const PAPER_Y = -0.03;

/**
 * A melt flow: a broad, raised ribbon of butter running down a face from the softened corner's
 * top edge to height `to`, `wide` cm either side of its line. `face` 'front' runs on the long
 * side facing +Z (along is x), 'end' on the end facing +X (along is z). Small drips with beads
 * were tried first: at this size they read as chips in the surface, not as melt.
 */
interface Drip {
  face: 'front' | 'end';
  along: number;
  to: number;
  wide: number;
}
const DRIPS: Drip[] = [
  { face: 'front', along: CORNER.x - 1.4, to: 0.3, wide: 1.0 },
  { face: 'end', along: CORNER.z - 1.3, to: 0.6, wide: 0.9 },
];

/** How much the corner is softened at (x, z): 1 at the corner, fading out over SLUMP_REACH. */
function softened(x: number, z: number): number {
  const d2 = (x - CORNER.x) ** 2 + (z - CORNER.z) ** 2;
  return Math.exp(-d2 / (SLUMP_REACH * SLUMP_REACH));
}

/** A smooth bump, 1 at the centre line, 0 from `width` out. */
function bump(d: number, width: number): number {
  const t = Math.min(d / width, 1);
  return (1 - t * t) ** 2;
}

export const buildButter: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Butter: the "${state}" form is not built yet (the whole block only for now).`);

  // A few slow waves (seeded, the same on every load): pillowy faces, a softly uneven top.
  const random = seededRandom(seed ^ 0xb077e5);
  const waves = Array.from({ length: 3 }, () => ({
    k: [0.4 + random() * 0.5, 0.6 + random() * 0.6, 0.4 + random() * 0.5],
    phase: random() * Math.PI * 2,
  }));
  const wobble = (x: number, y: number, z: number) =>
    (WOBBLE / waves.length) * waves.reduce((sum, w) => sum + Math.sin(w.k[0] * x + w.k[1] * y + w.k[2] * z + w.phase), 0);

  /** The block with its softened corner (no drips or pool yet). */
  const block = (x: number, y: number, z: number) => {
    const f = softened(x, z);
    // Lower down, the softened corner spreads outward (the butter settles at its foot).
    const spread = SLUMP_SPREAD * f * (1 - smoothstep(0, BLOCK.height * 0.8, y));
    const sides = blockSides(BLOCK, x, y, z, SLUMP_SAG * f, [spread, spread]);
    const w = wobble(x, y, z);
    for (let i = 1; i < sides.length; i++) sides[i] += w;
    // Only the top of the corner rounds over: lower down, its upright edge stays as soft as the
    // others (rounding it all the way down hid the end of the block).
    return roundedIntersection(sides, ROUNDING + SLUMP_ROUND * f * smoothstep(BLOCK.height * 0.3, BLOCK.height, y));
  };

  /** The whole butter: the block, its melt flows (swelling out of the surface) and a small pool. */
  const butter = (x: number, y: number, z: number) => {
    let d = block(x, y, z);
    for (const drip of DRIPS) {
      // Position across the face (`along`) and how close to that face this point is.
      const across = drip.face === 'front' ? x : z;
      const near = drip.face === 'front' ? smoothstep(BLOCK.width / 2 - 1.0, BLOCK.width / 2, z) : smoothstep(BLOCK.length / 2 - 1.0, BLOCK.length / 2, x);
      if (near <= 0) continue;
      // From just over the top edge down to the drip's end: distance to that line on the face.
      const top = BLOCK.height + 0.3;
      const dy = y > top ? y - top : y < drip.to ? drip.to - y : 0;
      const line = Math.hypot(across - drip.along, dy);
      // It thickens a little as it runs down, gathering into the pool.
      const run = smoothstep(top, drip.to, y);
      d -= 0.3 * drip.wide * (0.7 + 0.3 * run) * bump(line, drip.wide) * near;
    }
    // The pool at the softened corner's foot: a low, flat lens of butter on the paper.
    const px = (x - CORNER.x) / 1.5;
    const pz = (z - CORNER.z) / 1.15;
    const pool = (Math.hypot(px, y / 0.35, pz) - 1) * 0.35;
    d = smoothMin(d, pool, 0.8);
    // Nothing below the table.
    return Math.max(d, -y);
  };

  // The grid starts at odd offsets, so its lines never sit exactly on a flat face.
  const min = new Vector3(-BLOCK.length / 2 - 0.913, -0.617, -BLOCK.width / 2 - 0.909);
  const max = new Vector3(BLOCK.length / 2 + 2.6, BLOCK.height + 0.8, BLOCK.width / 2 + 2.4);
  const mesh = relaxOnSurface(surfaceNets(butter, min, max, CELL), butter, CELL);
  mesh.computeVertexNormals();

  // The wrapper, unfolded under the block. Flat under the butter and its pool; outside it,
  // its flaps rise where they were folded up the sides (fold lines parallel to the block, a
  // little way out), relax back down further out, meet in diagonal creases at the corners,
  // and the sheet is crumpled here and there, its edges lifting, one corner curling up.
  const paperRandom = seededRandom(seed ^ 0x9a9e5);
  const r = () => paperRandom();
  // Each flap: how steeply it rises from its fold line (about a centimetre out), where it
  // relaxes, and how much. The back and left rise most (seen behind the block); the front stays
  // flat: a fold right in front of the block showed as a row of dashes (the paint pools where
  // the paper's tone flips).
  const flaps = [
    { side: (x: number, _z: number) => x - BLOCK.length / 2, rise: 0.1 + 0.04 * r(), relax: 2.4 + r(), droop: 0.12 },
    { side: (x: number, _z: number) => -x - BLOCK.length / 2, rise: 0.17 + 0.05 * r(), relax: 2.6 + r(), droop: 0.14 },
    { side: (_x: number, z: number) => z - BLOCK.width / 2, rise: 0.01 * r(), relax: 2.0 + r(), droop: 0.0 },
    { side: (_x: number, z: number) => -z - BLOCK.width / 2, rise: 0.22 + 0.05 * r(), relax: 2.8 + r(), droop: 0.16 },
  ];
  // Crumples: a few seeded crease lines across the sheet, some ridges, some valleys.
  const creases = Array.from({ length: 6 }, () => {
    const a = r() * Math.PI;
    return { nx: Math.cos(a), nz: Math.sin(a), at: (r() - 0.5) * 12, width: 1.4 + r() * 1.6, height: (r() < 0.65 ? 1 : -0.6) * (0.22 + 0.2 * r()) };
  });
  // The edges lift a little (each by its own amount), and one corner curls up.
  const edges = [0.25 + 0.3 * r(), 0.2 + 0.3 * r(), 0.15 + 0.2 * r(), 0.3 + 0.3 * r()];
  const outline = Array.from({ length: 4 }, () => ({ k: 2 + r() * 3, phase: r() * Math.PI * 2 }));

  const paper = paperSheet({
    length: 14.5,
    width: 10,
    angle: 0.16,
    columns: 56,
    rows: 38,
    ragged: (u, v) => [
      0.012 * Math.sin(outline[0].k * v + outline[0].phase) * Math.abs(u) ** 3,
      0.016 * Math.sin(outline[1].k * u + outline[1].phase) * Math.abs(v) ** 3,
    ],
    height: (x, z, u, v) => {
      // Flat under the butter and its pool: the paper only rises from about a centimetre out.
      const outside = butter(x, 0.15, z);
      const free = smoothstep(0.2, 1.4, outside);
      let h = 0;
      for (const flap of flaps) {
        const e = flap.side(x, z) - 1.1;
        h = Math.max(h, flap.rise * fold(e, 0.35) - flap.droop * fold(e - flap.relax, 0.7));
      }
      for (const c of creases) h += c.height * crease(c.nx * x + c.nz * z - c.at, c.width, 0.2);
      h += edges[0] * smoothstep(0.78, 1, u) ** 2 + edges[1] * smoothstep(0.78, 1, -u) ** 2;
      h += edges[2] * smoothstep(0.75, 1, v) ** 2 + edges[3] * smoothstep(0.75, 1, -v) ** 2;
      // The back left corner curls up.
      h += 0.9 * (smoothstep(0.55, 1, -u) * smoothstep(0.45, 1, -v)) ** 2;
      return PAPER_Y + Math.max(0, h) * free;
    },
  });

  return finishPieces([
    { role: 'butter', geometry: mesh },
    { role: 'paper', geometry: paper, doubleSided: true },
  ]);
};
