import type { DishIdea } from '../catalog';

/**
 * Plating layouts (the composable dishes spec, 2026-11-26): ten plating recipes the Kitchen's Cook
 * picks from. A layout is like a page template in a layout grid: it fixes the ware, the order the
 * layers go down, how many pieces of each kind, and how they pack (a tight bunch, a shingled fan,
 * a bundle of skewers, toppings on a platform). Which ingredient fills which part comes from the
 * ingredient traits (src/ingredients/traits.ts) in `pickDish` (pick.ts).
 *
 * Data only: the planner (layoutPlan.ts) reads it to place pieces, the builder (build.ts) reads the
 * layer flags. No 3D code here.
 */

export type LayoutId =
  | 'circular-plate'
  | 'rice-bowl'
  | 'leaf-salad'
  | 'toast-board'
  | 'soup-bowl'
  | 'skewer-platter'
  | 'glass-drink'
  | 'dessert-bowl'
  | 'skillet-bake'
  | 'mash-plate'
  // Per-course archetypes (the fix list, 2026-11-25, P1).
  | 'tart'
  | 'plated-dessert'
  | 'pancake-stack'
  | 'tartare-crudo'
  | 'composed-plate';

/**
 * How the pieces pack round the hero:
 * - `cluster`: the bunch grows out from the hero, each piece touching the food already down.
 * - `platform`: the hero is a platform (toast, mash, cake, pancake, omelette); toppings sit on it.
 * - `bundle`: two or three skewers fanned over each other as one object.
 * - `beside-glass`: fruit on the table against the glass.
 */
export type Packing = 'cluster' | 'platform' | 'bundle' | 'beside-glass';

export interface LayoutSpec {
  id: LayoutId;
  /** Courses it suits (DishIdea's own lower-case courses). */
  courses: DishIdea['course'][];
  /** The ware, and the one high Wild may swap to. */
  ware: DishIdea['ware'];
  wildWare?: DishIdea['ware'];
  packing: Packing;
  /** A pool under the food when no table ingredient already makes one. */
  wantsUnderPool: boolean;
  /** Sauce on top, after the mains (a drizzle over the support, a seared top kept clear). */
  wantsTopSauce: boolean;
  /** The full savoury garnish layer (40 to 50 shavings, 18 herbs); off on puddings and drinks. */
  savoryGarnish: boolean;
  /** Counts (inclusive ranges) for the support bunch and the accent cluster, per piece kind. */
  support: [number, number];
  accent: [number, number];
  /** The hero group's reach, as a share of the ware's reach. */
  heroShare: number;
  /** The under-pool's radius, as a share of the ware's reach. */
  poolShare: number;
}

export const LAYOUTS: LayoutSpec[] = [
  { id: 'circular-plate', courses: ['main', 'starter'], ware: 'plate', wildWare: 'slate', packing: 'cluster', wantsUnderPool: true, wantsTopSauce: true, savoryGarnish: true, support: [5, 7], accent: [3, 4], heroShare: 0.72, poolShare: 0.72 },
  { id: 'rice-bowl', courses: ['main', 'snack'], ware: 'deep', packing: 'cluster', wantsUnderPool: false, wantsTopSauce: true, savoryGarnish: true, support: [4, 6], accent: [1, 3], heroShare: 0.6, poolShare: 0 },
  { id: 'leaf-salad', courses: ['starter', 'main'], ware: 'plate', wildWare: 'bowl', packing: 'cluster', wantsUnderPool: false, wantsTopSauce: true, savoryGarnish: true, support: [5, 8], accent: [3, 5], heroShare: 0.6, poolShare: 0.8 },
  { id: 'toast-board', courses: ['snack', 'starter'], ware: 'board', packing: 'platform', wantsUnderPool: false, wantsTopSauce: true, savoryGarnish: true, support: [4, 6], accent: [3, 5], heroShare: 0.8, poolShare: 0 },
  { id: 'soup-bowl', courses: ['starter', 'main'], ware: 'bowl', packing: 'cluster', wantsUnderPool: true, wantsTopSauce: true, savoryGarnish: true, support: [3, 5], accent: [3, 3], heroShare: 0.55, poolShare: 0.98 },
  { id: 'skewer-platter', courses: ['main', 'snack'], ware: 'plate', wildWare: 'board', packing: 'bundle', wantsUnderPool: true, wantsTopSauce: true, savoryGarnish: true, support: [0, 0], accent: [1, 3], heroShare: 1, poolShare: 0.7 },
  { id: 'glass-drink', courses: ['drink', 'dessert'], ware: 'glass', packing: 'beside-glass', wantsUnderPool: false, wantsTopSauce: false, savoryGarnish: false, support: [1, 3], accent: [1, 3], heroShare: 0.4, poolShare: 0 },
  { id: 'dessert-bowl', courses: ['dessert'], ware: 'bowl', wildWare: 'plate', packing: 'cluster', wantsUnderPool: true, wantsTopSauce: true, savoryGarnish: false, support: [4, 6], accent: [3, 5], heroShare: 0.6, poolShare: 0.72 },
  { id: 'skillet-bake', courses: ['main', 'snack', 'starter'], ware: 'bowl', packing: 'cluster', wantsUnderPool: true, wantsTopSauce: true, savoryGarnish: true, support: [5, 7], accent: [3, 5], heroShare: 0.55, poolShare: 0.92 },
  { id: 'mash-plate', courses: ['main', 'starter'], ware: 'plate', wildWare: 'bowl', packing: 'platform', wantsUnderPool: true, wantsTopSauce: true, savoryGarnish: true, support: [4, 5], accent: [3, 5], heroShare: 0.55, poolShare: 0.75 },
  // A fruit or cream tart: the shell is the platform, the hero's slices fanned in it, cream beside.
  { id: 'tart', courses: ['dessert'], ware: 'plate', wildWare: 'slate', packing: 'platform', wantsUnderPool: false, wantsTopSauce: false, savoryGarnish: false, support: [7, 9], accent: [1, 1], heroShare: 0.62, poolShare: 0 },
  // A plated dessert: the hero cut and caramelised, a quenelle, a crumb, a smear of a chosen sauce.
  { id: 'plated-dessert', courses: ['dessert'], ware: 'plate', wildWare: 'slate', packing: 'cluster', wantsUnderPool: true, wantsTopSauce: false, savoryGarnish: false, support: [3, 5], accent: [3, 5], heroShare: 0.5, poolShare: 0.5 },
  // Pancakes: the stack is the platform, the hero on top with whipped cream.
  { id: 'pancake-stack', courses: ['dessert', 'snack'], ware: 'plate', wildWare: 'bowl', packing: 'platform', wantsUnderPool: false, wantsTopSauce: true, savoryGarnish: false, support: [5, 7], accent: [1, 3], heroShare: 0.6, poolShare: 0 },
  // A crudo or tartare: the hero cut small or thin, packed as one mound, oil dots and microherbs.
  { id: 'tartare-crudo', courses: ['starter'], ware: 'plate', wildWare: 'slate', packing: 'cluster', wantsUnderPool: true, wantsTopSauce: false, savoryGarnish: false, support: [3, 5], accent: [3, 5], heroShare: 0.5, poolShare: 0.55 },
  // A composed small plate: the hero cut properly, a smear, oil dots, microherbs, a crisp element.
  { id: 'composed-plate', courses: ['starter'], ware: 'plate', wildWare: 'slate', packing: 'cluster', wantsUnderPool: true, wantsTopSauce: false, savoryGarnish: true, support: [3, 5], accent: [3, 5], heroShare: 0.55, poolShare: 0.55 },
];

export function layoutById(id: LayoutId | undefined): LayoutSpec | undefined {
  return id ? LAYOUTS.find((l) => l.id === id) : undefined;
}
