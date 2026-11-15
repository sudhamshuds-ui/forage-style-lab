import { BufferAttribute, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { latheGeometry, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { trayGeometry } from './kit/tray';

/**
 * Eggs (archetype: contained). Round 3, batch 1, after the user's references (Figma node 184:349:
 * two oil paintings of brown eggs in an open pulp carton; the user's label: "Egg (in carton)"):
 * six brown eggs in an open half-dozen carton, its lid lying open behind.
 *
 * The tray kit (kit/tray.ts), built here first: a moulded tray as a height at every point. The
 * carton's tray has six round cups with a ridge between them and two pointed posts where four
 * cups meet; its foot is pinched in between the cups, so the cups show from outside. The lid is
 * a shallow tray of its own, hinged along the back.
 *
 * Pieces: egg (the hero: six eggs merged, each its own shape, tilt and colour; maps: uv.x each
 * egg's own mix, uv.y height share; ownPos its own frame) and tray (the carton, the `pulp` skin).
 */
const PITCH = 5.0;
const CUP = 2.42;
const TRAY = { width: 15.9, depth: 10.8, tall: 2.9 };

function egg(random: () => number, tint: number): BufferGeometry {
  const half = 2.8 * (1 + signed(random) * 0.04);
  const fat = 2.17 * (1 + signed(random) * 0.04);
  const g = latheGeometry({
    halfLength: half,
    // Blunt end first (it sits down in the cup), the narrower end up.
    radius: (x) => fat * Math.sqrt(Math.max(0, 1 - (x / half) ** 2)) * (1 - 0.14 * (x / half)) * (1 + 0.02 * Math.sin(x * 2 + tint * 6)),
    rings: 26,
    segments: 30,
  });
  g.rotateZ(Math.PI / 2);
  const p = g.getAttribute('position');
  const uv = new Float32Array(p.count * 2);
  const own = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    uv.set([tint, (p.getY(i) + half) / (2 * half)], i * 2);
    own.set([p.getX(i), p.getY(i), p.getZ(i)], i * 3);
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setAttribute('ownPos', new BufferAttribute(own, 3));
  g.translate(0, half, 0);
  return g;
}

export const buildEggs: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Eggs: the "${state}" form is not built yet (the carton of six only for now).`);
  const random = seededRandom(seed ^ 0xe665);
  const cups: [number, number][] = [];
  for (const z of [-PITCH / 2, PITCH / 2]) for (const x of [-PITCH, 0, PITCH]) cups.push([x, z]);
  const posts: [number, number][] = [[-PITCH / 2, 0], [PITCH / 2, 0]];

  const tray = trayGeometry({
    ...TRAY,
    round: 0.3,
    columns: 78,
    rows: 54,
    top: (x, z, u, v) => {
      // Each cup: a round bowl; between the cups a ridge; where four meet, a pointed post.
      let d = Infinity;
      for (const [cx, cz] of cups) d = Math.min(d, Math.hypot(x - cx, z - cz));
      let y = 0.5 + (TRAY.tall - 0.95) * smoothstep(CUP * 0.5, CUP * 1.03, d) ** 1.25;
      for (const [px, pz] of posts) y += 2.7 * Math.max(0, 1 - Math.hypot(x - px, z - pz) / 1.3) ** 1.3;
      // The flat lip round the outside (a hair lower at its very edge, a rounded rim).
      const m = Math.max(Math.abs(u), Math.abs(v));
      const lip = TRAY.tall - 0.12 * smoothstep(0.96, 1, m);
      return y + (lip - y) * smoothstep(0.84, 0.93, m);
    },
    // The foot pinched in between the cups: the cups show from outside.
    inset: (u, v) => {
      const longSide = Math.abs(v) > Math.abs(u);
      const along = longSide ? (u * TRAY.width) / 2 : (v * TRAY.depth) / 2;
      const between = longSide ? Math.cos((along / PITCH) * 2 * Math.PI) : -Math.cos((along / PITCH) * 2 * Math.PI);
      return 0.75 + 0.5 * (0.5 - 0.5 * between);
    },
  });
  // The lid: a shallow tray lying open behind, hinged to the tray's back lip.
  const lidTall = 2.6;
  const lid = trayGeometry({
    width: TRAY.width,
    depth: TRAY.depth,
    tall: lidTall,
    round: 0.3,
    columns: 44,
    rows: 32,
    top: (x, z, u, v) => {
      const m = Math.max(Math.abs(u), Math.abs(v));
      // A flat floor with two long, soft pressed ribs, walls rising to a flat lip.
      const floor = 0.4 + 0.22 * Math.exp(-(((Math.abs(z) - 1.9) / 0.5) ** 2)) * smoothstep(6.5, 5, Math.abs(x));
      const lip = lidTall - 0.12 * smoothstep(0.96, 1, m);
      return floor + (lip - floor) * smoothstep(0.72, 0.9, m) ** 1.2;
    },
    inset: () => 0.7,
  });
  lid.translate(0.25, 0, -(TRAY.depth - 0.25));
  lid.applyMatrix4(new Matrix4().makeRotationY(0.05));

  // Six eggs, each its own shape and colour, each sitting a little differently in its cup.
  const eggs = cups.map(([cx, cz]) => {
    const g = egg(random, random());
    const tilt = new Quaternion().setFromAxisAngle(new Vector3(signed(random), 0, signed(random)).normalize(), random() * 0.16);
    const spin = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), random() * Math.PI * 2);
    g.applyMatrix4(new Matrix4().compose(new Vector3(cx + signed(random) * 0.08, 0.62 + random() * 0.1, cz + signed(random) * 0.08), tilt.multiply(spin), new Vector3(1, 1, 1)));
    return g;
  });

  return finishPieces([
    { role: 'egg', geometry: mergeGeometries(eggs)! },
    { role: 'tray', geometry: mergeGeometries([tray, lid])! },
  ]);
};
