import { Color, DoubleSide, FrontSide, ShaderMaterial, Vector3, type IUniform } from 'three';
import type { Settings } from '../params';
import type { FrameContext, ShaderEffect } from './effect';
import { colourGLSL } from './chunks/colour.glsl';
import { noiseGLSL } from './chunks/noise.glsl';

/**
 * StylizedLook turns a list of ShaderEffects into materials.
 *
 * A "shader" is a tiny program the graphics card runs for every pixel.
 * Here we assemble one from the effect layers: shared setup first, then
 * each effect's code in order, then output the final colour.
 *
 * All materials made by one StylizedLook share the same light and effect
 * settings, but each has its own palette (base, lit, shadow, highlight, glow), so the
 * apple body, stem and leaf can be coloured separately.
 */

const vertexShader = /* glsl */ `
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vObjectPos;

void main() {
  vObjectPos = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

function buildFragmentShader(effects: ShaderEffect[]): string {
  const declarations = effects
    .map((e) => `// ---- ${e.name} ----\n${e.declarations.trim()}`)
    .join('\n\n');
  const bodies = effects
    .map((e) => `  // ---- ${e.name} ----\n  {\n${indent(e.body.trim(), 4)}\n  }`)
    .join('\n\n');

  return /* glsl */ `
uniform vec3 uLightDir;
uniform float uSoftness;
uniform float uPaintEdges;
uniform vec3 uBaseColour;
uniform vec3 uLitColour;
uniform vec3 uShadowColour;
uniform vec3 uHighlightColour;
uniform vec3 uGlowColour;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vObjectPos;

${colourGLSL}
${noiseGLSL}

float paintNoise;

float paintStep(float edge, float x, float range) {
  float width = range * (0.004 + uSoftness * 0.16);
  float wobble = paintNoise * uPaintEdges * 0.45 * range;
  return smoothstep(edge - width, edge + width, x + wobble);
}

${declarations}

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N; // leaves are seen from both sides
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uLightDir);
  vec3 worldPos = vWorldPos;
  vec3 objectPos = vObjectPos;
  paintNoise = fbm3(objectPos * 2.4) - 0.5;

  float tone = 0.5;
  float highlightMask = 0.0;
  vec3 colour = uBaseColour;

${bodies}

  // Alpha is a label for the paint stroke pass, not transparency:
  // 0 = backdrop, 0.5 = object, up to 1.0 = crisp highlight on the object.
  gl_FragColor = vec4(colour, 0.5 + 0.5 * clamp(highlightMask, 0.0, 1.0));
  #include <colorspace_fragment>
}
`;
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n');
}

export interface Palette {
  base: string;
  lit: string;
  shadow: string;
  highlight: string;
  /** Warm, saturated colour for light passing through thin edges (see effects/glow.ts). */
  glow: string;
}

export class StylizedLook {
  /** Uniforms shared by every material: the core ones plus every effect's own. */
  readonly shared: Record<string, IUniform>;
  private readonly fragmentShader: string;

  constructor(private readonly effects: ShaderEffect[]) {
    this.shared = {
      uLightDir: { value: new Vector3(0, 1, 0) },
      uSoftness: { value: 0.1 },
      uPaintEdges: { value: 0.3 },
    };
    for (const effect of effects) Object.assign(this.shared, effect.uniforms);
    this.fragmentShader = buildFragmentShader(effects);
  }

  createMaterial(options: { doubleSided?: boolean } = {}): ShaderMaterial {
    return new ShaderMaterial({
      // Spreading copies references, so every material sees the same shared values.
      uniforms: {
        ...this.shared,
        uBaseColour: { value: new Color() },
        uLitColour: { value: new Color() },
        uShadowColour: { value: new Color() },
        uHighlightColour: { value: new Color() },
        uGlowColour: { value: new Color() },
      },
      vertexShader,
      fragmentShader: this.fragmentShader,
      side: options.doubleSided ? DoubleSide : FrontSide,
    });
  }

  /** Push the latest panel values into the shader. Called before each render. */
  update(settings: Settings, context: FrameContext): void {
    (this.shared.uLightDir.value as Vector3).copy(context.lightDirection);
    // Wash bleed widens the soft transition between tone bands, like wet paint
    // running into its neighbour. The hidden Band softness still sets the minimum.
    const softness = settings.light.softness / 100;
    this.shared.uSoftness.value = softness + (Math.max(softness, 0.45) - softness) * (settings.paint.washBleed / 100);
    this.shared.uPaintEdges.value = settings.light.paintEdges / 100;
    for (const effect of this.effects) effect.update(settings, context);
  }
}

/** Set one material's palette from hex strings. */
export function setPalette(material: ShaderMaterial, palette: Palette): void {
  (material.uniforms.uBaseColour.value as Color).set(palette.base);
  (material.uniforms.uLitColour.value as Color).set(palette.lit);
  (material.uniforms.uShadowColour.value as Color).set(palette.shadow);
  (material.uniforms.uHighlightColour.value as Color).set(palette.highlight);
  (material.uniforms.uGlowColour.value as Color).set(palette.glow);
}
