import { noiseGLSL } from '../shading/chunks/noise.glsl';

/**
 * Flow pass: a quarter-size helper image that the paint pass reads.
 *
 * 1. Which way the edges run in the underpainting. Painters lay strokes along
 *    the edges of shapes (around the form, along the horizon), not across them.
 *    We measure how the colour changes in a small neighbourhood (a "structure
 *    tensor") and store:
 *      rg = direction along the edges, packed as a doubled angle (cos 2a, sin 2a),
 *           scaled by how clear that direction is (0 where there is no edge)
 *      b  = how strong the edges are here
 *
 * 2. The painted area of the backdrop (Backdrop falloff). At 0 it is a box just
 *    inside the frame. Turning it up shrinks it, cuts its corners and wobbles
 *    its outline, so the backdrop reads as an abstract painted shape on the
 *    canvas, like the reference. Stored as:
 *      a  = distance to that shape's edge, in picture heights
 *           (negative inside, positive outside)
 */
export const flowVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const flowFragmentShader = /* glsl */ `
uniform sampler2D tColour;
uniform vec2 uTexel;
uniform float uRadius;
uniform float uAspect;
uniform float uFalloff;
uniform float uFrame;
uniform float uSeed;
varying vec2 vUv;

${noiseGLSL}

// Square root brings dark colours closer to how we see them, so edges in the
// shadows count as much as edges in the light. The object outline counts too.
vec4 tap(vec2 uv) {
  vec4 c = texture2D(tColour, uv);
  return vec4(sqrt(max(c.rgb, 0.0)), min(c.a, 0.5) * 1.5);
}

float paintedAreaDistance(vec2 uv) {
  if (uFrame < 0.5) return -1.0;
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);

  // A big, soft wobble so the outline is an abstract shape, different for each stroke layout.
  vec2 warp = vec2(fbm3(vec3(uv * 1.6, 3.1 + uSeed)), fbm3(vec3(uv * 1.6, 8.7 + uSeed))) - 0.5;
  p += warp * 0.2 * uFalloff;

  float inset = mix(0.045, 0.13, uFalloff);
  vec2 halfSize = vec2(0.5 * uAspect, 0.5) - inset;
  vec2 d = abs(p) - halfSize;
  float box = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);

  // Cut the corners at an angle, like quick diagonal passes of a big brush.
  float cut = 0.16 * uFalloff;
  float corners = (abs(p.x) + abs(p.y) - (halfSize.x + halfSize.y - cut)) * 0.7071;
  return max(box, corners);
}

void main() {
  vec3 J = vec3(0.0);
  float weightSum = 0.0;
  vec2 h = uTexel * max(uRadius * 0.35, 1.0);
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 p = vUv + vec2(float(i), float(j)) * uTexel * uRadius * 0.5;
      float w = exp(-float(i * i + j * j) / 4.5);
      vec4 gx = tap(p + vec2(h.x, 0.0)) - tap(p - vec2(h.x, 0.0));
      vec4 gy = tap(p + vec2(0.0, h.y)) - tap(p - vec2(0.0, h.y));
      J += w * vec3(dot(gx, gx), dot(gy, gy), dot(gx, gy));
      weightSum += w;
    }
  }
  J /= weightSum;

  float a = J.x - J.y;
  float b = 2.0 * J.z;
  float mag = sqrt(a * a + b * b);
  float strength = sqrt(J.x + J.y);
  float coherence = mag / max(J.x + J.y, 1e-6);
  // The tensor gives the direction colour changes fastest (across the edge).
  // Flipping the doubled angle turns that into the direction along the edge.
  vec2 alongEdge = mag > 1e-6 ? -vec2(a, b) / mag : vec2(0.0);
  float confidence = coherence * smoothstep(0.01, 0.06, strength);
  gl_FragColor = vec4(alongEdge * confidence, strength, paintedAreaDistance(vUv));
}
`;
