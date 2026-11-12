import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

/**
 * Motion for the page, with GSAP (https://gsap.com/), added 2026-11-12 at the user's request.
 *
 * Think of this file as the project's motion presets panel: one place that names the curves we
 * use, so a tween anywhere says ease: 'swap' instead of repeating a cubic-bezier.
 *
 * Which tool for which animation (keep to this when adding motion):
 *   - GSAP: animations driven from code on the page (a fade started by a click, a sequence of
 *     steps, a value that has to be set every frame on an SVG filter). Import from here.
 *   - CSS transitions and keyframes: hover, press and the New ingredient loading fill. They run
 *     off the main thread, so they stay smooth while the Shuffle transition keeps the graphics
 *     busy, and they can be interrupted for free.
 *   - The render loop's own clock: anything inside the painting (the idle spin, the Shuffle
 *     transition's strokes). They advance by the loop's frame time, so `styleLab.filmstrip`
 *     can play them frame by frame, exactly; a GSAP tween runs on wall-clock time instead.
 */
gsap.registerPlugin(CustomEase);

/** The project's named curves, the same values the CSS uses. */
export const EASE = {
  /** The Shuffle swap's curve (the loading fill and the transition): slow in, fast, slow out. */
  swap: CustomEase.create('swap', '0.77, 0, 0.175, 1'),
  /** A strong ease-out for things arriving or answering a click (emil-design-eng). */
  out: CustomEase.create('out', '0.23, 1, 0.32, 1'),
  /** A gentle, drawer-like settle (the loading fill fading back to glass). */
  drawer: CustomEase.create('drawer', '0.32, 0.72, 0, 1'),
  /** CSS's plain `ease-out`, for short fades. */
  fade: CustomEase.create('fade', '0, 0, 0.58, 1'),
} as const;

/** True when the viewer asked for less motion: skip movement, keep quick fades. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export { gsap };
