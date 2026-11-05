import { PAINTERS } from './painters';

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
export const BRUSHES = ['flat', 'round', 'knife', 'dry'] as const;
export const PATTERNS = ['none', 'lines', 'scribble', 'crosshatch'] as const;
// New options go at the end: the shader reads each option by its position in this list.
export const HIGHLIGHT_SHAPES = ['window', 'panes', 'square', 'dashes', 'streak', 'dot', 'none', 'sheen', 'speckle'] as const;

export type Brush = (typeof BRUSHES)[number];
export type Pattern = (typeof PATTERNS)[number];
export type HighlightShape = (typeof HIGHLIGHT_SHAPES)[number];

export interface Settings {
  palette: {
    /** Which colour combo is active (see src/palettes.ts). */
    preset: string;
  };
  brush: {
    /**
     * Playful strokes: repaint the finished, refined painting with bold brush
     * strokes (like a kid's painting). Off: the refined, glazed look.
     */
    classic: boolean;
    /** Which painter's look the strokes follow (see src/painters.ts). Randomize picks one. */
    painter: string;
    type: Brush;
    size: number;
    length: number;
    texture: number;
    pattern: Pattern;
    patternAmount: number;
    /** Set by the painter: how freely strokes wander, how much neighbouring colours differ,
     *  how closely strokes follow the form, and how big the backdrop strokes are. */
    loose: number;
    colourBreak: number;
    followForm: number;
    backdrop: number;
    /** How much the strokes flow in curling currents (Van Gogh). 0 for most painters. */
    swirl: number;
  };
  paint: {
    brushiness: number;
    washBleed: number;
    edgeSoftness: number;
    texture: number;
    // Hidden below this line (used by the classic stroke pass and the matte layer)
    painterly: number;
    variation: number;
    chalk: number;
  };
  lighting: {
    glow: number;
    shadowColour: number;
  };
  highlight: {
    shape: HighlightShape;
    size: number;
    rimGlints: boolean;
  };
  scene: {
    backdrop: number;
    idleSpin: boolean;
    // Hidden below this line
    backdropStrokes: number;
    frame: boolean;
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
    /** On: the apple shows its flat planes (poly edges). Off (default): the soft, rounded apple. */
    faceted: boolean;
    // Hidden below this line
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
    /** Warm, saturated colour for the subsurface glow at edges and the light-to-shadow line. */
    glow: string;
    stem: string;
    leaf: string;
  };
  light: {
    direction: Vec2;
    /**
     * How strong the key light is, shared by every ingredient. 100: the full
     * jump from shadow to lit colour. Lower pulls both toward the ingredient's
     * base colour, for soft light that never bleaches the lit side.
     */
    strength: number;
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
  // Hidden again 2026-11-04 (the user), still working: the room combos ("Background colour").
  { key: 'palette', title: 'Background colour', expanded: true, hidden: true },
  // Only the Playful strokes switch is shown; the detailed brush controls stay hidden.
  { key: 'brush', title: 'Style', expanded: true },
  // Shown again 2026-11-04 (the user): Strength and Tone bands, light controls that make a
  // clear visible change. The rest of the group (Direction included) stays hidden.
  { key: 'light', title: 'Light', expanded: true },
  // Hidden 2026-11-04 (the user): Brushiness, Wash bleed and Edge softness made too small a
  // visible change to be worth a slider. They still work at their tuned defaults.
  { key: 'paint', title: 'Paint', expanded: true, hidden: true },
  { key: 'lighting', title: 'Light', expanded: true, hidden: true },
  { key: 'highlight', title: 'Highlights', expanded: true, hidden: true },
  // Facets are retired: the Faceted switch and the shape sliders are all hidden, so Form is not shown.
  { key: 'shape', title: 'Form', expanded: true },
  { key: 'scene', title: 'Scene', expanded: true, hidden: true },
  { key: 'colour', title: 'Colour', expanded: false, hidden: true },
];

/** Defaults are tuned to match references/painterly/00 and 01 (the source of truth). */
export const DEFAULTS: Settings = {
  palette: {
    preset: 'linen',
  },
  brush: {
    classic: false,
    // Playful strokes start as Sargent: exactly the original Playful strokes look
    // (from before the painters existed). Looseness 45 and broken colour 25 give the
    // original 0.45 looseness and colour variation in the stroke shader.
    painter: 'sargent',
    type: 'flat',
    size: 55,
    length: 60,
    texture: 35,
    pattern: 'none',
    patternAmount: 55,
    loose: 45,
    colourBreak: 25,
    followForm: 100,
    backdrop: 50,
    swirl: 0,
  },
  paint: {
    brushiness: 35,
    washBleed: 70,
    edgeSoftness: 50,
    texture: 40,
    painterly: 45,
    variation: 45,
    chalk: 8,
  },
  lighting: {
    glow: 55,
    shadowColour: 60,
  },
  highlight: {
    shape: 'sheen',
    size: 32,
    rimGlints: true,
  },
  scene: {
    backdrop: 40,
    // On (the user, 2026-11-05): a slow turntable that pauses while you drag the view.
    idleSpin: true,
    backdropStrokes: 72,
    frame: false,
    frameColour: '#877e77',
    backgroundTop: '#babadd',
    backgroundBottom: '#e4d4c7',
    horizon: 36,
    horizonSoftness: 4,
    variation: 45,
    castShadow: true,
    shadowColour: '#696d9a',
    shadowAmount: 80,
    spinSpeed: 25,
  },
  shape: {
    // Facets are retired (board 02): every form is smooth and rounded.
    faceted: false,
    roundness: 58,
    height: 56,
    topDimple: 42,
    bottomDimple: 20,
    lopsided: 22,
    facets: 66,
    stemLength: 72,
    stemCurve: 58,
    stemThickness: 22,
    leaf: false,
    leafSize: 50,
  },
  colour: {
    base: '#ce5249',
    lit: '#f78e64',
    shadow: '#843d56',
    highlight: '#f5e5d3',
    glow: '#ed6531',
    stem: '#5d6a33',
    leaf: '#6c8c4a',
  },
  light: {
    // Upper left and slightly in front (board 05): about 35 degrees left of camera, 40 degrees up.
    direction: { x: -0.35, y: 0.51 },
    // Soft light (chosen 2026-11-04): calmer lit side, wider turn into shadow, more fill.
    strength: 55,
    bands: 3,
    softness: 32,
    paintEdges: 20,
    ambient: '#b6b3d6',
    ambientAmount: 62,
    bounce: '#cca17e',
    bounceAmount: 55,
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
  | {
      kind: 'list';
      label: string;
      options: { value: string; label: string }[];
      random?: boolean;
      /** If set, Randomize only picks from these options. */
      randomOptions?: string[];
    }
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
    classic: { kind: 'toggle', label: 'Playful strokes' },
    type: {
      kind: 'list',
      label: 'Brush',
      random: true,
      hidden: true,
      options: [
        { value: 'flat', label: 'Flat brush' },
        { value: 'round', label: 'Round brush' },
        { value: 'knife', label: 'Palette knife' },
        { value: 'dry', label: 'Dry brush' },
      ],
    },
    size: pct('Stroke size', [25, 70], hidden),
    length: pct('Stroke length', [30, 90], hidden),
    texture: pct('Bristle texture', [10, 70], hidden),
    pattern: {
      kind: 'list',
      label: 'Pattern',
      random: true,
      hidden: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'lines', label: 'Lines' },
        { value: 'scribble', label: 'Scribble' },
        { value: 'crosshatch', label: 'Crosshatch' },
      ],
    },
    patternAmount: pct('Pattern amount', [30, 80], hidden),
    painter: {
      kind: 'list',
      label: 'Painter',
      hidden: true,
      options: PAINTERS.map((p) => ({ value: p.id, label: p.name })),
    },
    loose: pct('Looseness', [20, 90], hidden),
    colourBreak: pct('Broken colour', [15, 95], hidden),
    followForm: pct('Follow the form', [10, 100], hidden),
    backdrop: pct('Backdrop stroke size', [15, 95], hidden),
    swirl: pct('Swirl', [0, 100], hidden),
  },
  paint: {
    brushiness: pct('Brushiness', [15, 70]),
    washBleed: pct('Wash bleed', [25, 80]),
    edgeSoftness: pct('Edge softness', [20, 75]),
    texture: pct('Texture', [10, 60], hidden),
    painterly: pct('Painterly', [35, 90], hidden),
    variation: pct('Colour variation', [25, 75], hidden),
    chalk: pct('Chalkiness', [0, 35], hidden),
  },
  lighting: {
    glow: pct('Glow', [25, 80]),
    shadowColour: pct('Shadow colour', [30, 85]),
  },
  highlight: {
    shape: {
      kind: 'list',
      label: 'Shape',
      random: true,
      // The hard-edged shapes stay available, but Randomize sticks to the soft, believable ones.
      randomOptions: ['sheen', 'speckle'],
      options: [
        { value: 'sheen', label: 'Soft sheen' },
        { value: 'speckle', label: 'Dry speckle' },
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
    backdrop: pct('Backdrop', [0, 100]),
    idleSpin: { kind: 'toggle', label: 'Idle spin' },
    backdropStrokes: pct('Backdrop strokes', [35, 85], hidden),
    frame: { kind: 'toggle', label: 'Frame', ...hidden },
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
    faceted: { kind: 'toggle', label: 'Faceted', ...hidden },
    roundness: pct('Roundness', [25, 85], hidden),
    height: pct('Height', [30, 70], hidden),
    topDimple: pct('Top dimple', [15, 65], hidden),
    bottomDimple: pct('Bottom dimple', [0, 50], hidden),
    lopsided: pct('Lopsided', [0, 60], hidden),
    facets: pct('Facets', [35, 90], hidden),
    stemLength: pct('Stem length', [30, 85], hidden),
    stemCurve: pct('Stem curve', [10, 75], hidden),
    stemThickness: pct('Stem thickness', [20, 60], hidden),
    leaf: { kind: 'toggle', label: 'Leaf', random: true, ...hidden },
    leafSize: pct('Leaf size', [30, 80], hidden),
  },
  colour: {
    base: { kind: 'colour', label: 'Base' },
    lit: { kind: 'colour', label: 'Lit' },
    shadow: { kind: 'colour', label: 'Shadow' },
    highlight: { kind: 'colour', label: 'Highlight' },
    glow: { kind: 'colour', label: 'Glow' },
    stem: { kind: 'colour', label: 'Stem' },
    leaf: { kind: 'colour', label: 'Leaf' },
  },
  light: {
    // Hidden again 2026-11-04 (the user): the light stays upper left (board 05).
    direction: { kind: 'pad', label: 'Direction', nice: { x: [-0.85, 0.85], y: [0.2, 0.85] }, ...hidden },
    strength: pct('Strength', [40, 70]),
    bands: {
      kind: 'slider',
      label: 'Tone bands',
      min: 1,
      max: 6,
      step: 1,
      nice: [2, 5],
      unit: 'count',
    },
    softness: pct('Band softness', [0, 35], hidden),
    paintEdges: pct('Painted edges', [15, 60], hidden),
    ambient: { kind: 'colour', label: 'Ambient colour', ...hidden },
    ambientAmount: pct('Ambient amount', [25, 70], hidden),
    bounce: { kind: 'colour', label: 'Bounce colour', ...hidden },
    bounceAmount: pct('Bounce amount', [20, 65], hidden),
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
