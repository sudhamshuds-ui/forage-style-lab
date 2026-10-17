import { describe, expect, it } from 'vitest';
import { DEFAULTS, GROUPS, SPECS, isVisible, type GroupKey, type Spec } from './params';
import { randomSettings } from './randomize';

const visibleLabels = () =>
  GROUPS.flatMap(({ key }) =>
    (Object.values(SPECS[key]) as Spec[]).filter((s) => isVisible(key, s)).map((s) => s.label),
  );

describe('panel', () => {
  it('shows exactly the stylization controls', () => {
    expect(visibleLabels()).toEqual([
      'Colour combo',
      'Brushiness',
      'Wash bleed',
      'Edge softness',
      'Texture',
      'Glow',
      'Shadow colour',
      'Shape',
      'Size',
      'Rim glints',
      'Backdrop',
      'Idle spin',
    ]);
  });

  it('starts with the frame off and idle spin off', () => {
    expect(DEFAULTS.scene.frame).toBe(false);
    expect(DEFAULTS.scene.idleSpin).toBe(false);
    expect(DEFAULTS.brush.classic).toBe(false);
  });
});

describe('randomize', () => {
  it('keeps every visible slider inside its nice range and leaves hidden values alone', () => {
    for (let i = 0; i < 200; i++) {
      const next = randomSettings(structuredClone(DEFAULTS));
      for (const { key } of GROUPS) {
        for (const [name, spec] of Object.entries(SPECS[key as GroupKey]) as [string, Spec][]) {
          const value = (next[key as GroupKey] as unknown as Record<string, unknown>)[name];
          const before = (DEFAULTS[key as GroupKey] as unknown as Record<string, unknown>)[name];
          if (!isVisible(key as GroupKey, spec)) {
            // Colour, light and scene colours are rewritten by the colour combo.
            if (key !== 'colour' && key !== 'light' && key !== 'scene') expect(value).toEqual(before);
          } else if (spec.kind === 'slider' && spec.random !== false) {
            expect(value as number).toBeGreaterThanOrEqual(spec.nice[0]);
            expect(value as number).toBeLessThanOrEqual(spec.nice[1]);
          }
        }
      }
      expect(next.scene.frame).toBe(false);
      expect(next.brush.classic).toBe(false);
    }
  });
});
