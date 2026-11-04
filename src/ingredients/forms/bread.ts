import { BufferAttribute, Vector2, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';

/**
 * Bread. Board 08: "Round loaf, a slice lying flat, a baguette with two cut slices. Variants
 * pick their own archetype: loaf round, slice block, baguette long."
 *
 * Registered as the ingredient "baguette" (the user, 2026-11-04). Two forms are built here:
 *   - `whole` / `baguette` (on stage): the long loaf, see buildLongLoaf below,
 *   - `loaf`: the round boule, kept for later (buildBoule).
 * The slice comes with the cut forms; a white sandwich loaf comes later as "toast".
 *
 * The round loaf (boule). What makes it a loaf of bread, not a bun, a mushroom cap or a stone:
 *   - a broad base that bulges a little as it settled, and a high, round dome: wider than
 *     tall, a touch oval, never a flat cushion or a wheel of cheese,
 *   - a cross scored into the top: two long cuts, each a soft groove with a raised lip on
 *     both sides where the crust opened in the oven.
 * The crust's crackle and flour dust are the shader's job (skin: crust), never geometry.
 */

/** Real size (cm): about 21 wide, 19 deep and 12.5 tall. */
const WIDTH = 21;
const DEPTH = 19;
const HEIGHT = 12.5;
/** The base bulges out a little (a settled loaf); the top is a high, round dome (never a flat cushion). */
const BASE_FULLNESS = 2.5;
const DOME_FULLNESS = 1.75;
/** The score: how long each cut is, how deep, and how wide its groove (cm). Bold enough to read on a card. */
const CUT_LENGTH = 13;
const CUT_DEPTH = 1.3;
const CUT_WIDTH = 0.7;

/**
 * The round loaf (boule), kept for later (the user, 2026-11-04: "keep this shape for future
 * use"). It is the bread's `loaf` form; the default on stage is the long loaf below.
 */
export const buildBoule: FormBuilder = ({ seed }) => {

  const random = seededRandom(seed);
  const radius = WIDTH / 2;
  // A little extra height, because the flat base takes some away.
  const half = HEIGHT / 2 + 0.35;

  // The profile, standing up: lathe x runs from the base (negative) to the top (positive).
  const profile = (x: number) => {
    const t = Math.min(1, Math.abs(x) / half);
    const fullness = x < 0 ? BASE_FULLNESS : DOME_FULLNESS;
    return radius * (1 - t ** fullness) ** (1 / fullness);
  };

  const loaf = roundBody({
    halfLength: half,
    radius: profile,
    lying: false,
    lopsided: 0.35,
    random,
    flatBase: 0.6,
    rings: 54,
    segments: 76,
    // A touch oval: narrower front to back (the lathe's sin side becomes depth, z).
    crossSection: (_u, angle) => 1 - (1 - DEPTH / WIDTH) * Math.sin(angle) ** 2,
  });

  // The score: two long cuts crossing near the top, each turned its own way, a little off centre.
  const first = random() * Math.PI;
  const cuts = [first, first + Math.PI / 2 + signed(random) * 0.15].map((angle) => ({
    centre: new Vector2(signed(random) * 0.6, signed(random) * 0.6),
    along: new Vector2(Math.cos(angle), Math.sin(angle)),
  }));

  const position = loaf.getAttribute('position') as BufferAttribute;
  const p = new Vector3();
  const flat = new Vector2();
  const outward = new Vector3();
  const middle = new Vector3(0, -half * 0.3, 0);
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    // Only the top of the dome is scored.
    const onTop = smoothstep(half * 0.25, half * 0.65, p.y);
    if (onTop <= 0) continue;
    // Where the two cuts cross, the deeper carve wins.
    let push = Infinity;
    for (const cut of cuts) {
      flat.set(p.x, p.z).sub(cut.centre);
      const along = flat.dot(cut.along);
      const across = flat.x * -cut.along.y + flat.y * cut.along.x;
      // Full depth along most of the cut, fading out softly at each end.
      const ends = smoothstep(CUT_LENGTH / 2, CUT_LENGTH / 2 - 2.5, Math.abs(along));
      // A soft groove, with a raised lip on each side where the crust opened.
      const groove = Math.exp(-((across / CUT_WIDTH) ** 2));
      const lip = Math.exp(-(((Math.abs(across) - CUT_WIDTH * 2.0) / (CUT_WIDTH * 0.9)) ** 2));
      push = Math.min(push, (lip * CUT_DEPTH * 0.5 - groove * CUT_DEPTH) * ends);
    }
    outward.copy(p).sub(middle).normalize();
    p.addScaledVector(outward, push * onTop);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  position.needsUpdate = true;

  return finishPieces([{ role: 'crust', geometry: loaf }]);
};

/**
 * The long loaf (the user's references: a baguette or batard). What makes it read:
 *   - long and softly oval in section, a little wider than tall, settled on a flatter base,
 *     with round ends and a slight, seeded bend (never a perfect tube),
 *   - four slashes along the top, each set at an angle across the loaf, a soft groove with
 *     raised lips,
 *   - and in every slash, pale crumb showing where the crust opened (its own piece, `crumb`,
 *     painted in pale cream, so the colour difference is real and calm).
 * Crust colour, pores and flour dust are the shader's job (skin: crust).
 */
const LONG = { length: 32, width: 9, height: 7.4 };
const SLASHES = 4;
// Long almonds running mostly along the loaf (the references), overlapping in a row.
const SLASH = { length: 8.5, depth: 0.95, width: 0.85, angle: 0.36 };

export const buildLongLoaf: FormBuilder = ({ seed }) => {
  const random = seededRandom(seed);
  const half = LONG.length / 2;
  const radius = LONG.width / 2;
  // Lower (y) than wide (z): the section is a soft oval, flatter where it sits.
  const squash = LONG.height / LONG.width;

  // Long body with rounded ends: full width along most of its length.
  const profile = (x: number) => {
    const t = Math.min(1, Math.abs(x) / half);
    return radius * (1 - t ** 3) ** (1 / 3);
  };

  const crust = roundBody({
    halfLength: half,
    radius: profile,
    lying: true,
    lopsided: 0.4,
    random,
    flatBase: 0.5,
    rings: 68,
    segments: 46,
    // The lathe's cos side becomes height (y): squash it into a soft oval.
    crossSection: (_u, angle) => 1 - (1 - squash) * Math.cos(angle) ** 2,
  });

  // The slashes: spread along the top, each at an angle across the loaf.
  const slashes: { centre: Vector2; along: Vector2 }[] = [];
  const spacing = (LONG.length * 0.66) / SLASHES;
  for (let k = 0; k < SLASHES; k++) {
    const x = (k - (SLASHES - 1) / 2) * spacing + signed(random) * 0.4;
    const angle = SLASH.angle + signed(random) * 0.08;
    slashes.push({ centre: new Vector2(x, signed(random) * 0.3), along: new Vector2(Math.cos(angle), Math.sin(angle)) });
  }

  // Top of the crust (its height at x, z), for placing the crumb in each slash.
  const top = (x: number, z: number) => {
    const r = profile(x);
    const across = Math.min(1, Math.abs(z) / r);
    return r * squash * Math.sqrt(1 - across * across);
  };

  const position = crust.getAttribute('position') as BufferAttribute;
  const p = new Vector3();
  const flat = new Vector2();
  const outward = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    // Only the top is slashed.
    const onTop = smoothstep(radius * squash * 0.35, radius * squash * 0.75, p.y);
    if (onTop <= 0) continue;
    let push = Infinity;
    for (const slash of slashes) {
      flat.set(p.x, p.z).sub(slash.centre);
      const along = flat.dot(slash.along);
      const across = flat.x * -slash.along.y + flat.y * slash.along.x;
      // A long almond: widest in the middle of the slash, closing at both ends.
      const ends = smoothstep(SLASH.length / 2, SLASH.length / 2 - 2.2, Math.abs(along));
      const groove = Math.exp(-((across / SLASH.width) ** 2));
      const lip = Math.exp(-(((Math.abs(across) - SLASH.width * 2) / (SLASH.width * 0.9)) ** 2));
      push = Math.min(push, (lip * SLASH.depth * 0.45 - groove * SLASH.depth) * ends);
    }
    // Push along the section's outward direction (round the loaf's long axis).
    outward.set(0, p.y, p.z).normalize();
    p.addScaledVector(outward, push * onTop);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  position.needsUpdate = true;

  // The crumb in each slash: a pale almond, sunk into the groove and bent to the loaf's curve.
  const crumbs = slashes.map((slash) => {
    const piece = roundBody({
      halfLength: SLASH.length / 2 - 0.4,
      radius: (x) => {
        const t = Math.min(1, Math.abs(x) / (SLASH.length / 2 - 0.4));
        return SLASH.width * 1.35 * (1 - t * t) ** 0.6;
      },
      lying: true,
      lopsided: 0.3,
      random,
      flatBase: 0,
      rings: 20,
      segments: 16,
      // Flat, like a lens.
      crossSection: (_u, angle) => 1 - 0.6 * Math.cos(angle) ** 2,
    });
    piece.rotateY(-Math.atan2(slash.along.y, slash.along.x));
    const cp = piece.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i) + slash.centre.x;
      const z = cp.getZ(i) + slash.centre.y;
      // Sit just under the lips, following the top's curve along the slash.
      cp.setXYZ(i, x, cp.getY(i) + top(x, z) - SLASH.depth * 0.55, z);
    }
    cp.needsUpdate = true;
    return piece;
  });
  const crumb = mergeGeometries(crumbs)!;
  for (const piece of crumbs) piece.dispose();

  return finishPieces([
    { role: 'crust', geometry: crust },
    { role: 'crumb', geometry: crumb },
  ]);
};

/** Bread: the long loaf by default (`whole`, `baguette`), or the round loaf (`loaf`). */
export const buildBread: FormBuilder = (options) => {
  if (options.state === 'whole' || options.state === 'baguette') return buildLongLoaf(options);
  if (options.state === 'loaf') return buildBoule(options);
  throw new Error(`Bread: the "${options.state}" form is not built yet.`);
};
