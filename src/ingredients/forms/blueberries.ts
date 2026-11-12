import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { reach, settle, type Oval } from './kit/settle';

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
// The crown stands up a little from the berry, a short collar with raised points (a flat lip read as
// a dent, the user, 2026-11-12: "the crown there can be a bit extrusion").
const CROWN = { size: 0.44, depth: 0.15, lip: 0.13, points: 5 };

export interface Berry extends Oval {
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
      const lip = CROWN.lip * Math.exp(-(((s - 0.92) / 0.34) ** 2)) * (0.4 + 0.6 * point5);
      y += (lip - bowl) * cosT;
      const pinch = 1 - 0.05 * (1 - smoothstep(0.6, 1.1, s));
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

/** The berries touching `b` from below (their centres lower, close enough to touch). */
function supporters(b: Berry, all: Berry[]): Vector3[] {
  const points: Vector3[] = [];
  const n = new Vector3();
  for (const o of all) {
    if (o === b || o.centre.y > b.centre.y - 0.15) continue;
    n.copy(b.centre).sub(o.centre);
    const distance = n.length();
    n.divideScalar(distance);
    // The settle pass leaves ovals a hair apart (it measures conservatively), so "touching" has a little slack.
    if (distance > reach(b, n) + reach(o, n) + 0.09) continue;
    // Where they touch: on the supporter's surface toward this berry.
    points.push(o.centre.clone().addScaledVector(n, reach(o, n)));
  }
  return points;
}

/**
 * Is it held? On the table, yes. Up in the pile, only if the places it touches the berries below
 * surround its centre (seen from above, no gap round it wider than a half turn, with a little
 * slack): held on one side only, it would roll off.
 */
export function isHeld(b: Berry, all: Berry[]): boolean {
  if (b.centre.y < reach(b, new Vector3(0, 1, 0)) + 0.05) return true;
  const points = supporters(b, all);
  if (points.length < 2) return false;
  const angles = points.map((p) => Math.atan2(p.z - b.centre.z, p.x - b.centre.x)).sort((x, y) => x - y);
  let widest = 0;
  for (let i = 0; i < angles.length; i++) {
    const next = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2;
    widest = Math.max(widest, next - angles[i]);
  }
  return widest < Math.PI * 1.08;
}

/** The side a shaky berry is not held on, seen from above (a unit direction on the table). */
function openSide(b: Berry, all: Berry[]): Vector3 {
  const points = supporters(b, all);
  const away = new Vector3();
  for (const p of points) away.add(new Vector3(b.centre.x - p.x, 0, b.centre.z - p.z));
  if (away.lengthSq() < 1e-6) away.set(1, 0, 0);
  return away.normalize();
}

/** The pile: berries dropped, settled into a mound, and held in balance. */
export function settlePile(random: () => number): Berry[] {

  const berries: Berry[] = [];
  for (let i = 0; i < COUNT; i++) {
    const stray = i >= COUNT - STRAYS;
    const size = 1 + signed(random) * 0.1;
    // Crowns point every which way, but more of them up or toward the camera (front, +Z), where
    // they show; never straight down into the table.
    const axis = new Vector3(signed(random), 0.35 + random() * 0.9, signed(random) * 0.6 + 0.45).normalize();
    const angle = random() * Math.PI * 2;
    // Strays only a short roll from the pile (further read as a separate group, the user, 2026-11-12).
    const spread = stray ? 2.2 + random() * 0.4 : random() * 1.6;
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
  const settleOptions = {
    rounds: 360,
    calm: 60,
    gravity: 0.03,
    gap: 0.015,
    step: (b: Berry, falling: boolean) => {
      if (!falling) return;
      const pull = b.stray ? 0.06 : 0.025;
      b.centre.x += (b.home.x - b.centre.x) * pull;
      b.centre.z += (b.home.z - b.centre.z) * pull;
    },
  };
  settle(berries, settleOptions);

  // Balance: a berry up in the pile must be held from below on every side, or it looks as if it
  // should roll off (the user, 2026-11-12: "need a berry underneath it"). First a new berry is
  // tucked in under a shaky berry's open side (it keeps the mound); if it is still shaky after
  // four, it rolls a little toward its open side and settles lower, as it really would (rolling
  // alone flattened the pile into one layer).
  const resettle = { ...settleOptions, rounds: 160, calm: 50 };
  let tucked = 0;
  for (let pass = 0; pass < 24; pass++) {
    const shaky = berries.filter((b) => !isHeld(b, berries));
    if (shaky.length === 0) break;
    if (tucked < 4) {
      const b = shaky[0];
      const open = openSide(b, berries);
      const size = 1 + signed(random) * 0.1;
      berries.push({
        centre: b.centre.clone().addScaledVector(open, b.radius * 1.1).setY(BERRY.half),
        axis: new Vector3(signed(random), 0.4 + random() * 0.8, 0.5 + random() * 0.5).normalize(),
        half: BERRY.half * size,
        radius: BERRY.radius * size,
        roll: random() * Math.PI * 2,
        tint: random(),
        stray: false,
        home: b.centre.clone().setY(0),
        crownTurn: random() * Math.PI * 2,
      });
      tucked++;
    } else {
      for (const b of shaky) {
        const open = openSide(b, berries);
        b.centre.addScaledVector(open, b.radius * 0.45);
        b.centre.y -= b.half * 0.3;
        // It stays where it rolled to: the pile no longer pulls it back up.
        b.home.copy(b.centre).setY(0);
      }
    }
    settle(berries, resettle);
  }
  return berries;
}

export const buildBlueberries: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Blueberries: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0xb1e0b);
  const berries = settlePile(random);
  const pile = mergeGeometries(berries.map((b) => berryGeometry(b, random)))!;
  return finishPieces([{ role: 'berry', geometry: pile }]);
};
