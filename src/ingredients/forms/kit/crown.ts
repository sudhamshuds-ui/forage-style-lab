import { BufferAttribute, IcosahedronGeometry, Vector3, type BufferGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { smoothMin } from './lathe';

/**
 * Kit recipe for the top of the **branching** archetype (broccoli, cauliflower,
 * a grape bunch): a few soft blobs blended into one smooth, lumpy mass.
 *
 * Board 07: "Tops are a few soft blobs blended together and smoothed. Keep
 * three to five big masses, never hundreds of bumps."
 *
 * Think of each blob as a ball of clay. They are merged with a soft fillet
 * (a smooth minimum of their distance fields), so where two balls meet the
 * join is a gentle valley, not a crease. To turn that into a mesh, a finely
 * divided sphere is placed round the centre and each of its points is pushed
 * out along its own direction until it reaches the clay's surface (the last
 * time the ray leaves the clay). That gives one clean, closed surface with an
 * even spread of points and smooth normals.
 *
 * All sizes in centimetres. The buds and texture are the shader's job.
 */
export interface Blob {
  centre: Vector3;
  radius: number;
}

export interface CrownOptions {
  blobs: Blob[];
  /** A point well inside the crown, that every direction looks out from. */
  centre: Vector3;
  /** How soft the joins between blobs are (cm): larger is a smoother valley. */
  softness: number;
  /** Mesh density: 20 x (detail + 1)^2 triangles. */
  detail: number;
}

/** The blended distance from a point to the clay: negative inside, positive outside. */
export function crownDistance(p: Vector3, blobs: Blob[], softness: number): number {
  let d = Infinity;
  for (const blob of blobs) {
    const one = p.distanceTo(blob.centre) - blob.radius;
    d = d === Infinity ? one : smoothMin(d, one, softness);
  }
  return d;
}

export function crownGeometry(options: CrownOptions): BufferGeometry {
  const { blobs, centre, softness } = options;
  const sphere = new IcosahedronGeometry(1, options.detail);
  sphere.deleteAttribute('normal');
  sphere.deleteAttribute('uv');
  const geometry = mergeVertices(sphere);
  sphere.dispose();

  // How far any ray could need to go: past the furthest blob.
  let reach = 0;
  for (const blob of blobs) reach = Math.max(reach, blob.centre.distanceTo(centre) + blob.radius + softness);
  const step = reach / 160;

  const position = geometry.getAttribute('position') as BufferAttribute;
  const direction = new Vector3();
  const p = new Vector3();
  const toBlob = new Vector3();
  // Only the blobs this ray passes near can matter (a big speed-up with many lumps).
  let near: Blob[] = blobs;
  const inside = (t: number) => crownDistance(p.copy(centre).addScaledVector(direction, t), near, softness) < 0;

  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize();
    near = blobs.filter((blob) => {
      toBlob.copy(blob.centre).sub(centre);
      const along = Math.max(0, toBlob.dot(direction));
      const across = toBlob.addScaledVector(direction, -along).length();
      return across < blob.radius + softness * 2;
    });
    if (near.length === 0) near = blobs;
    // Walk outward and remember the last step where the ray leaves the clay.
    let lastExit = 0;
    let wasInside = inside(0);
    for (let t = step; t <= reach; t += step) {
      const now = inside(t);
      if (wasInside && !now) lastExit = t;
      wasInside = now;
    }
    // Refine that crossing by halving the step.
    let low = lastExit - step;
    let high = lastExit;
    for (let k = 0; k < 12; k++) {
      const mid = (low + high) / 2;
      if (inside(mid)) low = mid;
      else high = mid;
    }
    p.copy(centre).addScaledVector(direction, (low + high) / 2);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  position.needsUpdate = true;
  return geometry;
}
