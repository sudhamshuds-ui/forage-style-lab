import type { ShaderEffect } from '../effect';

/**
 * Gouache matte: the last layer.
 *
 * Gouache is opaque and matte because the pigment is mixed with white and
 * chalk. This layer lifts values slightly and calms saturation so colours
 * feel chalky and flat rather than glossy. Controlled by Paint > Chalkiness.
 */
const uniforms = {
  uChalk: { value: 0.18 },
};

export const gouacheMatte: ShaderEffect = {
  name: 'Gouache matte',
  uniforms,
  declarations: /* glsl */ `
uniform float uChalk;
`,
  body: /* glsl */ `
vec3 lab = linearToOklab(colour);
lab.yz *= 1.0 - uChalk * 0.35;
lab.x = mix(lab.x, 0.93, uChalk * 0.14);
colour = max(oklabToLinear(lab), 0.0);
`,
  update(settings) {
    uniforms.uChalk.value = settings.paint.chalk / 100;
  },
};
