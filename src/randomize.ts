import { GROUPS, SPECS, type Settings, type Spec } from './params';
import { lerpHue, oklchToHex } from './utils/colour';

/**
 * Randomize: new values that still look good.
 *
 * Numbers are picked from each slider's "nice" range in params.ts.
 * Colours follow the painting rules from the references instead of being
 * fully random:
 *   - pick a base hue for the apple
 *   - shadow: darker, and shifted toward violet (cool shadows)
 *   - highlight: very light, low saturation, shifted toward warm peach
 *   - wall: roughly opposite the apple on the colour wheel, so the apple pops
 *   - table: a neighbour of the wall; bounce light borrows the table colour
 *   - ambient light borrows the wall colour
 */

const between = (min: number, max: number) => min + Math.random() * (max - min);

export function randomSettings(current: Settings): Settings {
  const next = structuredClone(current);

  for (const { key: group } of GROUPS) {
    const values = next[group] as unknown as Record<string, unknown>;
    for (const [key, spec] of Object.entries(SPECS[group]) as [string, Spec][]) {
      if (spec.kind === 'slider' && spec.random !== false) {
        const raw = between(spec.nice[0], spec.nice[1]);
        values[key] = Math.round(raw / spec.step) * spec.step;
      } else if (spec.kind === 'toggle' && spec.random) {
        values[key] = Math.random() < 0.6;
      } else if (spec.kind === 'pad') {
        values[key] = {
          x: Number(between(spec.nice.x[0], spec.nice.x[1]).toFixed(2)),
          y: Number(between(spec.nice.y[0], spec.nice.y[1]).toFixed(2)),
        };
      }
    }
  }

  const palette = randomPalette();
  Object.assign(next.colour, palette.colour);
  Object.assign(next.light, palette.light);
  Object.assign(next.scene, palette.scene);
  return next;
}

function randomPalette() {
  const hue = between(0, 360);
  const wallHue = hue + between(140, 220);
  const tableHue = wallHue + (Math.random() < 0.5 ? -1 : 1) * between(70, 150);
  const stemHue = between(115, 150);

  return {
    colour: {
      base: oklchToHex(between(0.5, 0.62), between(0.13, 0.19), hue),
      shadow: oklchToHex(between(0.26, 0.34), between(0.08, 0.13), lerpHue(hue, 300, between(0.3, 0.6))),
      highlight: oklchToHex(between(0.87, 0.93), between(0.04, 0.07), lerpHue(hue, 60, between(0.4, 0.7))),
      stem: oklchToHex(between(0.5, 0.6), between(0.12, 0.17), stemHue),
      leaf: oklchToHex(between(0.56, 0.66), between(0.12, 0.17), stemHue + between(-10, 10)),
    },
    light: {
      ambient: oklchToHex(between(0.64, 0.74), between(0.08, 0.12), wallHue),
      bounce: oklchToHex(between(0.58, 0.68), between(0.1, 0.15), tableHue),
    },
    scene: {
      backgroundTop: oklchToHex(between(0.36, 0.48), between(0.09, 0.15), wallHue),
      backgroundBottom: oklchToHex(between(0.46, 0.6), between(0.09, 0.15), tableHue),
      shadowColour: oklchToHex(between(0.18, 0.26), between(0.03, 0.07), lerpHue(tableHue, 280, 0.5)),
    },
  };
}
