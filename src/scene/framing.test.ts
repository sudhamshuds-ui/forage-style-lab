import { describe, expect, it } from 'vitest';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { CARD_FRAMING, boxCorners, contactHeight, frameSubject } from './framing';

/** The Style Lab's starting camera (see stage.ts), on a 3:4 card. */
function cardCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(28, 3 / 4, 0.1, 150);
  camera.position.setFromSphericalCoords(8.6, (75 * Math.PI) / 180, (24 * Math.PI) / 180);
  camera.lookAt(0, 0.2, 0);
  camera.updateMatrixWorld();
  return camera;
}

/** Where a set of points lands on the card: width, and the top as a fraction from the top. */
function onCard(points: Vector3[], scale: number, groundY: number, camera: PerspectiveCamera) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of points) {
    const s = p.clone().multiplyScalar(scale);
    s.y += groundY;
    s.project(camera);
    xs.push(s.x);
    ys.push(s.y);
  }
  return { width: (Math.max(...xs) - Math.min(...xs)) / 2, top: (1 - Math.max(...ys)) / 2 };
}

describe('card framing', () => {
  const camera = cardCamera();

  it('puts the contact line about 74% of the way down the card', () => {
    const y = contactHeight(camera);
    const p = new Vector3(0, y, 0).project(camera);
    expect((1 - p.y) / 2).toBeCloseTo(CARD_FRAMING.contactLine, 3);
  });

  it('fills the subject zone, whatever the real size', () => {
    // A 3.5 cm strawberry and a 22 cm loaf (roughly, in scene units) both end up the same size on the card.
    for (const size of [new Vector3(0.9, 0.9, 0.9), new Vector3(5.8, 3, 4)]) {
      const box = new Box3(new Vector3(-size.x / 2, 0, -size.z / 2), new Vector3(size.x / 2, size.y, size.z / 2));
      const points = boxCorners(box);
      const { scale, groundY } = frameSubject(points, camera);
      const { width, top } = onCard(points, scale, groundY, camera);
      const zoneTop = CARD_FRAMING.contactLine - CARD_FRAMING.zoneWidth * camera.aspect;
      // It fits, and it touches at least one side of the zone (it is as big as it can be).
      expect(width).toBeLessThanOrEqual(CARD_FRAMING.zoneWidth + 1e-6);
      expect(top).toBeGreaterThanOrEqual(zoneTop - 1e-6);
      expect(Math.min(CARD_FRAMING.zoneWidth - width, top - zoneTop)).toBeLessThan(0.005);
    }
  });
});
