import { Vector3, type BufferGeometry } from 'three';
import { LeafMass, type MassBlob, type MassLeaf, type MassStem } from './kit/leafMass';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { sweepGeometry } from './kit/sweep';

/**
 * Spinach (archetype: leafy). Round 2's sixth ingredient, the first leafy one
 * (docs/ingredients/r2-plan.md).
 *
 * After the user's reference (the watercolour bunch lying on its side, Figma refs of 2026-11-12):
 * a tied bundle of thick, pale stems on the left, cut ends toward the viewer, an orange band round
 * them; on the right a big rounded mound of overlapping leaves, about two and a half times as tall
 * as the bundle, its top rising past the middle and rolling down at the far end.
 *
 * Round 3 (the user, 2026-11-13): "think of this whole thing as one unit, use textures, colours
 * to differentiate ... the huge gaps between them to be minimal". So the bunch is ONE surface (the
 * kit's leaf mass): stems, a hidden core and leaf lobes blended like clay, no paper-thin leaves,
 * no gaps, no blatant crossings. The leaves are told apart by the spinach skin: each its own
 * green, its midrib, a lighter rim, cool crevices between them. Rounds 1 and 2 (separate sheets
 * with stems; a tied bunch of sheets) are in history; their kit (`kit/leafy.ts`) is kept.
 *
 * Built with the bunch's axis along x: the cut ends at x = 0, the tie, then the mound.
 */

/** The tie (cm from the cut ends). */
const TIE = 6.4;
/** The stems' radius (cm): chunky, like the reference's. */
const STEM_R = 0.8;

export const buildSpinach: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Spinach: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x5b1a7c);

  // 1. The core: soft blobs filling the mound (never seen, only felt as its shape). Low near the
  //    tie, rising to its top a little past the middle, rolling down at the far end; full at the
  //    front and back.
  const core: MassBlob[] = [
    { centre: new Vector3(11.4, 4.7, 0.3), radii: new Vector3(2.4, 4.5, 3.4) },
    { centre: new Vector3(15.2, 6.2, 0.0), radii: new Vector3(4.6, 5.6, 4.6) },
    { centre: new Vector3(19.4, 4.6, -0.4), radii: new Vector3(3.4, 4.4, 4.0) },
    { centre: new Vector3(15.0, 4.2, 2.8), radii: new Vector3(4.4, 4.0, 3.0) },
    { centre: new Vector3(15.6, 4.4, -2.8), radii: new Vector3(4.4, 4.2, 3.0) },
  ];
  const coreDistance = (p: Vector3) => {
    let d = Infinity;
    for (const b of core) {
      const x = (p.x - b.centre.x) / b.radii.x;
      const y = (p.y - b.centre.y) / b.radii.y;
      const z = (p.z - b.centre.z) / b.radii.z;
      d = Math.min(d, (Math.sqrt(x * x + y * y + z * z) - 1) * Math.min(b.radii.x, b.radii.y, b.radii.z));
    }
    return d;
  };
  const coreNormal = (p: Vector3) => {
    const e = 0.05;
    return new Vector3(
      coreDistance(p.clone().setX(p.x + e)) - coreDistance(p.clone().setX(p.x - e)),
      coreDistance(p.clone().setY(p.y + e)) - coreDistance(p.clone().setY(p.y - e)),
      coreDistance(p.clone().setZ(p.z + e)) - coreDistance(p.clone().setZ(p.z - e)),
    ).normalize();
  };

  // 2. The stems: a bundle of thick stems lying on the table, three rows like stacked logs, cut
  //    ends a little uneven; squeezed at the tie, then splaying and rising into the mound (where
  //    the leaves grow from).
  const rows: [number, number][] = [
    [-3, 0], [-1, 0], [1, 0], [3, 0],
    [-2, 1], [0, 1], [2, 1],
    [-1, 2], [1, 2],
  ].map(([z, row]) => [z * STEM_R, row] as [number, number]);
  const stems: MassStem[] = rows.map(([z, row], i) => {
    const y = STEM_R + row * STEM_R * 1.65;
    const cut = random() * 1.1 + (row === 2 ? 0.6 : 0);
    const squeeze = 0.82;
    return {
      points: [
        new Vector3(cut, y + signed(random) * 0.05, z * 1.05),
        new Vector3(TIE, y * 0.97 + 0.1, z * squeeze),
        new Vector3(10.5, y + 0.4 + row * 0.2, z * 1.2 + signed(random) * 0.3),
        new Vector3(13.5, y + 1.6 + row * 0.4, z * 1.4),
      ],
      radius: STEM_R * (0.9 + random() * 0.2),
      id: (i + 0.5) / rows.length,
    };
  });

  // 3. The leaves: lobes laid over the core like shingles, radiating from where the stems go in,
  //    each its own size, height, curve, rim lift and curl. Spread over the core evenly (a
  //    Fibonacci spiral of directions), a little jittered, none underneath.
  const hub = new Vector3(10, 3.4, 0);
  const middle = new Vector3(15.2, 4.8, 0);
  const leaves: MassLeaf[] = [];
  const COUNT = 28;
  for (let i = 0; i < COUNT; i++) {
    const yDir = 1 - (2 * (i + 0.5)) / COUNT;
    const ring = Math.sqrt(1 - yDir * yDir);
    const turn = i * 2.39996 + signed(random) * 0.25;
    const dir = new Vector3(ring * Math.cos(turn), yDir, ring * Math.sin(turn)).normalize();
    if (dir.y < -0.5) continue;
    // March out from the middle to the core's surface.
    let lo = 0;
    let hi = 12;
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      if (coreDistance(middle.clone().addScaledVector(dir, mid)) < 0) lo = mid;
      else hi = mid;
    }
    const onCore = middle.clone().addScaledVector(dir, lo);
    if (onCore.y < 0.9) continue;
    const normal = coreNormal(onCore);
    // Pointing away from where the stems go in, along the surface.
    const away = onCore.clone().sub(hub);
    away.addScaledVector(normal, -away.dot(normal));
    if (away.lengthSq() < 1e-4) away.set(1, 0, 0);
    away.normalize().applyAxisAngle(normal, signed(random) * 0.45);
    const size = 0.85 + random() * 0.4;
    const length = 8.6 * size;
    const width = length * (0.62 + random() * 0.18);
    // Each at its own height over the core: where two overlap, one is clearly on top.
    const rank = random();
    const lift = -0.05 + rank * 0.4;
    const centre = onCore.clone().addScaledVector(normal, lift);
    const base = centre.clone().addScaledVector(away, -length * 0.42);
    leaves.push({
      base,
      along: away,
      normal,
      length,
      width,
      widest: 0.42 + random() * 0.12,
      thickness: 0.28,
      bend: 6 + random() * 4,
      bendAcross: (4 + random() * 4) * (random() < 0.25 ? -1 : 1),
      crinkle: 0.26 + random() * 0.16,
      crinkleScale: 1.4 + random() * 0.6,
      lobes: 0.05 + random() * 0.08,
      rimLift: 0.15 + random() * 0.45,
      tipCurl: signed(random) * 0.35 + 0.15,
      wave: 0.2 + random() * 0.3,
      waves: 3 + Math.floor(random() * 3),
      phase: random() * Math.PI * 2,
      fold: signed(random) * 0.25,
      id: random(),
    });
  }

  const mass = new LeafMass({
    core,
    leaves,
    stems,
    coreSoftness: 1.4,
    leafSoftness: 0.3,
    stemSoftness: 0.08,
    joinSoftness: 0.6,
    table: 0,
    cell: 0.36,
  });
  const bunch = mass.geometry();

  // 4. The tie: an orange band round the stems, pressed in a little.
  const tie: BufferGeometry[] = [];
  {
    const centre = new Vector3(TIE, STEM_R * 2.65, 0);
    // Out from the middle of the bundle until just past the stems' surface, all the way round;
    // then smoothed, so the band runs taut over the stems instead of dipping between them.
    const N = 48;
    const radii: number[] = [];
    for (let k = 0; k < N; k++) {
      const a = (2 * Math.PI * k) / N;
      const dir = new Vector3(0, Math.cos(a), Math.sin(a));
      let r = 0;
      while (r < 6 && mass.distance(centre.clone().addScaledVector(dir, r)) < 0) r += 0.02;
      radii.push(r);
    }
    const loop: Vector3[] = [];
    for (let k = 0; k <= N; k++) {
      let sum = 0;
      let top = 0;
      for (let j = -5; j <= 5; j++) {
        const r = radii[(k + j + N) % N];
        sum += r;
        top = Math.max(top, r);
      }
      const r = 0.5 * (sum / 11) + 0.5 * top - 0.08;
      const a = (2 * Math.PI * k) / N;
      const point = centre.clone().addScaledVector(new Vector3(0, Math.cos(a), Math.sin(a)), r);
      point.y = Math.max(point.y, 0.2);
      loop.push(point);
    }
    tie.push(sweepGeometry({ points: loop, radius: () => 0.26, rings: 64, segments: 8 }));
  }
  for (const g of tie) g.deleteAttribute('uv');

  return finishPieces([
    { role: 'blade', geometry: bunch, keepNormals: true },
    { role: 'tie', geometry: tie[0] },
  ]);
};
