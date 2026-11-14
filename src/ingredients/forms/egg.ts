import { BufferAttribute, BufferGeometry, SphereGeometry } from 'three';
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

  return finishPieces([
    { role: 'white', geometry: white },
    { role: 'yolk', geometry: yolk },
  ]);
};
