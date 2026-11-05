import type { FamilyId } from './families';
import { buildLemon } from './forms/lemon';
import { buildOrange } from './forms/orange';
import { buildStrawberry } from './forms/strawberry';
import { buildBroccoli } from './forms/broccoli';
import { buildBread } from './forms/bread';
import { buildSauce } from './forms/sauce';
import { buildCheese } from './forms/cheese';
import { buildButter } from './forms/butter';
import { NO_SKIN } from '../shading/effects/skinTexture';
import type { FormBuilder } from './forms/kit/piece';
import type { TRIANGLE_BUDGET } from './forms/kit/checks';
import type { Skin } from '../shading/effects/skinTexture';

/**
 * The ingredient registry: one entry per ingredient.
 *
 * Each entry is the ingredient's spec (board 07, the same fields as the YAML
 * spec, so a spec can be pasted in almost as is) plus its form builder. Think
 * of it as the project's asset library: the Style Lab looks an ingredient up
 * here, builds its form, paints it with its colour family and frames it.
 *
 * To add an ingredient: write its form file in src/ingredients/forms/, then
 * add one entry below. The form tests (forms.test.ts) pick it up on their own.
 */

export type Archetype = keyof typeof TRIANGLE_BUDGET;
export type Layout = 'solo' | 'whole-and-cut' | 'cluster-2' | 'cluster-3';
export type ScaleClass = 'XS' | 'S' | 'M' | 'L';
/**
 * The six light nudges from board 05. Stored now, not used yet: when they are
 * built, they plug in where main.ts puts an ingredient on stage
 * (`showIngredient`), as small changes to glow, sheen, room and bounce.
 */
export type LightCase = 'cut-juicy' | 'wet' | 'pale' | 'dark' | 'group' | 'whole-next-to-cut';

export interface IngredientSpec {
  id: string;
  name: string;
  archetype: Archetype;
  family: FamilyId;
  layout: Layout;
  /** The composition in one plain sentence a person can check. */
  show: string;
  /** The states Tool 02 can turn it into. Only `whole` is built for now. */
  forms: string[];
  scale: ScaleClass;
  /** Real size in cm: width (x), height (y), depth (z), as it sits on the table. */
  size_cm: [number, number, number];
  /** Parts by role. `:glow` marks see-through parts, `@family` a part in another family. */
  parts: string[];
  light_case?: LightCase;
  /** What makes this ingredient itself. */
  notes: string;
}

export interface IngredientEntry {
  spec: IngredientSpec;
  /**
   * How the form is made: a kit-built form file, or the hand-tuned procedural
   * apple (src/ingredients/apple/), which still reads the hidden Shape and
   * Colour groups so its look does not change.
   */
  form: FormBuilder | 'procedural-apple';
  /**
   * Turn on the stage, in degrees round the up axis, measured from the
   * camera: 0 shows the form's front (+Z) to the starting view. Board 06:
   * about 20 degrees, so the most interesting side faces the key light.
   * Framing only: the form itself is not changed.
   */
  turn: number;
  /**
   * The main body's own peel texture, painted by the shader (never modelled):
   * pebbled lemon peel, orange pores, apple streaks. Stems and leaves stay plain.
   */
  skin: Skin;
  /** For clusters: stem ends pointing 'out' from the group (berries, default) or 'front' (broccoli). */
  stemEnds?: 'out' | 'front';
  /** A matte surface (broccoli, bread): the body's highlight stays quiet, like a small part's. */
  matte?: boolean;
  /**
   * False to skip the shader's rim glints on this ingredient. The sauce bottle's narrow neck
   * faces the light and caught a glint as a hard white bar (the user saw it as a glitch).
   */
  rimGlints?: boolean;
  /**
   * How much of the shadow's mixed colours (violet and pink patches) it takes, 0 to 1
   * (default 1). The cheese takes about a third: on pale yellow they read as pink stains.
   */
  shadowTint?: number;
  /**
   * Its own triangle budget, when the archetype's does not fit (a 22 cm loaf is "round" like an
   * apple, but needs more mesh for its scored crust). Leave it out to use the archetype's.
   */
  budget?: [number, number];
}

export const REGISTRY: IngredientEntry[] = [
  {
    spec: {
      id: 'apple',
      name: 'Apple',
      archetype: 'round',
      family: 'red',
      layout: 'solo',
      show: 'One whole apple, stem and one leaf. A cut half arrives in Tool 02.',
      forms: ['whole', 'half', 'wedge', 'slice', 'diced'],
      scale: 'M',
      size_cm: [8, 8.6, 8],
      parts: ['skin', 'stem', 'leaf'],
      notes: 'Stem and one leaf. Smooth, slightly lopsided, never a perfect sphere.',
    },
    form: 'procedural-apple',
    turn: 0,
    skin: { kind: 'streaks', size_mm: 9, amount: 0.7 },
  },
  {
    spec: {
      id: 'lemon',
      name: 'Lemon',
      archetype: 'round',
      family: 'yellow',
      layout: 'whole-and-cut',
      show: 'One whole lemon behind, one half in front, cut face tilted up toward the light.',
      forms: ['whole', 'half', 'wedge', 'slice', 'zest'],
      scale: 'M',
      size_cm: [7, 5, 5],
      parts: ['peel', 'flesh:glow', 'pith', 'seeds'],
      light_case: 'cut-juicy',
      notes: 'Pointed tip at both ends. Pebbled peel is a shader texture, never geometry.',
    },
    form: buildLemon,
    turn: 20,
    skin: { kind: 'pebbled', size_mm: 2.6, amount: 0.7 },
  },
  {
    spec: {
      id: 'orange',
      name: 'Orange',
      archetype: 'round',
      family: 'orange',
      layout: 'whole-and-cut',
      show: 'One whole orange with a small stem and leaf, one round slice leaning on it.',
      forms: ['whole', 'half', 'slice', 'segment', 'peel'],
      scale: 'M',
      size_cm: [8, 7.5, 8],
      parts: ['peel', 'calyx@leaf', 'stem@stalk', 'leaf@leaf', 'flesh:glow', 'pith', 'segments'],
      light_case: 'whole-next-to-cut',
      notes: 'Small green calyx star, a short stem and one leaf. Slightly squashed, full shoulders. Slice shows segments as soft wedges. Pores are a shader texture.',
    },
    form: buildOrange,
    turn: 0,
    skin: { kind: 'pores', size_mm: 1.8, amount: 0.9 },
  },
  {
    spec: {
      id: 'strawberry',
      name: 'Strawberry',
      archetype: 'small',
      family: 'crimson',
      layout: 'cluster-3',
      show: 'Three whole berries, leaves on. Optionally the front one halved.',
      forms: ['whole', 'halved', 'sliced', 'diced'],
      scale: 'S',
      size_cm: [3.5, 3, 3],
      parts: ['berry:glow', 'calyx@leaf', 'stem@leaf'],
      light_case: 'group',
      notes: 'Heart-shaped and never a perfect cone: lobed, uneven sides, a tip bent off centre. A ragged ruff of sepals, some curling. Crimson, cooler than the apple. Seeds are pale flecks painted by the shader, not geometry.',
    },
    form: buildStrawberry,
    // A cluster: the hero's turn, so its calyx star faces the camera.
    turn: 40,
    skin: { kind: 'seeds', size_mm: 2.4, amount: 0.8 },
  },
  {
    spec: {
      id: 'broccoli',
      name: 'Broccoli',
      archetype: 'branching',
      family: 'green',
      // One head (the user's call, 2026-11-04). The cluster-2 bunch still works: set layout: 'cluster-2'.
      layout: 'solo',
      show: 'One head lying on its side, stalk angled toward the camera: a lumpy crown of many florets, finger-like branches, a leaf.',
      forms: ['head', 'floret', 'chopped'],
      scale: 'L',
      // Lying on its side: 15 cm from the cut to the top of the crown, about 10 high and deep.
      size_cm: [15, 10, 10],
      parts: ['florets', 'stalk@pale-green', 'leaf@leaf'],
      notes: 'Lies on its side, never upright like a tree. A crown of many florets: clusters covered in lumps, never a smooth dome (mushroom). Thick pale stalk, flat cut, a branch to every cluster, one leaf. Buds are a shader texture.',
    },
    form: buildBroccoli,
    // The stalk angles toward the camera, down-left, so its length and the fork show.
    turn: -135,
    stemEnds: 'front',
    matte: true,
    skin: { kind: 'florets', size_mm: 4, amount: 0.9 },
  },
  {
    spec: {
      // Board 08's "bread" card, now the baguette (the user, 2026-11-04). A white sandwich loaf
      // comes later as its own ingredient, "toast". The round boule is kept as the `loaf` form.
      id: 'baguette',
      name: 'Baguette',
      archetype: 'long',
      family: 'baked',
      layout: 'solo',
      show: 'A long baguette on a diagonal, four slashes showing pale crumb.',
      forms: ['whole', 'loaf', 'slice', 'crumbs'],
      scale: 'L',
      size_cm: [32, 7.4, 9],
      parts: ['crust', 'crumb@crumb'],
      light_case: 'dark',
      notes: 'Long, softly oval, round ends, settled base, a slight bend. Four angled slashes with raised lips and pale crumb inside. Crust colour, pores and flour dust are a shader texture. The round boule is kept as the loaf form.',
    },
    form: buildBread,
    // On a diagonal, lower left to upper right (board 07, long archetype).
    turn: 35,
    skin: { kind: 'crust', size_mm: 10, amount: 0.9 },
    matte: true,
    budget: [2000, 9000],
  },
  {
    spec: {
      id: 'sauce',
      name: 'Sauce',
      archetype: 'contained',
      family: 'sauce',
      layout: 'solo',
      show: 'One hot sauce bottle standing up, a flat face turned toward the light.',
      forms: ['whole'],
      scale: 'M',
      size_cm: [6.5, 15, 6.5],
      // `label` is the printed hot sauce label (its artwork in src/shading/labelArt.ts). The
      // earlier layered label's parts (wrap to marks) stay listed: it is switched off
      // (WITH_LABEL in forms/sauce.ts), not deleted.
      parts: ['sauce:glow', 'glass@glass', 'collar@crimson', 'cap@crimson', 'label@chili', 'wrap@red', 'frame@gold', 'panel@paper', 'seal@crimson', 'marks@ink'],
      notes:
        'After the user\'s reference (Figma "sauce ref"). Squat body with a soft square section flaring toward the base (a soft triangle), round shoulders, a tall ridged screw cap narrower at the bottom, a collar ring, a thick glass base, a layered label: red wrap, gold frame, cream panel, red seal, dark brush marks. The first condiment: more to come.',
    },
    form: buildSauce,
    // The label face turned toward the key light (upper left).
    turn: -25,
    skin: NO_SKIN,
    rimGlints: false,
    // A ridged cap and a label wrapped all the way round need more mesh than the contained
    // archetype's simple vessel.
    budget: [4000, 16000],
  },
  {
    spec: {
      id: 'cheese',
      name: 'Cheese',
      archetype: 'wedge',
      // Board 08 says Yellow; a paler, buttery cheese family reads truer (families.ts).
      family: 'cheese',
      layout: 'solo',
      show: 'One wedge with four to six round holes, some cut open on the faces.',
      forms: ['whole', 'slice', 'cubes', 'grated', 'melted'],
      scale: 'M',
      size_cm: [12, 5.5, 7.1],
      parts: ['cheese', 'rind@rind'],
      notes:
        'Board 08: a 12 cm wedge from a round wheel, standing on its triangle. Flat cut faces with softly rounded edges, a thin rind along the curved back, round holes opening as craters on the faces. The whole form is the wedge.',
    },
    form: buildCheese,
    // The point aims toward the front left, so the wedge reads as a wedge (not a block).
    turn: 50,
    // Tiny pinholes in the paste, very quiet.
    skin: { kind: 'pores', size_mm: 1.6, amount: 0.35 },
    matte: true,
    // Warm caramel shadows: the violet and pink shadow patches read as stains on a pale cheese.
    shadowTint: 0.35,
    // Meshed from a distance field (surface nets), so the flat faces need a finer grid
    // than the archetype's extruded wedge to keep the holes round, and the holes' insides
    // add surface.
    budget: [2000, 10000],
  },
  {
    spec: {
      id: 'butter',
      name: 'Butter',
      archetype: 'block',
      // Board 08 says Yellow; a paler butter family keeps it apart from the cheese (families.ts).
      family: 'butter',
      layout: 'solo',
      show: 'One block of butter on its creased paper wrapper, one top corner softened and slumping.',
      // Board 08: block, pat, cubes, melted. `whole` is the block.
      forms: ['whole', 'pat', 'cubes', 'melted'],
      scale: 'M',
      size_cm: [12, 4, 6],
      // `paper` is a prop (kit/checks.ts PROPS): left out of the real size and the card's zone.
      // `curl` is a small part (the ribbon the knife scraped off), left out of the real size.
      parts: ['butter', 'curl', 'paper@parchment'],
      notes:
        'Board 08: a 12 x 6 x 4 cm block on a creased paper sheet, one top corner softened and slumping. Soft rounded edges, pillowy faces, two broad melt flows from the soft corner into a small pool at its foot. A knife scrape across the top running out over the front edge, and the curl it took lying on the paper in front. The unfolded wrapper: flat under the block, its flaps rising where they were folded, diagonal creases at the corners, crumpled, edges lifting, one corner curling.',
    },
    form: buildButter,
    // Three-quarter view: the long side to the light (upper left), the soft corner and the end
    // toward the camera, in the shadow side.
    turn: -40,
    // A very faint fine grain, like a slightly matte butter surface (never pitted like cheese).
    skin: { kind: 'pores', size_mm: 1.1, amount: 0.18 },
    // A soft, quiet sheen: a loud highlight ran along the long top edge as a dashed white line.
    matte: true,
    // Pale like the cheese: a little of the shadow's violet and pink, or it reads as stains.
    shadowTint: 0.4,
    // Meshed from a distance field (surface nets), plus the curl and a paper sheet with room
    // for creases.
    budget: [2000, 12000],
  },
];

export function findIngredient(id: string): IngredientEntry | undefined {
  return REGISTRY.find((entry) => entry.spec.id === id);
}

/** A random ingredient that is not the one on stage now. */
export function pickOther(currentId: string, random: () => number = Math.random): IngredientEntry {
  const others = REGISTRY.filter((entry) => entry.spec.id !== currentId);
  if (others.length === 0) return REGISTRY[0];
  return others[Math.floor(random() * others.length) % others.length];
}

/**
 * Read a part name from the spec: `flesh:glow` is the piece `flesh_glow`,
 * `rind@green` is the piece `rind`, painted with the green family.
 */
export function parsePart(part: string): { role: string; family?: FamilyId } {
  const [name, family] = part.split('@');
  return { role: name.replace(':glow', '_glow'), family: family as FamilyId | undefined };
}
