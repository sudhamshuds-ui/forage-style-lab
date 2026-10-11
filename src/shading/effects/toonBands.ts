import type { ShaderEffect } from '../effect';

/**
 * Tone bands: the base layer of the look.
 *
 * 1. Work out how much each point faces the light (0 = away, 1 = straight at it).
 * 2. Cut that smooth value into a few flat bands, like a painter blocking in
 *    values with separate mixes of paint. Each cut is a painted edge.
 * 3. Colour the bands along a ramp: shadow colour, then base colour, then the
 *    lit colour. The ramp walks around the hue wheel, so shadows shift hue
 *    (red, crimson, wine) instead of just turning darker, and the light side
 *    warms up (red to orange-red), like the reference.
 */
const uniforms = {
  uBands: { value: 4 },
};

export const toonBands: ShaderEffect = {
  name: 'Tone bands',
  uniforms,
  declarations: /* glsl */ `
uniform float uBands;
`,
  body: /* glsl */ `
// Wrapping (+0.35) lets the light creep a little past the edge of the form,
// like a soft studio light, so the shadow side does not swallow the apple.
float facing = clamp((dot(N, L) + 0.35) / 1.35, 0.0, 1.0);

// Count how many band edges this point is above.
float steps = 0.0;
for (int i = 1; i < 6; i++) {
  if (float(i) >= uBands) break;
  steps += paintStep(float(i) / uBands, facing, 1.0);
}
tone = uBands > 1.5 ? steps / (uBands - 1.0) : 0.5;

// Lower half of the ramp: shadow colour to base colour.
// Upper half: base colour to the lit colour.
colour = tone < 0.5
  ? mixOklch(uShadowColour, uBaseColour, tone * 2.0)
  : mixOklch(uBaseColour, uLitColour, (tone - 0.5) * 2.0);
`,
  update(settings) {
    uniforms.uBands.value = settings.light.bands;
  },
};
