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
const TRAY = { width: 15.9, depth: 10.8, tall: 4.4 };

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

  // Where a point on the rim sits between two cups (1) or beside a cup's middle (0).
  const between = (u: number, v: number) => {
    const longSide = Math.abs(v) >= Math.abs(u);
    const along = longSide ? (u * TRAY.width) / 2 : (v * TRAY.depth) / 2;
    return longSide ? 0.5 - 0.5 * Math.cos((along / PITCH) * 2 * Math.PI) : 0.5 + 0.5 * Math.cos((along / PITCH) * 2 * Math.PI);
  };
  // The peaks: two tall pointed posts where four cups meet, and a shorter pointed peak on the
  // rim between each pair of cups (the user's references, 2026-11-15: the first tray was "too
  // simple": a plain box). The rim itself dips low beside each cup, so the eggs show.
  const peaks: [number, number, number, number][] = [
    [-PITCH / 2, 0, 3.3, 1.35],
    [PITCH / 2, 0, 3.3, 1.35],
  ];
  for (const x of [-PITCH / 2, PITCH / 2]) for (const z of [-1, 1]) peaks.push([x, z * (TRAY.depth / 2 - 0.8), 2.9, 1.3]);
  for (const x of [-1, 1]) peaks.push([x * (TRAY.width / 2 - 0.8), 0, 2.9, 1.3]);
  const tray = trayGeometry({
    ...TRAY,
    round: 0.3,
    columns: 84,
    rows: 58,
    top: (x, z, u, v) => {
      // Each cup: a round bowl with its own wall; a low saddle between neighbours.
      let d = Infinity;
      for (const [cx, cz] of cups) d = Math.min(d, Math.hypot(x - cx, z - cz));
      let y = 0.5 + 1.65 * smoothstep(CUP * 0.5, CUP * 1.02, d) ** 1.25;
      // The rim: low beside each cup, rising a little toward the peaks, a rounded edge.
      const m = Math.max(Math.abs(u), Math.abs(v));
      const lip = 1.75 + 0.5 * between(u / Math.max(m, 1e-6), v / Math.max(m, 1e-6)) - 0.14 * smoothstep(0.95, 1, m);
      y += (lip - y) * smoothstep(0.86, 0.95, m);
      for (const [px, pz, tall, wide] of peaks) y += tall * Math.max(0, 1 - Math.hypot(x - px, z - pz) / wide) ** 1.25;
      return y;
    },
    // The outline swells round each cup and tucks in between them; the foot is pinched in further
    // there, so each cup reads from outside.
    outline: (u, v) => 1 + 0.028 * (1 - 2 * between(u, v)),
    inset: (u, v) => 0.85 + 0.85 * between(u, v),
  });
  // The lid: a shallow tray lying open behind, hinged to the tray's back rim: a flat lip, sloping
  // walls, and six soft domes pressed into its floor where the eggs sit when it is shut.
  const lidTall = 2.5;
  const lid = trayGeometry({
    width: TRAY.width,
    depth: TRAY.depth,
    tall: lidTall,
    round: 0.3,
    columns: 56,
    rows: 40,
    top: (x, z, u, v) => {
      const m = Math.max(Math.abs(u), Math.abs(v));
      let d = Infinity;
      for (const [cx, cz] of cups) d = Math.min(d, Math.hypot(x - cx, z - cz));
      const floor = 0.4 + 0.5 * (1 - smoothstep(0.6, 2.3, d)) ** 1.3;
      const lip = lidTall - 0.12 * smoothstep(0.96, 1, m);
      return floor + (lip - floor) * smoothstep(0.74, 0.9, m) ** 1.2;
    },
    inset: () => 0.75,
  });
  lid.translate(0.2, 0, -(TRAY.depth - 0.35));
  lid.applyMatrix4(new Matrix4().makeRotationY(0.04));

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
