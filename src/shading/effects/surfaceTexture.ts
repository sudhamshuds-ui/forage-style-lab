import type { ShaderEffect } from '../effect';

/**
 * Surface texture: how the paint itself looks on the apple, taken from the
 * reference paintings.
 *
 *  - Shards (the watermelon cubes): the mix of colour drifts with the way the
 *    surface faces. A flat facet faces one way, so it gets one mix, and the
 *    facets read as overlapping flat pieces of paint. On the soft, rounded
 *    apple the same drift is gentle and smooth, with no hard patches.
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

// 1. Shards: a smooth field over surface directions, so each flat facet gets one mix.
float pickLight = valueNoise3(N * 2.2 + vec3(1.7, 4.1, 2.3));
float pickHue = valueNoise3(N * 2.2 + vec3(9.2, 0.6, 5.8));
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
