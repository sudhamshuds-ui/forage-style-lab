/**
 * The painted frame: a plain border with a ragged inner edge, where the
 * strokes stop at slightly different places (like the taupe frame in the old
 * reference). Hidden by default in the painterly look, but both paint passes
 * can still draw it when Scene > Frame is turned back on.
 *
 * Needs colourGLSL and noiseGLSL to be included first.
 */
export const frameGLSL = /* glsl */ `
float frameHash(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float frameNoise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(frameHash(i), frameHash(i + 1.0), f * f * (3.0 - 2.0 * f));
}

vec3 applyFrame(vec3 colour, vec2 uv, vec2 resolution, vec3 frameColour) {
  float aspect = resolution.x / resolution.y;
  vec2 margin = vec2(0.045 / aspect, 0.045);
  vec2 inside = min(uv, 1.0 - uv) / margin;
  // Fine streaks (bristle ends) plus a gentle long wave.
  float nx = frameNoise(uv.y * 160.0) * 0.55 + frameNoise(uv.y * 5.0 + 3.0) * 0.45;
  float ny = frameNoise(uv.x * 120.0 + 11.0) * 0.55 + frameNoise(uv.x * 4.0 + 5.0) * 0.45;
  float edgeX = 1.0 + (nx - 0.5) * 0.35;
  float edgeY = 1.0 + (ny - 0.5) * 0.35;
  float aaX = 1.5 / (margin.x * resolution.x);
  float aaY = 1.5 / (margin.y * resolution.y);
  float painted = smoothstep(edgeX - aaX, edgeX + aaX, inside.x) * smoothstep(edgeY - aaY, edgeY + aaY, inside.y);
  vec3 frameLab = linearToOklab(frameColour);
  frameLab.x += (fbm3(vec3(uv * vec2(aspect, 1.0) * 6.0, 1.0)) - 0.5) * 0.03;
  return mix(max(oklabToLinear(frameLab), 0.0), colour, painted);
}
`;
