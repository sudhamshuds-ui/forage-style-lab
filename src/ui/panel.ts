import { Pane } from 'tweakpane';
import { GROUPS, SPECS, type GroupKey, type Settings, type Spec } from '../params';

/**
 * Builds the parameter panel from the specs in params.ts.
 *
 * Tweakpane "binds" each control to a value in the settings object: moving
 * a slider writes straight into `settings`, and pane.refresh() does the
 * reverse (updates the controls after Randomize or Reset).
 *
 * The look of the panel comes from panel.css.
 */
export function createPanel(
  container: HTMLElement,
  settings: Settings,
  onChange: (group: GroupKey) => void,
): Pane {
  const pane = new Pane({ container });

  for (const group of GROUPS) {
    const folder = pane.addFolder({ title: group.title, expanded: group.expanded });
    const target = settings[group.key] as unknown as Record<string, unknown>;
    for (const [key, spec] of Object.entries(SPECS[group.key]) as [string, Spec][]) {
      const binding = folder.addBinding(target, key, bindingOptions(spec));
      binding.on('change', () => onChange(group.key));
      // Give every input a name, so screen readers say "Facets" instead of "on" or "62%".
      binding.element.querySelectorAll('input, [tabindex]').forEach((el) => {
        el.setAttribute('aria-label', spec.label);
      });
    }
  }

  return pane;
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
  }
}
