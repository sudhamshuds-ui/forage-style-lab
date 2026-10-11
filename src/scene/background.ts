import { BufferGeometry, Color, Float32BufferAttribute, Mesh, ShaderMaterial, Vector2 } from 'three';
import type { Settings } from '../params';
import { colourGLSL } from '../shading/chunks/colour.glsl';
import { noiseGLSL } from '../shading/chunks/noise.glsl';

/**
 * The painted backdrop behind the apple.
 *
 * Two colours meet at a horizon, like the wall and table in the reference.
 * Turn Horizon softness up for a long soft gradient, down for a crisp line.
 * Colour variation adds big soft patches of slightly shifted hue and
 * lightness, so the background never reads as one flat digital fill.
 *
 * It is a single triangle that covers the whole screen, drawn before
 * everything else, so it never moves when you orbit.
 *
 * This is only the underpainting: the paint pass (src/painting) repaints it
 * with big brush slabs.
 */
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform float uHorizon;
uniform float uSoftness;
uniform float uVariation;
uniform vec2 uResolution;
varying vec2 vUv;

${colourGLSL}
${noiseGLSL}

void main() {
  vec2 p = vUv;
  p.x *= uResolution.x / uResolution.y;

  // Big soft blotches, stretched sideways like broad brush passes.
  float blotch = fbm3(vec3(p * vec2(1.4, 3.0), 0.0)) - 0.5;
  float patches = fbm3(vec3(p * vec2(2.2, 4.4), 7.3)) - 0.5;

  float y = vUv.y + blotch * 0.06 * uVariation;
  float width = 0.006 + uSoftness * 0.5;
  float t = smoothstep(uHorizon - width, uHorizon + width, y);
  vec3 colour = mixOklab(uBottom, uTop, t);

  // Colour variation: nudge lightness and turn the hue a little, patch by patch.
  vec3 lab = linearToOklab(colour);
  lab.x += patches * 0.09 * uVariation;
  float turn = blotch * 0.7 * uVariation;
  lab.yz = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * lab.yz;
  colour = max(oklabToLinear(lab), 0.0);

  // Alpha 0 labels this as "backdrop" for the paint stroke pass.
  gl_FragColor = vec4(colour, 0.0);
  #include <colorspace_fragment>
}
`;

export class Background {
  readonly mesh: Mesh;
  private readonly uniforms = {
    uTop: { value: new Color() },
    uBottom: { value: new Color() },
    uHorizon: { value: 0.4 },
    uSoftness: { value: 0.12 },
    uVariation: { value: 0.35 },
    uResolution: { value: new Vector2(1, 1) },
  };

  constructor() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
  }

  update(scene: Settings['scene'], size: { width: number; height: number }): void {
    this.uniforms.uTop.value.set(scene.backgroundTop);
    this.uniforms.uBottom.value.set(scene.backgroundBottom);
    this.uniforms.uHorizon.value = scene.horizon / 100;
    this.uniforms.uSoftness.value = scene.horizonSoftness / 100;
    this.uniforms.uVariation.value = scene.variation / 100;
    this.uniforms.uResolution.value.set(size.width, size.height);
  }
}
