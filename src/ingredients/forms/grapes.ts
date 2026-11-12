import { BufferAttribute, CatmullRomCurve3, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';
import { sweepGeometry } from './kit/sweep';

/**
 * Red grapes (archetype: small, a bunch). Round 2's fourth ingredient (docs/ingredients/r2-plan.md),
 * after the user's reference (Figma node 148:27, red globe grapes on a golden stem).
 *
 * What makes it a bunch of grapes, not a pile of plums or cherries:
 *   - many oval berries, each a little its own size, hanging on short stalks from a branching,
 *     woody stem, and lying the way a real bunch lies on a table: settled on its side, berries
 *     resting on the table and on each other, never sinking in,
 *   - each stalk ends in a small flared cap where it holds its berry,
 *   - the stem's top end (where the bunch was cut from the vine) curls up off the table.
 *
 * How it is built, like settling props in a scene by hand:
 *   1. A main stem (the rachis) runs along the bunch; side branches leave it at a few junctions.
 *   2. Each berry starts on a stalk from its junction, pointing outward.
 *   3. A short "drop and nudge apart" pass: gravity pulls every berry down, the table stops it,
 *      berries push each other (and the stem) apart, and each stays within reach of its stalk.
 *      The push uses each oval's true outline in that direction, so they only ever touch.
 *   4. The stalks, side branches and main stem are drawn as tubes to where the berries ended up.
 *
 * Pieces, like layers in a pre-comp:
 *   berry_glow  every berry, merged into one piece. Its map (uv) tells the shader, the `grape`
 *               skin, each berry's own mix (x, one value per berry) and how far along the berry a
 *               point is (y, 0 at the stalk, 1 at the far end): mottled wine and coral, a waxy
 *               bloom, the pale spot at the stalk, the glow of thin skin.
 *   stem        the woody stem, side branches and stalks with their caps (the `vine` family).
 */

/** Berry size (cm): half the length and half the width, before each berry's own variation. */
const BERRY = { half: 1.3, radius: 1.02 };
/** The junctions along the main stem, from the bunch's tip (0) to its top (1). */
const JUNCTIONS = 8;
/** How long the main stem runs along the bunch (cm), and how high it lies off the table. */
const RACHIS = { length: 9, height: 3.4 };
/** Stems' thickness (cm): slim and woody (thicker read as a tube, the user, 2026-11-12). */
const STEM = { rachis: 0.12, lateral: 0.075, stalk: 0.05, cap: 0.15 };
/** Iterations of the settle pass. */
const SETTLE = 420;

interface Berry {
  centre: Vector3;
  /** The berry's long axis, from its stalk end toward its far end. */
  axis: Vector3;
  half: number;
  radius: number;
  roll: number;
  junction: number;
  reach: number;
  tint: number;
}

/** How far an oval reaches from its centre in direction `n` (its support distance). */
function reach(b: Berry, n: Vector3): number {
  const along = n.dot(b.axis);
  return Math.sqrt(b.half * b.half * along * along + b.radius * b.radius * Math.max(0, 1 - along * along));
}

export const buildGrapes: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Grapes: the "${state}" form is not built yet (whole only for now).`);
  const random = seededRandom(seed ^ 0x67a9e5);

  // 1. The main stem: from the bunch's tip (-x) to its top (+x), lying a little lower at the tip,
  //    where the bunch is narrower, with a gentle sideways wander.
  const wander = signed(random) * 0.6;
  const rachisAt = (s: number) =>
    new Vector3(
      (s - 0.5) * RACHIS.length,
      RACHIS.height * (0.62 + 0.38 * s),
      wander * Math.sin(s * Math.PI) + 0.25 * Math.sin(s * 7 + seed),
    );

  // The junctions: side branches leave the main stem in turn round it (never straight down
  // into the table), longer toward the top of the bunch, where it is fullest.
  const junctions: { at: Vector3; from: Vector3; out: Vector3 }[] = [];
  let turn = random() * Math.PI * 2;
  for (let j = 0; j < JUNCTIONS; j++) {
    const s = 0.04 + (0.9 * j) / (JUNCTIONS - 1) + signed(random) * 0.03;
    const from = rachisAt(s);
    turn += 2.2 + signed(random) * 0.5;
    // Round the stem, but keep away from pointing straight down (the table is there).
    const up = Math.cos(turn);
    const out = new Vector3(0.25 * signed(random), Math.max(-0.3, up), Math.sin(turn)).normalize();
    const length = 0.35 + 0.9 * s;
    junctions.push({ at: from.clone().addScaledVector(out, length), from, out });
  }

  // 2. The berries: two to four per junction (more toward the top), each on its stalk.
  const berries: Berry[] = [];
  junctions.forEach((junction, j) => {
    const count = j < 2 ? 2 : j < 5 ? 3 : 4;
    for (let k = 0; k < count; k++) {
      const half = BERRY.half * (1 + signed(random) * 0.08);
      const radius = BERRY.radius * (1 + signed(random) * 0.07);
      const axis = junction.out
        .clone()
        .add(new Vector3(signed(random) * 0.9, signed(random) * 0.6, signed(random) * 0.9))
        .normalize();
      const stalk = 0.45 + random() * 0.35;
      berries.push({
        centre: junction.at.clone().addScaledVector(axis, stalk + half),
        axis,
        half,
        radius,
        roll: random() * Math.PI * 2,
        junction: j,
        reach: stalk,
        // Mostly deep wine berries with some rosy coral ones among them, like the reference.
        tint: random() < 0.35 ? random() * 0.4 : 0.55 + random() * 0.45,
      });
    }
  });

  // The stem as a row of balls the berries must keep clear of (the main stem and side branches).
  const stemBalls: { at: Vector3; r: number }[] = [];
  for (let i = 0; i <= 24; i++) stemBalls.push({ at: rachisAt(i / 24), r: STEM.rachis + 0.05 });
  for (const junction of junctions) {
    for (let i = 1; i <= 4; i++) stemBalls.push({ at: junction.from.clone().lerp(junction.at, i / 4), r: STEM.lateral + 0.04 });
  }

  // 3. Settle: gravity, the table, each berry within reach of its stalk, pushed apart from the
  //    others and from the stem. The last rounds have no gravity, only the pushing apart.
  const gap = 0.02;
  const n = new Vector3();
  const pole = new Vector3();
  for (let round = 0; round < SETTLE; round++) {
    const falling = round < SETTLE - 80;
    for (const b of berries) {
      const junction = junctions[b.junction];
      // A light pull: the bunch slumps a little, but its stalks hold it in a mound.
      if (falling) b.centre.y -= 0.012;
      // Within reach of its stalk: the stalk end (the berry's pole) stays near its junction.
      pole.copy(b.centre).addScaledVector(b.axis, -b.half);
      const toPole = pole.clone().sub(junction.at);
      const length = toPole.length();
      if (length > b.reach + 0.08) b.centre.addScaledVector(toPole, -(length - b.reach - 0.08) / length);
      // It hangs from its stalk: its long axis points away from the junction.
      b.axis.copy(b.centre).sub(junction.at).normalize();
      // The table.
      const low = reach(b, n.set(0, 1, 0));
      if (b.centre.y < low) b.centre.y = low;
    }
    for (let i = 0; i < berries.length; i++) {
      const a = berries[i];
      for (let j = i + 1; j < berries.length; j++) {
        const b = berries[j];
        n.copy(b.centre).sub(a.centre);
        const distance = n.length();
        if (distance < 1e-6) n.set(0, 1, 0);
        else n.divideScalar(distance);
        const need = reach(a, n) + reach(b, n) + gap;
        if (distance < need) {
          const push = (need - distance) / 2;
          a.centre.addScaledVector(n, -push);
          b.centre.addScaledVector(n, push);
        }
      }
      for (const ball of stemBalls) {
        n.copy(a.centre).sub(ball.at);
        const distance = n.length();
        if (distance < 1e-6) continue;
        n.divideScalar(distance);
        const need = reach(a, n) + ball.r;
        if (distance < need) a.centre.addScaledVector(n, need - distance);
      }
      const low = reach(a, n.set(0, 1, 0));
      if (a.centre.y < low) a.centre.y = low;
    }
  }

  // 4a. The berries as ovals: a little fuller toward the far end, a small soft dimple at the
  //     stalk, each its own size and roll. Merged into one piece.
  const xAxis = new Vector3(1, 0, 0);
  const berryGeometries: BufferGeometry[] = berries.map((b) => {
    const body = roundBody({
      halfLength: b.half,
      radius: (x) => {
        const t = x / b.half;
        if (Math.abs(t) >= 1) return 0;
        return b.radius * Math.sqrt(1 - t * t) * (1 + 0.05 * t);
      },
      lying: true,
      lopsided: 0.35,
      random,
      poleDimple: { depth: 0.05, width: 0.25, ends: 'start' },
      flatBase: 0,
      rings: 16,
      segments: 18,
    });
    // The map: x this berry's own mix, y how far along it (0 at the stalk, 1 at the far end).
    const position = body.getAttribute('position');
    const uv = new Float32Array(position.count * 2);
    for (let i = 0; i < position.count; i++) {
      uv[2 * i] = b.tint;
      uv[2 * i + 1] = Math.min(1, Math.max(0, (position.getX(i) + b.half) / (2 * b.half)));
    }
    body.setAttribute('uv', new BufferAttribute(uv, 2));
    const turnTo = new Quaternion().setFromUnitVectors(xAxis, b.axis);
    const roll = new Quaternion().setFromAxisAngle(xAxis, b.roll);
    body.applyMatrix4(new Matrix4().compose(b.centre, turnTo.multiply(roll), new Vector3(1, 1, 1)));
    return body;
  });
  const bunch = mergeGeometries(berryGeometries)!;

  // 4b. The stem: the main stem, running on past the top of the bunch and curling up off the
  //     table where it was cut from the vine; the side branches; each berry's stalk, bending
  //     toward its berry and flaring into a small cap that holds it.
  const curl = signed(random) * 0.5;
  const top = rachisAt(1);
  const rachisPoints = [
    ...Array.from({ length: 9 }, (_, i) => rachisAt(i / 8)),
    top.clone().add(new Vector3(1.1, 0.35, curl * 0.3)),
    top.clone().add(new Vector3(2.0, 1.2, curl * 0.7)),
    top.clone().add(new Vector3(2.4, 2.4, curl)),
    top.clone().add(new Vector3(2.2, 3.3, curl * 1.2)),
  ];
  const stems: BufferGeometry[] = [
    sweepGeometry({
      points: new CatmullRomCurve3(rachisPoints).getSpacedPoints(40),
      // Thin at the bunch's tip, thicker at the top, a little thinner again where it was cut.
      radius: (t) => STEM.rachis * (0.55 + 0.6 * smoothstep(0, 0.7, t) - 0.15 * smoothstep(0.85, 1, t)),
      rings: 40,
      segments: 8,
      // A little knobbly, like a woody stem.
      around: (t, a) => 1 + 0.08 * Math.sin(a * 3 + t * 40),
    }),
  ];
  for (const junction of junctions) {
    stems.push(
      sweepGeometry({
        points: [junction.from.clone(), junction.from.clone().lerp(junction.at, 0.55).addScaledVector(junction.out, 0.08), junction.at.clone()],
        radius: (t) => STEM.lateral * (1 - 0.3 * t),
        rings: 6,
        segments: 6,
      }),
    );
  }
  for (const b of berries) {
    const junction = junctions[b.junction].at;
    // The cap sits just inside the berry's stalk end, so the two always meet.
    const end = b.centre.clone().addScaledVector(b.axis, -b.half + 0.08);
    const bend = junction.clone().lerp(end, 0.5).addScaledVector(b.axis, -0.12);
    stems.push(
      sweepGeometry({
        points: new CatmullRomCurve3([junction.clone(), bend, end.clone().addScaledVector(b.axis, -0.18), end]).getSpacedPoints(8),
        radius: (t) => STEM.stalk + (STEM.cap - STEM.stalk) * smoothstep(0.72, 1, t) ** 1.5,
        rings: 9,
        segments: 6,
      }),
    );
  }
  // No map on the stem (a piece with a map would get the leaf skin).
  for (const g of stems) g.deleteAttribute('uv');
  const stem = mergeGeometries(stems)!;

  return finishPieces([
    { role: 'berry_glow', geometry: bunch },
    { role: 'stem', geometry: stem },
  ]);
};
