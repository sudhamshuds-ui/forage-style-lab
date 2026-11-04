import { GROUPS, defaultSettings, type Settings } from '../params';
import { randomStrokes } from '../randomize';
import type { Panel } from './panel';

/**
 * The buttons: Reset under the panel, and Randomize (which lives in the Style
 * section and only shows while Playful strokes is on). Returns the Randomize
 * action for the panel's button. (Copy settings was removed at the user's
 * request, 2026-11-05.)
 *
 * `ingredient.afterReset` puts the ingredient's room back after Reset restores
 * the default style.
 */
export function setupActions(
  settings: Settings,
  panel: Panel,
  onApplied: () => void,
  ingredient: { afterReset: () => void },
): { randomize: () => void } {
  const apply = (next: Settings, after?: () => void) => {
    applySettings(settings, next);
    after?.();
    panel.refresh();
    onApplied();
  };

  button('btn-reset').addEventListener('click', () => apply(defaultSettings(), ingredient.afterReset));

  return { randomize: () => apply(randomStrokes(settings)) };
}

/**
 * Copy values into the existing settings object, group by group.
 * We keep the same objects (instead of replacing them) because the panel is
 * bound to them.
 */
function applySettings(target: Settings, source: Settings): void {
  for (const { key } of GROUPS) Object.assign(target[key], structuredClone(source[key]));
}

function button(id: string): HTMLButtonElement {
  return document.getElementById(id) as HTMLButtonElement;
}
