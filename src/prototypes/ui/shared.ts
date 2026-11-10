import { app } from '../../main';
import { findPainter, type Painter } from '../../painters';
import { paintLike } from '../../randomize';

/**
 * What every UI variant shares: the real app underneath, and small helpers to drive it.
 * Like a pre-comp each variant drops its own layer onto: the ingredient, its name, Shuffle,
 * the Painterly switch (Playful strokes) and the painters all come from the live Style Lab.
 */

/** The painting styles, from the default (Sargent, "normal painterly") to the boldest. */
export const STYLES: Painter[] = ['sargent', 'monet', 'degas', 'cezanne', 'seurat', 'van-gogh'].map(findPainter);

export const isPainterly = () => app.settings.brush.classic;
export const currentStyle = () => findPainter(app.settings.brush.painter);

/** Turn the painterly strokes on or off (the painter stays as it was). */
export function setPainterly(on: boolean): void {
  app.settings.brush.classic = on;
  app.redraw();
}

/** Paint like this painter (switches the strokes on too). */
export function setStyle(id: string): void {
  app.settings.brush.classic = true;
  Object.assign(app.settings.brush, paintLike(id));
  app.redraw();
}

const shuffleButton = () => document.getElementById('btn-shuffle-ingredient') as HTMLButtonElement;

/** Shuffle ingredient: the real button does the painted transition. */
export function shuffle(): void {
  shuffleButton().click();
}

/** Follow the ingredient's name (and its quick fade while it changes). Returns a stop function. */
export function watchName(onChange: (name: string, changing: boolean) => void): () => void {
  const label = document.getElementById('ingredient-name') as HTMLElement;
  const send = () => onChange(label.textContent ?? '', label.classList.contains('is-changing'));
  const observer = new MutationObserver(send);
  observer.observe(label, { attributes: true, childList: true, characterData: true, subtree: true });
  send();
  return () => observer.disconnect();
}

/** Follow whether a swap is playing (clicks are ignored meanwhile). Returns a stop function. */
export function watchBusy(onChange: (busy: boolean) => void): () => void {
  const button = shuffleButton();
  const send = () => onChange(button.classList.contains('is-busy'));
  const observer = new MutationObserver(send);
  observer.observe(button, { attributes: true, attributeFilter: ['class'] });
  send();
  return () => observer.disconnect();
}

/** A small HTML helper: build an element from markup. */
export function html<T extends HTMLElement = HTMLElement>(markup: string): T {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild as T;
}

/** The shuffle icon (two crossing arrows). */
export const SHUFFLE_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.45-7.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.97a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45"/></svg>`;

export interface Slots {
  over: HTMLElement;
  side: HTMLElement;
  below: HTMLElement;
}

export interface Variant {
  /** Mounts the variant's UI into the slots; returns a clean-up function. */
  mount(slots: Slots): () => void;
}
