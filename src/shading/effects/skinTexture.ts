import { Color, Vector4, type ShaderMaterial, type Texture } from 'three';
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
 *  - seeds (strawberry): pale-gold seeds, evenly spread, each sitting in a
 *    soft dimple that catches the light on one side and shades on the
 *    other, which gives the berry its bumpy surface.
 *  - florets (broccoli, cauliflower): tightly packed round buds in small
 *    clusters, each bud lit on its side toward the light, the gaps between
 *    them in the crown's own deep shade. Two sizes (clusters and buds), so it
 *    reads as a mass of tiny florets, not a pattern.
 *  - crust (bread): baked colour, like the user's references: toastier and warmer on top,
 *    paler golden down the sides, soft blotchy variation (watercolour-like), tiny dark pores,
 *    and white flour specks on top. No crackle lines (they read as worms).
 *  - crumb (any piece named `crumb`, set automatically): soft open air holes in the crumb's
 *    own deeper cream, faint lengthwise streaks where the dough stretched, and a golden,
 *    toasted rim where it meets the crust (its steeper sides). Never flat white.
 *  - leaf (sepals and leaves, set automatically): deeper at the stalk and
 *    lighter toward the tip, a pale centre vein, faint side veins, a slight
 *    hue drift from leaf to leaf, and a paler, cooler underside. Uses the
 *    leaf's own map (vSurfaceUv), so it works for any leaf shape.
 *
 * The pattern sticks to the surface (it uses objectPos), so it turns with
 * the ingredient and never swims. It fades in the deepest shadow, where a
 * painter would not bother with it. Darker marks lean toward the
 * ingredient's own deep shade (shadeOwn), never grey. Unlike the shared layer, its values
 * live on each material (`uSkin`), so the stem and leaf stay plain.
 */

/** The skin kinds. The shader receives the position in this list. */
export const SKIN_KINDS = ['none', 'pebbled', 'pores', 'streaks', 'seeds', 'leaf', 'florets', 'crust', 'crumb', 'label', 'melon'] as const;
export type SkinKind = (typeof SKIN_KINDS)[number];

export interface Skin {
  kind: SkinKind;
  /** Size of one bump, pore or streak, in millimetres (real size). */
  size_mm: number;
  /** 0 to 1: how strongly it shows. */
  amount: number;
}

export const NO_SKIN: Skin = { kind: 'none', size_mm: 1, amount: 0 };

/** Every piece named `crumb` (bread showing in a slash, later a cut slice) gets this skin. */
export const CRUMB_SKIN: Skin = { kind: 'crumb', size_mm: 3, amount: 1 };

/** Every leaf and sepal gets this skin automatically (it needs the leaf's own map). */
export const LEAF_SKIN: Skin = { kind: 'leaf', size_mm: 1, amount: 1 };

/**
 * A printed label (a piece named `label` with its own map): the label's artwork, a two-tone
 * stencil from src/shading/labelArt.ts, in cream ink on the label's ground colour. The ink
 * takes the same light and shadow as the ground, so it looks printed on the bottle.
 */
export const LABEL_SKIN: Skin = { kind: 'label', size_mm: 1, amount: 1 };

/** The per-material value this layer reads. Added to every material by StylizedLook. */
export function skinUniform(): { value: Vector4 } {
  return { value: new Vector4(0, 1, 0, 0) };
}

/** A label's artwork and ink colour (only label materials use them). Added to every material. */
export function labelUniforms(): { uLabelMap: { value: Texture | null }; uLabelInk: { value: Color } } {
  return { uLabelMap: { value: null }, uLabelInk: { value: new Color('#fdf6e6') } };
}

/**
 * A melon's rind colours, for the `melon` skin's gradient from flesh to rind: the pale band and
 * the green. Added to every material; only melon flesh uses them (set in subject.ts).
 */
export function melonUniforms(): { uMelonPale: { value: Color }; uMelonGreen: { value: Color } } {
  return { uMelonPale: { value: new Color('#f3f1c8') }, uMelonGreen: { value: new Color('#7fae55') } };
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
uniform sampler2D uLabelMap; // a label's artwork: white = ink, black = the ground
uniform vec3 uLabelInk;      // the ink colour (cream)
uniform vec3 uMelonPale;     // a melon's pale band, between flesh and rind
uniform vec3 uMelonGreen;    // a melon's green rind

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
  } else if (kind == 4) {
    // Seeds: each sits in a soft dimple. Compare the dimple a step toward the light with here:
    // the side of the dimple facing the light is lit, the other side shaded (a small emboss).
    float d = skinCells(p);
    float dimple = 1.0 - smoothstep(0.0, 0.45, d);
    float dimpleToward = 1.0 - smoothstep(0.0, 0.45, skinCells(p + L * 0.2));
    float emboss = (dimple - dimpleToward) * show;
    lab = emboss > 0.0 ? lab + vec3(emboss * 0.1, 0.0, 0.0) : shadeOwn(lab, -emboss * 0.9);
    // The seed itself: a clear pale-gold fleck in the dimple.
    float seed = 1.0 - smoothstep(0.1, 0.16, d);
    vec3 gold = linearToOklab(mix(uHighlightColour, uGlowColour, 0.5) * vec3(1.0, 0.92, 0.6));
    lab = mix(lab, gold, seed * 0.95 * amount * mix(0.7, 1.0, tone));
  } else if (kind == 6) {
    // Florets: domes at two sizes. Each dome is lit on its side toward the light (emboss),
    // and the gaps between buds sink into the crown's own deep shade.
    float cluster = 1.0 - smoothstep(0.0, 1.0, skinCells(p * 0.45));
    float clusterToward = 1.0 - smoothstep(0.0, 1.0, skinCells(p * 0.45 + L * 0.12));
    float bud = 1.0 - smoothstep(0.0, 0.85, skinCells(p));
    float budToward = 1.0 - smoothstep(0.0, 0.85, skinCells(p + L * 0.25));
    float emboss = ((clusterToward - cluster) * 0.6 + (budToward - bud) * 0.8) * show;
    lab = emboss > 0.0 ? lab + vec3(emboss * 0.12, 0.0, 0.0) : shadeOwn(lab, -emboss * 1.1);
    // Gaps between buds: small, deep, in the crown's own colour.
    lab = shadeOwn(lab, (1.0 - bud) * (1.0 - bud) * 0.35 * show);
  } else if (kind == 7) {
    // Crust: baked colour. The top bakes toastier and warmer (toward the deep glow shade),
    // the sides stay paler and more golden.
    float up = smoothstep(-0.1, 0.8, N.y);
    lab = shadeOwn(lab, up * 0.6 * amount);
    lab = mix(lab, linearToOklab(uLitColour), (1.0 - up) * 0.35 * amount);
    // Soft, blotchy variation, like watercolour pooling on the crust: warmer and paler patches.
    float blotch = fbm3(p * 0.18) - 0.5;
    lab = blotch > 0.0 ? shadeOwn(lab, blotch * 1.5 * show) : mix(lab, linearToOklab(uLitColour), -blotch * 1.1 * show);
    // Tiny pores: sparse dark specks in the crust's own shade.
    float pore = 1.0 - smoothstep(0.07, 0.13, skinCells(p * 2.2));
    lab = shadeOwn(lab, pore * 0.5 * show);
    // Flour: small white specks on the top, where the crust faces up.
    float speck = (1.0 - smoothstep(0.06, 0.1, skinCells(p * 1.4 + 3.0))) * smoothstep(0.3, 0.8, N.y);
    lab = mix(lab, linearToOklab(uHighlightColour), speck * 0.75 * amount);
  } else if (kind == 8) {
    // Crumb: soft, open air holes, sunk in the crumb's own deeper cream.
    float hole = 1.0 - smoothstep(0.1, 0.32, skinCells(p));
    lab = shadeOwn(lab, hole * 0.55 * show);
    // Faint lengthwise streaks where the dough stretched as the cut opened (along x of the piece).
    float streak = valueNoise3(vec3(p.x * 0.35, p.y * 3.0, p.z * 3.0)) - 0.5;
    lab = streak > 0.0 ? shadeOwn(lab, streak * 0.5 * show) : lab - vec3(streak * 0.04, 0.0, 0.0);
    // Warm, never white: the whole crumb leans a little golden.
    lab = shadeOwn(lab, 0.18 * amount);
    // A golden, toasted rim: the crumb's steeper sides, where it meets the crust, baked darker.
    float rim = 1.0 - smoothstep(0.55, 0.97, N.y);
    lab = shadeOwn(lab, rim * 1.3 * amount);
  } else if (kind == 5) {
    // Leaf: x runs from the stalk (0) to the tip (1), y across (0.5 is the centre vein).
    vec2 q = vSurfaceUv;
    float across = abs(q.y - 0.5) * 2.0;
    // Deeper toward the stalk, lighter toward the tip.
    lab = shadeOwn(lab, (1.0 - q.x) * 0.4 * amount);
    lab.x += q.x * 0.035 * amount;
    // The centre vein: a thin pale line, fading out toward the tip.
    float vein = (1.0 - smoothstep(0.04, 0.12, across)) * (1.0 - smoothstep(0.65, 1.0, q.x));
    lab = mix(lab, linearToOklab(uLitColour), vein * 0.6 * amount);
    // Faint side veins running out toward the edges.
    float side = smoothstep(0.82, 1.0, sin((q.x * 7.0 - across * 2.5) * 6.2832)) * (1.0 - across) * step(0.12, across);
    lab = shadeOwn(lab, side * 0.25 * amount);
    // Each leaf a touch different in hue.
    float drift = (valueNoise3(objectPos * 9.0) - 0.5) * 0.35 * amount;
    lab.yz = mat2(cos(drift), sin(drift), -sin(drift), cos(drift)) * lab.yz;
    // The underside is paler and cooler.
    if (!gl_FrontFacing) {
      lab.x += 0.07 * amount;
      lab.yz *= 0.75;
    }
  } else if (kind == 9) {
    // Label: the artwork's ink, shaded exactly like the ground under it (the same step in
    // lightness from the ground's base colour), with a touch of the ground's hue, so the
    // print turns warm in the light and plum in the shadow along with the label.
    float ink = texture2D(uLabelMap, vSurfaceUv).r;
    vec3 inkLab = linearToOklab(uLabelInk);
    inkLab.x += lab.x - linearToOklab(uBaseColour).x;
    inkLab.yz = mix(inkLab.yz, lab.yz, 0.12);
    lab = mix(lab, inkLab, ink * amount);
  } else if (kind == 10) {
    // Melon flesh (watermelon). Its map: x runs from the melon's centre (0) out to the outside
    // of the rind (1), y across the slice (-1 to 1).
    vec2 q = vSurfaceUv;
    // 1. Translucent: light scatters inside the flesh, so its shadows stay warm and glowing,
    //    never dull (the glow colour soaks into the darker tones).
    float inside = (1.0 - tone) * amount;
    lab = mix(lab, linearToOklab(uGlowColour), inside * 0.38);
    lab.x += inside * 0.035;
    // 2. Grain: fibres fanning out from the centre (lighter streaks), soft mottling, and small
    //    wet crystals catching the light, with tiny pits between them.
    float fibre = valueNoise3(vec3(q.y * 11.0, q.x * 1.6, 3.0)) - 0.5;
    lab.x += fibre * 0.035 * show;
    float mottle = fbm3(p * 0.12) - 0.5;
    lab = mottle > 0.0 ? shadeOwn(lab, mottle * 0.9 * show) : lab - vec3(mottle * 0.05, 0.0, 0.0);
    float crystal = 1.0 - smoothstep(0.05, 0.14, skinCells(p));
    lab.x += crystal * 0.07 * show;
    lab.yz *= 1.0 - crystal * 0.2 * show;
    float pit = 1.0 - smoothstep(0.04, 0.1, skinCells(p * 1.7 + 5.0));
    lab = shadeOwn(lab, pit * 0.35 * show);
    // 3. Toward the rind, a soft gradient, never a hard band: the flesh pales to a creamy
    //    band, which greens into the rind. Each colour is shaded like the flesh under it (the
    //    same step in lightness from the flesh's base), and the edges wander a little.
    float wander = (valueNoise3(vec3(q.y * 6.0, q.x * 4.0, 7.0)) - 0.5) * 0.035;
    float t = q.x + wander;
    float shade = lab.x - linearToOklab(uBaseColour).x;
    vec3 pale = linearToOklab(uMelonPale);
    pale.x += shade * 0.8;
    vec3 green = linearToOklab(uMelonGreen);
    green.x += shade * 0.8;
    lab = mix(lab, pale, smoothstep(0.84, 0.91, t));
    lab = mix(lab, green, smoothstep(0.91, 0.97, t));
  }
  colour = max(oklabToLinear(lab), 0.0);
}
`,
  update() {},
};
