import { describe, expect, it } from 'vitest';
import { CLASSIC_PALETTES, PALETTES, applyPalette, shufflePalette, type Palette } from './palettes';
import { defaultSettings } from './params';
import { hexToOklch } from './utils/colour';

/** Shortest distance between two hues, in degrees. */
const hueGap = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
const hueIn = (h: number, from: number, to: number) => h >= from && h <= to;

/** The soft-light painting rules every combo must follow (see the design doc). */
function checkRules(p: Palette): void {
  const c = Object.fromEntries(Object.entries(p.colours).map(([k, v]) => [k, hexToOklch(v)]));
  const label = `${p.name}`;

  for (const key of ['wall', 'table']) {
    expect(c[key].l, `${label} ${key} lightness`).toBeGreaterThanOrEqual(0.62);
    expect(c[key].l, `${label} ${key} lightness`).toBeLessThanOrEqual(0.88);
    expect(c[key].c, `${label} ${key} chroma`).toBeLessThanOrEqual(0.07);
  }
  expect(c.ambient.c, `${label} ambient chroma`).toBeLessThanOrEqual(0.08);

  expect(c.base.c, `${label} base chroma`).toBeGreaterThanOrEqual(0.12);
  expect(c.base.c, `${label} base vs environment`).toBeGreaterThanOrEqual(
    Math.max(c.wall.c, c.table.c, c.ambient.c) + 0.05,
  );

  expect(c.lit.l, `${label} lit lighter than base`).toBeGreaterThan(c.base.l);
  expect(c.lit.l, `${label} lit not bleached`).toBeLessThanOrEqual(0.86);

  expect(c.shadow.l, `${label} shadow lightness`).toBeGreaterThanOrEqual(0.3);
  expect(c.shadow.l, `${label} shadow lightness`).toBeLessThanOrEqual(0.5);
  expect(hueGap(c.shadow.h, c.base.h), `${label} shadow hue shift`).toBeGreaterThanOrEqual(20);

  expect(c.glow.c, `${label} glow chroma`).toBeGreaterThanOrEqual(c.base.c);
  expect(hueGap(c.glow.h, c.base.h), `${label} glow hue`).toBeLessThanOrEqual(50);

  expect(c.highlight.l, `${label} highlight lightness`).toBeGreaterThanOrEqual(0.88);
  expect(c.highlight.c, `${label} highlight chroma`).toBeLessThanOrEqual(0.06);

  expect(hueIn(c.bounce.h, 20, 100), `${label} bounce is warm (${c.bounce.h.toFixed(0)})`).toBe(true);
  expect(c.bounce.c, `${label} bounce chroma`).toBeGreaterThanOrEqual(0.04);
  expect(c.bounce.c, `${label} bounce chroma`).toBeLessThanOrEqual(0.12);

  expect(c.castShadow.l, `${label} cast shadow lightness`).toBeGreaterThanOrEqual(0.38);
  expect(c.castShadow.l, `${label} cast shadow lightness`).toBeLessThanOrEqual(0.62);
  expect(c.castShadow.c, `${label} cast shadow chroma`).toBeGreaterThanOrEqual(0.03);
  expect(c.castShadow.c, `${label} cast shadow chroma`).toBeLessThanOrEqual(0.09);
  expect(hueIn(c.castShadow.h, 180, 320), `${label} cast shadow is cool (${c.castShadow.h.toFixed(0)})`).toBe(true);
}

describe('colour combos', () => {
  it('has six soft-light combos, Linen first', () => {
    expect(PALETTES.length).toBe(6);
    expect(PALETTES[0].id).toBe('linen');
  });

  it('keeps the eight classic combos', () => {
    expect(CLASSIC_PALETTES.length).toBe(8);
  });

  it.each(PALETTES.map((p) => [p.name, p] as const))('%s follows the soft-light rules', (_, p) => {
    checkRules(p);
  });

  it('Shuffle always follows the soft-light rules', () => {
    for (let i = 0; i < 200; i++) checkRules(shufflePalette());
  });

  it('copies the glow colour into the settings', () => {
    const settings = defaultSettings();
    applyPalette(settings, PALETTES[1]);
    expect(settings.colour.glow).toBe(PALETTES[1].colours.glow);
  });

  it('defaults match the Linen combo', () => {
    const settings = defaultSettings();
    applyPalette(settings, PALETTES[0]);
    expect(settings).toEqual(defaultSettings());
  });
});
