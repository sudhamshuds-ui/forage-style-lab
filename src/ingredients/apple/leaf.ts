import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from 'three';
import type { AppleShape } from './appleBody';

/**
 * The leaf: a flat grid bent into a leaf shape.
 *
 * Along its length it is widest a little before the middle and pointed at
 * the tip. Across, it folds up along the centre vein (a shallow V). It rises
 * out from the stem, then droops toward the tip.
 */

const ALONG = 28;
const ACROSS = 10;

export function buildLeafGeometry(anchor: Vector3, shape: AppleShape): BufferGeometry {
  const length = 0.8 * shape.leafScale;
  const width = 0.3 * shape.leafScale;

  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= ALONG; i++) {
    const u = i / ALONG;
    const halfWidth = width * Math.sin(Math.PI * u ** 0.7) ** 0.85;
    const lift = Math.sin(u * Math.PI * 0.8) * length * 0.2 - u * u * length * 0.28;
    for (let j = 0; j <= ACROSS; j++) {
      const v = (j / ACROSS) * 2 - 1;
      positions.push(u * length, lift + Math.abs(v) * halfWidth * 0.35, v * halfWidth);
    }
  }

  for (let i = 0; i < ALONG; i++) {
    for (let j = 0; j < ACROSS; j++) {
      const a = i * (ACROSS + 1) + j;
      const b = a + ACROSS + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Grow it from the stem just above the rim of the top dimple (the stem leans with Lopsided).
  const up = new Vector3(shape.lean * 0.25, 1, 0).normalize();
  const base = anchor.clone().addScaledVector(up, shape.topDepth * shape.heightScale + 0.04);

  // Place it: tilt up a little, turn it to face out toward the front right, move it to the stem.
  const placement = new Matrix4()
    .makeTranslation(base.x, base.y, base.z)
    .multiply(new Matrix4().makeRotationY(-0.93))
    .multiply(new Matrix4().makeRotationZ(0.45));
  geometry.applyMatrix4(placement);
  return geometry;
}
