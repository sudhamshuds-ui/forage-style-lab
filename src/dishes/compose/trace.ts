import { seededRandom, signed } from '../../ingredients/forms/kit/random';
import type { DishIdea } from '../catalog';
import type { PlanShape, Size } from '../kit/plan';
import { elementInfo, readPart, WARE_PLAN, type ComposedPlan, type Placed } from './layout';

/**
 * Plans traced from the generated references (the user, 2026-11-22: "make the 2d plan to replicate
 * the generated dish refs. they are perfect, use them as source of truth for everything, shapes,
 * form, plating, colours, composition").
 *
 * Each reference (docs/dishes/refs/{id}.jpg, 360 px square) is read through a grid: the plate's
 * outline in the picture (left, right, top and bottom edges, in pixels) gives the ruler, and every
 * piece is written down where its foot sits in the picture, with its real size and the way its long
 * side points seen from above. Pieces are listed in layers, bottom first, as they were plated: the
 * physics drops each layer onto the one under it (salmon folds onto a rösti, onion rings on top).
 *
 * The picture looks down at about 40 degrees, so the plate is an oval; a point's place on the plate
 * is its offset from the oval's middle, divided by the oval's half width (across) or half height
 * (front to back), times the plate's radius. Heights lift a piece's top in the picture, so the
 * traced point is always the piece's foot.
 */

/** One piece, or a cluster of `n` alike spread round the point: [part, B/M/S, u, v, size cm, turn, n, spread cm]. */
export type TraceItem = [part: string, size: 'b' | 'm' | 's', u: number, v: number, cm: number, deg: number, n?: number, spread?: number];

export interface Trace {
  /** The ware's outline in the picture: left, right, top, bottom (px). */
  edge: [number, number, number, number];
  /** The ware, when the picture shows another than the catalogue's. */
  ware?: DishIdea['ware'];
  /** The base under everything: its kind (`pool:jus`...), middle (px) and radius (cm). */
  base?: [string, number, number, number];
  /** Pieces in layers, bottom first. */
  layers: TraceItem[][];
  /** Herb flecks: how many, round which point (px), how far (cm). */
  herbs?: [number, number, number, number];
}

/** The ware's real half width and half depth (cm) for the ruler. */
function halfSize(ware: DishIdea['ware']): [number, number] {
  if (ware === 'board') return [15, 11];
  if (ware === 'glass') return [3.6, 3.6];
  const r = WARE_PLAN[ware].plate;
  return [r, r];
}

const SIZE: Record<'b' | 'm' | 's', Size> = { b: 'big', m: 'medium', s: 'small' };

/** How tall a piece stands, as a share of its traced size (for pieces laid on top of it). */
const HEIGHT_SHARE: Record<string, number> = {
  cake: 0.4, pastry: 0.12, pancake: 0.1, mash: 0.18, toast: 0.17, fillet: 0.25, steak: 0.2, omelette: 0.2,
  fries: 0.18, chip: 0.05, whole: 0.6, cube: 0.8, half: 0.45, slice: 0.08, wheel: 0.1, leaf: 0.05, egg: 0.15, wedge: 0.5, roll: 0.45, drumstick: 0.3, skewer: 0.15,
};

/**
 * Chunky pieces of one layer (cubes, florets, halves, drumsticks) set side by side. The trace marks
 * where they show in the picture, often closer than their own size (a heap seen from the side); the
 * physics only lets a piece fall straight down, so overlapping footprints stacked into towers. Each
 * pair is pushed apart until their footprints just touch. Flat pieces (slices, leaves, wheels) may
 * still overlap, as shingles.
 */
function spreadLayer(layer: Placed[], shapes: PlanShape[], ware: DishIdea['ware']): void {
  const chunky = layer.filter((q) => (HEIGHT_SHARE[q.part.form] ?? 0.3) >= 0.25);
  const radius = (q: Placed) => {
    const shape = shapes.find((s) => s.at === q.at);
    if (shape?.kind === 'rect') return ((shape.w + shape.h) / 4) * 0.9;
    return ((shape as { r?: number } | undefined)?.r ?? (q.target ?? 3) / 2) * 0.9;
  };
  const radii = chunky.map(radius);
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let i = 0; i < chunky.length; i++) {
      for (let j = i + 1; j < chunky.length; j++) {
        const a = chunky[i].at;
        const b = chunky[j].at;
        let dx = b[0] - a[0];
        let dz = b[1] - a[1];
        let d = Math.hypot(dx, dz);
        const want = radii[i] + radii[j];
        if (d >= want) continue;
        if (d < 1e-3) (dx = 1), (dz = 0), (d = 1);
        const push = (want - d) / 2;
        a[0] -= (dx / d) * push;
        a[1] -= (dz / d) * push;
        b[0] += (dx / d) * push;
        b[1] += (dz / d) * push;
        moved = true;
      }
    }
    if (ware === 'deep') {
      for (let i = 0; i < chunky.length; i++) {
        const at = chunky[i].at;
        const d = Math.hypot(at[0], at[1]);
        const most = 4.6 - (chunky[i].target ?? 3) * 0.3;
        if (d > most) (at[0] = (at[0] * most) / d), (at[1] = (at[1] * most) / d);
      }
    }
    if (!moved) break;
  }
}

/** A traced reference as a plan (top view, cm), with every piece placed for the 3D build. */
export function tracedPlan(idea: DishIdea, trace: Trace): ComposedPlan {
  const random = seededRandom(0x7ace ^ idea.id.length);
  const ware = trace.ware ?? idea.ware;
  const [l, r, t, b] = trace.edge;
  const cu = (l + r) / 2;
  const cv = (t + b) / 2;
  const [hw, hd] = halfSize(ware);
  const toCm = (u: number, v: number): [number, number] => [((u - cu) / ((r - l) / 2)) * hw, ((v - cv) / ((b - t) / 2)) * hd];
  const placed: Placed[] = [];
  const shapes: PlanShape[] = [];
  let index = 0;
  // A piece lying on another shows higher in the painting by the height under it, which reads as
  // further back: its place is moved forward by that height over the view's slope.
  const slope = Math.max(0.3, (b - t) / (r - l));
  const cot = Math.sqrt(1 - slope * slope) / slope;
  const below: { at: [number, number]; r: number; h: number }[] = [];
  const heightUnder = (at: [number, number]) => below.filter((q) => Math.hypot(q.at[0] - at[0], q.at[1] - at[1]) < q.r).reduce((most, q) => Math.max(most, q.h), 0);
  trace.layers.forEach((layer, layerIndex) => {
    const thisLayer: typeof below = [];
    for (const [text, s, u, v, cm, deg, n = 1, spread = 0] of layer) {
      const part = readPart(text);
      const info = elementInfo(part.ingredient, part.form);
      let centre = toCm(u, v);
      if (layerIndex > 0) {
        for (let pass = 0; pass < 2; pass++) {
          const raw = toCm(u, v);
          centre = [raw[0], raw[1] + heightUnder(centre) * cot];
        }
      }
      thisLayer.push({ at: centre, r: cm / 2 + spread, h: cm * (HEIGHT_SHARE[part.form] ?? 0.3) + heightUnder(centre) });
      for (let k = 0; k < n; k++) {
        const a = k * 2.39996 + random() * 0.4;
        const rr = n > 1 ? spread * Math.sqrt((k + 0.5) / n) : 0;
        let at: [number, number] = [centre[0] + Math.cos(a) * rr, centre[1] + Math.sin(a) * rr];
        // Beside a drink, fruit lies on the table within reach of the glass (the glass is a small
        // ruler, so a far point in the picture traced tens of centimetres away and was lost).
        if (ware === 'glass') {
          const d = Math.hypot(at[0], at[1]);
          const most = 10;
          if (d > most) at = [(at[0] * most) / d, (at[1] * most) / d];
        }
        // In a rice bowl everything sits on the rice, inside the rim.
        if (ware === 'deep') {
          const d = Math.hypot(at[0], at[1]);
          const most = 4.6 - cm * 0.3;
          if (d > most) at = [(at[0] * most) / d, (at[1] * most) / d];
        }
        // The plan's turn: 0 has a rectangle's long side running front to back; the trace's 0 runs across.
        const angle = deg + 90 + (n > 1 ? signed(random) * 35 : 0);
        placed.push({ part, size: SIZE[s], scale: 1, at, angle, index: index++, target: cm, layer: layerIndex });
        const label = `${part.ingredient}:${part.form}`;
        if (info.shape === 'rect') {
          const long = Math.max(info.w!, info.h!);
          const k2 = cm / long;
          shapes.push({ kind: 'rect', label, size: SIZE[s], at, angle, w: info.w! * k2, h: info.h! * k2, round: Math.min(info.w!, info.h!) * k2 * 0.3 });
        } else shapes.push({ kind: info.shape, label, size: SIZE[s], at, angle, r: cm / 2 } as PlanShape);
      }
    }
    below.push(...thisLayer);
    spreadLayer(placed.filter((q) => q.layer === layerIndex), shapes, ware);
  });
  let base = trace.base ? { kind: trace.base[0].split(':')[0], what: trace.base[0].split(':')[1] ?? '', at: toCm(trace.base[1], trace.base[2]), r: trace.base[3] } : { kind: 'none', what: '', at: [0, 0] as [number, number], r: 0 };
  // No sauce in the reference but a pool chosen for the dish: it lies under the first layer, a
  // little wider than the food, so the plate is layered from the sauce up.
  if (!trace.base && idea.base.startsWith('pool:')) {
    const first = placed.filter((q) => q.layer === 0);
    const cx = first.reduce((a, q) => a + q.at[0], 0) / Math.max(1, first.length);
    const cz = first.reduce((a, q) => a + q.at[1], 0) / Math.max(1, first.length);
    const reach = first.reduce((most, q) => Math.max(most, Math.hypot(q.at[0] - cx, q.at[1] - cz) + (q.target ?? 3) * 0.3), 0);
    base = { kind: 'pool', what: idea.base.split(':')[1], at: [cx, cz], r: Math.min(WARE_PLAN[ware].well + 1, Math.max(4.5, reach + 1.2)) };
  }
  if (base.kind !== 'none') shapes.unshift({ kind: 'circle', label: `${base.kind}:${base.what}`, size: 'ground', at: base.at, r: base.r });
  const herbs: [number, number][] = [];
  if (trace.herbs) {
    const [n, u, v, rad] = trace.herbs;
    const c = toCm(u, v);
    for (let k = 0; k < n; k++) {
      const a = random() * Math.PI * 2;
      const rr = Math.sqrt(random()) * rad;
      herbs.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]);
      shapes.push({ kind: 'circle', label: 'herb', size: 'small', at: herbs[k], r: 0.3 });
    }
  }
  return {
    plan: {
      title: idea.title,
      plate: ware === 'board' ? 15 : ware === 'glass' ? 13.5 : WARE_PLAN[ware].plate,
      well: WARE_PLAN[ware].well,
      shapes,
      notes: ['Traced from the generated reference (docs/dishes/refs).', 'Layers bottom first; each piece where its foot sits in the picture.', ''],
    },
    placed,
    base,
    herbs,
  };
}
