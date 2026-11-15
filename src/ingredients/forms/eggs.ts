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
const TRAY = { width: 15.9, depth: 10.8 };

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
  // After the user's photos of a real half-dozen carton (2026-11-15: "Egg carton form is wrong see
  // refs"; a first tray was a plain box, a second had spikes along its rim):
  //   - a flat, level rim all the way round, with a rounded edge,
  //   - six deep round cups; under the rim each cup bulges out on its own, with a tuck between,
  //   - down the middle, two tall posts: cones with flat tops, standing above the rim,
  //   - the lid: a shallow box with rounded corners, hinged along the back, standing open.
  const posts: [number, number][] = [[-PITCH / 2, 0], [PITCH / 2, 0]];
  const RIM = 3.3;
  const tray = trayGeometry({
    width: TRAY.width,
    depth: TRAY.depth,
    tall: 5.2,
    round: 0.34,
    columns: 84,
    rows: 58,
    top: (x, z, u, v) => {
      // Each cup: a deep round bowl; a saddle between neighbours, a little below the rim.
      let d = Infinity;
      for (const [cx, cz] of cups) d = Math.min(d, Math.hypot(x - cx, z - cz));
      let y = 0.5 + (RIM - 0.95) * smoothstep(CUP * 0.42, CUP * 1.0, d) ** 1.2;
      // The posts: a cone with a flat top and a small dimple in it, standing above the rim.
      for (const [px, pz] of posts) {
        const r = Math.hypot(x - px, z - pz);
        const cone = 5.2 - 3.4 * smoothstep(0.42, 1.75, r) ** 0.85 - 0.18 * (1 - smoothstep(0.12, 0.32, r));
        y = Math.max(y, Math.min(cone, y + 3.2 * (1 - smoothstep(1.2, 1.9, r))));
      }
      // The flat rim, with a rounded outer edge.
      const m = Math.max(Math.abs(u), Math.abs(v));
      const lip = RIM - 0.16 * smoothstep(0.955, 1, m);
      return y + (lip - y) * smoothstep(0.83, 0.91, m);
    },
    // The foot tucks in between the cups and under the rim, so each cup shows from outside.
    outline: (u, v) => 1 + 0.012 * (1 - 2 * between(u, v)),
    inset: (u, v) => 1.0 + 0.95 * between(u, v),
  });
  // The lid: a shallow box, its floor (the carton's top when shut) flat, its corners round, a
  // soft hollow pressed into each end. Hinged to the back of the tray's rim, it stands open,
  // leaning back a little, its inside toward the camera.
  const lidTall = 3.1;
  const lid = trayGeometry({
    width: TRAY.width - 0.1,
    depth: TRAY.depth - 0.2,
    tall: lidTall,
    round: 0.4,
    columns: 56,
    rows: 40,
    top: (x, z, u, v) => {
      const m = Math.max(Math.abs(u), Math.abs(v));
      const hollow = 0.25 * (Math.exp(-(((Math.abs(x) - 5.6) / 1.5) ** 2)) * Math.exp(-((z / 3.2) ** 2)));
      const floor = 0.4 + hollow;
      const lip = lidTall - 0.14 * smoothstep(0.955, 1, m);
      return floor + (lip - floor) * smoothstep(0.7, 0.9, m) ** 1.3;
    },
    inset: () => 0.55,
  });
  // Stand it up on its hinge edge: its opening turned from up to forward, leaning back 12 degrees.
  const open = (78 * Math.PI) / 180;
  lid.applyMatrix4(new Matrix4().makeRotationX(open));
  {
    // The hinge: the lid's near rim edge meets the back of the tray's rim.
    const hz = (TRAY.depth - 0.2) / 2;
    const hingeY = lidTall * Math.cos(open) - hz * Math.sin(open);
    const hingeZ = lidTall * Math.sin(open) + hz * Math.cos(open);
    lid.translate(0, RIM - 0.15 - hingeY, -(TRAY.depth / 2 - 0.25) - hingeZ);
  }

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
