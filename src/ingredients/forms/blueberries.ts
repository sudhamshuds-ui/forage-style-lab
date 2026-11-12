import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { settle, type Oval } from './kit/settle';

/**
 * Blueberries (archetype: small, a pile). Round 2's fifth ingredient (docs/ingredients/r2-plan.md),
 * after the user's reference (Figma node 148:12, blueberries in a punnet; the punnet is a later
 * tool, so here a loose pile on the table, the user, 2026-11-11).
 *
 * What makes it a blueberry, not a grape or a sloe:
 *   - small and round, a little flattened (wider than tall),
 *   - a crown at one end: a five-pointed star-shaped crater with a dark centre, its points
 *     raised in a little lip (the dried calyx); the signature, so many crowns face the camera,
 *   - a dusty bloom (painted by the shader).
 *
 * How it is built: each berry is a sphere built by angle from its crown (so the crown has as
 * many rings as it needs), squashed a little and pressed into the star-shaped crater at its
 * crown. The pile settles with the kit's drop-and-nudge pass (the grapes' tool): gravity, the
 * table, berries pushed apart by their true outlines, each drawn a little toward the middle of
 * the pile so it mounds; two strays have rolled a little way off.
 *
 * Pieces: berry, every berry merged into one piece. Its map: x each berry's own mix (one value per
 * berry), y how far from its crown (0 at the crown's centre, 1 at the far pole); the `blueberry`
 * skin paints the bloom, the deep blue where it is rubbed off, and the crown.
 */

/** Berry size (cm): half its width and half its height, before each berry's own variation. */
const BERRY = { radius: 0.72, half: 0.57 };
/** How many berries in the pile, and how many have rolled off. */
const COUNT = 15;
const STRAYS = 2;
/** The crown: its crater's radius as a share of the berry's (at the star's points), and depth (cm). */
const CROWN = { size: 0.44, depth: 0.16, lip: 0.05, points: 5 };

interface Berry extends Oval {
  roll: number;
  tint: number;
  stray: boolean;
  /** Where its pile pulls it (the middle of the pile, or its own resting spot for a stray). */
  home: Vector3;
  crownTurn: number;
}

/**
 * One berry, its crown at +Y: rings by angle from the crown (closer together near it), each a
 * little squashed and lopsided; the star-shaped crater pressed in at the crown.
 */
function berryGeometry(b: Berry, random: () => number): BufferGeometry {
  const rings = 22;
  const segments = 35;
  const lumpTurn = random() * Math.PI * 2;
  const lumps = 0.025;
  const positions: number[] = [];
  const uvs: number[] = [];
  const point = (theta: number, phi: number) => {
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    // A little lopsided, never a perfect ball.
    const bulge = 1 + lumps * Math.sin(2 * phi + lumpTurn) * sinT + 0.03 * cosT;
    let x = b.radius * sinT * Math.cos(phi) * bulge;
    let z = b.radius * sinT * Math.sin(phi) * bulge;
    let y = b.half * cosT;
    // The crown: a five-pointed star crater, its points raised in a lip.
    const along = sinT / CROWN.size;
    // Five pointed sepal tips: the star reaches out at its points, in between its edge is close in.
    const point5 = (0.5 + 0.5 * Math.cos(CROWN.points * (phi - b.crownTurn))) ** 1.2;
    const star = 0.76 + 0.42 * point5;
    const s = along / star;
    if (cosT > 0) {
      const bowl = s < 1 ? CROWN.depth * (1 - s * s) ** 1.5 : 0;
      // The sepals stand up in a lip, highest at their tips.
      const lip = CROWN.lip * Math.exp(-(((s - 0.95) / 0.3) ** 2)) * (0.25 + 0.75 * point5);
      y += (lip - bowl) * cosT;
      const pinch = 1 - 0.08 * (1 - smoothstep(0.6, 1.1, s));
      x *= pinch;
      z *= pinch;
    }
    return { x, y, z };
  };
  // The crown's centre, then rings out to the far pole.
  positions.push(...Object.values(point(0, 0)));
  uvs.push(b.tint, 0);
  for (let k = 1; k < rings; k++) {
    const t = k / rings;
    // Closer rings near the crown, where the star needs them.
    const theta = Math.PI * t ** 1.7;
    for (let j = 0; j < segments; j++) {
      const p = point(theta, (2 * Math.PI * j) / segments);
      positions.push(p.x, p.y, p.z);
      uvs.push(b.tint, theta / Math.PI);
    }
  }
  positions.push(...Object.values(point(Math.PI, 0)));
  uvs.push(b.tint, 1);
  const index: number[] = [];
  const at = (k: number, j: number) => 1 + (k - 1) * segments + (j % segments);
  const last = 1 + (rings - 1) * segments;
  for (let j = 0; j < segments; j++) {
    index.push(0, at(1, j + 1), at(1, j));
    index.push(last, at(rings - 1, j), at(rings - 1, j + 1));
  }
  for (let k = 1; k < rings - 1; k++) {
    for (let j = 0; j < segments; j++) index.push(at(k, j), at(k, j + 1), at(k + 1, j + 1), at(k, j), at(k + 1, j + 1), at(k + 1, j));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(index);
  // Turn it so its crown points along its axis, rolled at random, and put it in place.
  const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.axis);
  const roll = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), b.roll);
  geometry.applyMatrix4(new Matrix4().compose(b.centre, turn.multiply(roll), new Vector3(1, 1, 1)));
  return geometry;
}

export const buildBlueberries: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Blueberries: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0xb1e0b);

  const berries: Berry[] = [];
  for (let i = 0; i < COUNT; i++) {
    const stray = i >= COUNT - STRAYS;
    const size = 1 + signed(random) * 0.1;
    // Crowns point every which way, but more of them up or toward the camera (front, +Z), where
    // they show; never straight down into the table.
    const axis = new Vector3(signed(random), 0.35 + random() * 0.9, signed(random) * 0.6 + 0.45).normalize();
    const angle = random() * Math.PI * 2;
    const spread = stray ? 3.3 + random() * 0.8 : random() * 1.6;
    const home = stray
      ? new Vector3(Math.cos(angle) * spread, 0, Math.abs(Math.sin(angle)) * spread * 0.8 + 0.6)
      : new Vector3(0, 0, 0);
    berries.push({
      centre: new Vector3(Math.cos(angle) * spread, 0.8 + random() * 2.2, Math.sin(angle) * spread),
      axis,
      half: BERRY.half * size,
      radius: BERRY.radius * size,
      roll: random() * Math.PI * 2,
      tint: random(),
      stray,
      home,
      crownTurn: random() * Math.PI * 2,
    });
  }

  // Settle: the pile mounds toward its middle; strays roll to their own spots.
  settle(berries, {
    rounds: 360,
    calm: 60,
    gravity: 0.03,
    gap: 0.015,
    step: (b, falling) => {
      if (!falling) return;
      const pull = b.stray ? 0.06 : 0.025;
      b.centre.x += (b.home.x - b.centre.x) * pull;
      b.centre.z += (b.home.z - b.centre.z) * pull;
    },
  });

  const pile = mergeGeometries(berries.map((b) => berryGeometry(b, random)))!;
  return finishPieces([{ role: 'berry', geometry: pile }]);
};
