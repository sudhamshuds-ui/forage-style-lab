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
 *  - poultry (raw chicken): a pale, slightly translucent skin with goosebump follicles in loose
 *    tracts (each a tiny lit bump with a pore), fat and meat showing through in soft patches,
 *    a few soft creases near its edge, and where the skin is pulled back, rosy meat with fine
 *    fibres and pale tendons. The skin fades into the meat over a wide, wandering band, never a
 *    crisp line. From the piece's map (x: cm along, y: cm inside the skin's edge).
 *  - onion (red onion): fine, wandering pale veins from root to neck and a few darker ones,
 *    papery flakes where the dry outer skin catches the light, a tan root patch, the neck drying
 *    to papery tan toward its tip, a faint glow in the darker purples. From the bulb's map
 *    (x: height as a share of the onion, 0 at the root).
 *  - pepper (bell pepper): a glossy skin, the grooves between the lobes deeper and a little
 *    redder, soft long streaks along the lobes, a translucent glow in its shadows. From the body's
 *    map (x: height share, y: how deep in a groove).
 *  - avocado: a deep green skin, gently pebbled, with small pale specks and lighter patches; on a
 *    cut face (map y > 0) creamy yellow flesh turning bright green toward a thin dark skin, soft
 *    and buttery, a faint glow. From the body's map (x along it; y how far in from the skin).
 *  - knuckle (a bone's end, set automatically for a piece named `knuckle`): see KNUCKLE_SKIN.
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
export const SKIN_KINDS = ['none', 'pebbled', 'pores', 'streaks', 'seeds', 'leaf', 'florets', 'crust', 'crumb', 'label', 'melon', 'melonRind', 'marbled', 'poultry', 'knuckle', 'onion', 'pepper', 'avocado', 'grape', 'blueberry', 'spinach', 'romaine', 'cabbage'] as const;
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

/**
 * A bone's knuckle (a piece named `knuckle`, with a map: x is how far back from its end, cm): a
 * pearly cartilage cap at the end, ivory bone, a faint pink blush where it leaves the meat.
 */
export const KNUCKLE_SKIN: Skin = { kind: 'knuckle', size_mm: 1.5, amount: 1 };

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
uniform vec3 uMelonPale;     // a melon's pale band, between flesh and rind (also a steak's marbling)
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

// Leaf cells (romaine, after the user's watercolour reference): a flat pattern of cells on a leaf's
// own map. x: distance to the nearest cell's point, y: to the second nearest (y - x is small along
// the borders, the veins between cells), z: the nearest cell's own random number.
vec3 leafCells(vec2 p) {
  vec2 cell = floor(p);
  float first = 8.0;
  float second = 8.0;
  float which = 0.0;
  for (int x = -1; x <= 1; x++)
  for (int y = -1; y <= 1; y++) {
    vec2 c = cell + vec2(float(x), float(y));
    vec2 point = c + vec2(hash13(vec3(c, 3.1)), hash13(vec3(c, 8.7))) * 0.8 + 0.1;
    float d = length(p - point);
    if (d < first) {
      second = first;
      first = d;
      which = hash13(vec3(c, 5.3));
    } else if (d < second) {
      second = d;
    }
  }
  return vec3(first, second, which);
}

// Many small round pieces (grapes, blueberries): the shared tone steps repeat on each piece as a
// stripe pattern (the user, 2026-11-12), so the colour turns smoothly from lit to shadow instead.
// Cast shadows from neighbours stay (lightMask).
vec3 smoothTurn(vec3 lab, vec3 N, vec3 L, float lightMask) {
  vec3 litLab = linearToOklab(uLitColour);
  vec3 baseLab = linearToOklab(uBaseColour);
  vec3 shadowLab = linearToOklab(uShadowColour);
  float wrap = smoothstep(-0.45, 0.9, dot(N, L)) * mix(0.45, 1.0, lightMask);
  vec3 smoothLab = wrap > 0.5
    ? mix(baseLab, litLab, (wrap - 0.5) * 1.6)
    : mix(shadowLab, baseLab, 0.25 + wrap * 1.5);
  lab = mix(lab, smoothLab, 0.85);
  // A little deeper toward the shadow side, so each piece stays round.
  lab.x -= (1.0 - wrap) * 0.05;
  return lab;
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
    // The dimples break the berry's shine: no sheen in the pits, small glints on their lit rims.
    highlightBumpy = amount;
    highlightBreak = dimple * amount;
    highlightGlint = smoothstep(0.04, 0.2, emboss) * (1.0 - smoothstep(0.1, 0.2, d));
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
  } else if (kind == 12) {
    // Marbled (raw steak): the meat's grain and its marbling.
    // 1. The grain: faint fibres running one way across the cut, and soft darker patches.
    float grain = valueNoise3(vec3(objectPos.x * 3.0, objectPos.y * 3.0, objectPos.z * 22.0)) - 0.5;
    lab.x += grain * 0.04 * show;
    float blotch = fbm3(p * 0.09 + 3.0) - 0.5;
    lab = blotch > 0.0 ? shadeOwn(lab, blotch * 0.9 * show) : lab - vec3(blotch * 0.05, 0.0, 0.0);
    // 2. Marbling, like the card: a few long, streaky pale veins running mostly one way across
    //    the cut (stretched noise, gently warped), each thin and broken, in a few places only;
    //    plus a few small fat flecks. Painted in the fat's own colour (uMelonPale here), shaded
    //    like the meat under it. A dense lace of veins read as a busy pattern, never meat.
    vec3 w = vec3(objectPos.x * 1.1, objectPos.y * 2.0, objectPos.z * 3.6);
    w.z += (fbm3(objectPos * 1.4) - 0.5) * 2.2;
    float ridge = 1.0 - abs(2.0 * valueNoise3(w) - 1.0);
    float broken = smoothstep(0.35, 0.6, valueNoise3(objectPos * vec3(4.0, 4.0, 1.5) + 3.0));
    float where = smoothstep(0.38, 0.6, fbm3(objectPos * 1.1 + 11.0));
    // Soft, never a crisp line (the rule: crisp lines only in a few niche places).
    float vein = smoothstep(0.84, 0.98, ridge) * broken * where * 0.85;
    float fleck = (1.0 - smoothstep(0.06, 0.12, skinCells(p * 0.5 + 9.0))) * where;
    // Muscle seams (a ribeye, like the user's references): the cut face falls into a few big
    // muscle sections. Their borders are pale fat seams that wander (strongly warped), thin in
    // places and gone in others, and swell into rounded fat pockets where three sections meet.
    // Only on faces looking up (the cut face), not down the sides.
    vec3 warp = vec3(fbm3(objectPos * 0.9), 0.0, fbm3(objectPos * 0.9 + 4.0));
    vec2 cellXZ = (objectPos * 0.55 + warp * 0.9).xz;
    vec2 base = floor(cellXZ);
    float f1 = 8.0;
    float f2 = 8.0;
    float f3 = 8.0;
    for (int ix = -1; ix <= 1; ix++)
    for (int iz = -1; iz <= 1; iz++) {
      vec2 c = base + vec2(float(ix), float(iz));
      vec2 pt = c + vec2(hash13(vec3(c, 1.0)), hash13(vec3(c, 7.0))) * 0.8 + 0.1;
      float dd = length(cellXZ - pt);
      if (dd < f1) { f3 = f2; f2 = f1; f1 = dd; }
      else if (dd < f2) { f3 = f2; f2 = dd; }
      else if (dd < f3) { f3 = dd; }
    }
    float up = smoothstep(0.35, 0.75, N.y);
    // The seam: its width wanders along it, and its edge is ragged (a fine noise nudges it).
    float ragged = (valueNoise3(objectPos * 9.0) - 0.5) * 0.05;
    float seamWidth = 0.015 + 0.09 * smoothstep(0.3, 0.85, valueNoise3(objectPos * 1.4 + 6.0));
    // A soft edge (the user, 2026-11-10: the fat's edge was too hard): the seam fades into the
    // meat over a wide band, like wet paint, instead of cutting a crisp line.
    float seam = 1.0 - smoothstep(seamWidth * 0.4, seamWidth + 0.11, f2 - f1 + ragged);
    seam *= smoothstep(0.25, 0.5, valueNoise3(objectPos * 2.0 + 2.0));
    // Pockets: where three sections meet (all three distances close), a rounded blob of fat.
    float junction = (f3 - f1) + (f2 - f1);
    float pocket = 1.0 - smoothstep(0.06, 0.3, junction + ragged * 2.0);
    pocket *= step(0.45, hash13(vec3(floor(cellXZ * 2.0), 3.0)));
    vein = max(vein, max(seam, pocket) * up);
    // The fat rim, from the meat's map (x: cm in from the edge, y: height as a share of the top):
    // a soft gradient, never a hard band. Full at the edge, fading over about a centimetre into
    // the meat with a wandering, cloudy inner line, and down the side wall only near the top.
    vec2 rq = vSurfaceUv;
    float wanderRim = (fbm3(objectPos * 2.2 + 5.0) - 0.5) * 0.9;
    float rim = 1.0 - smoothstep(0.15, 1.5, rq.x + wanderRim);
    rim *= smoothstep(0.35, 0.8, rq.y);
    vein = max(vein, rim);
    float fat = clamp(max(vein, fleck), 0.0, 1.0);
    vec3 fatLab = linearToOklab(uMelonPale);
    fatLab.x += (lab.x - linearToOklab(uBaseColour).x) * 0.6;
    fatLab.yz = mix(fatLab.yz, lab.yz, 0.18);
    // Where fat meets meat, a little pink bleeds into the fat (never a cut-out white shape).
    // Where fat meets meat, more of the meat's pink bleeds into the fat's soft edge.
    fatLab = mix(fatLab, lab, (1.0 - fat) * 0.7);
    lab = mix(lab, fatLab, fat * 0.85 * amount);
    highlightOwn = max(highlightOwn, fat);
    // 3. A chalky, dry-brush texture over the whole cut, like the watermelon's: pale scratches
    //    running along the grain, broken by a paper grain; deeper red flecks between them; and
    //    on the fat, a creamy speckle so it is never a flat shape.
    float paperGrain = valueNoise3(objectPos * 90.0);
    float scratch = valueNoise3(vec3(objectPos.x * 2.5, objectPos.y * 6.0, objectPos.z * 40.0));
    scratch *= valueNoise3(vec3(objectPos.x * 1.2, objectPos.y * 4.0, objectPos.z * 12.0) + 5.0);
    float dry = smoothstep(0.3, 0.55, scratch) * smoothstep(0.35, 0.65, paperGrain);
    vec3 chalk = lab;
    chalk.x += 0.08;
    chalk.yz *= 0.75;
    lab = mix(lab, chalk, dry * 0.55 * show * (1.0 - fat * 0.6));
    float redFleck = smoothstep(0.64, 0.82, valueNoise3(vec3(objectPos.x * 6.0, objectPos.y * 6.0, objectPos.z * 30.0) + 9.0)) * smoothstep(0.5, 0.8, paperGrain);
    lab = shadeOwn(lab, redFleck * 0.5 * show * (1.0 - fat));
    float cream = (valueNoise3(objectPos * 40.0 + 3.0) - 0.5) * fat;
    lab.x += cream * 0.06 * amount;
  } else if (kind == 13) {
    // Poultry (a raw chicken drumstick). Its map: x is cm along the drumstick from the bulb's end,
    // y cm inside the skin's edge (positive under the skin, negative on the bare shank).
    vec2 q = vSurfaceUv;
    vec3 cm = objectPos * 3.8169;
    float shadeStep = lab.x - linearToOklab(uBaseColour).x;
    // Where the skin is: a wide, soft band that wanders (never a crisp edge, the rule).
    float wander = (fbm3(cm * 0.9 + 4.0) - 0.5) * 1.2;
    float skin = smoothstep(-0.7, 0.9, q.y + wander);
    // 1. Translucent: raw skin lets light in, so its darker tones soak up the warm glow and
    //    stay luminous, and thin places seen side on glow a little (the flesh guideline, gently).
    float inside = (1.0 - tone) * amount;
    float edgeOn = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    float glow = clamp(inside * 0.5 + edgeOn * 0.3, 0.0, 0.6);
    lab = mix(lab, linearToOklab(uGlowColour), glow * 0.45 * amount);
    lab.x += inside * 0.03 * amount;
    // 2. Under the skin: soft patches of yellow fat and of the pink meat showing through.
    vec3 fatLab = linearToOklab(uMelonGreen);
    fatLab.x += shadeStep * 0.8;
    fatLab.yz = mix(fatLab.yz, lab.yz, 0.35);
    float fatPatch = smoothstep(0.42, 0.72, fbm3(cm * 0.55 + 7.0));
    lab = mix(lab, fatLab, fatPatch * 0.55 * skin * amount);
    vec3 meatLab = linearToOklab(uMelonPale);
    meatLab.x += shadeStep * 0.9;
    float pinkPatch = smoothstep(0.48, 0.78, fbm3(cm * 0.45 + 13.0));
    lab = mix(lab, meatLab, pinkPatch * 0.4 * skin * amount);
    // Faint rosy blotches where small vessels show under the skin, soft and few.
    float vessel = smoothstep(0.6, 0.85, fbm3(cm * 1.3 + 31.0));
    lab = shadeOwn(lab, vessel * 0.22 * skin * show);
    // 3. Follicles: goosebumps in loose tracts (never an even pattern all over). Each a tiny dome,
    //    lit on its side toward the light and shaded on the other, with a small pore in its middle.
    float tract = smoothstep(0.3, 0.55, fbm3(cm * 0.7 + 21.0));
    float d = skinCells(p);
    float bump = 1.0 - smoothstep(0.0, 0.4, d);
    float bumpToward = 1.0 - smoothstep(0.0, 0.4, skinCells(p + L * 0.16));
    // Faded where the surface turns away (near the outline the cells bunch up and read as a dotted
    // line round the edge), and each follicle a little different in strength.
    float facing = smoothstep(0.12, 0.45, max(dot(N, V), 0.0));
    float follicle = tract * skin * facing * mix(0.4, 1.0, valueNoise3(p * 0.8 + 5.0));
    float emboss = (bumpToward - bump) * show * follicle;
    lab = emboss > 0.0 ? lab + vec3(emboss * 0.11, 0.0, 0.0) : shadeOwn(lab, -emboss * 0.9);
    float pore = 1.0 - smoothstep(0.025, 0.085, d);
    lab = shadeOwn(lab, pore * 0.35 * show * follicle);
    // The bumps break the moist sheen into small glints (a bumpy skin breaks its shine).
    highlightBumpy = amount * skin;
    highlightBreak = bump * amount * 0.7 * follicle;
    highlightGlint = smoothstep(0.03, 0.15, emboss) * (1.0 - smoothstep(0.1, 0.22, d));
    // 4. A few soft creases where the skin bunches toward its edge, running round the drumstick.
    float bunch = smoothstep(-0.2, 0.6, q.y + wander) * (1.0 - smoothstep(1.2, 3.0, q.y + wander));
    float crease = smoothstep(0.55, 0.85, valueNoise3(vec3(q.x * 2.2, cm.y * 0.6, cm.z * 0.6) + 3.0));
    lab = shadeOwn(lab, crease * bunch * 0.3 * show);
    // The skin's thin edge: stretched thin, paler and a touch more see-through.
    lab.x += bunch * (1.0 - crease) * 0.02 * amount;
    // 5. The bare shank: rosy raw meat with fine fibres along it and pale, pearly tendons, shaded
    //    like the skin beside it, so the two are one surface in one light.
    vec3 bare = meatLab;
    bare.yz = mix(bare.yz, lab.yz, 0.12);
    float fibre = valueNoise3(vec3(q.x * 1.2, cm.y * 9.0, cm.z * 9.0)) - 0.5;
    bare.x += fibre * 0.05 * show;
    float tendon = smoothstep(0.58, 0.82, valueNoise3(vec3(q.x * 0.5, cm.y * 3.2, cm.z * 3.2) + 9.0));
    tendon *= smoothstep(10.0, 11.4, q.x);
    vec3 pearl = linearToOklab(uHighlightColour);
    pearl.x += shadeStep * 0.85;
    pearl.yz = mix(pearl.yz, bare.yz, 0.3);
    bare = mix(bare, pearl, tendon * 0.55);
    // Where the meat runs out round the bone it thins to pale tendon, so it meets the ivory bone
    // in a similar colour (never a crisp line where meat and bone meet).
    bare = mix(bare, pearl, smoothstep(11.6, 12.8, q.x) * 0.6);
    lab = mix(bare, lab, skin);
    highlightOwn = max(highlightOwn, (1.0 - skin) * 0.6);
    // 6. The same light, chalky dry-brush texture as the steak and the watermelon (one hand
    //    painted every card): pale scratches along the drumstick, broken by a paper grain.
    float paperGrain = valueNoise3(objectPos * 90.0);
    float scratch = valueNoise3(vec3(q.x * 3.0, cm.y * 11.0, cm.z * 11.0));
    scratch *= valueNoise3(vec3(q.x * 1.3, cm.y * 3.5, cm.z * 3.5) + 5.0);
    float dry = smoothstep(0.3, 0.55, scratch) * smoothstep(0.35, 0.65, paperGrain);
    vec3 chalk = lab;
    chalk.x += 0.06;
    chalk.yz *= 0.8;
    lab = mix(lab, chalk, dry * 0.4 * show);
  } else if (kind == 14) {
    // Knuckle (a bone's end). Its map: x is cm back from the end.
    vec2 q = vSurfaceUv;
    vec3 cm = objectPos * 3.8169;
    float shadeStep = lab.x - linearToOklab(uBaseColour).x;
    float wander = (fbm3(cm * 1.6 + 2.0) - 0.5) * 0.5;
    // Ivory, softly mottled.
    float mottle = fbm3(cm * 1.4) - 0.5;
    lab = mottle > 0.0 ? shadeOwn(lab, mottle * 0.5 * amount) : lab - vec3(mottle * 0.04, 0.0, 0.0);
    // The cartilage cap at the end: pearly, paler and a little cooler, faintly see-through.
    float cap = 1.0 - smoothstep(0.45, 1.05, q.x + wander);
    vec3 pearl = linearToOklab(uHighlightColour);
    pearl.x += shadeStep * 0.8;
    pearl.y += 0.004;
    pearl.z -= 0.012;
    lab = mix(lab, pearl, cap * 0.7 * amount);
    // A faint pink blush where the bone leaves the meat (never a crisp ring).
    vec3 blush = linearToOklab(uMelonPale);
    blush.x += shadeStep * 0.8;
    lab = mix(lab, blush, smoothstep(1.4, 2.6, q.x + wander) * 0.45 * amount);
    // Fine pores in the bone, in its own shade.
    float pore = 1.0 - smoothstep(0.05, 0.12, skinCells(p));
    lab = shadeOwn(lab, pore * 0.25 * show * (1.0 - cap));
  } else if (kind == 15) {
    // Onion (red onion). Its map: x is the height as a share of the onion (0 root, 1 neck top),
    // and vOwnPos is each point in the upright onion (cm, axis along y), so the lines run from
    // root to neck even though the onion lies tipped on its side.
    vec2 q = vSurfaceUv;
    vec3 cm = vOwnPos;
    vec3 litLab = lab;
    float shadeStep = lab.x - linearToOklab(uBaseColour).x;
    vec3 papery = linearToOklab(uMelonPale);
    papery.x += shadeStep * 0.75;
    // 1. Translucent, like thin layers of onion skin over juicy flesh (the user, 2026-11-12: "more
    //    translucency and sub surface"; the translucent flesh guideline): light scatters inside,
    //    so the darker violets soak up the warm magenta glow and stay luminous, never dull; edges
    //    seen side on glow most; where the light comes through from behind, the onion lights up
    //    from inside; and the slim neck, where the skin is thinnest, glows a little more.
    float inside = (1.0 - tone) * amount;
    float edgeOn = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    float through = pow(max(dot(V, -L), 0.0), 2.0) * (1.0 - tone);
    float thinNeck = smoothstep(0.7, 0.85, q.x);
    float glowAmt = clamp(inside * 0.5 + edgeOn * 0.45 + through * 0.5 + thinNeck * 0.15, 0.0, 0.75) * amount;
    lab = mix(lab, linearToOklab(uGlowColour), glowAmt * 0.65);
    lab.x += (inside * 0.05 + edgeOn * 0.04 + through * 0.05) * amount;
    lab.yz *= 1.0 + inside * 0.12 * amount;
    // 2. Like the reference: lines running from root to neck round the globe. Broad, soft bands
    //    of lighter lilac and deeper violet underneath, and over them a few fine, darker violet
    //    lines of uneven spacing, strength and length, wandering a little, fading toward the
    //    poles (where they gather), so they never bunch into a star. Soft-edged, painted lines.
    float angle = atan(cm.z, cm.x);
    float wander = (fbm3(cm * 0.5 + 2.0) - 0.5) * 0.9;
    float lineAway = smoothstep(0.03, 0.2, q.x) * (1.0 - smoothstep(0.74, 0.88, q.x));
    float broad = sin(angle * 9.0 + wander * 2.0) * 0.6 + sin(angle * 5.0 + 2.3 + wander * 1.5) * 0.4;
    vec3 lilac = lab;
    lilac.x += 0.06;
    lilac.yz *= 0.82;
    lab = mix(lab, lilac, smoothstep(0.1, 0.8, broad) * lineAway * 0.55 * show);
    lab = shadeOwn(lab, smoothstep(0.15, 0.85, -broad) * lineAway * 0.3 * show);
    float lines = 0.0;
    for (int i = 0; i < 2; i++) {
      float n = i == 0 ? 13.0 : 7.0;
      float off = i == 0 ? 0.4 : 2.9;
      // Smooth arcs, like the reference: only a slow, gentle drift, never a wiggle.
      float drift = (fbm3(vec3(cm.x * 0.12, q.x * 0.6, cm.z * 0.12) + float(i) * 4.0) - 0.5) * 1.2;
      float l = 1.0 - smoothstep(0.0, i == 0 ? 0.12 : 0.15, abs(sin(angle * n * 0.5 + off + drift)));
      // Each line its own strength, and broken here and there along its length.
      l *= smoothstep(0.3, 0.6, valueNoise3(vec3(angle * n * 0.5 + off, q.x * 2.5, float(i) * 7.0)));
      lines = max(lines, l);
    }
    lab = shadeOwn(lab, lines * lineAway * 0.65 * show);
    lab.yz *= 1.0 + lines * lineAway * 0.15 * show;
    // A few finer pale streaks between them, like the inner skin showing through.
    float streak = 1.0 - smoothstep(0.0, 0.2, abs(sin(angle * 21.0 + 1.3 + wander * 2.5)));
    streak *= smoothstep(0.45, 0.75, valueNoise3(cm * 0.6 + 7.0));
    vec3 streakLab = lab;
    streakLab.x += 0.05;
    streakLab.yz *= 0.75;
    lab = mix(lab, streakLab, streak * lineAway * 0.45 * show);
    highlightBreak = max(highlightBreak, lines * 0.6 * amount);
    // 3. Papery flakes: a few broad patches where the dry outer skin catches the light, pale
    //    tan-pink with a soft, wandering edge (more near the root and the neck, where onions shed).
    float flakeWhere = 0.6 + 0.4 * (1.0 - smoothstep(0.1, 0.35, q.x)) + 0.4 * smoothstep(0.6, 0.8, q.x);
    float flake = smoothstep(0.6, 0.82, fbm3(cm * 0.45 + 13.0) * flakeWhere + 0.12);
    vec3 flakeLab = mix(lab, papery, 0.5);
    lab = mix(lab, flakeLab, flake * 0.75 * amount);
    highlightOwn = max(highlightOwn, flake * 0.7);
    // 4. The root plate: tan and papery, fading softly into the violet.
    float root = 1.0 - smoothstep(0.02, 0.09, q.x + (valueNoise3(cm * 2.0) - 0.5) * 0.03);
    lab = mix(lab, shadeOwn(papery, 0.25), root * 0.85 * amount);
    // 5. The neck dries toward its tip: violet, then a warm rosy tan (the reference's orange
    //    touches at the top), then the papery tip's own colour, so they meet in one colour.
    float dry = smoothstep(0.8, 0.96, q.x + (valueNoise3(cm * 1.5 + 4.0) - 0.5) * 0.05);
    vec3 warmTan = mix(papery, linearToOklab(uGlowColour), 0.25);
    lab = mix(lab, warmTan, dry * amount);
    // 6. The shared chalky dry-brush texture, along the lines (one hand paints every card).
    float paperGrain = valueNoise3(objectPos * 90.0);
    float scratch = valueNoise3(vec3(angle * 18.0, q.x * 3.0, 1.0)) * valueNoise3(vec3(angle * 6.0, q.x * 9.0, 5.0));
    float chalkAmt = smoothstep(0.3, 0.55, scratch) * smoothstep(0.35, 0.65, paperGrain);
    vec3 chalk = lab;
    chalk.x += 0.05;
    chalk.yz *= 0.85;
    lab = mix(lab, chalk, chalkAmt * 0.35 * show);
    // 7. A cut face (a cut half; its map's y is how far in from the rim, 0 rim to 1 centre): rings
    //    of pale, juicy flesh, each layer edged in violet, the outer layers more violet, a small
    //    pale core. The rings wander a little and vary in width, and every edge is soft (like the
    //    reference's watercolour rings). It meets the skin at the rim in the skin's own violet.
    float cut = smoothstep(0.0, 0.004, q.y);
    if (cut > 0.0) {
      float r = 1.0 - q.y;
      // Uneven layers: wider and narrower rings, gently wobbling, never a target.
      float ringWobble = (fbm3(cm * 0.7 + 21.0) - 0.5) * 0.7;
      float layers = pow(r, 0.85) * 7.0 + 0.35 * sin(r * 19.0 + 1.0) + ringWobble;
      float d = min(fract(layers), 1.0 - fract(layers));
      // Each layer's violet edge: a bold band (a third of the layer or so), soft at its sides.
      float edgeWidth = 0.2 + 0.14 * valueNoise3(cm * 1.4 + 3.0);
      float edge = 1.0 - smoothstep(edgeWidth * 0.45, edgeWidth, d);
      vec3 flesh = mix(linearToOklab(uHighlightColour), linearToOklab(uLitColour), 0.12);
      flesh.yz *= 0.45;
      flesh.x += shadeStep * 0.7;
      vec3 violet = litLab;
      violet.yz *= 1.05;
      // The outer layers hold more of the violet; the core is pale.
      flesh = mix(flesh, violet, smoothstep(0.6, 1.0, r) * 0.3);
      vec3 ringLab = mix(flesh, violet, edge * mix(0.7, 0.95, smoothstep(0.3, 0.9, r)));
      // The outermost layer is the skin itself, a band of violet round the rim.
      ringLab = mix(ringLab, violet, smoothstep(0.9, 0.98, r));
      // Juicy: a faint glow in its shadows, and a little of the shared chalky texture.
      ringLab = mix(ringLab, linearToOklab(uGlowColour), (1.0 - tone) * 0.15);
      
      lab = mix(lab, ringLab, cut);
      highlightOwn = max(highlightOwn, cut);
    }
  } else if (kind == 16) {
    // Pepper (bell pepper). Its map: x the height as a share of the pepper, y how deep in a groove
    // (0 on a lobe's middle, 1 in a groove).
    vec2 q = vSurfaceUv;
    vec3 cm = objectPos * 3.8169;
    // 1. A thick, juicy wall: a little light scatters in, so its shadows stay warm and glowing.
    float inside = (1.0 - tone) * amount;
    float edgeOn = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    lab = mix(lab, linearToOklab(uGlowColour), clamp(inside * 0.35 + edgeOn * 0.2, 0.0, 0.5) * amount);
    // 2. The grooves between the lobes: deeper and a little redder, a soft gradient (never a line).
    float groove = smoothstep(0.25, 0.9, q.y);
    lab = shadeOwn(lab, groove * 0.4 * amount);
    lab.yz = mix(lab.yz, mat2(cos(-0.08), sin(-0.08), -sin(-0.08), cos(-0.08)) * lab.yz, groove * amount);
    // The lobes' middles a touch fuller and brighter.
    lab.x += (1.0 - groove) * 0.02 * amount;
    // 3. Long, soft streaks running down the lobes (the skin's own grain), and a few broad patches
    //    of riper red-orange, so it is never one flat orange.
    float streak = valueNoise3(vec3(cm.x * 2.2, q.x * 2.0, cm.z * 2.2)) - 0.5;
    lab.x += streak * 0.04 * show;
    float ripe = smoothstep(0.55, 0.8, fbm3(cm * 0.35 + 5.0));
    lab = mix(lab, shadeOwn(lab, 0.3), ripe * 0.4 * amount);
    // 4. Gloss: a pepper's reflections run down its lobes in long, soft streaks (narrow across
    //    the lobe, where it curves fast; long down it, where it is nearly straight). Painted here
    //    on the lobes' lit middles, soft-edged and broken by the skin's grain, instead of the
    //    shared sheen's round pale patches (one per lobe at most, never a flat blob).
    vec3 halfway = normalize(L + V);
    float glossy = smoothstep(0.72, 0.93, dot(N, halfway)) * (1.0 - smoothstep(0.15, 0.55, q.y));
    glossy *= smoothstep(0.35, 0.6, valueNoise3(vec3(cm.x * 1.5, q.x * 4.0, cm.z * 1.5) + 3.0));
    vec3 shine = mix(lab, linearToOklab(uHighlightColour), 0.75);
    lab = mix(lab, shine, glossy * amount);
    highlightOwn = max(highlightOwn, glossy);
    // 5. Toward the stem, the shoulders darken softly into the well.
    lab = shadeOwn(lab, smoothstep(0.82, 0.97, q.x) * 0.35 * amount);
    // 6. The shared chalky dry-brush texture, light (one hand paints every card).
    float paperGrain = valueNoise3(objectPos * 90.0);
    float scratch = valueNoise3(vec3(cm.x * 6.0, q.x * 14.0, cm.z * 6.0)) * valueNoise3(vec3(cm.x * 2.0, q.x * 5.0, cm.z * 2.0) + 5.0);
    float chalkAmt = smoothstep(0.3, 0.55, scratch) * smoothstep(0.35, 0.65, paperGrain);
    vec3 chalk = lab;
    chalk.x += 0.05;
    chalk.yz *= 0.85;
    lab = mix(lab, chalk, chalkAmt * 0.3 * show);
  } else if (kind == 17) {
    // Avocado. Its map: x along the avocado (0 bottom, 1 top); y, on a cut face only, how far in
    // from the skin (0 at the skin, 1 on the middle line).
    vec2 q = vSurfaceUv;
    vec3 cm = objectPos * 3.8169;
    float shadeStep = lab.x - linearToOklab(uBaseColour).x;
    vec3 skinLab = lab;
    // 1. The skin: a soft pebbling (each bump lit toward the light), sparse small pale specks,
    //    and a few broad lighter, yellower patches, so it is never one flat green.
    float bump = 1.0 - smoothstep(0.0, 0.9, skinCells(p));
    float bumpToward = 1.0 - smoothstep(0.0, 0.9, skinCells(p + L * 0.2));
    float emboss = (bumpToward - bump) * show;
    skinLab = emboss > 0.0 ? skinLab + vec3(emboss * 0.05, 0.0, 0.0) : shadeOwn(skinLab, -emboss * 0.4);
    float speck = 1.0 - smoothstep(0.04, 0.1, skinCells(p * 0.6 + 7.0));
    skinLab = mix(skinLab, linearToOklab(uLitColour), speck * 0.45 * show);
    float patchy = smoothstep(0.55, 0.8, fbm3(cm * 0.5 + 3.0));
    skinLab.x += patchy * 0.04 * amount;
    skinLab.yz = mix(skinLab.yz, skinLab.yz * vec2(0.95, 1.12), patchy * amount);
    // Broad, darker ripening blotches leaning toward the shadow's indigo, so the skin has depth
    // (round 1 read as one flat green, the user 2026-11-12).
    float ripe = smoothstep(0.45, 0.75, fbm3(cm * 0.35 + 41.0));
    skinLab = mix(skinLab, linearToOklab(uShadowColour), ripe * 0.16 * amount);
    // A faint warm glow in its shadows.
    skinLab = mix(skinLab, linearToOklab(uGlowColour), (1.0 - tone) * 0.15 * amount);
    lab = skinLab;
    // 2. The cut face, after the user's reference painting (round 1 was flat, the user 2026-11-12:
    //    "more colour depth"): a warm yellow heart, a lighter lime band, a bright green ring, a
    //    deeper green just under the skin and a thin dark skin line, each band wandering softly like
    //    wet paint; a deeper ochre in the hollow round the pit; broad blooms of value; the shadow
    //    side cooler and deeper. The face map fades over the rounded cut edge, never a hard line.
    float face = smoothstep(0.0, 0.04, q.y);
    if (face > 0.0) {
      float r = 1.0 - q.y;
      float wander = (fbm3(cm * 0.55 + 11.0) - 0.5) * 0.2;
      float k = r + wander;
      vec3 cream = linearToOklab(uMelonPale);
      vec3 green = linearToOklab(uMelonGreen);
      vec3 lime = mix(cream, green, 0.45);
      lime.x += 0.025;
      vec3 skinTone = linearToOklab(uBaseColour);
      vec3 deep = mix(green, skinTone, 0.45);
      vec3 flesh = mix(cream, lime, smoothstep(0.08, 0.42, k));
      flesh = mix(flesh, green, smoothstep(0.42, 0.8, k));
      flesh = mix(flesh, deep, smoothstep(0.86, 0.95, r + wander * 0.2));
      flesh = mix(flesh, skinTone, smoothstep(0.95, 0.995, r));
      // The hollow round the pit (vOwnPos is measured from the pit, cm): a soft ring of deeper,
      // warmer ochre, strongest right at the pit and gone a centimetre out.
      float fromPit = length(vec2(vOwnPos.x / 1.1, vOwnPos.y)) - 1.8;
      float hollow = 1.0 - smoothstep(-0.1, 1.1, fromPit + wander);
      vec3 ochre = cream;
      ochre.x -= 0.1;
      ochre.y += 0.012;
      ochre.z += 0.02;
      flesh = mix(flesh, ochre, hollow * 0.55 * amount);
      // Broad blooms of lighter and deeper paint across the face.
      float bloom = fbm3(cm * 0.3 + 23.0) - 0.5;
      flesh.x += bloom * 0.07 * show;
      // Light and shade: the face takes the light's steps fully, its shadow side turning cooler
      // toward the family's indigo, and a faint warm glow lifting the deepest tones.
      // (Lit steps lift it less, so the light never bleaches the yellow toward white.)
      flesh.x += shadeStep * (shadeStep > 0.0 ? 0.35 : 0.95);
      flesh = mix(flesh, linearToOklab(uShadowColour), (1.0 - tone) * 0.22);
      flesh = mix(flesh, linearToOklab(uGlowColour), (1.0 - tone) * 0.08);
      // Faint fibres along the avocado, and the shared chalky dry-brush texture, light.
      float fibre = valueNoise3(vec3(q.x * 30.0, q.y * 6.0, 1.0)) - 0.5;
      flesh.x += fibre * 0.025 * show;
      float paperGrain = valueNoise3(objectPos * 90.0);
      float scratch = valueNoise3(vec3(q.x * 40.0, q.y * 12.0, 3.0));
      flesh.x += smoothstep(0.55, 0.8, scratch) * smoothstep(0.4, 0.7, paperGrain) * 0.03 * show;
      lab = mix(lab, flesh, face);
      highlightOwn = max(highlightOwn, face);
    }
  } else if (kind == 18) {
    // Red grapes, after the user's reference. Map: x each berry's own mix (one value per berry), y
    // how far along the berry (0 at its stalk, 1 at the far end).
    vec2 q = vSurfaceUv;
    vec3 cm = objectPos * 3.8169;
    float own = q.x;
    // 0. Soft light: one smooth turn from lit to shadow (on 25 small berries the tone steps read
    //    as stripes, the user, 2026-11-12: "these bands look odd, all of them have it like a
    //    pattern").
    lab = smoothTurn(lab, N, L, lightMask);
    // 1. Each berry its own mix, from a rosy coral (thinner, riper in the light) to a deep
    //    wine-violet; most in between. Turned in OKLab, so it never passes through brown.
    vec3 coral = lab;
    coral.x += 0.07;
    coral.yz = mat2(cos(0.16), sin(0.16), -sin(0.16), cos(0.16)) * coral.yz * 0.95;
    vec3 wine = lab;
    wine.x -= 0.13;
    wine.yz = mat2(cos(-0.42), sin(-0.42), -sin(-0.42), cos(-0.42)) * wine.yz * 0.92;
    float ownMix = smoothstep(0.0, 1.0, own);
    lab = mix(coral, wine, ownMix);
    // 2. Mottling inside each berry, like the reference's washes: broad soft patches of deeper
    //    wine over a lighter, rosier ground, a little longer along the berry. Soft-edged, never
    //    spots.
    float mottle = fbm3(cm * vec3(1.3, 1.3, 1.3) + own * 17.0);
    float patchDeep = smoothstep(0.45, 0.75, mottle);
    float patchLight = 1.0 - smoothstep(0.25, 0.48, mottle);
    lab = mix(lab, wine - vec3(0.03, 0.0, 0.0), patchDeep * 0.55 * amount);
    lab = mix(lab, coral + vec3(0.02, 0.0, 0.0), patchLight * 0.4 * amount * (1.0 - ownMix * 0.5));
    // 3. The glow of thin skin: the shadow side soaks up the warm glow, thin edges seen side on
    //    and light coming through glow coral, so a grape is never a dull ball.
    // From a smooth light falloff, not the tone bands: stepping with the bands, the glow drew a
    // hard line across each berry where lit coral met shadow wine.
    float inside = (1.0 - smoothstep(-0.25, 0.65, dot(N, L))) * amount;
    float edgeOn = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    float through = pow(max(dot(V, -L), 0.0), 2.0) * 0.5;
    vec3 warm = linearToOklab(uGlowColour);
    // Mostly at the thin outline: glowing the whole shadow side lifted each berry's underside
    // back to coral, and every berry read coral, dark, coral, like stripes (the user, 2026-11-12).
    // More light inside (the user, 2026-11-12: "a bit more subsurface"): a soft warm band right
    // where each berry turns from light to shadow, where a grape glows most, plus brighter thin
    // edges and light coming through. One soft band, never a second stripe.
    float NdotL = dot(N, L);
    float terminator = exp(-pow((NdotL - 0.08) / 0.3, 2.0)) * mix(0.5, 1.0, lightMask);
    float glow = clamp(inside * 0.06 + edgeOn * 0.45 + through * 1.3 + terminator * 0.45, 0.0, 0.7) * amount;
    lab = mix(lab, mix(lab, warm, 0.55), glow);
    lab.x += (edgeOn * 0.05 + through * 0.07 + terminator * 0.04) * amount;
    lab.yz *= 1.0 + terminator * 0.12 * amount;
    // Purple in the shadows (the user): the shadow side leans toward a rich violet, deepest
    // furthest from the light, never grey.
    vec3 violet = vec3(lab.x - 0.03, 0.065, -0.11);
    float shaded = max(1.0 - smoothstep(-0.4, 0.4, NdotL), (1.0 - lightMask) * 0.7);
    lab = mix(lab, violet, shaded * 0.6 * amount);
    // 4. The waxy bloom: a faint, cool, powdery haze in loose patches, more on the darker berries
    //    and rubbed away in places, strongest where the berry turns away from the light.
    float bloomPatch = smoothstep(0.35, 0.7, fbm3(cm * 2.4 + 5.0 + own * 9.0));
    float bloom = bloomPatch * (0.35 + 0.65 * ownMix) * (0.5 + 0.5 * inside) * amount;
    vec3 haze = lab;
    haze.x += 0.07;
    haze.yz = mat2(cos(-0.5), sin(-0.5), -sin(-0.5), cos(-0.5)) * haze.yz * 0.55;
    float dust = smoothstep(0.4, 0.75, valueNoise3(objectPos * 120.0));
    lab = mix(lab, haze, bloom * (0.22 + 0.12 * dust));
    // 5. Where the stalk held it: a small paler, golden scar fading softly into the berry.
    float scar = 1.0 - smoothstep(0.02, 0.14, q.y);
    vec3 gold = lab;
    gold.x += 0.06;
    gold.yz = mat2(cos(0.9), sin(0.9), -sin(0.9), cos(0.9)) * gold.yz * 0.6;
    lab = mix(lab, gold, scar * 0.55 * amount);
    // 6. The shine: the shared sheen, told this is a waxy, broken surface (like the
    //    strawberry's): it thins out from its core, skips where the bloom is thick, and breaks
    //    into a few small glints, each berry its own. A plain sheen put the same pale round dot
    //    on every berry (polka dots).
    highlightBumpy = 1.0;
    highlightBreak = bloom * 2.2 + (1.0 - smoothstep(0.15, 0.8, fract(own * 3.71))) * 0.5;
    highlightGlint = smoothstep(0.42, 0.62, valueNoise3(cm * 3.2 + own * 5.0)) * smoothstep(0.2, 0.8, fract(own * 3.71));
  } else if (kind == 19) {
    // Blueberries, after the user's reference. Map: x each berry's own mix (one value per berry),
    // y how far from its crown (0 at the crown's centre, 1 at the far pole).
    vec2 q = vSurfaceUv;
    vec3 cm = objectPos * 3.8169;
    float own = q.x;
    // 0. One smooth turn from light to shadow (many small round pieces, like the grapes).
    lab = smoothTurn(lab, N, L, lightMask);
    float NdotL = dot(N, L);
    // 1. Each berry its own blue: some leaning violet, some navy, a little lighter or deeper.
    float lean = (own - 0.5) * 0.25;
    lab.yz = mat2(cos(lean), sin(lean), -sin(lean), cos(lean)) * lab.yz;
    lab.x += (fract(own * 5.31) - 0.5) * 0.05;
    // 2. The bloom: a dusty, pale periwinkle powder in loose patches, rubbed off in places to the
    //    deep, glossier blue underneath (the reference's mottling). Never a flat grey film.
    float bloomPatch = smoothstep(0.3, 0.68, fbm3(cm * 2.3 + own * 13.0));
    float rubbed = smoothstep(0.52, 0.78, fbm3(cm * 1.4 + own * 7.0 + 4.0));
    float bloom = clamp(0.3 + 0.7 * bloomPatch - rubbed * 0.9, 0.0, 1.0) * amount;
    float grain = valueNoise3(objectPos * 140.0);
    bloom *= 0.8 + 0.4 * grain;
    vec3 dust = lab;
    dust.x = mix(dust.x, 0.78, 0.55);
    dust.yz = mat2(cos(-0.12), sin(-0.12), -sin(-0.12), cos(-0.12)) * dust.yz * 0.5;
    // Where it is rubbed off, the skin is a deeper, richer blue.
    lab.x -= rubbed * 0.06 * amount;
    lab.yz *= 1.0 + rubbed * 0.15 * amount;
    lab = mix(lab, dust, bloom * 0.7);
    // 3. The crown: a soft plum hollow inside the star (the geometry gives the star its shape
    //    and points), its sepal tips keeping the bloom. Moderately dark, never black: a near-black
    //    hole turned into a hard block in Playful strokes (as the watermelon's seeds did).
    float crown = 1.0 - smoothstep(0.03, 0.13, q.y);
    vec3 plum = vec3(lab.x - 0.1, 0.05, -0.06);
    lab = mix(lab, plum, crown * 0.6 * amount);
    // 4. Warm highlights, cool shadows: the shadow side leans violet-indigo, a faint plum glow at
    //    the thin outline.
    vec3 violet = vec3(lab.x - 0.03, 0.05, -0.12);
    lab = mix(lab, violet, (1.0 - smoothstep(-0.4, 0.4, NdotL)) * 0.3 * amount);
    float edgeOn = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    lab = mix(lab, linearToOklab(uGlowColour), edgeOn * 0.12 * amount);
    // 5. The shine: broken (like the grapes'); small glints only where the bloom is rubbed off.
    highlightBumpy = 1.0;
    // No shine on the crown: its raised rim caught thin white slivers.
    float offCrown = smoothstep(0.12, 0.22, q.y);
    highlightBreak = bloom * 1.8 + (1.0 - offCrown);
    highlightGlint = rubbed * smoothstep(0.42, 0.62, valueNoise3(cm * 3.0 + own * 5.0)) * offCrown;
  } else if (kind == 20) {
    // Spinach, after the user's references. Each leaf and its stem are one shape. Map: x from -1
    // at the stem's cut end to 0 where the blade starts, then to 1 at its tip; y across the blade,
    // 0 to 1 on its top face and 1 to 2 underneath (0.5 and 1.5: the midrib).
    vec2 q = vec2(max(vSurfaceUv.x, 0.0), fract(vSurfaceUv.y));
    float stemPart = 1.0 - smoothstep(-0.06, 0.06, vSurfaceUv.x);
    bool under = vSurfaceUv.y > 1.0;
    // How far the light has stepped this point from the base colour (before any marks).
    float shadeNow = lab.x - linearToOklab(uBaseColour).x;
    vec3 cm = objectPos * 3.8169;
    float across = abs(q.y - 0.5) * 2.0;
    float NdotL = dot(N, L);
    // Each leaf its own (ownPos.x, the leaf's number; the user, 2026-11-13: "same folds same
    // wrinkles"): its own green, vein spacing and sweep, and its own wrinkles.
    float own = vOwnPos.x;
    float lean = (own - 0.5) * 0.3;
    lab.yz = mat2(cos(lean), sin(lean), -sin(lean), cos(lean)) * lab.yz;
    lab.x += (fract(own * 7.31) - 0.5) * 0.06 * amount;
    // Savoy wrinkles: soft puckers between the veins, a little deeper in their hollows.
    float pucker = fbm3(vec3(q.x * 9.0, across * 4.0, own * 37.0));
    lab = shadeOwn(lab, smoothstep(0.5, 0.75, pucker) * 0.14 * amount * (1.0 - smoothstep(-0.06, 0.06, -vSurfaceUv.x)));
    // 1. Mottled washes, like the reference's watercolour: broad lighter lime patches and deeper
    //    green ones, soft-edged, wandering across each leaf.
    float wash = fbm3(cm * 0.55 + 3.0);
    vec3 lime = lab;
    lime.x += 0.08;
    lime.yz = mat2(cos(0.18), sin(0.18), -sin(0.18), cos(0.18)) * lime.yz * 1.05;
    lab = mix(lab, lime, smoothstep(0.5, 0.78, wash) * 0.4 * amount);
    lab = shadeOwn(lab, smoothstep(0.48, 0.25, wash) * 0.2 * amount);
    // 2. Deeper toward the base, lighter toward the tip.
    lab = shadeOwn(lab, (1.0 - smoothstep(0.0, 0.4, q.x)) * 0.25 * amount);
    // 3. The midrib: a pale lime line, wide at the base and fading toward the tip, its edges soft.
    float rib = (1.0 - smoothstep(0.03, 0.09 - q.x * 0.05, across)) * (1.0 - smoothstep(0.7, 1.0, q.x));
    vec3 pale = linearToOklab(uLitColour);
    pale.x += 0.04;
    pale.yz *= 0.8;
    lab = mix(lab, pale, rib * 0.7 * amount);
    // 4. Side veins: pale lines curving out from the midrib toward the tip and edges, fading out
    //    before the rim, each a little broken; the leaf a touch deeper between them.
    float veinWave = sin((q.x * (4.2 + 2.6 * fract(own * 3.7)) - across * (1.2 + 0.9 * fract(own * 5.3))) * 6.2832 + own * 40.0 + valueNoise3(cm * 2.0) * 1.2);
    float side = smoothstep(0.86, 0.98, veinWave) * smoothstep(0.08, 0.2, across) * (1.0 - smoothstep(0.75, 0.95, across));
    side *= smoothstep(0.35, 0.6, valueNoise3(cm * 3.0 + 5.0) + 0.3);
    lab = mix(lab, pale, side * 0.45 * amount);
    lab = shadeOwn(lab, (1.0 - smoothstep(0.3, 0.9, veinWave)) * 0.08 * amount);
    // 5. Light through the leaf: thin, so it glows a warm yellow-green where the light comes from
    //    behind and at its thin edges.
    float through = pow(max(dot(V, -L), 0.0), 2.0);
    float edgeOn = pow(1.0 - abs(dot(N, V)), 2.0);
    vec3 glowLab = linearToOklab(uGlowColour);
    lab = mix(lab, glowLab, clamp(through * 0.5 + edgeOn * 0.15, 0.0, 0.5) * amount);
    // 6. Warm highlights, cool shadows: the shaded side leans toward a cool blue-green.
    vec3 cool = vec3(lab.x - 0.01, -0.055, -0.01);
    lab = mix(lab, cool, (1.0 - smoothstep(-0.3, 0.45, NdotL)) * 0.2 * amount);
    // 7. The underside is paler and cooler, its veins standing out more.
    if (under) {
      lab.x += 0.06 * amount;
      lab.yz *= 0.8;
      lab = mix(lab, pale, side * 0.3 * amount);
    }
    // 8. The stem: a paler, fresher green with soft streaks along it, flowing into the midrib
    //    (one shape: no line where it meets the blade); paler still at the cut end.
    vec3 stemLab = linearToOklab(uLitColour);
    stemLab.x += shadeNow * 0.9 - (linearToOklab(uLitColour).x - linearToOklab(uBaseColour).x) * 0.6;
    stemLab.yz *= 0.9;
    float streak = valueNoise3(vec3(cm.x * 1.5, cm.y * 14.0, cm.z * 14.0)) - 0.5;
    stemLab.x += streak * 0.05;
    float cutEnd = 1.0 - smoothstep(-1.0, -0.94, vSurfaceUv.x);
    stemLab = mix(stemLab, vec3(stemLab.x + 0.08, stemLab.yz * 0.5), cutEnd);
    lab = mix(lab, stemLab, stemPart * amount);
    // 9. The shine: a little glossy, broken by the veins and the washes, never one patch per leaf.
    highlightBumpy = 1.0;
    highlightBreak = side * 1.5 + rib + smoothstep(0.45, 0.25, wash);
    // Sparse: a white glint everywhere read as blotches.
    highlightGlint = smoothstep(0.75, 0.86, valueNoise3(cm * 2.5 + 9.0)) * (1.0 - side) * 0.3;
  } else if (kind == 21 || kind == 22) {
    // (Kind 22, the cabbage, shares the romaine's painting; its wrapper leaves go deeper.)
    bool cabbage = kind == 22;
    // Romaine, after the user's references (2026-11-13: "the textures and colours need to be on the
    // mark"). The head is one surface (kit/leafMass.ts); its map is worked out in the form so it
    // blends where leaves meet: uv.x how pale (the broad rib, the white base), uv.y how green
    // (rising up the leaf); ownPos.x the leaf's layer and number (under 1/3 the heart, over 2/3 the
    // outer leaves), .y how deep in a crevice, .z how near its own edge. The cut base: uv.x = -2,
    // uv.y out from its middle.
    float pale = clamp(vSurfaceUv.x, 0.0, 1.0);
    float green = clamp(vSurfaceUv.y, 0.0, 1.0);
    float own = vOwnPos.x;
    float crevice = vOwnPos.y;
    float rim = vOwnPos.z;
    float layer = clamp(own * 3.0, 0.0, 2.9);
    float NdotL = dot(N, L);
    vec3 cm = objectPos * 3.8169;
    vec3 litLab = linearToOklab(uLitColour);
    vec3 baseLab = linearToOklab(uBaseColour);
    vec3 shadowLab = linearToOklab(uShadowColour);
    vec3 highLab = linearToOklab(uHighlightColour);
    // How far the light has stepped this point from the base colour: kept on the pale colours too,
    // so rib and blade turn into shadow together.
    float shade = lab.x - baseLab.x;
    float lit = smoothstep(-0.25, 0.6, NdotL);

    // 1. The pale parts: the rib and the base, cream with a cool green tint, fine streaks running
    //    along the head, bluish in shadow (the watercolour's white ribs).
    vec3 ribLab = mix(highLab, litLab, 0.3);
    ribLab.yz *= 0.55;
    ribLab.x += shade * 0.85;
    float streak = valueNoise3(vec3(cm.x * 0.35, cm.y * 7.0, cm.z * 7.0));
    ribLab.x -= smoothstep(0.55, 0.85, streak) * 0.03;
    vec3 coolRib = vec3(ribLab.x - 0.01, ribLab.y - 0.012, ribLab.z - 0.04);
    ribLab = mix(ribLab, coolRib, (1.0 - lit) * 0.9);

    // 2. The green blade: the heart paler and yellower, the outer leaves deeper, each leaf a little
    //    its own; savoy cells (patches of their own tone between paler veins) drawn on the head
    //    itself, a little long along it, so they run on across leaves without a break.
    vec3 bladeLab = lab;
    float lean = (fract(own * 7.13) - 0.5) * 0.2 - (layer - 1.0) * 0.06;
    bladeLab.yz = mat2(cos(lean), sin(lean), -sin(lean), cos(lean)) * bladeLab.yz;
    bladeLab.x += (1.5 - layer) * 0.03 * lit;
    // The savoy texture, like the watercolour reference (the user: the polygon cells read as stone,
    // "the texture isnt right"): soft mottled washes of deeper and lighter green, and fine pale veins
    // that branch and run along the leaves (ridges of a stretched noise), broken and soft-edged,
    // never a drawn net. Measured on the head's own round surface (along it, and the arc round its
    // axis), so the pattern keeps its size all round.
    vec2 cyl = vec2(cm.x, atan(cm.z, cm.y - 3.0) * 3.6);
    vec3 vq = vec3(cyl.x * 0.45, cyl.y * 1.4, own * 9.0);
    float ridgeA = 1.0 - abs(fbm3(vq) - 0.5) * 2.0;
    float ridgeB = 1.0 - abs(fbm3(vq * 2.1 + 5.0) - 0.5) * 2.0;
    float vein = smoothstep(0.8, 0.95, ridgeA) * 0.9 + smoothstep(0.86, 0.97, ridgeB) * 0.5;
    vein *= smoothstep(0.25, 0.6, valueNoise3(cm * 0.9 + 3.0) + 0.2);
    float mottle = fbm3(vec3(cyl * 0.55, own * 4.0 + 2.0));
    float puddle = fbm3(vec3(cyl * 1.3, own * 7.0 + 8.0));
    vec3 cellLab = bladeLab;
    cellLab = shadeOwn(cellLab, smoothstep(0.45, 0.75, puddle) * 0.16);
    cellLab.yz *= 1.0 + smoothstep(0.5, 0.8, puddle) * 0.18;
    cellLab.x += (mottle - 0.5) * 0.08;
    float cellShow = green * (1.0 - pale) * amount;
    bladeLab = mix(bladeLab, cellLab, cellShow);
    // Veins drawn on each leaf from its own map (vLeafMap: along it, and across it from the midrib),
    // like the references (the user: "add more veiny texture like the refs"): side veins branching
    // from the midrib diagonally toward the tip and edge, wavering a little, thinning out toward
    // the edge; finer veins between them; the leaf puckered softly between the veins (savoy).
    if (vLeafMap.x > 0.0005) {
      float lu = vLeafMap.x;
      float la = abs(vLeafMap.y);
      float wob = (valueNoise3(vec3(lu * 14.0, la * 5.0, own * 23.0)) - 0.5) * 0.35;
      float sidePhase = lu * 11.0 - la * 2.2 + own * 7.0 + wob;
      float sideLine = smoothstep(0.0, 1.0, (abs(fract(sidePhase) - 0.5) * 2.0 - 0.78) / 0.22);
      float side = sideLine * smoothstep(0.06, 0.16, la) * (1.0 - smoothstep(0.75, 1.0, la)) * smoothstep(0.08, 0.25, lu);
      vec3 fq = vec3(lu * 34.0, vLeafMap.y * 9.0, own * 13.0);
      float fine = smoothstep(0.88, 0.97, 1.0 - abs(fbm3(fq) - 0.5) * 2.0) * smoothstep(0.1, 0.3, la);
      float leafVein = clamp(side + fine * 0.6, 0.0, 1.0);
      // Puckers: soft domes between the veins, lighter on top, deeper in the hollows.
      float pucker = valueNoise3(vec3(lu * 22.0, vLeafMap.y * 6.5, own * 31.0));
      bladeLab = shadeOwn(bladeLab, smoothstep(0.55, 0.85, pucker) * 0.1 * cellShow);
      bladeLab.x += smoothstep(0.3, 0.05, pucker) * 0.03 * cellShow * lit;
      vein = max(vein * 0.4, leafVein);
      // (A crinkle texture was tried on the romaine and the napa cabbage on 2026-11-14 and taken
      // out: the user preferred the veins alone. It is in history.)
    }
    bladeLab = mix(bladeLab, mix(bladeLab, ribLab, 0.65), vein * cellShow * 0.75);
    // Deeper green blots in loose patches (the watercolour's darker pools), never even.
    float blot = smoothstep(0.6, 0.76, fbm3(vec3(cyl * 0.9, own * 6.0)));
    bladeLab = mix(bladeLab, vec3(bladeLab.x - 0.09, bladeLab.yz * 1.22), blot * cellShow * 0.6);
    // Bright lime where the ruffled top catches the light.
    vec3 lime = litLab;
    lime.x += 0.03;
    lime.yz = mat2(cos(0.12), sin(0.12), -sin(0.12), cos(0.12)) * lime.yz;
    bladeLab = mix(bladeLab, lime, green * lit * 0.25 * amount);

    // 3. Pale to green: a soft band that wanders a little (wet paint, never a cut-out line). Even
    //    the pale base carries a faint green wash.
    float wander = (valueNoise3(cm * 0.9) - 0.5) * 0.25;
    float toGreen = clamp(green * (1.0 - pale) * 1.25 + wander * (1.0 - pale), 0.0, 1.0);
    lab = mix(ribLab, bladeLab, toGreen);
    lab = mix(lab, bladeLab, (1.0 - toGreen) * 0.12);

    // 4. Leaf edges and crevices: a ruffled edge a touch lighter where lit; the hollows between
    //    leaves a soft, cool blue-green, never grey.
    // Each leaf's own edge reads as a soft, deeper green line just inside a lighter rim (the
    // references' leaf outlines down the side), so the leaves are told apart.
    float edgeBand = smoothstep(0.55, 0.85, rim) * (1.0 - smoothstep(0.92, 1.0, rim));
    // (Only up on the green: on the pale lower leaves the edges blend in, never pale flakes.)
    lab = shadeOwn(lab, edgeBand * 0.22 * green * amount);
    lab = mix(lab, lime, smoothstep(0.92, 1.0, rim) * lit * green * 0.3 * amount);
    vec3 deep = vec3(mix(lab.x, shadowLab.x, 0.55), mix(shadowLab.yz, vec2(-0.035, -0.03), 0.4));
    // (None on the pale lower leaves: small dark notches showed along their edges.)
    lab = mix(lab, deep, smoothstep(0.2, 0.85, crevice) * 0.55 * green * amount);

    // 5. Light through the leaves: a warm yellow-green glow at the turn into shadow and on thin
    //    edges seen side on; the shaded side leans cool (warm highlights, cool shadows).
    float turnBand = smoothstep(-0.3, 0.0, NdotL) * (1.0 - smoothstep(0.0, 0.35, NdotL));
    float edgeOn = pow(1.0 - abs(dot(N, V)), 2.0);
    // Subsurface (the user: "and some subsurface"): light carried through the thin leaves: a warm
    // band where it turns into shadow, thin edges seen side on, light from behind, and the shadow
    // side soaking up a little warm glow (never grey). Strongest on the green blade, gentler on the rib.
    float through = pow(max(dot(V, -L), 0.0), 2.0);
    float glowAmount = turnBand * 0.35 + edgeOn * 0.16 + through * 0.3 + (1.0 - lit) * 0.12;
    glowAmount *= mix(0.6, 1.0, green);
    lab = mix(lab, linearToOklab(uGlowColour), clamp(glowAmount, 0.0, 0.45) * amount);
    vec3 cool = vec3(lab.x - 0.01, -0.04, -0.03);
    lab = mix(lab, cool, (1.0 - smoothstep(-0.35, 0.4, NdotL)) * 0.2 * amount);

    // 6. The cut base, after the user's reference (2026-11-14: the wavy grey-brown rings were "ugly"):
    //    a clean, pale cream disc, warm and light even where it turns from the light, the faintest
    //    rings near its middle, a thin golden ring near its edge where the cut dried a little, and the
    //    pale green-white of the leaf bases round it.
    if (vSurfaceUv.x < -1.5) {
      float r = vSurfaceUv.y;
      vec3 creamLab = vec3(highLab.x - 0.015 + shade * 0.3, 0.0, 0.045);
      // The faintest rings, soft, only in the middle.
      float rings = 0.5 + 0.5 * sin(r * 26.0 + valueNoise3(cm * 1.2) * 1.5);
      creamLab.x -= rings * 0.012 * (1.0 - smoothstep(0.3, 0.6, r));
      // A soft warm shading toward the middle (it is a little hollow there).
      creamLab.x -= (1.0 - smoothstep(0.0, 0.35, r)) * 0.015;
      // The golden ring: thin, soft-edged, warm ochre-gold (never brown), a little broken.
      float gold = smoothstep(0.72, 0.78, r) * (1.0 - smoothstep(0.82, 0.88, r));
      gold *= 0.75 + 0.25 * valueNoise3(cm * 3.0);
      creamLab = mix(creamLab, vec3(creamLab.x - 0.035, 0.0, 0.085), gold * 0.6);
      // The rim: the pale leaf bases.
      creamLab = mix(creamLab, ribLab, smoothstep(0.86, 0.98, r));
      lab = creamLab;
    }

    // 7. The shine: soft, broken by the cells and gone in the crevices.
    highlightBumpy = 1.0;
    // The cabbage's wrapper leaves (the outer layer) a deeper, bluer green than its pale head.
    if (cabbage && vSurfaceUv.x > -1.5) {
      float wrapper = smoothstep(1.9, 2.1, layer);
      lab = shadeOwn(lab, wrapper * 0.3 * green * amount);
      lab.yz = mix(lab.yz, lab.yz * vec2(1.25, 0.72), wrapper * green);
    }
    // (A broken sheen showed as pale blocks along the cells: kept very quiet.)
    highlightBreak = 0.8 + vein * cellShow * 1.5 + crevice * 2.0;
    highlightGlint = 0.0;
  }
  colour = max(oklabToLinear(lab), 0.0);
}
`,
  update() {},
};
