/**
 * GLSL colour helpers shared by every shader.
 *
 * Colours inside shaders are "linear" (the maths-friendly version of sRGB).
 * Three.js converts our hex colours to linear for us, and converts the final
 * pixel back to sRGB at the end (#include <colorspace_fragment>).
 *
 * mixOklch is the heart of the hue-shifting shadows: instead of fading a red
 * toward black, it walks around the colour wheel (red, crimson, wine, plum)
 * while it darkens, keeping the colour rich all the way.
 */
export const colourGLSL = /* glsl */ `
const float LAB_PI = 3.14159265;
const float LAB_TAU = 6.28318531;

vec3 linearToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = sign(l) * pow(abs(l), 1.0 / 3.0);
  m = sign(m) * pow(abs(m), 1.0 / 3.0);
  s = sign(s) * pow(abs(s), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  );
}

vec3 oklabToLinear(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

// Straight mix in OKLab: good for tints (ambient, bounce).
vec3 mixOklab(vec3 a, vec3 b, float t) {
  return max(oklabToLinear(mix(linearToOklab(a), linearToOklab(b), t)), 0.0);
}

// Turn an OKLab colour's hue toward another colour's hue, keeping its own
// lightness and saturation. Good for "the shadow borrows the room's hue"
// without the shadow going pale or grey.
vec3 turnHueToward(vec3 lab, vec3 targetLab, float t) {
  float c = length(lab.yz);
  if (c < 1e-4 || length(targetLab.yz) < 1e-4) return lab;
  float h = atan(lab.z, lab.y);
  float ht = atan(targetLab.z, targetLab.y);
  float dh = mod(ht - h + LAB_PI, LAB_TAU) - LAB_PI;
  h += dh * t;
  return vec3(lab.x, c * cos(h), c * sin(h));
}

// Like turnHueToward, but never travels through yellow: if the short way
// round would pass yellow (about 90 degrees), it goes the long way, through
// wine, plum and violet instead. This is how painters cool a shadow: a red
// apple in a mint room goes plum, not brown.
vec3 turnHueTowardCool(vec3 lab, vec3 targetLab, float t) {
  float c = length(lab.yz);
  if (c < 1e-4 || length(targetLab.yz) < 1e-4) return lab;
  float h = atan(lab.z, lab.y);
  float ht = atan(targetLab.z, targetLab.y);
  float dh = mod(ht - h + LAB_PI, LAB_TAU) - LAB_PI;
  float yellow = 1.5708;
  float toYellow = mod(yellow - h + LAB_PI, LAB_TAU) - LAB_PI;
  // Yellow lies on the way if it is in the same direction and closer than the target.
  if (toYellow * dh > 0.0 && abs(toYellow) < abs(dh)) dh -= sign(dh) * LAB_TAU;
  h += dh * t;
  return vec3(lab.x, c * cos(h), c * sin(h));
}

// Mix that travels around the hue wheel: good for light-to-shadow ramps.
vec3 mixOklch(vec3 a, vec3 b, float t) {
  vec3 la = linearToOklab(a);
  vec3 lb = linearToOklab(b);
  float ca = length(la.yz);
  float cb = length(lb.yz);
  float ha = atan(la.z, la.y);
  float hb = atan(lb.z, lb.y);
  // A grey has no real hue, so borrow the other colour's hue.
  if (ca < 0.015) ha = hb;
  if (cb < 0.015) hb = ha;
  float dh = mod(hb - ha + LAB_PI, LAB_TAU) - LAB_PI;
  float h = ha + dh * t;
  // Painters keep half tones juicy: add a touch of chroma in the middle of the ramp.
  float c = mix(ca, cb, t) + sin(t * LAB_PI) * 0.025;
  float L = mix(la.x, lb.x, t);
  return max(oklabToLinear(vec3(L, c * cos(h), c * sin(h))), 0.0);
}
`;
