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
  return ['slice', 'wheel', 'leaf', 'chip', 'crumble', 'fries'].includes(part.form);
}

interface Disc {
  c: [number, number];
  r: number;
}

/**
 * Grow `n` pieces of radius `r` onto the mass, each one touching it, as near the anchor as it can be.
 * `limit` keeps a piece inside the ware; `sep` is how close two pieces' discs may come (1: just
 * touching, below 1: overlapping like fallen coins).
 */
function grow(mass: Disc[], n: number, r: number, anchor: [number, number], limit: (c: [number, number], r: number) => boolean, sep: number, random: () => number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    let best: [number, number] | null = null;
    let bestScore = Infinity;
    let fallback: [number, number] = anchor;
    let fallbackScore = Infinity;
    for (const d of mass) {
      for (let s = 0; s < 16; s++) {
        const a = (s / 16) * Math.PI * 2 + random() * 0.2;
        // Pressed in (0.88): neighbours lean on each other, so they still touch after they settle
        // (pieces slide a little as they come to rest).
        const dist = (d.r + r) * Math.max(sep, 0.6) * 0.88;
        const c: [number, number] = [d.c[0] + Math.cos(a) * dist, d.c[1] + Math.sin(a) * dist];
        const score = Math.hypot(c[0] - anchor[0], c[1] - anchor[1]) + random() * 0.35;
        const clear = mass.every((e) => Math.hypot(c[0] - e.c[0], c[1] - e.c[1]) >= (e.r + r) * sep * 0.84);
        if (clear && limit(c, r) && score < bestScore) {
          best = c;
          bestScore = score;
        }
        if (limit(c, r) && score < fallbackScore) {
          fallback = c;
          fallbackScore = score;
        }
      }
    }
    // No room left to touch the bunch without stacking: the plate holds what fits (the first piece
    // always goes down, so every ingredient shows).
    if (!best && k > 0) break;
    const c = best ?? fallback;
    out.push(c);
    mass.push({ c, r });
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
      heroDiscs.push({ c: at, r: packR(heroInfo, heroScale) });
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
  const platform = layout.packing === 'platform' || PLATFORM_FORMS.includes(hero.form);
  const groups: { text: string; size: 'medium' | 'small'; layer: number }[] = [
    ...idea.medium.map((text) => ({ text, size: 'medium' as const, layer: 1 })),
    ...idea.small.filter((text) => readPart(text).form !== 'herb').map((text) => ({ text, size: 'small' as const, layer: 2 })),
  ];
  groups.forEach((g, gi) => {
    const part = readPart(g.text);
    const info = elementInfo(part.ingredient, part.form);
    const cap = idea.ware === 'deep' ? R * 0.5 : g.size === 'medium' ? R * 0.34 : R * 0.24;
    const scale = fitWare(tierScale(g.size, info, part.ingredient), info, cap);
    const r = packR(info, scale);
    let spots: [number, number][];
    if (platform && idea.ware !== 'glass') {
      // Toppings on the platform: support spread over it, accents round its edge, all on top.
      const edge = heroR * 0.82;
      const inside = (c: [number, number], rr: number) => Math.hypot(c[0] - heroCentre[0], c[1] - heroCentre[1]) + rr * 0.6 <= edge && wareLimit(c, rr);
      if (!top.length) {
        const first: [number, number] = [heroCentre[0] + signed(random) * 0.4, heroCentre[1] + signed(random) * 0.4];
        top.push({ c: first, r });
        spots = [first, ...grow(top, part.count - 1, r, heroCentre, inside, isFlat(part) ? 0.62 : 1, random)];
      } else {
        // Accents round the support, toward the platform's edge.
        const a = random() * Math.PI * 2;
        const anchor: [number, number] = [heroCentre[0] + Math.cos(a) * edge * 0.6, heroCentre[1] + Math.sin(a) * edge * 0.6];
        spots = grow(top, part.count, r, anchor, inside, isFlat(part) ? 0.62 : 1, random);
      }
    } else {
      // The support bunch sits on one side of the hero (the bigger pocket, toward the plate's middle);
      // accents round the other way, still touching the mass.
      const away = Math.atan2(-heroCentre[1], -heroCentre[0] + 1e-6);
      const turn = g.size === 'medium' ? side * (0.35 + gi * 0.5) : -side * (1.6 + gi * 0.4);
      const a = away + turn;
      const d = heroR + r * 1.5;
      const anchor: [number, number] = [heroCentre[0] + Math.cos(a) * d, heroCentre[1] + Math.sin(a) * d];
      spots = grow(mass, part.count, r, anchor, wareLimit, isFlat(part) ? 0.62 : 1, random);
    }
    spots.forEach((at, k) => {
      const angle = info.shape === 'half' ? (Math.atan2(heroCentre[1] - at[1], heroCentre[0] - at[0]) * 180) / Math.PI + 90 + signed(random) * 20 : random() * 360;
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
