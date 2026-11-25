import { BufferGeometry, CylinderGeometry, LatheGeometry, Vector2, Vector3 } from 'three';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import { leafPiece } from '../../ingredients/forms/kit/stemLeaf';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import type { FamilyId } from '../../ingredients/families';
import { riceBowlParts } from '../../ingredients/forms/rice';
import { SAUCE_SKIN, CERAMIC_SKIN } from '../../shading/effects/skinTexture';
import { withFrame } from '../kit/cut';
import { Table, plate, posed } from '../kit/place';
import { PhysicsPlate, physicsReady, type PhysicsReport } from '../kit/physics';
import { pool, wobble } from '../kit/pool';
import { DINNER_PLATE, PASTA_BOWL, ware } from '../kit/ware';
import type { DishIdea } from '../catalog';
import type { Dish } from '../dishes';
import { readPart, type ComposedPlan, type Placed } from './layout';
import { planFor, effectiveIdea, tracedParts, TRACES } from './traces';
import { refFamilies, refRoom } from './refLook';
import { FAMILIES } from '../../ingredients/families';
import { hexToOklch } from '../../utils/colour';
import { BASE_FAMILY, PLATE_LOOK, elementLooks, herbLeaf, makeElement, shaving, type Look, type RoleLook } from './elements';

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
export function dishLooks(original: DishIdea): RoleLook[] {
  const idea = effectiveIdea(original);
  const seared = isCooked(idea);
  const looks: RoleLook[] = [];
  const add = (look: RoleLook) => {
    if (!looks.some((l) => l.role === look.role)) looks.push(look);
  };
  for (const text of tracedParts(original) ?? [idea.big, ...idea.medium, ...idea.small]) {
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
  if (idea.ware !== 'glass') {
    // The garnish layer every dish ends with: shavings in three colours, then herbs.
    add({ role: 'shaving_gold', family: 'shaving-gold' });
    add({ role: 'shaving_yellow', family: 'cheese' });
    add({ role: 'shaving_white', family: 'shaving-white' });
    add({ role: 'herb', family: 'leaf' });
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
        // The rice inside, the bowl's wall and rim round it (so nothing rolls out through the wall).
        floor: (x, z) => {
          const r = Math.hypot(x, z);
          return r < rice.radius ? rice.surfaceAt(x, z) : r < 7.2 ? 8 : 0;
        },
        rice,
      };
    }
    case 'board': {
      // A light wooden board, rounded at its corners and edges, 1.6 cm thick.
      const board = boardGeometry(30, 1.6, 22);
      return { pieces: [{ role: 'board', geometry: board }], floor: (x, z) => (Math.abs(x) < 15 && Math.abs(z) < 11 ? 1.6 : 0) };
    }
    case 'round': {
      // A round wooden board, 28 cm across, 1.6 cm thick, its edge softly rounded.
      const board = new CylinderGeometry(14, 13.8, 1.6, 72, 1);
      board.translate(0, 0.8, 0);
      return { pieces: [{ role: 'board', geometry: withFrame(board, false) }], floor: (x, z) => (Math.hypot(x, z) < 14 ? 1.6 : 0) };
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

/** True while pieces lie on the dish: within 17 cm of its middle and not below the table. */
function onPlate(pieces: FormPiece[], floor?: (x: number, z: number) => number): boolean {
  for (const p of pieces) {
    p.geometry.computeBoundingBox();
    const b = p.geometry.boundingBox!;
    const x = (b.min.x + b.max.x) / 2;
    const z = (b.min.z + b.max.z) / 2;
    if (b.min.y < -0.5 || Math.hypot(x, z) > 17) return false;
    // Slipped over the rim: its middle is past the ware and it lies low, on the table.
    if (floor && b.min.y < 0.3 && (floor(x, z) <= 0.01 || floor(x, z) - b.min.y > 0.6)) return false;
  }
  return true;
}

/**
 * The support check, measured on the shapes themselves (the engine's own contact list missed
 * pieces resting on meshes): a piece floats when its lowest points stand more than 2 mm above
 * whatever lies under them; it overlaps when part of it sinks more than 3 mm into another piece.
 */
function support(food: FormPiece[][], ground: Table): { floating: number; deepest: number } {
  const cell = 0.3;
  const key = (x: number, z: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  const samples = food.map((pieces) => {
    const pts: [number, number, number][] = [];
    for (const p of pieces) {
      const pos = p.geometry.getAttribute('position');
      // Dense enough that a wide piece (a tart, a pancake) has a sample under every cell a topping
      // rests on; with 500 the cells went empty and toppings read as floating.
      const step = Math.max(1, Math.floor(pos.count / 4000));
      for (let i = 0; i < pos.count; i += step) pts.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
    }
    return pts;
  });
  // Each piece's top and bottom over each cell.
  const tops = samples.map((pts) => {
    const m = new Map<string, number>();
    for (const [x, y, z] of pts) m.set(key(x, z), Math.max(m.get(key(x, z)) ?? -Infinity, y));
    return m;
  });
  const bottoms = samples.map((pts) => {
    const m = new Map<string, number>();
    for (const [x, y, z] of pts) m.set(key(x, z), Math.min(m.get(key(x, z)) ?? Infinity, y));
    return m;
  });
  let floating = 0;
  let deepest = 0;
  samples.forEach((pts, i) => {
    let lowestGap = Infinity;
    for (const [x, y, z] of pts) {
      let under = ground.height(x, z);
      for (let j = 0; j < tops.length; j++) {
        if (j === i) continue;
        const t = tops[j].get(key(x, z));
        const bt = bottoms[j].get(key(x, z));
        if (t === undefined || bt === undefined) continue;
        if (t <= y + 0.3) under = Math.max(under, t);
        // Inside another piece: between its bottom and its top, well below its top.
        if (y > bt + 0.1 && y < t) deepest = Math.max(deepest, Math.min(t - y, y - bt));
      }
      lowestGap = Math.min(lowestGap, y - under);
    }
    if (lowestGap > 0.2) floating++;
    if (lowestGap > 0.2 && (globalThis as { DEBUG_FLOAT?: boolean }).DEBUG_FLOAT) console.log('floating', food[i].map((p) => p.role).join('+'), lowestGap.toFixed(2));
  });
  return { floating, deepest };
}

/** The longest side of pieces seen from above (cm). */
function footprintOf(pieces: FormPiece[]): number {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pieces) {
    const pos = p.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      minX = Math.min(minX, pos.getX(i)); maxX = Math.max(maxX, pos.getX(i));
      minZ = Math.min(minZ, pos.getZ(i)); maxZ = Math.max(maxZ, pos.getZ(i));
    }
  }
  return Math.max(maxX - minX, maxZ - minZ);
}

/** The QA of the last build of each dish (by catalogue id): physics, and how close the food sits. */
export const LAST_QA = new Map<string, PhysicsReport & Cohesion>();

export interface Cohesion {
  /** The widest gap (cm, seen from above) between a piece and its nearest neighbour. */
  widestGap: number;
  /** Pieces standing more than a centimetre from any other. */
  apart: number;
  /** Pieces flung off the dish by the physics and left out. */
  lost?: number;
}

/**
 * The cohesion QA (the user, 2026-11-22: "the elements are a lot of times too far apart"): for each
 * piece of food, seen from above, the gap to its nearest neighbour.
 */
function cohesion(food: FormPiece[][]): Cohesion {
  const outlines = food.map((pieces) => {
    const pts: [number, number][] = [];
    for (const p of pieces) {
      const pos = p.geometry.getAttribute('position');
      const step = Math.max(1, Math.floor(pos.count / 160));
      for (let i = 0; i < pos.count; i += step) pts.push([pos.getX(i), pos.getZ(i)]);
    }
    return pts;
  });
  let widestGap = 0;
  let apart = 0;
  if (outlines.length < 2) return { widestGap, apart };
  outlines.forEach((a, i) => {
    let nearest = Infinity;
    outlines.forEach((b, j) => {
      if (i === j) return;
      for (const [ax, az] of a) for (const [bx, bz] of b) nearest = Math.min(nearest, Math.hypot(ax - bx, az - bz));
    });
    widestGap = Math.max(widestGap, nearest);
    if (nearest > 1) apart++;
  });
  return { widestGap, apart };
}

/** Build a composed dish from its plan. */
export function composedBuilder(original: DishIdea): FormBuilder {
  return ({ seed }) => {
    const idea = effectiveIdea(original);
    const random = seededRandom(seed ^ 0xc0de);
    const composed: ComposedPlan = planFor(original);
    const seared = isCooked(idea);
    void seared;
    const w = makeWare(idea, seed);
    const table = new Table(w.floor);
    // Real physics where it is loaded (the dish pages, the tests); the height map otherwise.
    const physics = physicsReady() ? new PhysicsPlate() : null;

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
        const leaf = table.rest([{ role: 'bed', geometry: g, doubleSided: true }], { tilt: 0.1 });
        parts.push(...leaf);
      }
    } else if (kind === 'drink') {
      const glassParts = drinkPieces(baseAt, random);
      table.add(glassParts);
      late.push(...glassParts);
    }

    // Plated tier by tier, like by hand: the hero, then the medium pieces, then the small ones.
    // Each is set just above whatever is under its spot (so it starts clear of everything), then
    // all of a tier fall together and settle: a piece leans on its neighbour, slides off what
    // cannot hold it, and rests where its weight is held (the user, 2026-11-22: "obey real world
    // physics and centre of gravity"). Garnish is planned against the hero, so it leans on it.
    // Layers: a traced plan's own (bottom first); otherwise big, then medium, then small.
    const groups: Placed[][] = [];
    if (composed.placed.some((q) => q.layer !== undefined)) {
      for (const q of composed.placed) (groups[q.layer!] ??= []).push(q);
    } else for (const tier of ['big', 'medium', 'small'] as const) groups.push(composed.placed.filter((q) => q.size === tier));
    const food: FormPiece[][] = [];
    let lost = 0;
    // The ground alone (ware, sauce, leaves, glass), for the support check after plating.
    const groundOnly = new Table(w.floor);
    // The ground the food falls onto: the ware, its sauce, its leaves, the glass, as one height field.
    physics?.addHeightfield((x, z) => table.height(x, z), 16, 0.2);
    // What the next layer lands on: the ground (sauce, leaves, glass) and every settled piece.
    const settled: FormPiece[] = [...parts, ...late.filter((p) => p.role !== 'plate' && p.role !== 'board')];
    groundOnly.add(settled);
    for (const group of groups) {
      if (!group) continue;
      const dropped: FormPiece[][] = [];
      const held: FormPiece[][] = [];
      // Each drop as it started, for plating it again if it slips off the ware.
      const copies = new Map<FormPiece[], FormPiece[]>();
      // The spawn heights: everything already settled, plus this layer's drops as they are made.
      const spawn = new Table(w.floor);
      spawn.add(settled);
      for (const p of group) {
        const elementSeed = (seed + p.index * 7919 + p.part.ingredient.length * 104729) >>> 0;
        const element = makeElement(p.part, random, elementSeed);
        // A traced piece is cut to its real size in the reference (its longest side, seen from above).
        const scale = p.target ? p.target / Math.max(0.1, footprintOf(element)) : p.scale;
        const turned = posed(element, { scale, turn: (-p.angle * Math.PI) / 180 });
        const lifted = posed(turned, { at: [p.at[0], 20, p.at[1]] });
        // On a drink, the hero garnish sits on the glass's rim.
        if (kind === 'drink' && p.size === 'big') {
          const rim = posed(turned, { at: [baseAt[0] + 3.2, 9.4, baseAt[1] + 0.8], tip: 0 });
          parts.push(...rim);
          continue;
        }
        const flat = ['wheel', 'slice', 'leaf', 'egg', 'toast', 'mash'].includes(p.part.form);
        if (physics && p.part.form === 'leaf') {
          // A leaf drapes over what is under it (the earlier leaves of its layer included) and is
          // held there, like a leaf laid down by hand.
          // It falls straight down without turning, so it lands touching what is under it (draped by
          // height map it hovered up to a centimetre over cubes and mushrooms).
          const start = spawn.rest(lifted, { tilt: 0.15, add: true });
          physics.drop(start, { lift: 0.4, straightDown: true, noTurn: true });
          dropped.push(start);
          food.push(start);
          parts.push(...start);
        } else if (physics) {
          // Set down above everything already there, this layer's earlier drops included, so no two
          // pieces start inside each other (the engine would shove them apart and fling them).
          const start = spawn.rest(lifted, { tilt: 0, add: true });
          copies.set(start, start.map((piece) => ({ ...piece, geometry: piece.geometry.clone() })));
          physics.drop(start, { lift: 1.0 });
          dropped.push(start);
          food.push(start);
          parts.push(...start);
        } else {
          const sink = kind === 'soup' ? 0.6 : kind === 'pool' || kind === 'mash' ? 0.12 : 0.04;
          parts.push(...table.rest(lifted, { tilt: flat ? 0.15 : 0.3, sink }));
        }
      }
      for (const pieces of held) {
        table.add(pieces);
        settled.push(...pieces);
      }
      if (physics && dropped.length) {
        physics.settle();
        physics.bakeNew();
        // A piece that slipped over the rim (traced near the edge) is plated again where the
        // reference has it, this time set straight down, like a cook nudging it back. One flung
        // away even then leaves the dish: counted by the QA as lost, never left on the table.
        const rimFloor = idea.ware === 'glass' ? undefined : w.floor;
        const again: FormPiece[][] = [];
        for (let i = dropped.length - 1; i >= 0; i--) {
          if (onPlate(dropped[i], rimFloor)) continue;
          for (const piece of dropped[i]) parts.splice(parts.indexOf(piece), 1);
          food.splice(food.indexOf(dropped[i]), 1);
          const copy = copies.get(dropped[i]);
          dropped.splice(i, 1);
          if (!copy) {
            lost++;
            continue;
          }
          physics.drop(copy, { lift: 0.3, straightDown: true });
          again.push(copy);
        }
        if (again.length) {
          physics.settle();
          physics.bakeNew();
          for (const copy of again) {
            if (!onPlate(copy, rimFloor)) {
              lost++;
              continue;
            }
            dropped.push(copy);
            food.push(copy);
            parts.push(...copy);
          }
        }
        for (const pieces of dropped) {
          table.add(pieces);
          settled.push(...pieces);
        }
      }
    }
    if (physics) {
      LAST_QA.set(idea.id, { ...physics.check(), ...cohesion(food), ...support(food, groundOnly), lost });
      physics.free();
    }

    // Herbs last, over everything.
    for (const [x, z] of composed.herbs) {
      const h = herbLeaf(random);
      parts.push(...posed([h], { at: [x, table.height(x, z) + 0.02, z] }));
    }

    // The garnish layer, the last step of every dish (the user, 2026-11-25: "approach dishes in
    // terms of layers ... sprinkle some bits of yellow, golden and white shavings as garnish, then
    // some herb garnish", so it "feels like food, not just 2-3 big elements"). Bits fall over and
    // round the food, never out on the bare rim.
    if (idea.ware !== 'glass') {
      const skip = new Set(['pool', 'bed', 'rice', 'herb', 'plate', 'board', 'bowl']);
      const boxes = parts.filter((p) => !skip.has(p.role)).map((p) => {
        p.geometry.computeBoundingBox();
        return p.geometry.boundingBox!.clone();
      });
      const inside = (x: number, z: number) =>
        idea.ware === 'board' ? Math.abs(x) < 13.5 && Math.abs(z) < 9.5 : Math.hypot(x, z) < (idea.ware === 'deep' ? 4.8 : idea.ware === 'round' ? 12.5 : 10.5);
      const pick = (): [number, number] | null => {
        for (let tries = 0; tries < 30 && boxes.length; tries++) {
          const b = boxes[Math.floor(random() * boxes.length)];
          const x = b.min.x - 1 + random() * (b.max.x - b.min.x + 2);
          const z = b.min.z - 1 + random() * (b.max.z - b.min.z + 2);
          if (inside(x, z)) return [x, z];
        }
        return null;
      };
      const kinds = ['shaving_gold', 'shaving_yellow', 'shaving_white'];
      const count = 40 + Math.floor(random() * 12);
      for (let i = 0; i < count; i++) {
        const at = pick();
        if (!at) break;
        parts.push(...posed([shaving(kinds[i % 3], random)], { at: [at[0], table.height(at[0], at[1]), at[1]], turn: random() * Math.PI * 2 }));
      }
      // Chopped herbs, big enough to read as herbs from the starting view (about 1 cm).
      for (let i = 0; i < 18; i++) {
        const at = pick();
        if (!at) break;
        parts.push(...posed([herbLeaf(random)], { scale: 1.9, turn: random() * Math.PI * 2, at: [at[0], table.height(at[0], at[1]) + 0.03, at[1]] }));
      }
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

/**
 * The pantry's watercolour, not realistic texture (the user, 2026-11-22: "it should feel like a
 * vibrant, washed watercolour painting. sometimes adding too realistic textures doesnt make it look
 * like a painting"): every skin painted at a lighter touch, so the family's warm light and cool,
 * coloured shadow bands carry the form, as on the apple and the orange. Plates keep their own.
 */
const PAINT_TOUCH = 0.45;
function painterly(skin: Look): Look {
  if (skin.kind === 'ceramic' || skin.kind === 'none') return skin;
  return { ...skin, amount: skin.amount * PAINT_TOUCH, seared: skin.seared ? skin.seared * 0.7 : skin.seared };
}

/** A catalogue idea as a dish for the review and the kitchen. */
export function composedDish(idea: DishIdea): Dish {
  // A traced dish takes its colours and its room from its reference.
  // A sample is kept only when it agrees with the ingredient's own colour: a small piece's sample
  // can catch what lies under it (blueberries on a pancake read pancake-brown).
  const sampled = refFamilies(idea.id);
  // Colours the user set by hand stay their own (the steak's saturated pink, golden fries and chips).
  const KEEP_OWN = new Set<FamilyId>(['rare', 'fries', 'garlic-chip']);
  const agrees = (own: FamilyId, ref: FamilyId) => {
    const a = hexToOklch(FAMILIES[own].colours.base);
    const b = hexToOklch(FAMILIES[ref].colours.base);
    if (a.c < 0.05 || b.c < 0.05) return Math.abs(a.l - b.l) < 0.25;
    const gap = Math.abs(((((a.h - b.h) % 360) + 540) % 360) - 180);
    return gap < 50;
  };
  const looks = dishLooks(idea).map((l) => (sampled[l.role] && (l.role === 'pool' ? !!TRACES[idea.id]?.base : l.role === 'plate' || (!KEEP_OWN.has(l.family) && agrees(l.family, sampled[l.role]))) ? { ...l, family: sampled[l.role] } : l));
  const [hero, ...rest] = looks;
  const partSkins: Record<string, Look> = {};
  for (const l of rest) if (l.skin) partSkins[l.role] = painterly(l.skin);
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
      skin: painterly((hero.skin ?? { kind: 'none', size_mm: 1, amount: 0 }) as Look),
      partSkins,
      matte: true,
      glossy: looks.filter((l) => l.glossy).map((l) => l.role),
      rimGlints: false,
      // Full coloured shadows, like the pantry's apple and orange (the user, 2026-11-22: vibrant watercolour).
      shadowTint: 1,
      contactsFromFeet: true,
      room: refRoom(idea.id) ?? ROOM[heroIngredient] ?? 'lavender',
    },
  };
}

export { CERAMIC_SKIN };
