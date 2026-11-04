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
 *    a sponge brush or salt on wet paint, with a few deeper pigment granules.
 *    Every darker mark leans toward the object's own deep shade (shadeOwn),
 *    so a lemon's granules are golden, never grey or olive.
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
float pickLight = valueNoise3(N * 2.2 + vec3(1.7, 4.1, 2.3)) - 0.5;
float pickHue = valueNoise3(N * 2.2 + vec3(9.2, 0.6, 5.8));
float shard = mix(0.5, 1.0, uSurfaceTexture);
lab = pickLight > 0.0 ? lab + vec3(pickLight * 0.06 * shard, 0.0, 0.0) : shadeOwn(lab, -pickLight * 0.5 * shard);
float turn = (pickHue - 0.5) * 0.16 * shard;
lab.yz = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * lab.yz;

// 2. Granular fill: fine sandy grain, plus a few deeper pigment granules in the object's own shade.
float sand = valueNoise3(objectPos * 70.0) * 0.6 + valueNoise3(objectPos * 150.0) * 0.4 - 0.5;
lab = sand > 0.0 ? lab + vec3(sand * 0.07 * uSurfaceTexture, 0.0, 0.0) : shadeOwn(lab, -sand * 0.6 * uSurfaceTexture);
float granule = step(0.82, valueNoise3(objectPos * 95.0 + 4.2));
lab = shadeOwn(lab, granule * 0.3 * uSurfaceTexture);

colour = max(oklabToLinear(lab), 0.0);
`,
  update(settings) {
    uniforms.uSurfaceTexture.value = settings.paint.texture / 100;
  },
};
