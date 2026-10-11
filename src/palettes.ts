import type { Settings } from './params';
import { lerpHue, oklchToHex } from './utils/colour';

/**
 * Colour combos.
 *
 * A palette sets every colour in the scene at once: the apple, its lit side,
 * shadow and highlight, stem and leaf, the light bouncing around, the wall, table,
 * cast shadow and frame. Choosing one in the panel copies these colours into
 * the (hidden) colour settings.
 *
 * Each combo follows the same painting rules as the reference: warm lights,
 * shadows that shift hue instead of going grey, a wall that contrasts with
 * the fruit, ambient light borrowed from the wall and bounce light borrowed
 * from the table.
 */

export interface PaletteColours {
  base: string;
  lit: string;
  shadow: string;
  highlight: string;
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

export const PALETTES: Palette[] = [
  {
    id: 'orchard',
    name: 'Orchard',
    colours: {
      base: '#b8232f',
      lit: '#e0502a',
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

/** Copy a palette's colours into the settings. */
export function applyPalette(settings: Settings, palette: Palette): void {
  const c = palette.colours;
  settings.palette.preset = palette.id;
  Object.assign(settings.colour, {
    base: c.base,
    lit: c.lit,
    shadow: c.shadow,
    highlight: c.highlight,
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
 * A brand new combo that follows the same painting rules:
 *   - pick a hue for the fruit
 *   - shadow: darker, and shifted toward violet (cool shadows)
 *   - highlight: very light, low saturation, shifted toward warm peach
 *   - wall: roughly opposite the fruit on the colour wheel, so the fruit pops
 *   - table: a neighbour of the wall; bounce light borrows the table colour
 *   - ambient light borrows the wall colour
 */
export function shufflePalette(): Palette {
  const hue = between(0, 360);
  const wallHue = hue + between(140, 220);
  const tableHue = wallHue + (Math.random() < 0.5 ? -1 : 1) * between(70, 150);
  const stemHue = between(115, 150);
  const baseL = between(0.5, 0.6);
  const baseC = between(0.13, 0.19);

  return {
    id: 'shuffled',
    name: 'Shuffled',
    colours: {
      base: oklchToHex(baseL, baseC, hue),
      lit: oklchToHex(baseL + between(0.08, 0.14), baseC + 0.02, lerpHue(hue, 65, between(0.25, 0.45))),
      shadow: oklchToHex(between(0.26, 0.34), between(0.08, 0.13), lerpHue(hue, 300, between(0.3, 0.6))),
      highlight: oklchToHex(between(0.87, 0.93), between(0.04, 0.07), lerpHue(hue, 60, between(0.4, 0.7))),
      stem: oklchToHex(between(0.45, 0.55), between(0.12, 0.17), stemHue),
      leaf: oklchToHex(between(0.56, 0.66), between(0.12, 0.17), stemHue + between(-10, 10)),
      ambient: oklchToHex(between(0.64, 0.74), between(0.08, 0.12), wallHue),
      bounce: oklchToHex(between(0.58, 0.68), between(0.1, 0.15), tableHue),
      wall: oklchToHex(between(0.36, 0.48), between(0.09, 0.15), wallHue),
      table: oklchToHex(between(0.46, 0.6), between(0.09, 0.15), tableHue),
      castShadow: oklchToHex(between(0.18, 0.26), between(0.03, 0.07), lerpHue(tableHue, 280, 0.5)),
      frame: oklchToHex(between(0.56, 0.62), between(0.01, 0.025), wallHue),
    },
  };
}
