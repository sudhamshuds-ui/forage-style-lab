import type { IngredientEntry } from '../ingredients/registry';
import { buildWatermelonBowl } from './forms/watermelonBowl';
import { buildSalmonPeach } from './forms/salmonPeach';
import { buildBerryBaguette } from './forms/berryBaguette';
import { buildTomahawkBerry } from './forms/tomahawkBerry';
import { buildEggMushroom } from './forms/eggMushroom';
import { buildGrapeDrumsticks } from './forms/grapeDrumsticks';
import { CERAMIC_SKIN, FLESH_SKIN, SAUCE_SKIN } from '../shading/effects/skinTexture';

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
    title: 'Seared salmon, caramelised peach, lime foam',
    description:
      'A thick piece of salmon seared until golden, set in a pool of pale lime foam with pan-seared peach wedges and thin wheels of lime. Rich, sweet and sharp in one bite.',
    entry: {
      spec: {
        id: 'dish-salmon-peach',
        name: 'Seared salmon, caramelised peach, lime foam',
        archetype: 'contained',
        family: 'cooked-salmon',
        layout: 'solo',
        show: 'A white plate with a pool of lime foam, a salmon fillet across it, peach wedges and lime wheels round it.',
        forms: ['whole'],
        scale: 'M',
        size_cm: [27, 6, 27],
        parts: ['salmon:glow', 'plate@porcelain', 'foam@foam', 'peach:glow@peach', 'peachFlesh@peach-flesh', 'lime:glow@lime', 'limeFlesh@lime-flesh', 'herb@leaf'],
        light_case: 'pale',
        notes: 'Dish batch 1 (2026-11-18), after the generated reference (Figma node 214:2).',
      },
      form: buildSalmonPeach,
      turn: 0,
      // No dark skin underneath (the user, 2026-11-19: "looks very ugly"): the band at its foot is
      // painted in the cooked flesh's own pale pink.
      skin: { kind: 'salmon', size_mm: 4, amount: 0.9, seared: 0.95, pale: '#fffaf6', green: '#efc0b0' },
      partSkins: {
        // A clean white plate: the faintest glaze washes, no specks (the user: "white pristine clean").
        plate: { ...CERAMIC_SKIN, amount: 0.12, pale: '#ece8e2' },
        foam: SAUCE_SKIN,
        peach_glow: { kind: 'peach', size_mm: 2, amount: 0.9 },
        peachFlesh: { ...FLESH_SKIN, pale: '#e8783a', green: '#c8384a', seared: 0.85 },
        lime_glow: { kind: 'lime', size_mm: 1.6, amount: 0.9 },
        limeFlesh: { ...FLESH_SKIN, pale: '#f4f1c4', green: '#6ea42c' },
      },
      matte: true,
      // Caramelised peach flesh is wet and glossy (the user's photo).
      glossy: ['peachFlesh'],
      rimGlints: false,
      shadowTint: 0.4,
      contactsFromFeet: true,
      room: 'lavender',
    },
  },
  {
    title: 'Strawberry and melted cheese baguette',
    description:
      'A crusty baguette split open and stuffed with sliced strawberries, melted cheese and a spoon of jam, pressed until it oozes. Sweet, salty and warm.',
    entry: {
      spec: {
        id: 'dish-berry-baguette',
        name: 'Strawberry and melted cheese baguette',
        archetype: 'contained',
        family: 'baked',
        layout: 'solo',
        show: 'Two pieces of baguette sliced open with strawberries and melted cheese, stacked on crumpled baking paper.',
        forms: ['whole'],
        scale: 'M',
        size_cm: [30, 16, 24],
        parts: ['crust', 'crumb@crumb', 'berry:glow@crimson', 'berryFlesh@berry-flesh', 'cheese@cheese', 'jam@berry-jam', 'paper@parchment'],
        light_case: 'pale',
        notes: 'Dish batch 1 (2026-11-18), after the generated reference (Figma node 214:3).',
      },
      form: buildBerryBaguette,
      turn: 0,
      skin: { kind: 'crust', size_mm: 10, amount: 0.9, seared: 0.4 },
      partSkins: {
        berry_glow: { kind: 'seeds', size_mm: 2.4, amount: 0.8 },
        jam: SAUCE_SKIN,
        berryFlesh: { ...FLESH_SKIN, pale: '#ffd8d2', green: '#c8203c' },
        cheese: SAUCE_SKIN,
      },
      matte: true,
      glossy: ['cheese', 'jam'],
      rimGlints: false,
      shadowTint: 0.4,
      contactsFromFeet: true,
      room: 'sage-morning',
    },
  },
  {
    title: 'Tomahawk with blueberry and garlic glaze',
    description:
      'A seared tomahawk carved into thick rosy slices, glazed with blueberries cooked down with roast garlic until dark and glossy. Big, smoky and a little wild.',
    entry: {
      spec: {
        id: 'dish-tomahawk-berry',
        name: 'Tomahawk with blueberry and garlic glaze',
        archetype: 'contained',
        family: 'beef',
        layout: 'solo',
        show: 'A blue platter with a sliced tomahawk, a dark blueberry glaze, a heap of blueberries and a roast garlic bulb.',
        forms: ['whole'],
        scale: 'L',
        size_cm: [32, 8, 32],
        parts: ['meat', 'bone@bone', 'rare@rare', 'glaze@berry-glaze', 'berry@blueberry', 'garlic@garlic', 'garlicCut@garlic-roast', 'plate@slate'],
        light_case: 'pale',
        notes: 'Dish batch 1 (2026-11-18), after the generated reference (Figma node 214:4).',
      },
      form: buildTomahawkBerry,
      turn: 0,
      skin: { kind: 'marbled', size_mm: 6, amount: 0.85, seared: 1, drizzle: { colour: '#4a1c5c', amount: 0.75 } },
      partSkins: {
        rare: { ...FLESH_SKIN, pale: '#b8323f', green: '#5c2a30', drizzle: { colour: '#4a1c5c', amount: 0.35 } },
        bone: { kind: 'knuckle', size_mm: 1.5, amount: 0.6, seared: 0.5, drizzle: { colour: '#4a1c5c', amount: 0.25 } },
        glaze: SAUCE_SKIN,
        berry: { kind: 'blueberry', size_mm: 1.5, amount: 0.9, drizzle: { colour: '#4a1c5c', amount: 0.55 } },
        garlic: { kind: 'garlic', size_mm: 2, amount: 0.9, seared: 0.45, drizzle: { colour: '#4a1c5c', amount: 0.3 } },
        garlicCut: { ...FLESH_SKIN, pale: '#f8e2a8', green: '#d8b07a', seared: 0.8 },
        plate: { ...CERAMIC_SKIN, pale: '#b9b1a4' },
      },
      glossy: ['glaze', 'berry'],
      rimGlints: false,
      shadowTint: 0.3,
      contactsFromFeet: true,
      room: 'apricot',
    },
  },
  {
    title: 'Soft egg in butter-roasted mushrooms',
    description:
      'Mushrooms roasted hard in foaming butter until golden, with a soft fried egg in the middle to break over them and a scatter of parsley. Earthy, rich and simple.',
    entry: {
      spec: {
        id: 'dish-egg-mushroom',
        name: 'Soft egg in butter-roasted mushrooms',
        archetype: 'contained',
        family: 'albumen',
        layout: 'solo',
        show: 'A wide cream bowl with golden brown butter, roasted mushrooms in a ring, a fried egg in the middle and parsley leaves.',
        forms: ['whole'],
        scale: 'M',
        size_cm: [25, 6, 25],
        parts: ['white', 'yolk@yolk', 'butter@brown-butter', 'mushroom@mushroom', 'mushroomCut@garlic', 'herb@leaf', 'bowl@stoneware'],
        light_case: 'pale',
        notes: 'Dish batch 1 (2026-11-18), after the generated reference (Figma node 214:6).',
      },
      form: buildEggMushroom,
      turn: 0,
      // A soft white, round with no browned lace (the user, 2026-11-18): the sauce skin's soft
      // body, paler where it thins at the edge.
      skin: { ...SAUCE_SKIN, amount: 0.6 },
      partSkins: {
        butter: SAUCE_SKIN,
        mushroom: { kind: 'mushroom', size_mm: 2, amount: 0.9, seared: 0.6, drizzle: { colour: '#c88a3c', amount: 0.45 } },
        mushroomCut: { ...FLESH_SKIN, pale: '#f6e6cc', green: '#8a5236', seared: 0.65, drizzle: { colour: '#c88a3c', amount: 0.25 } },
        bowl: { ...CERAMIC_SKIN, pale: '#dcc8a8' },
      },
      matte: true,
      glossy: ['yolk', 'butter'],
      rimGlints: false,
      shadowTint: 0.5,
      contactsFromFeet: true,
      room: 'mist',
    },
  },
  {
    title: 'Grape-lacquered drumsticks on tomato jam',
    description:
      'Drumsticks roasted and brushed again and again with a grape glaze until dark and sticky, stood up in a sweet-sharp tomato jam with halved grapes and cherry tomatoes. Completely unhinged, completely delicious.',
    entry: {
      spec: {
        id: 'dish-grape-drumsticks',
        name: 'Grape-lacquered drumsticks on tomato jam',
        archetype: 'contained',
        family: 'lacquer',
        layout: 'solo',
        show: 'Three lacquered drumsticks standing bones up in a pool of tomato jam, with halved grapes and cherry tomatoes, on a cream plate.',
        forms: ['whole'],
        scale: 'M',
        size_cm: [27, 15, 27],
        parts: ['meat:glow', 'knuckle@bone-roast', 'jam@jam', 'grape:glow@grape', 'grapeFlesh@grape-flesh', 'tomato:glow@tomato', 'calyx@leaf', 'plate@stoneware'],
        light_case: 'pale',
        notes: 'Dish batch 1 (2026-11-18), after the generated reference (Figma node 214:7).',
      },
      form: buildGrapeDrumsticks,
      turn: 0,
      // Lacquered: dark, glossy, seared at the edges, glaze running down in streaks.
      skin: { kind: 'poultry', size_mm: 3, amount: 0.35, seared: 0.7, pale: '#6a1a24', green: '#a8402a', drizzle: { colour: '#6e0f22', amount: 0.75 } },
      partSkins: {
        knuckle: { kind: 'knuckle', size_mm: 1.5, amount: 0.8, seared: 0.55, pale: '#8a2a2e' },
        jam: SAUCE_SKIN,
        grape_glow: { kind: 'grape', size_mm: 2, amount: 0.9 },
        grapeFlesh: { ...FLESH_SKIN, pale: '#eef0c8', green: '#7a3a6a' },
        tomato_glow: { kind: 'tomato', size_mm: 3, amount: 0.9, seared: 0.35, drizzle: { colour: '#b8221c', amount: 0.35 } },
        plate: { ...CERAMIC_SKIN, pale: '#e2cfb2' },
      },
      glossy: ['jam', 'grape_glow', 'grapeFlesh', 'tomato_glow'],
      rimGlints: false,
      shadowTint: 0.35,
      contactsFromFeet: true,
      room: 'seafoam',
    },
  },
  {
    title: 'Watermelon tuna rice bowl',
    description:
      'Seared watermelon, cut in cubes and glazed until it passes for tuna, over steamed rice with a fan of ripe avocado and a pinch of black sesame. Sweet, salty and a little bit of a trick.',
    entry: {
      spec: {
        id: 'dish-watermelon-bowl',
        name: 'Watermelon tuna rice bowl',
        archetype: 'contained',
        family: 'cooked-rice',
        layout: 'solo',
        show: 'A green glazed bowl of rice topped with a heap of seared watermelon cubes, a fan of avocado slices and black sesame.',
        forms: ['whole'],
        scale: 'M',
        size_cm: [13.3, 11.5, 13.3],
        parts: ['rice', 'bowl@glaze', 'cubes@melon', 'avocado:glow@avocado', 'seeds@ink'],
        light_case: 'pale',
        notes: 'The first dish built in code: the rice bowl with stand-in toppings (see forms/watermelonBowl.ts).',
      },
      form: buildWatermelonBowl,
      turn: -25,
      skin: { kind: 'rice', size_mm: 5.5, amount: 0.9 },
      matte: true,
      glossy: ['bowl', 'cubes'],
      partSkins: {
        avocado_glow: { kind: 'avocado', size_mm: 2.2, amount: 0.85 },
        cubes: { kind: 'flesh', size_mm: 2, amount: 0.7, seared: 0.28, pale: '#a81e3c', green: '#c42c3c' },
      },
      room: 'rosewater',
      rimGlints: false,
      shadowTint: 0.3,
      // In Playful strokes the tiny dark seeds turn into hard blocks (like the watermelon's).
      playfulHide: ['seeds'],
    },
  },
];
