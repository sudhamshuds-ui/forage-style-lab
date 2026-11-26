import { BufferAttribute, BufferGeometry, LatheGeometry, SplineCurve, TorusGeometry, Vector2 } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
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
  // 21 cm tall (real-world-sizes.json: 20 to 24 cm), not a short tasting glass.
  wine: { outer: stemmed(3.8, 11, [[0.5, 0], [2.6, 1.0], [3.8, 3.3], [4.1, 6], [3.7, 10]]), floor: 11.8, wall: 0.14, fill: 0.45 },
  // A small bell on a stem.
  'nick-and-nora': { outer: stemmed(3.1, 6.5, [[0.45, 0], [2.2, 0.7], [3.2, 2.4], [3.4, 4.2], [3.25, 5.6]]), floor: 7.1, wall: 0.13, fill: 0.68 },
};

/**
 * The glass a world dish's looks note asks for, before the fruit mapping (R7: a tall, frothy
 * Limonada Suica came in a nick-and-nora): frothy, milky, blended or yogurt drinks are tall
 * highballs; a spritz or a bellini a wine glass. Undefined when the note does not say.
 */
export function glassFromNote(text: string): GlassKind | undefined {
  const t = text.toLowerCase();
  if (/\bhighball|\btall\b|froth|foam|lassi|yog|milk|smoothie|blended|shake|buttermilk|doogh|horchata/.test(t)) return 'highball';
  if (/\bspritz|bellini|sparkling wine|wine glass/.test(t)) return 'wine';
  if (/\bcoupe/.test(t)) return 'coupe';
  if (/\btumbler|\brocks\b|on the rocks/.test(t)) return 'rocks';
  return undefined;
}

/** The glass for each drink. */
export function glassFor(base: string, glass?: GlassKind): GlassKind {
  if (glass) return glass;
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

/** A glass's widest radius (for setting fruit down beside it, clear of its bowl). */
export function glassRadius(kind: GlassKind): number {
  return Math.max(...SHAPES[kind].outer.map(([r]) => r));
}

const STEMMED: GlassKind[] = ['coupe', 'wine', 'nick-and-nora'];

/**
 * The outside profile made smooth (Group 3: no facet lines): a stemmed glass's bowl through a
 * spline, a tumbler's straight wall cut into many short rows, so the light turns evenly.
 */
function smoothProfile(kind: GlassKind): { outer: [number, number][]; stem: number } {
  const raw = SHAPES[kind].outer;
  if (STEMMED.includes(kind)) {
    const bowlFrom = raw.findIndex(([r], i) => i > 3 && r >= 0.45);
    const stem = raw[bowlFrom][1];
    const curve = new SplineCurve(raw.slice(bowlFrom).map(([r, y]) => new Vector2(r, y)));
    const bowl = curve.getSpacedPoints(36).map((v) => [v.x, v.y] as [number, number]);
    return { outer: [...raw.slice(0, bowlFrom), ...bowl], stem };
  }
  const out: [number, number][] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const [r0, y0] = raw[i - 1];
    const [r1, y1] = raw[i];
    const n = Math.max(1, Math.round((y1 - y0) / 0.35));
    for (let k = 1; k <= n; k++) out.push([r0 + ((r1 - r0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  return { outer: out, stem: 0 };
}

/** A lathe turned with 128 segments, its seam welded and its normals shared (no seam line). */
function smoothLathe(points: Vector2[], at: [number, number]): BufferGeometry {
  const g = new LatheGeometry(points, 128);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const welded = mergeVertices(g, 1e-4);
  welded.computeVertexNormals();
  welded.translate(at[0], 0, at[1]);
  return withFrame(welded, false);
}

export function glass(kind: GlassKind, at: [number, number], random: () => number, ice: boolean): Glass {
  const s = SHAPES[kind];
  const { outer, stem } = smoothProfile(kind);
  const top = outer[outer.length - 1][1];
  const rimR = outer[outer.length - 1][0];
  const inner = (y: number) => Math.max(0.05, radiusAt(outer, y) - s.wall);
  const level = s.floor + (top - s.floor) * s.fill;

  // The shell: up the outside, over a rounded lip, down the inside to the floor. A stemmed glass's
  // shell is its bowl only; the stem and foot are their own piece, so the two never overlap (where
  // they did, the doubled glass showed as a grey pebble at the stem's foot).
  const stemmed = STEMMED.includes(kind);
  const shellOuter = stemmed ? outer.filter(([, y]) => y >= stem) : outer;
  const shell: Vector2[] = [new Vector2(0.001, stemmed ? stem : 0), ...shellOuter.map(([r, y]) => new Vector2(r, y))];
  for (let i = 1; i < 5; i++) {
    const a = (Math.PI * i) / 5;
    shell.push(new Vector2(rimR - s.wall / 2 + (Math.cos(a) * s.wall) / 2, top + (Math.sin(a) * s.wall) / 2));
  }
  const steps = 40;
  for (let i = steps; i >= 0; i--) {
    const y = s.floor + ((top - s.floor) * i) / steps;
    shell.push(new Vector2(inner(y), y));
  }
  shell.push(new Vector2(0.001, s.floor));

  // The drink: the inside up to its level, a meniscus that climbs the wall, a soft dip to the middle.
  const r0 = inner(level);
  const drinkProfile: Vector2[] = [new Vector2(0.001, s.floor + 0.02)];
  for (let i = 0; i <= 30; i++) {
    const y = s.floor + 0.02 + ((level - s.floor - 0.02) * i) / 30;
    drinkProfile.push(new Vector2(inner(y) - 0.03, y));
  }
  drinkProfile.push(new Vector2(r0 - 0.03, level + 0.12), new Vector2(r0 * 0.9, level + 0.02), new Vector2(r0 * 0.5, level), new Vector2(0.001, level));

  const lathe = (points: Vector2[]) => smoothLathe(points, at);
  // In a stemmed glass the drink casts no shadow of its own: the glass's foot and stem do, so the
  // shadow starts at the foot instead of a separate disc beside it (Group 3).
  const drink = lathe(drinkProfile);
  // A vertical gradient (R4: the liquid read flat): the map's y carries the height up the drink,
  // marked negative (-1 at the floor, -2 at the surface) so the sauce skin paints it deeper low
  // and lighter toward the top; x stays mid-pool, so no pale edge.
  const dpos = drink.getAttribute('position');
  const duv = new Float32Array(dpos.count * 2);
  for (let i = 0; i < dpos.count; i++) {
    duv[i * 2] = 0.45;
    duv[i * 2 + 1] = -1 - Math.min(1, Math.max(0, (dpos.getY(i) - s.floor) / Math.max(0.1, level - s.floor)));
  }
  drink.setAttribute('uv', new BufferAttribute(duv, 2));
  const pieces: FormPiece[] = [{ role: 'drink', geometry: drink, noShadow: STEMMED.includes(kind) || undefined }];

  // A thin rim line in the glass's own tint (never a white band).
  const rimLine = new TorusGeometry(rimR - s.wall / 2, 0.045, 8, 160);
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

  // (No etched band: on the painted glass it read as a pale stripe, R4.)

  // Ice: two small, clear cubes in the drink, their tops showing above it.
  if (ice) {
    // True-size cubes, 2.5 to 3 cm (real-world-sizes.json; smaller read as crushed ice): two in a wide
    // glass, one in a narrow one.
    const n = r0 >= 3.6 ? 2 : 1;
    const size = n === 2 ? Math.min(2.6, r0 * 0.65) : Math.min(2.6, r0 * 0.8);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + random() * 0.6;
      const d = n === 2 ? Math.max(0, r0 - size * 0.8) : (r0 - size * 0.7) * random() * 0.4;
      const cube = iceCube(size);
      cube.rotateY(random() * Math.PI);
      cube.rotateX((random() - 0.5) * 0.5);
      cube.translate(at[0] + Math.cos(a) * d, level - size * 0.15 - k * size * 0.2, at[1] + Math.sin(a) * d);
      pieces.push({ role: 'ice', geometry: withFrame(cube, false), seeThrough: 0.3 });
    }
  }
  // A stemmed glass's foot and stem as their own piece: see-through, but casting, so the shadow
  // starts at the glass's foot rather than floating off beside it.
  if (stemmed) {
    const foot = outer.filter(([, y]) => y <= stem).map(([r, y]) => new Vector2(r, y));
    pieces.push({ role: 'glassFoot', geometry: lathe([new Vector2(0.001, 0), ...foot, new Vector2(0.001, stem)]), seeThrough: 0.2 });
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
