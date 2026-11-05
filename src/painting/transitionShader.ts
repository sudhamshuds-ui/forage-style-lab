import { noiseGLSL } from '../shading/chunks/noise.glsl';

/**
 * The Shuffle transition's two shaders (see transition.ts for the storyboard).
 *
 *   smudge:    a feedback loop, like echo or time displacement in After Effects.
 *              It keeps a layer of smeared paint with its own mask (coverage):
 *              every frame starts from the previous one, so the paint the strokes
 *              drag around keeps building up, while the card underneath stays live
 *              (still spinning) wherever no stroke has smeared it yet. Brush strokes land one by one (a few
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

// One dry-brush stroke being painted (after the user's references: long, sweeping
// gestures, a loaded start that dries out into separate bristle streaks, rough
// speckled edges, feathery uneven tips). The brush has travelled 'grown' (0..1) of
// the way from its tail to its tip. Returns how much paint covers this pixel (0..1).
// local = pixel position in the stroke's frame (x along it), in pixels.
// dry = how much the paint breaks up into bristle streaks (0..1).
float strokeMask(vec2 local, float halfLen, float halfWid, float grown, vec4 rnd, float dry) {
  float along = local.x / max(halfLen, 1.0);
  float t = clamp(along * 0.5 + 0.5, 0.0, 1.0); // 0 at the tail, 1 at the tip
  // A sweeping arc, one way or the other, like a wrist turning through the stroke.
  local.y -= (rnd.z - 0.5) * 3.2 * halfWid * along * along;
  // Full width where the loaded brush lands, narrowing as it lifts toward the tip.
  float width = max(halfWid * mix(1.0, 0.65, t * t), 1.0);
  float v = local.y / width; // -1..1 across the stroke

  // Rough edges: the edge wanders a little, in small bites along the stroke.
  float bite = valueNoise3(vec3(local.x * 0.12, sign(v) * 3.0, rnd.w * 11.0)) - 0.5;
  float a = 1.0 - smoothstep(0.92, 1.0, abs(v) + bite * 0.18);

  // Bristles: thin streaks running along the stroke (each line across it is one
  // bristle, with a little variation along its length).
  float bristle = noise1(v * 11.0 + rnd.y * 31.0) * 0.6 + noise1(v * 27.0 + rnd.x * 17.0) * 0.4;
  bristle += (valueNoise3(vec3(local.x * 0.035, v * 7.0, rnd.w * 9.0)) - 0.5) * 0.35;
  // Paint load: full at the start, drying toward the tip and at the edges.
  float load = 1.0 - dry * (0.85 * smoothstep(0.25, 1.0, t) + 0.4 * smoothstep(0.5, 1.0, abs(v)));
  a *= smoothstep(0.92 - load - 0.06, 0.92 - load + 0.06, bristle);
  // Granular speckle where the brush is dry, like paint catching on a rough paper.
  float grain = valueNoise3(vec3(local * 0.45, rnd.x * 5.0));
  a *= mix(1.0, smoothstep(0.2, 0.45, grain + load * 0.35), dry);

  // The tail, where the brush landed (a soft, slightly ragged start).
  a *= smoothstep(-1.0, -0.9, along + bite * 0.08);
  // The brush head travelling along the stroke, and the feathery tip: each bristle
  // streak ends at its own length.
  float head = -1.0 + 2.0 * grown;
  a *= 1.0 - smoothstep(head - 0.05, head, along);
  a *= 1.0 - smoothstep(0.8, 1.0, along + (bristle - 0.5) * 0.4);
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

// What the eye sees so far: the live card, under the smeared paint layer. The layer
// is stored premultiplied (colour already multiplied by its coverage, in alpha).
vec3 seen(vec2 uv) {
  vec4 smear = texture2D(tPrev, uv);
  return texture2D(tStill, uv).rgb * (1.0 - smear.a) + smear.rgb;
}

void main() {
  vec2 px = vUv * uResolution;
  vec2 texel = 1.0 / uResolution;
  vec4 smear = texture2D(tPrev, vUv);
  vec3 colour = smear.rgb;

  // No blur on the picture itself (the user, 2026-11-05): only the strokes are soft.

  // Brush strokes, each on its own clock. Later strokes sit on top. Sized from the card
  // (never smaller than 12% of its height), so each one reads as a gesture. Two layers
  // (the second a little smaller, on its own grid), so there are enough of them.
  float bestKey = -1.0;
  float bestA = 0.0;
  vec3 bestC = colour;
  for (int layer = 0; layer < 2; layer++) {
  float fl = float(layer);
  float cell = max(uCell * 3.0, uResolution.y * 0.12) * (1.0 - 0.3 * fl);
  vec2 shift = vec2(0.37, 0.71) * fl;
  vec2 base = floor(px / cell + shift);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec4 rnd = hash42(id + 17.3 + fl * 41.9);
      vec4 rnd2 = hash42(id * 1.37 + 3.3 + fl * 13.7);
      vec2 centre = (id + 0.15 + 0.7 * rnd.yz - shift) * cell;
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
      // Long and slim (about five times longer than wide), like the references.
      float halfLen = cell * mix(1.0, 0.65, uRound) * (0.85 + 0.3 * rnd2.z);
      float halfWid = cell * 0.2 * (0.8 + 0.4 * rnd2.w);
      float fit = min(1.0, cell * 1.1 / (length(vec2(halfLen, halfWid * 2.8)) + 4.0));
      halfLen *= fit;
      halfWid *= fit;

      vec2 rel = px - centre;
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      if (abs(local.x) > halfLen + 4.0 || abs(local.y) > halfWid * 2.8 + 4.0) continue;
      float a = strokeMask(local, halfLen, halfWid, easeInOut(grown), rnd, 0.55);
      if (a <= 0.0) continue;

      // The stroke drags the paint it passes through along its path...
      float bristle = noise1(local.y / halfWid * 5.0 + rnd.x * 57.0);
      vec2 drag = dir * (4.5 + 1.5 * bristle) * min(uStep, 2.0) * texel;
      // The dragged paint is softened a little across the stroke (wet paint, not glass):
      // three samples side by side across its width.
      vec2 across = vec2(-dir.y, dir.x) * 1.5 * texel;
      vec3 dragged = (seen(vUv - drag) * 2.0 + seen(vUv - drag + across) + seen(vUv - drag - across)) * 0.25;
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
  }

  // Lay the stroke's paint onto the smear layer (premultiplied: colour times coverage).
  gl_FragColor = vec4(colour * (1.0 - bestA) + bestC * bestA, smear.a * (1.0 - bestA) + bestA);
}
`;

export const compositeFragmentShader = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tSmudge;
uniform sampler2D tFrom;
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
      float halfLen = cell * (0.9 + 0.2 * rnd2.z);
      float halfWid = cell * (0.22 + 0.06 * rnd2.w);
      float fit = min(1.0, cell * 1.1 / (length(vec2(halfLen, halfWid * 2.8)) + 4.0));
      halfLen *= fit;
      halfWid *= fit;

      vec2 rel = px - centre;
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      if (abs(local.x) > halfLen + 4.0 || abs(local.y) > halfWid * 2.8 + 4.0) continue;
      float a = strokeMask(local, halfLen, halfWid, easeInOut(grown), rnd, 0.45);
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
  // The card we leave (live, still spinning) under its layer of smeared paint.
  vec4 smear = texture2D(tSmudge, vUv);
  vec3 colour = texture2D(tFrom, vUv).rgb * (1.0 - smear.a) + smear.rgb;

  // Big strokes first (cells 16% of the card's height: long, slim dry-brush sweeps),
  // then smaller ones that fill the gaps.
  float big = uResolution.y * 0.16;
  vec2 runDir = vec2(1.0, 0.0);
  float shown = revealLayer(px, big, 1.0, 0.45, 0.26, 0.5, runDir);
  shown = max(shown, revealLayer(px, big * 0.7, 2.0, 0.52, 0.26, 0.45, runDir));
  shown = max(shown, revealLayer(px, big * 0.45, 3.0, 0.6, 0.24, 0.4, runDir));
  // A soft wash follows behind the strokes, spreading out from the middle with a
  // loose, noisy front, so the gaps the strokes missed melt away instead of
  // lingering as sharp shards of the old card.
  float looseFront = valueNoise3(vec3(px / uResolution.y * 5.0, 1.3)) - 0.5;
  float wash = smoothstep(0.0, 0.12, uT - (0.72 + 0.14 * waveOrder(vUv)) + looseFront * 0.1);
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
