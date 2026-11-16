/**
 * The cooking panel beside the card: the choices that steer what the ingredients become.
 *
 * Each choice is a row of chips (pick one) or a slider. A sensible default is picked to start
 * with; Reset brings the defaults back. The values are plain data (`CookChoices`), ready to be
 * handed to whatever makes the dish.
 */

export interface CookChoices {
  course: string;
  taste: string;
  method: string;
  style: string;
  /** 0 to 100: how hot it is cooked. */
  heat: number;
  /** 0 to 100: from a classic dish to something nobody has made before. */
  wild: number;
}

interface ChipGroup {
  key: 'course' | 'taste' | 'method' | 'style';
  label: string;
  options: string[];
}

const GROUPS: ChipGroup[] = [
  { key: 'course', label: 'Course', options: ['Starter', 'Main', 'Dessert', 'Snack', 'Drink'] },
  { key: 'taste', label: 'Taste', options: ['Savoury', 'Sweet', 'Both'] },
  { key: 'method', label: 'Method', options: ['Raw', 'Grill', 'Fry', 'Bake', 'Steam', 'Smoke', 'Ferment'] },
  { key: 'style', label: 'Style', options: ['Street food', 'Home cooking', 'Fine dining'] },
];

interface SliderSpec {
  key: 'heat' | 'wild';
  label: string;
  low: string;
  high: string;
}

const SLIDERS: SliderSpec[] = [
  { key: 'heat', label: 'Heat', low: 'Gentle', high: 'Blazing' },
  { key: 'wild', label: 'Wild level', low: 'Classic', high: 'Unhinged' },
];

export const DEFAULT_CHOICES: CookChoices = { course: 'Main', taste: 'Savoury', method: 'Grill', style: 'Home cooking', heat: 50, wild: 60 };

export interface CookPanel {
  choices(): CookChoices;
}

export function mountCookPanel(root: HTMLElement): CookPanel {
  const choices: CookChoices = { ...DEFAULT_CHOICES };

  const title = document.createElement('h2');
  title.className = 'cook-title';
  title.textContent = 'Cooking methods';
  root.append(title);

  const chipButtons: { group: ChipGroup; option: string; button: HTMLButtonElement }[] = [];
  for (const group of GROUPS) {
    const field = document.createElement('fieldset');
    field.className = 'cook-group';
    const legend = document.createElement('legend');
    legend.textContent = group.label;
    const row = document.createElement('div');
    row.className = 'cook-chips';
    for (const option of group.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = option;
      button.addEventListener('click', () => {
        choices[group.key] = option;
        paint();
      });
      row.append(button);
      chipButtons.push({ group, option, button });
    }
    field.append(legend, row);
    root.append(field);
  }

  const sliders: { spec: SliderSpec; input: HTMLInputElement }[] = [];
  for (const spec of SLIDERS) {
    const field = document.createElement('label');
    field.className = 'cook-slider';
    const name = document.createElement('span');
    name.className = 'cook-slider-name';
    name.textContent = spec.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.step = '1';
    input.addEventListener('input', () => {
      choices[spec.key] = Number(input.value);
      paint();
    });
    const ends = document.createElement('span');
    ends.className = 'cook-slider-ends';
    ends.innerHTML = `<span>${spec.low}</span><span>${spec.high}</span>`;
    field.append(name, input, ends);
    root.append(field);
    sliders.push({ spec, input });
  }

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'cook-reset';
  reset.textContent = 'Reset';
  reset.addEventListener('click', () => {
    Object.assign(choices, DEFAULT_CHOICES);
    paint();
  });
  root.append(reset);

  /** Show the current choices on the controls. */
  function paint(): void {
    for (const { group, option, button } of chipButtons) {
      const on = choices[group.key] === option;
      button.toggleAttribute('data-on', on);
      button.setAttribute('aria-pressed', String(on));
    }
    for (const { spec, input } of sliders) {
      input.value = String(choices[spec.key]);
      // The filled part of the track follows the value.
      input.style.setProperty('--fill', `${choices[spec.key]}%`);
    }
    const changed = (Object.keys(DEFAULT_CHOICES) as (keyof CookChoices)[]).some((key) => choices[key] !== DEFAULT_CHOICES[key]);
    reset.disabled = !changed;
  }
  paint();

  return { choices: () => ({ ...choices }) };
}
