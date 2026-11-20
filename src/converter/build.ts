import { BufferAttribute, Matrix4 } from 'three';
import { COOKED_PORTION, herb, limeWheel, peachWedge } from '../dishes/forms/salmonPeach';
import { salmonFillet } from '../ingredients/forms/salmon';
import { seededRandom } from '../ingredients/forms/kit/random';
import type { FormPiece } from '../ingredients/forms/kit/piece';
import { Table, plate, posed } from '../dishes/kit/place';
import { pool } from '../dishes/kit/pool';
import { ware } from '../dishes/kit/ware';
import { convexHull, measurePoints, WARES, type DishTrace, type Footprint, type Solved } from './trace';

/**
 * Step 3: the dish built from the painting's own numbers.
 *
 * Each traced piece becomes the real pantry form (the same cooked salmon, peach wedge and lime
 * wheel as the hand-built dish), then is fitted to its footprint like placing a layer onto a
 * guide: turned to the footprint's turn, sized to its length, moved to its middle, and set down on
 * the plate with the table's `rest` (so nothing floats or sinks into a neighbour). Ground pieces
 * (sauces, foams) are poured into their outline instead.
 *
 * Built in centimetres; `plate()` finishes it like any dish (scene units, foot on the table).
 */

/** The top view of pieces: a hull of their points, measured. */
export function topView(pieces: FormPiece[]) {
  const pts: [number, number][] = [];
  for (const p of pieces) {
    const pos = p.geometry.getAttribute('position') as BufferAttribute;
    const step = Math.max(1, Math.floor(pos.count / 2000));
    for (let i = 0; i < pos.count; i += step) pts.push([pos.getX(i), pos.getZ(i)]);
  }
  return measurePoints(convexHull(pts));
}

/**
 * Fit pieces to a footprint: turn their long side onto the footprint's, size them to it
 * ('stretch' sizes length and width separately, for the salmon; 'uniform' keeps the form's
 * proportions), move them over its middle. Height is left for `rest`.
 */
function fitTo(pieces: FormPiece[], target: Footprint, mode: 'stretch' | 'uniform', limits: [number, number] = [0.5, 2]): FormPiece[] {
  const built = topView(pieces);
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const clamp = (v: number) => Math.min(limits[1], Math.max(limits[0], v));
  const sl = clamp(target.length / Math.max(0.1, built.length));
  const sw = mode === 'stretch' ? clamp(target.width / Math.max(0.1, built.width)) : sl;
  const sy = mode === 'stretch' ? 1 : sl;
  // Turning by t takes t off the plan angle (plan angles run clockwise on the page).
  const m = new Matrix4()
    .makeTranslation(target.centre[0], 0, target.centre[1])
    .multiply(new Matrix4().makeRotationY(rad(90 - target.angle)))
    .multiply(new Matrix4().makeScale(sl, sy, sw))
    .multiply(new Matrix4().makeRotationY(rad(built.angle - 90)))
    .multiply(new Matrix4().makeTranslation(-built.centre[0], 0, -built.centre[1]));
  return posed(pieces, m);
}

/** A footprint's outline as a radius at each angle round its middle (for pouring a pool). */
function radialOutline(f: Footprint): (angle: number) => number {
  const [cx, cz] = f.centre;
  const samples = 72;
  const radii: number[] = [];
  for (let k = 0; k < samples; k++) {
    const a = (k / samples) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    let far = 0;
    // Where the ray from the middle leaves the outline (its furthest crossing).
    for (let i = 0; i < f.points.length; i++) {
      const [x0, z0] = f.points[i];
      const [x1, z1] = f.points[(i + 1) % f.points.length];
      const ex = x1 - x0, ez = z1 - z0;
      const den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x0 - cx) * ez - (z0 - cz) * ex) / den;
      const u = ((x0 - cx) * dz - (z0 - cz) * dx) / den;
      if (t > 0 && u >= 0 && u <= 1) far = Math.max(far, t);
    }
    radii.push(far);
  }
  // Softened a little (a sauce never has corners).
  const soft = radii.map((_, k) => (radii[(k + samples - 1) % samples] + 2 * radii[k] + radii[(k + 1) % samples]) / 4);
  return (angle) => {
    const t = ((((angle / (Math.PI * 2)) % 1) + 1) % 1) * samples;
    const i = Math.floor(t);
    const f2 = t - i;
    return soft[i % samples] * (1 - f2) + soft[(i + 1) % samples] * f2;
  };
}

/** Bubbles in a foam: small domes scattered inside its outline. */
function foamBubbles(random: () => number, outline: (a: number) => number, cx: number, cz: number) {
  const list = Array.from({ length: 90 }, () => {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * outline(a) * 0.9;
    return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, r: 0.14 + random() ** 2 * 0.36 };
  });
  return (x: number, z: number) => {
    let h = 0;
    for (const b of list) {
      const d = Math.hypot(x - b.x, z - b.z) / b.r;
      if (d < 1) h = Math.max(h, Math.sqrt(1 - d * d) * b.r * 0.7);
    }
    return h;
  };
}

/**
 * How far a round, flat piece (a lime wheel) is tipped up toward the painter, in radians: lying
 * flat, a circle looks as squashed as the camera is low (its short side over its long side is the
 * sine of the camera's angle); facing the painter it looks round.
 */
export function leanOf(f: Footprint, solved: Solved): number {
  const outline = f.piece.outline;
  const box = measurePoints(convexHull(outline));
  const ratio = Math.min(1, box.width / Math.max(1e-6, box.length));
  return Math.min(1.2, Math.max(0, Math.asin(ratio) - solved.fit.elev));
}

/** Build the dish the trace describes (the salmon dish's pieces for now: salmon, peach, lime, foam). */
export function buildFromTrace(trace: DishTrace, solved: Solved, seed = 0x5a1e): FormPiece[] {
  const random = seededRandom(seed);
  const dish = ware(WARES[trace.ware]);
  const table = new Table(dish.floor);
  const parts: FormPiece[] = [{ role: 'plate', geometry: dish.geometry }];
  const order = ['ground', 'big', 'medium', 'small'];
  const footprints = [...solved.footprints].sort((a, b) => order.indexOf(a.piece.size) - order.indexOf(b.piece.size));

  for (const f of footprints) {
    const label = f.piece.label;
    if (f.piece.size === 'ground') {
      // A sauce or foam: poured into its outline, lying on the plate.
      const outline = radialOutline(f);
      const geometry = pool({ outline, at: f.centre, depth: Math.max(0.2, f.piece.height * 0.8), floor: dish.floor, edge: 0.3, bumps: foamBubbles(random, outline, f.centre[0], f.centre[1]), rings: 32, segments: 120 });
      const piece = { role: label === 'foam' ? 'foam' : label, geometry };
      table.add([piece]);
      parts.push(piece);
      // Herbs flecked over a foam, like the painting.
      if (label === 'foam') {
        const count = Math.round(4 + f.length * f.width * 0.5);
        for (let k = 0; k < count; k++) {
          const a = random() * Math.PI * 2;
          const r = Math.sqrt(random()) * outline(a) * 0.8;
          const x = f.centre[0] + Math.cos(a) * r, z = f.centre[1] + Math.sin(a) * r;
          parts.push(herb(random, x, table.height(x, z) + 0.03, z));
        }
      }
      continue;
    }
    let pieces: FormPiece[];
    let mode: 'stretch' | 'uniform' = 'uniform';
    let restOptions = { tilt: 0.3, sink: 0.1 };
    if (label === 'salmon') {
      // The cooked portion at the measured size and height.
      pieces = [{ role: 'salmon_glow', geometry: salmonFillet(seed, { ...COOKED_PORTION, length: f.length, width: f.width, height: Math.max(1.5, f.piece.height) }) }];
      mode = 'stretch';
      restOptions = { tilt: 0.08, sink: 0.22 };
    } else if (label === 'peach') {
      pieces = posed(peachWedge(random, 0.75 + random() * 0.25), { scale: 0.62 });
      restOptions = { tilt: 0.3, sink: 0.12 };
    } else if (label === 'lime') {
      pieces = posed(limeWheel(random, 0.2), { turn: random() * 6, scale: 0.66 });
      restOptions = { tilt: 0.5, sink: 0.08 };
    } else {
      continue;
    }
    let fitted = fitTo(pieces, f, mode);
    if (label === 'lime') {
      // A wheel leaning up against its neighbours: how round its oval is in the painting tells how
      // far it faces the painter (flat on the plate it looks as squashed as the plate's rim).
      const tip = leanOf(f, solved);
      if (tip > 0.05) {
        const [cx, cz] = f.centre;
        const m = new Matrix4().makeTranslation(cx, 0, cz).multiply(new Matrix4().makeRotationX(tip)).multiply(new Matrix4().makeTranslation(-cx, 0, -cz));
        fitted = posed(fitted, m);
        restOptions = { tilt: 0.05, sink: 0.05 };
      }
    }
    // Lift it clear, then let it settle onto the plate and whatever is under it.
    const lifted = posed(fitted, { at: [0, 6, 0] });
    parts.push(...table.rest(lifted, restOptions));
  }
  return plate(parts);
}
