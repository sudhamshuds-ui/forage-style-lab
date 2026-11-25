import { BufferAttribute, BufferGeometry, LatheGeometry, TorusGeometry, Vector2 } from 'three';
import type { FormPiece } from '../../ingredients/forms/kit/piece';
import { withFrame } from './cut';

/**
 * Glassware for the Kitchen's drinks (item 12): five glasses turned on a lathe, each picked by the
 * drink. Like a glass in a painting:
 * - the shell is see-through (`seeThrough`: painted at low opacity over what is behind it, the drink
 *   drawn first, so the drink shows through the glass),
 * - a thin rim line in the glass's own tint, never a solid white band,
 * - a few painted highlight streaks down the lit side,
 * - the drink is its own lathe inside the glass, its top a meniscus that climbs the wall a little.
 *
 * Everything in centimetres, standing on y = 0, centred on `at`.
 */
export type GlassKind = 'highball' | 'rocks' | 'coupe' | 'wine' | 'nick-and-nora';

interface GlassShape {
  /** The outside of the glass from its foot to its rim: [radius, height] pairs, bottom first. */
  outer: [number, number][];
  /** Where the inside starts (the top of the base or the bottom of the bowl, cm). */
  floor: number;
  /** Wall thickness (cm). */
  wall: number;
  /** How full (a share of the inside's height). */
  fill: number;
}

/** A stemmed glass: a foot, a stem, then a bowl with this profile ([radius, height above the stem]). */
function stemmed(foot: number, stem: number, bowl: [number, number][]): [number, number][] {
  return [[foot, 0], [foot * 0.96, 0.22], [0.42, 0.42], [0.3, 1], [0.3, stem], ...bowl.map(([r, y]) => [r, stem + y] as [number, number])];
}

const SHAPES: Record<GlassKind, GlassShape> = {
  // Tall and straight, a touch wider at the rim: juices, lemonade, milkshakes.
  highball: { outer: [[2.75, 0], [2.85, 0.4], [2.95, 6], [3.1, 13.5]], floor: 1.1, wall: 0.18, fill: 0.78 },
  // Short and wide, a heavy base: tomato juice, green juices, a consommé.
  rocks: { outer: [[3.9, 0], [4.0, 0.5], [4.05, 4], [4.15, 8.5]], floor: 1.3, wall: 0.2, fill: 0.72 },
  // A wide shallow bowl on a stem.
  coupe: { outer: stemmed(3.6, 7.5, [[0.5, 0], [2.6, 0.6], [4.2, 1.8], [5.0, 3.3], [5.2, 4.2]]), floor: 8.1, wall: 0.14, fill: 0.7 },
  // A tulip bowl on a tall stem.
  wine: { outer: stemmed(3.8, 8, [[0.5, 0], [2.6, 0.9], [3.8, 2.8], [4.1, 5], [3.7, 8]]), floor: 8.7, wall: 0.14, fill: 0.45 },
  // A small bell on a stem.
  'nick-and-nora': { outer: stemmed(3.1, 6.5, [[0.45, 0], [2.2, 0.7], [3.2, 2.4], [3.4, 4.2], [3.25, 5.6]]), floor: 7.1, wall: 0.13, fill: 0.68 },
};

/** The glass for each drink. */
export function glassFor(base: string): GlassKind {
  const drink = base.split(':')[1] ?? '';
  if (drink === 'grape') return 'wine';
  if (drink === 'apple') return 'coupe';
  if (['pear', 'lime'].includes(drink)) return 'nick-and-nora';
  if (['watermelon', 'spinach', 'green', 'avocado', 'pepper', 'consomme'].includes(drink)) return 'rocks';
  return 'highball';
}

/** Cold drinks take ice; milky and warm ones do not. */
export function takesIce(base: string, kind: GlassKind): boolean {
  const drink = base.split(':')[1] ?? '';
  return (kind === 'highball' || kind === 'rocks') && !['milk', 'horchata', 'consomme', 'avocado'].includes(drink);
}

/** The outside radius at a height (straight between the profile's points). */
function radiusAt(outer: [number, number][], y: number): number {
  for (let i = 1; i < outer.length; i++) {
    const [r0, y0] = outer[i - 1];
    const [r1, y1] = outer[i];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
  }
  return outer[outer.length - 1][0];
}

export interface Glass {
  pieces: FormPiece[];
  /** The rim's radius and height, and the drink's level and its radius there (cm). */
  rim: { r: number; y: number };
  level: { y: number; r: number };
  kind: GlassKind;
}

export function glass(kind: GlassKind, at: [number, number], random: () => number, ice: boolean): Glass {
  const s = SHAPES[kind];
  const outer = s.outer;
  const top = outer[outer.length - 1][1];
  const rimR = outer[outer.length - 1][0];
  const inner = (y: number) => Math.max(0.05, radiusAt(outer, y) - s.wall);
  const level = s.floor + (top - s.floor) * s.fill;

  // The shell: up the outside, over a rounded lip, down the inside to the floor.
  const shell: Vector2[] = [new Vector2(0.001, 0), ...outer.map(([r, y]) => new Vector2(r, y))];
  for (let i = 1; i < 5; i++) {
    const a = (Math.PI * i) / 5;
    shell.push(new Vector2(rimR - s.wall / 2 + (Math.cos(a) * s.wall) / 2, top + (Math.sin(a) * s.wall) / 2));
  }
  const steps = 18;
  for (let i = steps; i >= 0; i--) {
    const y = s.floor + ((top - s.floor) * i) / steps;
    shell.push(new Vector2(inner(y), y));
  }
  shell.push(new Vector2(0.001, s.floor));

  // The drink: the inside up to its level, a meniscus that climbs the wall, a soft dip to the middle.
  const r0 = inner(level);
  const drinkProfile: Vector2[] = [new Vector2(0.001, s.floor + 0.02)];
  for (let i = 0; i <= 12; i++) {
    const y = s.floor + 0.02 + ((level - s.floor - 0.02) * i) / 12;
    drinkProfile.push(new Vector2(inner(y) - 0.03, y));
  }
  drinkProfile.push(new Vector2(r0 - 0.03, level + 0.12), new Vector2(r0 * 0.9, level + 0.02), new Vector2(r0 * 0.5, level), new Vector2(0.001, level));

  const lathe = (points: Vector2[]) => {
    const g = new LatheGeometry(points, 72);
    g.translate(at[0], 0, at[1]);
    return withFrame(g, false);
  };
  const pieces: FormPiece[] = [{ role: 'drink', geometry: lathe(drinkProfile) }];

  // A thin rim line in the glass's own tint (never a white band).
  const rimLine = new TorusGeometry(rimR - s.wall / 2, 0.045, 6, 96);
  rimLine.rotateX(Math.PI / 2);
  rimLine.translate(at[0], top + s.wall * 0.3, at[1]);
  pieces.push({ role: 'glassRim', geometry: withFrame(rimLine, false) });

  // Painted highlight streaks down the lit side (the key light is upper left): two or three slim
  // ribbons just proud of the outside, each its own length.
  const streaks = 2 + Math.floor(random() * 2);
  for (let k = 0; k < streaks; k++) {
    const angle = Math.PI * (0.78 + k * 0.09 + random() * 0.04);
    const y0 = (kind === 'highball' || kind === 'rocks' ? s.floor : s.floor + 0.6) + random() * 0.8;
    const y1 = top - 0.5 - random() * (top - y0) * 0.35;
    pieces.push({ role: 'glassGlint', geometry: streak(outer, angle, y0, y1, 0.09 + 0.05 * (k === 0 ? 1 : 0), at) });
  }

  // Ice: two or three rounded cubes in the drink, their tops just above it.
  if (ice) {
    const n = 2 + Math.floor(random() * 2);
    for (let k = 0; k < n; k++) {
      const size = Math.min(1.6, r0 * 0.55);
      const a = (k / n) * Math.PI * 2 + random();
      const d = (r0 - size * 0.75) * (0.35 + random() * 0.3);
      const cube = iceCube(size);
      cube.rotateY(random() * Math.PI);
      cube.rotateX((random() - 0.5) * 0.5);
      cube.translate(at[0] + Math.cos(a) * d, level - size * 0.3 - k * size * 0.45, at[1] + Math.sin(a) * d);
      pieces.push({ role: 'ice', geometry: withFrame(cube, false), seeThrough: 0.45 });
    }
  }
  // A stemmed glass's foot and stem as their own piece: see-through, but casting, so the shadow
  // starts at the glass's foot rather than floating off beside it.
  if (kind === 'coupe' || kind === 'wine' || kind === 'nick-and-nora') {
    const stemTop = s.floor - 0.5;
    const foot = outer.filter(([, y]) => y <= stemTop).map(([r, y]) => new Vector2(r, y));
    pieces.push({ role: 'glassFoot', geometry: lathe([new Vector2(0.001, 0), ...foot, new Vector2(0.001, stemTop)]), seeThrough: 0.2 });
  }
  // The shell last: drawn over the drink, see-through.
  pieces.push({ role: 'glass', geometry: lathe(shell), doubleSided: true, seeThrough: 0.2 });
  return { pieces, rim: { r: rimR, y: top + s.wall / 2 }, level: { y: level, r: r0 }, kind };
}

/** A slim ribbon on the glass's outside, from y0 to y1 at an angle round it. */
function streak(outer: [number, number][], angle: number, y0: number, y1: number, width: number, at: [number, number]): BufferGeometry {
  const rows = 16;
  const position: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = y0 + (y1 - y0) * t;
    const r = radiusAt(outer, y) + 0.025;
    // Tapered at both ends, like a brush lifting off.
    const w = (width * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.02))) / r;
    for (const side of [-1, 1]) {
      const a = angle + side * w * 0.5;
      position.push(at[0] + Math.cos(a) * r, y, at[1] + Math.sin(a) * r);
    }
    if (i < rows) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(position), 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return withFrame(g, false);
}

/** A softly rounded ice cube: a four-sided lathe, bulging a little at its middle. */
function iceCube(size: number): BufferGeometry {
  const h = size / 2;
  const g = new LatheGeometry([new Vector2(0.001, -h), new Vector2(size * 0.5, -h), new Vector2(size * 0.6, 0), new Vector2(size * 0.5, h), new Vector2(0.001, h)], 4);
  g.rotateY(Math.PI / 4);
  return g;
}
