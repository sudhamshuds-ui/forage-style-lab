import { Color, DoubleSide, FrontSide, ShaderMaterial, UniformsLib, UniformsUtils, Vector3, type IUniform } from 'three';
import type { Settings } from '../params';
import { mixHex } from '../utils/colour';
import type { FrameContext, ShaderEffect } from './effect';
import { colourGLSL } from './chunks/colour.glsl';
import { noiseGLSL } from './chunks/noise.glsl';
import { labelUniforms, skinUniform } from './effects/skinTexture';

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

// Three.js's own shadow pieces (the same ones the shadow-catching floor uses) work out
// where this point sits in the key light's shadow map, so leaves and neighbours can
// cast real shadows onto the fruit.
const vertexShader = /* glsl */ `
#include <common>
#include <shadowmap_pars_vertex>

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vObjectPos;
// A leaf's own map: x runs from stalk (0) to tip (1), y across (0.5 is the centre vein).
varying vec2 vSurfaceUv;

void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>

  vObjectPos = position;
  vSurfaceUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
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
#include <common>
#include <packing>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

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
varying vec2 vSurfaceUv;

${colourGLSL}
${noiseGLSL}

float paintNoise;

float paintStep(float edge, float x, float range) {
  float width = range * (0.004 + uSoftness * 0.16);
  float wobble = paintNoise * uPaintEdges * 0.45 * range;
  return smoothstep(edge - width, edge + width, x + wobble);
}

// Darken a colour (in OKLab) toward the object's own deep, warm shade (its glow
// colour, a little darker), never toward grey: a dark speck on a lemon turns
// golden, not olive. k = 0 leaves it, 1 is the full shade.
vec3 shadeOwn(vec3 lab, float k) {
  vec3 deep = linearToOklab(uGlowColour);
  deep.x = lab.x - 0.12;
  return mix(lab, deep, clamp(k, 0.0, 1.0));
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

  // Cast shadows falling on this surface (a sepal on its berry, one berry on the next):
  // 1 = in the light, 0 = in a cast shadow. Faded out right at the light-to-shadow line,
  // where the surface turns away from the light anyway, so smooth forms never get speckled.
  float lightMask = mix(1.0, getShadowMask(), smoothstep(0.05, 0.3, dot(N, L)));

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
      // The light and shadow-map values three.js fills in each frame (for cast shadows).
      ...UniformsUtils.clone(UniformsLib.lights),
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
        // Each material's own peel texture (see effects/skinTexture.ts). Plain by default.
        uSkin: skinUniform(),
        // A printed label's artwork and ink (only label pieces use them).
        ...labelUniforms(),
      },
      vertexShader,
      fragmentShader: this.fragmentShader,
      side: options.doubleSided ? DoubleSide : FrontSide,
      // So three.js hands this material the key light's shadow map.
      lights: true,
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

/**
 * Soften a palette to the key light's strength (Light strength, 0 to 100).
 *
 * Like lowering the contrast of a lighting layer: the lit and shadow colours
 * are pulled toward the base colour (mixed in OKLab, so they stay clean), so
 * the lit side never bleaches toward white and the turn into shadow is a
 * gentler step. The shadow moves a little less, so the form still holds.
 * 100 leaves the palette as it is.
 */
export function softenPalette(palette: Palette, strength: number): Palette {
  const pull = 1 - Math.min(100, Math.max(0, strength)) / 100;
  return {
    ...palette,
    lit: mixHex(palette.lit, palette.base, pull),
    shadow: mixHex(palette.shadow, palette.base, pull * 0.8),
  };
}
