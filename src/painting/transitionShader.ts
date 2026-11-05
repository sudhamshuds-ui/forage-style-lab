import { noiseGLSL } from '../shading/chunks/noise.glsl';

/**
 * The Shuffle transition's two shaders (see transition.ts for the storyboard).
 *
 *   smudge:    a feedback loop, like echo or time displacement in After Effects.
 *              Every frame starts from the previous frame, so the paint the strokes
 *              drag around keeps building up. Brush strokes land one by one (a few
 *              at first, then faster), each one pulling the paint along its path and
 *              laying down a little pigment of its own, while the whole picture
 *              slowly softens. The ingredient melts into a smear of its own colours.
 *   composite: paints the next card in with big sweeping strokes. Each stroke is a
 *              mask that uncovers the next painting, with bristly edges that smear
 *              it a little. The next card arrives slightly blurred and sharpens as
 *              the last strokes land, ending exactly on the live picture.
 *
 * Timing: uT runs 0..1 over the whole transition, so every phase is a share of one
 * total (TRANSITION_SECONDS in transition.ts) and the length is tuned in one place.
 * Each stroke's own travel time is given in seconds (uSeconds converts it), so
 * strokes keep a steady, readable pace. Both shaders work on flat images (stills),
 * never on the 3D scene, so the transition costs the same for every ingredient.
 */

export const transitionVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Shared helpers: random numbers, smooth 1D noise, and one brush stroke's shape.
const strokeGLSL = /* glsl */ `
${noiseGLSL}

vec4 hash42(vec2 p) {
  vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  p4 += dot(p4, p4.wzxy + 33.33);
  return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float noise1(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash11(i), hash11(i + 1.0), f * f * (3.0 - 2.0 * f));
}

// A brush travelling across the card is movement on screen, so it eases in and out
// (quart in-out, close to cubic-bezier(0.77, 0, 0.175, 1)): it lifts off gently,
// sweeps, and settles, instead of snapping out and crawling.
float easeInOut(float t) {
  if (t < 0.5) return 8.0 * t * t * t * t;
  float u = 1.0 - t;
  return 1.0 - 8.0 * u * u * u * u;
}

// Where a stroke sits in the wave that sweeps out from the ingredient (0 at its
// centre, 1 far away), so strokes build like one gesture instead of popping up
// everywhere at once.
float waveOrder(vec2 uv) {
  vec2 d = (uv - uCentre) * vec2(uResolution.x / uResolution.y, 1.0);
  return clamp(length(d) / 0.75, 0.0, 1.0);
}

// One stroke being painted: the brush has travelled 'grown' (0..1) of the way from
// its tail to its tip. Returns how much paint covers this pixel (0..1).
// local = pixel position in the stroke's frame (x along it), in pixels.
// soft = how wide the feathered edge is (pixels); dry = how much the bristles streak (0..1);
// ragged = how deep the ragged steps at the brush head are (1 = 80% of the half width).
float strokeMask(vec2 local, float halfLen, float halfWid, float grown, vec4 rnd, float soft, float dry, float ragged) {
  // A real stroke is never ruler-straight: bend it into a gentle arc, one way or the other.
  float along = local.x / max(halfLen, 1.0);
  local.y -= (rnd.z - 0.5) * 1.1 * halfWid * along * along;
  // Bristly sides: the width wavers along the stroke, and the stroke tapers a little
  // toward its tail, where the brush first touched the card.
  float taper = 0.8 + 0.2 * smoothstep(-1.0, -0.4, along);
  float side = halfWid * taper * (1.0 + (noise1(local.x / halfWid * 0.9 + rnd.w * 40.0) - 0.5) * 0.45);
  float a = 1.0 - smoothstep(side - soft, side + 2.0, abs(local.y));
  // The tail, and the brush head travelling along the stroke (ragged, a few soft steps).
  float rag = noise1(local.y / halfWid * 2.5 + rnd.x * 57.0);
  float head = -halfLen + 2.0 * halfLen * grown - rag * halfWid * 0.8 * ragged;
  a *= smoothstep(-halfLen - 2.0, -halfLen + soft, local.x);
  a *= 1.0 - smoothstep(head - soft * 1.5 - 4.0, head + 1.0, local.x);
  // Dry streaks near the edges, where the bristles carry less paint.
  float streak = noise1(local.y / halfWid * 6.0 + rnd.y * 31.0);
  a *= mix(1.0, smoothstep(0.0, 0.35, streak + 1.0 - abs(local.y) / max(side, 1.0)), dry);
  return clamp(a, 0.0, 1.0);
}
`;

export const smudgeFragmentShader = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tPrev;
uniform sampler2D tStill;
uniform vec2 uResolution;
uniform float uT;
uniform float uSeconds;
uniform vec2 uCentre;
uniform float uStep;
uniform float uCell;
uniform float uRound;

${strokeGLSL}

// The direction strokes sweep in: a slow, curling current across the card.
vec2 currentAt(vec2 uv) {
  vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0) * 1.6;
  float a = 6.283 * valueNoise3(vec3(p * 4.0, 3.1)) * 1.2;
  return vec2(cos(a), sin(a));
}

void main() {
  vec2 px = vUv * uResolution;
  vec2 texel = 1.0 / uResolution;
  vec3 colour = texture2D(tPrev, vUv).rgb;

  // No blur on the picture itself (the user, 2026-11-05): only the strokes are soft.

  // Brush strokes, each on its own clock. Later strokes sit on top. Sized from the card
  // (never smaller than 9% of its height), so each one reads as a gesture.
  float cell = max(uCell * 2.5, uResolution.y * 0.09);
  vec2 base = floor(px / cell);
  float bestKey = -1.0;
  float bestA = 0.0;
  vec3 bestC = colour;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec4 rnd = hash42(id + 17.3);
      vec4 rnd2 = hash42(id * 1.37 + 3.3);
      vec2 centre = (id + 0.15 + 0.7 * rnd.yz) * cell;
      // A wave out from the ingredient, loosened with some randomness: the first half
      // of the transition (uT 0..0.5). Each stroke takes 0.45 to 0.7 seconds.
      float start = 0.5 * (0.6 * waveOrder(centre / uResolution) + 0.4 * rnd.x);
      float duration = (0.45 + 0.25 * rnd2.x) / uSeconds;
      float grown = clamp((uT - start) / duration, 0.0, 1.0);
      if (grown <= 0.0 || grown >= 1.0) continue; // only strokes still moving drag paint

      // Directions cross, like a hand working the paint, never all one way.
      vec2 dir = currentAt(centre / uResolution);
      float turn = (rnd2.y - 0.5) * 2.4;
      dir = vec2(dir.x * cos(turn) - dir.y * sin(turn), dir.x * sin(turn) + dir.y * cos(turn));
      float halfLen = cell * mix(0.95, 0.55, uRound) * (0.8 + 0.4 * rnd2.z);
      float halfWid = cell * 0.3 * (0.8 + 0.4 * rnd2.w);
      float fit = min(1.0, cell * 1.1 / (length(vec2(halfLen, halfWid * 1.3)) + 4.0));
      halfLen *= fit;
      halfWid *= fit;

      vec2 rel = px - centre;
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      if (abs(local.x) > halfLen + 4.0 || abs(local.y) > halfWid * 1.4 + 4.0) continue;
      // A wide, feathered edge, so a smudge never has a hard, glassy cut.
      float a = strokeMask(local, halfLen, halfWid, easeInOut(grown), rnd, halfWid * 0.55, 0.5, 1.0);
      if (a <= 0.0) continue;

      // The stroke drags the paint it passes through along its path...
      float bristle = noise1(local.y / halfWid * 5.0 + rnd.x * 57.0);
      vec2 drag = dir * (4.5 + 1.5 * bristle) * min(uStep, 2.0) * texel;
      // The dragged paint is softened a little across the stroke (wet paint, not glass):
      // three samples side by side across its width.
      vec2 across = vec2(-dir.y, dir.x) * 1.5 * texel;
      vec3 dragged = (texture2D(tPrev, vUv - drag).rgb * 2.0
        + texture2D(tPrev, vUv - drag + across).rgb
        + texture2D(tPrev, vUv - drag - across).rgb) * 0.25;
      // ...and lays down a little pigment picked up where it started.
      vec2 tailUv = clamp((centre - dir * halfLen * 0.9) / uResolution, vec2(0.001), vec2(0.999));
      vec3 pigment = texture2D(tStill, tailUv).rgb;
      vec3 c = mix(dragged, pigment, 0.06 * min(uStep, 2.0));

      if (start > bestKey) {
        bestKey = start;
        bestA = a;
        bestC = c;
      }
    }
  }

  colour = mix(colour, bestC, bestA);
  gl_FragColor = vec4(colour, 1.0);
}
`;

export const compositeFragmentShader = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tSmudge;
uniform sampler2D tNext;
uniform vec2 uResolution;
uniform float uT;
uniform float uSeconds;
uniform vec2 uCentre;

${strokeGLSL}

// How much of the next card the reveal strokes have uncovered here, and which way
// the nearest stroke runs (for the wet smear at its edge).
// from, spread: when this layer's strokes start (shares of uT); seconds: each stroke's travel.
float revealLayer(vec2 px, float cell, float layer, float from, float spread, float seconds, inout vec2 runDir) {
  vec2 base = floor(px / cell);
  float best = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec4 rnd = hash42(id + layer * 23.1);
      vec4 rnd2 = hash42(id * 1.37 + layer * 7.7 + 5.1);
      vec2 centre = (id + 0.15 + 0.7 * rnd.yz) * cell;
      // The same wave as the smudge: the new card is painted in from the middle outward.
      float start = from + spread * (0.6 * waveOrder(centre / uResolution) + 0.4 * rnd.x);
      float duration = (seconds + 0.15 * rnd2.x) / uSeconds;
      float grown = clamp((uT - start) / duration, 0.0, 1.0);
      if (grown <= 0.0) continue;

      // Strokes cross in three directions (about 20, 110 and -35 degrees), like
      // crosshatched paint, never all one way.
      float pick = floor(rnd2.x * 3.0);
      float angle = (pick < 0.5 ? 0.35 : (pick < 1.5 ? 1.92 : -0.61)) + (rnd2.y - 0.5) * 0.6;
      vec2 dir = vec2(cos(angle), sin(angle));
      float halfLen = cell * (0.85 + 0.25 * rnd2.z);
      float halfWid = cell * (0.42 + 0.12 * rnd2.w);
      float fit = min(1.0, cell * 1.1 / (length(vec2(halfLen, halfWid * 1.3)) + 4.0));
      halfLen *= fit;
      halfWid *= fit;

      vec2 rel = px - centre;
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      if (abs(local.x) > halfLen + 4.0 || abs(local.y) > halfWid * 1.4 + 4.0) continue;
      float a = strokeMask(local, halfLen, halfWid, easeInOut(grown), rnd, halfWid * 0.4, 0.35, 0.5);
      if (a > best) {
        best = a;
        runDir = dir;
      }
    }
  }
  return best;
}

// Any image, softly blurred (radius in pixels): a small ring of samples.
vec3 soften(sampler2D image, vec2 uv, float radius) {
  vec3 sum = texture2D(image, uv).rgb;
  if (radius < 0.5) return sum;
  vec2 texel = radius / uResolution;
  for (int k = 0; k < 8; k++) {
    float a = float(k) * 2.39996 + 0.5;
    float r = sqrt((float(k) + 0.5) / 8.0);
    sum += texture2D(image, uv + vec2(cos(a), sin(a)) * r * texel).rgb;
  }
  return sum / 9.0;
}

void main() {
  vec2 px = vUv * uResolution;
  // The card we leave stays sharp (only its smudge strokes are soft).
  vec3 colour = texture2D(tSmudge, vUv).rgb;

  // Big strokes first (11% of the card's height), then smaller ones that fill the gaps.
  float big = uResolution.y * 0.11;
  vec2 runDir = vec2(1.0, 0.0);
  float shown = revealLayer(px, big, 1.0, 0.45, 0.28, 0.5, runDir);
  shown = max(shown, revealLayer(px, big * 0.6, 2.0, 0.6, 0.25, 0.4, runDir));
  // A soft wash follows behind the strokes, spreading out from the middle with a
  // loose, noisy front, so the gaps the strokes missed melt away instead of
  // lingering as sharp shards of the old card.
  float looseFront = valueNoise3(vec3(px / uResolution.y * 5.0, 1.3)) - 0.5;
  float wash = smoothstep(0.0, 0.14, uT - (0.62 + 0.2 * waveOrder(vUv)) + looseFront * 0.1);
  shown = max(shown, wash);

  if (shown > 0.0) {
    // The next card is sharp. Only a stroke's soft edge is blurred and smeared a little
    // along the stroke, like wet paint, so the strokes never look hard-cut.
    vec3 next = texture2D(tNext, vUv).rgb;
    float edge = 1.0 - smoothstep(0.0, 0.85, shown);
    vec3 smeared = soften(tNext, vUv - runDir * edge * 10.0 / uResolution, 5.0 * edge);
    next = mix(next, smeared, edge);
    colour = mix(colour, next, shown);
  }

  // Land exactly on the live picture.
  colour = mix(colour, texture2D(tNext, vUv).rgb, smoothstep(0.88, 1.0, uT));

  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;
