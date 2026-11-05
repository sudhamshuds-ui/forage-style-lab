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
 * Times are in seconds from the click. Both shaders work on flat images (stills),
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

// A strong ease-out (quart): the brush moves fast at first, then settles. Close to
// the cubic-bezier(0.23, 1, 0.32, 1) curve the panel's buttons use.
float easeOut(float t) {
  float u = 1.0 - t;
  return 1.0 - u * u * u * u;
}

// One stroke being painted: the brush has travelled 'grown' (0..1) of the way from
// its tail to its tip. Returns how much paint covers this pixel (0..1).
// local = pixel position in the stroke's frame (x along it), in pixels.
// soft = how wide the feathered edge is (pixels); dry = how much the bristles streak (0..1).
float strokeMask(vec2 local, float halfLen, float halfWid, float grown, vec4 rnd, float soft, float dry) {
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
  float head = -halfLen + 2.0 * halfLen * grown - rag * halfWid * 0.8;
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
uniform float uTime;
uniform float uStep;
uniform float uCell;
uniform float uRound;

${strokeGLSL}

// The direction strokes sweep in: a slow, curling current across the card.
vec2 currentAt(vec2 uv) {
  vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0) * 1.6;
  float a = 6.283 * valueNoise3(vec3(p, 3.1)) * 1.2;
  return vec2(cos(a), sin(a));
}

void main() {
  vec2 px = vUv * uResolution;
  vec2 texel = 1.0 / uResolution;
  vec3 colour = texture2D(tPrev, vUv).rgb;

  // The whole picture slowly softens, as if the paint were still wet.
  float soften = smoothstep(0.15, 1.2, uTime) * 0.35 * min(uStep, 2.0);
  if (soften > 0.0) {
    vec3 around = texture2D(tPrev, vUv + vec2(texel.x, 0.0)).rgb + texture2D(tPrev, vUv - vec2(texel.x, 0.0)).rgb
      + texture2D(tPrev, vUv + vec2(0.0, texel.y)).rgb + texture2D(tPrev, vUv - vec2(0.0, texel.y)).rgb;
    colour = mix(colour, around * 0.25, soften);
  }

  // Brush strokes, each on its own clock. Later strokes sit on top.
  float cell = uCell * 1.25;
  vec2 base = floor(px / cell);
  float bestKey = -1.0;
  float bestA = 0.0;
  vec3 bestC = colour;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec4 rnd = hash42(id + 17.3);
      vec4 rnd2 = hash42(id * 1.37 + 3.3);
      // A few strokes at first, then faster (more of them start late).
      float start = 0.02 + 0.85 * pow(rnd.x, 0.7);
      float duration = 0.26 + 0.16 * rnd2.x;
      float grown = clamp((uTime - start) / duration, 0.0, 1.0);
      if (grown <= 0.0 || grown >= 1.0) continue; // only strokes still moving drag paint

      vec2 centre = (id + 0.15 + 0.7 * rnd.yz) * cell;
      vec2 dir = currentAt(centre / uResolution);
      float turn = (rnd2.y - 0.5) * 1.6;
      dir = vec2(dir.x * cos(turn) - dir.y * sin(turn), dir.x * sin(turn) + dir.y * cos(turn));
      float halfLen = cell * mix(0.95, 0.55, uRound) * (0.8 + 0.4 * rnd2.z);
      float halfWid = cell * 0.3 * (0.8 + 0.4 * rnd2.w);
      float fit = min(1.0, cell * 1.1 / (length(vec2(halfLen, halfWid * 1.3)) + 4.0));
      halfLen *= fit;
      halfWid *= fit;

      vec2 rel = px - centre;
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      if (abs(local.x) > halfLen + 4.0 || abs(local.y) > halfWid * 1.4 + 4.0) continue;
      float a = strokeMask(local, halfLen, halfWid, easeOut(grown), rnd, halfWid * 0.3, 0.5);
      if (a <= 0.0) continue;

      // The stroke drags the paint it passes through along its path...
      float bristle = noise1(local.y / halfWid * 5.0 + rnd.x * 57.0);
      vec2 drag = dir * (4.5 + 1.5 * bristle) * min(uStep, 2.0) * texel;
      vec3 dragged = texture2D(tPrev, vUv - drag).rgb;
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
uniform float uTime;

${strokeGLSL}

// How much of the next card the reveal strokes have uncovered here, and which way
// the nearest stroke runs (for the wet smear at its edge).
float revealLayer(vec2 px, float cell, float layer, float from, float spread, float duration, inout vec2 runDir) {
  vec2 base = floor(px / cell);
  float best = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec4 rnd = hash42(id + layer * 23.1);
      vec4 rnd2 = hash42(id * 1.37 + layer * 7.7 + 5.1);
      float start = from + spread * rnd.x;
      float grown = clamp((uTime - start) / duration, 0.0, 1.0);
      if (grown <= 0.0) continue;

      vec2 centre = (id + 0.15 + 0.7 * rnd.yz) * cell;
      // Big sweeping strokes, mostly along one gentle diagonal, like painting across a card.
      float angle = 0.35 + (rnd2.y - 0.5) * 0.7;
      vec2 dir = vec2(cos(angle), sin(angle));
      float halfLen = cell * (0.85 + 0.25 * rnd2.z);
      float halfWid = cell * (0.42 + 0.12 * rnd2.w);
      float fit = min(1.0, cell * 1.1 / (length(vec2(halfLen, halfWid * 1.3)) + 4.0));
      halfLen *= fit;
      halfWid *= fit;

      vec2 rel = px - centre;
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      if (abs(local.x) > halfLen + 4.0 || abs(local.y) > halfWid * 1.4 + 4.0) continue;
      float a = strokeMask(local, halfLen, halfWid, easeOut(grown), rnd, halfWid * 0.28, 0.7);
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
  // The card we leave goes soft as it is smudged, so it melts rather than breaks up.
  vec3 colour = soften(tSmudge, vUv, 6.0 * smoothstep(0.25, 1.0, uTime));

  // Big strokes first, then smaller ones that fill the gaps between them.
  float big = uResolution.y * 0.2;
  vec2 runDir = vec2(1.0, 0.0);
  float shown = revealLayer(px, big, 1.0, 0.8, 0.42, 0.32, runDir);
  shown = max(shown, revealLayer(px, big * 0.55, 2.0, 1.02, 0.36, 0.24, runDir));

  if (shown > 0.0) {
    // The next card arrives soft and sharpens as the last strokes land.
    float soft = 1.0 - smoothstep(0.95, 1.55, uTime);
    vec3 next = soften(tNext, vUv, soft * 7.0);
    // A wet edge: near a stroke's edge, the new paint is smeared along the stroke.
    float edge = shown * (1.0 - shown) * 4.0;
    vec3 smeared = soften(tNext, vUv - runDir * edge * 16.0 / uResolution, 4.0);
    next = mix(next, smeared, edge * 0.8);
    colour = mix(colour, next, shown);
  }

  // Land exactly on the live picture.
  colour = mix(colour, texture2D(tNext, vUv).rgb, smoothstep(1.42, 1.6, uTime));

  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;
