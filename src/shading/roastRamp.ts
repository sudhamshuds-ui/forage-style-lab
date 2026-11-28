import { Vector3 } from 'three';
import { oklchToHex } from '../utils/colour';

/**
 * The roast ramp (R10): the one set of colours every cooked, roasted, seared, charred or grilled
 * surface is browned with, from a light golden crust to a deep red-brown, like the grilled peach in
 * the peach tart. The user, 2026-11-28: the browning read muddy, a grey-brown on every dish.
 *
 * Four stops in Oklab (L, a, b), lightest first. Every stop keeps a chroma of 0.12 or more and a hue
 * between 40 and 75 degrees: no grey, no green, no plum or blue, ever. A lighter or darker brown is
 * a step along the ramp (`roastAt`), never a mix with grey.
 */
export const ROAST_RAMP: readonly (readonly [number, number, number])[] = [
  [0.82, 0.05, 0.15], // golden yellow, about #f8b53a
  [0.7, 0.1, 0.15], // orange, about #e8801a
  [0.58, 0.095, 0.12], // caramel, about #c15a14
  [0.46, 0.09, 0.08], // red-brown, about #8d3c19
];

/** Names for points on the ramp (0 golden, 1 red-brown). */
export const ROAST = { golden: 0, orange: 1 / 3, caramel: 2 / 3, redBrown: 1 } as const;

/** The ramp at `t` (0 the golden stop, 1 the red-brown one), in Oklab. */
export function roastAt(t: number): [number, number, number] {
  const n = ROAST_RAMP.length - 1;
  const x = Math.min(n, Math.max(0, t * n));
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const [a, b] = [ROAST_RAMP[i], ROAST_RAMP[i + 1]];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** The ramp at `t` as an sRGB hex colour (for the families' and the pieces' colours). */
export function roastHex(t: number): string {
  const [l, a, b] = roastAt(t);
  return oklchToHex(l, Math.hypot(a, b), (Math.atan2(b, a) * 180) / Math.PI);
}

/** The ramp as the shader's uniform (uRoast[4]): the same constant, never typed again. */
export function roastUniform(): { value: Vector3[] } {
  return { value: ROAST_RAMP.map(([l, a, b]) => new Vector3(l, a, b)) };
}

/**
 * The shader side: `roastRamp(t)` reads the ramp; `searInto(base, sear, cover)` lays a browning over
 * a surface without the grey band in between (mixed in Oklab, the colour of the covered part is
 * lifted to at least 0.12 chroma times the cover, turned toward the browning's hue).
 */
export const ROAST_GLSL = /* glsl */ `
uniform vec3 uRoast[4];
vec3 roastRamp(float t) {
  float x = clamp(t, 0.0, 1.0) * 3.0;
  if (x < 1.0) return mix(uRoast[0], uRoast[1], x);
  if (x < 2.0) return mix(uRoast[1], uRoast[2], x - 1.0);
  return mix(uRoast[2], uRoast[3], x - 2.0);
}
vec3 searInto(vec3 base, vec3 sear, float cover) {
  vec3 m = mix(base, sear, cover);
  float c = length(m.yz);
  vec2 toward = normalize(sear.yz);
  vec2 hue = c > 1e-4 ? m.yz / c : toward;
  hue = normalize(mix(hue, toward, cover) + 1e-5 * toward);
  m.yz = hue * max(c, 0.12 * cover);
  return m;
}
`;
