/**
 * GLSL noise: smooth random blotches, used to make edges wobble like paint.
 *
 * fbm3 ("fractal noise") stacks a few layers of soft noise, big blotches plus
 * smaller ones, and returns a value roughly between 0 and 1.
 * Because we feed it the object's own coordinates, the wobble sticks to the
 * apple's surface as it turns, like real paint would.
 */
export const noiseGLSL = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float valueNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

float fbm3(vec3 p) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    total += amplitude * valueNoise3(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.4);
    amplitude *= 0.5;
  }
  return total / 0.9375;
}
`;
