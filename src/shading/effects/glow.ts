import type { ShaderEffect } from '../effect';

/**
 * Glow: the subsurface look, where light travels a little way into the fruit.
 *
 * In the reference paintings the lemon wedges turn a deeper, juicier orange
 * where light passes through, and the line between light and shadow is the
 * most intense colour in the picture. Glowing areas get warmer and more
 * saturated, never darker.
 *
 * Two places glow:
 *  - the terminator: a soft band where the lightest shadow band meets the light
 *  - thin edges: the outline of the form, mostly on the side away from the light
 *
 * Both pull the colour toward the object's glow colour (set by the colour
 * combo). Controlled by Light > Glow. On a whole apple it is subtle; it will
 * matter much more on cut fruit later.
 */
const uniforms = {
  uGlow: { value: 0.55 },
};

export const glow: ShaderEffect = {
  name: 'Glow',
  uniforms,
  declarations: /* glsl */ `
uniform float uGlow;
`,
  body: /* glsl */ `
float facing = clamp((dot(N, L) + 0.55) / 1.55, 0.0, 1.0);

// 1. Terminator: a soft bump just on the shadow side of the first band edge
//    (uBands comes from Tone bands).
float edge = 1.0 / max(uBands, 2.0);
float terminator = 1.0 - smoothstep(0.0, 0.14, abs(facing - (edge - 0.03)));

// 2. Thin edges, stronger on the side facing away from the light.
float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
rim *= mix(0.3, 1.0, smoothstep(0.2, -0.4, dot(N, L)));

float amount = clamp(max(terminator * 0.8, rim), 0.0, 1.0) * uGlow;

// Take the glow colour's hue and saturation; keep the lightness within a small step.
vec3 lab = linearToOklab(colour);
vec3 g = linearToOklab(uGlowColour);
lab.yz = mix(lab.yz, g.yz, amount);
lab.x = mix(lab.x, clamp(g.x, lab.x - 0.05, lab.x + 0.05), amount);
colour = max(oklabToLinear(lab), 0.0);
`,
  update(settings) {
    uniforms.uGlow.value = settings.lighting.glow / 100;
  },
};
