import { Color } from 'three';
import type { ShaderEffect } from '../effect';

/**
 * Ambient and bounce light (the lesson from references/apple/03).
 *
 *  - Ambient: planes facing up pick up the colour of the surroundings
 *    (the purple wall in the reference), mostly where the key light is not hitting.
 *  - Bounce: planes facing down catch colour reflected up from the table
 *    (the green glow on the bottom of the reference apple).
 *
 * Both are tints laid over the tone bands, with painted edges.
 */
const uniforms = {
  uAmbientColour: { value: new Color() },
  uAmbientAmount: { value: 0.45 },
  uBounceColour: { value: new Color() },
  uBounceAmount: { value: 0.4 },
};

export const ambientBounce: ShaderEffect = {
  name: 'Ambient and bounce',
  uniforms,
  declarations: /* glsl */ `
uniform vec3 uAmbientColour;
uniform float uAmbientAmount;
uniform vec3 uBounceColour;
uniform float uBounceAmount;
`,
  body: /* glsl */ `
float facesUp = paintStep(0.35, N.y, 1.0);
float ambient = facesUp * (1.0 - tone * 0.75) * uAmbientAmount;
colour = mixOklab(colour, uAmbientColour, ambient * 0.65);

float facesDown = paintStep(0.25, -N.y, 1.0);
float bounce = facesDown * (1.0 - tone * 0.9) * uBounceAmount;
colour = mixOklab(colour, uBounceColour, bounce * 0.6);
`,
  update(settings) {
    uniforms.uAmbientColour.value.set(settings.light.ambient);
    uniforms.uAmbientAmount.value = settings.light.ambientAmount / 100;
    uniforms.uBounceColour.value.set(settings.light.bounce);
    uniforms.uBounceAmount.value = settings.light.bounceAmount / 100;
  },
};
