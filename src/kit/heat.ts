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

/** An ingredient's colours after the heat. */
export function heated(palette: Palette, heat: Heat): Palette {
  const { toward, amount } = LOOKS[heat];
  return {
    lit: mixHex(palette.lit, toward.lit, amount.lit),
    base: mixHex(palette.base, toward.base, amount.base),
    shadow: mixHex(palette.shadow, toward.shadow, amount.shadow),
    glow: mixHex(palette.glow, toward.glow, amount.glow),
    highlight: mixHex(palette.highlight, toward.highlight, amount.highlight),
  };
}

export function heatLook(heat: Heat): { crust: number; glossy: boolean } {
  return { crust: LOOKS[heat].crust, glossy: LOOKS[heat].glossy };
}
