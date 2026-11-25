/**
 * The cooking panel beside the card: the few choices that steer what the ingredients become.
 *
 * Kept small on purpose (the user, 2026-11-16: "less parameters"): the course, the taste, and
 * how wild the result may be. Each has a default; Reset brings the defaults back. The values
 * are plain data (`CookChoices`), ready to be handed to whatever makes the dish.
 */

export interface CookChoices {
  course: string;
  taste: string;
  /** 0 to 100: from a classic dish to something nobody has made before. */
  wild: number;
}

interface ChipGroup {
  key: 'course' | 'taste';
  label: string;
  options: string[];
}

const GROUPS: ChipGroup[] = [
  { key: 'course', label: 'Course', options: ['Starter', 'Main', 'Dessert', 'Snack', 'Drink'] },
  { key: 'taste', label: 'Taste', options: ['Savoury', 'Sweet', 'Both'] },
];

export const DEFAULT_CHOICES: CookChoices = { course: 'Main', taste: 'Savoury', wild: 60 };

export interface CookPanel {
  choices(): CookChoices;
  /** Cook can be pressed only while something is on the table. */
  setCanCook(can: boolean): void;
  /** While the dish is being plated (a few seconds of physics): Cook reads "Cooking" and waits. */
  setBusy(busy: boolean): void;
}

const RESET_ICON = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`;

export function mountCookPanel(root: HTMLElement, options: { onCook: (choices: CookChoices) => void }): CookPanel {
  const choices: CookChoices = { ...DEFAULT_CHOICES };

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

  // Wild level: a slider from Classic to Unhinged, with a line saying what it does.
  const wild = document.createElement('label');
  wild.className = 'cook-group cook-slider';
  const name = document.createElement('span');
  name.className = 'cook-label';
  name.textContent = 'Wild level';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.step = '1';
  input.addEventListener('input', () => {
    choices.wild = Number(input.value);
    paint();
  });
  const ends = document.createElement('span');
  ends.className = 'cook-slider-ends';
  ends.innerHTML = '<span>Classic</span><span>Unhinged</span>';
  const note = document.createElement('span');
  note.className = 'cook-note';
  note.textContent = 'Unhinged gives you more unexpected results.';
  wild.append(name, input, ends, note);
  root.append(wild);

  // The foot of the panel: Cook, the main action, and a small Reset beside it.
  const foot = document.createElement('div');
  foot.className = 'cook-foot';
  const cook = document.createElement('button');
  cook.type = 'button';
  cook.className = 'cook-go';
  cook.textContent = 'Cook';
  cook.disabled = true;
  cook.addEventListener('click', () => options.onCook({ ...choices }));
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'cook-reset';
  reset.setAttribute('aria-label', 'Reset the choices');
  reset.title = 'Reset';
  reset.innerHTML = RESET_ICON;
  reset.addEventListener('click', () => {
    Object.assign(choices, DEFAULT_CHOICES);
    paint();
  });
  foot.append(cook, reset);
  root.append(foot);

  /** Show the current choices on the controls. */
  function paint(): void {
    for (const { group, option, button } of chipButtons) {
      const on = choices[group.key] === option;
      button.toggleAttribute('data-on', on);
      button.setAttribute('aria-pressed', String(on));
    }
    input.value = String(choices.wild);
    // The filled part of the track follows the value.
    input.style.setProperty('--fill', `${choices.wild}%`);
    const changed = (Object.keys(DEFAULT_CHOICES) as (keyof CookChoices)[]).some((key) => choices[key] !== DEFAULT_CHOICES[key]);
    reset.disabled = !changed;
  }
  paint();

  let canCook = false;
  let busy = false;
  const refresh = () => {
    cook.disabled = !canCook || busy;
    cook.textContent = busy ? 'Cooking' : 'Cook';
    cook.dataset.busy = String(busy);
    cook.setAttribute('aria-busy', String(busy));
  };
  return {
    choices: () => ({ ...choices }),
    setCanCook: (can) => ((canCook = can), refresh()),
    setBusy: (on) => ((busy = on), refresh()),
  };
}
