import { describe, expect, it } from 'vitest';
import { hexToOklch } from '../utils/colour';
import { softenPalette } from './stylizedMaterial';

const lemon = { lit: '#fff0a3', base: '#f2c94c', shadow: '#b0866a', glow: '#ffc94a', highlight: '#fffbe8' };

describe('Light strength', () => {
  it('at 100 leaves the palette as it is', () => {
    const full = softenPalette(lemon, 100);
    expect(full.lit.toLowerCase()).toBe(lemon.lit);
    expect(full.shadow.toLowerCase()).toBe(lemon.shadow);
  });

  it('lower pulls lit and shadow toward the base, so the lit side never bleaches', () => {
    const soft = softenPalette(lemon, 55);
    const L = (hex: string) => hexToOklch(hex).l;
    expect(L(soft.lit)).toBeLessThan(L(lemon.lit));
    expect(L(soft.lit)).toBeGreaterThan(L(lemon.base));
    expect(L(soft.shadow)).toBeGreaterThan(L(lemon.shadow));
    expect(L(soft.shadow)).toBeLessThan(L(lemon.base));
    // Base, glow and highlight are untouched.
    expect([soft.base, soft.glow, soft.highlight]).toEqual([lemon.base, lemon.glow, lemon.highlight]);
  });
});
