import { BufferAttribute, Vector3 } from 'three';
import { LeafMass, type MassBlob, type MassLeaf } from './kit/leafMass';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
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
function radius(x: number): number {
  const t = Math.min(1, Math.max(0, x / LENGTH));
  // (Broad from the cut on, like a loaf: a narrow, rounded base read as a cucumber.)
  return 3.4 + 1.0 * smoothstep(0, 0.35, t) - 0.5 * smoothstep(0.8, 1, t);
}

export const buildRomaine: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Romaine: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x7e4a1);

  // Lying on its side: the axis runs along x, a little above the table, the head slightly
  // flattened where it rests (a heavy head settles).
  const squash = 0.88;
  const axisAt = (x: number) => new Vector3(x, radius(x) * squash, 0);
  const radial = (angle: number) => new Vector3(0, Math.cos(angle) * squash, Math.sin(angle)).normalize();
  const onSurface = (x: number, angle: number, inset: number) =>
    axisAt(x).addScaledVector(new Vector3(0, Math.cos(angle) * squash, Math.sin(angle)), radius(x) - inset);

  // 1. The core: the head's shape, a little inside the leaves.
  const core: MassBlob[] = [2.5, 7, 12, 17, 21.5].map((x) => ({
    centre: axisAt(x),
    // (Close under the leaves, so no gap between them shows as a pit.)
    radii: new Vector3(3.6, (radius(x) - 0.3) * squash, radius(x) - 0.3),
  }));

  // 2. The leaves, in three layers round the head, each its own size, width and ruffle.
  const leaves: MassLeaf[] = [];
  const layers = [
    // Outer: broad, long, reaching to the top. Middle: between them, a little shorter, under.
    // Heart: short pale leaves deep inside, showing at the top where the outer ones open.
    // (Eight outer leaves, the middle layer close under them: gaps between two outer leaves showed
    // a lower leaf as a small round pit.)
    { count: 8, from: 0.6, length: [23, 26], width: [7.8, 9.2], inset: 0.15, rank: 2 },
    { count: 6, from: 1.2, length: [21, 24], width: [6.8, 8], inset: 0.3, rank: 1 },
    { count: 4, from: 7, length: [17, 19.5], width: [5, 6.2], inset: 1.2, rank: 0 },
  ];
  for (const layer of layers) {
    const turn = random() * Math.PI * 2;
    for (let i = 0; i < layer.count; i++) {
      const angle = turn + (2 * Math.PI * (i + 0.5 * layer.rank)) / layer.count + signed(random) * 0.18;
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
        thickness: 0.3,
        // Nearly straight along its length, wrapped round the head across it.
        bend: 70,
        bendAcross: radius(x0 + length * 0.5) - layer.inset + 0.3,
        // (Gentle: deeper puckers left round pits on top; the savoy cells are painted.)
        crinkle: 0.04 + random() * 0.04,
        crinkleScale: 1.6 + random() * 0.6,
        lobes: 0.05 + random() * 0.05,
        // The top edge lifts a little and ruffles (the reference's frilly top), never curling up.
        // Edges hug the head (a raised rim made each leaf a shallow dish: round pits on top).
        rimLift: -0.15 - random() * 0.15,
        // Only the outer leaves' tips curl out; an inner leaf's curled tip broke the surface as a
        // round pit.
        tipCurl: layer.rank === 2 ? 0.3 + random() * 0.4 : -0.2,
        wave: 0.5 + random() * 0.35,
        waves: 6 + Math.floor(random() * 4),
        phase: random() * Math.PI * 2,
        fold: 0,
        // Its layer (0 heart, 1 middle, 2 outer) and its own number, for the skin.
        id: (layer.rank + 0.1 + random() * 0.8) / 3,
      });
    }
  }

  const mass = new LeafMass({
    core,
    leaves,
    stems: [],
    coreSoftness: 1.6,
    // A tight fillet: each leaf's edge stands a little proud of the one under it, so the leaves read.
    leafSoftness: 0.16,
    stemSoftness: 0.1,
    joinSoftness: 0.4,
    table: 0,
    // The cut across the base: a flat face to the front.
    cuts: [{ point: new Vector3(0.4, 0, 0), out: new Vector3(-1, 0, 0), soft: 0.3 }],
    cell: 0.35,
  });
  const head = mass.geometry();

  // The texture's map, worked out here so it blends smoothly where one leaf hands over to the next
  // (the leaf map itself jumps there, and painting from it drew pale lines along every hand-over):
  // x: how pale (the broad rib, and the white base of every leaf), y: how green (rising up the leaf).
  {
    const map = head.getAttribute('uv') as BufferAttribute;
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

  // The cut face: its points get their own map (x = -2, y = how far out from the middle, 0 to 1),
  // so the skin paints the cream disc with its rings and the rim where the leaves begin.
  const position = head.getAttribute('position') as BufferAttribute;
  const normalAttr = head.getAttribute('normal') as BufferAttribute;
  const uv = head.getAttribute('uv') as BufferAttribute;
  const centre = axisAt(0.4);
  for (let i = 0; i < position.count; i++) {
    if (position.getX(i) > 0.75 || normalAttr.getX(i) > -0.6) continue;
    const dy = (position.getY(i) - centre.y) / squash;
    const dz = position.getZ(i) - centre.z;
    uv.setXY(i, -2, Math.min(1, Math.hypot(dy, dz) / radius(0.4)));
  }
  uv.needsUpdate = true;

  return finishPieces([{ role: 'head', geometry: head, keepNormals: true }]);
};
