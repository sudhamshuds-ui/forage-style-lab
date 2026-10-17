import { Color } from 'three';
import type { ShaderEffect } from '../effect';

/**
 * Wash bleed: wet-in-wet colour inside each tone shape.
 *
 * In the reference paintings a single shape (one plane of a lemon wedge) is
 * never one flat colour: pink blooms into orange, a cooler patch drifts
 * across the shadow. The shape stays whole, only the colour inside moves.
 *
 * Two big, soft noise fields painted onto the apple's own surface (so they
 * turn with it) nudge the lightness a little, and pull the colour toward the
 * glow colour in the light and toward the room's ambient colour in shadow.
 * Controlled by Paint > Wash bleed. Only large blooms, never speckle.
 */
const uniforms = {
  uWashBleed: { value: 0.55 },
  uWashAmbient: { value: new Color() },
};

export const washBleed: ShaderEffect = {
  name: 'Wash bleed',
  uniforms,
  declarations: /* glsl */ `
uniform float uWashBleed;
uniform vec3 uWashAmbient;
`,
  body: /* glsl */ `
float bloomLight = fbm3(objectPos * 1.6 + vec3(3.1, 0.4, 7.7));
float bloomHue = fbm3(objectPos * 1.4 + vec3(11.7, 5.2, 1.3));

vec3 lab = linearToOklab(colour);
lab.x += (bloomLight - 0.5) * 0.08 * uWashBleed;
colour = max(oklabToLinear(lab), 0.0);

float pull = smoothstep(0.42, 0.72, bloomHue) * 0.35 * uWashBleed;
colour = mixOklch(colour, uGlowColour, pull * tone);
// In shadow, only the hue drifts toward the room colour, so it never greys out.
lab = turnHueToward(linearToOklab(colour), linearToOklab(uWashAmbient), pull * (1.0 - tone) * 0.6);
colour = max(oklabToLinear(lab), 0.0);
`,
  update(settings) {
    uniforms.uWashBleed.value = settings.paint.washBleed / 100;
    uniforms.uWashAmbient.value.set(settings.light.ambient);
  },
};
