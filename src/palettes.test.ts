import { describe, expect, it } from 'vitest';
import { CLASSIC_PALETTES, PALETTES, applyPalette, shufflePalette, type Palette } from './palettes';
import { DEFAULTS, defaultSettings } from './params';
import { randomSettings } from './randomize';
import { hexToOklch } from './utils/colour';

/** Shortest distance between two hues, in degrees. */
const hueGap = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
const hueIn = (h: number, from: number, to: number) => h >= from && h <= to;
const oklch = (hex: string) => hexToOklch(hex);

describe('the apple keeps its own colours', () => {
  const c = Object.fromEntries(Object.entries(DEFAULTS.colour).map(([k, v]) => [k, oklch(v)]));

  it('is a rich red, paler and warmer in the light, never bleached', () => {
    expect(hueIn(c.base.h, 0, 45)).toBe(true);
    expect(c.base.c).toBeGreaterThanOrEqual(0.12);
    expect(c.lit.l).toBeGreaterThan(c.base.l);
    expect(c.lit.l).toBeLessThanOrEqual(0.86);
  });

  it('has a hue-shifted shadow that never goes near black, a juicy glow and a pale highlight', () => {
    expect(c.shadow.l).toBeGreaterThanOrEqual(0.3);
    expect(c.shadow.l).toBeLessThanOrEqual(0.5);
    expect(hueGap(c.shadow.h, c.base.h)).toBeGreaterThanOrEqual(20);
    expect(c.glow.c).toBeGreaterThanOrEqual(c.base.c);
    expect(hueGap(c.glow.h, c.base.h)).toBeLessThanOrEqual(50);
    expect(c.highlight.l).toBeGreaterThanOrEqual(0.88);
    expect(c.highlight.c).toBeLessThanOrEqual(0.06);
  });

  it('is not changed by choosing a room combo', () => {
    const settings = defaultSettings();
    applyPalette(settings, PALETTES[PALETTES.length - 1]);
    expect(settings.colour).toEqual(DEFAULTS.colour);
  });

  it('is not changed by Randomize, and neither is the room', () => {
    for (let i = 0; i < 50; i++) {
      const next = randomSettings(defaultSettings());
      expect(next.colour).toEqual(DEFAULTS.colour);
      expect(next.palette).toEqual(DEFAULTS.palette);
      expect(next.light.ambient).toBe(DEFAULTS.light.ambient);
      expect(next.scene.backgroundTop).toBe(DEFAULTS.scene.backgroundTop);
    }
  });
});

/**
 * The room rules every combo must follow, around the apple's own colour (see
 * the reference paintings). Two families:
 *  - soft: a light, gently coloured room
 *  - vivid: a saturated room, like the periwinkle and pink of the blood orange
 */
function checkRoom(p: Palette, fruitHex: string): void {
  const c = Object.fromEntries(Object.entries(p.colours).map(([k, v]) => [k, oklch(v)]));
  const fruit = oklch(fruitHex);
  const label = p.name;
  const vivid = p.family === 'vivid';

  // The room complements the fruit: a cool hue, a set distance round the wheel
  // (coral with periwinkle, yellow with mint).
  expect(hueIn(c.wall.h, 150, 310), `${label} wall is cool (${c.wall.h.toFixed(0)})`).toBe(true);
  const gap = hueGap(c.wall.h, fruit.h);
  expect(gap, `${label} wall hue gap ${gap.toFixed(0)}`).toBeGreaterThanOrEqual(70);
  expect(gap, `${label} wall hue gap ${gap.toFixed(0)}`).toBeLessThanOrEqual(150);
  expect(c.wall.l, `${label} wall lightness`).toBeGreaterThanOrEqual(0.62);
  expect(c.wall.l, `${label} wall lightness`).toBeLessThanOrEqual(0.88);
  if (vivid) {
    expect(c.wall.c, `${label} vivid wall chroma`).toBeGreaterThanOrEqual(0.09);
    expect(c.wall.c, `${label} fruit at least as rich as the room`).toBeLessThanOrEqual(fruit.c);
  } else {
    expect(c.wall.c, `${label} soft wall chroma`).toBeGreaterThanOrEqual(0.035);
    expect(c.wall.c, `${label} soft wall chroma`).toBeLessThanOrEqual(0.08);
  }
  // The ambient light borrows the room's hue; bounce light from below is warm.
  expect(hueGap(c.ambient.h, c.wall.h), `${label} ambient follows the wall`).toBeLessThanOrEqual(45);
  expect(hueIn(c.bounce.h, 20, 100), `${label} bounce is warm (${c.bounce.h.toFixed(0)})`).toBe(true);
  expect(c.bounce.c, `${label} bounce chroma`).toBeGreaterThanOrEqual(0.04);
  expect(c.bounce.c, `${label} bounce chroma`).toBeLessThanOrEqual(0.12);

  // The floor near the fruit is pale, where the light falls.
  expect(c.table.l, `${label} table lightness`).toBeGreaterThanOrEqual(0.78);
  expect(c.table.l, `${label} table lightness`).toBeLessThanOrEqual(0.94);
  expect(c.table.c, `${label} table chroma`).toBeLessThanOrEqual(vivid ? 0.09 : 0.06);

  // The cast shadow is a deeper version of the room colour.
  expect(hueGap(c.castShadow.h, c.wall.h), `${label} cast shadow follows the wall`).toBeLessThanOrEqual(45);
  expect(c.castShadow.l, `${label} cast shadow lightness`).toBeGreaterThanOrEqual(0.42);
  expect(c.castShadow.l, `${label} cast shadow lightness`).toBeLessThanOrEqual(0.65);
  expect(c.castShadow.c, `${label} cast shadow chroma`).toBeGreaterThanOrEqual(vivid ? 0.08 : 0.04);
  expect(c.castShadow.c, `${label} cast shadow chroma`).toBeLessThanOrEqual(vivid ? 0.18 : 0.1);
}

describe('room combos', () => {
  it('has six soft rooms (Linen first) and three vivid ones', () => {
    expect(PALETTES[0].id).toBe('linen');
    expect(PALETTES.filter((p) => p.family === 'soft').length).toBe(6);
    expect(PALETTES.filter((p) => p.family === 'vivid').length).toBe(3);
  });

  it('keeps the eight classic combos', () => {
    expect(CLASSIC_PALETTES.length).toBe(8);
  });

  it.each(PALETTES.map((p) => [p.name, p] as const))('%s follows the room rules', (_, p) => {
    checkRoom(p, DEFAULTS.colour.base);
  });

  it('Shuffle always makes a soft room that follows the rules', () => {
    for (let i = 0; i < 200; i++) checkRoom(shufflePalette(DEFAULTS.colour.base, 'soft'), DEFAULTS.colour.base);
  });

  it('Shuffle always makes a vivid room that follows the rules', () => {
    for (let i = 0; i < 200; i++) checkRoom(shufflePalette(DEFAULTS.colour.base, 'vivid'), DEFAULTS.colour.base);
  });

  it('defaults match the Linen room', () => {
    const settings = defaultSettings();
    applyPalette(settings, PALETTES[0]);
    expect(settings).toEqual(defaultSettings());
  });
});
