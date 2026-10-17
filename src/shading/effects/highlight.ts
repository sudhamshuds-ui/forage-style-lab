import { Vector3 } from 'three';
import { HIGHLIGHT_SHAPES } from '../../params';
import type { ShaderEffect } from '../effect';

/**
 * Highlights: where the surface mirrors the light.
 *
 * The default styles are soft and believable, like the references:
 *  - Soft sheen: a gentle pale glaze where the surface faces the light, taking
 *    the shape of whichever facet catches it, with a broken, dry-brush edge.
 *  - Dry speckle: a lighter sheen plus a scatter of small pale specks, like the
 *    dry-brush highlight on the strawberry in the cake painting.
 * Both are painted on the apple's own surface, so they stay put as it turns.
 *
 * The older hard-edged shapes are still in the list:
 *
 *  1. A shape (window, panes, square, dashes, streak or dot) painted onto the
 *     surface around the spot that mirrors the light. We work out that spot
 *     in JavaScript (the "anchor"), then draw the shape flat on whichever
 *     plane of the apple is there, so it sits in perspective on that plane.
 *     It only shows on planes that roughly face the light.
 *
 *  2. Rim glints: thin broken lines where tightly curved edges (the bevels
 *     between planes, the stem) catch the light.
 *
 * Both write `highlightMask`, so the paint stroke pass keeps them sharp.
 */
const uniforms = {
  uHighlightShape: { value: 0 },
  uHighlightSize: { value: 0.15 },
  uHighlightAnchor: { value: new Vector3() },
  uCameraRight: { value: new Vector3(1, 0, 0) },
  uRimGlints: { value: 1 },
};

const view = new Vector3();
const half = new Vector3();

export const highlight: ShaderEffect = {
  name: 'Highlight',
  uniforms,
  declarations: /* glsl */ `
uniform float uHighlightShape;
uniform float uHighlightSize;
uniform vec3 uHighlightAnchor;
uniform vec3 uCameraRight;
uniform float uRimGlints;

// 1 inside a rectangle (centre c, half size h), 0 outside, with a 1 pixel soft edge.
float boxMask(vec2 q, vec2 c, vec2 h, float aa) {
  vec2 d = abs(q - c) - h;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return 1.0 - smoothstep(-aa, aa, dist);
}

// The highlight shapes, in units of the Size slider.
float highlightShape(vec2 q, float shape, float aa) {
  if (shape < 0.5) {
    // Window: two tall panes, the right one a little wider, slightly slanted.
    q.x += q.y * 0.2;
    return max(
      boxMask(q, vec2(-0.32, 0.0), vec2(0.19, 0.55), aa),
      boxMask(q, vec2(0.25, 0.0), vec2(0.27, 0.55), aa)
    );
  }
  if (shape < 1.5) {
    // Four panes.
    q.x += q.y * 0.15;
    float m = boxMask(q, vec2(-0.27, 0.27), vec2(0.21), aa);
    m = max(m, boxMask(q, vec2(0.27, 0.27), vec2(0.21), aa));
    m = max(m, boxMask(q, vec2(-0.27, -0.27), vec2(0.21), aa));
    return max(m, boxMask(q, vec2(0.27, -0.27), vec2(0.21), aa));
  }
  if (shape < 2.5) {
    // One square fleck.
    return boxMask(q, vec2(0.0), vec2(0.34), aa);
  }
  if (shape < 3.5) {
    // Dashes: a row of short strokes of different lengths.
    float m = boxMask(q, vec2(-0.85, 0.03), vec2(0.32, 0.11), aa);
    m = max(m, boxMask(q, vec2(-0.08, 0.0), vec2(0.24, 0.11), aa));
    return max(m, boxMask(q, vec2(0.5, -0.03), vec2(0.15, 0.11), aa));
  }
  if (shape < 4.5) {
    // Streak: one long, thin, gently curved stroke.
    q.y -= q.x * q.x * 0.1;
    return boxMask(q, vec2(0.0), vec2(1.1, 0.065), aa);
  }
  if (shape < 5.5) {
    // Dot.
    return 1.0 - smoothstep(-aa, aa, length(q) - 0.34);
  }
  return 0.0; // None
}
`,
  body: /* glsl */ `
vec3 H = normalize(L + V);
float facingLight = dot(N, H);

if (uHighlightShape > 6.5) {
  // Soft sheen / dry speckle. Size sets how broad the sheen is.
  float start = 0.985 - uHighlightSize * 0.18;
  float sheen = smoothstep(start, start + 0.035, facingLight);
  // A broken, dry-brush edge: the glaze thins out unevenly toward its rim.
  float tooth = valueNoise3(objectPos * 16.0) * 0.6 + valueNoise3(objectPos * 41.0) * 0.4;
  sheen *= smoothstep(0.25, 0.55, tooth + (sheen - 0.5) * 0.8);
  float amount = sheen * 0.38;
  if (uHighlightShape > 7.5) {
    // Dry speckle: a fainter sheen, plus small pale specks in a wider area around it.
    float zone = smoothstep(start - 0.05, start + 0.01, facingLight);
    float specks = step(0.78, valueNoise3(objectPos * 55.0)) * zone;
    amount = max(sheen * 0.3, specks * 0.85);
  }
  // Rim glints still catch the light on tight curves (see below).
  float curvature = length(fwidth(N)) / max(length(fwidth(worldPos)), 1e-5);
  float glint = smoothstep(0.93, 0.95, facingLight) * smoothstep(3.0, 8.0, curvature);
  glint *= smoothstep(0.4, 0.48, valueNoise3(objectPos * 11.0)) * uRimGlints;
  highlightMask = max(amount, glint);
  colour = mix(colour, uHighlightColour, highlightMask);
} else {

// 1. The shape, drawn flat on this plane around the anchor spot.
vec3 offset = worldPos - uHighlightAnchor;
vec3 axisX = uCameraRight - N * dot(uCameraRight, N);
axisX /= max(length(axisX), 1e-4);
vec3 axisY = cross(N, axisX);
vec2 q = vec2(dot(offset, axisX), dot(offset, axisY)) / uHighlightSize;
// A tiny wobble so the edges look hand painted, not vector-perfect.
q += (vec2(valueNoise3(objectPos * 18.0), valueNoise3(objectPos * 18.0 + 7.1)) - 0.5) * 0.06;
float aa = max(length(fwidth(q)) * 0.75, 0.001);
float shapeMask = highlightShape(q, uHighlightShape, aa) * smoothstep(0.55, 0.75, facingLight);

// 2. Rim glints on tightly curved edges, broken into dashes.
float curvature = length(fwidth(N)) / max(length(fwidth(worldPos)), 1e-5);
float glint = smoothstep(0.93, 0.95, facingLight) * smoothstep(3.0, 8.0, curvature);
glint *= smoothstep(0.4, 0.48, valueNoise3(objectPos * 11.0)) * uRimGlints;

highlightMask = max(shapeMask, glint);
colour = mix(colour, uHighlightColour, highlightMask);
}
`,
  update(settings, context) {
    // The anchor: the point on a ball around the apple that mirrors the light toward the camera.
    view.copy(context.cameraPosition).sub(context.objectCentre).normalize();
    half.copy(context.lightDirection).add(view).normalize();
    uniforms.uHighlightAnchor.value.copy(context.objectCentre).addScaledVector(half, context.objectRadius);
    uniforms.uCameraRight.value.copy(context.cameraRight);
    uniforms.uHighlightShape.value = HIGHLIGHT_SHAPES.indexOf(settings.highlight.shape);
    uniforms.uHighlightSize.value = 0.05 + (settings.highlight.size / 100) * 0.3;
    uniforms.uRimGlints.value = settings.highlight.rimGlints ? 1 : 0;
  },
};
