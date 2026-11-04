import type { BufferAttribute, BufferGeometry } from 'three';
import { latheGeometry, smoothMax } from './lathe';
import { signed } from './random';

/**
 * Kit recipe for the **round** archetype (apple, orange, lemon, tomato, onion).
 *
 * Board 07: "Lathe a profile curve: squash to proportion, a soft dimple at each
 * pole, a little lopsided so it is never a perfect sphere."
 *
 * The ingredient's form file only describes its profile (the outline you
 * would draw for a revolve). This recipe does the rest, the same way for
 * every round ingredient:
 *   - spins the profile with the lathe (smooth, closed, no seam),
 *   - adds seeded lopsidedness: one end a touch fuller, a slightly oval
 *     cross-section, a gentle bend, a few very soft lumps,
 *   - presses a soft dimple into each pole if asked (apple, orange),
 *   - stands it upright or lays it on its side,
 *   - flattens a small patch underneath so it sits, rather than balances.
 *
 * All sizes are in centimetres. Fine surface texture (pebbled peel, pores)
 * is never built here: it belongs to the shader.
 */
export interface RoundOptions {
  /** Half the length along the lathe axis, in centimetres. */
  halfLength: number;
  /** The profile: radius (cm) at a point `x` along the axis. Reaches 0 at both ends. */
  radius: (x: number) => number;
  /** True: the axis lies flat along X (a lemon on its side). False: it stands up along Y (an orange). */
  lying: boolean;
  /** 0 = a perfect lathe, 1 = clearly hand-grown. Around 0.3 to 0.6 reads natural. */
  lopsided: number;
  /** Seeded dice from the ingredient id. */
  random: () => number;
  /**
   * Optional soft pits at the poles (cm deep, cm wide). `ends` picks which:
   * both (an orange), or only the end pole (a strawberry's calyx end, not its tip).
   */
  poleDimple?: { depth: number; width: number; ends?: 'both' | 'end' };
  /** How much (cm) of the underside is gently flattened where it rests. */
  flatBase: number;
  /**
   * Optional extra character for the cross-section: a radius multiplier for
   * each point (`u` from -1 to 1 along the axis, `angle` round it). A
   * strawberry uses it for its uneven, slightly lobed sides.
   */
  crossSection?: (u: number, angle: number) => number;
  /** Mesh density: rings along the axis and points around it. */
  rings: number;
  segments: number;
}

export function roundBody(options: RoundOptions): BufferGeometry {
  const { halfLength: h, lopsided: l, random } = options;

  // Roll the dice once, so every point agrees on the same lopsidedness.
  const fullerEnd = signed(random) * 0.06 * l;
  const ovalTurn = random() * Math.PI;
  const oval = 0.04 * l;
  const lumpTurn = random() * Math.PI * 2;
  const lumps = 0.018 * l;
  const bendUp = signed(random) * 0.05 * l * h;
  const bendSide = signed(random) * 0.05 * l * h;

  const geometry = latheGeometry({
    halfLength: h,
    radius: options.radius,
    rings: options.rings,
    segments: options.segments,
    shape: (p, u, angle) => {
      // Scale the cross-section: a fuller end, an oval, and soft lumps that fade at the poles.
      const along = 1 - u * u;
      const scale =
        1 +
        fullerEnd * u +
        oval * Math.cos(2 * (angle - ovalTurn)) +
        lumps * along * Math.sin(3 * angle + lumpTurn + 2.5 * u) +
        (options.crossSection ? options.crossSection(u, angle) - 1 : 0);
      p.y *= scale;
      p.z *= scale;
      // A gentle bend of the whole axis, so the poles are not perfectly in line.
      const bend = u * u - 1 / 3;
      p.y += bendUp * bend;
      p.z += bendSide * bend;
      // Pole dimples: pull the points around each pole in toward the middle.
      if (options.poleDimple && (options.poleDimple.ends !== 'end' || u > 0)) {
        const r = Math.hypot(p.y, p.z);
        const pit = options.poleDimple.depth * Math.exp(-((r / options.poleDimple.width) ** 2));
        p.x -= Math.sign(u) * pit;
      }
    },
  });

  // Stand it up: the lathe axis (X) becomes the up axis (Y).
  if (!options.lying) geometry.rotateZ(Math.PI / 2);

  if (options.flatBase > 0) flattenBase(geometry, options.flatBase);
  return geometry;
}

/**
 * Press the lowest part of a form gently flat, like a fruit settling on the
 * table under its own weight. A smooth maximum keeps the flat patch blending
 * softly into the curve, with no crease.
 */
export function flattenBase(geometry: BufferGeometry, amount: number): void {
  const position = geometry.getAttribute('position') as BufferAttribute;
  let minY = Infinity;
  for (let i = 0; i < position.count; i++) minY = Math.min(minY, position.getY(i));
  const floor = minY + amount;
  for (let i = 0; i < position.count; i++) {
    position.setY(i, smoothMax(position.getY(i), floor, amount * 1.5));
  }
  position.needsUpdate = true;
}
