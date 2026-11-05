import type { IUniform, Vector3 } from 'three';
import type { Settings } from '../params';
import type { Palette } from './stylizedMaterial';

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
 *   float lightMask      1 = in the light, 0 = in a cast shadow (a leaf, a neighbour)
 *   vec2  vSurfaceUv     a leaf's own map: x from stalk (0) to tip (1), y across
 *   float highlightMask  0..1, where a crisp highlight sits. The paint stroke
 *                        pass keeps these pixels sharp instead of repainting them.
 *   vec3  colour         the colour so far: read it, change it, write it back
 *
 *   vec3  uBaseColour, uLitColour, uShadowColour, uHighlightColour, uGlowColour   this object's palette
 *
 *   vec3 shadeOwn(vec3 lab, float k)
 *     Darken an OKLab colour toward the object's own deep shade (never grey).
 *     Use it for every dark mark: k = 0.3 is about as dark as lab.x - 0.035.
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
  /** Height of the table top (the ingredient's lowest point), for the contact shadow. */
  groundY: number;
  /** The ingredient's own colours (its family, or the apple's Colour group). */
  objectColours: Palette;
  /**
   * Where each piece of the subject touches the table, for its soft contact
   * shadow: x and z on the floor, and the piece's radius (world units). One
   * for a solo ingredient, one per member for a cluster (up to MAX_CONTACTS).
   */
  contacts: Vector3[];
  /**
   * False when the ingredient on stage skips rim glints (its registry `rimGlints`): a narrow
   * tube facing the light, like a bottle's neck, catches them as a hard white bar.
   */
  rimGlints?: boolean;
  /**
   * How much of the shadow's mixed colours (violet and pink patches, the room's cool hue) the
   * ingredient on stage takes, 0 to 1 (its registry `shadowTint`, default 1). A pale yellow
   * cheese takes less, or its shadows read as pink stains.
   */
  shadowTint?: number;
}
