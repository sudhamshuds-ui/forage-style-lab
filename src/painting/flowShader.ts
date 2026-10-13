/**
 * Flow pass: works out which way the edges run in the underpainting.
 *
 * Painters lay strokes along the edges of shapes (around the form, along the
 * horizon), not across them. This pass measures how the colour changes in
 * a small neighbourhood (a "structure tensor") and stores, for every spot:
 *
 *   rg = direction along the edges, packed as a doubled angle (cos 2a, sin 2a),
 *        scaled by how clear that direction is (0 where there is no edge)
 *   b  = how strong the edges are here (used to add small detail strokes)
 *
 * It runs at a quarter of the screen size, because the direction changes slowly.
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
varying vec2 vUv;

// Square root brings dark colours closer to how we see them, so edges in the
// shadows count as much as edges in the light. The object outline counts too.
vec4 tap(vec2 uv) {
  vec4 c = texture2D(tColour, uv);
  return vec4(sqrt(max(c.rgb, 0.0)), min(c.a, 0.5) * 1.5);
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
  gl_FragColor = vec4(alongEdge * confidence, strength, 1.0);
}
`;
