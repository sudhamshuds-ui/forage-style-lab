import type { IngredientEntry } from '../ingredients/registry';
import { buildWatermelonBowl } from './forms/watermelonBowl';

/**
 * Dishes: what the kitchen's Cook button reveals.
 *
 * A dish is built like an ingredient (a form in code, painted with the same colour families and
 * shader), so it sits in the same room and takes the same painters. It is described by an
 * ingredient entry, but kept out of the pantry's registry: it never shows in the tray or in
 * Shuffle. Each also carries what the result screen shows: a title and a short description.
 *
 * For now there is one dish, shown whatever is on the table (a stand-in to test the Cook
 * transition and the result screen). Choosing and composing a dish from the ingredients and the
 * cooking choices comes with the forms of ingredients (sliced, diced, grilled...).
 */
export interface Dish {
  entry: IngredientEntry;
  title: string;
  description: string;
}

export const DISHES: Dish[] = [
  {
    title: 'Watermelon tuna rice bowl',
    description:
      'Seared watermelon, cut in cubes and glazed until it passes for tuna, over steamed rice with a fan of ripe avocado and a pinch of black sesame. Sweet, salty and a little bit of a trick.',
    entry: {
      spec: {
        id: 'dish-watermelon-bowl',
        name: 'Watermelon tuna rice bowl',
        archetype: 'contained',
        family: 'rice',
        layout: 'solo',
        show: 'A green glazed bowl of rice topped with a heap of seared watermelon cubes, a fan of avocado slices and black sesame.',
        forms: ['whole'],
        scale: 'M',
        size_cm: [13.3, 11.5, 13.3],
        parts: ['rice', 'bowl@glaze', 'cubes@melon', 'slices@romaine', 'peel@avocado', 'seeds@ink'],
        light_case: 'pale',
        notes: 'The first dish built in code: the rice bowl with stand-in toppings (see forms/watermelonBowl.ts).',
      },
      form: buildWatermelonBowl,
      turn: -25,
      skin: { kind: 'rice', size_mm: 5.5, amount: 0.9 },
      matte: true,
      glossy: ['bowl', 'cubes'],
      rimGlints: false,
      shadowTint: 0.3,
      // In Playful strokes the tiny dark seeds turn into hard blocks (like the watermelon's).
      playfulHide: ['seeds'],
    },
  },
];
