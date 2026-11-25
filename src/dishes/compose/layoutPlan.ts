import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { DishIdea } from '../catalog';
import type { PlanShape } from '../kit/plan';
import { PHI, WARE_PLAN, arrange, elementInfo, fitWare, footprint, readPart, shapeOf, tierScale, type ComposedPlan, type ElementInfo, type Part, type Placed } from './layout';
import { layoutById, type LayoutSpec } from './layouts';

/**
 * The plan for a generated dish (the Kitchen's Cook), from its layout (the composable dishes spec,
 * 2026-11-26, step 3). It replaces the old ring for these dishes: there, medium pieces were parked
 * round the hero on an arc and often read as "dropped onto the plate".
 *
 * Here the food is grown like a bunch of grapes: the hero goes down first near the golden spot, then
 * every support and accent piece is placed where it touches the food already down (about 1.25 x its
 * width apart for chunks, overlapping a little for flat pieces), on the side of the hero the layout
 * gives it, never past the ware's reach. Platforms (toast, mash, a cake) carry their toppings on top;
 * skewers lie as one fanned bundle; a drink's fruit leans against its glass.
 *
 * Pieces get layers (hero 0, support 1, accent 2), so the builder drops them in that order.
 */

/** Heroes that are platforms: their toppings sit on them. */
export const PLATFORM_FORMS = ['mash', 'pancake', 'cake', 'pastry', 'toast', 'omelette'];

/** A piece's footprint as a disc for packing (cm). Long thin pieces (fries, slices) count by their
 * area, not their diagonal, so a bunch packs close and lets them lean over each other. */
function packR(info: ElementInfo, scale: number): number {
  if (info.shape === 'rect') {
    // Chunky pieces (cubes, toast, a steak) by their corners, so turned neighbours never overlap
    // and stack; long thin ones (fries, slices) by their area, so a bunch packs close.
    const chunky = Math.max(info.w!, info.h!) / Math.min(info.w!, info.h!) < 2;
    return (chunky ? (Math.hypot(info.w!, info.h!) / 2) * 0.92 : Math.sqrt(info.w! * info.h!) / 2) * scale;
  }
  return info.r! * scale * (info.shape === 'half' ? 0.85 : 1);
}

/** Flat pieces (slices, wheels, leaves, chips, crumbs) may shingle; chunks only just touch. */
function isFlat(part: Part): boolean {
  // Fries count here too: they pile into a planned two-layer bunch (allowed up to 2.6 cm high).
  return ['slice', 'wheel', 'leaf', 'chip', 'crumble', 'strip', 'fries'].includes(part.form);
}

interface Disc {
  c: [number, number];
  r: number;
  /** A flat piece (slice, wheel, chip): two flat pieces may shingle; anything else only touches. */
  flat?: boolean;
}

/**
 * A piece's footprint for packing: a capsule, like a row of coins along its length. Round and chunky
 * pieces are one coin; a long one (a fillet, an avocado slice, a fry, a pepper strip) is a row, so its
 * ends cannot reach over a neighbour the way one big circle let them (they landed on each other).
 */
interface Shape {
  /** Half the width (each coin's radius). */
  r: number;
  /** Half the length of the row of coin centres (0 for a single coin). */
  half: number;
}

function shapeFor(info: ElementInfo, scale: number): Shape {
  if (info.shape === 'rect') {
    const long = Math.max(info.w!, info.h!) * scale;
    const short = Math.min(info.w!, info.h!) * scale;
    if (long / short >= 1.6) return { r: short / 2, half: long / 2 - short / 2 };
  }
  return { r: packR(info, scale), half: 0 };
}

/** The coins of a shape laid at `c`, turned `angle` degrees (the plan's turn: 0 runs front to back). */
function discsAt(shape: Shape, c: [number, number], angle: number, flat = false): Disc[] {
  if (shape.half <= 0) return [{ c, r: shape.r, flat }];
  const a = (angle * Math.PI) / 180;
  const along: [number, number] = [-Math.sin(a), Math.cos(a)];
  const n = Math.max(2, Math.ceil((2 * shape.half) / shape.r) + 1);
  const out: Disc[] = [];
  for (let k = 0; k < n; k++) {
    const t = -shape.half + (2 * shape.half * k) / (n - 1);
    out.push({ c: [c[0] + along[0] * t, c[1] + along[1] * t], r: shape.r, flat });
  }
  return out;
}

/**
 * Grow `n` pieces onto the mass, each one touching it and overlapping nothing, as near the anchor as
 * it can be. Long pieces try lying along the bunch and pointing out from it. `limit` keeps a piece
 * inside the ware; `sep` is how close two coins may come (1: just touching, below 1: a light shingle).
 */
function grow(mass: Disc[], n: number, shape: Shape, anchor: [number, number], limit: (c: [number, number], r: number) => boolean, flat: boolean, random: () => number): { at: [number, number]; angle: number }[] {
  const out: { at: [number, number]; angle: number }[] = [];
  const extent = shape.r + shape.half;
  for (let k = 0; k < n; k++) {
    let best: { at: [number, number]; angle: number } | null = null;
    let bestScore = Infinity;
    let fallback: { at: [number, number]; angle: number } = { at: anchor, angle: random() * 360 };
    let fallbackScore = Infinity;
    for (const d of mass) {
      for (let s = 0; s < 16; s++) {
        const a = (s / 16) * Math.PI * 2 + random() * 0.2;
        const dir: [number, number] = [Math.cos(a), Math.sin(a)];
        // Flat on flat shingles a little (0.86); against anything with height, just touching (1.02).
        const touch = (d.r + shape.r) * (flat && d.flat ? 0.86 : 1.02);
        // Plan turns whose long side lies along the bunch (tangent) or points out from it (radial).
        const radialTurn = (Math.atan2(-dir[0], dir[1]) * 180) / Math.PI;
        const tries: { dist: number; angle: number }[] = shape.half > 0
          ? [{ dist: touch, angle: radialTurn + 90 }, { dist: touch + shape.half, angle: radialTurn }, { dist: touch, angle: radialTurn + 90 + (random() - 0.5) * 50 }]
          : [{ dist: touch, angle: random() * 360 }];
        for (const t of tries) {
          const c: [number, number] = [d.c[0] + dir[0] * t.dist, d.c[1] + dir[1] * t.dist];
          const score = Math.hypot(c[0] - anchor[0], c[1] - anchor[1]) + random() * 0.35;
          if (!limit(c, extent)) continue;
          const coins = discsAt(shape, c, t.angle, flat);
          const clear = coins.every((q) => mass.every((e) => Math.hypot(q.c[0] - e.c[0], q.c[1] - e.c[1]) >= (e.r + q.r) * (flat && e.flat ? 0.8 : 0.98)));
          if (clear && score < bestScore) (best = { at: c, angle: t.angle }), (bestScore = score);
          if (score < fallbackScore) (fallback = { at: c, angle: t.angle }), (fallbackScore = score);
        }
      }
    }
    // No room left to touch the bunch without stacking: the plate holds what fits (the first piece
    // always goes down, so every ingredient shows).
    if (!best && k > 0) break;
    const pick = best ?? fallback;
    out.push(pick);
    mass.push(...discsAt(shape, pick.at, pick.angle, flat));
  }
  return out;
}

export function composeLayoutPlan(idea: DishIdea, layout: LayoutSpec = layoutById(idea.layout)!, seed = idea.seed ?? 1): ComposedPlan {
  const random = seededRandom((seed ^ 0x51ab) >>> 0);
  const ware = WARE_PLAN[idea.ware];
  const R = ware.reach;
  const placed: Placed[] = [];
  const wareLimit = (c: [number, number], r: number) =>
    idea.ware === 'board' ? Math.abs(c[0]) + r <= 13.5 && Math.abs(c[1]) + r <= 9.5 : idea.ware === 'glass' ? Math.hypot(c[0], c[1]) + r <= R : Math.hypot(c[0], c[1]) + r <= R;

  // The hero: one piece or a tight group, near the golden spot (a little up and left, the light's side).
  const hero = readPart(idea.big);
  const heroInfo = elementInfo(hero.ingredient, hero.form);
  let heroScale = tierScale('big', heroInfo, hero.ingredient);
  // Skewers fit the ware: never hanging off a dinner plate.
  if (hero.form === 'skewer') heroScale = Math.min(1, (idea.ware === 'board' ? 26 : 2 * R * 0.92) / 22);
  const golden = R / (PHI * PHI);
  const glassAt: [number, number] = [-1.5, -1];
  const heroAt: [number, number] =
    idea.ware === 'glass' ? glassAt : idea.ware === 'deep' ? [-0.9, 0.2] : [-golden * 0.32, golden * 0.12];

  const heroDiscs: Disc[] = [];
  const side = random() < 0.5 ? 1 : -1;
  if (layout.packing === 'beside-glass') {
    // The glass is the centre; the hero fruit leans against it, front right.
    const r = packR(heroInfo, fitWare(heroScale, heroInfo, 3.2));
    const scale = fitWare(heroScale, heroInfo, 3.2);
    for (let k = 0; k < hero.count; k++) {
      const a = -0.5 + k * 0.75 + signed(random) * 0.15;
      const d = 3.6 + r + 0.1;
      const at: [number, number] = [glassAt[0] + Math.cos(a) * d, glassAt[1] + Math.sin(a) * d + 1];
      placed.push({ part: hero, size: 'big', scale, at, angle: random() * 360, index: k, layer: 0 });
      heroDiscs.push({ c: at, r });
    }
  } else if (layout.packing === 'bundle') {
    // Two or three skewers as one object: side by side a stick's width apart, fanned 10 to 20 degrees
    // so they cross near their tips.
    const n = Math.max(2, Math.min(3, hero.count));
    // A plan angle of 0 lays a stick front to back; turned about 60 to 80 degrees it runs across the
    // plate on a diagonal. Sticks sit side by side a little under a bead's width apart (so their
    // beads touch), fanned a few degrees so the tips nearly cross.
    const base = 70 + signed(random) * 10;
    const width = 3.4 * heroScale;
    for (let k = 0; k < n; k++) {
      const t = k - (n - 1) / 2;
      const angle = base + t * (5 + random() * 3);
      const rad = (base * Math.PI) / 180;
      // Across the sticks: perpendicular to their run.
      const across: [number, number] = [Math.cos(rad), -Math.sin(rad)];
      const at: [number, number] = [heroAt[0] + 0.6 + across[0] * t * width * 0.85, heroAt[1] + across[1] * t * width * 0.85];
      placed.push({ part: hero, size: 'big', scale: heroScale, at, angle, index: k, layer: 0 });
      // The stick as a row of discs along its length, for the accents to touch.
      const len = 22 * heroScale;
      const along: [number, number] = [Math.sin((angle * Math.PI) / 180), Math.cos((angle * Math.PI) / 180)];
      for (let s = -2; s <= 2; s++) heroDiscs.push({ c: [at[0] + (along[0] * s * len) / 5, at[1] + (along[1] * s * len) / 5], r: 1.7 * heroScale });
    }
  } else {
    const group = arrange(heroInfo.group, hero.count, heroInfo, heroScale, random);
    let reach = 0;
    group.forEach((p) => (reach = Math.max(reach, Math.hypot(p.at[0], p.at[1]) + footprint(heroInfo, heroScale))));
    // A hero group too big for the layout is cut down to fit, never below 0.6.
    const k = reach > R * layout.heroShare ? Math.max(0.5, (R * layout.heroShare) / reach) : 1;
    heroScale *= k;
    group.forEach((p, index) => {
      const at: [number, number] = [heroAt[0] + p.at[0] * k, heroAt[1] + p.at[1] * k];
      placed.push({ part: hero, size: 'big', scale: heroScale, at, angle: p.angle, index, layer: 0 });
      heroDiscs.push(...discsAt(shapeFor(heroInfo, heroScale), at, p.angle));
    });
  }
  const heroCentre: [number, number] = [
    heroDiscs.reduce((a, d) => a + d.c[0], 0) / heroDiscs.length,
    heroDiscs.reduce((a, d) => a + d.c[1], 0) / heroDiscs.length,
  ];
  const heroR = Math.max(...heroDiscs.map((d) => Math.hypot(d.c[0] - heroCentre[0], d.c[1] - heroCentre[1]) + d.r));

  // Support then accents, each kind as one bunch touching the food already down.
  const mass: Disc[] = [...heroDiscs];
  // Toppings on a platform touch each other, side by side across it (never stacked), and only as
  // many as fit inside its edge.
  const top: Disc[] = [];
  // A platform hero (toast, mash, a pancake, a cake, pastry, an omelette) carries its toppings on top,
  // whatever the layout (a dessert's pancake as much as a toast board).
  const platform = layout.packing === 'platform' || PLATFORM_FORMS.includes(hero.form) || hero.ingredient === 'tart';
  const groups: { text: string; size: 'medium' | 'small'; layer: number }[] = [
    ...idea.medium.map((text) => ({ text, size: 'medium' as const, layer: 1 })),
    ...idea.small.filter((text) => readPart(text).form !== 'herb').map((text) => ({ text, size: 'small' as const, layer: 2 })),
  ];
  groups.forEach((g, gi) => {
    const part = readPart(g.text);
    const info = elementInfo(part.ingredient, part.form);
    // Toppings on a platform are cut to fit it: several side by side across a tart or a toast.
    const onTop = platform && idea.ware !== 'glass' && !['quenelle', 'smear', 'tuile', 'puree'].includes(part.ingredient);
    const cap = onTop ? Math.min(R * 0.34, heroR * (g.size === 'medium' ? 0.62 : 0.4)) : idea.ware === 'deep' ? R * 0.5 : g.size === 'medium' ? R * 0.34 : R * 0.24;
    // On a platform the whole bunch must fit inside its edge: each piece is sized so the bunch's
    // area is about two thirds of the platform's (never the usual floor of 45%).
    const tier = tierScale(g.size, info, part.ingredient);
    const fitTop = () => {
      const each = Math.sqrt((Math.PI * (heroR * 0.82) ** 2 * (g.size === 'medium' ? 0.6 : 0.25)) / Math.max(1, part.count)) * 1.15;
      return Math.min(tier, (tier * Math.min(cap, each)) / Math.max(0.1, footprint(info, tier)));
    };
    const scale = onTop ? fitTop() : fitWare(tier, info, cap);
    const shape = shapeFor(info, scale);
    const r = shape.r + shape.half;
    let spots: { at: [number, number]; angle: number }[];
    // A quenelle, a smear, a tuile or a puree goes beside a platform on the plate, never on it
    // (a tart's ice cream sits next to the slice).
    const besidePlatform = ['quenelle', 'smear', 'tuile', 'puree'].includes(part.ingredient);
    if (platform && idea.ware !== 'glass' && !besidePlatform) {
      // Toppings on the platform: support spread over it, accents round its edge, all on top.
      const edge = heroR * 0.86;
      const inside = (c: [number, number], rr: number) => Math.hypot(c[0] - heroCentre[0], c[1] - heroCentre[1]) + rr * 0.4 <= edge && wareLimit(c, rr);
      if (!top.length) {
        const first = { at: [heroCentre[0] + signed(random) * 0.4, heroCentre[1] + signed(random) * 0.4] as [number, number], angle: random() * 360 };
        top.push(...discsAt(shape, first.at, first.angle, isFlat(part)));
        spots = [first, ...grow(top, part.count - 1, shape, heroCentre, inside, isFlat(part), random)];
      } else {
        // Accents round the support, toward the platform's edge.
        const a = random() * Math.PI * 2;
        const anchor: [number, number] = [heroCentre[0] + Math.cos(a) * edge * 0.6, heroCentre[1] + Math.sin(a) * edge * 0.6];
        spots = grow(top, part.count, shape, anchor, inside, isFlat(part), random);
      }
    } else {
      // The support bunch sits on one side of the hero (the bigger pocket, toward the plate's middle);
      // accents round the other way, still touching the mass.
      const away = Math.atan2(-heroCentre[1], -heroCentre[0] + 1e-6);
      const turn = g.size === 'medium' ? side * (0.35 + gi * 0.5) : -side * (1.6 + gi * 0.4);
      const a = away + turn;
      const d = heroR + r * 1.5;
      const anchor: [number, number] = [heroCentre[0] + Math.cos(a) * d, heroCentre[1] + Math.sin(a) * d];
      spots = grow(mass, part.count, shape, anchor, wareLimit, isFlat(part), random);
    }
    spots.forEach(({ at, angle }, k) => {
      placed.push({ part, size: g.size, scale, at, angle, index: gi * 20 + k, layer: g.layer });
    });
  });

  // The base under it all: a pool round the food (centred on the food, a little wider than it),
  // a leaf bed, a soup to the bowl's wall, or the rice the deep bowl already holds.
  const [baseKind, baseWhat = ''] = idea.base.split(':');
  const food = placed.map((p) => ({ c: p.at, r: packR(elementInfo(p.part.ingredient, p.part.form), p.scale) }));
  const fx = food.reduce((a, d) => a + d.c[0], 0) / food.length;
  const fz = food.reduce((a, d) => a + d.c[1], 0) / food.length;
  const extent = Math.max(...food.map((d) => Math.hypot(d.c[0] - fx, d.c[1] - fz) + d.r));
  let baseAt: [number, number] = [fx, fz];
  let baseR = Math.min(R * Math.max(layout.poolShare, 0.5), Math.max(4.5, extent + 1.2));
  if (baseKind === 'soup') (baseAt = [0, 0]), (baseR = R * 0.98);
  if (baseKind === 'leaves') baseR = Math.min(R * 0.85, Math.max(5, extent + 1.5));
  if (idea.ware === 'glass') (baseAt = glassAt), (baseR = 3.6);
  if (idea.ware === 'deep') (baseAt = [0, 0]), (baseR = 4.6);

  // Herbs from the idea (the builder adds its own garnish layer over and round the food too).
  const herbs: [number, number][] = [];
  const herbCount = idea.small.map(readPart).filter((p) => p.form === 'herb').reduce((a, p) => a + p.count, 0);
  for (let k = 0; k < herbCount; k++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * Math.min(extent, R * 0.8);
    herbs.push([fx + Math.cos(a) * r, fz + Math.sin(a) * r]);
  }

  const shapes: PlanShape[] = [];
  if (baseKind !== 'none') shapes.push({ kind: 'circle', label: idea.base, size: 'ground', at: baseAt, r: baseR });
  for (const p of placed) shapes.push(shapeOf(p.size === 'big' ? idea.big : `${p.part.ingredient}:${p.part.form}`, p.size, elementInfo(p.part.ingredient, p.part.form), p.scale, p.at, p.angle));
  for (const h of herbs) shapes.push({ kind: 'circle', label: 'herb', size: 'small', at: h, r: 0.3 });

  return {
    plan: {
      title: idea.title,
      plate: ware.plate,
      well: ware.well,
      shapes,
      notes: [`Layout: ${layout.id} (${layout.packing}).`, `Hero ${idea.big}; support ${idea.medium.join(', ') || 'none'}; accents ${idea.small.join(', ') || 'none'}.`, 'Every piece touches the food already down.'],
    },
    placed,
    base: { kind: baseKind, what: baseWhat, at: baseAt, r: baseR },
    herbs,
  };
}
