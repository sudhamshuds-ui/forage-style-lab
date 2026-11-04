import type { FamilyId } from './families';
import { buildLemon } from './forms/lemon';
import { buildOrange } from './forms/orange';
import type { FormBuilder } from './forms/kit/piece';
import type { TRIANGLE_BUDGET } from './forms/kit/checks';

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
      parts: ['peel', 'stem@green', 'leaf@green', 'flesh:glow', 'pith', 'segments'],
      light_case: 'whole-next-to-cut',
      notes: 'Small stem and leaf. Slightly squashed, full shoulders. Slice shows segments as soft wedges. Pores are a shader texture.',
    },
    form: buildOrange,
    turn: 0,
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
