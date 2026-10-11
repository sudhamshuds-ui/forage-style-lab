/**
 * Every adjustable value in the Style Lab lives here.
 *
 *  - `Settings`  describes what values exist (the shape of the data).
 *  - `DEFAULTS`  is the look you get on first load and after Reset.
 *  - `SPECS`     tells the panel how to show each value (label, slider range)
 *                and tells Randomize which part of the range still looks good.
 *
 * Hidden controls: a group or a single control marked `hidden: true` is not
 * shown in the panel and Randomize leaves it alone, but it still works and
 * keeps its default value. To bring a control back, delete `hidden: true`.
 *
 * To add a new control: add it to all three, then read it where you need it
 * (for example inside a shader effect's `update` function).
 *
 * Most sliders run from 0 to 100 so they read like percentages in the panel.
 * The code that uses them converts to real units.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Options for the list controls. The shaders use each option's position in its list. */
export const BRUSHES = ['flat', 'round', 'knife', 'dry', 'mixed'] as const;
export const PATTERNS = ['none', 'lines', 'scribble', 'crosshatch'] as const;
export const HIGHLIGHT_SHAPES = ['window', 'panes', 'square', 'dashes', 'streak', 'dot', 'none'] as const;

export type Brush = (typeof BRUSHES)[number];
export type Pattern = (typeof PATTERNS)[number];
export type HighlightShape = (typeof HIGHLIGHT_SHAPES)[number];

export interface Settings {
  palette: {
    /** Which colour combo is active (see src/palettes.ts). */
    preset: string;
  };
  brush: {
    type: Brush;
    size: number;
    length: number;
    texture: number;
    pattern: Pattern;
    patternAmount: number;
  };
  paint: {
    painterly: number;
    variation: number;
    chalk: number;
    /** Which random stroke layout to use. Randomize picks a new one. */
    seed: number;
  };
  highlight: {
    shape: HighlightShape;
    size: number;
    rimGlints: boolean;
  };
  scene: {
    /** 0 = the backdrop is painted as a full box, 100 = a loose abstract shape. */
    backdropFalloff: number;
    backdropStrokes: number;
    frame: boolean;
    idleSpin: boolean;
    // Hidden below this line
    /** Thin pale scratch lines along the backdrop's edge. Off: the user found them odd. */
    scratchLines: boolean;
    frameColour: string;
    backgroundTop: string;
    backgroundBottom: string;
    horizon: number;
    horizonSoftness: number;
    variation: number;
    castShadow: boolean;
    shadowColour: string;
    shadowAmount: number;
    spinSpeed: number;
  };
  // Hidden groups: the apple's shape, its individual colours (set by the palette) and the lighting.
  shape: {
    roundness: number;
    height: number;
    topDimple: number;
    bottomDimple: number;
    lopsided: number;
    facets: number;
    stemLength: number;
    stemCurve: number;
    stemThickness: number;
    leaf: boolean;
    leafSize: number;
  };
  colour: {
    base: string;
    /** Colour of the planes in full light (warmer and lighter than base). */
    lit: string;
    shadow: string;
    highlight: string;
    stem: string;
    leaf: string;
  };
  light: {
    direction: Vec2;
    bands: number;
    softness: number;
    paintEdges: number;
    ambient: string;
    ambientAmount: number;
    bounce: string;
    bounceAmount: number;
  };
}

export type GroupKey = keyof Settings;

/** Panel order and folder titles. Hidden groups are kept but not shown. */
export const GROUPS: { key: GroupKey; title: string; expanded: boolean; hidden?: boolean }[] = [
  { key: 'paint', title: 'Paint', expanded: true },
  { key: 'scene', title: 'Backdrop', expanded: true },
  { key: 'brush', title: 'Pattern', expanded: true },
  { key: 'palette', title: 'Colour combo', expanded: true, hidden: true },
  { key: 'highlight', title: 'Highlights', expanded: true, hidden: true },
  { key: 'shape', title: 'Shape', expanded: false, hidden: true },
  { key: 'colour', title: 'Colour', expanded: false, hidden: true },
  { key: 'light', title: 'Light', expanded: false, hidden: true },
];

/** Defaults are tuned to match references/apple/00-source-of-truth.webp. */
export const DEFAULTS: Settings = {
  palette: {
    preset: 'orchard',
  },
  brush: {
    type: 'mixed',
    size: 55,
    length: 60,
    texture: 35,
    pattern: 'none',
    patternAmount: 55,
  },
  paint: {
    painterly: 50,
    variation: 45,
    chalk: 8,
    seed: 1,
  },
  highlight: {
    shape: 'window',
    size: 36,
    rimGlints: true,
  },
  scene: {
    backdropFalloff: 40,
    backdropStrokes: 72,
    frame: true,
    idleSpin: false,
    scratchLines: false,
    frameColour: '#857a7a',
    backgroundTop: '#453992',
    backgroundBottom: '#3d8a40',
    horizon: 36,
    horizonSoftness: 1,
    variation: 12,
    castShadow: true,
    shadowColour: '#0f2418',
    shadowAmount: 80,
    spinSpeed: 25,
  },
  shape: {
    roundness: 58,
    height: 56,
    topDimple: 42,
    bottomDimple: 20,
    lopsided: 22,
    facets: 75,
    stemLength: 66,
    stemCurve: 48,
    stemThickness: 34,
    leaf: true,
    leafSize: 55,
  },
  colour: {
    base: '#b8232f',
    lit: '#e0502a',
    shadow: '#5a1636',
    highlight: '#f2c6c4',
    stem: '#24803c',
    leaf: '#3e9b45',
  },
  light: {
    direction: { x: 0.6, y: 0.55 },
    bands: 5,
    softness: 6,
    paintEdges: 8,
    ambient: '#7c74cc',
    ambientAmount: 50,
    bounce: '#3f8f4b',
    bounceAmount: 45,
  },
};

// ---------------------------------------------------------------------------
// How each value appears in the panel
// ---------------------------------------------------------------------------

export type Spec = (
  | {
      kind: 'slider';
      label: string;
      min: number;
      max: number;
      step: number;
      /** The part of the range Randomize picks from. */
      nice: [number, number];
      /** How the number is shown in the panel. */
      unit?: '%' | 'count';
      /** Set to false to keep Randomize away from this value. */
      random?: boolean;
    }
  | { kind: 'list'; label: string; options: { value: string; label: string }[]; random?: boolean }
  | { kind: 'colour'; label: string }
  | { kind: 'toggle'; label: string; random?: boolean }
  | { kind: 'pad'; label: string; nice: { x: [number, number]; y: [number, number] } }
  | { kind: 'palette'; label: string }
) & {
  /** Kept in the code but not shown in the panel. */
  hidden?: boolean;
};

/** One spec per setting. TypeScript complains if a setting is missing here. */
export type SpecTable = { [G in GroupKey]: { [K in keyof Settings[G]]: Spec } };

const pct = (label: string, nice: [number, number], extra: { random?: boolean; hidden?: boolean } = {}): Spec => ({
  kind: 'slider',
  label,
  min: 0,
  max: 100,
  step: 1,
  nice,
  unit: '%',
  ...extra,
});

const hidden = { hidden: true } as const;

export const SPECS: SpecTable = {
  palette: {
    preset: { kind: 'palette', label: 'Colour combo' },
  },
  brush: {
    type: {
      kind: 'list',
      label: 'Brush',
      random: true,
      options: [
        { value: 'flat', label: 'Flat brush' },
        { value: 'round', label: 'Round brush' },
        { value: 'knife', label: 'Palette knife' },
        { value: 'dry', label: 'Dry brush' },
        { value: 'mixed', label: 'Dry and flat' },
      ],
      hidden: true,
    },
    size: pct('Stroke size', [25, 70], hidden),
    length: pct('Stroke length', [30, 90], hidden),
    texture: pct('Bristle texture', [10, 70], hidden),
    pattern: {
      kind: 'list',
      label: 'Type',
      random: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'lines', label: 'Lines' },
        { value: 'scribble', label: 'Scribble' },
        { value: 'crosshatch', label: 'Crosshatch' },
      ],
    },
    patternAmount: pct('Amount', [30, 80]),
  },
  paint: {
    painterly: pct('Painterly', [25, 85]),
    variation: pct('Colour variation', [25, 75], hidden),
    chalk: pct('Chalkiness', [0, 35], hidden),
    seed: { kind: 'slider', label: 'Stroke layout', min: 1, max: 999, step: 1, nice: [1, 999], unit: 'count', hidden: true },
  },
  highlight: {
    shape: {
      kind: 'list',
      label: 'Shape',
      random: true,
      options: [
        { value: 'window', label: 'Window' },
        { value: 'panes', label: 'Four panes' },
        { value: 'square', label: 'Square fleck' },
        { value: 'dashes', label: 'Dashes' },
        { value: 'streak', label: 'Streak' },
        { value: 'dot', label: 'Dot' },
        { value: 'none', label: 'None' },
      ],
    },
    size: pct('Size', [25, 70]),
    rimGlints: { kind: 'toggle', label: 'Rim glints', random: true },
  },
  scene: {
    backdropFalloff: pct('Falloff', [20, 85]),
    backdropStrokes: pct('Backdrop strokes', [35, 85], hidden),
    frame: { kind: 'toggle', label: 'Frame', ...hidden },
    idleSpin: { kind: 'toggle', label: 'Idle spin', ...hidden },
    scratchLines: { kind: 'toggle', label: 'Scratch lines', ...hidden },
    frameColour: { kind: 'colour', label: 'Frame colour', ...hidden },
    backgroundTop: { kind: 'colour', label: 'Top colour', ...hidden },
    backgroundBottom: { kind: 'colour', label: 'Bottom colour', ...hidden },
    horizon: pct('Horizon', [30, 45], hidden),
    horizonSoftness: pct('Horizon softness', [2, 20], hidden),
    variation: pct('Backdrop variation', [25, 60], hidden),
    castShadow: { kind: 'toggle', label: 'Cast shadow', ...hidden },
    shadowColour: { kind: 'colour', label: 'Shadow colour', ...hidden },
    shadowAmount: pct('Shadow amount', [60, 90], hidden),
    spinSpeed: pct('Spin speed', [10, 40], { random: false, hidden: true }),
  },
  shape: {
    roundness: pct('Roundness', [25, 85]),
    height: pct('Height', [30, 70]),
    topDimple: pct('Top dimple', [15, 65]),
    bottomDimple: pct('Bottom dimple', [0, 50]),
    lopsided: pct('Lopsided', [0, 60]),
    facets: pct('Facets', [35, 90]),
    stemLength: pct('Stem length', [30, 85]),
    stemCurve: pct('Stem curve', [10, 75]),
    stemThickness: pct('Stem thickness', [20, 60]),
    leaf: { kind: 'toggle', label: 'Leaf', random: true },
    leafSize: pct('Leaf size', [30, 80]),
  },
  colour: {
    base: { kind: 'colour', label: 'Base' },
    lit: { kind: 'colour', label: 'Lit' },
    shadow: { kind: 'colour', label: 'Shadow' },
    highlight: { kind: 'colour', label: 'Highlight' },
    stem: { kind: 'colour', label: 'Stem' },
    leaf: { kind: 'colour', label: 'Leaf' },
  },
  light: {
    direction: { kind: 'pad', label: 'Direction', nice: { x: [-0.85, 0.85], y: [0.2, 0.85] } },
    bands: {
      kind: 'slider',
      label: 'Tone bands',
      min: 1,
      max: 6,
      step: 1,
      nice: [2, 5],
      unit: 'count',
    },
    softness: pct('Band softness', [0, 35]),
    paintEdges: pct('Painted edges', [15, 60]),
    ambient: { kind: 'colour', label: 'Ambient colour' },
    ambientAmount: pct('Ambient amount', [25, 70]),
    bounce: { kind: 'colour', label: 'Bounce colour' },
    bounceAmount: pct('Bounce amount', [20, 65]),
  },
};

/** True if a control should appear in the panel (and be touched by Randomize). */
export function isVisible(group: GroupKey, spec: Spec): boolean {
  const groupInfo = GROUPS.find((g) => g.key === group);
  return !groupInfo?.hidden && !spec.hidden;
}

/** A fresh, independent copy of the defaults. */
export function defaultSettings(): Settings {
  return structuredClone(DEFAULTS);
}
