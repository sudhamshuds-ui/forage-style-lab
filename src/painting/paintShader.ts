import { colourGLSL } from '../shading/chunks/colour.glsl';
import { noiseGLSL } from '../shading/chunks/noise.glsl';
import { frameGLSL } from './frame.glsl';

/**
 * Classic paint pass (hidden behind Brush > Classic strokes): repaints the underpainting with real brush strokes.
 *
 * The screen is covered by a grid of cells. Each cell holds one stroke with
 * its own random position, size, paint order and colour shift. For every
 * pixel we look at the nearby cells and find which strokes cover it.
 *
 * Each stroke:
 *  - picks up ONE colour from the underpainting at its centre (that is what
 *    makes it read as a stroke, instead of a smooth blend)
 *  - is turned to run along the edges (from the flow pass), or, on the
 *    plain backdrop, along painterly default directions
 *  - stays inside its own area: object strokes stay on the object, backdrop
 *    strokes stay on the backdrop, like painting inside the lines
 *  - has a brush shape (flat, round, knife, dry), bristle streaks and an
 *    optional pattern (lines, scribble, crosshatch)
 *
 * Layers go from big to small: big backdrop slabs first, then the object's
 * strokes, then small detail strokes where edges need defining. Crisp
 * highlights and the frame go on last.
 */
export const paintVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const paintFragmentShader = /* glsl */ `
uniform sampler2D tColour;
uniform sampler2D tFlow;
uniform vec2 uResolution;
uniform float uCell;
uniform float uBackdropCell;
uniform float uLength;
uniform float uLoose;
uniform float uVariation;
uniform float uTexture;
uniform float uBrush;
uniform float uPattern;
uniform float uPatternAmount;
uniform float uHorizon;
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

// Streaks across the width of a brush, one value per bristle group.
float bristles(float v, float seed) {
  return noise1(v * 6.0 + seed * 57.0) * 0.6 + noise1(v * 17.0 + seed * 23.0) * 0.4;
}

// Two angles that mean the same line (a and a + 180 degrees) are blended correctly.
float mixAngle(float a, float b, float t) {
  vec2 m = mix(vec2(cos(2.0 * a), sin(2.0 * a)), vec2(cos(2.0 * b), sin(2.0 * b)), t);
  return 0.5 * atan(m.y, m.x);
}

// ---------------------------------------------------------------------------
// Brush shapes. local = pixel position in the stroke's own frame (x along it).
// Returns how much paint covers this pixel, 0..1.
// ---------------------------------------------------------------------------
float brushShape(vec2 local, float halfLen, float halfWid, vec4 rnd) {
  float u = local.x / halfLen;
  float v = local.y / halfWid;
  float aa = 1.0;

  if (uBrush < 0.5 || uBrush > 2.5) {
    // Flat brush (and dry brush): straight sides, a clean start, and a
    // ragged end where the bristles run out of paint at different points.
    float b = bristles(v, rnd.x);
    float side = halfWid * (1.0 + (noise1(u * 2.0 + rnd.y * 40.0) - 0.5) * 0.12);
    float a = 1.0 - smoothstep(side - aa, side + aa, abs(local.y));
    float start = -halfLen * (1.0 - 0.06 * b);
    float end = halfLen * (1.0 - (0.15 + 0.35 * uLoose) * b);
    a *= smoothstep(start - aa, start + aa, local.x) * (1.0 - smoothstep(end - 2.0 * aa, end + aa, local.x));
    if (uBrush > 2.5) {
      // Dry brush: paint runs out along the stroke, leaving bristle gaps.
      float t = clamp(u * 0.5 + 0.5, 0.0, 1.0);
      float streak = valueNoise3(vec3(v * 7.0 + rnd.x * 20.0, u * 0.9, rnd.y * 10.0));
      float dryness = mix(0.05, 0.7, t) * (0.4 + 0.8 * uTexture);
      a *= smoothstep(dryness - 0.06, dryness + 0.06, streak);
    }
    return a;
  }

  if (uBrush < 1.5) {
    // Round brush: an oval dab with a slightly uneven edge.
    float edge = 1.0 - 0.1 * noise1(atan(v, u) * 2.0 + rnd.y * 30.0);
    float aaN = aa / min(halfLen, halfWid);
    return 1.0 - smoothstep(edge - aaN, edge + aaN, length(vec2(u, v)));
  }

  // Palette knife: a crisp flat slab with slanted ends.
  float skew = (rnd.y - 0.5) * 0.8;
  float x = local.x + local.y * skew;
  float a = 1.0 - smoothstep(halfWid - aa, halfWid + aa, abs(local.y));
  return a * (1.0 - smoothstep(halfLen - aa, halfLen + aa, abs(x)));
}

// ---------------------------------------------------------------------------
// Patterns inside a stroke. Returns 1 on the pattern's lines, 0 between them.
// ---------------------------------------------------------------------------
float lineMask(float distanceToLine, float thickness) {
  return 1.0 - smoothstep(thickness * 0.5 - 0.75, thickness * 0.5 + 0.75, distanceToLine);
}

float patternMask(vec2 local, float halfWid, vec4 rnd) {
  float spacing = max(halfWid * 0.55, 3.0);
  float thick = max(spacing * 0.38, 1.2);

  if (uPattern < 1.5) {
    // Lines along the stroke, like a comb dragged through wet paint.
    float d = abs(fract(local.y / spacing + rnd.z) - 0.5) * spacing;
    return lineMask(d, thick);
  }

  if (uPattern < 2.5) {
    // Scribble: two pen lines looping back and forth across the stroke.
    float k = 3.14159 / (spacing * 1.6);
    float p1 = local.x * k + rnd.z * 6.283;
    float s1 = halfWid * 0.85 * k * cos(p1);
    float d1 = abs(local.y - halfWid * 0.85 * sin(p1)) / sqrt(1.0 + s1 * s1);
    float p2 = local.x * k * 1.37 + rnd.w * 6.283;
    float s2 = halfWid * 0.7 * k * 1.37 * cos(p2);
    float d2 = abs(local.y - halfWid * 0.7 * sin(p2)) / sqrt(1.0 + s2 * s2);
    return max(lineMask(d1, thick), lineMask(d2, thick));
  }

  // Crosshatch: two sets of diagonal lines.
  float d1 = abs(fract((local.x + local.y) * 0.7071 / spacing) - 0.5) * spacing;
  float d2 = abs(fract((local.x - local.y) * 0.7071 / spacing) - 0.5) * spacing;
  return max(lineMask(d1, thick * 0.8), lineMask(d2, thick * 0.8));
}

// ---------------------------------------------------------------------------
// Which way a stroke runs.
// ---------------------------------------------------------------------------
float strokeAngle(vec2 centreUv, float onObject, vec4 rnd) {
  vec4 flow = texture2D(tFlow, centreUv);
  float edgeAngle = 0.5 * atan(flow.y, flow.x);
  float confidence = clamp(length(flow.xy) * 1.5, 0.0, 1.0);

  float fallback;
  if (onObject > 0.5) {
    fallback = 0.5 + (rnd.z - 0.5) * 1.6;
  } else if (centreUv.y > uHorizon) {
    // Wall: big diagonal slabs, with a few steeper ones.
    fallback = rnd.z < 0.7 ? -0.42 + (rnd.w - 0.5) * 0.35 : 1.25 + (rnd.w - 0.5) * 0.3;
  } else {
    // Table: long sweeps, nearly level.
    fallback = (rnd.w - 0.5) * 0.18;
  }
  return mixAngle(fallback, edgeAngle, confidence) + (rnd.y - 0.5) * 0.5 * uLoose;
}

// One stroke's colour: the picked-up colour, shifted a little in lightness,
// hue and saturation, so neighbouring strokes are different mixes of paint.
vec3 strokeLab(vec3 picked, vec4 rnd, float onObject) {
  vec3 lab = linearToOklab(picked);
  float j = uVariation * (onObject > 0.5 ? 0.8 : 0.9);
  lab.x += (rnd.y - 0.5) * 0.06 * j;
  float turn = (rnd.w - 0.5) * 0.4 * j;
  float c = cos(turn);
  float s = sin(turn);
  lab.yz = mat2(c, s, -s, c) * lab.yz;
  lab.yz *= 1.0 + (rnd.x - 0.5) * 0.35 * j;
  return lab;
}

// ---------------------------------------------------------------------------
// One layer of strokes painted over \`colour\`.
//   area: 0 = anywhere, 1 = backdrop only, 2 = object only
//   coverage: chance that a cell has a stroke at all
// ---------------------------------------------------------------------------
// Which area a pixel belongs to, from the alpha label: 0 = lit backdrop,
// 1 = backdrop in the cast shadow, 2 = the object. Strokes stay inside their
// own area, so the cast shadow keeps a clean shape instead of being chopped up.
float regionOf(float a) {
  return a >= 0.25 ? 2.0 : (a > 0.06 ? 1.0 : 0.0);
}

vec3 paintLayer(vec3 colour, vec2 px, float cell, float layer, float pixelRegion, float area, float coverage) {
  vec2 offset = vec2(0.37, 0.71) * layer;
  vec2 grid = px / cell + offset;
  vec2 base = floor(grid);

  // Keep the two top-most strokes so overlapping edges blend in paint order.
  float key1 = -1.0;
  float key2 = -1.0;
  vec3 col1 = colour;
  vec3 col2 = colour;
  float a1 = 0.0;
  float a2 = 0.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec4 place = hash42(id + layer * 31.7);
      if (place.x > coverage) continue;
      vec4 rnd = hash42(id * 1.37 + layer * 7.1 + 3.3);

      vec2 centrePx = (id + 0.15 + 0.7 * place.yz - offset) * cell;
      vec2 centreUv = centrePx / uResolution;

      // Pick up paint. Looser painting picks it up a little off-centre.
      vec2 pickUv = centreUv + (rnd.xy - 0.5) * uLoose * cell * 0.6 / uResolution;
      vec4 picked = texture2D(tColour, clamp(pickUv, vec2(0.001), vec2(0.999)));
      float onObject = step(0.25, picked.a);

      if (abs(regionOf(picked.a) - pixelRegion) > 0.5) continue; // paint inside the lines
      if (area > 0.5 && area < 1.5 && onObject > 0.5) continue;
      if (area > 1.5 && onObject < 0.5) continue;
      if (picked.a > 0.75) continue; // never smear the crisp highlights

      float angle = strokeAngle(centreUv, onObject, rnd);
      vec2 dir = vec2(cos(angle), sin(angle));
      vec2 rel = px - centrePx;
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      float halfLen = min(cell * uLength * 0.5 * (0.8 + 0.4 * rnd.z), cell);
      float halfWid = cell * 0.36 * (0.85 + 0.3 * rnd.w);
      if (onObject < 0.5) {
        bool wall = centreUv.y > uHorizon;
        // Wall: broad slabs. Table: long, thinner sweeps.
        halfLen = cell * (wall ? 0.8 : 0.98) * (0.85 + 0.15 * rnd.z);
        halfWid = cell * (wall ? 0.5 : 0.26) * (0.85 + 0.3 * rnd.w);
      }
      if (abs(local.x) > halfLen + 2.0 || abs(local.y) > halfWid * 1.2 + 2.0) continue;

      float a = brushShape(local, halfLen, halfWid, rnd);
      float pattern = 0.0;
      if (uPattern > 0.5) {
        pattern = patternMask(local, halfWid, rnd);
        a *= mix(1.0, mix(0.25, 1.0, pattern), uPatternAmount);
      }
      if (a < 0.003) continue;

      vec3 lab = strokeLab(picked.rgb, rnd, onObject);
      lab.x += (bristles(local.y / halfWid, rnd.x) - 0.5) * 0.08 * uTexture;
      lab.x -= pattern * 0.05 * uPatternAmount;
      vec3 c = max(oklabToLinear(lab), 0.0);

      float key = place.w;
      if (key > key1) {
        key2 = key1; col2 = col1; a2 = a1;
        key1 = key; col1 = c; a1 = a;
      } else if (key > key2) {
        key2 = key; col2 = c; a2 = a;
      }
    }
  }

  colour = mix(colour, col2, a2);
  return mix(colour, col1, a1);
}

void main() {
  vec2 px = vUv * uResolution;
  vec4 under = texture2D(tColour, vUv);
  float region = regionOf(under.a);
  vec3 colour = under.rgb;

  // 1. Backdrop: big slabs, then a second, smaller pass of slabs.
  colour = paintLayer(colour, px, uBackdropCell, 1.0, region, 1.0, 1.0);
  colour = paintLayer(colour, px, uBackdropCell * 0.8, 2.0, region, 1.0, 0.55);

  // 2. The object: two passes of strokes at the main size.
  colour = paintLayer(colour, px, uCell, 3.0, region, 2.0, 1.0);
  colour = paintLayer(colour, px, uCell * 0.8, 4.0, region, 2.0, 0.85);

  // 3. Small detail strokes where edges need defining (plane edges, horizon, outline).
  float edges = smoothstep(0.03, 0.1, texture2D(tFlow, vUv).b);
  if (edges > 0.0) {
    colour = mix(colour, paintLayer(colour, px, uCell * 0.5, 5.0, region, 0.0, 1.0), edges);
  }

  // 4. Right on the object's outline, use the clean render so the silhouette stays smooth.
  // (Labels between the shadow's 0.2 and the object's 0.5 only happen where the
  // outline blends the two, so shadow pixels never count as outline.)
  float outline = smoothstep(0.205, 0.23, under.a) * (1.0 - smoothstep(0.42, 0.48, under.a));
  colour = mix(colour, under.rgb, outline);

  // 5. Crisp highlights on top.
  float highlight = clamp((under.a - 0.5) * 2.0, 0.0, 1.0);
  colour = mix(colour, under.rgb, highlight);

  // 6. Frame (shared with the glaze pass, see frame.glsl.ts).
  if (uFrame > 0.5) colour = applyFrame(colour, vUv, uResolution, uFrameColour);

  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;
