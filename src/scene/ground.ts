import {
  ConstantAlphaFactor,
  CustomBlending,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  ShadowMaterial,
  SrcAlphaFactor,
  Vector3,
  ZeroFactor,
} from 'three';
import type { Settings } from '../params';

/**
 * An invisible floor that only catches the apple's cast shadow.
 *
 * It sits right under the apple and uses a ShadowMaterial: the floor itself is
 * see-through, and only the shadow is drawn. It works in one of two modes:
 *
 *  - Label mode (the painterly look): the floor darkens the table toward the
 *    shadow colour AND writes "how much shadow is here" into the hidden alpha
 *    label (0 = none, 0.2 = full). The glaze pass then repaints the shadow as
 *    a proper coloured shape (see glazeShader.ts). Darkening the colour too
 *    matters at the apple's outline: edge pixels mix apple and shadowed table,
 *    never apple and bright table (which showed as a light dotted halo).
 *  - Classic mode: the floor darkens the colour underneath with the shadow
 *    colour, as the classic stroke pass expects.
 *
 * When the light drops below the horizon the shadow fades out, since a
 * lamp under the table could not cast it.
 */
export class Ground {
  readonly mesh: Mesh<PlaneGeometry, ShadowMaterial>;

  constructor() {
    const geometry = new PlaneGeometry(30, 30);
    geometry.rotateX(-Math.PI / 2);
    const material = new ShadowMaterial({ transparent: true, depthWrite: false });
    material.blending = CustomBlending;
    // Sits exactly on the table: nudge it toward the camera so it always wins the depth test.
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    material.polygonOffsetUnits = -2;
    this.mesh = new Mesh(geometry, material);
    this.mesh.receiveShadow = true;
  }

  setHeight(y: number): void {
    this.mesh.position.y = y;
  }

  update(scene: Settings['scene'], lightDirection: Vector3, labelMode: boolean): void {
    const material = this.mesh.material;
    this.mesh.visible = scene.castShadow;
    material.color.set(scene.shadowColour);
    const t = Math.min(1, Math.max(0, (lightDirection.y - 0.05) / 0.25));
    const lightAbove = t * t * (3 - 2 * t);

    const amount = Math.max(scene.shadowAmount / 100, 0.01);
    if (labelMode) {
      // Darken the colour underneath by the shadow amount, and add a scaled
      // copy of it to the alpha label so full shadow always reads as 0.2.
      material.blendSrc = SrcAlphaFactor;
      material.blendDst = OneMinusSrcAlphaFactor;
      material.blendSrcAlpha = ConstantAlphaFactor;
      material.blendDstAlpha = OneFactor;
      material.blendAlpha = Math.min(1, 0.2 / amount);
      material.opacity = amount * lightAbove;
    } else {
      // Darken the colour underneath, but leave its alpha alone: alpha is the
      // "backdrop or object" label the classic stroke pass reads.
      material.blendSrc = SrcAlphaFactor;
      material.blendDst = OneMinusSrcAlphaFactor;
      material.blendSrcAlpha = ZeroFactor;
      material.blendDstAlpha = OneFactor;
      material.opacity = amount * lightAbove;
    }
  }
}
