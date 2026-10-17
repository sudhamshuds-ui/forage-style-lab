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
 *  - Mixed colours: soft patches drift through the shadow, some turning
 *    violet, some pink, with a hint of the room's cool colour toward the
 *    edges, like the purple and pink mixed into the lemon wedges' shadows.
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
lab = turnHueTowardCool(lab, linearToOklab(uShadowAmbient), cool);
lab.x += 0.02 * cool;

// Warm bounce from the table on planes facing down.
float facesDown = paintStep(0.25, -N.y, 1.0);
vec3 bounce = linearToOklab(uShadowBounce);
float warm = facesDown * shade * 0.5 * uShadowMix;
lab = turnHueToward(lab, bounce, warm);
lab.x = mix(lab.x, max(lab.x, bounce.x * 0.7), warm * 0.5);

// Mixed colours: big soft patches (stuck to the surface) turn the shadow
// violet in some places and pink in others; the edges pick up the room's hue.
float violetPatch = smoothstep(0.45, 0.72, fbm3(objectPos * 1.3 + vec3(2.0, 5.0, 1.0)));
float pinkPatch = smoothstep(0.48, 0.75, fbm3(objectPos * 1.7 + vec3(8.0, 1.0, 4.0)));
float mixAmount = (1.0 - tone) * uShadowMix;
float spin = (-0.75 * violetPatch + 0.35 * pinkPatch) * mixAmount;
lab.yz = mat2(cos(spin), sin(spin), -sin(spin), cos(spin)) * lab.yz;
lab.yz *= 1.0 + 0.2 * (violetPatch + pinkPatch) * mixAmount;
float edge = pow(1.0 - max(dot(N, V), 0.0), 2.0);
lab = turnHueTowardCool(lab, linearToOklab(uShadowAmbient), edge * mixAmount * 0.5);

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
