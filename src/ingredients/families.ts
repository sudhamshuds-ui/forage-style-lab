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
  | 'poultry'
  | 'onion'
  | 'pepper'
  | 'avocado'
  | 'grape'
  | 'blueberry'
  | 'spinach'
  | 'romaine'
  | 'cabbage'
  | 'salmon'
  | 'albumen'
  | 'yolk'
  | 'rice'
  | 'glaze'
  | 'milk'
  | 'print-green'
  | 'vine'
  | 'pit'
  | 'papery'
  | 'fat'
  | 'beef'
  | 'bone'
  | 'stalk'
  | 'leaf'
  | 'pale-green'
  | 'crumb'
  | 'baked'
  | 'sauce'
  | 'glass'
  | 'paper'
  | 'gold'
  | 'ink'
  | 'chili'
  | 'rind'
  | 'cheese'
  | 'butter'
  | 'parchment'
  | 'melon';

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
    rooms: ['dusk', 'seafoam'],
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
    rooms: ['celadon', 'sage-morning'],
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
    rooms: ['spruce', 'linen'],
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
  // Not on board 04 yet (added 2026-11-05, the cheese wedge): board 08 puts cheese in Yellow,
  // but the lemon's yellow read acidic on a cheese. A paler, buttery cream-yellow, like the
  // board's own cheese picture, with warm caramel shadows, never green or grey.
  cheese: {
    name: 'Cheese',
    colours: { lit: '#fff1bf', base: '#f3d273', shadow: '#c48a45', glow: '#ffbf4a', highlight: '#fffaf0' },
    rooms: ['mist', 'seafoam'],
  },
  // Not a board 04 family: only for parts (a cheese's rind, along the wedge's curved back). Just
  // a little deeper and warmer than the paste (a loud orange slab read wrong), going to a warm
  // brown in shadow, never olive.
  rind: {
    name: 'Rind',
    colours: { lit: '#fde5a4', base: '#eabd66', shadow: '#ae7a52', glow: '#f6c25a', highlight: '#fff6e0' },
    rooms: [],
  },
  // Not a board 04 family: only for parts (a hot sauce label's ground). A warm chili red-orange,
  // brighter and warmer than the sauce, going to a red wine in shadow.
  chili: {
    name: 'Chili',
    colours: { lit: '#f2875a', base: '#d6532f', shadow: '#8a2f3a', glow: '#f26a3a', highlight: '#fde2d0' },
    rooms: [],
  },
  // Not a board 04 family: only for parts (a label's printed gold). A warm ochre gold, the
  // shadow a warm brown, never olive or grey.
  gold: {
    name: 'Gold',
    colours: { lit: '#f2d688', base: '#d2a64a', shadow: '#8c5a3a', glow: '#f0c25a', highlight: '#fff6d8' },
    rooms: [],
  },
  // Not a board 04 family: only for parts (brush lettering on a label). A deep plum ink,
  // dark but never black or grey.
  ink: {
    name: 'Ink',
    colours: { lit: '#6e3b4c', base: '#45222f', shadow: '#2e1523', glow: '#7a3a4a', highlight: '#8f6070' },
    rooms: [],
  },
  // Not on board 04 yet (added 2026-11-05, the butter block): board 08 puts butter in Yellow,
  // but next to the cheese it needs its own colour. Paler and softer than the cheese, a fresh
  // cream-yellow, gold where it is thin (the drips glow), going to a soft honey-rose in shadow,
  // never olive or grey.
  butter: {
    name: 'Butter',
    colours: { lit: '#fff7d2', base: '#f6e092', shadow: '#d4b08f', glow: '#ffcf66', highlight: '#fffdf2' },
    rooms: ['lavender', 'heather'],
  },
  // Not a board 04 family: only for parts (a butter wrapper, baking parchment). Whiter and
  // cooler than the cream paper of a label, its creases going to a soft lilac in shadow (never
  // grey), so the warm butter sits on it like on a cool cloth.
  parchment: {
    name: 'Parchment',
    colours: { lit: '#fdfbf6', base: '#efebe4', shadow: '#c4bccf', glow: '#f4ecdc', highlight: '#ffffff' },
    rooms: [],
  },
  // Not on board 04 yet (added 2026-11-06, the watermelon): board 08 says Red, but the apple's
  // red is an orange-red skin. Watermelon flesh is wetter: a juicy coral-red (a first, pinker
  // version read candy-pink, the user's reference is red), glowing
  // warm where it is thin, going to a wine-plum in shadow.
  melon: {
    name: 'Melon',
    colours: { lit: '#ff8f74', base: '#e4473d', shadow: '#962f45', glow: '#ff6e4f', highlight: '#ffe6dc' },
    rooms: ['seafoam', 'sage-morning'],
  },
  // Not on board 04 yet (added 2026-11-10, the tomahawk steak): raw beef, deeper and redder
  // than Pink and raw (the user's references), going to a wine-plum in shadow, never brown.
  beef: {
    name: 'Beef',
    colours: { lit: '#ee7a6e', base: '#bd3540', shadow: '#741f3c', glow: '#e64a43', highlight: '#fbe0dc' },
    rooms: ['iris', 'seafoam'],
  },
  // Not a board 04 family: only for parts (a rib bone). Ivory going to a warm tan, never grey.
  bone: {
    name: 'Bone',
    colours: { lit: '#f8eedb', base: '#e6d0aa', shadow: '#a98a70', glow: '#f0d6a8', highlight: '#fffaf0' },
    rooms: [],
  },
  // Not a board 04 family: only for parts (a steak's fat cap, later bacon and ham). Raw fat:
  // a creamy ivory leaning pink (warm enough to stand apart from a cream table), never pure white, with a soft rosy shadow, never grey.
  fat: {
    name: 'Fat',
    colours: { lit: '#fbe4da', base: '#eec6ba', shadow: '#bf8f96', glow: '#f6c0ae', highlight: '#fff6f2' },
    rooms: [],
  },
  // Not on board 04 yet (added 2026-11-11, the chicken drumstick): board 08 says Pink and raw,
  // which is a deep salmon red. Raw chicken skin is much paler: a creamy peach-pink (the fat under
  // it shows through), going to a soft rose and plum in shadow, never grey. Kept apart from the
  // fat (pinker and cooler) and the butter (yellow): a peachy pink.
  poultry: {
    name: 'Poultry',
    colours: { lit: '#fde5d6', base: '#f2bca3', shadow: '#ad6676', glow: '#f49a7c', highlight: '#fff6ef' },
    rooms: ['thistle', 'seafoam'],
  },
  // Not on board 04 yet (added 2026-11-11, round 2: the red onion): a red-violet, pink-lilac in
  // the light, deep magenta-plum in shadow, never grey. Celadon (soft green) sits opposite.
  onion: {
    name: 'Onion',
    colours: { lit: '#d79ad3', base: '#9a3f92', shadow: '#4a2164', glow: '#c24ea6', highlight: '#f5e4f4' },
    rooms: ['celadon', 'sage-morning'],
  },
  // Not on board 04 yet (added 2026-11-12, round 2: the orange bell pepper): a purer, glossier,
  // slightly redder orange than the orange's (close relatives must read apart), going to a warm
  // brick red in shadow, never brown.
  pepper: {
    name: 'Pepper',
    colours: { lit: '#ffae5e', base: '#f2761a', shadow: '#a8462c', glow: '#ff8726', highlight: '#fff2df' },
    rooms: ['seafoam', 'spruce'],
  },
  // Not on board 04 yet (added 2026-11-12, round 2: the avocado): its skin, a deep leaf green going
  // to a deep indigo in shadow, after the user's reference painting (never black-green). The flesh's creamy yellow and bright green are
  // painted on the cut face by the avocado skin (subject.ts).
  avocado: {
    name: 'Avocado',
    colours: { lit: '#90b653', base: '#46762f', shadow: '#2d3f5c', glow: '#7fa83a', highlight: '#e6efcf' },
    rooms: ['iris', 'thistle'],
  },
  // Not on board 04 yet (added 2026-11-12, round 2: red grapes, after the user's reference): a
  // wine red that runs from coral where the skin is thin and lit to deep violet in shadow (never
  // brown or black-red). Each berry gets its own mix, painted by the grape skin.
  grape: {
    name: 'Grape',
    colours: { lit: '#e86f78', base: '#a8304f', shadow: '#4c2358', glow: '#e8504a', highlight: '#f8e2ea' },
    rooms: ['spruce', 'mist'],
  },
  // Not on board 04 yet (added 2026-11-12, round 2: blueberries, after the user's reference): a
  // deep indigo under a dusty, pale periwinkle bloom; warm cream highlights, a violet-indigo shadow
  // (warm highlights, cool shadows), a plum glow. The first cool subject: it opens in the first
  // warm room, Apricot.
  blueberry: {
    name: 'Blueberry',
    colours: { lit: '#7f9ad8', base: '#2f4c98', shadow: '#2a2b60', glow: '#5a4f9e', highlight: '#f7eedf' },
    rooms: ['apricot'],
  },
  // Not on board 04 yet (added 2026-11-12, round 2: spinach, after the user's reference): a deep,
  // fresh leaf green, lime where it is thin and lit (warm), its shadow a cool blue-green (warm
  // highlights, cool shadows), never olive or black-green. Deeper than the broccoli's green.
  // Not on board 04 yet (added 2026-11-13, round 2: romaine, after the user's references): a fresh,
  // bright yellow-green leaf, lime where lit (warm), its shadow a cool blue-green (warm highlights,
  // cool shadows). The pale ribs and the cream cut base come from its lit and highlight colours.
  // Thistle, a dusty mauve, sets the green off (its complement); not the spinach's Lavender.
  // Not on board 04 yet (added 2026-11-14, round 2: cabbage, after the user's watercolours): a pale,
  // fresh green head and deeper, bluer green wrapper leaves (the outer layer is shaded deeper by the
  // skin), lime where lit, cool blue-green shadows. Iris, a cool blue-violet, sets it off.
  cabbage: {
    name: 'Cabbage',
    colours: { lit: '#cfe59a', base: '#79ad5a', shadow: '#2a5652', glow: '#bfdc6c', highlight: '#f5f8e0' },
    rooms: ['iris'],
  },
  romaine: {
    name: 'Romaine',
    colours: { lit: '#c6e07e', base: '#6ea648', shadow: '#2d5b57', glow: '#bcdc58', highlight: '#f6f7dc' },
    rooms: ['thistle'],
  },
  spinach: {
    name: 'Spinach',
    colours: { lit: '#80b44f', base: '#2f6b2f', shadow: '#1f4552', glow: '#86b843', highlight: '#f2f1d4' },
    rooms: ['lavender', 'heather'],
  },
  // Not on board 04 yet (added 2026-11-14, round 2: the salmon fillet, after the user's watercolour):
  // raw salmon, a coral orange (pinker than the pepper's orange, more orange than the melon's red),
  // peach where lit, a deep rose-wine in shadow (cool, never brown), a hot orange glow.
  salmon: {
    name: 'Salmon',
    colours: { lit: '#ffab82', base: '#f2734c', shadow: '#a3344f', glow: '#ff6f3c', highlight: '#fff0e4' },
    rooms: ['mist', 'celadon'],
  },
  // Not on board 04 yet (added 2026-11-14, round 2: the fried egg, after the user's oil painting):
  // cooked egg white, a warm cream white in the light, lilac-blue in shadow (never grey), a golden
  // glow where it is thin. Its browned, crisp rim is painted by the egg skin.
  albumen: {
    name: 'Albumen',
    colours: { lit: '#fffaf0', base: '#f6efe2', shadow: '#aaa6cf', glow: '#ffd08a', highlight: '#ffffff' },
    rooms: ['spruce', 'iris'],
  },
  // Not a board 04 family: only for parts (a yolk). A deep golden yellow, orange where it turns,
  // a warm rose-brown shadow, a pale cream highlight.
  yolk: {
    name: 'Yolk',
    colours: { lit: '#ffd95e', base: '#f9ab1c', shadow: '#c2562d', glow: '#ff8f17', highlight: '#fff8dc' },
    rooms: [],
  },
  // Not on board 04 yet (added 2026-11-14, round 2: the rice bowl, after the user's reference):
  // steamed white rice, a warm pearl white in the light, a soft lilac in shadow (never grey), a
  // creamy gold glow between the grains.
  rice: {
    name: 'Rice',
    colours: { lit: '#fffdf7', base: '#f6f2e8', shadow: '#b3a9cc', glow: '#fff0cf', highlight: '#ffffff' },
    rooms: ['dusk', 'iris'],
  },
  // Not a board 04 family: only for parts (a glazed bowl or dish). A celadon green glaze, lime
  // where the light catches it, a deep blue-teal in shadow, never grey-green.
  glaze: {
    name: 'Glaze',
    colours: { lit: '#aecb8f', base: '#6c9a63', shadow: '#2c5560', glow: '#a5c66f', highlight: '#f1f7df' },
    rooms: [],
  },
  // Not on board 04 yet (added 2026-11-14, round 2: the milk carton): white coated card, a warm
  // white in the light, a blue-lilac in shadow (never grey), a faint cream glow.
  milk: {
    name: 'Milk',
    colours: { lit: '#fffefa', base: '#f3f1ec', shadow: '#a4a6d2', glow: '#fff1d0', highlight: '#ffffff' },
    rooms: ['seafoam', 'spruce'],
  },
  // Not a board 04 family: only for parts (a carton's printed green and its cap). A fresh deep
  // green, lime where lit, blue-teal in shadow.
  'print-green': {
    name: 'Print green',
    colours: { lit: '#6dbb7c', base: '#2f8052', shadow: '#1b4a58', glow: '#6fbf5e', highlight: '#e3f3dc' },
    rooms: [],
  },
  // Not a board 04 family: only for parts (a grape bunch's woody stem; later vines and tomato
  // trusses). A golden ochre, its shadow a warm olive-plum, never grey-green.
  vine: {
    name: 'Vine',
    colours: { lit: '#d8b45e', base: '#a37f35', shadow: '#5a4a3c', glow: '#c99a3e', highlight: '#f3e3b8' },
    rooms: [],
  },
  // Not a board 04 family: only for parts (an avocado's pit; later nuts). A warm glossy chestnut,
  // its shadow side a deep plum (the user's reference), never grey-brown.
  pit: {
    name: 'Pit',
    colours: { lit: '#dc8752', base: '#a04f29', shadow: '#512b4a', glow: '#cc632f', highlight: '#fde6cc' },
    rooms: [],
  },
  // Not a board 04 family: only for parts (an onion's dry, papery neck tip and outer skin; later
  // garlic). A pale tan with a rosy shadow, never grey or brown-grey.
  papery: {
    name: 'Papery',
    colours: { lit: '#f4dfc6', base: '#dcb895', shadow: '#9c7268', glow: '#ebbd8e', highlight: '#fff5e8' },
    rooms: [],
  },
  'pink-raw': {
    name: 'Pink and raw',
    colours: { lit: '#f6a493', base: '#d4544f', shadow: '#8c3150', glow: '#ff7a66', highlight: '#fbe4dc' },
    rooms: ['seafoam', 'sage-morning'],
  },
};
