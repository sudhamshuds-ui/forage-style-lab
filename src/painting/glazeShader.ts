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
 *   1. Lost edges: on the shadow side, the apple's outline melts into what is
 *      behind it. The lit side stays crisp. (Edge softness)
 *   2. Pigment pooling: watercolour dries a little darker at the rim of each
 *      wash, so the darker side of every colour edge gets a thin, deeper line.
 *      (Wash bleed)
 *   3. Calm slabs on the backdrop: a few big, barely-there brush passes on the
 *      wall and table, so they read as painted. The backdrop never moves when
 *      you orbit, so these stay put too. (Brushiness)
 *   4. Paper grain: a fine tooth fixed to the canvas, like real paper. (Texture)
 *   5. Crisp highlights go back on top, then the (hidden) frame.
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
uniform float uBrushiness;
uniform float uWashBleed;
uniform float uEdgeSoftness;
uniform float uTexture;
uniform float uHorizon;
uniform float uTilt;
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

// Is this screen point on the wall (1) or the table (0)? Matches the backdrop's tilted line.
float onWall(vec2 uv) {
  float aspect = uResolution.x / uResolution.y;
  return step(uHorizon + (uv.x - 0.5) * aspect * uTilt, uv.y);
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
    vec4 t = texture2D(tColour, clamp(uv + offset * texel, vec2(0.001), vec2(0.999)));
    vec3 lab = linearToOklab(t.rgb);
    float o = step(0.25, t.a);
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
// 3. Calm slabs on the backdrop
// ---------------------------------------------------------------------------
vec3 backdropSlabs(vec3 colour, vec2 px) {
  float cell = 0.12 * uResolution.y;
  vec2 grid = px / cell;
  vec2 base = floor(grid);
  float coverage = 0.2 + 0.6 * uBrushiness;
  float pixelWall = onWall(px / uResolution);

  float bestKey = -1.0;
  vec3 bestShift = vec3(0.0);
  float bestA = 0.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec4 place = hash42(id + 17.3);
      if (place.x > coverage) continue;
      vec4 rnd = hash42(id * 1.37 + 5.1);

      vec2 centrePx = (id + 0.2 + 0.6 * place.yz) * cell;
      vec2 centreUv = centrePx / uResolution;
      // A slab stays on its own plane: wall slabs never cross onto the table.
      if (abs(onWall(centreUv) - pixelWall) > 0.5) continue;

      // Wall: broad diagonal passes. Table: long, nearly level sweeps.
      float angle = pixelWall > 0.5 ? -0.42 + (rnd.w - 0.5) * 0.35 : uTilt + (rnd.w - 0.5) * 0.15;
      vec2 dir = vec2(cos(angle), sin(angle));
      vec2 rel = px - centrePx;
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      vec2 halfSize = cell * vec2(0.95, pixelWall > 0.5 ? 0.45 : 0.28) * (0.85 + 0.3 * rnd.xy);
      vec2 d = abs(local) - halfSize;
      float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      float a = 1.0 - smoothstep(-cell * 0.08, cell * 0.08, dist);
      if (a < 0.003) continue;

      if (place.w > bestKey) {
        bestKey = place.w;
        bestA = a;
        // A slightly different mix of the same paint: a little lighter or darker, a small hue turn.
        bestShift = vec3((rnd.y - 0.5) * 0.04, (rnd.z - 0.5) * 0.12, 0.0);
      }
    }
  }
  if (bestA <= 0.0) return colour;

  vec3 lab = linearToOklab(colour);
  float strength = mix(0.5, 1.0, uBrushiness);
  lab.x += bestShift.x * strength;
  float turn = bestShift.y * strength;
  lab.yz = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * lab.yz;
  return mix(colour, max(oklabToLinear(lab), 0.0), bestA);
}

// ---------------------------------------------------------------------------
// 4. Paper grain, fixed to the canvas
// ---------------------------------------------------------------------------
vec3 paperGrain(vec3 colour, vec2 px) {
  float scale = uResolution.y / 900.0; // same look at any size or pixel density
  vec2 p = px / scale;
  float fine = valueNoise3(vec3(p / 2.2, 0.0));
  float tooth = valueNoise3(vec3(p / 7.0, 3.0));
  float grain = fine * 0.6 + tooth * 0.4 - 0.5;
  vec3 lab = linearToOklab(colour);
  lab.x += grain * 0.05 * uTexture;
  return max(oklabToLinear(lab), 0.0);
}

void main() {
  vec2 px = vUv * uResolution;
  vec4 under = texture2D(tColour, vUv);
  float onObject = step(0.25, under.a);
  float highlight = clamp((under.a - 0.5) * 2.0, 0.0, 1.0);
  vec3 colour = under.rgb;

  colour = loseEdges(colour, px, highlight);
  colour = poolPigment(colour, vUv, highlight);
  if (onObject < 0.5) colour = backdropSlabs(colour, px);
  colour = paperGrain(colour, px);

  // Crisp highlights on top.
  colour = mix(colour, under.rgb, highlight);

  if (uFrame > 0.5) colour = applyFrame(colour, vUv, uResolution, uFrameColour);

  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;
