/**
 * The plating plan: every dish is drawn first, from straight above, in simple shapes, then built
 * from the same numbers (the user's rule, 2026-11-19: "always make a 2d drawing of the dish, its
 * composition and plating first from top view...using basic forms/shapes.. and then recreate it
 * using the elements. use theory of symmetry, golden ratio, BMS, circular plating").
 *
 * Like a thumbnail sketch before the painting: a circle for a sauce pool, a rectangle for a
 * fillet, a half circle for a wedge, small circles for wheels and berries. Each shape is tagged big,
 * medium or small (BMS). `planSvg` draws it with the composition guides: the plate, its well, the
 * golden circle (the plate's radius over phi, where the eye rests) and the cross through the
 * middle, so balance and spacing can be checked before anything is built.
 *
 * Top view, in centimetres: x to the right, z toward the camera (down on the page).
 */
export type Size = 'big' | 'medium' | 'small' | 'ground';

interface ShapeBase {
  /** What it stands for (the role it becomes). */
  label: string;
  size: Size;
  /** Middle of the shape (cm). */
  at: [number, number];
  /** Turn in degrees, clockwise on the page. */
  angle?: number;
}

export type PlanShape =
  | (ShapeBase & { kind: 'circle'; r: number })
  | (ShapeBase & { kind: 'rect'; w: number; h: number; round?: number })
  /** A half circle: its flat side faces `angle` (0: up the page). */
  | (ShapeBase & { kind: 'half'; r: number });

export interface Plan {
  title: string;
  /** The plate's radius and its well's radius (cm). */
  plate: number;
  well: number;
  shapes: PlanShape[];
  /** The composition, in a few words (shown under the drawing). */
  notes: string[];
}

const PHI = (1 + Math.sqrt(5)) / 2;

const FILLS: Record<Size, string> = { ground: '#e9e6b8', big: '#d89a68', medium: '#d27a3c', small: '#3f7a44' };

/** The plan as an SVG drawing (a square page, the plate in the middle). */
export function planSvg(plan: Plan, fills: Partial<Record<string, string>> = {}): string {
  const pad = 2;
  const half = plan.plate + pad;
  const scale = 20;
  const size = half * 2 * scale;
  const p = (v: number) => ((v + half) * scale).toFixed(1);
  const n = (v: number) => (v * scale).toFixed(1);
  const parts: string[] = [];
  parts.push(`<rect width="${size}" height="${size + 40 + plan.notes.length * 22}" fill="#3f3f3f"/>`);
  parts.push(`<circle cx="${p(0)}" cy="${p(0)}" r="${n(plan.plate)}" fill="#dcdcdc"/>`);
  // Guides: the well, the golden circle and the cross.
  parts.push(`<circle cx="${p(0)}" cy="${p(0)}" r="${n(plan.well)}" fill="none" stroke="#bdbdbd" stroke-dasharray="6 6"/>`);
  parts.push(`<circle cx="${p(0)}" cy="${p(0)}" r="${n(plan.plate / PHI)}" fill="none" stroke="#9fb6d8" stroke-dasharray="3 5"/>`);
  parts.push(`<line x1="${p(-plan.plate)}" y1="${p(0)}" x2="${p(plan.plate)}" y2="${p(0)}" stroke="#c8c8c8"/>`);
  parts.push(`<line x1="${p(0)}" y1="${p(-plan.plate)}" x2="${p(0)}" y2="${p(plan.plate)}" stroke="#c8c8c8"/>`);
  const order: Size[] = ['ground', 'big', 'medium', 'small'];
  for (const s of [...plan.shapes].sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size))) {
    const fill = fills[s.label] ?? FILLS[s.size];
    const t = `translate(${p(s.at[0])} ${p(s.at[1])}) rotate(${s.angle ?? 0})`;
    if (s.kind === 'circle') parts.push(`<circle transform="${t}" r="${n(s.r)}" fill="${fill}" stroke="#ffffff55"/>`);
    if (s.kind === 'rect') parts.push(`<rect transform="${t}" x="${n(-s.w / 2)}" y="${n(-s.h / 2)}" width="${n(s.w)}" height="${n(s.h)}" rx="${n(s.round ?? 0.4)}" fill="${fill}" stroke="#ffffff55"/>`);
    // A half circle whose flat side faces up the page before turning.
    if (s.kind === 'half') parts.push(`<path transform="${t}" d="M ${n(-s.r)} 0 A ${n(s.r)} ${n(s.r)} 0 0 0 ${n(s.r)} 0 Z" fill="${fill}" stroke="#ffffff55"/>`);
  }
  parts.push(`<text x="16" y="${size + 26}" fill="#ffffff" font-family="Inter, sans-serif" font-size="18">${plan.title}</text>`);
  plan.notes.forEach((note, i) => parts.push(`<text x="16" y="${size + 50 + i * 22}" fill="#cfcfcf" font-family="Inter, sans-serif" font-size="14">${note}</text>`));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 40 + plan.notes.length * 22}">${parts.join('')}</svg>`;
}

/** True if every shape lies inside the plate's rim (a quick check before building). */
export function fitsPlate(plan: Plan, overhang = 0): boolean {
  return plan.shapes.every((s) => {
    const reach = s.kind === 'rect' ? Math.hypot(s.w, s.h) / 2 : s.r;
    return Math.hypot(s.at[0], s.at[1]) + reach <= plan.plate + overhang;
  });
}
