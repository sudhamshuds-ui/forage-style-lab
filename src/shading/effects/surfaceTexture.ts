import type { ShaderEffect } from '../effect';

/**
 * Surface texture: how the paint itself looks on the apple, taken from the
 * reference paintings.
 *
 *  - Shards (the watermelon cubes): each facet of the apple is a slightly
 *    different mix of the same colour, a touch lighter or darker, a small hue
 *    turn, like overlapping flat pieces of paint. This makes the facets read
 *    as painted planes.
 *  - Granular fill (the lemons): a fine, sandy grain inside the shapes, like
 *    a sponge brush or salt on wet paint, with a few darker pigment granules.
 *
 * Both are painted on the apple's own surface, so they stay put as you orbit.
 * Paint > Texture sets how strong they are.
 */
const uniforms = {
  uSurfaceTexture: { value: 0.35 },
};

export const surfaceTexture: ShaderEffect = {
  name: 'Surface texture',
  uniforms,
  declarations: /* glsl */ `
uniform float uSurfaceTexture;
`,
  body: /* glsl */ `
vec3 lab = linearToOklab(colour);

// 1. Shards: one random mix per facet, keyed on which way the facet faces.
vec3 facetKey = floor(N * 2.5 + 0.5);
float pickLight = hash13(facetKey * 7.13 + 1.7);
float pickHue = hash13(facetKey * 3.71 + 9.2);
float shard = mix(0.5, 1.0, uSurfaceTexture);
lab.x += (pickLight - 0.5) * 0.06 * shard;
float turn = (pickHue - 0.5) * 0.16 * shard;
lab.yz = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * lab.yz;

// 2. Granular fill: fine sandy grain, plus a few darker pigment granules.
float sand = valueNoise3(objectPos * 70.0) * 0.6 + valueNoise3(objectPos * 150.0) * 0.4;
lab.x += (sand - 0.5) * 0.07 * uSurfaceTexture;
float granule = step(0.82, valueNoise3(objectPos * 95.0 + 4.2));
lab.x -= granule * 0.035 * uSurfaceTexture;
lab.yz *= 1.0 + granule * 0.15 * uSurfaceTexture;

colour = max(oklabToLinear(lab), 0.0);
`,
  update(settings) {
    uniforms.uSurfaceTexture.value = settings.paint.texture / 100;
  },
};
