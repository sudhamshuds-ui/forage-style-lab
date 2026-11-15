import { BufferAttribute, BufferGeometry, SphereGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { spinProfile, type ProfilePoint } from './kit/bowl';
import { sweepGeometry } from './kit/sweep';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';

/**
 * Fried egg (archetype: flat, the ninth archetype: fried egg, bacon, tortillas, a loaf's slices).
 * Round 2's tenth ingredient and the first cooked one (the user: "everything raw sometimes isnt
 * appetizing"), after the user's reference (Figma node 148:31, an oil painting of a fried egg).
 *
 * What makes it a fried egg:
 *   - an uneven pool of white, never a circle: a few broad lobes, a frilled rim,
 *   - the rim fried crisp: thin, blistered and curling up off the pan in places,
 *   - the white thick and lumpy with bubbles, rising in a soft collar round the yolk,
 *   - a tall, glossy yolk dome sitting a little off centre.
 *
 * The puddle tool, built here first: a pool described by its outline (a radius round its middle)
 * and a height at every point, meshed as rings from the middle out, with an underside that lies
 * flat on the table and lifts with the rim where it curls.
 *
 * Pieces: white (the hero: the `egg` skin paints the browned lace, the blooms and the bubbles) and
 * yolk (its own family, glossy). The white's maps: uv x: 0 at the middle to 1 at the rim, y: cm
 * from the yolk's centre; ownPos x: how far the rim curls up here (cm), y: how high a bubble
 * stands here (cm), z: the angle round the pool.
 */

const RADIUS = 5.7;
const YOLK = { x: -0.7, z: 0.5, radius: 2.1, height: 1.75 };
const RINGS = 40;
const SEGMENTS = 96;

export const buildEgg: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Fried egg: the "${state}" form is not built yet (sunny side up only for now).`);
  const random = seededRandom(seed ^ 0xe66);
  const ph = Array.from({ length: 10 }, () => random() * Math.PI * 2);
  const bubbles = Array.from({ length: 9 }, () => {
    const a = random() * Math.PI * 2;
    const r = 2.6 + random() * 2.2;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 0.22 + random() * 0.32, w: 0.45 + random() * 0.55 };
  });

  /** The outline: how far the pool reaches at an angle (cm): broad lobes and a small frill. */
  const reach = (a: number) =>
    RADIUS * (1 + 0.11 * Math.sin(2 * a + ph[0]) + 0.08 * Math.sin(3 * a + ph[1]) + 0.05 * Math.sin(5 * a + ph[2])) +
    0.16 * Math.sin(9 * a + ph[3]) + 0.1 * Math.sin(14 * a + ph[4]);
  /** How far the crisp rim curls up off the pan at an angle (cm): high in a few places, flat in others. */
  const curl = (a: number) =>
    0.12 + 0.5 * Math.max(0, Math.sin(2 * a + ph[5])) ** 2 + 0.28 * Math.max(0, Math.sin(5 * a + ph[6])) + 0.1 * Math.sin(11 * a + ph[7]) ** 2;

  /** The underside at (rn, angle): flat on the pan, lifting with the rim. */
  const under = (rn: number, a: number) => curl(a) * smoothstep(0.72, 1, rn) ** 1.8;
  const bubbleAt = (x: number, z: number) => {
    let b = 0;
    for (const k of bubbles) b = Math.max(b, k.h * Math.exp(-(((x - k.x) ** 2 + (z - k.z) ** 2) / (k.w * k.w))));
    return b;
  };
  /** The top at a point. */
  const top = (rn: number, a: number, x: number, z: number) => {
    // Thick in the middle, thinning to a crisp, paper-thin rim.
    let h = 0.5 * (1 - 0.72 * smoothstep(0.25, 1, rn));
    // The soft collar where the white sets round the yolk.
    const dy = Math.hypot(x - YOLK.x, z - YOLK.z);
    h += 0.26 * Math.exp(-(((dy - YOLK.radius * 0.98) / 0.7) ** 2));
    // Bubbles and slow lumps (fading at the rim, which is flat and crisp).
    const inside = 1 - smoothstep(0.8, 0.98, rn);
    h += bubbleAt(x, z) * inside;
    h += 0.06 * Math.sin(x * 1.7 + ph[8]) * Math.sin(z * 1.9 + ph[9]) * inside;
    // A touch thicker at the back, so the top leans toward the low camera (the steak's lesson).
    h += 0.16 * smoothstep(3, -5, z) * inside;
    return under(rn, a) + Math.max(0.05, h);
  };

  // Rings from the middle out: the top, then the underside, sharing the rim.
  const positions: number[] = [];
  const uvs: number[] = [];
  const own: number[] = [];
  const add = (rn: number, a: number, isTop: boolean) => {
    const r = reach(a) * rn;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    positions.push(x, isTop ? top(rn, a, x, z) : under(rn, a), z);
    uvs.push(rn, Math.hypot(x - YOLK.x, z - YOLK.z));
    own.push(under(rn, a), bubbleAt(x, z) * (1 - smoothstep(0.8, 0.98, rn)), a);
  };
  // Rings closer together toward the rim, where the curl and the frill need them.
  const ringAt = (i: number) => 1 - (1 - i / RINGS) ** 1.5;
  add(0, 0, true);
  for (let i = 1; i <= RINGS; i++) for (let j = 0; j < SEGMENTS; j++) add(ringAt(i), (2 * Math.PI * j) / SEGMENTS, true);
  const underStart = positions.length / 3;
  add(0, 0, false);
  for (let i = 1; i < RINGS; i++) for (let j = 0; j < SEGMENTS; j++) add(ringAt(i), (2 * Math.PI * j) / SEGMENTS, false);
  const index: number[] = [];
  const topAt = (i: number, j: number) => 1 + (i - 1) * SEGMENTS + (j % SEGMENTS);
  // The underside's last ring is the top's rim.
  const underAt = (i: number, j: number) => (i === RINGS ? topAt(RINGS, j) : underStart + 1 + (i - 1) * SEGMENTS + (j % SEGMENTS));
  for (let j = 0; j < SEGMENTS; j++) {
    index.push(0, topAt(1, j + 1), topAt(1, j));
    index.push(underStart, underAt(1, j), underAt(1, j + 1));
    for (let i = 1; i < RINGS; i++) {
      index.push(topAt(i, j), topAt(i, j + 1), topAt(i + 1, j + 1), topAt(i, j), topAt(i + 1, j + 1), topAt(i + 1, j));
      index.push(underAt(i, j), underAt(i + 1, j + 1), underAt(i, j + 1), underAt(i, j), underAt(i + 1, j), underAt(i + 1, j + 1));
    }
  }
  const white = new BufferGeometry();
  white.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  white.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  white.setAttribute('ownPos', new BufferAttribute(new Float32Array(own), 3));
  white.setIndex(index);

  // The yolk: a tall dome, a little lopsided, its foot sunk into the white.
  const yolk = new SphereGeometry(1, 40, 28);
  yolk.deleteAttribute('normal');
  yolk.deleteAttribute('uv');
  const yp = yolk.getAttribute('position') as BufferAttribute;
  const baseY = 0.42;
  for (let i = 0; i < yp.count; i++) {
    const x = yp.getX(i);
    const y = yp.getY(i);
    const z = yp.getZ(i);
    const wob = 1 + 0.04 * Math.sin(Math.atan2(z, x) * 2 + ph[1]) + 0.025 * Math.sin(Math.atan2(z, x) * 3 + ph[4]);
    // Fuller shoulders than a ball (a yolk holds its shape like a soft cushion).
    const up = Math.max(0, y);
    const yy = y > 0 ? Math.pow(up, 0.8) * YOLK.height : y * 0.35;
    yp.setXYZ(i, YOLK.x + x * YOLK.radius * wob, Math.max(0.03, baseY + yy), YOLK.z + z * YOLK.radius * wob);
  }

  // The yolk's map for its skin: y its height as a share (0 at its foot in the white, 1 on top).
  {
    const uv = new Float32Array(yp.count * 2);
    for (let i = 0; i < yp.count; i++) uv[2 * i + 1] = Math.min(1, Math.max(0, (yp.getY(i) - baseY) / YOLK.height));
    yolk.setAttribute('uv', new BufferAttribute(uv, 2));
  }

  // The pan (the user, 2026-11-15: "show it in a pan"): a shallow frying pan, a prop. Low, flared
  // walls so the egg still shows from the card's low view; a short handle.
  const PAN = { floor: 7.3, wall: 1.15, flare: 1.25, thick: 0.38 };
  const outline: ProfilePoint[] = [{ r: 0, y: 0, u: 0, v: 0 }, { r: PAN.floor - 0.4, y: 0, u: 0, v: 0 }, { r: PAN.floor + 0.1, y: 0.12, u: 0, v: 0.1 }];
  for (let k = 1; k <= 6; k++) outline.push({ r: PAN.floor + 0.1 + (PAN.flare * k) / 6, y: 0.12 + ((PAN.wall + PAN.thick - 0.12) * k) / 6, u: 0, v: k / 6 });
  // Over the rounded rim, down the inside wall, across the floor.
  outline.push({ r: PAN.floor + PAN.flare + 0.02, y: PAN.wall + PAN.thick + 0.1, u: 0.5, v: 1 });
  outline.push({ r: PAN.floor + PAN.flare - 0.2, y: PAN.wall + PAN.thick + 0.08, u: 0.8, v: 1 });
  for (let k = 5; k >= 0; k--) outline.push({ r: PAN.floor - 0.25 + ((PAN.flare - 0.1) * k) / 6, y: PAN.thick + (PAN.wall * k) / 6 + (k === 0 ? 0 : 0.02), u: 1, v: k / 6 });
  outline.push({ r: 0, y: PAN.thick, u: 1, v: 0 });
  const panBody = spinProfile(outline, 72);
  const rimAt = new Vector3(PAN.floor + PAN.flare - 0.3, PAN.wall + PAN.thick - 0.25, 0);
  const handle = sweepGeometry({
    points: [rimAt, rimAt.clone().add(new Vector3(2.5, 0.75, 0)), rimAt.clone().add(new Vector3(6, 1.5, 0)), rimAt.clone().add(new Vector3(9.5, 1.9, 0))],
    radius: (t) => (0.8 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (t > 0.25 ? 1 : t * 4)) * Math.sqrt(Math.min(1, (1 - t) / 0.06)),
    rings: 22,
    segments: 12,
    // Flatter than round, like a pressed handle.
    around: (_t, a) => 1 / Math.hypot(Math.cos(a), Math.sin(a) / 0.55),
  });
  for (const g of [panBody, handle]) {
    g.deleteAttribute('uv');
  }
  const pan = mergeGeometries([panBody, handle])!;
  // The handle away to the back right; the egg sits on the pan's floor, a little off its middle.
  pan.rotateY(0.6);
  pan.translate(0.5, 0, -0.3);
  white.translate(0, PAN.thick, 0);
  yolk.translate(0, PAN.thick, 0);

  return finishPieces([
    { role: 'white', geometry: white },
    { role: 'yolk', geometry: yolk },
    { role: 'pan', geometry: pan },
  ]);
};
