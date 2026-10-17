import { Color } from 'three';
import type { ShaderEffect } from '../effect';

/**
 * Shadow colour on the apple itself: shadows are a mix of colours, never
 * just a darker version of the fruit.
 *
 *  - Core shadow: turns cooler, borrowing the hue of the room's ambient light
 *    (without getting paler or greyer).
 *  - Bounce light: planes facing down catch warm light bouncing up from the
 *    table.
 *  - Contact: where the apple sits on the table it gets darker and richer,
 *    never grey.
 *
 * Light > Shadow colour sets how strong the mix is. At 0 the shadow is just
 * the combo's own shadow ramp (already a hue shift, red to wine to plum).
 */
const uniforms = {
  uShadowMix: { value: 0.6 },
  uShadowAmbient: { value: new Color() },
  uShadowBounce: { value: new Color() },
  uGroundY: { value: -1 },
  uObjectSize: { value: 1 },
};

export const shadowColour: ShaderEffect = {
  name: 'Shadow colour',
  uniforms,
  declarations: /* glsl */ `
uniform float uShadowMix;
uniform vec3 uShadowAmbient;
uniform vec3 uShadowBounce;
uniform float uGroundY;
uniform float uObjectSize;
`,
  body: /* glsl */ `
// Mostly the darkest bands: mid-tones only get a little of the shift.
float shade = (1.0 - tone) * (1.0 - tone);
vec3 lab = linearToOklab(colour);

// Core shadow: turn toward the ambient hue, keeping its richness (a tiny lift only).
float cool = shade * 0.3 * uShadowMix;
lab = turnHueToward(lab, linearToOklab(uShadowAmbient), cool);
lab.x += 0.02 * cool;

// Warm bounce from the table on planes facing down.
float facesDown = paintStep(0.25, -N.y, 1.0);
vec3 bounce = linearToOklab(uShadowBounce);
float warm = facesDown * shade * 0.5 * uShadowMix;
lab = turnHueToward(lab, bounce, warm);
lab.x = mix(lab.x, max(lab.x, bounce.x * 0.7), warm * 0.5);

// Contact: darker and richer right where the apple meets the table.
float nearTable = 1.0 - smoothstep(0.0, 0.25 * uObjectSize, worldPos.y - uGroundY);
float contact = nearTable * smoothstep(0.3, -0.1, N.y) * mix(0.4, 1.0, uShadowMix);
lab.x -= 0.1 * contact;
lab.yz *= 1.0 + 0.25 * contact;

colour = max(oklabToLinear(lab), 0.0);
`,
  update(settings, context) {
    uniforms.uShadowMix.value = settings.lighting.shadowColour / 100;
    uniforms.uShadowAmbient.value.set(settings.light.ambient);
    uniforms.uShadowBounce.value.set(settings.light.bounce);
    uniforms.uGroundY.value = context.groundY;
    uniforms.uObjectSize.value = context.objectRadius;
  },
};
