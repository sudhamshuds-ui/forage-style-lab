import type { ShaderEffect } from '../effect';

/**
 * Tone bands: the base layer of the look.
 *
 * 1. Work out how much each point faces the light (0 = away, 1 = straight at it).
 * 2. Cut that smooth value into a few flat bands, like a painter blocking in
 *    values with separate mixes of paint. Each cut is a painted edge.
 * 3. Colour the bands along a ramp: shadow colour, then base colour, then a
 *    warmer, lighter version leaning toward the highlight's hue. The ramp walks
 *    around the hue wheel, so shadows shift hue instead of just turning darker.
 */
const uniforms = {
  uBands: { value: 4 },
};

export const toonBands: ShaderEffect = {
  name: 'Tone bands',
  uniforms,
  declarations: /* glsl */ `
uniform float uBands;

// The lit side of the ramp. Light hitting a red apple turns it orange, not
// pink: the hue leans strongly toward the highlight colour, lightness rises a
// little, and saturation stays high. The pale highlight colour itself is
// saved for the highlight dab.
vec3 lightRamp(vec3 base, vec3 highlightColour, float t) {
  vec3 b = linearToOklab(base);
  vec3 h = linearToOklab(highlightColour);
  float cb = length(b.yz);
  float hueB = atan(b.z, b.y);
  float hueH = length(h.yz) < 0.015 ? hueB : atan(h.z, h.y);
  float dh = mod(hueH - hueB + LAB_PI, LAB_TAU) - LAB_PI;
  float hue = hueB + dh * t * 0.7;
  float L = mix(b.x, h.x, t * 0.3);
  float c = cb * (1.0 + t * 0.08);
  return max(oklabToLinear(vec3(L, c * cos(hue), c * sin(hue))), 0.0);
}
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

// Lower half of the ramp: shadow colour to base colour (hue shifts on the way).
// Upper half: base colour warming toward the highlight's hue.
colour = tone < 0.5
  ? mixOklch(uShadowColour, uBaseColour, tone * 2.0)
  : lightRamp(uBaseColour, uHighlightColour, (tone - 0.5) * 2.0);
`,
  update(settings) {
    uniforms.uBands.value = settings.light.bands;
  },
};
