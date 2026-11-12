import type { FamilyId } from './families';
import { buildLemon } from './forms/lemon';
import { buildOrange } from './forms/orange';
import { buildStrawberry } from './forms/strawberry';
import { buildBroccoli } from './forms/broccoli';
import { buildBread } from './forms/bread';
import { buildSauce } from './forms/sauce';
import { buildCheese } from './forms/cheese';
import { buildButter } from './forms/butter';
import { buildWatermelon } from './forms/watermelon';
import { buildSteak } from './forms/steak';
import { buildChicken } from './forms/chicken';
import { buildOnion } from './forms/onion';
import { buildPepper } from './forms/pepper';
import { buildAvocado } from './forms/avocado';
import { buildGrapes } from './forms/grapes';
import { buildBlueberries } from './forms/blueberries';
import { FAMILIES } from './families';
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
  /**
   * True when only some parts of the ingredient touch the table (a drumstick rests on its bulb and
   * its knuckle, the shank in the air): contact shadows go only under what touches, one group of
   * spots per place it rests, never a row along the whole length.
   */
  contactsFromFeet?: boolean;
  /**
   * Pieces left out in Playful strokes (the strokes pass repaints small dark parts as hard blocks
   * that read as errors: the watermelon's seeds, the user 2026-11-11). They still show in the
   * soft look.
   */
  playfulHide?: string[];
  /**
   * Parts that keep a full, glossy highlight although they are small or the body is matte (an
   * avocado's polished pit, the user 2026-11-12: "seed needs highlight").
   */
  glossy?: string[];
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
    // No rim glints: the slashes' raised lips are tight ridges, and the glint lit their facets as
    // pale shards round the slashes (the user, 2026-11-09).
    rimGlints: false,
    budget: [2000, 24000],
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
      // `curl` is a small part (a rolled ribbon of butter), left out of the real size.
      parts: ['butter', 'curl', 'paper@parchment'],
      notes:
        'Board 08: a 12 x 6 x 4 cm block on a creased paper sheet, one top corner softened and slumping. Soft rounded edges, pillowy faces, two broad melt flows from the soft corner into a small pool at its foot. A butter curl lying on the paper in front (the knife scrape on top is switched off). The unfolded wrapper: flat under the block, its flaps rising where they were folded, diagonal creases at the corners, crumpled, edges lifting, one corner curling.',
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
  {
    spec: {
      id: 'watermelon',
      name: 'Watermelon',
      archetype: 'wedge',
      // Board 08 says Red; a pinker, wetter melon family keeps it apart from the apple.
      family: 'melon',
      // Board 08: a cluster of 2. The pair is built in the form (forms/watermelon.ts), because
      // the front wedge leans, which the shared cluster layout cannot do.
      layout: 'solo',
      show: 'Two triangular wedges, rind down, one leaning. Seeds as flat shapes.',
      forms: ['whole', 'slice', 'cube', 'ball'],
      scale: 'L',
      // The pair as it stands (each wedge about 16 cm from point to rind, 3 cm thick).
      size_cm: [18.9, 14.6, 11.4],
      // The pale band is part of the flesh's gradient (the `melon` skin), not a piece.
      // 'rind' is the separate shell, switched off (WITH_SHELL): the flesh's gradient paints it.
      parts: ['flesh:glow', 'rind@leaf', 'seeds@ink'],
      light_case: 'cut-juicy',
      notes:
        'Board 08: two wedges from a round melon, point up, standing on the curved rind, the front one leaning. Rind is a separate green shell; the flesh fades through a pale band into it. A few glossy seeds half sunk into the cut faces, deep plum, never black. The whole form is the pair of wedges: one lying on a cut side, one standing on its rind.',
    },
    form: buildWatermelon,
    turn: 15,
    // The flesh: translucent, grainy, streaked from the centre, fading through a pale band into
    // the green rind (skinTexture.ts, kind melon).
    skin: { kind: 'melon', size_mm: 2.2, amount: 0.8 },
    // A third of the shadow's violet patches: with more, the red flesh read magenta.
    shadowTint: 0.3,
    // A soft, juicy sheen, not a glossy white streak along the edges.
    matte: true,
    // No rim glints: they drew a salmon line along the edge just inside the rind.
    rimGlints: false,
    // The seeds only in the soft look: the strokes turned them into black blocks (the user).
    playfulHide: ['seeds'],
    // Two finely meshed slabs (so their edges stay smooth), their shells and seeds.
    budget: [2000, 30000],
  },
  {
    spec: {
      id: 'steak',
      name: 'Steak',
      archetype: 'block',
      // Board 08 says Pink and raw; a deeper beef red, like the user's references.
      family: 'beef',
      layout: 'solo',
      show: 'One raw tomahawk steak lying flat, its long rib bone reaching out, the fat rim and muscle seams on the cut face.',
      forms: ['whole', 'strips', 'cubes', 'mince'],
      scale: 'L',
      // A tomahawk: the ribeye and its long bone (the card's 20 cm is the meat alone).
      size_cm: [37.2, 5.2, 14.1],
      // The fat rim is painted on the meat (marbled skin), not a separate piece.
      parts: ['meat', 'bone@bone'],
      notes:
        'The user chose a tomahawk (2026-11-10, two references). A thick ribeye eye (a rounded square) tapering into a neck of meat along a long, slightly curved rib bone whose knobby tip rests on the table. A pale fat rim round the top edge and upper sides, lifted off the meat. Muscle sections with pale fat seams and fine marbling are a shader texture (marbled skin), never geometry.',
    },
    form: buildSteak,
    // Three-quarter view, the fat rim at the back left toward the key light (as on the card).
    // The bone reaching back to the right, the cut face toward the camera.
    turn: 25,
    skin: { kind: 'marbled', size_mm: 6, amount: 0.85 },
    // Pink and raw: a little of the shadow's violet and pink, or the meat reads purple.
    shadowTint: 0.3,
    // No rim glints: they drew a blocky white streak along the top's soft edge.
    rimGlints: false,
    // A meshed slab and its fat skin.
    budget: [2000, 24000],
  },
  {
    spec: {
      id: 'chicken',
      name: 'Chicken',
      archetype: 'long',
      // Board 08 says Pink and raw (a deep salmon); raw chicken skin is far paler (families.ts).
      family: 'poultry',
      layout: 'solo',
      show: 'One raw chicken drumstick lying on a diagonal, the meaty bulb at the back, the bone and its knuckle reaching toward the camera.',
      // Board 08's forms. `whole` is the drumstick.
      forms: ['whole', 'thigh', 'breast', 'strips', 'diced'],
      scale: 'M',
      // The drumstick lying down, bone and knuckle included (board 08: 15 cm).
      size_cm: [15.5, 4.8, 5.4],
      // The skin, its edge, the bare shank and its tendons are painted on the meat (the poultry
      // skin); the bone and its knuckle are one piece, its cartilage cap painted (the knuckle skin).
      parts: ['meat:glow', 'knuckle@bone'],
      light_case: 'pale',
      notes:
        'Board 08: raw, pale pink skin, bone tip showing (the reference is cooked: shape only). A full, slightly lopsided bulb with a soft groove between its two big muscles, a concave taper into a slim shank with soft tendon ridges, the skin pulled back unevenly to show pink meat, then the bare bone and a knuckle of two rounded knobs. Lies with the bulb settled on the table and the knuckle resting on it. Skin follicles, fat and meat showing through, and the cartilage cap are a shader texture, never geometry.',
    },
    form: buildChicken,
    // On a diagonal (the long archetype): the bulb at the back left toward the key light, the
    // knuckle reaching toward the camera on the right.
    turn: -30,
    skin: { kind: 'poultry', size_mm: 3, amount: 0.85 },
    // Pale like the cheese and butter: a little of the shadow's violet and pink, or it stains.
    shadowTint: 0.35,
    // No rim glints: the slim shank and knuckle face the light like a bottle's neck (sauce, steak).
    rimGlints: false,
    // Only the bulb and the knuckle touch the table: contact shadows there, none under the shank.
    contactsFromFeet: true,
    // A finely meshed bulb (its groove and lumps) and a knuckle of two small knobs.
    budget: [2000, 18000],
  },
  {
    spec: {
      id: 'onion',
      name: 'Red onion',
      archetype: 'round',
      family: 'onion',
      layout: 'solo',
      show: 'One whole red onion standing on its root end, its dry papery neck tip curling over.',
      forms: ['whole', 'half', 'rings', 'diced'],
      scale: 'M',
      size_cm: [8.1, 10.6, 7.9],
      // `tip` is the dry papery neck tip (twisted ribbons), `roots` the dry root tuft.
      parts: ['bulb:glow', 'tip@papery', 'roots@papery'],
      notes:
        'Round 2, after the user\'s watercolour reference. A round, lopsided globe lying tipped on its side; full shoulders pulling up into a short twisted neck whose dry papery tip curls over; a tuft of dry roots. Fine darker lines and soft bands from root to neck, papery flakes, the root patch and the neck drying toward its tip are a shader texture (the onion skin), never geometry.',
    },
    // Upright (the user's choice, 2026-11-12, of three: upright, a pair, whole and cut). The pair
    // and the cut half stay in the form (buildOnionArrangement), for the whole-and-cut layout.
    form: buildOnion,
    turn: 0,
    skin: { kind: 'onion', size_mm: 2, amount: 0.85 },
    // A quiet, satin sheen: the full one lit pale, flat patches on the bulb.
    matte: true,
    // A deep colour: about half the shadow's violet and pink patches (they sit close to its hue).
    shadowTint: 0.5,
    // No rim glints: the slim neck facing the light would catch a hard bar (sauce, steak).
    rimGlints: false,
    // A finely turned bulb (its veins follow the mesh) and three small ribbons.
    budget: [2000, 12000],
  },


  {
    spec: {
      id: 'pepper',
      name: 'Orange pepper',
      archetype: 'round',
      family: 'pepper',
      layout: 'solo',
      show: 'One orange bell pepper standing on its four feet, its thick green stem curving over.',
      forms: ['whole', 'half', 'strips', 'diced'],
      scale: 'M',
      size_cm: [9, 8.1, 9],
      parts: ['body:glow', 'calyx@leaf', 'stem@leaf'],
      notes:
        'Round 2. A blocky body of four uneven lobes with soft grooves between them, deepest at the top and the feet; full shoulders dipping into a deep well; four soft bumps underneath that it stands on; a thick, curved green stem with a flared calyx, its end cut. The glossy skin, deeper grooves and glow are a shader texture (the pepper skin).',
    },
    form: buildPepper,
    turn: 20,
    skin: { kind: 'pepper', size_mm: 4, amount: 0.8 },
    // The gloss is painted by the skin (long streaks down the lobes); the shared sheen stays quiet,
    // or it scattered round pale patches over the lobes.
    matte: true,
    // Warm brick-red shadows: a little of the violet and pink, or they read pink on the orange.
    shadowTint: 0.3,
    // No rim glints: the thick stem facing the light would catch a hard bar.
    rimGlints: false,
    budget: [2000, 14000],
  },
  {
    spec: {
      id: 'avocado',
      name: 'Avocado',
      archetype: 'round',
      family: 'avocado',
      layout: 'whole-and-cut',
      show: 'One whole avocado standing behind on the left, and a half cut lengthwise in front on the right, leaning back, its pit in the creamy face, tipped toward the camera.',
      forms: ['whole', 'half', 'slices', 'diced', 'mashed'],
      scale: 'M',
      size_cm: [12.1, 9.9, 14],
      // Both bodies are `skin`: the whole one and the half (the cut face painted from its map).
      parts: ['skin:glow', 'pit@pit', 'stem@stalk'],
      light_case: 'whole-next-to-cut',
      notes:
        'Round 2 (the user: one whole, one half). A pear shape: a full round bottom, a narrower rounded top, a short woody stem nub. The half is cut lengthwise: creamy yellow flesh turning bright green toward a thin dark skin, a big glossy brown pit sitting proud of the face in the wide end. Skin pebbling and specks and the flesh are a shader texture (the avocado skin).',
    },
    form: buildAvocado,
    turn: 0,
    skin: { kind: 'avocado', size_mm: 2.2, amount: 0.85 },
    // A satin skin and a soft, buttery face: the sheen stays quiet.
    matte: true,
    // The pit is polished: it keeps a full highlight.
    glossy: ['pit'],
    // Contact shadows only where each one touches the table (the half rests on a strip of skin at
    // its front: measured as one body, a spot reached out past the cast shadow).
    contactsFromFeet: true,
    shadowTint: 0.4,
    rimGlints: false,
    budget: [2000, 30000],
  },
  {
    spec: {
      id: 'grapes',
      name: 'Red grapes',
      archetype: 'small',
      family: 'grape',
      layout: 'solo',
      show: 'A bunch of red grapes lying on its side, berries resting on the table and on each other, the golden stem curling up off the table at the top.',
      forms: ['whole', 'halved'],
      scale: 'M',
      size_cm: [12.2, 6.4, 8.6],
      parts: ['berry:glow', 'stem@vine'],
      light_case: 'group',
      notes:
        'Round 2, after the user\'s reference (red globe grapes on a golden stem). About 22 oval berries on a branching woody stem, settled on the table by a drop-and-nudge pass so they touch but never sink in; each stalk ends in a small flared cap; the cut end of the stem curls up. Mottled wine to coral, a waxy bloom, a pale spot at the stalk and the glow of thin skin are a shader texture (the grape skin).',
    },
    form: buildGrapes,
    turn: 0,
    skin: { kind: 'grape', size_mm: 2, amount: 0.9 },
    shadowTint: 0.5,
    // Thin stems catch rim glints as hard lines.
    rimGlints: false,
    contactsFromFeet: true,
    budget: [2000, 22000],
  },
  {
    spec: {
      id: 'blueberries',
      name: 'Blueberries',
      archetype: 'small',
      family: 'blueberry',
      layout: 'solo',
      show: 'A loose pile of blueberries on the table, crowns facing every way (many toward the camera), two strays rolled a little way off.',
      forms: ['whole', 'halved'],
      scale: 'S',
      size_cm: [6.2, 2.9, 5.9],
      parts: ['berry'],
      light_case: 'group',
      notes:
        'Round 2, after the user\'s reference (blueberries in a punnet; the punnet is a later tool, so a loose pile). Small, slightly flattened berries, each with a five-pointed star crown (a crater with raised points), settled into a mound by the kit\'s drop-and-nudge pass. The dusty bloom, the deep blue where it is rubbed off and the crown\'s dark centre are a shader texture (the blueberry skin).',
    },
    form: buildBlueberries,
    turn: 0,
    skin: { kind: 'blueberry', size_mm: 1.5, amount: 0.9 },
    shadowTint: 0.6,
    rimGlints: false,
    contactsFromFeet: true,
    // Up to three more berries may be tucked in to hold the pile in balance.
    budget: [2000, 30000],
  },
];

export function findIngredient(id: string): IngredientEntry | undefined {
  return REGISTRY.find((entry) => entry.spec.id === id);
}

/**
 * How many recently shown ingredients Shuffle holds back: all but the three seen longest ago,
 * and never more than seven (the user, 2026-11-06: repeat only after five to seven others).
 * With ten ingredients, nothing comes back within eight shuffles.
 */
export function holdBack(total: number): number {
  return Math.max(1, Math.min(7, total - 3));
}

/**
 * A random ingredient that has not been shown lately. `recent` lists the ids shown, oldest
 * first, the one on stage last. Like dealing from a deck that only gets an old card back once
 * enough new ones have been dealt.
 */
export function pickFresh(recent: string[], random: () => number = Math.random): IngredientEntry {
  const held = new Set(recent.slice(-holdBack(REGISTRY.length)));
  let fresh = REGISTRY.filter((entry) => !held.has(entry.spec.id));
  if (fresh.length === 0) return pickOther(recent[recent.length - 1] ?? '', random);
  // Rooms may repeat from round 2, but never twice in a row (the user, 2026-11-11).
  const now = recent.length ? findIngredient(recent[recent.length - 1]) : undefined;
  const roomNow = now ? roomOf(now) : undefined;
  const otherRoom = fresh.filter((entry) => roomOf(entry) !== roomNow);
  if (otherRoom.length > 0) fresh = otherRoom;
  return fresh[Math.floor(random() * fresh.length) % fresh.length];
}

/** The room an ingredient opens in: its family's first room. */
export function roomOf(entry: IngredientEntry): string | undefined {
  return FAMILIES[entry.spec.family].rooms[0];
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
