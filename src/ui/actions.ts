import { GROUPS, defaultSettings, type Settings } from '../params';
import { randomStrokes } from '../randomize';
import type { Panel } from './panel';

/**
 * The buttons: Reset and Copy settings under the panel, and Randomize (which
 * lives in the Style section and only shows while Playful strokes is on).
 * Returns the Randomize action for the panel's button.
 */
export function setupActions(settings: Settings, panel: Panel, onApplied: () => void): { randomize: () => void } {
  const apply = (next: Settings) => {
    applySettings(settings, next);
    panel.refresh();
    onApplied();
  };

  button('btn-reset').addEventListener('click', () => apply(defaultSettings()));
  button('btn-copy').addEventListener('click', async () => {
    const json = JSON.stringify({ ingredient: 'apple', version: 2, ...settings }, null, 2);
    const copied = await copyText(json);
    showToast(copied ? 'Settings copied as JSON' : 'Could not copy. Check the browser console.');
    if (!copied) console.log(json);
  });

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

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older fallback for browsers that block the clipboard API.
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

let toastTimer = 0;
function showToast(message: string): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
}
