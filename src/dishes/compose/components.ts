import { CylinderGeometry, SphereGeometry, type BufferGeometry } from 'three';
import { signed } from '../../ingredients/forms/kit/random';
import type { FormPiece } from '../../ingredients/forms/kit/piece';
import type { FamilyId } from '../../ingredients/families';
import { FLESH_SKIN, SAUCE_SKIN } from '../../shading/effects/skinTexture';
import { withFrame } from '../kit/cut';
import { pool } from '../kit/pool';
import { cutBody, settle, type Field, type RoleLook } from './elements';
import type { ElementInfo } from './layout';

/**
 * The Kitchen's component library (the fix list, 2026-11-25, P1): the supporting elements a
 * generated dish may add round the table's ingredients, so one apple can come out as an apple tart
 * with cream and a quenelle of ice cream, not three wedges on porcelain.
 *
 * Think of them as the props and set dressing of a food shoot: the ingredients on the table stay the
 * stars (`heroes` only ever lists them); the library completes the plate. A component never
 * outshines the hero.
 *
 * Two kinds, by where they are built:
 * - Pieces (placed by the planner like any ingredient, written as a part `kind:family*count`, the
 *   family being its colour): a tart shell, a quenelle, whipped cream, a tuile, a smear, a puree.
 *   Existing pantry forms serve the rest: a crumb is `butter:crumble`, a crouton `baguette:cube`.
 * - Garnish (scattered by the builder's last layer over the food and its sauce): oil dots, gel
 *   beads and microherbs.
 *
 * Every piece is built in centimetres with one stylised material and soft edges (PAINT_TOUCH), never
 * a photoreal garnish.
 */

export type ComponentKind =
  | 'tart-shell'
  | 'crumb'
  | 'crouton'
  | 'puree'
  | 'smear'
  | 'gel'
  | 'foam'
  | 'oil-dot'
  | 'whipped-cream'
  | 'quenelle'
  | 'tuile'
  | 'microherb'
  | 'chip'
  | 'shaving'
  | 'pool'
  | 'drizzle';

export interface DishComponent {
  kind: ComponentKind;
  /** Its colour family (src/ingredients/families.ts). */
  family: FamilyId;
  /** The role it is painted under (partSkins role). */
  role: string;
  count: number;
  /** How it is placed, relative to the hero or the plate. */
  place: 'under' | 'beside' | 'on-hero-allowed' | 'on-base' | 'dots-around';
  /** For pieces: the part written into the idea (`quenelle:ice-cream*1`). Garnish has none. */
  part?: string;
  /** What the caption calls it, when it is a table ingredient made sweet ("a lime curd"). */
  label?: string;
  /** The table ingredient it was made from (a sweet dish's curd, jam or brittle). */
  from?: string;
}

/** The part names of the piece components (the `ingredient` half of `kind:family`). */
export const COMPONENT_PIECES: Record<string, ComponentKind> = {
  tart: 'tart-shell',
  quenelle: 'quenelle',
  whip: 'whipped-cream',
  tuile: 'tuile',
  smear: 'smear',
  puree: 'puree',
};

/** Garnish components: built by the builder's garnish layer, never planned as pieces. */
export const GARNISH_KINDS: ComponentKind[] = ['oil-dot', 'gel', 'microherb'];

export function isComponent(ingredient: string): boolean {
  return ingredient in COMPONENT_PIECES;
}

/** A component as a piece, ready for the idea (and the DishComponent record that names it). */
export function componentPiece(ingredient: keyof typeof COMPONENT_PIECES, family: FamilyId, count: number, place: DishComponent['place']): DishComponent {
  return { kind: COMPONENT_PIECES[ingredient], family, role: componentRole(ingredient, family), count, place, part: `${ingredient}:${family}${count > 1 ? `*${count}` : ''}` };
}

/** A garnish component (oil dots, gel beads, microherbs). */
export function componentGarnish(kind: 'oil-dot' | 'gel' | 'microherb', family: FamilyId, count: number): DishComponent {
  return { kind, family, role: `comp_${kind}_${family}`, count, place: 'dots-around' };
}

function componentRole(ingredient: string, family: string): string {
  return `comp_${ingredient}_${family}`;
}

/** Each piece's plan shape (its footprint from above, in cm). */
export function componentInfo(ingredient: string): ElementInfo {
  switch (ingredient) {
    case 'tart':
      return { shape: 'circle', r: 5.6, group: 'pair', shrinks: false };
    case 'quenelle':
      return { shape: 'circle', r: 2, group: 'pair', shrinks: false };
    case 'whip':
      return { shape: 'circle', r: 1.3, group: 'heap', shrinks: false };
    case 'tuile':
      return { shape: 'rect', w: 2.6, h: 7, group: 'scatter', shrinks: false };
    case 'smear':
      return { shape: 'rect', w: 2.4, h: 9.5, group: 'scatter', shrinks: false };
    case 'puree':
    default:
      return { shape: 'circle', r: 2.2, group: 'heap', shrinks: false };
  }
}

/** The roles a piece component paints (the first is the piece itself). */
export function componentLooks(ingredient: string, family: FamilyId): RoleLook[] {
  const role = componentRole(ingredient, family);
  switch (ingredient) {
    case 'tart':
      // The shell is biscuit gold, paler at the cut rim; the filling its own colour, softly glossy.
      return [
        { role, family: 'pastry', skin: { ...FLESH_SKIN, pale: '#fde6b4', green: '#d08a42' } },
        { role: `${role}_fill`, family, skin: { ...SAUCE_SKIN, amount: 0.35 }, glossy: true },
      ];
    case 'quenelle':
      return [{ role, family, skin: { ...SAUCE_SKIN, amount: 0.3 }, glossy: true }];
    case 'whip':
      return [{ role, family, skin: { ...SAUCE_SKIN, amount: 0.25 } }];
    case 'tuile':
      return [{ role, family, skin: { ...FLESH_SKIN, pale: '#fde6b4', green: '#d9973e' } }];
    case 'smear':
      return [{ role, family, skin: SAUCE_SKIN, glossy: true }];
    case 'puree':
    default:
      return [{ role, family, skin: { ...SAUCE_SKIN, amount: 0.4 }, glossy: true }];
  }
}

/** The look of a garnish component. */
export function garnishLook(c: DishComponent): RoleLook {
  if (c.kind === 'microherb') return { role: c.role, family: c.family };
  return { role: c.role, family: c.family, skin: SAUCE_SKIN, glossy: true };
}

/** Build one piece component, resting on y = 0, its middle over the origin. */
export function makeComponent(ingredient: string, family: string, random: () => number): FormPiece[] {
  const role = componentRole(ingredient, family);
  switch (ingredient) {
    case 'tart':
      return settle(tartShell(role, random));
    case 'quenelle':
      return settle([{ role, geometry: quenelle(random) }]);
    case 'whip':
      return settle([{ role, geometry: whippedCream(random) }]);
    case 'tuile':
      return settle([{ role, geometry: tuile(random) }]);
    case 'smear':
      return settle([{ role, geometry: smear(random) }]);
    case 'puree':
    default:
      return settle([{ role, geometry: puree(random) }]);
  }
}

/**
 * A tart, 11 cm across: a thin pastry base, a fluted rim standing round it, and a filling (frangipane,
 * custard or cream, in the filling's family) level a little below the rim, so the fruit laid on top
 * sits in it like a real tart.
 */
function tartShell(role: string, random: () => number): FormPiece[] {
  const R = 5.5;
  const flutes = 22 + Math.floor(random() * 6);
  const shell: Field = (x, y, z) => {
    const r = Math.hypot(x, z);
    const a = Math.atan2(z, x + 1e-6);
    const base = Math.max(r - R, Math.abs(y - 0.18) - 0.18);
    const flute = 0.13 * Math.cos(a * flutes);
    const rim = Math.max(Math.abs(r - (R - 0.3) - flute) - 0.3, Math.abs(y - 0.7) - 0.7);
    return Math.min(base, rim);
  };
  const fill: Field = (x, y, z) => {
    const r = Math.hypot(x, z);
    return Math.max(r - (R - 0.55), Math.abs(y - 0.72) - 0.4 - 0.04 * (1 - (r / R) ** 2));
  };
  return [
    { role, geometry: cutBody(shell, [], { reach: R + 0.4, depth: 0.4, rounding: 0 }) },
    { role: `${role}_fill`, geometry: cutBody(fill, [], { reach: R, depth: 0.4, rounding: 0 }) },
  ];
}

/**
 * A scoop of ice cream (item G: the old quenelle read as a white blob): a round ball on a flattened
 * foot, with the ruffled lip a scoop leaves where it was pressed off.
 */
function quenelle(random: () => number): BufferGeometry {
  const R = 1.7 + random() * 0.2;
  const turn = random() * 6;
  const field: Field = (x, y, z) => {
    const ball = Math.hypot(x, y - R * 0.82, z) - R;
    const t = (y - 0.35) / 0.5;
    const a = Math.atan2(z, x);
    const lip = Math.abs(t) < 1 ? Math.hypot(x, z) - (R * 1.04 + 0.16 * Math.sin(a * 9 + turn) * (1 - t * t)) : Infinity;
    return Math.max(Math.min(ball, lip), -y);
  };
  return cutBody(field, [], { reach: R * 1.95, depth: R * 1.9, rounding: 0 });
}

/** Whipped cream: a soft piped rosette, star ridges spiralling up to a curled tip. */
function whippedCream(random: () => number): BufferGeometry {
  const H = 1.9 + random() * 0.4;
  const turn = random() * 6;
  const field: Field = (x, y, z) => {
    const t = Math.max(0, Math.min(1, y / H));
    const a = Math.atan2(z, x + 1e-6);
    const r = 1.25 * (1 - t) ** 0.75 * (1 + 0.13 * Math.cos(a * 8 + y * 2.6 + turn)) + 0.06;
    const tipX = 0.25 * t * t;
    return Math.max((Math.hypot(x - tipX, z) - r) * 0.8, -y, y - H);
  };
  return cutBody(field, [], { reach: H + 0.2, depth: 1, rounding: 0 });
}

/** A tuile: a thin crisp curl of biscuit, about 7 cm long, lying on its curve, its edges lacy. */
function tuile(random: () => number): BufferGeometry {
  const half = 3.2 + random() * 0.4;
  const wall = 3.4;
  const ph = random() * 6;
  const field: Field = (x, y, z) => {
    const cy = y + wall - 0.5;
    const r = Math.hypot(x, cy);
    const a = Math.atan2(x, cy);
    const edge = 0.36 * (1 + 0.08 * Math.sin(z * 4.3 + ph) + 0.05 * Math.sin(z * 9.7 + ph));
    return Math.max(Math.abs(r - wall) - 0.1, (Math.abs(a) - edge) * wall, Math.abs(z) - half);
  };
  return cutBody(field, [], { reach: half + 0.4, depth: 0.2, rounding: 0 });
}

/** A smear: a spoon's swipe of puree or sauce, fat where it starts and thinning to a tail. */
function smear(random: () => number): BufferGeometry {
  const L = 4.4 + random() * 0.4;
  const W = 1.05 + random() * 0.15;
  const g = pool({
    at: [0, 0],
    depth: 0.12,
    floor: () => 0,
    edge: 0.35,
    outline: (a) => {
      const along = Math.sin(a); // +1 at the fat start, -1 at the tail
      const w = W * (0.65 + 0.35 * along);
      return 1 / Math.hypot(Math.sin(a) / L, Math.cos(a) / w);
    },
    rings: 18,
    segments: 72,
  });
  return withFrame(g, false);
}

/** A puree: a small soft mound spooned on the plate, its top swirled by the spoon. */
function puree(random: () => number): BufferGeometry {
  const R = 1.9 + random() * 0.3;
  const ph = random() * 6;
  const g = pool({
    at: [0, 0],
    depth: 0.9,
    floor: () => 0,
    edge: 0.6,
    outline: (a) => R * (1 + 0.06 * Math.cos(3 * a + ph)),
    bumps: (x, z) => 0.12 * Math.sin(Math.atan2(z, x) * 2 + Math.hypot(x, z) * 2.4 + ph),
    rings: 20,
    segments: 64,
  });
  return withFrame(g, false);
}

/** An oil dot or a gel bead: a small glossy drop (a gel stands a little taller). */
export function dot(kind: 'oil-dot' | 'gel', role: string, random: () => number): FormPiece {
  const r = kind === 'gel' ? 0.28 + random() * 0.12 : 0.22 + random() * 0.2;
  const g = new SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, kind === 'gel' ? 0.75 : 0.22, 1);
  return { role, geometry: withFrame(g, false) };
}

/** A microherb: a tiny pair of leaves on a short stem (finer than the chopped herbs). */
export function microherb(role: string, random: () => number): FormPiece[] {
  const leaf = (side: number) => {
    const g = new SphereGeometry(0.22, 10, 6);
    g.scale(1, 0.12, 0.55);
    g.translate(0.2 * side, 0.32, 0);
    g.rotateY(signed(random) * 0.4);
    return withFrame(g, false);
  };
  const stem = new CylinderGeometry(0.025, 0.03, 0.34, 5);
  stem.translate(0, 0.17, 0);
  return [
    { role, geometry: withFrame(stem, false) },
    { role, geometry: leaf(1) },
    { role, geometry: leaf(-1) },
  ];
}

/**
 * Snipped chives (R8: a Vichyssoise is finished with chives): a thin green rod about 1 cm long and
 * 0.2 cm across, lying flat.
 */
export function chive(random: () => number): FormPiece {
  const g = new CylinderGeometry(0.022, 0.022, 0.2 + random() * 0.12, 6);
  g.rotateZ(Math.PI / 2);
  g.rotateY(random() * Math.PI);
  g.translate(0, 0.022, 0);
  return { role: 'herb', geometry: withFrame(g, false) };
}
