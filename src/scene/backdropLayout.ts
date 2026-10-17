/**
 * The Backdrop slider, turned into an arrangement of the room.
 *
 * Think of the slider as flipping through thumbnail sketches of the same
 * still life: how big the patch of window light on the table is, where it
 * falls around the apple, how far the wall and table colours are pushed
 * apart, and how the big calm brush slabs are laid out. Every position is a
 * calm composition, and the same value always gives the same arrangement.
 *
 * The room is real 3D (see background.ts), so these are distances on the
 * floor, measured in apple radii. The light patch always runs along the
 * direction the light comes from, so it turns with the room as you orbit.
 */
export interface BackdropLayout {
  /** How far the light patch's centre sits from the apple, toward the light (apple radii). */
  patchOffset: number;
  /** Half-length of the light patch, along the light (apple radii). */
  patchLength: number;
  /** Half-width of the light patch, across the light (apple radii). */
  patchWidth: number;
  /** A small turn of the patch away from the light direction, in radians. */
  patchTurn: number;
  /** How far apart the wall and table colours are pushed. 0 = as the combo, 1 = clearly separated. */
  contrast: number;
  /** Shifts the grid of backdrop slabs, so each arrangement gets its own brushwork. */
  slabShift: number;
}

/** A smooth wave between `min` and `max`, so neighbouring slider values look alike. */
const wave = (t: number, cycles: number, phase: number, min: number, max: number) =>
  min + (max - min) * (0.5 + 0.5 * Math.sin((t * cycles + phase) * Math.PI * 2));

export function backdropLayout(backdrop: number): BackdropLayout {
  const t = Math.min(100, Math.max(0, backdrop)) / 100;
  return {
    patchOffset: wave(t, 1.1, 0.35, 0.35, 1.15),
    patchLength: wave(t, 0.7, 0.8, 2.7, 4.3),
    patchWidth: wave(t, 1.6, 0.5, 1.7, 2.5),
    patchTurn: wave(t, 0.8, 0.2, -0.3, 0.3),
    contrast: wave(t, 0.6, 0.75, 0.15, 0.85),
    slabShift: t * 100,
  };
}
