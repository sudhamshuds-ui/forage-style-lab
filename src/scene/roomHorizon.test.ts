import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { roomHorizonUv } from './background';

// A camera like the stage's: a little above the ingredient, looking at it.
function cameraAt(height: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(30, 3 / 4, 0.1, 100);
  camera.position.set(3, height, 7.7);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

describe('room horizon (where the wall colour takes over from the table)', () => {
  const centre = new Vector3(0, 0, 0);
  const radius = 1;
  const groundY = -0.9;

  it('sits above the ingredient and below the top of the card', () => {
    const h = roomHorizonUv(cameraAt(2.2), centre, radius, groundY);
    expect(h).not.toBeNull();
    expect(h!).toBeGreaterThan(0.5);
    expect(h!).toBeLessThan(1);
  });

  it('rises on the card as the camera looks down from higher up', () => {
    const low = roomHorizonUv(cameraAt(1.5), centre, radius, groundY)!;
    const high = roomHorizonUv(cameraAt(3.5), centre, radius, groundY)!;
    expect(high).toBeGreaterThan(low);
  });
});
