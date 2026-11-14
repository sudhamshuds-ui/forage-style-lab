import { BufferAttribute, Vector3, type BufferGeometry } from 'three';

/** The volume a closed mesh encloses (positive when its faces point outward). */
function signedVolumeOf(g: BufferGeometry): number {
  const p = g.getAttribute('position');
  const index = g.getIndex()!;
  let v = 0;
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t), b = index.getX(t + 1), c = index.getX(t + 2);
    const ax = p.getX(a), ay = p.getY(a), az = p.getZ(a);
    const bx = p.getX(b), by = p.getY(b), bz = p.getZ(b);
    const cx = p.getX(c), cy = p.getY(c), cz = p.getZ(c);
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
}
import { LeafMass, type MassBlob, type MassLeaf } from './kit/leafMass';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { stemmedLeafGeometry, type StemmedLeaf } from './kit/leafy';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom, signed } from './kit/random';

/**
 * Romaine (archetype: leafy). Round 2's seventh ingredient, after the user's references
 * (2026-11-13: a head lying on its side, cut base to the front; a watercolour with mottled savoy
 * cells; a watercolour romaine with a broad pale rib): one solo head.
 *
 * The head is ONE surface (the kit's leaf mass, kept for "romaine and cabbage", the user's words
 * on the spinach): a hidden core shaped like the head, long leaves laid round it in three layers
 * like shingles (outer, middle, a pale heart showing at the top), blended softly so there are no
 * gaps and no crossings. The leaves are told apart by the romaine skin: each one's broad pale rib,
 * its green blade with mottled cells, its ruffled top edge, cool crevices between them.
 *
 * Built along x: the cut base at x = 0, the ruffled top at about x = 26, lying on the table.
 */

/** The head's length (cm) and its radius along it: narrow at the base, fullest past the middle. */
const LENGTH = 26;
/** How far the blended inner head sits inside the separate outer leaves (cm). */
const IN = 0.8;
/** The separate outer leaves wrapped round the head (the user, 2026-11-13: "try the separate outer leaves approach. it looks like a log tree trunk now"). */
const OUTER_LEAVES = 7;
function radius(x: number): number {
  const t = Math.min(1, Math.max(0, x / LENGTH));
  // A barrel: rounded in from the cut, swelling fullest just past the middle, easing in at the top
  // (the user, 2026-11-13: "more bulge and rounder body shape overall, very cilindrical right now").
  // Slimmer (the user's drawn outline, 2026-11-13: "make it less [thick]"): a small rounded base, the
  // sides widening gently, fullest near the top, which rounds over.
  // (Round 4's profile: the user liked its rounded shape.)
  return 2.5 + 1.3 * smoothstep(0, 0.45, t) + 0.25 * smoothstep(0.45, 0.8, t) - 0.35 * smoothstep(0.85, 1, t);
}

export const buildRomaine: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Romaine: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x7e4a1);

  // Lying on its side: the axis runs along x, a little above the table, the head slightly
  // flattened where it rests (a heavy head settles).
  const squash = 0.86;
  const axisAt = (x: number) => new Vector3(x, radius(x) * squash, 0);
  const radial = (angle: number) => new Vector3(0, Math.cos(angle) * squash, Math.sin(angle)).normalize();
  const onSurface = (x: number, angle: number, inset: number) =>
    axisAt(x).addScaledVector(new Vector3(0, Math.cos(angle) * squash, Math.sin(angle)), radius(x) - inset);

  // 1. The core: the head's shape, a little inside the leaves.
  // (It stops short of the top, so the leaves close over the end: its bare dome showed there.)
  const core: MassBlob[] = [2.5, 7, 12, 16.5, 20].map((x) => ({
    centre: axisAt(x),
    // (Close under the leaves, so no gap between them shows as a pit.)
    radii: new Vector3(3.6, (radius(x) - IN - 0.15) * squash, radius(x) - IN - 0.15),
  }));

  // 2. The leaves, in three layers round the head, each its own size, width and ruffle.
  const leaves: MassLeaf[] = [];
  const layers = [
    // Outer: broad, long, reaching to the top. Middle: between them, a little shorter, under.
    // Heart: short pale leaves deep inside, showing at the top where the outer ones open.
    // (Eight outer leaves, the middle layer close under them: gaps between two outer leaves showed
    // a lower leaf as a small round pit.)
    { count: 9, from: 0.6, length: [23, 26], width: [7.2, 8.4], inset: IN + 0.15, rank: 2 },
    { count: 6, from: 1.2, length: [23, 25.5], width: [5.8, 6.8], inset: IN + 0.3, rank: 1 },
    // The heart reaches the top and folds over the end, filling it with leaves.
    { count: 5, from: 5, length: [20.5, 22], width: [4.4, 5.4], inset: IN + 0.9, rank: 0 },
  ];
  for (const layer of layers) {
    const turn = random() * Math.PI * 2;
    for (let i = 0; i < layer.count; i++) {
      const angle = turn + (2 * Math.PI * (i + 0.5 * layer.rank)) / layer.count + signed(random) * (layer.rank === 3 ? 0.5 : 0.18);
      const x0 = layer.from + random() * 1.2;
      const length = layer.length[0] + random() * (layer.length[1] - layer.length[0]);
      const base = onSurface(x0, angle, layer.inset);
      // Along the head's surface toward its top (following the swell of the head).
      const toward = onSurface(Math.min(LENGTH, x0 + length * 0.75), angle, layer.inset);
      const along = toward.clone().sub(base).normalize();
      const out = radial(angle);
      const normal = out.clone().addScaledVector(along, -out.dot(along)).normalize();
      leaves.push({
        base,
        along,
        normal,
        length,
        width: layer.width[0] + random() * (layer.width[1] - layer.width[0]),
        // Narrow at the base, widest toward the top, where the leaf opens and ruffles.
        widest: 0.68 + random() * 0.1,
        // (Thicker, so the meshed rims are smooth, never stair-stepped.)
        thickness: 0.38,
        // Nearly straight along its length, wrapped round the head across it.
        bend: 70,
        bendAcross: radius(x0 + length * 0.5) - layer.inset + 0.3,
        // (Gentle: deeper puckers left round pits on top; the savoy cells are painted.)
        crinkle: 0.04 + random() * 0.04,
        crinkleScale: 1.6 + random() * 0.6,
        // (Barely lobed: a wobbly outline read as jagged.)
        lobes: 0.02 + random() * 0.02,
        // The top edge lifts a little and ruffles (the reference's frilly top), never curling up.
        // Edges hug the head (a raised rim made each leaf a shallow dish: round pits on top).
        rimLift: -0.15 - random() * 0.15,
        // Only the outer leaves' tips curl out; an inner leaf's curled tip broke the surface as a
        // round pit.
        // Outer and wrapper tips ruffle out a little; the heart's tips fold in over the end.
        tipCurl: layer.rank >= 2 ? 0.3 + random() * 0.4 : layer.rank === 0 ? -0.7 - random() * 0.3 : -0.2,
        // (Gentler: bigger waves and folds bubbled up on top.)
        // Soft, broad ruffles on the outer leaves' tops (the frilly crown), gentle on the others.
        wave: layer.rank >= 2 ? 0.35 + random() * 0.2 : 0.2 + random() * 0.15,
        waves: 4 + Math.floor(random() * 3),
        phase: random() * Math.PI * 2,
        fold: 0,
        // Its layer (0 heart, 1 middle, 2 outer) and its own number, for the skin.
        id: (Math.min(2, layer.rank) + 0.1 + random() * 0.8) / 3,
      });
    }
  }

  const mass = new LeafMass({
    core,
    leaves,
    stems: [],
    coreSoftness: 1.6,
    // A tight fillet: each leaf's edge stands a little proud of the one under it, so the leaves read.
    // (Softer joins: the inner leaves' edges showed as pale flakes between the outer leaves.)
    leafSoftness: 0.4,
    stemSoftness: 0.1,
    joinSoftness: 0.4,
    table: 0,
    // The cut across the base: a flat face to the front.
    // Cut a little off square, its rim well rounded (the user: "round it more").
    cuts: [{ point: new Vector3(0.5, 0, 0), out: new Vector3(-1, 0.06, 0.1).normalize(), soft: 1.4 }],
    cell: 0.33,
    smoothRounds: 6,
  });
  const head = mass.geometry();

  // The texture's map, worked out here so it blends smoothly where one leaf hands over to the next
  // (the leaf map itself jumps there, and painting from it drew pale lines along every hand-over):
  // x: how pale (the broad rib, and the white base of every leaf), y: how green (rising up the leaf).
  {
    const map = head.getAttribute('uv') as BufferAttribute;
    // Each point's place on its own leaf, kept for the veins (before the map is blended).
    const leafMap = new Float32Array(map.count * 2);
    for (let i = 0; i < map.count; i++) {
      leafMap[i * 2] = Math.max(0.001, map.getX(i));
      leafMap[i * 2 + 1] = (map.getY(i) - 0.5) * 2;
    }
    head.setAttribute('leafMap', new BufferAttribute(leafMap, 2));
    for (let i = 0; i < map.count; i++) {
      const u = map.getX(i);
      const across = Math.abs(map.getY(i) - 0.5) * 2;
      const ribHalf = 0.44 - 0.32 * smoothstep(0, 0.85, u);
      const rib = 1 - smoothstep(ribHalf * 0.55, ribHalf * 1.35, across);
      const pale = Math.max(rib, 1 - smoothstep(0.08, 0.35, u));
      // (Green from a third of the way up, strongest at the top: the references' lime tops.)
      map.setXY(i, pale, smoothstep(0.18, 0.7, u));
    }
  }

  // Blend the map over the surface a little (each point toward its neighbours' average), so where
  // one leaf's pale rib meets the next leaf's green the colour fades instead of stepping in blocks.
  {
    const map = head.getAttribute('uv') as BufferAttribute;
    const index = head.getIndex()!;
    const n = map.count;
    const neighbours: number[][] = Array.from({ length: n }, () => []);
    for (let k = 0; k < index.count; k += 3) {
      const a = index.getX(k), b = index.getX(k + 1), c = index.getX(k + 2);
      neighbours[a].push(b, c);
      neighbours[b].push(a, c);
      neighbours[c].push(a, b);
    }
    for (let round = 0; round < 6; round++) {
      const next = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        let x = map.getX(i), y = map.getY(i);
        const list = neighbours[i];
        for (const j of list) { x += map.getX(j); y += map.getY(j); }
        next[i * 2] = x / (list.length + 1);
        next[i * 2 + 1] = y / (list.length + 1);
      }
      for (let i = 0; i < n; i++) map.setXY(i, next[i * 2], next[i * 2 + 1]);
    }
  }

  // The cut face: its points get their own map (x = -2, y = how far out from the middle, 0 to 1)
  // and their angle round it (ownPos.x, 0 to 1), so the skin paints the cream disc with the wavy
  // rings of the leaf layers and the rim where the leaves begin.
  const position = head.getAttribute('position') as BufferAttribute;
  const normalAttr = head.getAttribute('normal') as BufferAttribute;
  const uv = head.getAttribute('uv') as BufferAttribute;
  const own = head.getAttribute('ownPos') as BufferAttribute;
  const cutOut = new Vector3(-1, 0.06, 0.1).normalize();
  const cutAt = new Vector3(0.5, 0, 0);
  const centre = axisAt(0.5);
  const p = new Vector3();
  const nrm = new Vector3();
  // Two passes: find the face's points and how far out the face reaches, then map them so the
  // disc's own edge is at 1 (its rim and golden ring land where they should, whatever its size).
  const onFace: number[] = [];
  let reach = 0.01;
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    nrm.fromBufferAttribute(normalAttr, i);
    if (p.clone().sub(cutAt).dot(cutOut) < -0.45 || nrm.dot(cutOut) < 0.55) continue;
    onFace.push(i);
    reach = Math.max(reach, Math.hypot((p.y - centre.y) / squash, p.z - centre.z));
  }
  for (const i of onFace) {
    p.fromBufferAttribute(position, i);
    const dy = (p.y - centre.y) / squash;
    const dz = p.z - centre.z;
    uv.setXY(i, -2, Math.min(1, Math.hypot(dy, dz) / reach));
    own.setX(i, (Math.atan2(dz, dy) / (2 * Math.PI) + 1) % 1);
  }
  own.needsUpdate = true;
  uv.needsUpdate = true;

  // 3. The outer leaves: real separate leaves wrapped round the head, each a closed, thin shape
  //    (thick along its rib, thinning to its edge), narrow at the base, widening toward the top,
  //    rounded at its tip, the top flaring a little away from the head with soft ruffles. Laid like
  //    shingles round the head: each leaf's left edge sits low and its right edge high, so where
  //    two overlap one is always on top, all the way round, and they never pass through each other.
  const outer: BufferGeometry[] = [];
  const turn0 = random() * Math.PI * 2;
  const ringsAlong = 52;
  const around = 18;
  for (let i = 0; i < OUTER_LEAVES; i++) {
    const centreAngle = turn0 + (2 * Math.PI * i) / OUTER_LEAVES + signed(random) * 0.12;
    // None straight underneath, pressed into the table.
    const down = Math.cos(centreAngle) * squash;
    if (down < -0.8) continue;
    const x0 = 0.7 + random() * 0.9;
    const length = 21 + random() * 4.5;
    const span = (Math.PI / OUTER_LEAVES) * (1.25 + random() * 0.2);
    const flare = 0.45 + random() * 0.4;
    const ruffle = 0.22 + random() * 0.18;
    const waves = 5 + random() * 3;
    const phase = random() * Math.PI * 2;
    const id = (2.1 + random() * 0.8) / 3;
    const rings: Vector3[][] = [];
    const centres: Vector3[] = [];
    const uvs: number[] = [];
    for (let k = 0; k <= ringsAlong; k++) {
      const u = k / ringsAlong;
      const x = Math.min(LENGTH + 0.6, x0 + u * length);
      // The outline: narrow at the base, widest past the middle, a round tip.
      const tip = u > 0.72 ? Math.sqrt(Math.max(0, 1 - ((u - 0.72) / 0.28) ** 2)) : 1;
      // (Wide from the base on, so the outer leaves cover the lower head: the inner leaves' edges
      // showed between them there as pale flakes, the user 2026-11-14.)
      const halfAngle = span * (0.85 + 0.15 * smoothstep(0, 0.6, u)) * tip + 0.02;
      const ring: Vector3[] = [];
      for (let j = 0; j < around; j++) {
        const psi = (2 * Math.PI * j) / around;
        const c = Math.cos(psi);
        const side = Math.sin(psi);
        const edge = Math.abs(c);
        const angle = centreAngle + c * halfAngle;
        // Its height off the head: a hair clear of it, the shingle tilt, the flaring top, the ruffle.
        // (Sitting in from the head's outline, so the size stays as the user approved it.)
        let r = radius(x) - 0.35 + 0.22 * c * (0.5 + 0.5 * smoothstep(0.0, 0.25, u));
        // The base tucks into the head (cut-off leaf ends showed as stripes round the base).
        r -= 0.75 * (1 - smoothstep(0, 0.14, u));
        r += flare * smoothstep(0.5, 1, u) ** 2 * (0.6 + 0.4 * edge);
        r += ruffle * smoothstep(0.35, 0.85, u) * edge ** 2.5 * Math.sin(waves * Math.PI * u * 2 + phase + c * 3);
        // Thick along the rib, thin at the edge.
        const thick = (0.05 + 0.13 * (1 - smoothstep(0.0, 0.5, edge)) * (1 - 0.6 * u)) * (0.4 + 0.6 * Math.sqrt(Math.max(0, 1 - c * c)));
        r += side * thick;
        ring.push(axisAt(x).addScaledVector(new Vector3(0, Math.cos(angle) * squash, Math.sin(angle)), r));
        uvs.push(u, (1 - c) / 2);
      }
      rings.push(ring);
      centres.push(axisAt(x).addScaledVector(radial(centreAngle), radius(x)));
    }
    const leaf: StemmedLeaf = { rings, centres, bladeStart: 0, uvs };
    const g = stemmedLeafGeometry(leaf, id);
    // The skin's map, the same as on the head: x how pale (the broad rib, the white base), y how
    // green (rising up the leaf); ownPos: the leaf's number, no crevice, how near its edge.
    const map = g.getAttribute('uv') as BufferAttribute;
    const own = g.getAttribute('ownPos') as BufferAttribute;
    const leafMap = new Float32Array(map.count * 2);
    for (let v = 0; v < map.count; v++) {
      leafMap[v * 2] = Math.min(1, Math.max(0.001, map.getX(v)));
      leafMap[v * 2 + 1] = 1 - 2 * map.getY(v);
    }
    g.setAttribute('leafMap', new BufferAttribute(leafMap, 2));
    for (let v = 0; v < map.count; v++) {
      const u = Math.min(1, Math.max(0, map.getX(v)));
      const across = Math.abs(map.getY(v) - 0.5) * 2;
      const ribHalf = 0.44 - 0.32 * smoothstep(0, 0.85, u);
      const rib = 1 - smoothstep(ribHalf * 0.55, ribHalf * 1.35, across);
      map.setXY(v, Math.max(rib, 1 - smoothstep(0.08, 0.35, u)), smoothstep(0.18, 0.7, u));
      own.setXYZ(v, id, 0, smoothstep(0.7, 1, across));
    }
    // Faces outward (a positive volume), whichever way the rings ran.
    if (signedVolumeOf(g) < 0) {
      const index = g.getIndex()!;
      for (let t = 0; t < index.count; t += 3) {
        const a = index.getX(t + 1);
        index.setX(t + 1, index.getX(t + 2));
        index.setX(t + 2, a);
      }
    }
    outer.push(g);
  }

  return finishPieces([
    { role: 'head', geometry: head, keepNormals: true },
    // The same role: the skin and the head's quiet sheen on the outer leaves too.
    { role: 'head', geometry: mergeGeometries(outer)! },
  ]);
};
