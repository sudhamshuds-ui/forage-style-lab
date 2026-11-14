import { BufferAttribute, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stemmedLeafGeometry, type StemmedLeaf } from './kit/leafy';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';

/**
 * Cabbage (archetype: leafy). Round 2's eighth ingredient, the last leafy one, after the user's
 * reference (Figma node 183:289, a watercolour green cabbage; it replaces the napa cabbage first
 * tried here, which is in history).
 *
 * Round 2 (the user, 2026-11-14: "the leaves are jagged, and the centre is just a ball instead of
 * leaves"): every leaf is a real leaf now, the head's too. Round 1's head was one blended surface,
 * which smoothed its leaf edges away into a ball.
 *
 * How it is built, like wrapping a cabbage by hand:
 *   1. A hidden core ball.
 *   2. Head leaves: big, pale leaves laid over the ball one after another, each from low on one
 *      side up and over the top. Each rests on the ones already there: a height map of the ball
 *      (`cover`, by direction from its middle) remembers how far out the leaves reach, so the next
 *      leaf steps softly up over an earlier leaf's edge and never passes through it. Their edges
 *      cross the head in arcs, each with a small lifted lip.
 *   3. Wrapper leaves: bigger, darker leaves cupped round the head from near its base, in two
 *      rings (an inner three, then an outer three in the gaps), their round tops flaring out with
 *      a slow, soft wave. Round outlines and slow waves: round 1's pointed tips and quick ruffles
 *      read as jagged.
 * The veins (a pale midrib, side veins branching out) and colours are the cabbage skin's.
 */

/** The head's radius (cm) and how high its middle sits. */
const R = 6.0;
const CY = R * 0.9;
const HEAD_LEAVES = 7;
/** The height map's grid: rows from straight down to straight up, columns round. */
const ROWS = 96;
const COLS = 192;
/** How far outside a leaf's edge the next leaf starts to rise over it (radians on the ball). */
const MARGIN = 0.13;

/** A direction from the head's middle: theta from straight down (0) to straight up (pi). */
function dir(theta: number, phi: number): Vector3 {
  return new Vector3(Math.sin(theta) * Math.cos(phi), -Math.cos(theta), Math.sin(theta) * Math.sin(phi));
}

/** The volume a closed mesh encloses (positive when its faces point outward). */
function signedVolumeOf(g: BufferGeometry): number {
  const p = g.getAttribute('position');
  const index = g.getIndex()!;
  let v = 0;
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t), b = index.getX(t + 1), c = index.getX(t + 2);
    v += (p.getX(a) * (p.getY(b) * p.getZ(c) - p.getZ(b) * p.getY(c)) - p.getY(a) * (p.getX(b) * p.getZ(c) - p.getZ(b) * p.getX(c)) + p.getZ(a) * (p.getX(b) * p.getY(c) - p.getY(b) * p.getX(c))) / 6;
  }
  return v;
}

/** One leaf lying on the ball: where it starts, which way it runs, how long and wide it is. */
interface BallLeaf {
  /** Its base (a direction from the middle), the way it runs, and its sideways direction. */
  b: Vector3;
  t: Vector3;
  s: Vector3;
  /** Its length as an angle on the ball (radians). */
  arc: number;
  /** Half its width as an angle, at u along it (0 base, 1 tip). */
  halfWidth: (u: number) => number;
  /** How thick it is at (u, c), c across it from -1 to 1 (cm). */
  thick: (u: number, c: number) => number;
  /** How far it stands off what is under it at (u, c): a lip, a flare, a wave (cm). */
  off: (u: number, c: number) => number;
  /** Its number for the skin (under 2/3 a head leaf, over it a wrapper). */
  id: number;
  wrapper: boolean;
}

export const buildCabbage: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Cabbage: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x6ab1e);
  const centre = new Vector3(0, CY, 0);

  // The height map: how far out from the middle the leaves laid so far reach, by direction.
  const cover = new Float32Array(ROWS * COLS).fill(R);
  const coverAt = (d: Vector3) => {
    const row = Math.min(ROWS - 1.001, Math.max(0, (Math.acos(Math.max(-1, Math.min(1, -d.y))) / Math.PI) * (ROWS - 1)));
    const col = ((Math.atan2(d.z, d.x) / (2 * Math.PI) + 1) % 1) * COLS;
    const r0 = Math.floor(row), c0 = Math.floor(col) % COLS, c1 = (c0 + 1) % COLS;
    const fr = row - r0, fc = col - Math.floor(col);
    const a = cover[r0 * COLS + c0] * (1 - fc) + cover[r0 * COLS + c1] * fc;
    const b = cover[(r0 + 1) * COLS + c0] * (1 - fc) + cover[(r0 + 1) * COLS + c1] * fc;
    return a * (1 - fr) + b * fr;
  };
  /** Where a direction falls on a leaf: u along it, c across it, and how covered it is (0..1, soft). */
  const onLeaf = (leaf: BallLeaf, d: Vector3) => {
    const w = Math.asin(Math.max(-1, Math.min(1, d.dot(leaf.s))));
    const a = Math.atan2(d.dot(leaf.t), d.dot(leaf.b));
    const u = Math.min(1, Math.max(0, a / leaf.arc));
    const hw = leaf.halfWidth(u);
    const c = Math.max(-1, Math.min(1, w / Math.max(hw, 1e-3)));
    const along = smoothstep(-MARGIN, 0, a) * (1 - smoothstep(leaf.arc, leaf.arc + MARGIN, a));
    const across = 1 - smoothstep(hw, hw + MARGIN, Math.abs(w));
    return { u, c, cov: along * across };
  };

  const made: { leaf: BallLeaf; geometry: BufferGeometry; dirs: Vector3[] }[] = [];
  const RINGS = 40;
  const AROUND = 26;
  /** Lay one leaf on what is there, then add it to the height map. */
  const lay = (leaf: BallLeaf) => {
    const rings: Vector3[][] = [];
    const centres: Vector3[] = [];
    const uvs: number[] = [];
    const dirs: Vector3[] = [];
    for (let k = 0; k <= RINGS; k++) {
      // Rings closer together toward the tip, so its round end stays round.
      const u = Math.sin((Math.PI / 2) * (k / RINGS)) ** 1.25;
      const a = u * leaf.arc;
      const mid = leaf.b.clone().multiplyScalar(Math.cos(a)).addScaledVector(leaf.t, Math.sin(a));
      const hw = leaf.halfWidth(u);
      const ring: Vector3[] = [];
      for (let j = 0; j < AROUND; j++) {
        const psi = (2 * Math.PI * j) / AROUND;
        const c = Math.cos(psi);
        const side = Math.sin(psi);
        const w = c * hw;
        const d = mid.clone().multiplyScalar(Math.cos(w)).addScaledVector(leaf.s, Math.sin(w)).normalize();
        const r = coverAt(d) + 0.03 + leaf.off(u, c) + leaf.thick(u, c) * (0.5 + 0.5 * side);
        const p = centre.clone().addScaledVector(d, r);
        // Nothing dips into the table (a hair above it: two surfaces at one height flicker).
        p.y = Math.max(p.y, 0.06);
        ring.push(p);
        dirs.push(d);
        uvs.push(u, (1 - c) / 2);
      }
      rings.push(ring);
      centres.push(centre.clone().addScaledVector(mid, R));
    }
    const geometry = stemmedLeafGeometry({ rings, centres, bladeStart: 0, uvs } as StemmedLeaf, leaf.id);
    if (signedVolumeOf(geometry) < 0) {
      const index = geometry.getIndex()!;
      for (let t = 0; t < index.count; t += 3) {
        const a = index.getX(t + 1);
        index.setX(t + 1, index.getX(t + 2));
        index.setX(t + 2, a);
      }
    }
    made.push({ leaf, geometry, dirs });
    // Onto the map: the next leaf rests on this one, rising softly just outside its edge.
    const d = new Vector3();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        d.copy(dir((row / (ROWS - 1)) * Math.PI, ((col + 0.5) / COLS) * 2 * Math.PI));
        const at = onLeaf(leaf, d);
        // (Only the part that hugs the head: a wrapper's flared top is not something to rest on, and
        // its steep drop bent the next leaf into jagged folds.)
        if (at.cov > 0) cover[row * COLS + col] += at.cov * (0.05 + Math.min(0.3, leaf.off(at.u, at.c)) + leaf.thick(at.u, at.c));
      }
    }
  };
  /** A leaf from a base direction, running `heading` off straight up the ball (radians). */
  const frame = (theta: number, phi: number, heading: number) => {
    const b = dir(theta, phi);
    const up = dir(theta + 0.01, phi).sub(b).normalize();
    const t = up.addScaledVector(b, -up.dot(b)).normalize().applyAxisAngle(b, heading);
    return { b, t, s: new Vector3().crossVectors(b, t).normalize() };
  };
  /** A round-topped outline: narrower at the base, widest past the middle, a round tip. */
  const outline = (width: number, base: number, tipFrom: number) => (u: number) => {
    const tip = u > tipFrom ? Math.sqrt(Math.max(0, 1 - ((u - tipFrom) / (1 - tipFrom)) ** 2)) : 1;
    return width * (base + (1 - base) * smoothstep(0, 0.4, u)) * tip;
  };

  // 2. The head leaves: over the ball, one after another, a spiral of sides (the golden angle).
  const spin = random() * Math.PI * 2;
  for (let i = 0; i < HEAD_LEAVES; i++) {
    // The first four wrap the sides and stop short of the top; the last ones start higher and
    // lie across the top. (All eight running over the top stacked up there into a point.)
    const side = i < 4;
    const phi = spin + (side ? (i * Math.PI) / 2 : i * 2.39996) + signed(random) * 0.25;
    const width = (side ? 0.95 : 0.8) + random() * 0.2;
    const wave = random() * Math.PI * 2;
    lay({
      ...frame(side ? 0.95 + random() * 0.2 : 1.75 + random() * 0.3, phi, signed(random) * (side ? 0.3 : 0.6)),
      arc: side ? 1.45 + random() * 0.3 : 1.5 + random() * 0.6,
      halfWidth: outline(width, 0.6, 0.5),
      thick: (u, c) => (0.07 + 0.09 * (1 - Math.abs(c)) * (1 - 0.5 * u)) * (1 - 0.7 * smoothstep(0.9, 1, u)),
      // A small lip along the edge and tip, and a very slow wave in it.
      off: (u, c) => {
        // (Fading out at the very tip: a lip there stood up as a small dark nick on the head.)
        const edge = Math.max(Math.abs(c) ** 3, smoothstep(0.75, 0.92, u)) * (1 - smoothstep(0.92, 1, u));
        return smoothstep(0.15, 0.6, u) * edge * (0.2 + 0.07 * Math.sin(u * 5 + wave + c * 1.5));
      },
      id: (0.2 + random() * 1.6) / 3,
      wrapper: false,
    });
  }

  // 3. The wrapper leaves: an inner ring of three, then an outer three in the gaps between them.
  const turn0 = random() * Math.PI * 2;
  for (let i = 0; i < 6; i++) {
    const outer = i >= 3;
    const phi = turn0 + (2 * Math.PI * (i % 3)) / 3 + (outer ? Math.PI / 3 : 0) + signed(random) * 0.18;
    const theta0 = 0.4 + random() * 0.12;
    const arc = (outer ? 1.05 : 1.3) + random() * 0.5;
    // How far it opens, by height on the head (the same curve for every wrapper, the outer ring
    // opening further, so an outer leaf is always outside an inner one and they never cross).
    const flare = (outer ? 2.6 : 1.2) + random() * 0.5;
    const waves = 0.8 + random() * 0.5;
    const wave = random() * Math.PI * 2;
    const ruffle = 0.22 + random() * 0.12;
    const width = (outer ? 1.05 : 0.95) + random() * 0.1;
    lay({
      ...frame(theta0, phi, signed(random) * 0.1),
      arc,
      halfWidth: outline(width, 0.7, 0.35),
      thick: (u, c) => 0.07 + 0.12 * (1 - Math.abs(c)) * (1 - 0.6 * u),
      off: (u, c) => {
        const edge = Math.abs(c);
        const theta = theta0 + u * arc;
        // Opening out toward the top, evenly across the leaf (more at its edges drew pointed
        // wings), with one slow, soft wave along the rim.
        const open = flare * smoothstep(1.15, 2.5, theta) ** 1.6 * (0.92 + 0.08 * edge * edge);
        const wavy = ruffle * smoothstep(0.4, 0.9, u) * edge ** 3 * Math.sin(2 * Math.PI * waves * u + wave);
        return 0.1 + (outer ? 0.3 : 0) + open + wavy;
      },
      id: (2.1 + random() * 0.8) / 3,
      wrapper: true,
    });
  }

  // The skin's maps on every leaf. uv: x how pale (the rib, a wrapper's base), y how green.
  // leafMap: along and across the leaf, for its veins. ownPos: x its number, y how deep it sits
  // under a later leaf's edge (a soft, cool shade there), z how near its own edge.
  made.forEach(({ leaf, geometry, dirs }, n) => {
    const map = geometry.getAttribute('uv') as BufferAttribute;
    const own = geometry.getAttribute('ownPos') as BufferAttribute;
    const leafMap = new Float32Array(map.count * 2);
    for (let v = 0; v < map.count; v++) {
      const u = Math.min(1, Math.max(0.001, map.getX(v)));
      const across = Math.abs(map.getY(v) - 0.5) * 2;
      leafMap[v * 2] = u;
      leafMap[v * 2 + 1] = 1 - 2 * map.getY(v);
      const ribHalf = (leaf.wrapper ? 0.07 : 0.07) - 0.04 * u;
      const rib = 1 - smoothstep(ribHalf * 0.5, ribHalf * 1.4, across);
      if (leaf.wrapper) map.setXY(v, Math.max(rib * 0.55 * (1 - 0.6 * u), 1 - smoothstep(0.02, 0.18, u)), 0.8 + 0.2 * u);
      else map.setXY(v, rib * (0.5 - 0.35 * u), 0.5 + 0.25 * u);
      let under = 0;
      const d = dirs[Math.min(v, dirs.length - 1)];
      for (let later = n + 1; later < made.length; later++) {
        const other = made[later].leaf;
        const at = onLeaf(other, d);
        if (at.cov <= 0) continue;
        // Only where the later leaf lies close: a wrapper's flared top casts its own real shadow.
        under = Math.max(under, at.cov * (1 - smoothstep(0.4, 1.4, other.off(at.u, at.c))));
      }
      own.setXYZ(v, leaf.id, under * 0.8, smoothstep(0.7, 1, across));
    }
    geometry.setAttribute('leafMap', new BufferAttribute(leafMap, 2));
  });

  // 1. The hidden core ball (pale, in deep shade: it only shows in the chinks between leaves).
  const core = new SphereGeometry(R - 0.12, 36, 24);
  core.deleteAttribute('normal');
  core.translate(0, CY, 0);
  {
    const p = core.getAttribute('position') as BufferAttribute;
    const uv = core.getAttribute('uv') as BufferAttribute;
    const own = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) {
      p.setY(v, Math.max(p.getY(v), 0));
      uv.setXY(v, 0.1, 0.55);
      own.set([0.3, 0.9, 0], v * 3);
    }
    core.setAttribute('ownPos', new BufferAttribute(own, 3));
    core.setAttribute('leafMap', new BufferAttribute(new Float32Array(p.count * 2), 2));
  }

  return finishPieces([{ role: 'head', geometry: mergeGeometries([core, ...made.map((m) => m.geometry)])! }]);
};
