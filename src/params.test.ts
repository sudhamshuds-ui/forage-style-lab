import { describe, expect, it } from 'vitest';
import { DEFAULTS, GROUPS, SPECS, isVisible, type Spec } from './params';
import { randomStrokes } from './randomize';
import { PAINTERS, findPainter } from './painters';

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
  it('shows Playful strokes and the three light controls (Paint and Background colour are hidden, still working)', () => {
    expect(visibleLabels()).toEqual(['Playful strokes', 'Strength', 'Tone bands']);
  });

  it('keeps the Faceted switch, hidden and off: every form is smooth', () => {
    expect(SPECS.shape.faceted.hidden).toBe(true);
    expect(DEFAULTS.shape.faceted).toBe(false);
  });

  it('keeps paint, texture, highlights, scene and the other light controls, just hidden', () => {
    const hiddenGroups = GROUPS.filter((g) => g.hidden).map((g) => g.key);
    expect(hiddenGroups).toEqual(expect.arrayContaining(['palette', 'paint', 'lighting', 'highlight', 'scene']));
    for (const key of ['direction', 'softness', 'paintEdges', 'ambient', 'ambientAmount', 'bounce', 'bounceAmount'] as const) {
      expect(SPECS.light[key].hidden).toBe(true);
    }
    expect(SPECS.paint.texture.hidden).toBe(true);
  });

  it('starts refined and smooth, with the frame off and the idle spin on', () => {
    expect(DEFAULTS.brush.classic).toBe(false);
    expect(DEFAULTS.shape.faceted).toBe(false);
    expect(DEFAULTS.scene.frame).toBe(false);
    expect(DEFAULTS.scene.idleSpin).toBe(true);
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

  it('picks a different painter each time, and rolls every setting inside that painter\'s ranges', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const start = playful();
      start.brush.painter = PAINTERS[i % PAINTERS.length].id;
      const b = randomStrokes(start).brush;
      expect(b.painter).not.toBe(start.brush.painter);
      seen.add(b.painter);
      const p = findPainter(b.painter);
      expect(b.type).toBe(p.type);
      expect(b.pattern).toBe(p.pattern);
      for (const key of ['size', 'length', 'texture', 'loose', 'colourBreak', 'followForm', 'backdrop', 'swirl'] as const) {
        expect(b[key]).toBeGreaterThanOrEqual(p[key][0]);
        expect(b[key]).toBeLessThanOrEqual(p[key][1]);
      }
    }
    expect([...seen].sort()).toEqual(PAINTERS.map((p) => p.id).sort());
  });

  it('starts as a real painter, with every default inside that painter\'s ranges', () => {
    const p = findPainter(DEFAULTS.brush.painter);
    expect(p.id).toBe(DEFAULTS.brush.painter);
    for (const key of ['size', 'length', 'texture', 'loose', 'colourBreak', 'followForm', 'backdrop', 'swirl'] as const) {
      expect(DEFAULTS.brush[key]).toBeGreaterThanOrEqual(p[key][0]);
      expect(DEFAULTS.brush[key]).toBeLessThanOrEqual(p[key][1]);
    }
  });
});

describe('soft light', () => {
  it('is shared by every ingredient and starts soft, with more fill', () => {
    expect(DEFAULTS.light.strength).toBe(55);
    expect(SPECS.light.strength.label).toBe('Strength');
    expect(DEFAULTS.light.softness).toBeGreaterThanOrEqual(30);
  });
});
