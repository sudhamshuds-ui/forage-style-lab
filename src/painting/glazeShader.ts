import { colourGLSL } from '../shading/chunks/colour.glsl';
import { noiseGLSL } from '../shading/chunks/noise.glsl';
import { frameGLSL } from './frame.glsl';

/**
 * Glaze pass: the default way the underpainting becomes a painting.
 *
 * The 3D underpainting already does the heavy lifting (calm tone shapes,
 * colour blooms, glow, accent marks, all stuck to the apple's surface). This
 * pass only adds what a painter does on top of the whole canvas, and every
 * step is worked out from the image itself, never from random screen
 * positions, so nothing boils or re-forms when the camera moves:
 *
 *   0. Cast shadow: the floor only marks where the shadow falls (alpha 0..0.2);
 *      here it is painted as one clear shape: crisp edged, darkest and
 *      richest where the apple touches the table, lighter and bluer further
 *      away. Near the apple it picks up the apple's own colour in soft
 *      patches, like light passing through and bouncing off the fruit.
 *      (Shadow colour)
 *   1. Lost edges: on the shadow side, the apple's outline melts into what is
 *      behind it. The lit side stays crisp. (Edge softness)
 *   2. Pigment pooling: watercolour dries a little darker at the rim of each
 *      wash, so the darker side of every colour edge gets a thin, deeper line.
 *      (Wash bleed)
 *   3. Paper grain: a fine tooth fixed to the canvas, like real paper. It is
 *      lighter on the apple, which has its own grain stuck to its surface.
 *      (Texture)
 * The calm brush slabs on the wall and table are painted onto the room
 * itself (scene/background.ts), so they turn with it.
 *   4. Crisp highlights go back on top, then the (hidden) frame.
 *
 * Like an adjustment layer stack in After Effects, applied to the pre-comp
 * of the 3D render.
 */
export const glazeVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const glazeFragmentShader = /* glsl */ `
uniform sampler2D tColour;
uniform sampler2D tFlow;
uniform vec2 uResolution;
uniform vec2 uLightScreen;
uniform float uWashBleed;
uniform float uEdgeSoftness;
uniform float uTexture;
uniform vec2 uObjectUv;
uniform float uObjectRadius;
uniform vec3 uShadowColour;
uniform vec3 uShadowAccent;
uniform float uShadowAmount;
uniform float uShadowMix;
uniform float uFrame;
uniform vec3 uFrameColour;
varying vec2 vUv;

${colourGLSL}
${noiseGLSL}
${frameGLSL}

vec4 hash42(vec2 p) {
  vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  p4 += dot(p4, p4.wzxy + 33.33);
  return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// 1 on the apple (and its stem and leaf), 0 on the backdrop.
float objectAt(vec2 uv) {
  return step(0.25, texture2D(tColour, clamp(uv, vec2(0.001), vec2(0.999))).a);
}

vec3 colourAt(vec2 uv) {
  return texture2D(tColour, clamp(uv, vec2(0.001), vec2(0.999))).rgb;
}

// ---------------------------------------------------------------------------
// 0. The cast shadow
// ---------------------------------------------------------------------------

// How much shadow the floor marked here, 0..1. Read through a gentle wobble,
// so the edge looks hand painted but never jagged.
float shadowMaskAt(vec2 uv) {
  vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0);
  vec2 wobble = vec2(fbm3(vec3(p * 14.0, 1.0)), fbm3(vec3(p * 14.0, 6.0))) - 0.5;
  float px = 3.0 * uResolution.y / 900.0; // same wobble at any size
  vec4 t = texture2D(tColour, clamp(uv + wobble * px / uResolution, vec2(0.001), vec2(0.999)));
  return t.a < 0.25 ? clamp(t.a / 0.2, 0.0, 1.0) : 0.0;
}

// The shadow's own colour at this spot (OKLab), and how strongly it covers.
// contact: 0..1, how close we are to where the apple touches the table.
vec4 shadowPaint(vec2 uv, float contact) {
  float aspect = uResolution.x / uResolution.y;
  float dist = length((uv - uObjectUv) * vec2(aspect, 1.0));
  float far = smoothstep(uObjectRadius * 0.6, uObjectRadius * 2.2, dist);

  vec3 lab = linearToOklab(uShadowColour);
  float chroma = length(lab.yz);

  // Further from the apple: lighter and bluer.
  vec3 blue = vec3(lab.x + 0.06, chroma * cos(4.36), chroma * sin(4.36)); // hue 250 degrees
  lab = mix(lab, blue, far);

  // A second hue near the apple: its own colour, reflected into the shadow,
  // in soft patches (the magenta inside the blood orange's shadow).
  vec2 p = uv * vec2(aspect, 1.0);
  float patches = mix(0.45, 1.0, smoothstep(0.35, 0.65, fbm3(vec3(p * 3.0, 5.0))));
  vec3 accent = linearToOklab(uShadowAccent);
  vec3 accentLab = vec3(lab.x, accent.yz * 0.8);
  lab = mix(lab, accentLab, patches * 0.6 * uShadowMix * (1.0 - far));

  // Where the apple meets the table: darker and richer, never grey.
  lab.x -= 0.08 * contact;
  lab.yz *= 1.0 + 0.3 * contact;

  float strength = uShadowAmount * mix(1.0, 0.75, far);
  return vec4(lab, strength);
}

// 0..1: is the apple right next to this pixel, in the direction of its centre?
float contactAt(vec2 uv) {
  vec2 toward = uObjectUv - uv;
  float len = length(toward * vec2(uResolution.x / uResolution.y, 1.0));
  if (len < 1e-4) return 0.0;
  float maxReach = 0.06;
  vec2 stepUv = toward / len * maxReach / 6.0;
  for (int i = 1; i <= 6; i++) {
    if (objectAt(uv + stepUv * float(i)) > 0.5) return 1.0 - float(i - 1) / 6.0;
  }
  return 0.0;
}

// The backdrop colour with the cast shadow painted in (the cheap version,
// without the contact darkening, used for blur samples).
vec3 withShadow(vec3 colour, float mask, vec2 uv) {
  if (mask <= 0.0) return colour;
  vec4 paint = shadowPaint(uv, 0.0);
  return mixOklab(colour, max(oklabToLinear(paint.rgb), 0.0), mask * paint.a);
}

// ---------------------------------------------------------------------------
// 1. Lost edges
// ---------------------------------------------------------------------------
vec3 loseEdges(vec3 colour, vec2 px, float highlight) {
  vec2 texel = 1.0 / uResolution;
  vec2 uv = px * texel;
  float reach = (0.004 + 0.014 * uEdgeSoftness) * uResolution.y;

  // Quick check: far from the apple's outline there is nothing to do.
  float here = objectAt(uv);
  float ring = objectAt(uv + vec2(reach, 0.0) * texel) + objectAt(uv - vec2(reach, 0.0) * texel)
             + objectAt(uv + vec2(0.0, reach) * texel) + objectAt(uv - vec2(0.0, reach) * texel);
  if (abs(ring - 4.0 * here) < 0.5) return colour;

  // A soft round blur (16 samples spread over a disk, turned a little per
  // pixel so no rings show), mixed in OKLab so colours blend like paint.
  // The same samples tell us how much of the disk is apple (which fades the
  // effect in and out across the outline) and which way the apple lies.
  float spin = hash42(px).x * 6.2832;
  vec3 sum = vec3(0.0);
  vec2 towardApple = vec2(0.0);
  float cover = 0.0;
  float lightIn = 0.0;
  float lightOut = 0.0;
  for (int i = 0; i < 16; i++) {
    float r = sqrt((float(i) + 0.5) / 16.0) * reach;
    float a = float(i) * 2.39996 + spin;
    vec2 offset = vec2(cos(a), sin(a)) * r;
    vec2 q = clamp(uv + offset * texel, vec2(0.001), vec2(0.999));
    vec4 t = texture2D(tColour, q);
    float o = step(0.25, t.a);
    // Backdrop samples include the painted cast shadow, so no light halo appears under the apple.
    vec3 lab = linearToOklab(o > 0.5 ? t.rgb : withShadow(t.rgb, t.a / 0.2, q));
    sum += lab;
    cover += o;
    towardApple += offset * (o - 0.5);
    lightIn += lab.x * o;
    lightOut += lab.x * (1.0 - o);
  }
  if (cover < 0.5 || cover > 15.5 || dot(towardApple, towardApple) < 1e-6) return colour;
  sum /= 16.0;
  float coverage = cover / 16.0;
  float band = 1.0 - abs(2.0 * coverage - 1.0);
  vec2 outward = -normalize(towardApple);

  // Only the side facing away from the light gets lost.
  float shadowSide = smoothstep(0.15, -0.6, dot(outward, uLightScreen));

  // Edges melt more where the apple and its surroundings are close in value.
  float valueGap = abs(lightIn / cover - lightOut / (16.0 - cover));
  float similar = 1.0 - smoothstep(0.05, 0.3, valueGap);

  float amount = uEdgeSoftness * shadowSide * band * mix(0.55, 1.0, similar) * (1.0 - highlight);
  return mixOklab(colour, max(oklabToLinear(sum), 0.0), clamp(amount, 0.0, 1.0));
}

// ---------------------------------------------------------------------------
// 2. Pigment pooling at the rim of each wash
// ---------------------------------------------------------------------------
vec3 poolPigment(vec3 colour, vec2 uv, float highlight) {
  float edge = smoothstep(0.03, 0.12, texture2D(tFlow, uv).b);
  if (edge < 0.01) return colour;
  vec2 texel = 1.0 / uResolution;
  float r = max(0.004 * uResolution.y, 2.0);
  float around = (
    linearToOklab(colourAt(uv + vec2(r, 0.0) * texel)).x +
    linearToOklab(colourAt(uv - vec2(r, 0.0) * texel)).x +
    linearToOklab(colourAt(uv + vec2(0.0, r) * texel)).x +
    linearToOklab(colourAt(uv - vec2(0.0, r) * texel)).x
  ) * 0.25;
  vec3 lab = linearToOklab(colour);
  // Only the darker side of the edge gets the deeper rim.
  float darkerSide = smoothstep(0.0, 0.03, around - lab.x);
  lab.x -= 0.035 * uWashBleed * edge * darkerSide * (1.0 - highlight);
  return max(oklabToLinear(lab), 0.0);
}

// ---------------------------------------------------------------------------
// 3. Paper grain, fixed to the canvas
// ---------------------------------------------------------------------------
vec3 paperGrain(vec3 colour, vec2 px, float amount) {
  float scale = uResolution.y / 900.0; // same look at any size or pixel density
  vec2 p = px / scale;
  float fine = valueNoise3(vec3(p / 2.2, 0.0));
  float tooth = valueNoise3(vec3(p / 7.0, 3.0));
  float grain = fine * 0.6 + tooth * 0.4 - 0.5;
  vec3 lab = linearToOklab(colour);
  lab.x += grain * 0.05 * uTexture * amount;
  return max(oklabToLinear(lab), 0.0);
}

void main() {
  vec2 px = vUv * uResolution;
  vec4 under = texture2D(tColour, vUv);
  float onObject = step(0.25, under.a);
  float highlight = clamp((under.a - 0.5) * 2.0, 0.0, 1.0);
  vec3 colour = under.rgb;

  if (onObject < 0.5) {
    float mask = shadowMaskAt(vUv);
    if (mask > 0.0) {
      vec4 paint = shadowPaint(vUv, contactAt(vUv));
      colour = mixOklab(colour, max(oklabToLinear(paint.rgb), 0.0), mask * paint.a);
    }
  }

  colour = loseEdges(colour, px, highlight);
  colour = poolPigment(colour, vUv, highlight);
  colour = paperGrain(colour, px, mix(1.0, 0.4, onObject));

  // Crisp highlights on top.
  colour = mix(colour, under.rgb, highlight);

  if (uFrame > 0.5) colour = applyFrame(colour, vUv, uResolution, uFrameColour);

  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;
