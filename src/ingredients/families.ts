import type { Palette } from '../shading/stylizedMaterial';

/**
 * Colour families (board 04, "Warm subject, cool room").
 *
 * A family is five colours that map one to one onto the shader's palette
 * (lit, base, shadow, glow, highlight), plus the rooms that suit it: a muted
 * room 70 to 150 degrees round the colour wheel. The first room is the one
 * the Style Lab picks when the ingredient comes on stage.
 *
 * Colours live here, in data, never in a form.
 *
 * To settle before these families go on stage: board 04 pairs a few rooms
 * that sit outside its own 70 to 150 degree rule (measured in OKLCh):
 * orange with Overcast (172), green with Heather (173) and Linen (153),
 * cream and crust with Overcast (171). The registry test checks every family
 * an ingredient uses, so it will flag these when that ingredient arrives.
 */
export type FamilyId = 'red' | 'orange' | 'yellow' | 'green' | 'cream-crust' | 'pink-raw';

export interface ColourFamily {
  name: string;
  colours: Palette;
  /** Room combo ids from src/palettes.ts, suggested one first. */
  rooms: string[];
}

export const FAMILIES: Record<FamilyId, ColourFamily> = {
  // These five are the apple's own values in params.ts (the hidden Colour group).
  red: {
    name: 'Red',
    colours: { lit: '#f78e64', base: '#ce5249', shadow: '#843d56', glow: '#ed6531', highlight: '#f5e5d3' },
    rooms: ['linen', 'heather'],
  },
  orange: {
    name: 'Orange',
    colours: { lit: '#ffb36b', base: '#f0812f', shadow: '#b0484a', glow: '#ff9a2e', highlight: '#fff0d9' },
    rooms: ['overcast', 'dusk'],
  },
  yellow: {
    name: 'Yellow',
    colours: { lit: '#fff0a3', base: '#f2c94c', shadow: '#b0866a', glow: '#ffc94a', highlight: '#fffbe8' },
    rooms: ['seafoam'],
  },
  green: {
    name: 'Green',
    colours: { lit: '#c8de8a', base: '#73a24c', shadow: '#3c6f66', glow: '#b5d65a', highlight: '#eef5d8' },
    rooms: ['heather', 'linen'],
  },
  'cream-crust': {
    name: 'Cream and crust',
    colours: { lit: '#fbe6c4', base: '#e0ad73', shadow: '#9a6a63', glow: '#f2b45e', highlight: '#fff6e6' },
    rooms: ['sage-morning', 'overcast'],
  },
  'pink-raw': {
    name: 'Pink and raw',
    colours: { lit: '#f6a493', base: '#d4544f', shadow: '#8c3150', glow: '#ff7a66', highlight: '#fbe4dc' },
    rooms: ['seafoam', 'sage-morning'],
  },
};
