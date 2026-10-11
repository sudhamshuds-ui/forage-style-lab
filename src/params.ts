/**
 * Every adjustable value in the Style Lab lives here.
 *
 *  - `Settings`  describes what values exist (the shape of the data).
 *  - `DEFAULTS`  is the look you get on first load and after Reset.
 *  - `SPECS`     tells the panel how to show each value (label, slider range)
 *                and tells Randomize which part of the range still looks good.
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

export interface Settings {
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
    shadow: string;
    highlight: string;
    stem: string;
    leaf: string;
    chalk: number;
  };
  light: {
    direction: Vec2;
    bands: number;
    softness: number;
    paintEdges: number;
    highlightSize: number;
    ambient: string;
    ambientAmount: number;
    bounce: string;
    bounceAmount: number;
  };
  scene: {
    backgroundTop: string;
    backgroundBottom: string;
    horizon: number;
    horizonSoftness: number;
    variation: number;
    castShadow: boolean;
    shadowColour: string;
    shadowAmount: number;
    idleSpin: boolean;
    spinSpeed: number;
  };
}

export type GroupKey = keyof Settings;

/** Panel order and folder titles. */
export const GROUPS: { key: GroupKey; title: string; expanded: boolean }[] = [
  { key: 'shape', title: 'Shape', expanded: true },
  { key: 'colour', title: 'Colour', expanded: true },
  { key: 'light', title: 'Light', expanded: true },
  { key: 'scene', title: 'Scene', expanded: false },
];

/** Defaults are tuned to match references/apple. */
export const DEFAULTS: Settings = {
  shape: {
    roundness: 60,
    height: 56,
    topDimple: 42,
    bottomDimple: 20,
    lopsided: 22,
    facets: 62,
    stemLength: 62,
    stemCurve: 45,
    stemThickness: 25,
    leaf: false,
    leafSize: 50,
  },
  colour: {
    base: '#b8232f',
    shadow: '#4e1638',
    highlight: '#f2cdb8',
    stem: '#2e8b3e',
    leaf: '#3e9b45',
    chalk: 10,
  },
  light: {
    direction: { x: 0.6, y: 0.55 },
    bands: 4,
    softness: 10,
    paintEdges: 30,
    highlightSize: 28,
    ambient: '#8e7fd8',
    ambientAmount: 45,
    bounce: '#3f9a4b',
    bounceAmount: 40,
  },
  scene: {
    backgroundTop: '#4a3d98',
    backgroundBottom: '#3e8442',
    horizon: 40,
    horizonSoftness: 12,
    variation: 35,
    castShadow: true,
    shadowColour: '#14233a',
    shadowAmount: 60,
    idleSpin: true,
    spinSpeed: 25,
  },
};

// ---------------------------------------------------------------------------
// How each value appears in the panel
// ---------------------------------------------------------------------------

export type Spec =
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
  | { kind: 'colour'; label: string }
  | { kind: 'toggle'; label: string; random?: boolean }
  | { kind: 'pad'; label: string; nice: { x: [number, number]; y: [number, number] } };

/** One spec per setting. TypeScript complains if a setting is missing here. */
export type SpecTable = { [G in GroupKey]: { [K in keyof Settings[G]]: Spec } };

const pct = (label: string, nice: [number, number], random = true): Spec => ({
  kind: 'slider',
  label,
  min: 0,
  max: 100,
  step: 1,
  nice,
  unit: '%',
  random,
});

export const SPECS: SpecTable = {
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
    shadow: { kind: 'colour', label: 'Shadow' },
    highlight: { kind: 'colour', label: 'Highlight' },
    stem: { kind: 'colour', label: 'Stem' },
    leaf: { kind: 'colour', label: 'Leaf' },
    chalk: pct('Chalkiness', [5, 45]),
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
    highlightSize: pct('Highlight size', [15, 55]),
    ambient: { kind: 'colour', label: 'Ambient colour' },
    ambientAmount: pct('Ambient amount', [25, 70]),
    bounce: { kind: 'colour', label: 'Bounce colour' },
    bounceAmount: pct('Bounce amount', [20, 65]),
  },
  scene: {
    backgroundTop: { kind: 'colour', label: 'Top colour' },
    backgroundBottom: { kind: 'colour', label: 'Bottom colour' },
    horizon: pct('Horizon', [30, 50]),
    horizonSoftness: pct('Horizon softness', [5, 40]),
    variation: pct('Colour variation', [15, 60]),
    castShadow: { kind: 'toggle', label: 'Cast shadow' },
    shadowColour: { kind: 'colour', label: 'Shadow colour' },
    shadowAmount: pct('Shadow amount', [35, 75]),
    idleSpin: { kind: 'toggle', label: 'Idle spin' },
    spinSpeed: pct('Spin speed', [10, 40], false),
  },
};

/** A fresh, independent copy of the defaults. */
export function defaultSettings(): Settings {
  return structuredClone(DEFAULTS);
}
