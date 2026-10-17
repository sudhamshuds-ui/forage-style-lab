import { describe, expect, it } from 'vitest';
import { BRUSHES, DEFAULTS, GROUPS, PATTERNS, SPECS, isVisible, type Spec } from './params';
import { randomStrokes } from './randomize';

const visibleLabels = () =>
  GROUPS.flatMap(({ key }) =>
    (Object.values(SPECS[key]) as Spec[]).filter((s) => isVisible(key, s)).map((s) => s.label),
  );

const playful = () => {
  const start = structuredClone(DEFAULTS);
  start.brush.classic = true;
  return start;
};

describe('panel', () => {
  it('shows only the style, paint and form controls', () => {
    expect(visibleLabels()).toEqual(['Playful strokes', 'Brushiness', 'Wash bleed', 'Edge softness', 'Faceted']);
  });

  it('keeps the colour combos, light, texture, highlights and scene, just hidden', () => {
    const hiddenGroups = GROUPS.filter((g) => g.hidden).map((g) => g.key);
    expect(hiddenGroups).toEqual(expect.arrayContaining(['palette', 'lighting', 'highlight', 'scene']));
    expect(SPECS.paint.texture.hidden).toBe(true);
  });

  it('starts refined and faceted, with the frame and idle spin off', () => {
    expect(DEFAULTS.brush.classic).toBe(false);
    expect(DEFAULTS.shape.faceted).toBe(true);
    expect(DEFAULTS.scene.frame).toBe(false);
    expect(DEFAULTS.scene.idleSpin).toBe(false);
    expect(DEFAULTS.highlight.shape).toBe('sheen');
  });
});

describe('Randomize (playful strokes only)', () => {
  it('only changes the stroke settings, and keeps playful on', () => {
    for (let i = 0; i < 100; i++) {
      const start = playful();
      const next = randomStrokes(start);
      const { brush: _brushBefore, ...restBefore } = start;
      const { brush: _brushAfter, ...restAfter } = next;
      expect(restAfter).toEqual(restBefore);
      expect(next.brush.classic).toBe(true);
    }
  });

  it('picks strokes and patterns from the lists, and sizes inside their nice ranges', () => {
    const seenBrushes = new Set<string>();
    const seenPatterns = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const b = randomStrokes(playful()).brush;
      seenBrushes.add(b.type);
      seenPatterns.add(b.pattern);
      for (const key of ['size', 'length', 'texture', 'patternAmount'] as const) {
        const spec = SPECS.brush[key];
        if (spec.kind !== 'slider') throw new Error(key);
        expect(b[key]).toBeGreaterThanOrEqual(spec.nice[0]);
        expect(b[key]).toBeLessThanOrEqual(spec.nice[1]);
      }
    }
    expect([...seenBrushes].sort()).toEqual([...BRUSHES].sort());
    expect([...seenPatterns].sort()).toEqual([...PATTERNS].sort());
  });
});
