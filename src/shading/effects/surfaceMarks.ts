import type { ShaderEffect } from '../effect';

/**
 * Surface marks: a few deliberate brush marks, only where the form turns.
 *
 * In the reference paintings the big shapes stay calm and the visible
 * strokes sit where something happens: along the line where one plane turns
 * into the next. This layer adds exactly that, and nothing on flat areas.
 *
 * The marks are placed on the apple's own surface (a grid of cells in the
 * apple's coordinates, like a texture), so when you orbit they travel with
 * the apple instead of re-forming on screen.
 *
 * Each mark:
 *  - lives only near a tone band edge (a form turn)
 *  - is a short dab with soft round ends, running along the band
 *  - is ONE colour: the paint under it, a step lighter or darker, with a tiny
 *    hue turn, like a slightly different mix on the brush
 *
 * Paint > Brushiness sets how many marks there are (and makes them a little
 * smaller and busier). Paint > Texture adds a fine speckle to the skin.
 */
const uniforms = {
  uBrushiness: { value: 0.35 },
  uMarkTexture: { value: 0.3 },
  uMarkCell: { value: 0.15 },
};

export const surfaceMarks: ShaderEffect = {
  name: 'Surface marks',
  uniforms,
  declarations: /* glsl */ `
uniform float uBrushiness;
uniform float uMarkTexture;
uniform float uMarkCell;

vec4 markHash(vec3 id) {
  return vec4(
    hash13(id + vec3(1.3, 7.1, 3.7)),
    hash13(id * 1.7 + vec3(9.2, 2.4, 5.5)),
    hash13(id * 2.3 + vec3(4.4, 8.8, 0.6)),
    hash13(id * 3.1 + vec3(6.6, 1.9, 7.3))
  );
}
`,
  body: /* glsl */ `
// How close is this point to a form turn (a tone band edge)? uBands comes from Tone bands.
float facing = clamp((dot(N, L) + 0.55) / 1.55, 0.0, 1.0);
float bandCount = max(uBands, 2.0);
float k = facing * bandCount;
float nearest = floor(k + 0.5);
float toEdge = abs(k - nearest) / bandCount;
// The very top and bottom of the range are not edges.
float isEdge = step(0.5, nearest) * step(nearest, bandCount - 0.5);
float turn = (1.0 - smoothstep(0.0, 0.08, toEdge)) * isEdge;
float coverage = turn * 0.55 * uBrushiness;

if (coverage > 0.01) {
  // Marks run along the band: across the light direction, on the surface.
  vec3 T = cross(N, L);
  T = length(T) > 1e-3 ? normalize(T) : normalize(cross(N, vec3(0.0, 1.0, 0.0)));
  vec3 B = cross(N, T);

  vec3 grid = objectPos / uMarkCell;
  vec3 base = floor(grid);
  float bestKey = -1.0;
  float bestA = 0.0;
  vec4 bestRnd = vec4(0.0);

  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec3 id = base + vec3(float(x), float(y), float(z));
        vec4 rnd = markHash(id);
        vec3 centre = (id + 0.2 + 0.6 * rnd.xyz) * uMarkCell;
        vec3 rel = objectPos - centre;
        if (abs(dot(rel, N)) > uMarkCell * 0.5) continue;

        // The mark's own direction: along the band, turned a little.
        float spin = (rnd.w - 0.5) * 0.6;
        vec3 along = T * cos(spin) + B * sin(spin);
        vec3 across = cross(N, along);
        vec2 local = vec2(dot(rel, along), dot(rel, across)) / uMarkCell;

        // A short dab with round ends (a capsule shape).
        float halfLen = 0.65;
        float halfWid = 0.22;
        float dist = length(vec2(max(abs(local.x) - (halfLen - halfWid), 0.0), local.y)) - halfWid;
        float aa = max(fwidth(dist), 1e-4);
        float a = 1.0 - smoothstep(-aa, aa, dist);
        // Fade marks in and out with how strongly this spot is a form turn.
        a *= smoothstep(rnd.x, rnd.x + 0.15, coverage);
        if (a > 0.003 && rnd.y > bestKey) {
          bestKey = rnd.y;
          bestA = a;
          bestRnd = rnd;
        }
      }
    }
  }

  if (bestA > 0.0) {
    vec3 lab = linearToOklab(colour);
    lab.x += bestRnd.z > 0.5 ? 0.04 : -0.04;
    float hueTurn = (bestRnd.w - 0.5) * 0.2;
    lab.yz = mat2(cos(hueTurn), sin(hueTurn), -sin(hueTurn), cos(hueTurn)) * lab.yz;
    colour = mix(colour, max(oklabToLinear(lab), 0.0), bestA);
  }
}

// A fine speckle on the skin, also stuck to the surface.
vec3 skin = linearToOklab(colour);
skin.x += (valueNoise3(objectPos * 40.0) - 0.5) * 0.04 * uMarkTexture;
colour = max(oklabToLinear(skin), 0.0);
`,
  update(settings, context) {
    const brushiness = settings.paint.brushiness / 100;
    uniforms.uBrushiness.value = brushiness;
    uniforms.uMarkTexture.value = settings.paint.texture / 100;
    // Smaller, busier marks at higher brushiness, sized to the apple.
    uniforms.uMarkCell.value = context.objectRadius * (0.18 - 0.06 * brushiness);
  },
};
