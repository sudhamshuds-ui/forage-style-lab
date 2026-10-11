import { Vector3 } from 'three';
import { HIGHLIGHT_SHAPES } from '../../params';
import type { ShaderEffect } from '../effect';

/**
 * Highlights: crisp dabs of pale paint, like the window shapes in the reference.
 *
 * Two parts:
 *
 *  1. A shape (window, panes, square, dashes, streak or dot) painted onto the
 *     surface around the spot that mirrors the light. We work out that spot
 *     in JavaScript (the "anchor"), then lay the shape on like a decal, facing
 *     the light, so it stays one clean shape even where it crosses from one
 *     plane onto the next. It only shows on planes that roughly face the light.
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

// 1. The shape, laid on like a decal around the anchor spot. The decal faces
// the halfway direction H, so it does not shear where planes change.
vec3 offset = worldPos - uHighlightAnchor;
vec3 axisX = uCameraRight - H * dot(uCameraRight, H);
axisX /= max(length(axisX), 1e-4);
vec3 axisY = cross(H, axisX);
vec2 q = vec2(dot(offset, axisX), dot(offset, axisY)) / uHighlightSize;
// A tiny wobble so the edges look hand painted, not vector-perfect.
q += (vec2(valueNoise3(objectPos * 18.0), valueNoise3(objectPos * 18.0 + 7.1)) - 0.5) * 0.06;
float aa = max(length(fwidth(q)) * 0.75, 0.001);
float shapeMask = highlightShape(q, uHighlightShape, aa) * smoothstep(0.15, 0.3, facingLight);

// 2. Rim glints on tightly curved edges, broken into dashes.
float curvature = length(fwidth(N)) / max(length(fwidth(worldPos)), 1e-5);
float glint = smoothstep(0.93, 0.95, facingLight) * smoothstep(3.0, 8.0, curvature);
glint *= smoothstep(0.4, 0.48, valueNoise3(objectPos * 11.0)) * uRimGlints;
// Keep glints clear of the main shape, so the window reads cleanly (like the reference).
glint *= smoothstep(1.0, 1.5, length(q));

highlightMask = max(shapeMask, glint);
colour = mix(colour, uHighlightColour, highlightMask);
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
