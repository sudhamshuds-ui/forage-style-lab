/**
 * The Backdrop slider, turned into an arrangement of the wall and table.
 *
 * Think of the slider as flipping through a set of thumbnail sketches of the
 * same still life: where the table edge sits, how it tilts, and where the
 * patch of window light falls on the table. Every position is a calm
 * composition, and the same value always gives the same arrangement.
 *
 * Screen positions run from 0 (bottom / left) to 1 (top / right).
 */
export interface BackdropLayout {
  /** Height of the line where wall meets table. */
  horizon: number;
  /** Slope of that line, in radians. Small, so the table never looks like it is sliding. */
  tilt: number;
  /** Centre of the window light patch. Always on the table, below the horizon. */
  patchCentre: { x: number; y: number };
  /** Direction the light patch runs, in radians. */
  patchAngle: number;
  /** Width of the light patch, as a fraction of the screen height. */
  patchWidth: number;
  /** How far apart the wall and table colours are pushed. 0 = as the combo, 1 = clearly separated. */
  contrast: number;
}

/** A smooth wave between `min` and `max`, so neighbouring slider values look alike. */
const wave = (t: number, cycles: number, phase: number, min: number, max: number) =>
  min + (max - min) * (0.5 + 0.5 * Math.sin((t * cycles + phase) * Math.PI * 2));

export function backdropLayout(backdrop: number): BackdropLayout {
  const t = Math.min(100, Math.max(0, backdrop)) / 100;
  const horizon = wave(t, 0.9, 0.1, 0.3, 0.46);
  return {
    horizon,
    tilt: wave(t, 1.3, 0.6, -0.1, 0.1),
    patchCentre: {
      x: wave(t, 1.1, 0.35, 0.22, 0.78),
      y: horizon * wave(t, 0.7, 0.8, 0.35, 0.62),
    },
    patchAngle: wave(t, 0.8, 0.2, -0.75, -0.25),
    patchWidth: wave(t, 1.6, 0.5, 0.1, 0.2),
    contrast: wave(t, 0.6, 0.75, 0.15, 0.85),
  };
}
