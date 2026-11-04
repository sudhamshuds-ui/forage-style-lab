import { Vector3 } from 'three';
import { crownGeometry, type Blob } from './kit/crown';
import { finishPieces, type FormBuilder, type FormPiece } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { cutEnd, sweepGeometry } from './kit/sweep';

/**
 * Broccoli (archetype: branching). Spec: about 15 cm tall, one head, standing on its stalk.
 *
 * What makes it broccoli, not a tree or a cauliflower:
 *   - a lumpy crown of five big floret clusters (one on top, four round it),
 *     blended with a soft fillet into one dome, wider than it is tall,
 *   - a pale stalk with a flat cut at the base (the one real flat plane) that
 *     tapers up and splits: its branches start inside the trunk and fan out up
 *     into the clusters (a fork, not straws stuck in a cup),
 *   - the crown sits clearly above the cut, so the stalk shows: that gap is what
 *     reads as "broccoli" in silhouette.
 * The tiny buds are the shader's job (skin: florets), never geometry.
 *
 * Board 07 and 08: three to five big masses only.
 */

/** Real size (cm): about 15 tall and 11 to 12 wide. */
const CROWN_HEIGHT = 9.6;
const CROWN_SPREAD = 3.0;
const CLUSTERS_ROUND = 4;
const TRUNK_TOP = 6.0;

export const buildBroccoli: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Broccoli: the "${state}" form is not built yet (head only for now).`);

  const random = seededRandom(seed);

  // The crown: one cluster on top, four round it, each its own size and height.
  const blobs: Blob[] = [{ centre: new Vector3(signed(random) * 0.4, CROWN_HEIGHT + 1.6, signed(random) * 0.4), radius: 3.0 }];
  const start = random() * Math.PI * 2;
  for (let i = 0; i < CLUSTERS_ROUND; i++) {
    const a = start + (i / CLUSTERS_ROUND) * Math.PI * 2 + signed(random) * 0.35;
    const out = CROWN_SPREAD + signed(random) * 0.3;
    blobs.push({
      centre: new Vector3(Math.cos(a) * out, CROWN_HEIGHT + signed(random) * 0.45, Math.sin(a) * out),
      radius: 2.6 + signed(random) * 0.2,
    });
  }
  // A softer fillet than before, so the clusters merge into one dome instead of a cloud of balls.
  const crown = crownGeometry({ blobs, centre: new Vector3(0, CROWN_HEIGHT + 0.4, 0), softness: 1.5, detail: 18 });

  // The stalk: a thick trunk, cut flat at the base, gently curved.
  const lean = new Vector3(signed(random) * 0.35, 0, signed(random) * 0.35);
  const trunkTop = new Vector3(0, TRUNK_TOP, 0).add(lean);
  const trunk = sweepGeometry({
    points: [new Vector3(0, 0, 0), new Vector3(0, TRUNK_TOP * 0.5, 0).addScaledVector(lean, 0.3), trunkTop],
    // Widest at the cut, tapering up into the fork, with a soft rim on the cut.
    radius: (t) => (1.4 - 0.45 * t) * cutEnd(t, 0.025),
    rings: 14,
    segments: 22,
  });

  // Branches: they start inside the trunk, a little below its top, and fan out up into each
  // cluster round the crown, so the stalk visibly forks.
  const fork = trunkTop.clone().add(new Vector3(0, -1.6, 0));
  const stalks: FormPiece[] = [{ role: 'stalk', geometry: trunk }];
  for (const blob of blobs.slice(1)) {
    const into = blob.centre.clone().lerp(new Vector3(0, blob.centre.y, 0), 0.3).add(new Vector3(0, -0.6, 0));
    const middle = trunkTop.clone().lerp(into, 0.45);
    stalks.push({
      role: 'stalk',
      geometry: sweepGeometry({
        points: [fork, middle, into],
        radius: (t) => (0.85 - 0.35 * t) * Math.sqrt(Math.min(1, (1 - t) / 0.08 + 0.2)),
        rings: 10,
        segments: 12,
      }),
    });
  }

  return finishPieces([{ role: 'florets', geometry: crown }, ...stalks]);
};
