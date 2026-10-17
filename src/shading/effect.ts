import type { IUniform, Vector3 } from 'three';
import type { Settings } from '../params';

/**
 * A ShaderEffect is one "layer" of the stylized look, like an adjustment
 * layer in After Effects. Effects run in order (see effects/index.ts) and each
 * one can read and change the pixel colour.
 *
 * Inside `body` every effect can use these shared values:
 *
 *   vec3  N              surface direction (normal), world space
 *   vec3  V              direction from the surface toward the camera
 *   vec3  L              direction from the surface toward the key light
 *   vec3  worldPos       position in the world
 *   vec3  objectPos      position on the object itself (sticks to the surface)
 *   float paintNoise     soft random blotches, about -0.5..0.5, for wobbly edges
 *   float tone           0 = deepest shadow band, 1 = brightest band (set by Tone bands)
 *   float highlightMask  0..1, where a crisp highlight sits. The paint stroke
 *                        pass keeps these pixels sharp instead of repainting them.
 *   vec3  colour         the colour so far: read it, change it, write it back
 *
 *   vec3  uBaseColour, uLitColour, uShadowColour, uHighlightColour, uGlowColour   this object's palette
 *
 *   float paintStep(float edge, float x, float range)
 *     A painted edge: 0 below `edge`, 1 above, with a soft and slightly
 *     wobbly transition. `range` is roughly how big x's usual span is
 *     (1.0 for light amounts), so the wobble is scaled to match.
 *
 * Each effect's body is wrapped in its own { } block, so local variables
 * never clash between effects.
 */
export interface ShaderEffect {
  /** Shown as a comment in the generated shader, handy for debugging. */
  name: string;
  /** Values the effect needs from JavaScript. Shared by every material. */
  uniforms: Record<string, IUniform>;
  /** GLSL placed above main(): uniform declarations and helper functions. */
  declarations: string;
  /** GLSL placed inside main(). Changes `colour` (and maybe `tone` or `highlightMask`). */
  body: string;
  /** Copies the current panel values into the uniforms. Runs every frame. */
  update(settings: Settings, context: FrameContext): void;
}

/** Things about the current frame that some effects need, besides the settings. */
export interface FrameContext {
  /** World direction toward the key light. */
  lightDirection: Vector3;
  cameraPosition: Vector3;
  /** The camera's "right" direction in the world (screen x axis). */
  cameraRight: Vector3;
  /** Centre and rough radius of the ingredient, for placing highlight shapes. */
  objectCentre: Vector3;
  objectRadius: number;
  /** Height of the table top (the apple's lowest point), for the contact shadow. */
  groundY: number;
}
