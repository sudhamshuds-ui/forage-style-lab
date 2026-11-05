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
uniform float uFollowForm;
uniform float uSwirl;
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

// The angle of a direction. atan(0, 0) has no answer: on plain backdrop the
// flow pass finds no edge and stores exactly (0, 0), and some GPUs (Macs)
// return NaN ("not a number") there. NaN spreads through every step after it
// and paints those pixels black. No direction at all simply counts as 0 here.
float safeAtan(float y, float x) {
  return abs(x) + abs(y) < 1e-8 ? 0.0 : atan(y, x);
}

// Two angles that mean the same line (a and a + 180 degrees) are blended correctly.
float mixAngle(float a, float b, float t) {
  vec2 m = mix(vec2(cos(2.0 * a), sin(2.0 * a)), vec2(cos(2.0 * b), sin(2.0 * b)), t);
  return 0.5 * safeAtan(m.y, m.x);
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
    float side = halfWid * (1.0 + (noise1(u * 2.0 + rnd.y * 40.0) - 0.5) * 0.12);
    float a = 1.0 - smoothstep(side - aa, side + aa, abs(local.y));
    // The ragged end: a few soft steps where bristles run out of paint (a smooth,
    // low-frequency wave across the brush, not fine comb teeth, which flickered
    // like a saw blade while the view turned).
    float rag = noise1(v * 2.5 + rnd.x * 57.0);
    float start = -halfLen * (1.0 - 0.06 * rag);
    float end = halfLen * (1.0 - (0.12 + 0.28 * uLoose) * rag);
    a *= smoothstep(start - aa, start + aa, local.x) * (1.0 - smoothstep(end - 3.0 * aa, end + 2.0 * aa, local.x));
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
    float edge = 1.0 - 0.1 * noise1(safeAtan(v, u) * 2.0 + rnd.y * 30.0);
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

// Which area a pixel belongs to, from the alpha label: 0 = lit backdrop,
// 1 = backdrop in the cast shadow, 2 = the object. Strokes stay inside their
// own area, so the cast shadow keeps a clean shape instead of being chopped up.
float regionOf(float a) {
  return a >= 0.25 ? 2.0 : (a > 0.06 ? 1.0 : 0.0);
}

// ---------------------------------------------------------------------------
// The room's horizon. uHorizon is where the wall colour takes over from the table
// colour, found from the room itself each frame (roomHorizonUv in background.ts).
// ---------------------------------------------------------------------------
// 0 on the table, 1 on the wall, a soft step between.
float wallness(vec2 uv) {
  return smoothstep(-0.03, 0.03, uv.y - uHorizon);
}

// 1 right on the horizon, fading to 0 a little above and below it. It reaches a little
// further down onto the table, where long strokes would otherwise lean up into the wall.
float horizonBand(vec2 uv) {
  float d = uv.y - uHorizon;
  return d > 0.0 ? 1.0 - smoothstep(0.02, 0.07, d) : 1.0 - smoothstep(0.03, 0.11, -d);
}

// The room's own colour edges around a backdrop stroke: where the wall colour drifts into
// the table colour, or the window light's patch begins. Measured from the painting at the
// size of a big slab, the way the flow pass measures the object's edges. Returns the
// direction the edge runs (xy, as cos/sin of twice the angle, so a line and its reverse
// agree) scaled by how clear the edge is (0..1). \`around\` is the room's average colour
// around the spot (OKLab), to spot thin features such as the light's rainbow fringe.
// How close the ingredient is to a room stroke (1 = right beside it, 0 = clear of it), from
// eight samples round the stroke's centre, out to about a stroke's length.
float nearObject(vec2 uv, float reachPx) {
  float near = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854;
    for (int k = 1; k <= 2; k++) {
      vec2 d = vec2(cos(a), sin(a)) * reachPx * float(k) / uResolution;
      float alpha = texture2D(tColour, clamp(uv + d, vec2(0.001), vec2(0.999))).a;
      if (alpha >= 0.25) near = max(near, k == 1 ? 1.0 : 0.6);
    }
  }
  return near;
}

vec2 roomEdge(vec2 uv, float region, float reachPx, out vec3 around) {
  vec2 d = reachPx / uResolution;
  vec4 c = texture2D(tColour, uv);
  vec3 centre = linearToOklab(c.rgb);
  vec4 e = texture2D(tColour, clamp(uv + vec2(d.x, 0.0), vec2(0.001), vec2(0.999)));
  vec4 w = texture2D(tColour, clamp(uv - vec2(d.x, 0.0), vec2(0.001), vec2(0.999)));
  vec4 n = texture2D(tColour, clamp(uv + vec2(0.0, d.y), vec2(0.001), vec2(0.999)));
  vec4 s = texture2D(tColour, clamp(uv - vec2(0.0, d.y), vec2(0.001), vec2(0.999)));
  // A sample on another area (the ingredient, the cast shadow) counts as the centre's
  // colour, so the ingredient's outline never steers the room's strokes.
  vec3 le = abs(regionOf(e.a) - region) < 0.5 ? linearToOklab(e.rgb) : centre;
  vec3 lw = abs(regionOf(w.a) - region) < 0.5 ? linearToOklab(w.rgb) : centre;
  vec3 ln = abs(regionOf(n.a) - region) < 0.5 ? linearToOklab(n.rgb) : centre;
  vec3 ls = abs(regionOf(s.a) - region) < 0.5 ? linearToOklab(s.rgb) : centre;
  around = (le + lw + ln + ls) * 0.25;
  vec3 gx = le - lw;
  vec3 gy = ln - ls;
  float jxx = dot(gx, gx);
  float jyy = dot(gy, gy);
  float jxy = dot(gx, gy);
  // The colour changes most along (jxx - jyy, 2 jxy); the edge runs across that, so flip it.
  vec2 across = vec2(jxx - jyy, 2.0 * jxy);
  float len = length(across);
  if (len < 1e-8) return vec2(0.0);
  float clear = smoothstep(0.07, 0.15, sqrt(jxx + jyy));
  return -across / len * clear;
}

// ---------------------------------------------------------------------------
// Which way a stroke runs.
// ---------------------------------------------------------------------------
float strokeAngle(vec2 centreUv, float onObject, vec4 rnd) {
  vec4 flow = texture2D(tFlow, centreUv);
  float edgeAngle = 0.5 * safeAtan(flow.y, flow.x);
  float confidence = clamp(length(flow.xy) * 1.5, 0.0, 1.0);

  float fallback;
  if (onObject > 0.5) {
    fallback = 0.5 + (rnd.z - 0.5) * 1.6;
  } else {
    // Wall: big diagonal slabs, with a few steeper ones.
    float wallAngle = rnd.z < 0.7 ? -0.42 + (rnd.w - 0.5) * 0.35 : 1.25 + (rnd.w - 0.5) * 0.3;
    // Table: long sweeps, nearly level.
    float tableAngle = (rnd.w - 0.5) * 0.18;
    // Near the horizon the wall's slabs lie down level too, so they never poke into the
    // table as a sawtooth. Like a painter laying the line where wall meets table with a
    // few flat, level passes of the brush.
    fallback = mixAngle(tableAngle, wallAngle, wallness(centreUv) * (1.0 - horizonBand(centreUv)));
  }
  // Swirl: strokes flow in slow, curling currents (Van Gogh's skies), from a smooth
  // noise field, so neighbouring strokes line up into streams.
  if (uSwirl > 0.0) {
    vec2 p = centreUv * vec2(uResolution.x / uResolution.y, 1.0) * 1.3;
    float current = 6.283 * (valueNoise3(vec3(p, 1.7)) * 1.1 + valueNoise3(vec3(p * 2.3, 4.2)) * 0.15);
    fallback = mixAngle(fallback, current, uSwirl);
  }
  float formAngle = mixAngle(fallback, edgeAngle, confidence);
  // Hatching: every stroke on the same diagonal (rising to the right), like
  // Cézanne's parallel patches. Follow the form blends between the two.
  float hatch = 0.95 + (rnd.z - 0.5) * 0.22;
  return mixAngle(hatch, formAngle, uFollowForm) + (rnd.y - 0.5) * 0.5 * uLoose;
}

// One stroke's colour: the picked-up colour, shifted a little in lightness,
// hue and saturation, so neighbouring strokes are different mixes of paint.
vec3 strokeLab(vec3 picked, vec4 rnd, float onObject) {
  vec3 lab = linearToOklab(picked);
  // The backdrop's colour shifts are capped, so even a broken-colour painter (Monet)
  // keeps a calm room around a lively subject.
  float j = onObject > 0.5 ? uVariation * 0.8 : min(uVariation, 0.7 + 0.4 * uSwirl) * 0.9;
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
      // No stroke reaches further than about a cell from its centre (see \`fit\` below), so
      // a far-away one can be skipped before any of the measuring.
      if (length(px - centrePx) > cell * 1.1 + 2.0) continue;

      // Pick up paint. Looser painting picks it up a little off-centre.
      vec2 pickUv = centreUv + (rnd.xy - 0.5) * uLoose * cell * 0.6 / uResolution;
      vec4 picked = texture2D(tColour, clamp(pickUv, vec2(0.001), vec2(0.999)));
      float onObject = step(0.25, picked.a);

      if (abs(regionOf(picked.a) - pixelRegion) > 0.5) continue; // paint inside the lines
      if (area > 0.5 && area < 1.5 && onObject > 0.5) continue;
      if (area > 1.5 && onObject < 0.5) continue;
      if (picked.a > 0.75) continue; // never smear the crisp highlights

      float angle = strokeAngle(centreUv, onObject, rnd);
      // In a swirl, backdrop strokes keep close to the current (less random wobble).
      if (onObject < 0.5 && uSwirl > 0.0) angle = mixAngle(angle, strokeAngle(centreUv, onObject, vec4(rnd.x, 0.5, 0.5, rnd.w)), uSwirl * 0.7);
      if (onObject < 0.5) {
        // Room strokes follow the room's own colour edges (wall into table, the edge of
        // the window light), and lie level right along the horizon.
        vec3 around;
        vec2 edge = roomEdge(centreUv, regionOf(picked.a), cell * 0.6, around);
        // A stroke that lands on a thin feature (the light's rainbow fringe, a sliver of
        // colour) would spread it into a whole block. It loads the room's colour instead,
        // and the wet-in-wet pick-up below lets the real fringe show in its own shape.
        vec3 pickedOk = linearToOklab(picked.rgb);
        float thin = smoothstep(0.015, 0.045, length(pickedOk - around));
        picked.rgb = max(oklabToLinear(mix(pickedOk, around, thin * 0.85)), 0.0);
        if (dot(edge, edge) > 1e-6) angle = mixAngle(angle, 0.5 * safeAtan(edge.y, edge.x), length(edge) * 0.8);
        // Right beside the ingredient, the soft edge just outside its outline is not part of the
        // room: strokes that followed it stood upright and carried the wall's colour straight
        // down past the horizon, as a block with a toothy top (the user, 2026-11-06). There they
        // lie level, like the calm passes along the horizon.
        float near = nearObject(centreUv, cell * 0.6);
        angle = mixAngle(angle, (rnd.w - 0.5) * 0.12, max(horizonBand(centreUv) * 0.92, near));
      }
      vec2 dir = vec2(cos(angle), sin(angle));
      vec2 rel = px - centrePx;
      vec2 local = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
      float halfLen = min(cell * uLength * 0.5 * (0.8 + 0.4 * rnd.z), cell);
      float halfWid = cell * 0.36 * (0.85 + 0.3 * rnd.w);
      if (onObject < 0.5) {
        // Wall: broad slabs. Table: long, thinner sweeps. Along the horizon, long thin
        // level passes, so the line where wall meets table reads as a few calm strokes.
        // Mixed sizes, so the room never reads as a repeating pattern (polka dots).
        float wall = wallness(centreUv) * (1.0 - horizonBand(centreUv));
        float mixed = 0.65 + 0.7 * place.y;
        halfLen = min(cell * mix(0.98, 0.8, wall) * (0.85 + 0.15 * rnd.z) * mixed, cell);
        halfWid = cell * mix(0.26, 0.5, wall) * (0.85 + 0.3 * rnd.w) * mixed;
        // Along the horizon the level passes stay slim, so none carries the wall far down.
        halfWid *= mix(1.0, 0.6, horizonBand(centreUv));
        // Swirling currents need long, thin strokes to read as streams.
        halfWid *= mix(1.0, 0.4, uSwirl);
        halfLen = min(halfLen * mix(1.0, 1.25, uSwirl), cell);
      }
      // Keep the whole stroke, even its corners when it is turned, inside the 3 by 3
      // cells we look at. A stroke that reached further got cut off in a straight
      // line, and the cut popped in and out while the view turned.
      float reach = length(vec2(halfLen, halfWid * 1.2)) + 3.0;
      float fit = min(1.0, cell * 1.1 / reach);
      halfLen *= fit;
      halfWid *= fit;
      if (abs(local.x) > halfLen + 2.0 || abs(local.y) > halfWid * 1.2 + 2.0) continue;

      float a = brushShape(local, halfLen, halfWid, rnd);
      float pattern = 0.0;
      if (uPattern > 0.5) {
        pattern = patternMask(local, halfWid, rnd);
        // Quieter on the backdrop, so the room never turns into wallpaper.
        float amount = uPatternAmount * (onObject > 0.5 ? 1.0 : 0.35);
        a *= mix(1.0, mix(0.25, 1.0, pattern), amount);
      }
      if (a < 0.003) continue;

      vec3 lab = strokeLab(picked.rgb, rnd, onObject);
      lab.x += (bristles(local.y / halfWid, rnd.x) - 0.5) * 0.08 * uTexture;
      lab.x -= pattern * 0.05 * uPatternAmount * (onObject > 0.5 ? 1.0 : 0.35);
      if (onObject < 0.5) {
        // Wet-in-wet: a room stroke that runs from one colour into another (wall into
        // table, shade into the window light) picks up the colour under it as it goes,
        // more toward its ends. Where the room underneath matches the stroke, nothing
        // changes, so stroke edges stay crisp everywhere else. The stroke keeps its own
        // shift and bristles, just in the new colour.
        vec3 pickedLab = linearToOklab(picked.rgb);
        vec3 hereLab = linearToOklab(texture2D(tColour, px / uResolution).rgb);
        float differ = length(hereLab - pickedLab);
        float toEnd = clamp(abs(local.x) / halfLen, 0.0, 1.0);
        // Along the horizon even a gentle change counts; elsewhere only a clear one (the
        // edge of the window light), so the wall's slabs keep their own shapes.
        float from = mix(0.07, 0.025, horizonBand(centreUv));
        // Strongly all along the stroke, not only at its ends: a wide slab that spilled across
        // the horizon kept its wall colour in its middle, and stacks of them hung down into
        // the table as a block with a toothy top, worst beside the ingredient where fewer room
        // strokes overlap (the user, 2026-11-06).
        float wet = smoothstep(from, from + 0.06, differ) * mix(0.75, 0.95, toEnd);
        lab = mix(lab, hereLab + (lab - pickedLab), wet);
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
  float region = regionOf(under.a);
  vec3 colour = under.rgb;

  // 1. Backdrop: big slabs, then a second, smaller pass of slabs.
  colour = paintLayer(colour, px, uBackdropCell, 1.0, region, 1.0, 1.0);
  colour = paintLayer(colour, px, uBackdropCell * 0.8, 2.0, region, 1.0, 0.55);

  // 2. The object: two passes of strokes at the main size.
  colour = paintLayer(colour, px, uCell, 3.0, region, 2.0, 1.0);
  colour = paintLayer(colour, px, uCell * 0.8, 4.0, region, 2.0, 0.85);

  // 3. Small detail strokes where edges need defining, on the object only. (On the
  // backdrop they made a pale, speckled halo round the outline: small strokes pick up
  // a slightly different colour from the big slabs around them.)
  float edges = smoothstep(0.03, 0.1, texture2D(tFlow, vUv).b);
  if (edges > 0.0) {
    colour = mix(colour, paintLayer(colour, px, uCell * 0.5, 5.0, region, 2.0, 1.0), edges);
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
