import { componentInfo, isComponent } from './components';
import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { DishIdea } from '../catalog';
import type { Plan, PlanShape, Size } from '../kit/plan';

/**
 * The composer's first step: a dish idea from the catalogue drawn as a plan from straight above,
 * in simple shapes (the user's rule, 2026-11-19: "always make a 2d drawing of the dish, its
 * composition and plating first from top view ... use theory of symmetry, golden ratio, BMS,
 * circular plating").
 *
 * Like laying out a page on a grid before placing the pictures:
 *   1. The ware sets the canvas: how far from the middle food may go (`reach`).
 *   2. The base (a sauce pool, a bed of leaves, rice, a soup) is one calm circle in the middle.
 *   3. Big: the hero sits a little off centre, near the golden spot (the circle at the reach over
 *      phi squared), turned off square. Several hero pieces are arranged as one shape: a fan of
 *      overlapping slices or wheels, a ring for a tart, a sunflower heap for cubes and berries, a
 *      pair for two big pieces.
 *   4. Medium: round the hero, on about 62% of the circle (the golden split), evenly spaced.
 *   5. Small: in odd clusters of up to three in the other 38%, and herbs scattered last.
 *
 * Every shape carries what it stands for (`ingredient:form`), its size tier and a turn, so the 3D
 * build reads its positions from this plan and nothing else.
 */

export const PHI = (1 + Math.sqrt(5)) / 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export type Ware = DishIdea['ware'];

/** The ware's size for the plan: the drawn plate, its well, and how far from the middle food goes. */
export const WARE_PLAN: Record<Ware, { plate: number; well: number; reach: number }> = {
  plate: { plate: 13.5, well: 8.2, reach: 9.4 },
  slate: { plate: 13.5, well: 8.2, reach: 9.4 },
  bowl: { plate: 12.5, well: 4.5, reach: 7.4 },
  deep: { plate: 6.6, well: 4.2, reach: 4.6 },
  board: { plate: 15, well: 11, reach: 10.5 },
  round: { plate: 14, well: 12, reach: 10 },
  glass: { plate: 13.5, well: 3.6, reach: 10 },
};

/** How a group of several pieces of one element is laid out. */
type Group = 'heap' | 'fan' | 'ring' | 'pair' | 'scatter';

export interface ElementInfo {
  /** The footprint at scale 1 (cm): a circle's radius, a rectangle's sides, a half circle's radius. */
  shape: 'circle' | 'rect' | 'half';
  r?: number;
  w?: number;
  h?: number;
  /** How several are arranged when they are the hero. */
  group: Group;
  /** True when it shrinks as medium or small garnish (fruit cut into garnish), false for fixed-size bits. */
  shrinks: boolean;
}

/** Real sizes of the bodies cut into pieces (cm): radius across, half height. */
export const BODY: Record<string, { r: number; h: number; long?: number }> = {
  apple: { r: 4, h: 3.6 },
  pear: { r: 3.3, h: 4.6 },
  peach: { r: 3.5, h: 3.4 },
  orange: { r: 3.8, h: 3.6 },
  lemon: { r: 2.8, h: 3.4 },
  lime: { r: 2.4, h: 2.5 },
  tomato: { r: 3.6, h: 3 },
  onion: { r: 3.6, h: 3.3 },
  potato: { r: 3, h: 2.8, long: 4.6 },
  avocado: { r: 3.4, h: 3.2, long: 4.8 },
  strawberry: { r: 1.7, h: 2.2 },
  garlic: { r: 2.6, h: 2.4 },
  pepper: { r: 4, h: 4.2 },
  cabbage: { r: 7, h: 6 },
  mushroom: { r: 2.5, h: 2.2 },
  eggs: { r: 2.2, h: 2.9 },
  watermelon: { r: 12, h: 12 },
  baguette: { r: 3, h: 2.6, long: 12 },
  cheese: { r: 5, h: 3 },
  butter: { r: 2, h: 1.5 },
  chicken: { r: 3, h: 3 },
  steak: { r: 5, h: 2 },
  salmon: { r: 3, h: 1.6 },
  rice: { r: 2.5, h: 0.8 },
  milk: { r: 4, h: 2 },
};

/** The footprint of an `ingredient:form` at scale 1, and how a group of them is laid out. */
export function elementInfo(ingredient: string, form: string): ElementInfo {
  if (isComponent(ingredient)) return componentInfo(ingredient);
  const body = BODY[ingredient] ?? { r: 2.5, h: 2.5 };
  // Forms the references brought in (2026-11-22), seen from above.
  switch (form) {
    case 'skewer':
      return { shape: 'rect', w: 3.4, h: 22, group: 'pair', shrinks: false };
    case 'roll':
      return { shape: 'rect', w: 3.6, h: 8.4, group: 'pair', shrinks: false };
    case 'omelette':
      return { shape: 'half', r: 6, group: 'pair', shrinks: false };
    case 'cake':
      return ingredient === 'cheese' ? { shape: 'half', r: 7, group: 'pair', shrinks: false } : { shape: 'circle', r: 5, group: 'pair', shrinks: false };
    case 'pancake':
      return { shape: 'circle', r: 6, group: 'pair', shrinks: false };
    case 'pastry':
      return { shape: 'circle', r: 7.5, group: 'pair', shrinks: false };
    case 'fries':
      return { shape: 'rect', w: 1.3, h: 7, group: 'heap', shrinks: false };
    case 'chip':
      return { shape: 'circle', r: 0.8, group: 'heap', shrinks: false };
    case 'strip':
      return { shape: 'rect', w: 1.7, h: 7.2, group: 'scatter', shrinks: false };
    case 'torn':
      return { shape: 'rect', w: 1.5, h: 4.2, group: 'heap', shrinks: false };
  }
  if (ingredient === 'chicken' && form === 'slice') return { shape: 'rect', w: 7, h: 13, group: 'pair', shrinks: false };
  switch (form) {
    case 'whole':
      if (ingredient === 'broccoli') return { shape: 'circle', r: 4, group: 'pair', shrinks: false };
      return { shape: 'circle', r: body.long ?? body.r, group: 'pair', shrinks: false };
    case 'half':
      // Halved lengthwise and lying on their backs (pear, avocado, pepper): their profile from above.
      if (['pear', 'avocado', 'pepper'].includes(ingredient)) return { shape: 'rect', w: body.r * 2, h: Math.max(body.h, body.long ?? 0) * 2, group: 'pair', shrinks: true };
      return { shape: 'circle', r: body.r, group: 'heap', shrinks: true };
    case 'wedge':
      if (ingredient === 'cheese') return { shape: 'half', r: 5, group: 'pair', shrinks: false };
      if (ingredient === 'cabbage') return { shape: 'half', r: 7, group: 'pair', shrinks: false };
      if (ingredient === 'potato') return { shape: 'rect', w: 3, h: 6.4, group: 'heap', shrinks: false };
      return { shape: 'half', r: body.r, group: 'heap', shrinks: true };
    case 'wheel':
      if (ingredient === 'onion') return { shape: 'circle', r: 2.6, group: 'scatter', shrinks: false };
      return { shape: 'circle', r: body.r, group: 'fan', shrinks: true };
    case 'slice':
      if (ingredient === 'salmon') return { shape: 'rect', w: 3.4, h: 7.5, group: 'fan', shrinks: false };
      if (ingredient === 'cheese') return { shape: 'rect', w: 4, h: 5, group: 'fan', shrinks: false };
      if (ingredient === 'pepper') return { shape: 'rect', w: 1.3, h: 6, group: 'scatter', shrinks: false };
      if (ingredient === 'mushroom') return { shape: 'circle', r: 2.2, group: 'fan', shrinks: false };
      if (ingredient === 'avocado') return { shape: 'rect', w: 3.2, h: 9.4, group: 'fan', shrinks: false };
      if (ingredient === 'strawberry') return { shape: 'circle', r: 1.6, group: 'fan', shrinks: false };
      return { shape: 'half', r: body.r, group: 'fan', shrinks: true };
    case 'ribbon':
      return { shape: 'rect', w: 2.2, h: 6.2, group: 'scatter', shrinks: false };
    case 'flake':
      return { shape: 'circle', r: 1.0, group: 'scatter', shrinks: false };
    case 'cube':
      if (ingredient === 'rice') return { shape: 'rect', w: 4.2, h: 6, group: 'pair', shrinks: false };
      if (ingredient === 'steak' || ingredient === 'chicken') return { shape: 'rect', w: 2.8, h: 2.8, group: 'heap', shrinks: false };
      return { shape: 'rect', w: 2.2, h: 2.2, group: 'heap', shrinks: false };
    case 'fillet':
      return { shape: 'rect', w: 6.2, h: 13, group: 'pair', shrinks: false };
    case 'steak':
      return { shape: 'rect', w: 8, h: 14, group: 'pair', shrinks: false };
    case 'drumstick':
      return { shape: 'rect', w: 6, h: 14, group: 'pair', shrinks: false };
    case 'egg':
      return { shape: 'circle', r: 4.2, group: 'pair', shrinks: false };
    case 'berry':
      if (ingredient === 'blueberries') return { shape: 'circle', r: 0.75, group: 'heap', shrinks: false };
      return { shape: 'circle', r: 1.05, group: 'heap', shrinks: false };
    case 'leaf':
      if (ingredient === 'cabbage') return { shape: 'rect', w: 6, h: 7, group: 'scatter', shrinks: false };
      return { shape: 'rect', w: 3.6, h: 6.5, group: 'scatter', shrinks: false };
    case 'crumble':
      return { shape: 'circle', r: 0.75, group: 'scatter', shrinks: false };
    case 'toast':
      return { shape: 'rect', w: 8, h: 11, group: 'pair', shrinks: false };
    case 'smash':
      return { shape: 'circle', r: 3.6, group: 'pair', shrinks: false };
    case 'mash':
      return { shape: 'circle', r: ingredient === 'milk' ? 4.2 : 5.4, group: 'pair', shrinks: false };
    default:
      return { shape: 'circle', r: 2, group: 'heap', shrinks: false };
  }
}

/** One element in a dish: `ingredient:form*count` read from the catalogue. */
export interface Part {
  ingredient: string;
  form: string;
  count: number;
}

export function readPart(text: string): Part {
  const [name, n] = text.split('*');
  if (name === 'herb') return { ingredient: 'herb', form: 'herb', count: Number(n ?? 1) };
  const [ingredient, form] = name.split(':');
  return { ingredient, form, count: Number(n ?? 1) };
}

/** A shape in the plan, with what the 3D build needs to make it. */
export interface Placed {
  part: Part;
  size: Size;
  /** Scale of the element (garnish is cut smaller). */
  scale: number;
  /** Middle (cm, top view: x right, z toward the camera). */
  at: [number, number];
  /** Turn in degrees, clockwise on the page. */
  angle: number;
  /** An index within its group, for seeding. */
  index: number;
  /** Traced plans: the piece's real size (its longest side, cm) and its layer (bottom first). */
  target?: number;
  layer?: number;
}

export interface ComposedPlan {
  plan: Plan;
  placed: Placed[];
  /** The base (pool, leaves, rice...) and its circle. */
  base: { kind: string; what: string; at: [number, number]; r: number };
  /** Herb flecks, scattered last (top view points). */
  herbs: [number, number][];
}

export function footprint(info: ElementInfo, scale: number): number {
  if (info.shape === 'rect') return (Math.hypot(info.w!, info.h!) / 2) * scale;
  return info.r! * scale;
}

export function shapeOf(label: string, size: Size, info: ElementInfo, scale: number, at: [number, number], angle: number): PlanShape {
  if (info.shape === 'rect') return { kind: 'rect', label, size, at, angle, w: info.w! * scale, h: info.h! * scale, round: Math.min(info.w!, info.h!) * scale * 0.3 };
  if (info.shape === 'half') return { kind: 'half', label, size, at, angle, r: info.r! * scale };
  return { kind: 'circle', label, size, at, angle, r: info.r! * scale };
}

/** Garnish is cut smaller: medium fruit pieces about three quarters, small ones about 0.6. */
export function tierScale(size: Size, info: ElementInfo, ingredient: string): number {
  if (!info.shrinks) return 1;
  const r = BODY[ingredient]?.r ?? 2.5;
  if (size === 'big') return 1;
  if (size === 'medium') return r > 3 ? 0.66 : 0.85;
  return r > 2.6 ? 0.55 : 0.72;
}

/** Garnish never outgrows its ware: a piece's reach is capped (a share of the ware's reach), never below 0.45. */
export function fitWare(scale: number, info: ElementInfo, cap: number): number {
  const reach = footprint(info, scale);
  return reach > cap ? Math.max(0.45 * scale, (scale * cap) / reach) : scale;
}

/** Positions of `n` pieces of one element, as a group round (0, 0), with their turns. */
export function arrange(group: Group, n: number, info: ElementInfo, scale: number, random: () => number): { at: [number, number]; angle: number }[] {
  const out: { at: [number, number]; angle: number }[] = [];
  const reach = footprint(info, scale);
  const width = info.shape === 'rect' ? Math.min(info.w!, info.h!) * scale : reach * 2;
  if (n === 1) return [{ at: [0, 0], angle: 18 + signed(random) * 8 }];
  if (group === 'pair' || (group === 'fan' && n <= 3)) {
    // Side by side across a line turned off square, each turned a touch its own way, never touching.
    const gap = width * 1.05 + 0.8;
    for (let k = 0; k < n; k++) {
      const t = k - (n - 1) / 2;
      const along = 20 * (Math.PI / 180);
      out.push({ at: [Math.cos(along) * t * gap, Math.sin(along) * t * gap + Math.abs(t) * 0.6], angle: 20 + t * 14 + signed(random) * 6 });
    }
    return out;
  }
  if (group === 'fan' || group === 'ring') {
    // Overlapping like fallen coins along an arc (a full ring once there are many: a tart).
    const full = n >= 7;
    const radius = full ? Math.max(reach * 1.25, (n * width * 0.55) / (2 * Math.PI)) : reach * 1.6;
    const span = full ? 2 * Math.PI : Math.min(Math.PI * 1.1, (n * width * 0.62) / radius);
    for (let k = 0; k < n; k++) {
      const a = full ? (k / n) * 2 * Math.PI : -span / 2 + (span * k) / (n - 1) - Math.PI / 2;
      out.push({ at: [Math.cos(a) * radius, Math.sin(a) * radius + (full ? 0 : radius * 0.5)], angle: (a * 180) / Math.PI + 90 + signed(random) * 6 });
    }
    return out;
  }
  // A sunflower heap (cubes, berries, halves): the golden angle packs them evenly and never in rows.
  const step = width * 1.25;
  for (let k = 0; k < n; k++) {
    const r = Math.sqrt(k + 0.5) * step * 0.62;
    const a = k * GOLDEN_ANGLE;
    out.push({ at: [Math.cos(a) * r, Math.sin(a) * r], angle: random() * 360 });
  }
  return out;
}

/** The dish idea as a plan from above, with every piece placed. */
export function composePlan(idea: DishIdea, seed = 1): ComposedPlan {
  const random = seededRandom(seed ^ 0x9a17);
  const ware = WARE_PLAN[idea.ware];
  const R = ware.reach;
  const shapes: PlanShape[] = [];
  const placed: Placed[] = [];

  // 2. The base.
  const [baseKind, baseWhat = ''] = idea.base.split(':');
  const baseR = idea.ware === 'glass' ? 3.6 : idea.ware === 'deep' ? 4.6 : baseKind === 'soup' ? R * 0.98 : baseKind === 'leaves' ? R * 0.8 : R * 0.72;
  const baseAt: [number, number] = idea.ware === 'glass' ? [-1.5, -1] : [0, 0];
  if (baseKind !== 'none') shapes.push({ kind: 'circle', label: idea.base, size: 'ground', at: baseAt, r: baseR });

  // 3. Big: the hero group, a little off centre toward the golden spot (up and left: the light's side).
  const hero = readPart(idea.big);
  const heroInfo = elementInfo(hero.ingredient, hero.form);
  const heroScale = tierScale('big', heroInfo, hero.ingredient);
  const golden = R / (PHI * PHI);
  const heroAt: [number, number] =
    idea.ware === 'glass' ? [baseAt[0], baseAt[1]] : idea.ware === 'deep' ? [-0.6, 0.3] : [-golden * 0.32, golden * 0.12];
  const layout = arrange(heroInfo.group, hero.count, heroInfo, heroScale, random);
  let heroReach = 0;
  layout.forEach((p, index) => {
    const at: [number, number] = [heroAt[0] + p.at[0], heroAt[1] + p.at[1]];
    heroReach = Math.max(heroReach, Math.hypot(p.at[0], p.at[1]) + footprint(heroInfo, heroScale));
    shapes.push(shapeOf(idea.big, 'big', heroInfo, heroScale, at, p.angle));
    placed.push({ part: hero, size: 'big', scale: heroScale, at, angle: p.angle, index });
  });
  if (idea.ware === 'glass') heroReach = 3.8;
  // A hero group too big for the ware is cut down to fit (three eggs in a bowl): never past 0.72 of the reach.
  if (idea.ware !== 'glass' && heroReach > R * 0.72) {
    const k = Math.max(0.6, (R * 0.72) / heroReach);
    for (const p of placed) {
      p.scale *= k;
      p.at = [heroAt[0] + (p.at[0] - heroAt[0]) * k, heroAt[1] + (p.at[1] - heroAt[1]) * k];
    }
    heroReach *= k;
  }

  // 4 and 5. Round the hero: medium pieces on 62% of the circle, small clusters in the rest.
  const ring: { part: Part; size: Size; count: number }[] = [];
  for (const text of idea.medium) {
    const part = readPart(text);
    ring.push({ part, size: 'medium', count: part.count });
  }
  const smalls: { part: Part; count: number }[] = [];
  let herbCount = 0;
  for (const text of idea.small) {
    const part = readPart(text);
    if (part.form === 'herb') herbCount += part.count;
    else smalls.push({ part, count: part.count });
  }

  const startAngle = (-40 * Math.PI) / 180 + signed(random) * 0.15;
  const mediumArc = 2 * Math.PI * 0.62;
  const mediumPieces = ring.flatMap((g) => Array.from({ length: g.count }, (_, k) => ({ part: g.part, k })));
  mediumPieces.forEach(({ part, k }, i) => {
    const info = elementInfo(part.ingredient, part.form);
    const scale = fitWare(tierScale('medium', info, part.ingredient), info, R * 0.34);
    const own = footprint(info, scale);
    const a = startAngle + (mediumPieces.length === 1 ? mediumArc / 2 : (mediumArc * i) / Math.max(1, mediumPieces.length - 1)) + signed(random) * 0.08;
    // Close round the hero, never out at the rim (the user's sketch); the 3D build slides them clear.
    const r = Math.min(R - own, heroReach + own * 0.5);
    const at: [number, number] = [heroAt[0] + Math.cos(a) * r, heroAt[1] + Math.sin(a) * r];
    // Wedges and halves turn their flat side to the hero; others lie along the ring.
    const angle = info.shape === 'half' ? (a * 180) / Math.PI - 90 + signed(random) * 25 : (a * 180) / Math.PI + signed(random) * 20;
    shapes.push(shapeOf(`${part.ingredient}:${part.form}`, 'medium', info, scale, at, angle));
    placed.push({ part, size: 'medium', scale, at, angle, index: k });
  });

  // Small: clusters of up to three, in the remaining 38% (and, with many, between the mediums).
  const clusters: { part: Part; n: number }[] = [];
  for (const s of smalls) {
    let left = s.count;
    while (left > 0) {
      const n = left === 4 ? 2 : Math.min(3, left);
      clusters.push({ part: s.part, n });
      left -= n;
    }
  }
  const smallArc = 2 * Math.PI - mediumArc;
  clusters.forEach((cluster, c) => {
    const info = elementInfo(cluster.part.ingredient, cluster.part.form);
    const scale = fitWare(tierScale('small', info, cluster.part.ingredient), info, R * 0.24);
    const own = footprint(info, scale);
    const a = startAngle + mediumArc + smallArc * ((c + 0.5) / clusters.length) + signed(random) * 0.1;
    const r = Math.min(R - own * 1.6, heroReach + own * 0.8);
    const centre: [number, number] = [heroAt[0] + Math.cos(a) * r, heroAt[1] + Math.sin(a) * r];
    for (let k = 0; k < cluster.n; k++) {
      // Overlapping a little, like fallen coins, along the ring.
      const t = k - (cluster.n - 1) / 2;
      const along = a + Math.PI / 2;
      const at: [number, number] = [centre[0] + Math.cos(along) * t * own * 1.25 + signed(random) * 0.2, centre[1] + Math.sin(along) * t * own * 1.25 + signed(random) * 0.2];
      const angle = random() * 360;
      shapes.push(shapeOf(`${cluster.part.ingredient}:${cluster.part.form}`, 'small', info, scale, at, angle));
      placed.push({ part: cluster.part, size: 'small', scale, at, angle, index: c * 3 + k });
    }
  });

  // Herbs last: flecks over the hero and the base, more near the middle.
  const herbs: [number, number][] = [];
  for (let k = 0; k < herbCount; k++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * Math.min(R * 0.8, heroReach + 2.5);
    herbs.push([heroAt[0] + Math.cos(a) * r, heroAt[1] + Math.sin(a) * r]);
    shapes.push({ kind: 'circle', label: 'herb', size: 'small', at: herbs[k], r: 0.3 });
  }

  relax(placed, idea.ware === 'glass' ? R + 2 : ware.plate - 0.6, heroAt);

  // Keep it on the plate: pull anything past the reach back in toward the middle.
  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    const info = elementInfo(p.part.ingredient, p.part.form);
    const own = footprint(info, p.scale);
    const d = Math.hypot(p.at[0], p.at[1]);
    const limit = (idea.ware === 'glass' ? R + 2 : ware.plate - 0.6) - own;
    if (d > limit) {
      const k = limit / d;
      p.at = [p.at[0] * k, p.at[1] * k];
    }
  }
  // Rebuild the shapes from the final positions (the base and the herbs stay).
  const final: PlanShape[] = shapes.filter((s) => s.size === 'ground' || s.label === 'herb');
  const ordered = placed.map((p) => shapeOf(p.size === 'big' ? idea.big : `${p.part.ingredient}:${p.part.form}`, p.size, elementInfo(p.part.ingredient, p.part.form), p.scale, p.at, p.angle));
  final.splice(baseKind !== 'none' ? 1 : 0, 0, ...ordered);

  const notes = [
    `Big: ${idea.big.replace('*', ' x ')}. Medium: ${idea.medium.join(', ').replace(/\*/g, ' x ') || 'none'}.`,
    `Small: ${idea.small.join(', ').replace(/\*/g, ' x ')}. Base: ${idea.base}, on ${idea.ware}.`,
    'Hero off centre toward the golden spot; medium on 62% of the ring, small clusters in the rest.',
  ];
  return {
    plan: { title: idea.title, plate: ware.plate, well: ware.well, shapes: final, notes },
    placed,
    base: { kind: baseKind, what: baseWhat, at: baseAt, r: baseR },
    herbs,
  };
}

/** Plan colours: each ingredient in its own colour, the base in its sauce's colour. */
const PLAN_COLOURS: Record<string, string> = {
  apple: '#d4544f', pear: '#c8c86a', peach: '#f0a050', orange: '#f59a2e', lemon: '#f2d84a', lime: '#7cb342',
  tomato: '#e0503a', onion: '#b05a8e', potato: '#e2c27a', avocado: '#9cba52', strawberry: '#e02e46', garlic: '#efe2c4',
  pepper: '#f6872a', cabbage: '#b6d08a', mushroom: '#b8957a', eggs: '#f6c43a', watermelon: '#f06070', baguette: '#c98a48',
  cheese: '#f2d27a', butter: '#f6e29a', chicken: '#e2a070', steak: '#9e3a3a', salmon: '#f0a080', rice: '#f2ead8',
  milk: '#f6f2ea', grapes: '#7a3e6e', blueberries: '#3e4e9e', spinach: '#3e7a3e', romaine: '#8ab84a', broccoli: '#4e8a3a',
  sauce: '#c83a2e', herb: '#4f8a3e',
};
const BASE_COLOURS: Record<string, string> = {
  'citrus-oil': '#e8d070', 'brown-butter': '#d0913c', honey: '#e8a136', chili: '#e0502a', 'tomato-sauce': '#d8402e',
  cream: '#f4ecd8', 'herb-oil': '#a8c450', 'berry-sauce': '#b02246', 'cheese-sauce': '#f2cc62', jus: '#8e4630',
  cabbage: '#d8e8b0', romaine: '#a8cc6a', spinach: '#5e9a4e', rice: '#f2ead8', potato: '#f0dca6', tomato: '#e05638',
  pepper: '#f6872a', risotto: '#f2e6cc', avocado: '#bcd46a', strawberry: '#f2828e', orange: '#f8a032', blueberry: '#7e4ea0',
  watermelon: '#f2828e', green: '#8cbc3c', grape: '#eae0a2',
};

export function planFills(composed: ComposedPlan): Record<string, string> {
  const fills: Record<string, string> = {};
  for (const s of composed.plan.shapes) {
    if (s.size === 'ground') fills[s.label] = BASE_COLOURS[s.label.split(':')[1] ?? s.label] ?? BASE_COLOURS[s.label] ?? '#e9e6b8';
    else fills[s.label] = PLAN_COLOURS[s.label.split(':')[0]] ?? '#888888';
  }
  return fills;
}

/**
 * A piece's footprint as a capsule (a line with a radius round it), for spacing: a rectangle is a
 * capsule along its long side, a circle a capsule of no length, a half circle a smaller circle.
 */
function capsule(p: Placed): { a: [number, number]; b: [number, number]; r: number } {
  const info = elementInfo(p.part.ingredient, p.part.form);
  const s = p.scale;
  if (info.shape === 'rect') {
    const w = info.w! * s;
    const h = info.h! * s;
    const long = Math.max(w, h);
    const r = Math.min(w, h) / 2;
    // The long side runs along the page's y (h) or x (w) before the turn (clockwise, degrees).
    const t = (p.angle * Math.PI) / 180;
    const dir: [number, number] = h >= w ? [-Math.sin(t), Math.cos(t)] : [Math.cos(t), Math.sin(t)];
    const half = Math.max(0, long / 2 - r);
    return { a: [p.at[0] - dir[0] * half, p.at[1] - dir[1] * half], b: [p.at[0] + dir[0] * half, p.at[1] + dir[1] * half], r };
  }
  const r = info.shape === 'half' ? info.r! * s * 0.78 : info.r! * s;
  return { a: p.at, b: p.at, r };
}

/** Closest points between two segments (for capsule spacing). */
function closest(a0: [number, number], a1: [number, number], b0: [number, number], b1: [number, number]): { d: number; pa: [number, number]; pb: [number, number] } {
  const sub = (u: [number, number], v: [number, number]): [number, number] => [u[0] - v[0], u[1] - v[1]];
  const dot = (u: [number, number], v: [number, number]) => u[0] * v[0] + u[1] * v[1];
  const d1 = sub(a1, a0);
  const d2 = sub(b1, b0);
  const r = sub(a0, b0);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s = 0;
  let t = 0;
  if (a < 1e-9 && e < 1e-9) {
    s = t = 0;
  } else if (a < 1e-9) {
    t = Math.min(1, Math.max(0, f / e));
  } else {
    const c = dot(d1, r);
    if (e < 1e-9) {
      s = Math.min(1, Math.max(0, -c / a));
    } else {
      const b = dot(d1, d2);
      const denom = a * e - b * b;
      s = denom > 1e-9 ? Math.min(1, Math.max(0, (b * f - c * e) / denom)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (b - c) / a));
      }
    }
  }
  const pa: [number, number] = [a0[0] + d1[0] * s, a0[1] + d1[1] * s];
  const pb: [number, number] = [b0[0] + d2[0] * t, b0[1] + d2[1] * t];
  return { d: Math.hypot(pa[0] - pb[0], pa[1] - pb[1]), pa, pb };
}

/**
 * Spacing, like a designer nudging layers apart: pieces that overlap are pushed away from each other
 * until each has its own space (a small gap), the hero pinned in place. Pieces of one group that are
 * meant to overlap (a fan of slices, a cluster of wheels like fallen coins) may overlap by a third.
 * Then everything is kept inside the plate. A few dozen rounds settle it.
 */
function relax(placed: Placed[], limit: number, centre: [number, number] = [0, 0]): void {
  const tier = { big: 0, medium: 1, small: 2, ground: 3 } as const;
  for (let round = 0; round < 160; round++) {
    let moved = false;
    // Cohesion (the user, 2026-11-22: "the elements are a lot of times too far apart"): every piece
    // not yet touching another is drawn in toward the hero, like gathering food together with a
    // spoon, until it touches; the spacing below stops it at its neighbour.
    for (const p of placed) {
      if (p.size === 'big') continue;
      const c = capsule(p);
      let gap = Infinity;
      for (const q of placed) {
        if (q === p) continue;
        const o = capsule(q);
        gap = Math.min(gap, closest(c.a, c.b, o.a, o.b).d - c.r - o.r);
      }
      const dx = centre[0] - p.at[0];
      const dz = centre[1] - p.at[1];
      const d = Math.hypot(dx, dz);
      if (gap > 0.05 && d > 0.5) {
        const step = Math.min(gap, 0.4, d - 0.5);
        p.at = [p.at[0] + (dx / d) * step, p.at[1] + (dz / d) * step];
        moved = true;
      }
    }
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const p = placed[i];
        const q = placed[j];
        const same = p.part === q.part && p.size === q.size;
        const ci = capsule(p);
        const cj = capsule(q);
        const { d, pa, pb } = closest(ci.a, ci.b, cj.a, cj.b);
        // A fan or heap of the hero overlaps on purpose; small clusters overlap a little.
        // Neighbours touch and overlap a little (the 3D build lets them lean on each other).
        const allowed = same && p.size === 'big' ? Infinity : same ? -(Math.min(ci.r, cj.r) * 0.35) : -(Math.min(ci.r, cj.r) * 0.15);
        const need = ci.r + cj.r + allowed - d;
        if (!(need > 0.01)) continue;
        let nx = pb[0] - pa[0];
        let nz = pb[1] - pa[1];
        const len = Math.hypot(nx, nz);
        if (len < 1e-6) {
          nx = Math.cos(i * 2.4 + j);
          nz = Math.sin(i * 2.4 + j);
        } else {
          nx /= len;
          nz /= len;
        }
        // The lower tier moves (big never moves); equal tiers share the move.
        const ti = tier[p.size];
        const tj = tier[q.size];
        const wi = p.size === 'big' ? 0 : ti > tj ? 1 : ti < tj ? 0 : 0.5;
        const wj = q.size === 'big' ? 0 : tj > ti ? 1 : tj < ti ? 0 : 0.5;
        const total = wi + wj;
        if (total === 0) continue;
        const step = Math.min(need, 1.2) * 0.6;
        p.at = [p.at[0] - nx * step * (wi / total), p.at[1] - nz * step * (wi / total)];
        q.at = [q.at[0] + nx * step * (wj / total), q.at[1] + nz * step * (wj / total)];
        moved = true;
      }
    }
    for (const p of placed) {
      if (p.size === 'big') continue;
      const c = capsule(p);
      const reach = Math.max(Math.hypot(c.a[0], c.a[1]), Math.hypot(c.b[0], c.b[1])) + c.r;
      if (reach > limit) {
        const d = Math.hypot(p.at[0], p.at[1]);
        const k = Math.max(0, d - (reach - limit)) / Math.max(d, 1e-6);
        p.at = [p.at[0] * k, p.at[1] * k];
      }
    }
    if (!moved) break;
  }
}
