import { Vector3 } from 'three';
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
const CROWN_HEIGHT = 9.3;
const RING_CLUSTERS = 6;
const RING_DISTANCE = 3.3;
/** How many lumps cover each cluster. */
const LUMPS = 9;
/** Where the stalk forks (cm above the cut). */
const FORK = 4.6;
/** How far it tips over as it lies down (radians): a little short of flat, so the cut end lifts. */
const LIE = (78 * Math.PI) / 180;

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
      const spread = k === 0 ? 0 : 0.55 + random() * 0.55;
      const side = new Vector3().crossVectors(outward, new Vector3(0, 1, 0.01)).normalize();
      const side2 = new Vector3().crossVectors(outward, side).normalize();
      const direction = outward
        .clone()
        .multiplyScalar(Math.cos(spread))
        .addScaledVector(side, Math.sin(spread) * Math.cos(around))
        .addScaledVector(side2, Math.sin(spread) * Math.sin(around));
      const radius = 0.75 + random() * 0.45;
      blobs.push({ centre: cluster.centre.clone().addScaledVector(direction, cluster.radius * 0.82), radius });
    }
  }
  const crown = crownGeometry({ blobs, centre: middle, softness: 0.45, detail: 21 });

  // 3. The stalk: thick, cut flat at the base, gently curved, up to the fork.
  const lean = new Vector3(signed(random) * 0.3, 0, signed(random) * 0.3);
  const fork = new Vector3(0, FORK, 0).add(lean);
  // Soft ribs run up the stalk (strands of the branches inside it), fading out at the cut.
  const ribTurn = random() * Math.PI * 2;
  const trunk = sweepGeometry({
    points: [new Vector3(0, 0, 0), new Vector3(0, FORK * 0.55, 0).addScaledVector(lean, 0.3), fork.clone().add(new Vector3(0, 0.8, 0))],
    radius: (t) => (1.6 - 0.35 * t) * cutEnd(t, 0.025),
    around: (t, a) => 1 + 0.06 * Math.min(1, t * 8) * Math.cos(7 * a + ribTurn + t * 1.5),
    rings: 12,
    segments: 26,
  });

  // Leaf scars: a few pointed stubs angled up and out, where side leaves were snapped off.
  const stalks: FormPiece[] = [{ role: 'stalk', geometry: trunk }];
  for (let k = 0; k < 4; k++) {
    const a = ribTurn + k * 1.7 + signed(random) * 0.4;
    const height = 1.4 + k * 0.85 + random() * 0.3;
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

  // 4. A branch from the fork up into every cluster (they show under the crown).
  for (const cluster of clusters) {
    const into = cluster.centre.clone().lerp(middle, 0.35);
    const bend = fork.clone().lerp(into, 0.5).add(new Vector3(0, -0.4, 0));
    stalks.push({
      role: 'stalk',
      geometry: sweepGeometry({
        points: [fork.clone().add(new Vector3(0, -0.6, 0)), bend, into],
        radius: (t) => (0.72 - 0.3 * t) * Math.sqrt(Math.min(1, (1 - t) / 0.08 + 0.2)),
        rings: 8,
        segments: 10,
      }),
    });
  }

  // 5. One leaf curling off the stalk, low down, out and then down.
  const leafTurn = random() * Math.PI * 2;
  const leaf = leafPiece({
    base: new Vector3(Math.cos(leafTurn) * 1.1, 2.6, Math.sin(leafTurn) * 1.1),
    turn: leafTurn,
    length: 5.5,
    width: 2.2,
    lift: (d) => 0.9 * d - 0.22 * d * d,
    fold: 0.35,
    twist: 0.5,
  });

  // 6. Lay it down: tip it over so the crown rests on the table and the cut end lifts.
  const pieces: FormPiece[] = [{ role: 'florets', geometry: crown }, ...stalks, { role: 'leaf', geometry: leaf, doubleSided: true }];
  for (const piece of pieces) piece.geometry.rotateZ(LIE);
  return finishPieces(pieces);
};
