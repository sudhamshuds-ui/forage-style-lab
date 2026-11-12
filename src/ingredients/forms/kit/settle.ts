import { Vector3 } from 'three';

/**
 * Settle many small pieces on the table: a "drop and nudge" pass, like arranging props by hand.
 * Each round, gravity pulls every piece down, the piece's own rule runs (a grape stays within
 * reach of its stalk; a blueberry is drawn toward the middle of its pile), the table stops it,
 * and pieces push each other (and any obstacles, such as a stem) apart. The last rounds have no
 * gravity, only the pushing apart, so everything ends just touching.
 *
 * Built for the grapes (2026-11-12) and shared with the blueberry pile.
 */

/** An oval piece: its centre, its long axis (unit length) and its half sizes along and across it. */
export interface Oval {
  centre: Vector3;
  axis: Vector3;
  /** Half its size along the axis (cm). */
  half: number;
  /** Half its size across the axis (cm). */
  radius: number;
}

/**
 * How far an oval reaches from its centre in direction `n` (unit): its support distance. Two
 * pieces whose centres are further apart along `n` than the sum of these never overlap (there is
 * a plane between them), so pushing to that distance makes them touch but never sink in.
 */
export function reach(b: Oval, n: Vector3): number {
  const along = n.dot(b.axis);
  return Math.sqrt(b.half * b.half * along * along + b.radius * b.radius * Math.max(0, 1 - along * along));
}

export interface SettleOptions<T extends Oval> {
  /** How many rounds in all. */
  rounds: number;
  /** How many of the last rounds have no gravity (only pushing apart). */
  calm: number;
  /** How far each piece falls per round (cm). */
  gravity: number;
  /** The gap left between touching pieces (cm). */
  gap: number;
  /** Balls the pieces must keep clear of (a stem). */
  obstacles?: { at: Vector3; r: number }[];
  /** Each piece's own rule, run after gravity and before the table (it may move or turn it). */
  step?: (piece: T, falling: boolean) => void;
}

export function settle<T extends Oval>(pieces: T[], options: SettleOptions<T>): void {
  const n = new Vector3();
  const up = new Vector3(0, 1, 0);
  const obstacles = options.obstacles ?? [];
  for (let round = 0; round < options.rounds; round++) {
    const falling = round < options.rounds - options.calm;
    for (const b of pieces) {
      if (falling) b.centre.y -= options.gravity;
      options.step?.(b, falling);
      const low = reach(b, up);
      if (b.centre.y < low) b.centre.y = low;
    }
    for (let i = 0; i < pieces.length; i++) {
      const a = pieces[i];
      for (let j = i + 1; j < pieces.length; j++) {
        const b = pieces[j];
        n.copy(b.centre).sub(a.centre);
        const distance = n.length();
        if (distance < 1e-6) n.set(0, 1, 0);
        else n.divideScalar(distance);
        const need = reach(a, n) + reach(b, n) + options.gap;
        if (distance < need) {
          const push = (need - distance) / 2;
          a.centre.addScaledVector(n, -push);
          b.centre.addScaledVector(n, push);
        }
      }
      for (const ball of obstacles) {
        n.copy(a.centre).sub(ball.at);
        const distance = n.length();
        if (distance < 1e-6) continue;
        n.divideScalar(distance);
        const need = reach(a, n) + ball.r;
        if (distance < need) a.centre.addScaledVector(n, need - distance);
      }
      const low = reach(a, up);
      if (a.centre.y < low) a.centre.y = low;
    }
  }
}
