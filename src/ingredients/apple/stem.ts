import { BufferGeometry, Float32BufferAttribute, QuadraticBezierCurve3, Vector3 } from 'three';
import type { AppleShape } from './appleBody';

/**
 * The stem: a thin tube that follows a curve.
 *
 * The curve starts straight up out of the dimple and bends to one side
 * toward the tip (Stem curve). The tube is a little thicker at the base.
 */

const SEGMENTS = 32;
const SIDES = 10;

export function buildStemGeometry(anchor: Vector3, shape: AppleShape): BufferGeometry {
  const length = shape.stemLength;
  const bend = shape.stemCurve;
  const up = new Vector3(shape.lean * 0.25, 1, 0).normalize();
  const side = new Vector3(-0.8, 0, 0.6).normalize();

  // Start slightly inside the dimple so there is never a gap at the base.
  const start = anchor.clone().addScaledVector(up, -0.08);
  const control = anchor.clone().addScaledVector(up, length * 0.55);
  const end = anchor
    .clone()
    .addScaledVector(up, length * (1 - 0.3 * bend))
    .addScaledVector(side, length * 0.75 * bend);

  const curve = new QuadraticBezierCurve3(start, control, end);
  const frames = curve.computeFrenetFrames(SEGMENTS, false);

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const point = new Vector3();
  const normal = new Vector3();

  // Rings of points along the curve.
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    curve.getPointAt(t, point);
    const radius = shape.stemRadius * (1.25 - 0.4 * t);
    for (let j = 0; j <= SIDES; j++) {
      const angle = (j / SIDES) * Math.PI * 2;
      normal
        .copy(frames.normals[i])
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[i], Math.sin(angle));
      positions.push(point.x + normal.x * radius, point.y + normal.y * radius, point.z + normal.z * radius);
      normals.push(normal.x, normal.y, normal.z);
    }
  }

  // Connect neighbouring rings with triangles.
  for (let i = 0; i < SEGMENTS; i++) {
    for (let j = 0; j < SIDES; j++) {
      const a = i * (SIDES + 1) + j;
      const b = a + SIDES + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  // Close the tip with a flat cap.
  const tangent = curve.getTangentAt(1);
  const centre = positions.length / 3;
  positions.push(point.x, point.y, point.z);
  normals.push(tangent.x, tangent.y, tangent.z);
  const lastRing = SEGMENTS * (SIDES + 1);
  const capRing = centre + 1;
  for (let j = 0; j <= SIDES; j++) {
    const k = (lastRing + j) * 3;
    positions.push(positions[k], positions[k + 1], positions[k + 2]);
    normals.push(tangent.x, tangent.y, tangent.z);
  }
  for (let j = 0; j < SIDES; j++) indices.push(centre, capRing + j, capRing + j + 1);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}
