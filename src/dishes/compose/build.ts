import { BufferGeometry, CylinderGeometry, LatheGeometry, Vector2, Vector3 } from 'three';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import { leafPiece } from '../../ingredients/forms/kit/stemLeaf';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import type { FamilyId } from '../../ingredients/families';
import { riceBowlParts } from '../../ingredients/forms/rice';
import { SAUCE_SKIN, CERAMIC_SKIN, type Skin } from '../../shading/effects/skinTexture';
import { withFrame } from '../kit/cut';
import { Table, clearOf, plate, posed } from '../kit/place';
import { pool, wobble } from '../kit/pool';
import { DINNER_PLATE, PASTA_BOWL, ware } from '../kit/ware';
import type { DishIdea } from '../catalog';
import type { Dish } from '../dishes';
import { composePlan, readPart, type ComposedPlan } from './layout';
import { BASE_FAMILY, PLATE_LOOK, elementLooks, herbLeaf, makeElement, type Look, type RoleLook } from './elements';

/**
 * The composer's second step: the plan built in 3D (the user's rule: "and then recreate it using
 * the elements"). Each plan shape becomes its element, turned and placed where the plan says, then
 * set down with the table's `rest` so it settles onto the plate or onto what is under it; garnish
 * is slid clear of the hero (`clearOf`: never on top of it). Herbs fall last, over everything.
 *
 * Order, like building up a painting: ware, base, hero, medium, small, herbs.
 */

/** Cooked dishes (mains, snacks) sear their pieces; fresh starters, desserts and drinks do not. */
function isCooked(idea: DishIdea): boolean {
  if (idea.course === 'drink' || idea.course === 'dessert') return false;
  return !/salad|crudo|slaw|poke|salsa|gazpacho|caprese|board|smoothie|cooler/i.test(idea.id + idea.title);
}

/** Every role the dish uses, in order (the hero first: it takes the main highlight and the entry's skin). */
export function dishLooks(idea: DishIdea): RoleLook[] {
  const seared = isCooked(idea);
  const looks: RoleLook[] = [];
  const add = (look: RoleLook) => {
    if (!looks.some((l) => l.role === look.role)) looks.push(look);
  };
  for (const text of [idea.big, ...idea.medium, ...idea.small]) {
    const part = readPart(text);
    if (part.form === 'herb') add({ role: 'herb', family: 'leaf' });
    else for (const look of elementLooks(part, seared)) add(look);
  }
  const [kind] = idea.base.split(':');
  if (kind === 'pool' || kind === 'soup' || kind === 'mash') add({ role: 'pool', family: BASE_FAMILY[idea.base] ?? 'cream', skin: SAUCE_SKIN, glossy: kind !== 'mash' });
  if (kind === 'leaves') add({ role: 'bed', family: BASE_FAMILY[idea.base] ?? 'leaf' });
  if (kind === 'drink') {
    add({ role: 'drink', family: BASE_FAMILY[idea.base] ?? 'drink-pale', skin: { ...SAUCE_SKIN, amount: 0.5 }, glossy: true });
    add({ role: 'glass', family: 'glass', glossy: true });
  }
  if (idea.ware === 'deep') {
    add({ role: 'rice', family: 'cooked-rice', skin: { kind: 'rice', size_mm: 5.5, amount: 0.9 } });
    add({ role: 'bowl', family: 'glaze' });
  } else if (idea.ware !== 'glass') add(PLATE_LOOK[idea.ware]);
  return looks;
}

/** Ware: its geometry and the height of its top surface. */
function makeWare(idea: DishIdea, seed: number): { pieces: FormPiece[]; floor: (x: number, z: number) => number; rice?: ReturnType<typeof riceBowlParts> } {
  switch (idea.ware) {
    case 'plate':
    case 'slate': {
      const w = ware(DINNER_PLATE);
      return { pieces: [{ role: 'plate', geometry: w.geometry }], floor: w.floor };
    }
    case 'bowl': {
      const w = ware(PASTA_BOWL);
      return { pieces: [{ role: 'plate', geometry: w.geometry }], floor: w.floor };
    }
    case 'deep': {
      const rice = riceBowlParts(seed, 0.45);
      return {
        pieces: [
          { role: 'rice', geometry: rice.rice },
          { role: 'bowl', geometry: rice.bowl },
        ],
        floor: (x, z) => (Math.hypot(x, z) < rice.radius ? rice.surfaceAt(x, z) : 0),
        rice,
      };
    }
    case 'board': {
      // A light wooden board, rounded at its corners and edges, 1.6 cm thick.
      const board = boardGeometry(30, 1.6, 22);
      return { pieces: [{ role: 'board', geometry: board }], floor: (x, z) => (Math.abs(x) < 15 && Math.abs(z) < 11 ? 1.6 : 0) };
    }
    case 'glass':
    default:
      return { pieces: [], floor: () => 0 };
  }
}

/** A board: a rounded slab (a box with soft edges), its top at y = h. */
function boardGeometry(w: number, h: number, d: number): BufferGeometry {
  // Spun is not right for a rectangle: a rounded box from a cylinder-like profile is enough here.
  const g = new CylinderGeometry(1, 1, h, 48, 1);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    // A superellipse: a rectangle with rounded corners.
    const c = Math.cos(a);
    const s = Math.sin(a);
    const n = 8;
    const r = 1 / (Math.abs(c) ** n + Math.abs(s) ** n) ** (1 / n);
    const k = Math.hypot(x, z) > 1e-6 ? 1 : 0;
    pos.setXYZ(i, c * r * (w / 2) * k, pos.getY(i) + h / 2, s * r * (d / 2) * k);
  }
  g.computeVertexNormals();
  return withFrame(g, false);
}

/** A glass tumbler with a drink in it: the drink's column, a glass base and a lip above it. */
function drinkPieces(at: [number, number], random: () => number): FormPiece[] {
  const R = 3.6;
  // Only a thin lip stands above the drink: the painting cannot see through glass, so a tall clear
  // wall would read as an opaque white band.
  const height = 8.4;
  const fill = 7.8;
  // The drink: a column, its top a soft dome (froth, a meniscus), its sides a touch tapered.
  const drink = new LatheGeometry(
    [new Vector2(0.001, 0.9), new Vector2(R * 0.9, 0.9), new Vector2(R * 0.97, fill * 0.6), new Vector2(R * 0.985, fill), new Vector2(R * 0.7, fill + 0.35), new Vector2(0.001, fill + 0.45)],
    64,
  );
  // The glass: a thick clear base and the rim standing above the drink.
  const glass = new LatheGeometry(
    [new Vector2(0.001, 0), new Vector2(R * 0.92, 0), new Vector2(R * 0.95, 0.9), new Vector2(R * 0.9, 0.95), new Vector2(0.001, 0.95)],
    64,
  );
  const rim = new LatheGeometry([new Vector2(R * 0.985, fill), new Vector2(R, height), new Vector2(R * 1.02, height + 0.08), new Vector2(R * 0.96, height), new Vector2(R * 0.95, fill + 0.1)], 64);
  for (const g of [drink, glass, rim]) g.translate(at[0], 0, at[1]);
  void random;
  return [
    { role: 'drink', geometry: withFrame(drink, false) },
    { role: 'glass', geometry: withFrame(glass, false) },
    { role: 'glass', geometry: withFrame(rim, false), doubleSided: true },
  ];
}

/** Build a composed dish from its plan. */
export function composedBuilder(idea: DishIdea): FormBuilder {
  return ({ seed }) => {
    const random = seededRandom(seed ^ 0xc0de);
    const composed: ComposedPlan = composePlan(idea);
    const seared = isCooked(idea);
    void seared;
    const w = makeWare(idea, seed);
    const table = new Table(w.floor);
    const parts: FormPiece[] = [];
    const late: FormPiece[] = [...w.pieces];

    // The base.
    const { kind, what, at: baseAt, r: baseR } = composed.base;
    if (kind === 'pool' || kind === 'soup' || kind === 'mash') {
      const depth = kind === 'soup' ? 1.4 : kind === 'mash' ? 0.9 : 0.32;
      const geometry = pool({
        outline: wobble(baseR, [[3, 0.025, random() * 6], [5, 0.02, random() * 6], [7, 0.012, random() * 6]]),
        at: baseAt,
        depth,
        edge: kind === 'pool' ? 0.3 : 0.5,
        floor: w.floor,
        bumps: kind === 'mash' ? (x, z) => 0.12 * Math.abs(Math.sin(x * 3.1 + 1) * Math.sin(z * 2.9 + 2)) : undefined,
        rings: 36,
        segments: 110,
      });
      table.add([{ role: 'pool', geometry }]);
      late.push({ role: 'pool', geometry });
    } else if (kind === 'leaves') {
      // A bed of leaves fanned round the middle, tips out, each its own size and turn.
      const n = 7;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + signed(random) * 0.2;
        const long = (what === 'romaine' ? 9 : what === 'cabbage' ? 7.5 : 6.5) * (0.85 + random() * 0.25);
        const g = leafPiece({
          base: new Vector3(baseAt[0] + Math.cos(a) * 1.2, 0, baseAt[1] + Math.sin(a) * 1.2),
          turn: -a,
          length: long,
          width: long * (what === 'romaine' ? 0.42 : 0.62),
          lift: (d) => 0.9 * (d / long) ** 2 + 0.15,
          fold: 0.45,
          twist: signed(random) * 0.25,
          rows: 12,
          cols: 6,
        });
        parts.push(...table.rest([{ role: 'bed', geometry: g, doubleSided: true }], { tilt: 0.1 }));
      }
    } else if (kind === 'drink') {
      const glassParts = drinkPieces(baseAt, random);
      table.add(glassParts);
      late.push(...glassParts);
    }

    // The hero first (it keeps its place), then what must stay clear of it.
    const keep = new Table(w.floor);
    const heroAt = composed.placed.find((p) => p.size === 'big')?.at ?? [0, 0];
    const tierOrder = ['big', 'medium', 'small'] as const;
    for (const tier of tierOrder) {
      for (const p of composed.placed.filter((q) => q.size === tier)) {
        const elementSeed = (seed + p.index * 7919 + p.part.ingredient.length * 104729) >>> 0;
        const element = makeElement(p.part, random, elementSeed);
        const turned = posed(element, { scale: p.scale, turn: (-p.angle * Math.PI) / 180 });
        const lifted = posed(turned, { at: [p.at[0], 20, p.at[1]] });
        // On a drink, the hero garnish sits on the glass's rim.
        if (kind === 'drink' && tier === 'big') {
          const rim = posed(turned, { at: [baseAt[0] + 3.2, 9.4, baseAt[1] + 0.8], tip: 0 });
          parts.push(...rim);
          continue;
        }
        const flat = ['wheel', 'slice', 'leaf', 'egg', 'toast', 'mash'].includes(p.part.form);
        const sink = kind === 'soup' ? 0.6 : kind === 'pool' || kind === 'mash' ? 0.12 : 0.04;
        const placed = tier === 'big' ? table.rest(lifted, { tilt: flat ? 0.15 : 0.25, sink }) : table.rest(clearOf(lifted, keep, heroAt, 0.1), { tilt: flat ? 0.35 : 0.3, sink });
        if (tier === 'big') keep.add(placed);
        parts.push(...placed);
      }
    }

    // Herbs last, over everything.
    for (const [x, z] of composed.herbs) {
      const h = herbLeaf(random);
      parts.push(...posed([h], { at: [x, table.height(x, z) + 0.02, z] }));
    }

    // The hero's role first in the finished list (it takes the entry's skin and main highlight).
    const looks = dishLooks(idea);
    const order = new Map(looks.map((l, i) => [l.role, i]));
    const all = [...parts, ...late].filter((p) => order.has(p.role));
    all.sort((a, b) => (order.get(a.role) ?? 99) - (order.get(b.role) ?? 99));
    return plate(all);
  };
}

/** The room a dish opens in: chosen for its hero's colour, from the soft rooms. */
const ROOM: Record<string, string> = {
  salmon: 'lavender', steak: 'seafoam', cabbage: 'iris', potato: 'iris', pear: 'lavender', chicken: 'seafoam', eggs: 'mist',
  apple: 'seafoam', baguette: 'mist', watermelon: 'celadon', strawberry: 'celadon', broccoli: 'thistle', peach: 'mist',
  milk: 'iris', blueberries: 'apricot', orange: 'lavender', pepper: 'seafoam', rice: 'rosewater', tomato: 'celadon',
  avocado: 'thistle', cheese: 'iris', mushroom: 'mist', lemon: 'iris', lime: 'thistle', grapes: 'spruce', spinach: 'thistle',
  onion: 'celadon', garlic: 'lavender', romaine: 'thistle', butter: 'iris', strawberries: 'celadon',
};

/** A catalogue idea as a dish for the review and the kitchen. */
export function composedDish(idea: DishIdea): Dish {
  const looks = dishLooks(idea);
  const [hero, ...rest] = looks;
  const partSkins: Record<string, Look> = {};
  for (const l of rest) if (l.skin) partSkins[l.role] = l.skin;
  const heroIngredient = readPart(idea.big).ingredient;
  return {
    title: idea.title,
    description: idea.description,
    entry: {
      spec: {
        id: `dish-${idea.id}`,
        name: idea.title,
        archetype: 'contained',
        family: hero.family as FamilyId,
        layout: 'solo',
        show: idea.description,
        forms: ['whole'],
        scale: 'M',
        size_cm: [27, 8, 27],
        parts: looks.map((l) => `${l.role}@${l.family}`),
        light_case: 'pale',
        notes: `Composed dish (batch 2, 2026-11-19) from the catalogue (src/dishes/catalog.ts): planned in 2D, built by the composer.`,
      },
      form: composedBuilder(idea),
      turn: 0,
      skin: (hero.skin ?? { kind: 'none', size_mm: 1, amount: 0 }) as Skin & { pale?: string; green?: string },
      partSkins,
      matte: true,
      glossy: looks.filter((l) => l.glossy).map((l) => l.role),
      rimGlints: false,
      shadowTint: 0.4,
      contactsFromFeet: true,
      room: ROOM[heroIngredient] ?? 'lavender',
    },
  };
}

export { CERAMIC_SKIN };
