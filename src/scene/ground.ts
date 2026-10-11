import { Mesh, PlaneGeometry, ShadowMaterial, Vector3 } from 'three';
import type { Settings } from '../params';

/**
 * An invisible floor that only shows the apple's cast shadow.
 *
 * It sits right under the apple and uses a ShadowMaterial: the floor itself is
 * see-through, and only the shadow is drawn, tinted with Shadow colour.
 * When the light drops below the horizon the shadow fades out, since a
 * lamp under the table could not cast it.
 */
export class Ground {
  readonly mesh: Mesh<PlaneGeometry, ShadowMaterial>;

  constructor() {
    const geometry = new PlaneGeometry(30, 30);
    geometry.rotateX(-Math.PI / 2);
    this.mesh = new Mesh(geometry, new ShadowMaterial({ transparent: true, depthWrite: false }));
    this.mesh.receiveShadow = true;
  }

  setHeight(y: number): void {
    this.mesh.position.y = y;
  }

  update(scene: Settings['scene'], lightDirection: Vector3): void {
    this.mesh.visible = scene.castShadow;
    this.mesh.material.color.set(scene.shadowColour);
    const t = Math.min(1, Math.max(0, (lightDirection.y - 0.05) / 0.25));
    const lightAbove = t * t * (3 - 2 * t);
    this.mesh.material.opacity = (scene.shadowAmount / 100) * lightAbove;
  }
}
