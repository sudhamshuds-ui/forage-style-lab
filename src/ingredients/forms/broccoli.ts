import { Vector3, type BufferAttribute, type BufferGeometry } from 'three';
import { crownGeometry, type Blob } from './kit/crown';
import { finishPieces, type FormBuilder, type FormPiece } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { leafPiece } from './kit/stemLeaf';
import { cutEnd, sweepGeometry } from './kit/sweep';

/**
 * Broccoli (archetype: branching). Spec: about 15 cm from the cut to the top of
 * the crown, lying on its side.
 *
 * What makes it broccoli, not a tree, a bush or a mushroom (the user's references):
 *   - a crown made of many florets: seven clusters, each a rounded core covered
 *     in smaller lumps, blended with a tight fillet, so the outline is lumpy
 *     all the way round (a smooth dome reads as a mushroom),
 *   - a thick, pale stalk with a flat cut at the base, softly ribbed along its
 *     length, with a few pointed leaf scars (where side leaves were snapped off),
 *     forking into a branch for every cluster; the branches show under the crown,
 *   - one leaf curling off the stalk,
 *   - lying on its side, crown resting on the table and the cut end lifted,
 *     never standing up like a tree.
 * The tiny buds are the shader's job (skin: florets), never geometry.
 *
 * It is built standing up (easier to think about), then laid down.
 */

/** Height of the crown's middle above the cut (cm), and how far its clusters spread. */
const CROWN_HEIGHT = 9.6;
const RING_CLUSTERS = 6;
const RING_DISTANCE = 3.3;
/** How many lumps cover each cluster (the user asked for about 70% more bump than 9). */
const LUMPS = 15;
/** Where the stalk forks (cm above the cut): high enough that the finger branches stay short. */
const FORK = 5.6;

export const buildBroccoli: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Broccoli: the "${state}" form is not built yet (head only for now).`);

  const random = seededRandom(seed);
  const middle = new Vector3(0, CROWN_HEIGHT, 0);

  // 1. The clusters: one on top, six round it on a dome, each its own size.
  const clusters: Blob[] = [{ centre: middle.clone().add(new Vector3(signed(random) * 0.3, 2.3, signed(random) * 0.3)), radius: 2.0 }];
  const start = random() * Math.PI * 2;
  for (let i = 0; i < RING_CLUSTERS; i++) {
    const a = start + (i / RING_CLUSTERS) * Math.PI * 2 + signed(random) * 0.3;
    const tilt = ((55 + signed(random) * 8) * Math.PI) / 180;
    const out = RING_DISTANCE + signed(random) * 0.25;
    clusters.push({
      centre: middle.clone().add(new Vector3(Math.sin(tilt) * Math.cos(a) * out, Math.cos(tilt) * out, Math.sin(tilt) * Math.sin(a) * out)),
      radius: 1.85 + signed(random) * 0.2,
    });
  }

  // 2. Each cluster is covered in lumps on its outer side (a floret is a bunch of smaller florets).
  const blobs: Blob[] = [{ centre: middle.clone(), radius: 2.6 }]; // the crown's inner mass, where the branches go in
  const below = middle.clone().add(new Vector3(0, -2, 0));
  for (const cluster of clusters) {
    blobs.push(cluster);
    const outward = cluster.centre.clone().sub(below).normalize();
    for (let k = 0; k < LUMPS; k++) {
      // A direction within a wide cone round the cluster's outward side.
      const around = (k / LUMPS) * Math.PI * 2 + signed(random) * 0.4;
      const spread = k === 0 ? 0 : 0.35 + random() * 0.85;
      const side = new Vector3().crossVectors(outward, new Vector3(0, 1, 0.01)).normalize();
      const side2 = new Vector3().crossVectors(outward, side).normalize();
      const direction = outward
        .clone()
        .multiplyScalar(Math.cos(spread))
        .addScaledVector(side, Math.sin(spread) * Math.cos(around))
        .addScaledVector(side2, Math.sin(spread) * Math.sin(around));
      // Smaller lumps, poking further out, so each one reads as its own floret.
      const radius = 0.6 + random() * 0.35;
      blobs.push({ centre: cluster.centre.clone().addScaledVector(direction, cluster.radius * 0.95), radius });
    }
  }
  // A tight fillet keeps the lumps distinct; a dense mesh keeps them round.
  const crown = crownGeometry({ blobs, softness: 0.32, cell: 0.23 });

  // 3. The stalk: thick, cut flat at the base, gently curved, up to the fork.
  const lean = new Vector3(signed(random) * 0.3, 0, signed(random) * 0.3);
  const fork = new Vector3(0, FORK, 0).add(lean);
  // Soft ribs run up the stalk (strands of the branches inside it), fading out at the cut.
  const ribTurn = random() * Math.PI * 2;
  const trunk = sweepGeometry({
    points: [new Vector3(0, 0, 0), new Vector3(0, FORK * 0.55, 0).addScaledVector(lean, 0.3), fork.clone().add(new Vector3(0, 0.3, 0))],
    radius: (t) => (1.6 - 0.35 * t) * cutEnd(t, 0.025),
    around: (t, a) => 1 + 0.06 * Math.min(1, t * 8) * Math.cos(7 * a + ribTurn + t * 1.5),
    rings: 12,
    segments: 26,
  });

  // Leaf scars: a few pointed stubs angled up and out, where side leaves were snapped off.
  const stalks: FormPiece[] = [{ role: 'stalk', geometry: trunk }];
  for (let k = 0; k < 4; k++) {
    const a = ribTurn + k * 1.7 + signed(random) * 0.4;
    const height = 1.0 + k * 1.0 + random() * 0.3;
    const out = new Vector3(Math.cos(a), 0, Math.sin(a));
    const root = new Vector3(0, height, 0).addScaledVector(lean, height / FORK).addScaledVector(out, 0.9);
    const tip = root.clone().addScaledVector(out, 1.1 + random() * 0.4).add(new Vector3(0, 0.9, 0));
    stalks.push({
      role: 'stalk',
      geometry: sweepGeometry({
        points: [root, root.clone().lerp(tip, 0.5).addScaledVector(out, -0.1), tip],
        // Wide where it grows out of the stalk, tapering to a soft point.
        radius: (t) => 0.42 * (1 - t) ** 0.8 * cutEnd(t, 0.05),
        rings: 6,
        segments: 8,
      }),
    });
  }

  // 4. The fork: thick, finger-like branches grow out of the trunk's top rim and splay apart,
  // each up into its own cluster (the references: a fan of branches with gaps between them,
  // never a blocky trunk end). Together they cover the trunk's top.
  for (const cluster of clusters) {
    const toward = cluster.centre.clone().sub(fork).setY(0);
    const out = toward.lengthSq() > 1e-6 ? toward.normalize() : new Vector3(1, 0, 0);
    const root = fork.clone().addScaledVector(out, 0.55).add(new Vector3(0, -0.35, 0));
    const into = cluster.centre.clone().lerp(middle, 0.15).add(new Vector3(0, -cluster.radius * 0.35, 0));
    // Splay out first, then turn up into the cluster.
    const bend = root.clone().addScaledVector(out, 1.0).add(new Vector3(0, (into.y - root.y) * 0.45, 0));
    stalks.push({
      role: 'stalk',
      geometry: sweepGeometry({
        points: [root, bend, into],
        // Thick fingers, tapering into the cluster (the user liked this thickness; "too big"
        // meant too long, which the higher fork fixes).
        radius: (t) => (0.78 - 0.32 * t) * Math.sqrt(Math.min(1, (1 - t) / 0.08 + 0.2)),
        rings: 9,
        segments: 11,
      }),
    });
  }

  // 5. One leaf curling off the stalk, low down, out and then down.
  // It grows from the side that ends up underneath once the head lies down (-X), so it rests
  // on the table beside the stalk instead of sticking up into the air.
  const leafTurn = Math.PI + signed(random) * 0.5;
  // Long and narrow, barely folded, so it reads as a leaf from any side (never an arrowhead).
  const leaf = leafPiece({
    base: new Vector3(Math.cos(leafTurn) * 1.1, 2.2, Math.sin(leafTurn) * 1.1),
    turn: leafTurn,
    length: 6,
    width: 1.7,
    lift: (d) => 0.6 * d - 0.12 * d * d,
    fold: 0.15,
    twist: 0.3,
  });

  // 6. Lay it down so the crown AND the cut end both rest on the table (never floating):
  // find the tip-over angle where the lowest point of each is level.
  const pieces: FormPiece[] = [{ role: 'florets', geometry: crown }, ...stalks, { role: 'leaf', geometry: leaf, doubleSided: true }];
  const lowest = (geometry: BufferGeometry, angle: number) => {
    const position = geometry.getAttribute('position') as BufferAttribute;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    let low = Infinity;
    for (let i = 0; i < position.count; i++) low = Math.min(low, position.getX(i) * sin + position.getY(i) * cos);
    return low;
  };
  let less = Math.PI / 6;
  let more = Math.PI / 2;
  for (let i = 0; i < 30; i++) {
    const angle = (less + more) / 2;
    // Tipping over further brings the crown down and lifts the cut end: if the cut end is
    // still higher than the crown's lowest point, tip back a little, and the other way round.
    if (lowest(trunk, angle) > lowest(crown, angle)) more = angle;
    else less = angle;
  }
  const lie = (less + more) / 2;
  for (const piece of pieces) piece.geometry.rotateZ(lie);

  // Anything small that would dip below the table (the leaf, a leaf scar) lies flat on it instead.
  const table = Math.min(lowest(crown, 0), lowest(trunk, 0));
  for (const piece of pieces.slice(1)) {
    if (piece.geometry === trunk) continue;
    const position = piece.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < position.count; i++) if (position.getY(i) < table) position.setY(i, table);
    position.needsUpdate = true;
  }
  return finishPieces(pieces);
};
