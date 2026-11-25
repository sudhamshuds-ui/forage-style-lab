import { Box3, BufferAttribute, BufferGeometry, CylinderGeometry, Matrix4, Vector3 } from 'three';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import { leafPiece } from '../../ingredients/forms/kit/stemLeaf';
import type { FormBuilder, FormPiece } from '../../ingredients/forms/kit/piece';
import type { FamilyId } from '../../ingredients/families';
import { riceBowlParts } from '../../ingredients/forms/rice';
import { SAUCE_SKIN, CERAMIC_SKIN } from '../../shading/effects/skinTexture';
import { withFrame } from '../kit/cut';
import { Table, clearance, plate, posed } from '../kit/place';
import { PhysicsPlate, physicsReady, type PhysicsReport } from '../kit/physics';
import { pool, wobble } from '../kit/pool';
import { glass, glassFor, takesIce, type Glass } from '../kit/glass';
import { DINNER_PLATE, PASTA_BOWL, SOUP_BOWL, innerRadiusAt, ware } from '../kit/ware';
import type { DishIdea } from '../catalog';
import type { Dish } from '../dishes';
import { WARE_PLAN, elementInfo, footprint, readPart, type ComposedPlan, type Placed } from './layout';
import { planFor, effectiveIdea, tracedParts, TRACES } from './traces';
import { refFamilies, refRoom } from './refLook';
import { layoutById } from './layouts';
import { PLATFORM_FORMS } from './layoutPlan';
import { GARNISH_KINDS, dot, garnishLook, isComponent, microherb } from './components';
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
  return !/salad|crudo|tartare|carpaccio|slaw|poke|salsa|gazpacho|caprese|board|smoothie|cooler/i.test(idea.id + idea.title);
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
    add({ role: 'ice', family: 'ice', glossy: true });
    add({ role: 'glassRim', family: 'glass-rim' });
    add({ role: 'glassGlint', family: 'glass-glint' });
    add({ role: 'glassFoot', family: 'glass', glossy: true });
    add({ role: 'glass', family: 'glass', glossy: true });
  }
  // Sauce on top (generated dishes whose layout asks for it): the pool's own sauce drizzled over the
  // support bunch, after the mains are down, so the plate reads as one dish. The hero's top stays
  // mostly clear (the salmon lesson: no sauce on a seared top).
  const layout = layoutById(idea.layout);
  const sauceFamily = BASE_FAMILY[idea.base];
  if (layout?.wantsTopSauce && sauceFamily) {
    const colour = FAMILIES[sauceFamily].colours.base;
    const supportRoles = new Set(idea.medium.flatMap((text) => elementLooks(readPart(text), seared).map((l) => l.role)));
    for (const look of looks) if (supportRoles.has(look.role) && look.skin) look.skin = { ...look.skin, drizzle: { colour, amount: 0.35 } };
  }
  if (idea.layout === 'pancake-stack' && idea.sauce) add({ role: 'syrup', family: BASE_FAMILY[idea.sauce] ?? 'maple', skin: SAUCE_SKIN, glossy: true });
  for (const c of idea.components ?? []) if (GARNISH_KINDS.includes(c.kind)) add(garnishLook(c));
  if (idea.ware !== 'glass') {
    // The garnish layer every dish ends with: shavings in three colours, then herbs.
    add({ role: 'shaving_gold', family: 'shaving-gold' });
    add({ role: 'shaving_yellow', family: 'cheese' });
    add({ role: 'shaving_white', family: 'shaving-white' });
    add({ role: 'herb', family: 'leaf' });
  }
  if (idea.ware === 'deep') {
    add({ role: 'rice', family: 'cooked-rice', skin: { kind: 'rice', size_mm: 5.5, amount: 0.9 } });
    if (idea.layout) {
      // Mixed rice: herbs, diced vegetables, corn.
      add({ role: 'riceFleckGreen', family: 'leaf' });
      add({ role: 'riceFleckOrange', family: 'pepper-flesh' });
      add({ role: 'riceFleckYellow', family: 'yolk' });
    }
    add({ role: 'bowl', family: 'glaze' });
  } else if (idea.ware !== 'glass') add(PLATE_LOOK[idea.ware]);
  return looks;
}

/** Ware: its geometry and the height of its top surface. */
/** How high the soup stands in its bowl (cm). */
const SOUP_LEVEL = 5;

/**
 * The ware fitted to the food (item 10: plates were sparse, the food tiny in the middle): a plate a
 * rim's width wider than the food and centred on it; a board a hand's width round it. Generated
 * dishes only; the catalogue's traced dishes keep their full-size ware.
 */
export interface WareFit {
  at: [number, number];
  /** Plate radius, or the board's half width and half depth (cm). */
  r: number;
  hx: number;
  hz: number;
}

function fitWare(idea: DishIdea, composed: ComposedPlan): WareFit | undefined {
  if (!idea.layout || !['plate', 'slate', 'board', 'round'].includes(idea.ware)) return undefined;
  const discs = composed.placed.map((p) => ({ c: p.at, r: p.target ? p.target / 2 : footprint(elementInfo(p.part.ingredient, p.part.form), p.scale) }));
  const { kind, at, r } = composed.base;
  if (['pool', 'leaves', 'mash'].includes(kind)) discs.push({ c: at, r });
  if (!discs.length) return undefined;
  const minX = Math.min(...discs.map((d) => d.c[0] - d.r)), maxX = Math.max(...discs.map((d) => d.c[0] + d.r));
  const minZ = Math.min(...discs.map((d) => d.c[1] - d.r)), maxZ = Math.max(...discs.map((d) => d.c[1] + d.r));
  const c: [number, number] = [(minX + maxX) / 2, (minZ + maxZ) / 2];
  const reach = Math.max(...discs.map((d) => Math.hypot(d.c[0] - c[0], d.c[1] - c[1]) + d.r));
  if (idea.ware === 'board') {
    const hx = Math.min(15, Math.max(8, (maxX - minX) / 2 + 2.2));
    const hz = Math.min(11, Math.max(6.5, (maxZ - minZ) / 2 + 2.2));
    return { at: c, r: Math.max(hx, hz), hx, hz };
  }
  const R = Math.min(idea.ware === 'round' ? 14 : 13.5, Math.max(9, reach + 2.8));
  return { at: c, r: R, hx: R, hz: R };
}

function makeWare(idea: DishIdea, seed: number, fit?: WareFit): { pieces: FormPiece[]; floor: (x: number, z: number) => number; rice?: ReturnType<typeof riceBowlParts>; soup?: { level: number; radius: number; under: (x: number, z: number) => number } } {
  switch (idea.ware) {
    case 'plate':
    case 'slate': {
      if (fit) {
        // Scaled down to the food: the well, rim and foot keep their shares of the plate.
        const k = fit.r / DINNER_PLATE.radius;
        const w = ware({ ...DINNER_PLATE, radius: fit.r, well: DINNER_PLATE.well * k, foot: DINNER_PLATE.foot * k, rim: DINNER_PLATE.rim * (0.75 + 0.25 * k) });
        w.geometry.translate(fit.at[0], 0, fit.at[1]);
        return { pieces: [{ role: 'plate', geometry: w.geometry }], floor: (x, z) => w.floor(x - fit.at[0], z - fit.at[1]) };
      }
      const w = ware(DINNER_PLATE);
      return { pieces: [{ role: 'plate', geometry: w.geometry }], floor: w.floor };
    }
    case 'bowl': {
      if (idea.base.startsWith('soup:')) {
        // Soup: always a big deep bowl, the soup a level surface well up its side (the P0 and P1
        // lists: a shallow pasta bowl read as a plate floating over an oversized shadow).
        const w = ware(SOUP_BOWL);
        const edge = innerRadiusAt(SOUP_BOWL, SOUP_LEVEL);
        return { pieces: [{ role: 'plate', geometry: w.geometry }], floor: (x, z) => (Math.hypot(x, z) < edge ? SOUP_LEVEL : w.floor(x, z)), soup: { level: SOUP_LEVEL, radius: edge, under: w.floor } };
      }
      const w = ware(PASTA_BOWL);
      return { pieces: [{ role: 'plate', geometry: w.geometry }], floor: w.floor };
    }
    case 'deep': {
      // A generated rice bowl is mixed rice, nearly level, so its toppings sit in the bowl rather
      // than perched on a peak (the fix list, 2026-11-25).
      const mixed = !!idea.layout;
      const rice = riceBowlParts(seed, mixed ? 0.18 : 0.45, mixed);
      const wall = new Table(() => 0);
      wall.add([{ role: 'bowl', geometry: rice.bowl }]);
      const flecks: FormPiece[] = rice.flecks
        ? [
            { role: 'riceFleckGreen', geometry: rice.flecks.green },
            { role: 'riceFleckOrange', geometry: rice.flecks.orange },
            { role: 'riceFleckYellow', geometry: rice.flecks.yellow },
          ]
        : [];
      return {
        pieces: [
          { role: 'rice', geometry: rice.rice },
          ...flecks,
          { role: 'bowl', geometry: rice.bowl },
        ],
        // The rice inside, the bowl's real wall and rim round it. (A flat ring at 8 cm stood 1.6 cm over
        // the real rim: pieces landing on it hovered beside the bowl, the P0 list.)
        floor: (x, z) => (Math.hypot(x, z) < rice.radius ? rice.surfaceAt(x, z) : wall.height(x, z)),
        rice,
      };
    }
    case 'board': {
      // A light wooden board, rounded at its corners and edges, 1.6 cm thick.
      const [bx, bz, hx, hz] = fit ? [fit.at[0], fit.at[1], fit.hx, fit.hz] : [0, 0, 15, 11];
      const board = boardGeometry(hx * 2, 1.6, hz * 2);
      board.translate(bx, 0, bz);
      return { pieces: [{ role: 'board', geometry: board }], floor: (x, z) => (Math.abs(x - bx) < hx && Math.abs(z - bz) < hz ? 1.6 : 0) };
    }
    case 'round': {
      // A round wooden board, 28 cm across, 1.6 cm thick, its edge softly rounded.
      const [bx, bz, R] = fit ? [fit.at[0], fit.at[1], fit.r] : [0, 0, 14];
      const board = new CylinderGeometry(R, R - 0.2, 1.6, 72, 1);
      board.translate(bx, 0.8, bz);
      return { pieces: [{ role: 'board', geometry: withFrame(board, false) }], floor: (x, z) => (Math.hypot(x - bx, z - bz) < R ? 1.6 : 0) };
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
  /** Generated dishes: support and accent pieces further from the hero than its reach plus their own
   * plus 0.5 cm (the "one centre" check; 0 passes). */
  offCentre?: number;
  /** Generated dishes: the share of garnish (shavings and herbs) that landed over food or its pool. */
  garnishOnFood?: number;
  /** Generated dishes: pieces on their edge or piled on another loose piece (0 passes). */
  towering?: number;
  /** Generated dishes: the highest food point above the ware's floor or its base (cm; garnish left out). */
  maxFoodHeight?: number;
  /** The ingredients of every food piece that ended on the dish (after physics and replating). */
  served?: string[];
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

/** Forms that should lie flat (cut face or belly down): one tipped past 35 degrees is on its edge. */
const LIES_FLAT = new Set(['wheel', 'slice', 'strip', 'fillet', 'half', 'wedge', 'leaf', 'chip', 'toast', 'mash', 'pancake', 'omelette', 'egg', 'steak', 'torn']);

function boundsOf(pieces: FormPiece[]): Box3 {
  const box = new Box3();
  for (const p of pieces) {
    p.geometry.computeBoundingBox();
    box.union(p.geometry.boundingBox!);
  }
  return box;
}

function centreOf(pieces: FormPiece[]): [number, number] {
  const b = boundsOf(pieces);
  return [(b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2];
}

/**
 * How high a piece's lowest point sits above what it should rest on (cm), measured where its
 * footprint is: near 0 when it lies on the plate or its base, a centimetre or more when it rests on
 * another loose piece.
 */
function liftAbove(pieces: FormPiece[], base: Table): number {
  let low = Infinity;
  for (const p of pieces) {
    const pos = p.geometry.getAttribute('position') as BufferAttribute;
    const step = Math.max(1, Math.floor(pos.count / 600));
    for (let i = 0; i < pos.count; i += step) low = Math.min(low, pos.getY(i) - base.height(pos.getX(i), pos.getZ(i)));
  }
  return low;
}

/**
 * The "one centre" check (the composable dishes spec): every support and accent piece sits within the
 * hero's reach plus its own plus 0.5 cm of the hero's middle, seen from above. Returns how many do
 * not. `heroCount` is how many of the food entries are the hero (the first layer).
 */
function offCentre(food: FormPiece[][], heroCount: number): number {
  if (heroCount <= 0 || heroCount >= food.length) return 0;
  const discOf = (pieces: FormPiece[]) => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of pieces) {
      p.geometry.computeBoundingBox();
      const b = p.geometry.boundingBox!;
      minX = Math.min(minX, b.min.x), maxX = Math.max(maxX, b.max.x), minZ = Math.min(minZ, b.min.z), maxZ = Math.max(maxZ, b.max.z);
    }
    return { c: [(minX + maxX) / 2, (minZ + maxZ) / 2] as [number, number], r: Math.hypot(maxX - minX, maxZ - minZ) / 2 };
  };
  const heroes = food.slice(0, heroCount).map(discOf);
  const hx = heroes.reduce((a, d) => a + d.c[0], 0) / heroes.length;
  const hz = heroes.reduce((a, d) => a + d.c[1], 0) / heroes.length;
  const heroReach = Math.max(...heroes.map((d) => Math.hypot(d.c[0] - hx, d.c[1] - hz) + d.r));
  return food.slice(heroCount).map(discOf).filter((d) => Math.hypot(d.c[0] - hx, d.c[1] - hz) > heroReach + d.r + 0.5).length;
}

/** Build a composed dish from its plan. */
export function composedBuilder(original: DishIdea): FormBuilder {
  return ({ seed }) => {
    const idea = effectiveIdea(original);
    const random = seededRandom(seed ^ 0xc0de);
    const composed: ComposedPlan = planFor(original);
    const seared = isCooked(idea);
    void seared;
    const fit = fitWare(idea, composed);
    const w = makeWare(idea, seed, fit);
    /** True when a spot (with a half size) lies on the ware's top. */
    const onTheWare = (c: [number, number], hx: number, hz: number): boolean => {
      if (fit && idea.ware === 'board') return Math.abs(c[0] - fit.at[0]) + hx < fit.hx - 0.8 && Math.abs(c[1] - fit.at[1]) + hz < fit.hz - 0.8;
      if (fit) return Math.hypot(c[0] - fit.at[0], c[1] - fit.at[1]) + Math.max(hx, hz) < fit.r - 1.2;
      return idea.ware === 'board' ? Math.abs(c[0]) + hx < 13.5 && Math.abs(c[1]) + hz < 9.5 : Math.hypot(c[0], c[1]) + Math.max(hx, hz) < Math.max(WARE_PLAN[idea.ware].reach + 0.5, WARE_PLAN[idea.ware].plate - 1.5);
    };
    const table = new Table(w.floor);
    // Real physics where it is loaded (the dish pages, the tests); the height map otherwise.
    const physics = physicsReady() ? new PhysicsPlate() : null;

    const parts: FormPiece[] = [];
    /** The drink's glass, when the dish is a drink. */
    let served: Glass | undefined;
    const late: FormPiece[] = [...w.pieces];

    // The base.
    const { kind, what, at: baseAt, r: baseR } = composed.base;
    if (kind === 'soup' && w.soup) {
      // The soup's surface: a level disc meeting the bowl's side, a soft meniscus at its edge.
      const { level, radius } = w.soup;
      const geometry = pool({ outline: () => radius + 0.05, at: [0, 0], depth: 0.35, edge: 0.12, floor: () => level - 0.35, rings: 36, segments: 110 });
      late.push({ role: 'pool', geometry });
    } else if (kind === 'pool' || kind === 'soup' || kind === 'mash') {
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
      // A tossed, mounded nest of leaves (item 8, never a flat star): three tiers, each set down on
      // the ones below, the outer leaves lying low with their tips out, the inner ones shorter and
      // cupped higher, every leaf its own size, turn, fold and twist.
      const tiers = [
        { n: 7, at: 1.5, size: 1, lift: 0.9, fold: 0.4 },
        { n: 5, at: 0.8, size: 0.85, lift: 1.7, fold: 0.6 },
        { n: 3, at: 0.25, size: 0.68, lift: 2.3, fold: 0.75 },
      ];
      for (const [t, tier] of tiers.entries()) {
        for (let k = 0; k < tier.n; k++) {
          const a = (k / tier.n) * Math.PI * 2 + t * 0.45 + signed(random) * 0.35;
          const long = (what === 'romaine' ? 9 : what === 'cabbage' ? 7.5 : 6.5) * tier.size * (0.85 + random() * 0.3);
          const g = leafPiece({
            base: new Vector3(baseAt[0] + Math.cos(a) * tier.at, 0, baseAt[1] + Math.sin(a) * tier.at),
            turn: -a + signed(random) * 0.3,
            length: long,
            width: long * (what === 'romaine' ? 0.42 : 0.62),
            lift: (d) => tier.lift * (d / long) ** 1.6 + 0.15,
            fold: tier.fold + signed(random) * 0.15,
            twist: signed(random) * 0.45,
            rows: 12,
            cols: 6,
          });
          const leaf = table.rest([{ role: 'bed', geometry: g, doubleSided: true }], { tilt: 0.25 });
          parts.push(...leaf);
        }
      }
    } else if (kind === 'drink') {
      // The glass for this drink (item 12): picked by the drink, the drink inside it, ice when cold.
      const kindOfGlass = glassFor(idea.base);
      served = glass(kindOfGlass, baseAt, random, takesIce(idea.base, kindOfGlass));
      table.add(served.pieces.filter((piece) => !['glassGlint', 'ice'].includes(piece.role)));
      late.push(...served.pieces);
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
    const groundList: FormPiece[] = [];
    // The ground the food falls onto: the ware, its sauce, its leaves, the glass, as one height field.
    physics?.addHeightfield((x, z) => table.height(x, z), 16, 0.2);
    // What the next layer lands on: the ground (sauce, leaves, glass) and every settled piece.
    const settled: FormPiece[] = [...parts, ...late.filter((p) => p.role !== 'plate' && p.role !== 'board')];
    groundOnly.add(settled);
    groundList.push(...settled);
    /** What a piece may rest on: the ware and its base, plus the hero for a platform's toppings. */
    const baseUnder = (p: Placed) => {
      const t = new Table(w.floor);
      t.add(groundList);
      if (platformDish && (p.layer ?? 0) > 0) t.add(heroPieces);
      return t;
    };
    /** The planned stacks the layouts allow, with their most extra height (cm): fries in two layers. */
    // Crispy garlic and crumbs are garnish-sized: like the shavings, they may lie over the food.
    // A pancake stack is the one tall exception (item 5): three or four high.
    const stackAllowance = (p: Placed) => (p.part.form === 'fries' ? 2.6 : p.part.form === 'pancake' ? 4 : ['chip', 'crumble'].includes(p.part.form) ? 6 : 0.4);
    /** A piece that stands on its edge (when it should lie flat) or is piled on another loose piece. */
    const towers = (pieces: FormPiece[]): boolean => {
      const p = placedOf.get(pieces);
      if (!p || !physics) return false;
      const dbg = (globalThis as { DEBUG_TOWER?: boolean }).DEBUG_TOWER;
      // Face down is still lying flat (a chip or a slice that flipped): measure from whichever face is down.
      const tilt = Math.min(physics.tiltOf(pieces), 180 - physics.tiltOf(pieces));
      if (LIES_FLAT.has(p.part.form) && tilt > 35) {
        if (dbg) console.log('edge', p.part.ingredient, p.part.form, tilt.toFixed(0));
        return true;
      }
      const lift = liftAbove(pieces, baseUnder(p));
      if (dbg && lift > stackAllowance(p)) console.log('piled', p.part.ingredient, p.part.form, lift.toFixed(2));
      return lift > stackAllowance(p);
    };
    /** The nearest place touching the bunch where nothing loose lies under the piece's footprint. */
    const freeSpot = (copy: FormPiece[], now: FormPiece[], here: Table, p: Placed): [number, number] | null => {
      const base = baseUnder(p);
      const box = boundsOf(copy);
      const hx = (box.max.x - box.min.x) / 2;
      const hz = (box.max.z - box.min.z) / 2;
      const from = centreOf(now);
      const planned: [number, number] = [(box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2];
      const dbgCount = [0, 0, 0, 0, 0, 0, 0, 0];
      for (let r = 0; r <= 7; r += 0.35) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const c: [number, number] = [from[0] + Math.cos(a) * r, from[1] + Math.sin(a) * r];
          const probes: [number, number][] = [];
          for (const u of [-0.85, 0, 0.85]) for (const v of [-0.85, 0, 0.85]) probes.push([c[0] + u * hx, c[1] + v * hz]);
          const clear = probes.every(([x, z]) => here.height(x, z) - base.height(x, z) < 0.15);
          // Touching the bunch: food just past its edge on at least one side (never a lonely island).
          const reachOut = Math.max(hx, hz) + 0.6;
          let touching = r === 0;
          for (let j = 0; j < 12 && !touching; j++) {
            const b = (j / 12) * Math.PI * 2;
            const [x, z] = [c[0] + Math.cos(b) * reachOut, c[1] + Math.sin(b) * reachOut];
            if (here.height(x, z) - base.height(x, z) > 0.2) touching = true;
          }
          const onWare = onTheWare(c, hx, hz);
          // The shift from where the laid copy sits to the free spot.
          if ((globalThis as { DEBUG_TOWER?: boolean }).DEBUG_TOWER) dbgCount[(clear ? 1 : 0) + (onWare ? 2 : 0) + (touching ? 4 : 0)]++;
          if (clear && onWare && touching) return [c[0] - planned[0], c[1] - planned[1]];
        }
      }
      if ((globalThis as { DEBUG_TOWER?: boolean }).DEBUG_TOWER) console.log('freeSpot', JSON.stringify(dbgCount), hx.toFixed(1), hz.toFixed(1));
      return null;
    };
    let heroFood = -1;
    let syrupPoured = false;
    /** Ingredients set straight onto a glass's rim (outside the physics). */
    const rimServed: string[] = [];
    // Which plan entry each drop came from, and the hero's pieces (the base a platform's toppings rest on).
    const placedOf = new Map<FormPiece[], Placed>();
    const heroPieces: FormPiece[] = [];
    const heroForm = readPart(idea.big).form;
    const platformDish = !!idea.layout && (layoutById(idea.layout)?.packing === 'platform' || PLATFORM_FORMS.includes(heroForm) || readPart(idea.big).ingredient === 'tart');
    for (const group of groups) {
      if (!group) continue;
      // Food before the second layer is the hero.
      if (heroFood < 0 && food.length) heroFood = food.length;
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
        // (Only the first: an Unhinged heap of fruit sits on the table round the glass's foot.)
        if (kind === 'drink' && served && p.size === 'big' && p.index === 0) {
          const onRim = ['wheel', 'slice', 'wedge', 'half', 'strip'].includes(p.part.form);
          const a = Math.PI * 1.15;
          // A wheel or slice stands up across the rim, its face to the side (lying flat it read as a
          // lid on the glass): turned a quarter round the line from the glass's middle to the rim.
          const upright = onRim && ['wheel', 'slice'].includes(p.part.form) ? posed(turned, new Matrix4().makeRotationAxis(new Vector3(Math.cos(a), 0, Math.sin(a)), Math.PI / 2)) : turned;
          const box = boundsOf(upright);
          const [cx, cz] = [(box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2];
          const height = box.max.y - box.min.y;
          // Flat cuts (a wheel, a slice, a wedge, a half) are slit and pushed onto the rim on the
          // lit side, the rim running two fifths of the way into them; small round things (berries,
          // cubes, a leaf) float in the drink, half under its surface. Never hovering.
          const spot: [number, number] = onRim
            ? [baseAt[0] + Math.cos(a) * served.rim.r, baseAt[1] + Math.sin(a) * served.rim.r]
            : [baseAt[0] + served.level.r * 0.25, baseAt[1] + served.level.r * 0.2];
          const y = onRim ? served.rim.y - box.min.y - 0.42 * height : served.level.y - box.min.y - 0.45 * height;
          const rim = posed(upright, { at: [spot[0] - cx, y, spot[1] - cz] });
          parts.push(...rim);
          rimServed.push(p.part.ingredient);
          continue;
        }
        const flat = ['wheel', 'slice', 'leaf', 'egg', 'toast', 'mash'].includes(p.part.form);
        if (physics && p.part.form === 'leaf') {
          // A leaf drapes over what is under it (the earlier leaves of its layer included) and is
          // held there, like a leaf laid down by hand.
          // It falls straight down without turning, so it lands touching what is under it (draped by
          // height map it hovered up to a centimetre over cubes and mushrooms).
          const start = spawn.rest(lifted, { tilt: 0.15, add: true });
          // Kept like any piece, so a leaf that slides off the plate is laid again (spinach was lost).
          copies.set(start, start.map((piece) => ({ ...piece, geometry: piece.geometry.clone() })));
          placedOf.set(start, p);
          physics.drop(start, { lift: 0.4, straightDown: true, noTurn: true });
          dropped.push(start);
          food.push(start);
          parts.push(...start);
        } else if (physics) {
          // Set down above everything already there, this layer's earlier drops included, so no two
          // pieces start inside each other (the engine would shove them apart and fling them).
          const start = spawn.rest(lifted, { tilt: 0, add: true });
          copies.set(start, start.map((piece) => ({ ...piece, geometry: piece.geometry.clone() })));
          // Platforms (a rösti, a pancake, a cake, toast, an omelette, a fried egg) fall flat and never
          // turn: they tipped onto their edges. On a platform layout their toppings keep the way they
          // were laid too, and fall straight down onto it rather than tumbling off.
          const flatPlatform = ['mash', 'pancake', 'cake', 'pastry', 'toast', 'omelette', 'egg'].includes(p.part.form) || p.part.ingredient === 'tart';
          const onPlatform = platformDish && (p.layer ?? 0) > 0;
          // Skewers are rigid and round: left free they rolled apart; they fall as the bundle was laid.
          const skewer = p.part.form === 'skewer';
          // A generated dish's flat pieces (slices, wheels, wedges, halves, fillets, chips) keep the way
          // they were laid as they fall, so they land flat, never on an edge (the fix list, P0).
          // Library components (a tart, a quenelle, cream, a tuile, a smear) are set down as made.
          const keepsFlat = !!idea.layout && (LIES_FLAT.has(p.part.form) || isComponent(p.part.ingredient));
          physics.drop(start, { lift: 1.0, noTurn: flatPlatform || onPlatform || skewer || keepsFlat, straightDown: skewer });
          placedOf.set(start, p);
          if (p.size === 'big') heroPieces.push(...start);
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
          const plan = placedOf.get(dropped[i]);
          if (copy && plan) placedOf.set(copy, plan);
          // Keep a clean copy of it too, in case it then lands on its edge and is laid again.
          if (copy) copies.set(copy, copy.map((piece) => ({ ...piece, geometry: piece.geometry.clone() })));
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
        // Flat, beside, never piled (the fix list, P0): a piece that ended on its edge, or resting on
        // another loose piece instead of the plate, its sauce or its base, is lifted out and laid flat
        // at the nearest free spot touching the bunch, straight down. If it fails again it leaves the
        // dish (counted lost), never left as a tower.
        if (idea.layout) {
          const kept = dropped.filter((d) => !towers(d));
          const bad = dropped.filter(towers);
          for (const pieces of bad) {
            physics.remove(pieces);
            for (const piece of pieces) parts.splice(parts.indexOf(piece), 1);
            food.splice(food.indexOf(pieces), 1);
          }
          const laid: FormPiece[][] = [];
          for (const pieces of bad) {
            const p = placedOf.get(pieces)!;
            const copy = copies.get(pieces);
            const here = new Table(w.floor);
            here.add(settled);
            for (const k of [...kept, ...laid]) here.add(k);
            // Up to three spots: a spot where it still lands badly is marked taken and the next tried.
            let moved: FormPiece[] | null = null;
            for (let attempt = 0; attempt < 3 && copy && !moved; attempt++) {
              const spot = freeSpot(copy, pieces, here, p);
              if (!spot) break;
              const tried = here.rest(posed(copy, { at: [spot[0], 0, spot[1]] }), { tilt: 0, add: false });
              physics.drop(tried, { lift: 0.25, straightDown: true, noTurn: true });
              placedOf.set(tried, p);
              physics.settle();
              physics.bakeNew();
              if (towers(tried) || !onPlate(tried, rimFloor)) {
                if ((globalThis as { DEBUG_TOWER?: boolean }).DEBUG_TOWER) console.log('failed again', p.part.ingredient, p.part.form);
                physics.remove(tried);
                here.add(tried);
                continue;
              }
              moved = tried;
            }
            if (!moved) {
              if ((globalThis as { DEBUG_TOWER?: boolean }).DEBUG_TOWER) console.log('no spot', p.part.ingredient, p.part.form);
              lost++;
              continue;
            }
            laid.push(moved);
            food.push(moved);
            parts.push(...moved);
          }
          dropped.splice(0, dropped.length, ...kept, ...laid);
        }
        for (const pieces of dropped) {
          table.add(pieces);
          settled.push(...pieces);
        }
      }
      // Pancakes: syrup poured over the stack once it is down (item 5), pooling on top and running
      // over the edge in a few drips; the toppings then sit in it.
      if (idea.layout === 'pancake-stack' && heroPieces.length && !syrupPoured) {
        syrupPoured = true;
        const box = boundsOf(heroPieces);
        const c: [number, number] = [(box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2];
        const r = (box.max.x - box.min.x + box.max.z - box.min.z) / 4;
        const under = new Table(w.floor);
        under.add(heroPieces);
        const geometry = pool({
          outline: wobble(r * 0.8, [[7, 0.2, random() * 6], [3, 0.07, random() * 6], [11, 0.05, random() * 6]]),
          at: c,
          depth: 0.22,
          edge: 0.35,
          floor: (x, z) => under.height(x, z),
          rings: 30,
          segments: 140,
        });
        const syrup = [{ role: 'syrup', geometry }];
        parts.push(...syrup);
        table.add(syrup);
      }
    }
    if (physics) {
      // A piece frozen while still sliding (the engine stops after a few seconds) can be held a few
      // millimetres in the air: each is set straight down onto what is under it, bottom layer first
      // (the P0 list: nothing floating).
      food.forEach((pieces, i) => {
        const under = new Table(groundOnly.height.bind(groundOnly));
        food.forEach((other, j) => j !== i && under.add(other));
        const gap = clearance(pieces, (x, z) => under.height(x, z));
        if (gap > 0.1 && gap < 3) for (const piece of pieces) piece.geometry.translate(0, -gap, 0);
      });
      const height = food.reduce((most, pieces) => {
        const b = boundsOf(pieces);
        return Math.max(most, b.max.y - w.floor((b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2));
      }, 0);
      LAST_QA.set(idea.id, {
        ...physics.check(),
        ...cohesion(food),
        ...support(food, groundOnly),
        lost,
        ...(idea.layout ? { offCentre: offCentre(food, heroFood), towering: food.filter(towers).length, maxFoodHeight: height } : {}),
        served: [...new Set([...food.map((f) => placedOf.get(f)?.part.ingredient), ...rimServed])].filter((id): id is string => !!id),
      });
      physics.free();
    }

    // Herbs last, over everything (never round a glass: they lay on the table as stray dots).
    for (const [x, z] of idea.ware === 'glass' ? [] : composed.herbs) {
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
        fit ? onTheWare([x, z], 0, 0) : idea.ware === 'board' ? Math.abs(x) < 13.5 && Math.abs(z) < 9.5 : Math.hypot(x, z) < (idea.ware === 'deep' ? 4.8 : idea.ware === 'round' ? 12.5 : 10.5);
      // Over food or its sauce: a bounding box round a thin skewer or a round pancake covers bare
      // plate too, so a spot is kept only where something lies under it (any spot, if none is found).
      const { kind: poolKind, at: poolCentre, r: poolRadius } = composed.base;
      const onSomething = (x: number, z: number) =>
        idea.ware === 'deep' || table.height(x, z) > groundOnly.height(x, z) + 0.05 || (['pool', 'soup', 'leaves', 'mash'].includes(poolKind) && Math.hypot(x - poolCentre[0], z - poolCentre[1]) < poolRadius * 0.92);
      const pick = (): [number, number] | null => {
        let fallback: [number, number] | null = null;
        for (let tries = 0; tries < 40 && boxes.length; tries++) {
          const b = boxes[Math.floor(random() * boxes.length)];
          const x = b.min.x - 1 + random() * (b.max.x - b.min.x + 2);
          const z = b.min.z - 1 + random() * (b.max.z - b.min.z + 2);
          if (!inside(x, z)) continue;
          if (onSomething(x, z)) return [x, z];
          fallback ??= [x, z];
        }
        return fallback;
      };
      // Puddings and sweet plates take a light dusting of buttery crumbs, not the savoury layer
      // (the layout's `savoryGarnish`).
      const savoury = layoutById(idea.layout)?.savoryGarnish ?? true;
      const kinds = savoury ? ['shaving_gold', 'shaving_yellow', 'shaving_white'] : ['shaving_gold', 'shaving_white'];
      const count = savoury ? 40 + Math.floor(random() * 12) : 10 + Math.floor(random() * 4);
      // How much of the garnish lands over food or its pool (a check for generated dishes).
      const { kind: baseKind, at: poolAt, r: poolR } = composed.base;
      let onFood = 0;
      let dropped = 0;
      const count1 = (x: number, z: number) => {
        dropped++;
        const overPool = ['pool', 'soup', 'leaves', 'mash'].includes(baseKind) && Math.hypot(x - poolAt[0], z - poolAt[1]) < poolR;
        if (overPool || table.height(x, z) > groundOnly.height(x, z) + 0.05 || idea.ware === 'deep') onFood++;
      };
      for (let i = 0; i < count; i++) {
        const at = pick();
        if (!at) break;
        count1(at[0], at[1]);
        parts.push(...posed([shaving(kinds[i % kinds.length], random)], { at: [at[0], table.height(at[0], at[1]), at[1]], turn: random() * Math.PI * 2 }));
      }
      // Chopped herbs, big enough to read as herbs from the starting view (about 1 cm).
      for (let i = 0; i < (savoury ? 18 : 5); i++) {
        const at = pick();
        if (!at) break;
        count1(at[0], at[1]);
        parts.push(...posed([herbLeaf(random)], { scale: 1.9, turn: random() * Math.PI * 2, at: [at[0], table.height(at[0], at[1]) + 0.03, at[1]] }));
      }
      // The library's garnish (the fix list, P1): oil dots and gel beads on the sauce and round the
      // food, microherbs over it.
      for (const c of idea.components ?? []) {
        if (!GARNISH_KINDS.includes(c.kind)) continue;
        for (let i = 0; i < c.count; i++) {
          const at = pick();
          if (!at) break;
          count1(at[0], at[1]);
          const y = table.height(at[0], at[1]);
          const made = c.kind === 'microherb' ? microherb(c.role, random) : [dot(c.kind as 'oil-dot' | 'gel', c.role, random)];
          parts.push(...posed(made, { at: [at[0], y, at[1]], turn: random() * Math.PI * 2 }));
        }
      }
      const qa = LAST_QA.get(idea.id);
      if (qa && idea.layout && dropped) qa.garnishOnFood = onFood / dropped;
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
