import { Pane } from 'tweakpane';
import { GROUPS, SPECS, isVisible, type GroupKey, type Settings, type Spec } from '../params';
import { createPalettePicker } from './palettePicker';

/**
 * Builds the parameter panel from the specs in params.ts.
 *
 * Tweakpane "binds" each control to a value in the settings object: moving
 * a slider writes straight into `settings`, and refresh() does the reverse
 * (updates the controls after Randomize or Reset).
 *
 * Hidden groups and controls (see params.ts) are skipped. The colour combo
 * picker is our own little component (palettePicker.ts), the rest is Tweakpane.
 * The look of the panel comes from panel.css.
 */
export interface Panel {
  refresh(): void;
}

export function createPanel(
  paletteContainer: HTMLElement,
  paneContainer: HTMLElement,
  settings: Settings,
  onChange: (group: GroupKey) => void,
): Panel {
  const palettePicker = createPalettePicker(paletteContainer, settings, () => onChange('palette'));
  const pane = new Pane({ container: paneContainer });

  for (const group of GROUPS) {
    if (group.hidden || group.key === 'palette') continue;
    const visibleSpecs = (Object.entries(SPECS[group.key]) as [string, Spec][]).filter(([, spec]) =>
      isVisible(group.key, spec),
    );
    if (visibleSpecs.length === 0) continue;

    const folder = pane.addFolder({ title: group.title, expanded: group.expanded });
    const target = settings[group.key] as unknown as Record<string, unknown>;
    for (const [key, spec] of visibleSpecs) {
      const binding = folder.addBinding(target, key, bindingOptions(spec));
      binding.on('change', () => onChange(group.key));
      // Give every input a name, so screen readers say "Stroke size" instead of "45%".
      binding.element.querySelectorAll('input, select, [tabindex]').forEach((el) => {
        el.setAttribute('aria-label', spec.label);
      });
    }
  }

  return {
    refresh() {
      pane.refresh();
      palettePicker.refresh();
    },
  };
}

function bindingOptions(spec: Spec): Record<string, unknown> {
  switch (spec.kind) {
    case 'slider':
      return {
        label: spec.label,
        min: spec.min,
        max: spec.max,
        step: spec.step,
        format: (v: number) => (spec.unit === '%' ? `${Math.round(v)}%` : `${Math.round(v)}`),
      };
    case 'list':
      return {
        label: spec.label,
        options: spec.options.map((o) => ({ text: o.label, value: o.value })),
      };
    case 'colour':
      return { label: spec.label, view: 'color' };
    case 'toggle':
      return { label: spec.label };
    case 'pad':
      return {
        label: spec.label,
        picker: 'inline',
        expanded: true,
        x: { min: -1, max: 1, step: 0.01 },
        y: { min: -1, max: 1, step: 0.01, inverted: true },
      };
    case 'palette':
      return { label: spec.label };
  }
}
