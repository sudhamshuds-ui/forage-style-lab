/**
 * The kit's side panel: Prep (a row of chips, pick one), Heat (a slider from frozen to burnt,
 * naming where it is) and a Reset. It uses the kitchen panel's styles (kitchen.css).
 */
export interface KitChoices {
  prep: string;
  /** 0 to 100, frozen to burnt. */
  heat: number;
}

export interface KitPanel {
  /** Show these values (used when New ingredient resets everything). */
  set(values: KitChoices): void;
}

export function mountKitPanel(
  root: HTMLElement,
  options: { preps: readonly string[]; defaults: KitChoices; heatName: (value: number) => string; onChange: (values: KitChoices, what: 'prep' | 'heat' | 'reset') => void },
): KitPanel {
  const values: KitChoices = { ...options.defaults };

  // Prep: chips.
  const prep = document.createElement('fieldset');
  prep.className = 'cook-group';
  const legend = document.createElement('legend');
  legend.textContent = 'Prep';
  const chips = document.createElement('div');
  chips.className = 'cook-chips';
  const buttons = options.preps.map((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = option;
    button.addEventListener('click', () => {
      if (values.prep === option) return;
      values.prep = option;
      paint();
      options.onChange({ ...values }, 'prep');
    });
    chips.append(button);
    return { option, button };
  });
  prep.append(legend, chips);
  root.append(prep);

  // Heat: a slider, with the name of where it stands beside the label.
  const heat = document.createElement('label');
  heat.className = 'cook-group cook-slider';
  const name = document.createElement('span');
  name.className = 'cook-label kit-heat-label';
  const title = document.createElement('span');
  title.textContent = 'Heat';
  const now = document.createElement('span');
  now.className = 'kit-heat-now';
  name.append(title, now);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.step = '1';
  input.addEventListener('input', () => {
    values.heat = Number(input.value);
    paint();
    options.onChange({ ...values }, 'heat');
  });
  const ends = document.createElement('span');
  ends.className = 'cook-slider-ends';
  ends.innerHTML = '<span>Frozen</span><span>Burnt</span>';
  heat.append(name, input, ends);
  root.append(heat);

  const foot = document.createElement('div');
  foot.className = 'cook-foot';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'kit-reset';
  reset.textContent = 'Reset';
  reset.addEventListener('click', () => {
    Object.assign(values, options.defaults);
    paint();
    options.onChange({ ...values }, 'reset');
  });
  foot.append(reset);
  root.append(foot);

  function paint(): void {
    for (const { option, button } of buttons) {
      const on = values.prep === option;
      button.toggleAttribute('data-on', on);
      button.setAttribute('aria-pressed', String(on));
    }
    input.value = String(values.heat);
    input.style.setProperty('--fill', `${values.heat}%`);
    now.textContent = options.heatName(values.heat);
    reset.disabled = values.prep === options.defaults.prep && values.heat === options.defaults.heat;
  }
  paint();

  return {
    set(next) {
      Object.assign(values, next);
      paint();
    },
  };
}
