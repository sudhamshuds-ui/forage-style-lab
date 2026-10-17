import type { Settings } from './params';
import { hexToOklch, lerpHue, oklchToHex } from './utils/colour';

/**
 * Colour combos.
 *
 * A palette sets every colour in the scene at once: the apple, its lit side,
 * shadow and highlight, stem and leaf, the light bouncing around, the wall, table,
 * cast shadow and frame. Choosing one in the panel copies these colours into
 * the (hidden) colour settings.
 *
 * Each combo follows the same soft-light painting rules (checked by palettes.test.ts):
 *   - the room is light, cool-leaning and muted: wall and table are pale,
 *     greyed colours (dusty blue, sage, stone, mauve), never candy colours
 *   - the fruit is the most saturated thing in the picture
 *   - the lit side is paler and warmer, but not bleached to white
 *   - shadows shift hue (red to wine to plum) and never go near black
 *   - the glow colour is a warmer, juicier version of the fruit colour,
 *     used where light passes through thin edges
 *   - bounce light from below is warm; the cast shadow on the table is cool
 */

export interface PaletteColours {
  base: string;
  lit: string;
  shadow: string;
  highlight: string;
  glow: string;
  stem: string;
  leaf: string;
  ambient: string;
  bounce: string;
  wall: string;
  table: string;
  castShadow: string;
  frame: string;
}

export interface Palette {
  id: string;
  name: string;
  colours: PaletteColours;
}

/** The colour combos shown in the picker, made for soft, natural light. */
export const PALETTES: Palette[] = [
  {
    id: 'linen',
    name: 'Linen',
    colours: {
      base: '#c43f3e',
      lit: '#e97c48',
      shadow: '#73294b',
      glow: '#e04f1a',
      highlight: '#f5e5d3',
      stem: '#5d6a33',
      leaf: '#6c8c4a',
      ambient: '#a1bbcf',
      bounce: '#cca17e',
      wall: '#adc1cf',
      table: '#bcafa0',
      castShadow: '#5e6886',
      frame: '#877e77',
    },
  },
  {
    id: 'sage-morning',
    name: 'Sage morning',
    colours: {
      base: '#cc572a',
      lit: '#ea9344',
      shadow: '#793240',
      glow: '#e36a00',
      highlight: '#f6e9d5',
      stem: '#606127',
      leaf: '#6d853f',
      ambient: '#a8bfa8',
      bounce: '#c5a579',
      wall: '#acbda8',
      table: '#cac3b6',
      castShadow: '#4e6e7e',
      frame: '#7f8278',
    },
  },
  {
    id: 'dusty-rose',
    name: 'Dusty rose',
    colours: {
      base: '#c8536c',
      lit: '#ed8d7d',
      shadow: '#653161',
      glow: '#e75e70',
      highlight: '#fbe6df',
      stem: '#626838',
      leaf: '#6e8b50',
      ambient: '#c3b1c1',
      bounce: '#cea48c',
      wall: '#bdabba',
      table: '#cdb8b4',
      castShadow: '#625f7e',
      frame: '#867d84',
    },
  },
  {
    id: 'overcast',
    name: 'Overcast',
    colours: {
      base: '#af2843',
      lit: '#dc5f4e',
      shadow: '#5e244d',
      glow: '#d33a3c',
      highlight: '#f2e5db',
      stem: '#4f5f32',
      leaf: '#5d8049',
      ambient: '#98adc4',
      bounce: '#bc957b',
      wall: '#95a7ba',
      table: '#8b9ba6',
      castShadow: '#4a5e80',
      frame: '#747b83',
    },
  },
  {
    id: 'pear-light',
    name: 'Pear light',
    colours: {
      base: '#a8b540',
      lit: '#d7cf63',
      shadow: '#286648',
      glow: '#d0b80e',
      highlight: '#f4f0d1',
      stem: '#745837',
      leaf: '#668e4f',
      ambient: '#bab3cb',
      bounce: '#ceaa80',
      wall: '#bab3c8',
      table: '#c9bba9',
      castShadow: '#6e6a8a',
      frame: '#817e88',
    },
  },
  {
    id: 'honey',
    name: 'Honey',
    colours: {
      base: '#e19b1b',
      lit: '#ebc75e',
      shadow: '#82452f',
      glow: '#f99603',
      highlight: '#f7efd1',
      stem: '#65572f',
      leaf: '#668644',
      ambient: '#98b8ba',
      bounce: '#d0a481',
      wall: '#92b2b3',
      table: '#c6bcac',
      castShadow: '#4a6f80',
      frame: '#768384',
    },
  },
];

/**
 * The first set of combos, made for the old "strong gouache" look (deep walls,
 * saturated tables). Kept for reference and not shown in the picker.
 */
export const CLASSIC_PALETTES: Palette[] = [
  {
    id: 'orchard',
    name: 'Orchard',
    colours: {
      base: '#b8232f',
      lit: '#e0502a',
      glow: '#e0502a',
      shadow: '#5a1636',
      highlight: '#f2c6c4',
      stem: '#24803c',
      leaf: '#3e9b45',
      ambient: '#7c74cc',
      bounce: '#3f8f4b',
      wall: '#453992',
      table: '#3d8a40',
      castShadow: '#0f2418',
      frame: '#857a7a',
    },
  },
  {
    id: 'plum-dusk',
    name: 'Plum dusk',
    colours: {
      base: '#8a2f72',
      lit: '#c4507c',
      glow: '#c4507c',
      shadow: '#2e1646',
      highlight: '#f6d7e6',
      stem: '#5c6b2a',
      leaf: '#7a8a34',
      ambient: '#e2b04f',
      bounce: '#b07a45',
      wall: '#c99430',
      table: '#6a4630',
      castShadow: '#2a1717',
      frame: '#8a8178',
    },
  },
  {
    id: 'citrus-noon',
    name: 'Citrus noon',
    colours: {
      base: '#d9a92b',
      lit: '#f2cf4a',
      glow: '#f2cf4a',
      shadow: '#7a3a3e',
      highlight: '#fff1c6',
      stem: '#4f6b25',
      leaf: '#6f9a2e',
      ambient: '#7fc4c6',
      bounce: '#d77a4c',
      wall: '#2c7d88',
      table: '#c0553a',
      castShadow: '#1d2c38',
      frame: '#8c8478',
    },
  },
  {
    id: 'sea-glass',
    name: 'Sea glass',
    colours: {
      base: '#6fae4a',
      lit: '#a6cf55',
      glow: '#a6cf55',
      shadow: '#2a4a62',
      highlight: '#ecf6d2',
      stem: '#6b5532',
      leaf: '#4f9a55',
      ambient: '#cfe9e4',
      bounce: '#e6a487',
      wall: '#93c6c0',
      table: '#e0ae95',
      castShadow: '#3a5260',
      frame: '#8e8a84',
    },
  },
  {
    id: 'rosewater',
    name: 'Rosewater',
    colours: {
      base: '#de6f84',
      lit: '#f29a8a',
      glow: '#f29a8a',
      shadow: '#6a2c5c',
      highlight: '#ffe7df',
      stem: '#5e7d3a',
      leaf: '#7aa45a',
      ambient: '#fbe3cf',
      bounce: '#9cb4d6',
      wall: '#efd3bd',
      table: '#8ea7c8',
      castShadow: '#38385a',
      frame: '#8a807e',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colours: {
      base: '#cc3640',
      lit: '#ee6a48',
      glow: '#ee6a48',
      shadow: '#391238',
      highlight: '#f7d2b2',
      stem: '#2f6a46',
      leaf: '#3f8a58',
      ambient: '#5466b6',
      bounce: '#6c6eb4',
      wall: '#1f2a58',
      table: '#3a3e72',
      castShadow: '#0c0e22',
      frame: '#7e7a80',
    },
  },
  {
    id: 'harvest',
    name: 'Harvest',
    colours: {
      base: '#de7426',
      lit: '#f5a33a',
      glow: '#f5a33a',
      shadow: '#782a2c',
      highlight: '#ffe0b6',
      stem: '#4a5a24',
      leaf: '#6d8f3a',
      ambient: '#86ad8d',
      bounce: '#d6a45c',
      wall: '#3d6a4a',
      table: '#b5874c',
      castShadow: '#1d2a1d',
      frame: '#857c72',
    },
  },
  {
    id: 'heather',
    name: 'Heather',
    colours: {
      base: '#8fb23a',
      lit: '#c4cf4a',
      glow: '#c4cf4a',
      shadow: '#3e3a6c',
      highlight: '#f4f1c6',
      stem: '#6b5a30',
      leaf: '#5e9a3e',
      ambient: '#c7b4ec',
      bounce: '#ebc67c',
      wall: '#9a84c6',
      table: '#e6c078',
      castShadow: '#2e2648',
      frame: '#8a8086',
    },
  },
];

export function findPalette(id: string): Palette | undefined {
  return [...PALETTES, ...CLASSIC_PALETTES].find((p) => p.id === id);
}

/** Copy a palette's colours into the settings. */
export function applyPalette(settings: Settings, palette: Palette): void {
  const c = palette.colours;
  settings.palette.preset = palette.id;
  Object.assign(settings.colour, {
    base: c.base,
    lit: c.lit,
    shadow: c.shadow,
    highlight: c.highlight,
    glow: c.glow,
    stem: c.stem,
    leaf: c.leaf,
  });
  Object.assign(settings.light, { ambient: c.ambient, bounce: c.bounce });
  Object.assign(settings.scene, {
    backgroundTop: c.wall,
    backgroundBottom: c.table,
    shadowColour: c.castShadow,
    frameColour: c.frame,
  });
}

/** Read the colours currently in the settings back out as a palette (used for "Shuffled"). */
export function currentColours(settings: Settings): PaletteColours {
  return {
    base: settings.colour.base,
    lit: settings.colour.lit,
    shadow: settings.colour.shadow,
    highlight: settings.colour.highlight,
    glow: settings.colour.glow,
    stem: settings.colour.stem,
    leaf: settings.colour.leaf,
    ambient: settings.light.ambient,
    bounce: settings.light.bounce,
    wall: settings.scene.backgroundTop,
    table: settings.scene.backgroundBottom,
    castShadow: settings.scene.shadowColour,
    frame: settings.scene.frameColour,
  };
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * A brand new combo that follows the same soft-light rules:
 *   - pick a fruit hue (reds, oranges, yellows, greens, pinks) and make it rich
 *   - shadow: darker, and turned 25 to 45 degrees toward violet (cool shadows)
 *   - glow: a little lighter and juicier than the fruit, nudged toward orange
 *   - highlight: very light, low saturation, warm
 *   - wall and table: pale, greyed colours from anywhere on the wheel
 *   - ambient light borrows the wall; bounce light is a warm, soft tan
 *   - cast shadow: a cool blue-violet grey
 *
 * Very saturated colours can fall outside what a screen can show, and then
 * oklchToHex quietly lowers the saturation. If that leaves the fruit or its
 * glow too dull, we simply roll again.
 */
export function shufflePalette(): Palette {
  for (let attempt = 0; attempt < 20; attempt++) {
    const palette = rollPalette();
    const base = hexToOklch(palette.colours.base);
    const glow = hexToOklch(palette.colours.glow);
    if (base.c >= 0.13 && glow.c >= base.c) return palette;
  }
  return { ...PALETTES[0], id: 'shuffled', name: 'Shuffled' };
}

function rollPalette(): Palette {
  // Fruit hues from pink-red (330) round through orange and yellow to green (140).
  const hue = (330 + between(0, 170)) % 360;
  const yellowish = hue > 60 && hue < 130;
  const baseL = yellowish ? between(0.72, 0.78) : between(0.52, 0.62);
  const baseC = between(0.14, 0.17);

  // Turn the shadow toward violet (300), the short way round, by 25 to 45 degrees.
  const toViolet = ((((300 - hue) % 360) + 540) % 360) - 180;
  const shadowHue = hue + (toViolet >= 0 ? 1 : -1) * between(25, 45);

  const wallHue = between(0, 360);
  const tableHue = wallHue + (Math.random() < 0.5 ? -1 : 1) * between(60, 160);
  const stemHue = between(115, 150);

  return {
    id: 'shuffled',
    name: 'Shuffled',
    colours: {
      base: oklchToHex(baseL, baseC, hue),
      lit: oklchToHex(Math.min(baseL + between(0.08, 0.12), 0.85), baseC * 0.9, lerpHue(hue, 65, 0.3)),
      shadow: oklchToHex(between(0.36, 0.46), between(0.08, 0.11), shadowHue),
      glow: oklchToHex(baseL + 0.03, baseC + 0.03, lerpHue(hue, 50, 0.2)),
      highlight: oklchToHex(between(0.92, 0.95), between(0.02, 0.04), lerpHue(hue, 70, 0.6)),
      stem: oklchToHex(between(0.45, 0.52), between(0.06, 0.09), stemHue),
      leaf: oklchToHex(between(0.56, 0.62), between(0.08, 0.11), stemHue + between(-10, 10)),
      ambient: oklchToHex(between(0.74, 0.8), between(0.03, 0.05), wallHue),
      bounce: oklchToHex(between(0.7, 0.76), between(0.05, 0.09), between(35, 85)),
      wall: oklchToHex(between(0.7, 0.84), between(0.02, 0.045), wallHue),
      table: oklchToHex(between(0.72, 0.84), between(0.015, 0.04), tableHue),
      castShadow: oklchToHex(between(0.44, 0.56), between(0.04, 0.07), between(220, 300)),
      frame: oklchToHex(between(0.56, 0.62), between(0.01, 0.025), wallHue),
    },
  };
}
