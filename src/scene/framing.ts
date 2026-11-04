import { Box3, Mesh, Vector3, type BufferAttribute, type Object3D, type PerspectiveCamera } from 'three';

/**
 * Card framing (board 06, "Framed like a card, sized like the real thing").
 *
 * Every ingredient is built at its real size, but on its own card each one
 * fills the same zone, so a strawberry and a loaf feel equally important:
 *   - the subject fits a centred square about 70% of the card width,
 *   - it touches the floor about 74% of the way down the card.
 *
 * Like a camera operator who zooms until the subject fills the frame. We do
 * it by scaling the subject on the stage instead of moving the camera, which
 * looks the same through the lens but keeps the room, the cast shadow and
 * the brush marks at the scale they were tuned at. The form itself stays at
 * its real size (the tests and the line-up use it directly).
 *
 * All rules are fractions of the card, never pixels, because the card will
 * be redesigned.
 */
export const CARD_FRAMING = {
  /** Side of the subject square, as a fraction of the card width. */
  zoneWidth: 0.7,
  /** Where the subject meets the floor, as a fraction of the card height from the top. */
  contactLine: 0.74,
};

export interface Framing {
  /** Height of the table in the scene, so the contact sits on the contact line. */
  groundY: number;
  /** How much the real-size subject is scaled to fill the zone. */
  scale: number;
}

const ITERATIONS = 40;

/**
 * Work out the framing for a subject, seen from the starting camera.
 * `points` outline the subject at real size (bottom at y = 0), already turned
 * to face the camera the way it will on stage.
 */
export function frameSubject(points: Vector3[], camera: PerspectiveCamera): Framing {
  camera.updateMatrixWorld();
  const groundY = contactHeight(camera);
  const aspect = camera.aspect;
  // The zone is a square: its height, as a fraction of the card height.
  const zoneTop = CARD_FRAMING.contactLine - CARD_FRAMING.zoneWidth * aspect;

  const point = new Vector3();
  const fits = (scale: number) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const corner of points) {
      point.copy(corner).multiplyScalar(scale);
      point.y += groundY;
      point.project(camera);
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    // Screen space runs from -1 to 1, so half the span is the fraction of the card.
    const width = (maxX - minX) / 2;
    const top = (1 - maxY) / 2;
    return width <= CARD_FRAMING.zoneWidth && top >= zoneTop;
  };

  // Halve the search range until we find the biggest scale that still fits.
  let low = 0.01;
  let high = 50;
  for (let i = 0; i < ITERATIONS; i++) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return { groundY, scale: low };
}

/** The table height at which the middle of the floor lands on the contact line. */
export function contactHeight(camera: PerspectiveCamera): number {
  const target = 1 - 2 * CARD_FRAMING.contactLine;
  const point = new Vector3();
  let low = -20;
  let high = 20;
  for (let i = 0; i < ITERATIONS; i++) {
    const mid = (low + high) / 2;
    point.set(0, mid, 0).project(camera);
    if (point.y < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** The eight corners of a box (a quick outline, handy for tests). */
export function boxCorners(box: Box3): Vector3[] {
  const corners: Vector3[] = [];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) corners.push(new Vector3(x, y, z));
  return corners;
}

/**
 * Points on the subject's surface, in world space: a few hundred are plenty
 * to find its outline on screen. Using the real surface (not its box) means
 * a lemon is measured by its own silhouette, not by the corners of its box.
 */
export function outlinePoints(object: Object3D, budget = 600): Vector3[] {
  object.updateMatrixWorld(true);
  let total = 0;
  object.traverse((o) => {
    if (o instanceof Mesh && o.visible) total += o.geometry.getAttribute('position').count;
  });
  const step = Math.max(1, Math.floor(total / budget));
  const points: Vector3[] = [];
  object.traverse((o) => {
    if (!(o instanceof Mesh) || !o.visible) return;
    const position = o.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < position.count; i += step) {
      points.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(o.matrixWorld));
    }
  });
  return points;
}

/**
 * The camera's angle round the table, in radians. A turn of 0 on the stage
 * means the subject's front (+Z) looks straight at the starting camera.
 */
export function cameraAzimuth(camera: PerspectiveCamera): number {
  return Math.atan2(camera.position.x, camera.position.z);
}
