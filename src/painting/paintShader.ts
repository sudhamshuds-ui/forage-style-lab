import { colourGLSL } from '../shading/chunks/colour.glsl';
import { noiseGLSL } from '../shading/chunks/noise.glsl';

/**
 * Paint pass: repaints the underpainting with brush strokes, following the
 * Big, Medium, Small principle.
 *
 *   BIG     A few large strokes lay in the main masses: the wall slabs, the
 *           table sweeps, the apple's planes. They stay inside the colour area
 *           they were loaded from, so the forms stay clean.
 *   MEDIUM  Fewer, and only where something happens: plane edges, the horizon,
 *           the edge of the painted backdrop. They may drag colour across an
 *           edge, like a smear.
 *   SMALL   A handful of accents: around the focal point (where the highlight
 *           sits) and along the edge of the painted backdrop, including a few
 *           thin pale scratch lines.
 *
 * Not every mark is a brush stroke. Many are flat geometric SHAPES laid on like
 * translucent glazes (rectangles, slanted slabs, tapered wedges), as in the
 * reference. Every mark has its own opacity, so overlapping glazes show through
 * each other. Big marks are mostly shapes, small accents mostly strokes.
 *
 * Most of the picture stays as calm, flat underpainting: the goal is the most
 * pleasing picture with as few marks as possible. Painterly is the main dial:
 * low = a few big strokes, high = more medium and small strokes, more colour
 * variation, looser edges.
 *
 * How strokes are found: the screen is covered by grids of cells (one grid per
 * layer). Each cell may hold one stroke with its own random position, angle,
 * paint order and colour shift. For every pixel we check the nearby cells.
 * Each stroke picks up ONE colour from the underpainting at its centre and
 * stays inside its own area (object strokes on the object, backdrop strokes on
 * the backdrop), like painting inside the lines.
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
uniform float uObjectCell;
uniform float uBackdropCell;
uniform float uLength;
uniform float uPainterly;
uniform float uVariation;
uniform float uTexture;
uniform float uBrush;
uniform float uPattern;
uniform float uPatternAmount;
uniform float uHorizon;
uniform float uFrame;
uniform float uAccents;
uniform float uFalloff;
uniform vec3 uCanvasColour;
uniform vec2 uFocus;
uniform float uSeed;
varying vec2 vUv;

${colourGLSL}
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
// Where strokes may go
// ---------------------------------------------------------------------------

// Around the focal point (where the highlight sits): small strokes gather here.
float focalWeight(vec2 uv) {
  vec2 d = (uv - uFocus) * vec2(uResolution.x / uResolution.y, 1.0);
  return exp(-dot(d, d) / (2.0 * 0.16 * 0.16));
}

// The painted backdrop area (see flowShader.ts). dist < 0 inside, > 0 outside.
float insidePaintedArea(float dist) {
  float band = 0.02 + 0.06 * uFalloff;
  return 1.0 - smoothstep(-band, band * 0.5, dist);
}

float nearPaintedEdge(float dist) {
  if (uFrame < 0.5) return 0.0;
  return 1.0 - smoothstep(0.0, 0.03 + 0.08 * uFalloff, abs(dist));
}

// Is this pixel inside the painted backdrop? The edge breaks up like brush ends.
float paintedMask(float dist) {
  if (uFrame < 0.5) return 1.0;
  vec2 q = vUv * vec2(uResolution.x / uResolution.y, 1.0);
  float ragged = (valueNoise3(vec3(q * 80.0, 1.0)) - 0.5) * 0.01
               + (valueNoise3(vec3(q * 12.0, 5.0)) - 0.5) * 0.025 * (0.3 + uFalloff);
  // Edge hierarchy: some stretches of the outline stay crisp, others are lost
  // (fade softly into the canvas), most of all low down where the floor ends.
  float lost = smoothstep(0.58, 0.72, valueNoise3(vec3(q * 3.0, 7.0)));
  lost = max(lost, smoothstep(0.4, 0.12, vUv.y) * 0.8);
  lost *= 0.3 + 0.7 * uFalloff;
  float aa = 1.5 / uResolution.y;
  float crisp = 1.0 - smoothstep(-aa, aa, dist + ragged);
  // A lost edge is dry paint dragged over the canvas: it breaks up into grainy,
  // streaky bits instead of blurring.
  float width = 0.025;
  float ramp = clamp(0.5 - (dist + ragged * 0.5) / width, 0.0, 1.0);
  float grain = valueNoise3(vec3(q * 260.0, 3.0)) * 0.55 + valueNoise3(vec3(q.x * 30.0, q.y * 140.0, 6.0)) * 0.45;
  float scumble = smoothstep(grain - 0.12, grain + 0.12, ramp);
  return mix(crisp, scumble, lost);
}

// Direction along the edge of the painted backdrop, from the slope of its distance field.
float paintedEdgeAngle(vec2 uv) {
  vec2 e = 4.0 / uResolution;
  float dx = texture2D(tFlow, uv + vec2(e.x, 0.0)).a - texture2D(tFlow, uv - vec2(e.x, 0.0)).a;
  float dy = texture2D(tFlow, uv + vec2(0.0, e.y)).a - texture2D(tFlow, uv - vec2(0.0, e.y)).a;
  return atan(dy, dx) + 1.5708;
}

// Pattern zones follow Big, Medium, Small too: one large patch, a few medium
// patches and some small spots. Amount grows the zones.
float patternZone(vec2 uv) {
  vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0) + uSeed * 0.37;
  float reach = uPatternAmount;
  float big = smoothstep(0.64 - 0.06 * reach, 0.67 - 0.06 * reach, fbm3(vec3(p * 1.2, 4.0)));
  float medium = smoothstep(0.7 - 0.05 * reach, 0.72 - 0.05 * reach, fbm3(vec3(p * 3.0, 9.0)));
  float small = smoothstep(0.84 - 0.05 * reach, 0.86 - 0.05 * reach, valueNoise3(vec3(p * 8.0, 2.0)));
  return max(big, max(medium, small));
}

// ---------------------------------------------------------------------------
// Brushes. local = pixel position in the stroke's own frame (x along it).
// Returns how much paint covers this pixel, 0..1.
// ---------------------------------------------------------------------------

// How dry a stroke is. "Dry and flat" (the default) mixes the two: big strokes
// are mostly flat and full of paint, smaller ones run drier.
float strokeDryness(float sizeClass, vec4 rnd) {
  if (uBrush < 0.5) return 0.0;
  if (uBrush > 2.5 && uBrush < 3.5) return 0.4 + 0.6 * uTexture;
  float flatShare = sizeClass < 0.5 ? 0.75 : (sizeClass < 1.5 ? 0.45 : 0.25);
  if (rnd.w < flatShare) return 0.0;
  return (0.35 + 0.5 * rnd.z) * (0.6 + 0.6 * uPainterly);
}

float brushShape(vec2 local, float halfLen, float halfWid, vec4 rnd, float dryness, float softness) {
  float u = local.x / halfLen;
  float v = local.y / halfWid;
  // Edge softness in pixels: 1 = crisp. Backdrop strokes are softer (lost edges).
  float aa = mix(1.0, 0.35 * halfWid, softness);

  if (uBrush > 0.5 && uBrush < 1.5) {
    // Round brush: an oval dab with a slightly uneven edge.
    float edge = 1.0 - 0.1 * noise1(atan(v, u) * 2.0 + rnd.y * 30.0);
    float aaN = aa / min(halfLen, halfWid);
    return 1.0 - smoothstep(edge - aaN, edge + aaN, length(vec2(u, v)));
  }

  if (uBrush > 1.5 && uBrush < 2.5) {
    // Palette knife: a crisp flat slab with slanted ends.
    float x = local.x + local.y * (rnd.y - 0.5) * 0.8;
    float a = 1.0 - smoothstep(halfWid - aa, halfWid + aa, abs(local.y));
    return a * (1.0 - smoothstep(halfLen - aa, halfLen + aa, abs(x)));
  }

  // Flat brush: straight sides, a clean start, a ragged end where the bristles
  // run out. Dry strokes also break up along their length.
  float b = bristles(v, rnd.x);
  float side = halfWid * (1.0 + (noise1(u * 2.0 + rnd.y * 40.0) - 0.5) * 0.12);
  float a = 1.0 - smoothstep(side - aa, side + aa, abs(local.y));
  float start = -halfLen * (1.0 - 0.06 * b);
  float end = halfLen * (1.0 - (0.15 + 0.35 * dryness) * b);
  a *= smoothstep(start - aa, start + aa, local.x) * (1.0 - smoothstep(end - 2.0 * aa, end + aa, local.x));
  if (dryness > 0.01) {
    float t = clamp(u * 0.5 + 0.5, 0.0, 1.0);
    float streak = valueNoise3(vec3(v * 7.0 + rnd.x * 20.0, u * 0.9, rnd.y * 10.0));
    float dry = 0.75 * t * dryness;
    a *= smoothstep(dry - 0.06, dry + 0.06, streak);
  }
  return a;
}

// A flat geometric shape: a rectangle that may be slanted (a parallelogram) or
// tapered (a wedge), with crisp edges. Now and then one end fades out softly,
// a lost edge. Laid on like a translucent glaze.
float shapeMask(vec2 local, float halfLen, float halfWid, vec4 r) {
  float aa = 1.0;
  float x = local.x + local.y * (r.y - 0.5) * 0.9;
  float u = clamp(x / halfLen, -1.0, 1.0);
  float w = halfWid * (1.0 + (r.z - 0.5) * 0.8 * u);
  float a = 1.0 - smoothstep(w - aa, w + aa, abs(local.y));
  a *= 1.0 - smoothstep(halfLen - aa, halfLen + aa, abs(x));
  if (r.w > 0.65) a *= smoothstep(-1.0, -0.2, u * (r.w > 0.825 ? 1.0 : -1.0));
  return a;
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
// Which way a stroke runs, and what colour it is.
// ---------------------------------------------------------------------------
float strokeAngle(vec2 centreUv, float onObject, vec4 rnd, vec4 flow) {
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
  return mixAngle(fallback, edgeAngle, confidence) + (rnd.y - 0.5) * 0.5 * uPainterly;
}

// One stroke's colour: the picked-up colour, shifted a little in lightness,
// hue and saturation, so neighbouring strokes are different mixes of paint.
vec3 varyStroke(vec3 lab, vec4 rnd, float sizeClass, float onObject) {
  float sizeScale = onObject > 0.5
    ? (sizeClass < 0.5 ? 0.5 : (sizeClass < 1.5 ? 0.9 : 1.1))
    : (sizeClass < 0.5 ? 2.4 : (sizeClass < 1.5 ? 1.4 : 1.0));
  float j = uVariation * mix(0.35, 1.4, uPainterly) * sizeScale;
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
//   sizeClass: 0 big, 1 medium, 2 small
//   density:   the most strokes this layer may have (0..1 per cell)
//   bleed:     how far strokes may drag colour across edges (0..1)
// ---------------------------------------------------------------------------
vec3 paintLayer(vec3 colour, vec2 px, vec3 pixelLab, float pixelOnObject, float pixelPainted,
                float cell, float layer, float sizeClass, float density, float bleed) {
  vec2 offset = vec2(0.37, 0.71) * layer;
  vec2 base = floor(px / cell + offset);
  float tolerance = mix(0.025, 0.4, bleed);

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
      vec4 place = hash42(id + layer * 31.7 + uSeed * 1.731);
      if (place.x > density) continue;

      vec2 centrePx = (id + 0.15 + 0.7 * place.yz - offset) * cell;
      vec2 rel = px - centrePx;
      if (dot(rel, rel) > cell * cell * 1.25) continue;
      vec2 centreUv = centrePx / uResolution;
      vec4 rnd = hash42(id * 1.37 + layer * 7.1 + uSeed * 0.917 + 3.3);

      // Pick up paint. Looser painting picks it up a little off-centre.
      float offCentre = sizeClass < 0.5 ? 0.0 : uPainterly * 0.35;
      vec2 pickUv = centreUv + (rnd.xy - 0.5) * offCentre * cell / uResolution;
      vec4 picked = texture2D(tColour, clamp(pickUv, vec2(0.001), vec2(0.999)));
      float onObject = step(0.25, picked.a);
      if (abs(onObject - pixelOnObject) > 0.5) continue; // paint inside the lines
      if (picked.a > 0.75) continue;                    // never smear the crisp highlights

      // Big, Medium, Small: decide whether this cell really gets a stroke.
      vec4 flow = texture2D(tFlow, clamp(centreUv, vec2(0.0), vec2(1.0)));
      float edges = smoothstep(0.02, 0.1, flow.b);
      float chance = density;
      float rim = 0.0;
      if (onObject > 0.5) {
        if (sizeClass > 1.5) chance *= focalWeight(centreUv) * mix(0.35, 1.0, edges);
        else if (sizeClass > 0.5) chance *= mix(0.3, 1.0, edges);
      } else {
        rim = nearPaintedEdge(flow.a);
        float horizon = 1.0 - smoothstep(0.0, 0.06, abs(centreUv.y - uHorizon));
        if (sizeClass > 1.5) chance *= max(rim, horizon * 0.5);
        else if (sizeClass > 0.5) chance *= mix(0.25, 1.0, max(rim, horizon));
        chance *= insidePaintedArea(flow.a);
      }
      if (place.x > chance) continue;

      // A few small strokes along the backdrop's edge become thin pale scratch lines.
      bool accent = uAccents > 0.5 && onObject < 0.5 && sizeClass > 1.5 && rim > 0.5 && rnd.z < 0.35;

      float angle;
      if (accent) {
        angle = paintedEdgeAngle(centreUv) + (rnd.y - 0.5) * 0.15;
      } else {
        angle = strokeAngle(centreUv, onObject, rnd, flow);
        // Near the backdrop's edge, strokes follow its outline.
        if (rim > 0.01) angle = mixAngle(angle, paintedEdgeAngle(centreUv), rim * 0.8);
      }

      // Stroke or shape? Big marks are mostly shapes (glazes), small ones mostly strokes.
      vec4 look = hash42(id * 2.11 + layer * 3.7 + uSeed * 0.53 + 9.1);
      float shapeShare = onObject > 0.5
        ? (sizeClass < 0.5 ? 0.55 : (sizeClass < 1.5 ? 0.35 : 0.1))
        : (sizeClass < 0.5 ? 0.75 : (sizeClass < 1.5 ? 0.5 : 0.15));
      bool isShape = !accent && look.x < shapeShare;
      vec4 form = hash42(id * 0.73 + layer * 5.9 + uSeed * 0.27 + 1.7);

      float halfLen;
      float halfWid;
      if (isShape) {
        // Shapes are blockier than strokes.
        halfLen = cell * mix(0.5, 0.85, form.x);
        halfWid = cell * mix(0.28, 0.5, look.y);
      } else if (accent) {
        halfLen = cell * 0.95;
        halfWid = max(cell * 0.06, 1.2);
      } else if (onObject > 0.5) {
        halfLen = min(cell * uLength * 0.5 * (0.8 + 0.4 * rnd.z), cell);
        halfWid = cell * (sizeClass < 0.5 ? 0.42 : (sizeClass < 1.5 ? 0.34 : 0.28)) * (0.85 + 0.3 * rnd.w);
      } else {
        bool wall = centreUv.y > uHorizon;
        // Wall: broad slabs. Table: long, thinner sweeps.
        halfLen = cell * (wall ? 0.8 : 0.98) * (0.85 + 0.15 * rnd.z);
        halfWid = cell * (wall ? 0.5 : 0.26) * (0.85 + 0.3 * rnd.w);
      }

      vec2 dir = vec2(cos(angle), sin(angle));
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      if (abs(local.x) > halfLen + 2.0 || abs(local.y) > halfWid * 1.2 + 2.0) continue;

      float dryness = accent ? 0.3 : strokeDryness(sizeClass, rnd);
      // Edge hierarchy: hard edges on the subject, soft edges in the backdrop.
      float softness = accent || onObject > 0.5 ? 0.0 : (sizeClass < 0.5 ? 0.3 : (sizeClass < 1.5 ? 0.2 : 0.1));
      float a = isShape
        ? shapeMask(local, halfLen, halfWid, form)
        : brushShape(local, halfLen, halfWid, rnd, dryness, softness);
      // Every mark has its own opacity: shapes are see-through glazes, strokes mostly solid.
      a *= isShape ? mix(0.25, 0.75, look.z) : mix(0.7, 1.0, look.z);
      // Big backdrop marks are trimmed at the painted area's outline; smaller
      // strokes may poke out past it, which keeps that edge brushy.
      if (onObject < 0.5 && sizeClass < 0.5) a *= pixelPainted;

      vec3 pickedLab = linearToOklab(picked.rgb);
      if (!accent) {
        // Stay inside the colour area this stroke was loaded from, unless the
        // stroke is loose enough to drag colour across the edge.
        float difference = length(pixelLab - pickedLab);
        a *= 1.0 - smoothstep(tolerance, tolerance * 1.6 + 0.02, difference);
      }

      float pattern = 0.0;
      if (uPattern > 0.5 && !accent) {
        float zone = patternZone(centreUv);
        if (zone > 0.01) {
          float strength = zone * mix(0.5, 1.0, uPatternAmount);
          pattern = patternMask(local, halfWid, rnd) * strength;
          a *= mix(1.0, 0.25, strength) + 0.75 * pattern;
        }
      }
      if (a < 0.003) continue;

      vec3 lab;
      if (accent) {
        // Pale scratch lines: a lighter, calmer version of the canvas colour.
        lab = linearToOklab(uCanvasColour);
        lab.x += 0.13;
        lab.yz *= 0.6;
        a *= 0.85;
      } else {
        lab = varyStroke(pickedLab, rnd, sizeClass, onObject);
        if (isShape) {
          // A glaze needs a clearer shift to show through its transparency.
          // On the subject glazes lean darker; on the backdrop they go both ways and shift more.
          float glaze = (0.5 + uVariation) * (onObject > 0.5 ? 1.0 : 1.9);
          lab.x += (look.w - (onObject > 0.5 ? 0.62 : 0.5)) * 0.14 * glaze;
          float turn = (form.w - 0.5) * 0.3 * glaze;
          lab.yz = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * lab.yz;
        } else {
          lab.x += (bristles(local.y / halfWid, rnd.x) - 0.5) * 0.08 * uTexture * (0.5 + dryness);
        }
        lab.x -= pattern * 0.05;
      }
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
  float onObject = step(0.25, under.a);
  vec3 pixelLab = linearToOklab(under.rgb);
  vec3 colour = under.rgb;
  float p = uPainterly;

  if (onObject < 0.5) {
    // Backdrop: the canvas shows outside the painted shape (Backdrop falloff).
    float painted = paintedMask(texture2D(tFlow, vUv).a);
    colour = mix(uCanvasColour, under.rgb, painted);
    // Big slabs, then medium and small strokes where things happen.
    colour = paintLayer(colour, px, pixelLab, 0.0, painted, uBackdropCell, 1.0, 0.0, mix(0.45, 0.8, p), 0.2 + 0.1 * p);
    colour = paintLayer(colour, px, pixelLab, 0.0, painted, uBackdropCell * 0.45, 2.0, 1.0, mix(0.1, 0.7, p), 0.25 + 0.3 * p);
    colour = paintLayer(colour, px, pixelLab, 0.0, painted, uBackdropCell * 0.2, 3.0, 2.0, mix(0.1, 0.8, p), 0.3 * p);
  } else {
    // The object: big strokes in its planes, medium at edges, small near the focal point.
    colour = paintLayer(colour, px, pixelLab, 1.0, 1.0, uObjectCell, 4.0, 0.0, mix(0.35, 0.8, p), 0.06 * p);
    colour = paintLayer(colour, px, pixelLab, 1.0, 1.0, uObjectCell * 0.5, 5.0, 1.0, mix(0.03, 0.55, p), 0.05 + 0.4 * p);
    colour = paintLayer(colour, px, pixelLab, 1.0, 1.0, uObjectCell * 0.25, 6.0, 2.0, mix(0.0, 0.5, p), 0.4 * p);
  }

  // Right on the object's outline, use the clean render so the silhouette stays smooth.
  float outline = 1.0 - smoothstep(0.15, 0.22, abs(under.a - 0.25));
  colour = mix(colour, under.rgb, outline);

  // Crisp highlights on top.
  float highlight = clamp((under.a - 0.5) * 2.0, 0.0, 1.0);
  colour = mix(colour, under.rgb, highlight);

  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;
