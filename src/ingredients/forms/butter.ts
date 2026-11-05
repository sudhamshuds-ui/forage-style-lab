import { Vector3, type BufferGeometry } from 'three';
import { smoothMax, smoothMin, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';
import { relaxOnSurface, surfaceNets } from './kit/surfaceNets';
import { roundedIntersection } from './kit/wedge';
import { blockSides, crease, fold, paperSheet, type BlockShape } from './kit/block';
import { sweepGeometry } from './kit/sweep';

/**
 * Butter (archetype: block). Board 08's card: a 12 x 6 x 4 cm block "on a creased paper
 * sheet, one top corner softened and slumping".
 *
 * What makes it butter, not a bar of soap or a block of cheese:
 *   - a block with soft, rounded edges and gently pillowy faces, never a crisp box,
 *   - one top corner (front right, toward the camera) softened in the warmth: it sags,
 *     rounds over and spreads out a little at its foot, into a small pool on the paper,
 *   - two broad melt flows running down from that corner into the pool,
 *   - a knife's scrape across the top, a shallow trough with soft ripples that runs out
 *     over the front edge (a notch in the outline), and the curl it took off lying on
 *     the paper just in front: the classic sign for butter (the user chose it over a knife),
 *   - the wrapper it came in, unfolded under it: flat where the block sits, its flaps
 *     rising a little where they were folded up the sides (fold lines parallel to the
 *     block, diagonal creases at the corners where it was tucked), crumpled here and
 *     there, its edges lifting and one corner curling up.
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   butter  the block, its slump, melt flows, pool and scrape: one piece (surface nets)
 *   curl    the rolled ribbon of butter the knife took off (a small part, like a stem:
 *           left out of the real size)
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

/**
 * The knife's scrape across the top (cm): from a rounded start at the back, toward the
 * camera and out over the front edge. The blade dips in as it goes, so the trough deepens
 * from `entry` to `depth`; soft ripples across it (the knife's chatter) catch the light.
 */
const SCRAPE = {
  from: { x: -1.5, z: -1.5 },
  to: { x: -2.7, z: BLOCK.width / 2 + 0.8 },
  halfWidth: 1.2,
  entry: 0.2,
  depth: 0.85,
  ripple: 0.09,
  rippleEvery: 1.1,
  softness: 0.15,
};

/**
 * The curl: a ribbon of butter rolled up about 1.4 turns, lying on its side on the paper in
 * front of the block, right below where the scrape runs out (cm).
 */
const CURL = {
  at: { x: -2.9, z: BLOCK.width / 2 + 1.45 },
  /**
   * Its turn on the table (radians): its axis about 35 degrees off pointing at the camera, so
   * its rolled spiral end shows (side on, it read as a little log).
   */
  angle: 1.3,
  turns: 1.5,
  inner: 0.28,
  outer: 0.95,
  halfWidth: 1.25,
  thickness: 0.18,
};

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

/**
 * The scrape's cut, as a distance (negative inside): the part of the block the knife took
 * away, above the blade's path and within its width.
 */
function scrapeCut(x: number, y: number, z: number, top: number): number {
  const { from, to } = SCRAPE;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  // How far along the scrape (0 at its start) and how far to the side of its line.
  const along = ((x - from.x) * dx + (z - from.z) * dz) / length;
  const t = Math.max(0, Math.min(1, along / length));
  const side = Math.hypot(x - (from.x + dx * t), z - (from.z + dz * t));
  const footprint = side - SCRAPE.halfWidth;
  // The blade's height: dipping in from the entry depth, with soft ripples across the trough.
  const deepen = smoothstep(0, 0.55, t);
  const ripple = SCRAPE.ripple * Math.sin((along / SCRAPE.rippleEvery) * Math.PI * 2) * deepen;
  const blade = top - (SCRAPE.entry + (SCRAPE.depth - SCRAPE.entry) * deepen) + ripple;
  return Math.max(footprint, blade - y);
}

/** The curl, built standing in its own space and laid on the table at CURL.at. */
function butterCurl(): BufferGeometry {
  // A spiral, growing outward as it turns: the ribbon seen end on.
  const points: Vector3[] = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const a = s * CURL.turns * Math.PI * 2;
    const r = CURL.inner + (CURL.outer - CURL.inner) * s;
    points.push(new Vector3(r * Math.cos(a), r * Math.sin(a), 0));
  }
  // The ribbon's cross-section: wide along the curl's axis, thin across, closing at both ends.
  const geometry = sweepGeometry({
    points,
    radius: () => 1,
    rings: 64,
    segments: 14,
    around: (t, a) => {
      const width = CURL.halfWidth * (0.82 + 0.18 * Math.sin(Math.PI * t));
      const thick = (CURL.thickness / 2) * Math.min(1, Math.sqrt(Math.min(t, 1 - t) / 0.04));
      // The frame's first direction runs along the curl's axis, its second across the ribbon.
      return 1 / Math.hypot(Math.cos(a) / width, Math.sin(a) / Math.max(thick, 1e-4));
    },
  });
  // Lay it on its side: resting on the table, its axis turned along the blade.
  geometry.computeBoundingBox();
  geometry.translate(0, -geometry.boundingBox!.min.y, 0);
  geometry.rotateY(CURL.angle);
  geometry.translate(CURL.at.x, 0, CURL.at.z);
  return geometry;
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
    // The knife's scrape: the trough cut out of the top, softly edged.
    d = smoothMax(d, -scrapeCut(x, y, z, BLOCK.height - SLUMP_SAG * softened(x, z)), SCRAPE.softness);
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
    columns: 52,
    rows: 36,
    ragged: (u, v) => [
      0.012 * Math.sin(outline[0].k * v + outline[0].phase) * Math.abs(u) ** 3,
      0.016 * Math.sin(outline[1].k * u + outline[1].phase) * Math.abs(v) ** 3,
    ],
    height: (x, z, u, v) => {
      // Flat under the butter, its pool and the curl: the paper only rises from about a
      // centimetre out.
      const underCurl = (Math.hypot((x - CURL.at.x) / 1.6, (z - CURL.at.z) / 1.6) - 1) * 1.6;
      const outside = Math.min(butter(x, 0.15, z), underCurl);
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
    { role: 'curl', geometry: butterCurl() },
    { role: 'paper', geometry: paper, doubleSided: true },
  ]);
};
