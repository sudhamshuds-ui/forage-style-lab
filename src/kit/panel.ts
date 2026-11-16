/**
 * The kit's side panel: rows of chips, one row per parameter (pick one in each), and a Reset.
 * It looks and behaves like the kitchen's panel (the same styles, kitchen.css).
 */
export interface ChipRow<K extends string> {
  key: K;
  label: string;
  options: readonly string[];
}

export function mountKitPanel<K extends string>(
  root: HTMLElement,
  rows: ChipRow<K>[],
  defaults: Record<K, string>,
  onChange: (values: Record<K, string>) => void,
): void {
  const values = { ...defaults };
  const buttons: { key: K; option: string; button: HTMLButtonElement }[] = [];

  for (const row of rows) {
    const field = document.createElement('fieldset');
    field.className = 'cook-group';
    const legend = document.createElement('legend');
    legend.textContent = row.label;
    const chips = document.createElement('div');
    chips.className = 'cook-chips';
    for (const option of row.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = option;
      button.addEventListener('click', () => {
        if (values[row.key] === option) return;
        values[row.key] = option;
        paint();
        onChange({ ...values });
      });
      chips.append(button);
      buttons.push({ key: row.key, option, button });
    }
    field.append(legend, chips);
    root.append(field);
  }

  const foot = document.createElement('div');
  foot.className = 'cook-foot';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'kit-reset';
  reset.textContent = 'Reset';
  reset.addEventListener('click', () => {
    Object.assign(values, defaults);
    paint();
    onChange({ ...values });
  });
  foot.append(reset);
  root.append(foot);

  function paint(): void {
    for (const { key, option, button } of buttons) {
      const on = values[key] === option;
      button.toggleAttribute('data-on', on);
      button.setAttribute('aria-pressed', String(on));
    }
    reset.disabled = (Object.keys(defaults) as K[]).every((key) => values[key] === defaults[key]);
  }
  paint();
}
