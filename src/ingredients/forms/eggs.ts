import { BufferAttribute, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { latheGeometry, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { spinProfile, type ProfilePoint } from './kit/bowl';
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
  const fat = 2.14 * (1 + signed(random) * 0.035);
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

  // Rebuilt 1:1 from the user's photos of a real half-dozen carton (2026-11-15: "why are u curving
  // the egg carton like that in the corner, also the height. please 1:1 the form of the carton
  // with ref"). Earlier tries made the tray one moulded block whose outer wall was invented (a
  // box, then spikes, then a wall bent in at the corners). The real thing is simpler:
  //   - a thin, flat rim plate: a plain rounded rectangle, level all round, low (the eggs stand
  //     more than half out of it),
  //   - under it, six separate round cups, each a small bowl on its own flat foot, their sides
  //     just meeting their neighbours',
  //   - down the middle, two tall posts: cones with flat tops,
  //   - the lid: a shallow box with rounded corners, hinged along the back, standing open.
  const posts: [number, number][] = [[-PITCH / 2, 0], [PITCH / 2, 0]];
  const RIM = 2.7;
  const PLATE = 0.42;
  const plate = trayGeometry({
    width: TRAY.width,
    depth: TRAY.depth,
    tall: 5,
    round: 0.3,
    columns: 84,
    rows: 58,
    top: (x, z, u, v) => {
      // Each cup: a round bowl; a saddle between neighbours, a little below the rim.
      let d = Infinity;
      for (const [cx, cz] of cups) d = Math.min(d, Math.hypot(x - cx, z - cz));
      let y = 0.5 + (RIM - 0.8) * smoothstep(CUP * 0.42, CUP * 1.0, d) ** 1.2;
      // The posts: a cone with a flat top and a small dimple in it, standing above the rim.
      for (const [px, pz] of posts) {
        const r = Math.hypot(x - px, z - pz);
        const cone = 5.0 - 3.6 * smoothstep(0.42, 1.75, r) ** 0.85 - 0.18 * (1 - smoothstep(0.12, 0.32, r));
        y = Math.max(y, Math.min(cone, y + 3.4 * (1 - smoothstep(1.2, 1.9, r))));
      }
      // The flat rim, with a rounded outer edge.
      const m = Math.max(Math.abs(u), Math.abs(v));
      const lip = RIM - 0.14 * smoothstep(0.96, 1, m);
      return y + (lip - y) * smoothstep(0.86, 0.93, m);
    },
    // A thin plate: its edge drops straight down a few millimetres to its underside.
    inset: () => 0.1,
    footY: RIM - PLATE,
  });
  // The cups, seen from outside: each a round bowl under the plate, a touch square, on a flat foot.
  const cupOutline: ProfilePoint[] = [
    { r: 0, y: 0, u: 1, v: 0 },
    { r: 1.2, y: 0, u: 1, v: 0 },
    { r: 1.5, y: 0.07, u: 1, v: 0.014 },
  ];
  for (let k = 1; k <= 9; k++) {
    const t = k / 9;
    const y = 0.07 + (RIM - PLATE + 0.1 - 0.07) * t;
    cupOutline.push({ r: 1.5 + (2.62 - 1.5) * Math.sin((t * Math.PI) / 2) ** 0.72, y, u: 1, v: y / 5 });
  }
  cupOutline.push({ r: 0, y: RIM - PLATE + 0.1, u: 1, v: (RIM - PLATE) / 5 });
  const cupShells = cups.map(([cx, cz], n) => {
    const g = spinProfile(cupOutline, 44, (angle) => 1 - 0.03 * Math.cos(4 * angle) + 0.012 * Math.cos(2 * angle + n));
    g.translate(cx, 0, cz);
    return g;
  });
  const tray = mergeGeometries([plate, ...cupShells])!;
  // The lid: a shallow box, its floor (the carton's top when shut) flat, its corners round, a
  // soft hollow pressed into each end. Hinged to the back of the tray's rim, it stands open,
  // leaning back a little, its inside toward the camera.
  const lidTall = 3.1;
  const lid = trayGeometry({
    width: TRAY.width - 0.1,
    depth: TRAY.depth - 0.2,
    tall: lidTall,
    round: 0.52,
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
    wall: (_u, _v, t) => 0.12 * Math.sin(Math.PI * t),
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
