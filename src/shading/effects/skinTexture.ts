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
export const SKIN_KINDS = ['none', 'pebbled', 'pores', 'streaks', 'seeds', 'leaf', 'florets', 'crust', 'crumb', 'label', 'melon', 'melonRind'] as const;
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

/** A melon's green rind shell (a piece named `rind` on a melon): stripes, mottling, speckles. */
export const MELON_RIND_SKIN: Skin = { kind: 'melonRind', size_mm: 2, amount: 1 };

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
    // of the rind (1), y across the slice (-1 to 1). 'arc' measures across the slice in the
    // same units as x, so marks keep their size instead of bunching up toward the point.
    vec2 q = vSurfaceUv;
    float arc = q.y * q.x * 0.42;
    vec3 deep = linearToOklab(uGlowColour);
    // 1. Translucent: light scatters inside the flesh, so it glows. The darker tones soak up the
    //    warm glow colour and stay rich and luminous (never dull); thin places glow most (edges
    //    seen side on, the narrow tip); and where the light comes through from behind, the
    //    flesh lights up from inside.
    float inside = (1.0 - tone) * amount;
    float edgeOn = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    float thin = max(edgeOn * 0.8, 1.0 - smoothstep(0.05, 0.3, q.x));
    float through = pow(max(dot(V, -L), 0.0), 2.0) * 0.6;
    // Only the red flesh glows: the rind is not translucent, and the warm glow on green turned
    // muddy brown along the rind's edge.
    float fleshOnly = 1.0 - smoothstep(0.8, 0.92, q.x);
    float glow = clamp(inside * 0.7 + thin * 0.35 + through, 0.0, 0.85) * amount * fleshOnly;
    lab = mix(lab, deep, glow);
    lab.x += (inside * 0.08 + thin * 0.06 + through * 0.08) * amount * fleshOnly;
    lab.yz *= 1.0 + inside * 0.15 * amount * fleshOnly;
    // 2. Seeds inside, seen vaguely through the flesh: a scatter of seeds sampled a little way
    //    under the surface, along the line of sight, so they shift gently as the melon turns,
    //    like looking into it. Only in the ring where a melon keeps its seeds. Fainter deeper in.
    vec3 ray = normalize(vObjectPos - vObjectCamera);
    float ring = smoothstep(0.32, 0.45, q.x) * (1.0 - smoothstep(0.7, 0.8, q.x));
    float buried = 0.0;
    for (int i = 1; i <= 3; i++) {
      float depth = float(i) * 0.05;
      vec3 sp = (objectPos + ray * depth) * vec3(1.9, 2.8, 1.9) + 11.0;
      float blob = 1.0 - smoothstep(0.06, 0.3, skinCells(sp));
      buried = max(buried, blob * (1.0 - float(i) * 0.22));
    }
    vec3 plum = vec3(lab.x - 0.2, 0.06, -0.005);
    lab = mix(lab, plum, buried * ring * 0.3 * amount);
    // 3. A chalky, pastel texture, like the user's reference: dry-brush scratches of paler
    //    colour running out along the fibres, broken by the paper's grain; deeper red flecks
    //    between them; soft mottling; tiny pale grains.
    float scratch = valueNoise3(vec3(arc * 70.0, q.x * 5.0, 1.0));
    scratch *= valueNoise3(vec3(arc * 18.0, q.x * 14.0, 5.0));
    float paper = valueNoise3(objectPos * 90.0);
    float dry = smoothstep(0.32, 0.55, scratch) * smoothstep(0.35, 0.65, paper);
    vec3 chalk = lab;
    chalk.x += 0.09;
    chalk.yz *= 0.72;
    // Quieter toward the rind, so the gradient there melts instead of speckling.
    lab = mix(lab, chalk, dry * 0.65 * show * (1.0 - smoothstep(0.7, 0.88, q.x) * 0.8));
    float fleck = smoothstep(0.62, 0.8, valueNoise3(vec3(arc * 40.0, q.x * 9.0, 9.0))) * smoothstep(0.5, 0.8, paper);
    lab = shadeOwn(lab, fleck * 0.55 * show);
    float mottle = fbm3(p * 0.12) - 0.5;
    lab = mottle > 0.0 ? shadeOwn(lab, mottle * 0.8 * show) : lab - vec3(mottle * 0.05, 0.0, 0.0);
    // Deep reds: big soft patches where the flesh is riper, darker and richer (toward wine, not
    // toward orange), strongest in the heart of the slice.
    float ripe = smoothstep(0.52, 0.75, fbm3(objectPos * 2.2 + 21.0)) * (1.0 - smoothstep(0.55, 0.8, q.x));
    vec3 wine = lab;
    wine.x -= 0.11;
    wine.yz *= 1.18;
    wine.yz = mat2(cos(-0.12), sin(-0.12), -sin(-0.12), cos(-0.12)) * wine.yz;
    lab = mix(lab, wine, ripe * 0.75 * amount);
    float grain = 1.0 - smoothstep(0.04, 0.1, skinCells(p * 1.3));
    lab.x += grain * 0.05 * show;
    // 4. Toward the rind, one soft gradient, like a watercolour wash: the red eases into pink,
    //    then a generous band of cream, then yellow-green, light green and finally the dark rind
    //    with its stripes. Wide, eased, overlapping steps, so the colours melt into each other;
    //    the boundary wanders only a little. Every colour is shaded like the flesh under it (the
    //    same step in lightness from the flesh's base), so the wash turns with the light.
    float wander = (valueNoise3(vec3(arc * 10.0, q.x * 5.0, 7.0)) - 0.5) * 0.02;
    float t = q.x + wander;
    float shade = lab.x - linearToOklab(uBaseColour).x;
    vec3 blush = lab;
    blush.x += 0.07;
    blush.yz *= 0.55;
    vec3 pale = linearToOklab(uMelonPale);
    pale.x += shade * 0.7;
    vec3 green = linearToOklab(uMelonGreen);
    green.x += shade * 0.8;
    vec3 lime = mix(pale, green, 0.4);
    // The dark rind: deeper green, with wavy broken stripes running across the slab.
    vec3 rindLab = green;
    rindLab.x -= 0.08;
    rindLab.yz *= 1.1;
    float warp = (fbm3(objectPos * 6.0) - 0.5) * 0.6;
    float stripe = smoothstep(0.1, 0.55, sin(arc * 34.0 / max(q.x, 0.5) + warp * 7.0));
    rindLab.x -= stripe * 0.07;
    float ease1 = smoothstep(0.66, 0.86, t);
    float ease2 = smoothstep(0.8, 0.9, t);
    float ease3 = smoothstep(0.88, 0.95, t);
    float ease4 = smoothstep(0.92, 0.98, t);
    float ease5 = smoothstep(0.965, 0.995, t);
    lab = mix(lab, blush, ease1 * ease1 * (3.0 - 2.0 * ease1));
    lab = mix(lab, pale, ease2);
    lab = mix(lab, lime, ease3);
    lab = mix(lab, green, ease4);
    lab = mix(lab, rindLab, ease5);
    // Highlights on the green take the green's own colour, not the flesh's red-tinged one.
    highlightOwn = ease3;
    // The chalky scratches carry on lightly over the pale and green, so the wash stays one
    // surface, but quieter there, so the colours melt rather than speckle.
    lab.x += dry * 0.02 * show * ease2;
  } else if (kind == 11) {
    // A melon's green rind shell. Its map: x runs across the slice (-1 to 1 = the melon's
    // angle), y across the slab's thickness (0 to 1). Watermelon stripes: wavy, broken dark
    // bands running along the melon (here, across the slab), mottling, and tiny pale specks.
    vec2 q = vSurfaceUv;
    float angle = q.x * 0.42;
    float warp = (fbm3(vec3(q.x * 3.0, q.y * 1.5, 1.0)) - 0.5) * 0.5;
    float band = sin(angle * 34.0 + warp * 9.0);
    float stripe = smoothstep(0.1, 0.55, band) * (0.75 + 0.5 * (valueNoise3(vec3(q * 6.0, 2.0)) - 0.5));
    lab = shadeOwn(lab, stripe * 0.9 * amount);
    lab.x -= stripe * 0.06 * amount;
    float mottle = fbm3(p * 0.2) - 0.5;
    lab.x += mottle * 0.06 * amount;
    lab.yz *= 1.0 + mottle * 0.25 * amount;
    float speck = 1.0 - smoothstep(0.05, 0.11, skinCells(p * 1.4));
    lab = mix(lab, linearToOklab(uLitColour), speck * 0.45 * show);
  }
  colour = max(oklabToLinear(lab), 0.0);
}
`,
  update() {},
};
