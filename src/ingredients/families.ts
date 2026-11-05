import type { Palette } from '../shading/stylizedMaterial';

/**
 * Colour families (board 04, "Warm subject, cool room").
 *
 * A family is five colours that map one to one onto the shader's palette
 * (lit, base, shadow, glow, highlight), plus the rooms that suit it: a muted
 * room at least 70 degrees round the colour wheel, up to straight opposite
 * (180). The first room is the one the Style Lab picks when the ingredient
 * comes on stage.
 *
 * Board 04 says 70 to 150 degrees, but its own pairings go further (orange
 * with Overcast is 172, measured in OKLCh), and on 2026-11-04 we chose to
 * keep them: a straight complement reads well when the room is muted. So
 * the rule here is 70 to 180 (checked by registry.test.ts).
 *
 * Colours live here, in data, never in a form.
 */
export type FamilyId =
  | 'red'
  | 'crimson'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cream-crust'
  | 'pink-raw'
  | 'stalk'
  | 'leaf'
  | 'pale-green'
  | 'crumb'
  | 'baked'
  | 'sauce'
  | 'glass'
  | 'paper';

export interface ColourFamily {
  name: string;
  colours: Palette;
  /** Room combo ids from src/palettes.ts, suggested one first. */
  rooms: string[];
}

export const FAMILIES: Record<FamilyId, ColourFamily> = {
  // These five are the apple's own values in params.ts (the hidden Colour group).
  red: {
    name: 'Red',
    colours: { lit: '#f78e64', base: '#ce5249', shadow: '#843d56', glow: '#ed6531', highlight: '#f5e5d3' },
    rooms: ['linen', 'heather'],
  },
  // Not on board 04 yet (added 2026-11-04): a cooler, richer red leaning toward magenta, for
  // berries (strawberry, later raspberry, cherry), so they never look like the apple.
  // The lit side stays warm (same light); the shadow goes to plum wine.
  crimson: {
    name: 'Crimson',
    colours: { lit: '#f4766a', base: '#cf2c44', shadow: '#7a1e4b', glow: '#f2544a', highlight: '#fbe1dc' },
    rooms: ['sage-morning', 'linen'],
  },
  orange: {
    name: 'Orange',
    colours: { lit: '#ffb36b', base: '#f0812f', shadow: '#b0484a', glow: '#ff9a2e', highlight: '#fff0d9' },
    rooms: ['overcast', 'dusk'],
  },
  yellow: {
    name: 'Yellow',
    colours: { lit: '#fff0a3', base: '#f2c94c', shadow: '#b0866a', glow: '#ffc94a', highlight: '#fffbe8' },
    rooms: ['seafoam'],
  },
  green: {
    name: 'Green',
    colours: { lit: '#c8de8a', base: '#73a24c', shadow: '#3c6f66', glow: '#b5d65a', highlight: '#eef5d8' },
    rooms: ['heather', 'linen'],
  },
  'cream-crust': {
    name: 'Cream and crust',
    colours: { lit: '#fbe6c4', base: '#e0ad73', shadow: '#9a6a63', glow: '#f2b45e', highlight: '#fff6e6' },
    rooms: ['sage-morning', 'overcast'],
  },
  // Not a board 04 family: only for small woody parts (stems, stalks), never a whole ingredient.
  // Based on the apple's stem colour; the shadow leans plum, never grey, and the highlight stays muted.
  stalk: {
    name: 'Stem and stalk',
    colours: { lit: '#9a9a55', base: '#66693a', shadow: '#4f3d45', glow: '#8f9a45', highlight: '#b9b78f' },
    rooms: [],
  },
  // Not a board 04 family: a deeper, natural leaf green for small leaves and sepals, where the
  // board's green (for broccoli and herbs) looks pale and papery. The shadow goes teal, never grey.
  leaf: {
    name: 'Leaf',
    colours: { lit: '#8fb35a', base: '#4f8a3c', shadow: '#1f5a57', glow: '#9cc94a', highlight: '#d9e8b0' },
    rooms: [],
  },
  // Not a board 04 family: the pale, yellowish green of a broccoli or cauliflower stalk, so the
  // stalk reads lighter than the dark florets. Shadow teal, never grey.
  'pale-green': {
    name: 'Pale green',
    colours: { lit: '#e2ebb4', base: '#b4c983', shadow: '#5e8a78', glow: '#cfe08f', highlight: '#f3f7e0' },
    rooms: [],
  },
  // Not on board 04 yet (added 2026-11-04, the user: "more orange and red hues"): a well-baked
  // crust, warmer than cream and crust, orange-brown going red-brown in shadow. For the
  // baguette; a candidate for the board's crust ramp.
  baked: {
    name: 'Baked crust',
    colours: { lit: '#f8c98c', base: '#df8a47', shadow: '#94443a', glow: '#ee7b34', highlight: '#fff0d8' },
    rooms: ['sage-morning', 'overcast'],
  },
  // Not a board 04 family: the pale cream of bread crumb, showing in a loaf's slashes (and later
  // on a cut slice). Shadow a warm taupe, never grey.
  crumb: {
    name: 'Crumb',
    colours: { lit: '#fcf3df', base: '#f1ddb6', shadow: '#c3a184', glow: '#f7dca4', highlight: '#fffaf0' },
    rooms: [],
  },
  // Not on board 04 yet (added 2026-11-05, the sauce bottle): dark red sauce seen through
  // glass. Deeper than the apple's red, going to plum wine in shadow, with a bright red-orange
  // glow where the light shines through at thin edges.
  sauce: {
    name: 'Sauce',
    colours: { lit: '#cf4a3e', base: '#8e1b2b', shadow: '#4c1534', glow: '#e8452f', highlight: '#f8d9d2' },
    rooms: ['linen', 'heather'],
  },
  // Not a board 04 family: only for parts (a bottle's thick glass base, later jars). Pale and
  // cool, a hint of lilac, the shadow a soft mauve, never grey.
  glass: {
    name: 'Glass',
    colours: { lit: '#f4eff3', base: '#ddd3de', shadow: '#97849a', glow: '#f1e6ee', highlight: '#ffffff' },
    rooms: [],
  },
  // Not a board 04 family: only for parts (labels, wrappers). Warm cream paper, the shadow a
  // warm taupe, never grey.
  paper: {
    name: 'Paper',
    colours: { lit: '#fdf6e6', base: '#efe2c6', shadow: '#b99f88', glow: '#f6e5c2', highlight: '#fffbf3' },
    rooms: [],
  },
  'pink-raw': {
    name: 'Pink and raw',
    colours: { lit: '#f6a493', base: '#d4544f', shadow: '#8c3150', glow: '#ff7a66', highlight: '#fbe4dc' },
    rooms: ['seafoam', 'sage-morning'],
  },
};
