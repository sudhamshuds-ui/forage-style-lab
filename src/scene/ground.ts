import { CustomBlending, Mesh, OneFactor, OneMinusSrcAlphaFactor, PlaneGeometry, ShadowMaterial, SrcAlphaFactor, Vector3, ZeroFactor } from 'three';
import type { Settings } from '../params';

/**
 * An invisible floor that only shows the apple's cast shadow.
 *
 * It sits right under the apple and uses a ShadowMaterial: the floor itself is
 * see-through, and only the shadow is drawn, tinted with the shadow colour.
 * When the light drops below the horizon the shadow fades out, since a
 * lamp under the table could not cast it.
 */
export class Ground {
  readonly mesh: Mesh<PlaneGeometry, ShadowMaterial>;

  constructor() {
    const geometry = new PlaneGeometry(30, 30);
    geometry.rotateX(-Math.PI / 2);
    const material = new ShadowMaterial({ transparent: true, depthWrite: false });
    // Darken the colour underneath, but leave its alpha alone: alpha is the
    // "backdrop or object" label the paint stroke pass reads.
    material.blending = CustomBlending;
    material.blendSrc = SrcAlphaFactor;
    material.blendDst = OneMinusSrcAlphaFactor;
    material.blendSrcAlpha = ZeroFactor;
    material.blendDstAlpha = OneFactor;
    this.mesh = new Mesh(geometry, material);
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
