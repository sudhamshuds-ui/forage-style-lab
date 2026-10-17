import { BufferGeometry, Color, Float32BufferAttribute, Mesh, ShaderMaterial, Vector2 } from 'three';
import type { Settings } from '../params';
import { backdropLayout } from './backdropLayout';
import { colourGLSL } from '../shading/chunks/colour.glsl';
import { noiseGLSL } from '../shading/chunks/noise.glsl';

/**
 * The painted backdrop behind the apple.
 *
 * Two big, calm planes, like the wall and table in the reference paintings,
 * meet at a slightly tilted line. A soft patch of window light (two panes)
 * falls across the table. The Backdrop slider picks the arrangement
 * (see backdropLayout.ts): where the line sits, its tilt, where the light falls.
 *
 * Colour variation adds very large, gentle drifts of lightness and hue, so
 * the planes never read as flat digital fills. Horizon softness still sets
 * how crisp the line between wall and table is.
 *
 * It is a single triangle that covers the whole screen, drawn before
 * everything else, so it never moves when you orbit.
 *
 * This is only the underpainting: the glaze pass (src/painting) adds slabs,
 * paper grain and the cast shadow on top.
 */
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uWall;
uniform vec3 uTable;
uniform vec3 uLight;
uniform float uHorizon;
uniform float uTilt;
uniform float uSoftness;
uniform float uVariation;
uniform float uContrast;
uniform vec2 uPatchCentre;
uniform float uPatchAngle;
uniform float uPatchWidth;
uniform vec2 uResolution;
varying vec2 vUv;

${colourGLSL}
${noiseGLSL}

// A rectangle with a gently wobbling, soft edge: 1 inside, 0 outside.
float softBox(vec2 q, vec2 halfSize, float soft) {
  vec2 d = abs(q) - halfSize;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return 1.0 - smoothstep(-soft, soft, dist);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  // Positions in "screen heights", centred horizontally, so shapes keep their proportions.
  vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y);

  // 1. Wall and table, split by a tilted line with a hand-painted wobble.
  float wobble = (fbm3(vec3(p.x * 3.0, 0.0, 2.0)) - 0.5) * 0.012;
  float line = uHorizon + p.x * uTilt + wobble;
  float width = 0.003 + uSoftness * 0.25;
  float onWall = smoothstep(line - width, line + width, p.y);

  // Push the two planes apart in lightness, so the table edge reads clearly.
  vec3 wall = linearToOklab(uWall);
  vec3 table = linearToOklab(uTable);
  wall.x += 0.025 * uContrast;
  table.x -= 0.025 * uContrast;
  vec3 lab = mix(table, wall, onWall);

  // 2. Window light on the table: two panes, lighter and warmer than the table.
  vec2 q = p - vec2((uPatchCentre.x - 0.5) * aspect, uPatchCentre.y);
  float c = cos(uPatchAngle);
  float s = sin(uPatchAngle);
  q = mat2(c, -s, s, c) * q;
  q.x += q.y * 0.35; // lean, like light coming in at an angle
  q += (vec2(fbm3(vec3(p * 9.0, 4.0)), fbm3(vec3(p * 9.0, 9.0))) - 0.5) * 0.006;
  vec2 pane = vec2(uPatchWidth * 1.2, uPatchWidth * 0.5);
  float gap = uPatchWidth * 0.06;
  float window = max(
    softBox(q - vec2(-pane.x - gap, 0.0), pane, 0.004),
    softBox(q - vec2(pane.x + gap, 0.0), pane, 0.004)
  );
  window *= 1.0 - onWall;
  vec3 lit = mix(lab, linearToOklab(uLight), 0.4);
  lit.x += 0.04;
  lab = mix(lab, lit, window * 0.85);

  // 3. Gentle drifts of lightness and hue across each plane.
  float drift = fbm3(vec3(p * vec2(1.2, 2.2), 0.0)) - 0.5;
  float turn = (fbm3(vec3(p * vec2(1.6, 2.6), 7.3)) - 0.5) * 0.5 * uVariation;
  lab.x += drift * 0.05 * uVariation;
  lab.yz = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * lab.yz;
  vec3 colour = max(oklabToLinear(lab), 0.0);

  // Alpha 0 labels this as "backdrop" for the paint pass.
  gl_FragColor = vec4(colour, 0.0);
  #include <colorspace_fragment>
}
`;

export class Background {
  readonly mesh: Mesh;
  private readonly uniforms = {
    uWall: { value: new Color() },
    uTable: { value: new Color() },
    uLight: { value: new Color() },
    uHorizon: { value: 0.4 },
    uTilt: { value: 0 },
    uSoftness: { value: 0.04 },
    uVariation: { value: 0.35 },
    uContrast: { value: 0.5 },
    uPatchCentre: { value: new Vector2(0.5, 0.2) },
    uPatchAngle: { value: -0.5 },
    uPatchWidth: { value: 0.15 },
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

  update(settings: Settings, size: { width: number; height: number }): void {
    const { scene } = settings;
    const layout = backdropLayout(scene.backdrop);
    const u = this.uniforms;
    u.uWall.value.set(scene.backgroundTop);
    u.uTable.value.set(scene.backgroundBottom);
    // The window light borrows the pale, warm highlight colour of the combo.
    u.uLight.value.set(settings.colour.highlight);
    u.uHorizon.value = layout.horizon;
    u.uTilt.value = layout.tilt;
    u.uSoftness.value = scene.horizonSoftness / 100;
    u.uVariation.value = scene.variation / 100;
    u.uContrast.value = layout.contrast;
    u.uPatchCentre.value.set(layout.patchCentre.x, layout.patchCentre.y);
    u.uPatchAngle.value = layout.patchAngle;
    u.uPatchWidth.value = layout.patchWidth;
    u.uResolution.value.set(size.width, size.height);
  }
}
