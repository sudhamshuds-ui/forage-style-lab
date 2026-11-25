import { describe, expect, it } from 'vitest';
import { REGISTRY } from './registry';
import { BUILDABLE_FORMS, TRAITS, heroPriority } from './traits';
import { elementLooks, makeElement } from '../dishes/compose/elements';
import { seededRandom } from './forms/kit/random';

const PIECE_SLOTS = ['hero', 'support', 'accent', 'garnish'] as const;

describe('ingredient traits', () => {
  it('has a row for every pantry ingredient', () => {
    const ids = REGISTRY.filter((e) => !e.shelved && !e.spec.id.startsWith('dish-')).map((e) => e.spec.id);
    expect(ids.length).toBe(31);
    for (const id of ids) expect(TRAITS[id], id).toBeDefined();
  });

  it('lists only buildable forms, in slots the ingredient allows', () => {
    for (const traits of Object.values(TRAITS)) {
      for (const slot of PIECE_SLOTS) {
        for (const form of traits.forms[slot] ?? []) {
          expect(BUILDABLE_FORMS, `${traits.id}:${form}`).toContain(form);
          expect(traits.slots, `${traits.id} uses ${slot}`).toContain(slot);
        }
      }
    }
  });

  it('can build every piece it lists', () => {
    for (const traits of Object.values(TRAITS)) {
      const forms = new Set(PIECE_SLOTS.flatMap((slot) => traits.forms[slot] ?? []));
      for (const form of forms) {
        const part = { ingredient: traits.id, form, count: 1 };
        expect(elementLooks(part, true).length, `${traits.id}:${form} looks`).toBeGreaterThan(0);
        const pieces = makeElement(part, seededRandom(7), 7);
        expect(pieces.length, `${traits.id}:${form} pieces`).toBeGreaterThan(0);
      }
    }
  }, 120000);

  it('never makes garlic a bulb, and sauce is only ever a sauce', () => {
    expect(TRAITS.garlic.forbiddenForms).toEqual(expect.arrayContaining(['whole', 'half']));
    const garlicForms = Object.values(TRAITS.garlic.forms).flat();
    expect(garlicForms).not.toContain('whole');
    expect(garlicForms).not.toContain('half');
    expect(TRAITS.sauce.slots).toEqual(['sauce']);
  });

  it('puts proteins first and condiments last', () => {
    expect(heroPriority('steak')).toBeLessThan(heroPriority('peach'));
    expect(heroPriority('peach')).toBeLessThan(heroPriority('garlic'));
    expect(heroPriority('sauce')).toBe(99);
  });
});
