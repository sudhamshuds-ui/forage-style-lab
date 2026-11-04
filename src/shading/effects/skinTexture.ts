import { Vector4, type ShaderMaterial } from 'three';
import type { ShaderEffect } from '../effect';
import { UNITS_PER_CM } from '../../ingredients/scale';

/**
 * Skin texture: each ingredient's own peel, painted on its surface.
 *
 * The shared Surface texture layer gives every object the same paint grain.
 * This layer sits on top and adds what makes a peel itself, set per
 * ingredient in the registry (never modelled in the form):
 *
 *  - pebbled (lemon): soft round bumps all over. Each bump is a little
 *    brighter on the side facing the key light and darker on the other,
 *    like a tiny emboss, so the peel catches the light.
 *  - pores (orange): fine pits, a touch darker, with a lit rim.
 *  - streaks (apple): soft vertical flushes of colour and a few pale
 *    freckles (lenticels).
 *
 * The pattern sticks to the surface (it uses objectPos), so it turns with
 * the ingredient and never swims. It fades in the deepest shadow, where a
 * painter would not bother with it. Darker marks lean toward the
 * ingredient's own deep shade (shadeOwn), never grey. Unlike the shared layer, its values
 * live on each material (`uSkin`), so the stem and leaf stay plain.
 */

/** The skin kinds. The shader receives the position in this list. */
export const SKIN_KINDS = ['none', 'pebbled', 'pores', 'streaks'] as const;
export type SkinKind = (typeof SKIN_KINDS)[number];

export interface Skin {
  kind: SkinKind;
  /** Size of one bump, pore or streak, in millimetres (real size). */
  size_mm: number;
  /** 0 to 1: how strongly it shows. */
  amount: number;
}

export const NO_SKIN: Skin = { kind: 'none', size_mm: 1, amount: 0 };

/** The per-material value this layer reads. Added to every material by StylizedLook. */
export function skinUniform(): { value: Vector4 } {
  return { value: new Vector4(0, 1, 0, 0) };
}

/** Give one material its skin. */
export function setSkin(material: ShaderMaterial, skin: Skin): void {
  // Cells per scene unit: 10 mm per cm, then centimetres to scene units.
  const cellsPerUnit = 10 / Math.max(0.1, skin.size_mm) / UNITS_PER_CM;
  (material.uniforms.uSkin.value as Vector4).set(SKIN_KINDS.indexOf(skin.kind), cellsPerUnit, skin.amount, 0);
}

export const skinTexture: ShaderEffect = {
  name: 'Skin texture',
  uniforms: {},
  declarations: /* glsl */ `
uniform vec4 uSkin; // x: kind (see SKIN_KINDS), y: cells per scene unit, z: amount

// Distance to the nearest of a scatter of points (one per cell): a cellular
// pattern, round cells of about one unit.
float skinCells(vec3 p) {
  vec3 cell = floor(p);
  float nearest = 8.0;
  for (int x = -1; x <= 1; x++)
  for (int y = -1; y <= 1; y++)
  for (int z = -1; z <= 1; z++) {
    vec3 c = cell + vec3(float(x), float(y), float(z));
    vec3 point = c + vec3(hash13(c), hash13(c + 17.3), hash13(c + 41.9)) * 0.8 + 0.1;
    nearest = min(nearest, length(p - point));
  }
  return nearest;
}
`,
  body: /* glsl */ `
int kind = int(uSkin.x + 0.5);
float amount = uSkin.z;
if (kind > 0 && amount > 0.0) {
  vec3 p = objectPos * uSkin.y;
  vec3 lab = linearToOklab(colour);
  // Show it in the light, let it fade into the shadow.
  float show = amount * mix(0.35, 1.0, tone);

  if (kind == 1) {
    // Pebbled: domes. Compare the height a step toward the light with here.
    // Wide, soft domes, so the cells never read as a pattern of patches.
    float here = 1.0 - smoothstep(0.0, 1.1, skinCells(p));
    float toward = 1.0 - smoothstep(0.0, 1.1, skinCells(p + L * 0.25));
    float emboss = (toward - here) * show;
    lab = emboss > 0.0 ? lab + vec3(emboss * 0.055, 0.0, 0.0) : shadeOwn(lab, -emboss * 0.45);
  } else if (kind == 2) {
    // Pores: small pits with a lit rim on the side away from the light.
    float pit = 1.0 - smoothstep(0.08, 0.3, skinCells(p));
    float rim = 1.0 - smoothstep(0.08, 0.3, skinCells(p - L * 0.12));
    lab = shadeOwn(lab, pit * 0.38 * show);
    lab.x += max(rim - pit, 0.0) * 0.03 * show;
  } else if (kind == 3) {
    // Streaks: stretched up and down the fruit, plus sparse pale freckles.
    float streak = valueNoise3(vec3(p.x * 4.0, p.y * 0.35, p.z * 4.0));
    float flush = (streak - 0.5) * show;
    lab = flush > 0.0 ? shadeOwn(lab, flush * 0.5) : lab - vec3(flush * 0.06, 0.0, 0.0);
    float freckle = 1.0 - smoothstep(0.05, 0.13, skinCells(p * 1.6));
    lab.x += freckle * 0.05 * show;
    lab.yz *= 1.0 - freckle * 0.25 * show;
  }
  colour = max(oklabToLinear(lab), 0.0);
}
`,
  update() {},
};
