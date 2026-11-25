/**
 * The cooking panel beside the card: the few choices that steer what the ingredients become.
 *
 * Kept small on purpose (the user, 2026-11-16: "less parameters"): the course, the taste, and
 * how wild the result may be. Each has a default; Randomise picks new ones at random. The values
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
  /** A short line under Cook when a cook failed (never a silent click); empty clears it. */
  showError(text: string): void;
}

/** Two dice (Randomise), tumbling: the back one masked where the front one overlaps it. */
const RANDOM_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><defs><mask id="dice-front"><rect width="24" height="24" fill="#fff"/><path transform="rotate(-10 8 15.5)" d="M8 9.5 13.2 12.5 13.2 18.5 8 21.5 2.8 18.5 2.8 12.5Z" fill="#000" stroke="#000" stroke-width="3.2"/></mask></defs><g mask="url(#dice-front)" transform="rotate(12 16 8.5)"><path d="M16 3 20.8 5.75 20.8 11.25 16 14 11.2 11.25 11.2 5.75Z"/><path d="M11.2 5.75 16 8.5 20.8 5.75M16 8.5V14"/><circle cx="16" cy="5.75" r=".62" fill="currentColor" stroke="none"/><circle cx="18.4" cy="9.1" r=".58" fill="currentColor" stroke="none"/><circle cx="13.6" cy="9.1" r=".58" fill="currentColor" stroke="none"/><circle cx="13.6" cy="11.6" r=".58" fill="currentColor" stroke="none"/></g><g transform="rotate(-10 8 15.5)"><path d="M8 9.5 13.2 12.5 13.2 18.5 8 21.5 2.8 18.5 2.8 12.5Z"/><path d="M2.8 12.5 8 15.5 13.2 12.5M8 15.5V21.5"/><circle cx="6.6" cy="12.5" r=".62" fill="currentColor" stroke="none"/><circle cx="9.4" cy="12.5" r=".62" fill="currentColor" stroke="none"/><circle cx="4.6" cy="16.6" r=".58" fill="currentColor" stroke="none"/><circle cx="6.2" cy="19.2" r=".58" fill="currentColor" stroke="none"/><circle cx="10.6" cy="18" r=".58" fill="currentColor" stroke="none"/></g></svg>`;


export function mountCookPanel(root: HTMLElement, options: { onCook: (choices: CookChoices) => void; onRandomise?: (choices: CookChoices) => void }): CookPanel {
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

  // The foot of the panel: Cook, the main action, and a small Randomise beside it.
  const foot = document.createElement('div');
  foot.className = 'cook-foot';
  const cook = document.createElement('button');
  cook.type = 'button';
  cook.className = 'cook-go';
  cook.textContent = 'Cook';
  cook.disabled = true;
  cook.addEventListener('click', () => options.onCook({ ...choices }));
  // Randomise (Group 4, in place of Reset): a random course, taste and wild level. The table stays.
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'cook-reset';
  reset.setAttribute('aria-label', 'Randomise the choices');
  reset.title = 'Randomise';
  reset.innerHTML = RANDOM_ICON;
  reset.addEventListener('click', () => {
    const any = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
    for (const group of GROUPS) choices[group.key] = any(group.options.filter((option) => option !== choices[group.key]));
    choices.wild = Math.round(Math.random() * 20) * 5;
    paint();
    options.onRandomise?.({ ...choices });
  });
  foot.append(cook, reset);
  root.append(foot);
  const error = document.createElement('p');
  error.className = 'cook-error';
  error.setAttribute('role', 'status');
  root.append(error);

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
    reset.disabled = false;
  }
  let canCook = false;
  paint();

  let busy = false;
  const refresh = () => {
    cook.disabled = !canCook || busy;
    cook.textContent = busy ? 'Cooking' : 'Cook';
    cook.dataset.busy = String(busy);
    cook.setAttribute('aria-busy', String(busy));
  };
  return {
    choices: () => ({ ...choices }),
    setCanCook: (can) => ((canCook = can), refresh(), paint()),
    showError: (text) => {
      error.textContent = text;
      error.hidden = !text;
    },
    setBusy: (on) => ((busy = on), refresh()),
  };
}
