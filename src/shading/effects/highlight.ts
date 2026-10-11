import type { ShaderEffect } from '../effect';

/**
 * Highlight: the pale dab of light where the surface mirrors the lamp.
 *
 * We use the classic "half vector" trick (halfway between the light and the
 * camera directions) to find where the shine sits, then cut it with a hard
 * painted edge so it reads as an opaque dab of pale paint, not a glossy glow.
 *
 * Later sessions can add highlight shapes (square flecks, streaks) as their
 * own effect that replaces or follows this one.
 */
const uniforms = {
  uHighlightSize: { value: 0.3 },
};

export const highlight: ShaderEffect = {
  name: 'Highlight',
  uniforms,
  declarations: /* glsl */ `
uniform float uHighlightSize;
`,
  body: /* glsl */ `
vec3 H = normalize(L + V);
float shine = dot(N, H);
float edge = 1.0 - (0.004 + uHighlightSize * uHighlightSize * 0.09);
float dab = paintStep(edge, shine, 0.08) * step(0.001, uHighlightSize);
colour = mix(colour, uHighlightColour, dab);
`,
  update(settings) {
    uniforms.uHighlightSize.value = settings.light.highlightSize / 100;
  },
};
