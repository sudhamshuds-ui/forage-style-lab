import type { Settings } from './params';
import { hexToOklch, oklchToHex } from './utils/colour';

/**
 * Colour combos: the room around the ingredient.
 *
 * The ingredient keeps its own natural colours (an apple is red: see the
 * hidden Colour group in params.ts). A combo only sets the room and the light
 * around it: the wall, the table, the ambient light borrowed from the room,
 * the warm bounce light from below, and the cast shadow. Choosing one copies
 * these into the (hidden) settings.
 *
 * Every room follows the painting rules of the reference paintings (checked
 * by palettes.test.ts):
 *   - the room complements the fruit: a cool hue, 70 to 150 degrees round the
 *     colour wheel from it (coral with periwinkle, yellow with mint)
 *   - the floor near the fruit is pale, where the light falls
 *   - the ambient light borrows the room's hue; bounce light is warm
 *   - the cast shadow is a deeper version of the room colour, never grey
 *
 * Two families: soft (a light, gently coloured room) and vivid (a saturated
 * room, like the periwinkle and pink of the blood orange painting).
 */

export type PaletteFamily = 'soft' | 'vivid';

export interface RoomColours {
  wall: string;
  table: string;
  ambient: string;
  bounce: string;
  castShadow: string;
  frame: string;
}

export interface Palette {
  id: string;
  name: string;
  family: PaletteFamily;
  colours: RoomColours;
}

/** The old combos also set the fruit's colours. Kept for reference, not shown. */
export interface ClassicPalette {
  id: string;
  name: string;
  colours: RoomColours & {
    base: string;
    lit: string;
    shadow: string;
    highlight: string;
    glow: string;
    stem: string;
    leaf: string;
  };
}

/** The rooms shown in the picker. */
export const PALETTES: Palette[] = [
  {
    id: 'linen',
    name: 'Linen',
    family: 'soft',
    colours: {
      wall: '#babadd',
      table: '#e4d4c7',
      ambient: '#b6b3d6',
      bounce: '#cca17e',
      castShadow: '#696d9a',
      frame: '#877e77',
    },
  },
  {
    id: 'sage-morning',
    name: 'Sage morning',
    family: 'soft',
    colours: {
      wall: '#a0c8b6',
      table: '#e0dacc',
      ambient: '#98c2b2',
      bounce: '#c5a579',
      castShadow: '#4a7d6f',
      frame: '#7f8278',
    },
  },
  {
    id: 'dusk',
    name: 'Dusk',
    family: 'soft',
    colours: {
      wall: '#a2b1d2',
      table: '#e4cfc8',
      ambient: '#a4b0d2',
      bounce: '#cea48c',
      castShadow: '#596792',
      frame: '#867d84',
    },
  },
  {
    id: 'overcast',
    name: 'Overcast',
    family: 'soft',
    colours: {
      wall: '#95b6ce',
      table: '#c3d0da',
      ambient: '#97b5cf',
      bounce: '#bc957b',
      castShadow: '#43668a',
      frame: '#747b83',
    },
  },
  {
    id: 'seafoam',
    name: 'Seafoam',
    family: 'soft',
    colours: {
      wall: '#a4cfc0',
      table: '#e3decc',
      ambient: '#9bc9bf',
      bounce: '#ceaa80',
      castShadow: '#47807f',
      frame: '#768384',
    },
  },
  {
    id: 'heather',
    name: 'Heather',
    family: 'soft',
    colours: {
      wall: '#c5b6d8',
      table: '#e8dbd1',
      ambient: '#c1afd0',
      bounce: '#d0a481',
      castShadow: '#746b91',
      frame: '#817e88',
    },
  },
  {
    id: 'periwinkle',
    name: 'Periwinkle',
    family: 'vivid',
    colours: {
      wall: '#a39ef9',
      table: '#e2d9f5',
      ambient: '#b191ea',
      bounce: '#d7a57d',
      castShadow: '#725ec2',
      frame: '#7f7f89',
    },
  },
  {
    id: 'mint-light',
    name: 'Mint light',
    family: 'vivid',
    colours: {
      wall: '#85e0be',
      table: '#e2e8d2',
      ambient: '#78dac0',
      bounce: '#d6b17d',
      castShadow: '#209993',
      frame: '#778380',
    },
  },
  {
    id: 'lilac',
    name: 'Lilac',
    family: 'vivid',
    colours: {
      wall: '#c39dee',
      table: '#e9d7ed',
      ambient: '#c793df',
      bounce: '#d39e7a',
      castShadow: '#7055b0',
      frame: '#827e88',
    },
  },
];

/**
 * The first set of combos, made for the old "strong gouache" look (deep walls,
 * saturated tables). Kept for reference and not shown in the picker.
 */
export const CLASSIC_PALETTES: ClassicPalette[] = [
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
  return PALETTES.find((p) => p.id === id);
}

/** Copy a room's colours into the settings. The fruit's own colours are left alone. */
export function applyPalette(settings: Settings, palette: Palette): void {
  const c = palette.colours;
  settings.palette.preset = palette.id;
  Object.assign(settings.light, { ambient: c.ambient, bounce: c.bounce });
  Object.assign(settings.scene, {
    backgroundTop: c.wall,
    backgroundBottom: c.table,
    shadowColour: c.castShadow,
    frameColour: c.frame,
  });
}

/** Read the room colours currently in the settings (used for "Shuffled"). */
export function currentColours(settings: Settings): RoomColours {
  return {
    wall: settings.scene.backgroundTop,
    table: settings.scene.backgroundBottom,
    ambient: settings.light.ambient,
    bounce: settings.light.bounce,
    castShadow: settings.scene.shadowColour,
    frame: settings.scene.frameColour,
  };
}

const between = (min: number, max: number) => min + Math.random() * (max - min);
const wrap = (h: number) => ((h % 360) + 360) % 360;
const hueGap = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

/**
 * A brand new room around the fruit, following the same rules:
 *   - the wall: a cool hue (150 to 310 degrees), 80 to 140 degrees round the
 *     wheel from the fruit, either way
 *   - ambient light: the wall's hue, a touch lighter
 *   - table: pale, lightly tinted
 *   - bounce: a warm, soft tan
 *   - cast shadow: a deeper version of the wall colour
 * Vivid rooms are more saturated, but never richer than the fruit.
 */
export function shufflePalette(fruitBase: string, family: PaletteFamily = Math.random() < 0.5 ? 'soft' : 'vivid'): Palette {
  const fruit = hexToOklch(fruitBase);
  const vivid = family === 'vivid';
  for (let attempt = 0; attempt < 40; attempt++) {
    const wallHue = wrap(fruit.h + (Math.random() < 0.5 ? -1 : 1) * between(80, 140));
    if (wallHue < 155 || wallHue > 305 || hueGap(wallHue, fruit.h) < 75) continue;
    const wallC = vivid ? between(0.1, Math.min(0.15, fruit.c)) : between(0.04, 0.07);
    const colours: RoomColours = {
      wall: oklchToHex(between(0.72, 0.84), wallC, wallHue),
      table: oklchToHex(between(0.84, 0.92), vivid ? between(0.02, 0.06) : between(0.015, 0.04), Math.random() < 0.5 ? wallHue : between(50, 100)),
      ambient: oklchToHex(between(0.74, 0.8), wallC, wallHue + between(-15, 15)),
      bounce: oklchToHex(between(0.7, 0.76), between(0.05, 0.09), between(35, 85)),
      castShadow: oklchToHex(between(0.48, 0.6), vivid ? between(0.1, 0.15) : between(0.05, 0.08), wallHue + between(-15, 15)),
      frame: oklchToHex(between(0.56, 0.62), between(0.01, 0.025), wallHue),
    };
    // Very saturated colours can fall outside what a screen shows and lose some
    // saturation; roll again if a vivid wall ends up too dull.
    if (vivid && hexToOklch(colours.wall).c < 0.095) continue;
    if (vivid && hexToOklch(colours.castShadow).c < 0.085) continue;
    return { id: 'shuffled', name: 'Shuffled', family, colours };
  }
  const fallback = PALETTES.find((p) => p.family === family) ?? PALETTES[0];
  return { ...fallback, id: 'shuffled', name: 'Shuffled' };
}
