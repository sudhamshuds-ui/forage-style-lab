import type { Settings } from '../params';
import { PALETTES, applyPalette, currentColours, shufflePalette, type RoomColours } from '../palettes';

/**
 * The colour combo picker: a list of ready-made rooms, each with a tiny
 * painting as its swatch (wall, table, cast shadow, and the fruit in its own
 * colours), like the preset list in references/ui/02.
 *
 * "Shuffle" invents a new room that follows the same colour rules.
 */
export function createPalettePicker(container: HTMLElement, settings: Settings, onChange: () => void) {
  container.innerHTML = `
    <div class="palette-head">
      <span class="palette-title">Colour combo</span>
      <button type="button" class="palette-shuffle">Shuffle</button>
    </div>
    <div class="palette-grid" role="radiogroup" aria-label="Colour combo"></div>
  `;
  const grid = container.querySelector('.palette-grid') as HTMLElement;
  const shuffleButton = container.querySelector('.palette-shuffle') as HTMLButtonElement;

  const render = () => {
    const items = PALETTES.map((p) => ({ id: p.id, name: p.name, colours: p.colours }));
    if (settings.palette.preset === 'shuffled') {
      items.push({ id: 'shuffled', name: 'Shuffled', colours: currentColours(settings) });
    }
    grid.innerHTML = items
      .map(
        (item) => `
        <button type="button" class="palette-item${item.id === settings.palette.preset ? ' is-active' : ''}"
          role="radio" aria-checked="${item.id === settings.palette.preset}" data-id="${item.id}">
          ${swatch(item.colours, settings.colour)}
          <span class="palette-name">${item.name}</span>
        </button>`,
      )
      .join('');
  };

  grid.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.palette-item');
    if (!button) return;
    const palette = PALETTES.find((p) => p.id === button.dataset.id);
    if (!palette) return; // "Shuffled" is already applied
    applyPalette(settings, palette);
    render();
    onChange();
  });

  shuffleButton.addEventListener('click', () => {
    applyPalette(settings, shufflePalette(settings.colour.base));
    render();
    onChange();
  });

  render();
  return { refresh: render };
}

/** A tiny painting: wall, table, an apple with a shadow side, and a highlight. */
function swatch(c: RoomColours, fruit: Settings['colour']): string {
  return `
    <svg class="palette-swatch" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="${c.wall}" />
      <rect y="21" width="32" height="11" fill="${c.table}" />
      <ellipse cx="13" cy="25.5" rx="9" ry="2.2" fill="${c.castShadow}" opacity="0.7" />
      <circle cx="16" cy="18" r="8" fill="${fruit.shadow}" />
      <circle cx="17.6" cy="16.6" r="6.6" fill="${fruit.base}" />
      <circle cx="20" cy="14.5" r="1.4" fill="${fruit.highlight}" opacity="0.8" />
    </svg>`;
}
