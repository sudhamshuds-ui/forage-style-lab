import type { Palette } from '../shading/stylizedMaterial';
import { mixHex } from '../utils/colour';

/**
 * Heat: what cooking (or freezing) does to an ingredient's colours.
 *
 * Each level is a target palette and how far the ingredient's own colours travel toward it,
 * mixed in OKLab like blending two swatches (so the colours stay clean, never muddy). The
 * ingredient keeps some of itself at every level: a roasted apple is still an apple.
 *
 * Shadows stay cool and highlights warm at every level (the house rule), and nothing goes to
 * grey or black: burnt is a deep plum-brown.
 */
export const HEATS = ['Frozen', 'Raw', 'Roasted', 'Caramelized', 'Burnt'] as const;
export type Heat = (typeof HEATS)[number];

interface HeatLook {
  /** The colours this heat pulls toward, and how far (0 to 1) for each of the five. */
  toward: Palette;
  amount: { lit: number; base: number; shadow: number; glow: number; highlight: number };
  /** A baked, blotchy surface (the bread's crust texture), 0 to 1. */
  crust: number;
  /** True for a wet, glossy shine (a caramel glaze); false keeps the surface matte. */
  glossy: boolean;
}

const LOOKS: Record<Heat, HeatLook> = {
  // Frost: paler and bluer all over, the colour showing through as if under a film of ice.
  Frozen: {
    toward: { lit: '#f4f8fc', base: '#cfdded', shadow: '#8a93c9', glow: '#dbe6f5', highlight: '#ffffff' },
    amount: { lit: 0.6, base: 0.42, shadow: 0.5, glow: 0.6, highlight: 0.6 },
    crust: 0,
    glossy: true,
  },
  Raw: {
    toward: { lit: '#ffffff', base: '#ffffff', shadow: '#ffffff', glow: '#ffffff', highlight: '#ffffff' },
    amount: { lit: 0, base: 0, shadow: 0, glow: 0, highlight: 0 },
    crust: 0,
    glossy: false,
  },
  // Roasted: golden and browned, a little darker, warm blotches.
  Roasted: {
    toward: { lit: '#f3c27c', base: '#c98443', shadow: '#77403f', glow: '#ee8f3a', highlight: '#fff0d4' },
    amount: { lit: 0.38, base: 0.42, shadow: 0.4, glow: 0.45, highlight: 0.2 },
    crust: 0.7,
    glossy: false,
  },
  // Caramelized: deep amber, sticky and glossy.
  Caramelized: {
    toward: { lit: '#f7b24a', base: '#c96a1c', shadow: '#6c2d3c', glow: '#ff8a1f', highlight: '#fff3d0' },
    amount: { lit: 0.6, base: 0.66, shadow: 0.6, glow: 0.7, highlight: 0.25 },
    crust: 0.55,
    glossy: true,
  },
  // Burnt: charred, a deep plum-brown with a few warm embers left in it. Never black.
  Burnt: {
    toward: { lit: '#8a5a4a', base: '#4a2f33', shadow: '#2b1d33', glow: '#b8542c', highlight: '#c9a088' },
    amount: { lit: 0.82, base: 0.86, shadow: 0.85, glow: 0.6, highlight: 0.75 },
    crust: 1,
    glossy: false,
  },
};

/** An ingredient's colours at one of the named heats. */
function at(palette: Palette, heat: Heat): Palette {
  const { toward, amount } = LOOKS[heat];
  return {
    lit: mixHex(palette.lit, toward.lit, amount.lit),
    base: mixHex(palette.base, toward.base, amount.base),
    shadow: mixHex(palette.shadow, toward.shadow, amount.shadow),
    glow: mixHex(palette.glow, toward.glow, amount.glow),
    highlight: mixHex(palette.highlight, toward.highlight, amount.highlight),
  };
}

/*
 * Heat as a slider, 0 to 100: the five named heats are stops along it, a quarter apart
 * (Frozen 0, Raw 25, Roasted 50, Caramelized 75, Burnt 100), and everything in between is a
 * blend of its two neighbours. Like a gradient with five colour stops.
 */
export const RAW = 25;
const STEP = 100 / (HEATS.length - 1);

/** The two stops a value sits between, and how far it is from the first to the second (0 to 1). */
function between(value: number): { a: Heat; b: Heat; t: number } {
  const v = Math.min(100, Math.max(0, value)) / STEP;
  const i = Math.min(HEATS.length - 2, Math.floor(v));
  return { a: HEATS[i], b: HEATS[i + 1], t: v - i };
}

/** An ingredient's colours at a heat (0 to 100). */
export function heated(palette: Palette, value: number): Palette {
  const { a, b, t } = between(value);
  const from = at(palette, a);
  const to = at(palette, b);
  return {
    lit: mixHex(from.lit, to.lit, t),
    base: mixHex(from.base, to.base, t),
    shadow: mixHex(from.shadow, to.shadow, t),
    glow: mixHex(from.glow, to.glow, t),
    highlight: mixHex(from.highlight, to.highlight, t),
  };
}

/** The surface at a heat: how much baked texture, and whether it shines. */
export function heatLook(value: number): { crust: number; glossy: boolean } {
  const { a, b, t } = between(value);
  return {
    crust: LOOKS[a].crust + (LOOKS[b].crust - LOOKS[a].crust) * t,
    glossy: t < 0.5 ? LOOKS[a].glossy : LOOKS[b].glossy,
  };
}

/** The name of the nearest stop, for the slider's label. */
export function heatName(value: number): Heat {
  return HEATS[Math.round(Math.min(100, Math.max(0, value)) / STEP)];
}
