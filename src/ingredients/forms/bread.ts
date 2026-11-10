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
// Each slash gets its own length, width and angle round these (never four identical cuts).
const SLASH = { length: 7.6, depth: 0.95, width: 0.8, angle: 0.4 };

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
    // Fine enough that the slashes' raised lips, running across the mesh at an angle, come out
    // as smooth ridges (68 x 46 made them sawtooth, the user, 2026-11-09).
    rings: 130,
    segments: 80,
    // The lathe's cos side becomes height (y): squash it into a soft oval.
    crossSection: (_u, angle) => 1 - (1 - squash) * Math.cos(angle) ** 2,
  });

  // The slashes: spread along the top, each at an angle across the loaf.
  // Spread along most of the loaf with crust between them, each its own size and angle.
  const slashes: { centre: Vector2; along: Vector2; length: number; width: number }[] = [];
  const spacing = (LONG.length * 0.78) / SLASHES;
  for (let k = 0; k < SLASHES; k++) {
    const x = (k - (SLASHES - 1) / 2) * spacing + signed(random) * 0.8;
    const angle = SLASH.angle + signed(random) * 0.18;
    slashes.push({
      centre: new Vector2(x, signed(random) * 0.45),
      along: new Vector2(Math.cos(angle), Math.sin(angle)),
      length: SLASH.length * (1 + signed(random) * 0.2),
      width: SLASH.width * (1 + signed(random) * 0.25),
    });
  }

  // Top of the crust (its height at x, z), for placing the crumb in each slash.
  const top = (x: number, z: number) => {
    const r = profile(x);
    const across = Math.min(1, Math.abs(z) / r);
    return r * squash * Math.sqrt(1 - across * across);
  };

  const position = crust.getAttribute('position') as BufferAttribute;
  // The crust's real top, before it is slashed: the lathe's loaf is a little lopsided and bent,
  // so the ideal `top` above can sit higher than the real crust. A crumb placed by the ideal
  // poked its pointed tip up through the crust as a pale shard (the user, 2026-11-09). This
  // height map, from the crust's own points, places the crumb by the real surface instead.
  const realTop = crustHeights(position);
  const p = new Vector3();
  const flat = new Vector2();
  const outward = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    // Only the top is slashed.
    const onTop = smoothstep(radius * squash * 0.35, radius * squash * 0.75, p.y);
    if (onTop <= 0) continue;
    // The deepest carve wins; a point no slash reaches stays as it is.
    let push = Infinity;
    for (const slash of slashes) {
      flat.set(p.x, p.z).sub(slash.centre);
      const along = flat.dot(slash.along);
      const across = flat.x * -slash.along.y + flat.y * slash.along.x;
      // A long almond with pointed tips: its width narrows to nothing at both ends.
      const t = Math.abs(along) / (slash.length / 2);
      if (t >= 1) continue;
      const width = slash.width * Math.max(0.05, 1 - t * t);
      const depth = SLASH.depth * (1 - t * t);
      const groove = Math.exp(-((across / width) ** 2));
      // A broad, rolled lip: a narrow one was a knife-edge ridge, and the tone bands zigzagged
      // across it as sawtooth teeth (the user, 2026-11-09).
      const lip = Math.exp(-(((Math.abs(across) - width * 2.2) / (width * 1.5)) ** 2));
      push = Math.min(push, lip * depth * 0.45 - groove * depth);
    }
    if (!Number.isFinite(push)) continue;
    // Push along the section's outward direction (round the loaf's long axis).
    outward.set(0, p.y, p.z).normalize();
    p.addScaledVector(outward, push * onTop);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  position.needsUpdate = true;

  // The crumb in each slash: a pale almond, sunk into the groove and bent to the loaf's curve.
  const crumbs = slashes.map((slash) => {
    const piece = roundBody({
      halfLength: slash.length / 2 - 0.7,
      // A pointed almond (a lens, not a capsule): straight-ish sides meeting at sharp tips.
      radius: (x) => {
        const t = Math.min(1, Math.abs(x) / (slash.length / 2 - 0.7));
        return slash.width * 1.35 * (1 - t * t);
      },
      lying: true,
      lopsided: 0.08,
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
      // Sit just under the lips, following the real top's curve along the slash. Toward the
      // pointed tips (where the groove runs out) it sinks deeper, and it stops short of the groove's
      // own tips (a tip that reached the groove's end showed as a pale shard), so the tip always
      // ends under the crust, never on it.
      const local = new Vector2(x, z).sub(slash.centre);
      const t = Math.min(1, Math.abs(local.dot(slash.along)) / (slash.length / 2));
      const height = Math.min(top(x, z), realTop(x, z));
      cp.setXYZ(i, x, cp.getY(i) + height - SLASH.depth * (0.55 + 0.6 * smoothstep(0.45, 0.9, t)), z);
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

/**
 * A height map of a lying loaf's top: for any (x, z), how high its upper surface is, from its own
 * points (the highest in each small cell of a grid, blended over the nearest cells).
 */
function crustHeights(position: BufferAttribute): (x: number, z: number) => number {
  const CELL = 0.5;
  const cells = new Map<string, { x: number; y: number; z: number }>();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (y <= 0) continue;
    const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
    const best = cells.get(key);
    if (!best || y > best.y) cells.set(key, { x, y, z });
  }
  return (x, z) => {
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    let weight = 0;
    let sum = 0;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++) {
        const c = cells.get(`${cx + dx},${cz + dz}`);
        if (!c) continue;
        const w = 1 / (0.05 + (c.x - x) ** 2 + (c.z - z) ** 2);
        weight += w;
        sum += c.y * w;
      }
    return weight > 0 ? sum / weight : Infinity;
  };
}

/** Bread: the long loaf by default (`whole`, `baguette`), or the round loaf (`loaf`). */
export const buildBread: FormBuilder = (options) => {
  if (options.state === 'whole' || options.state === 'baguette') return buildLongLoaf(options);
  if (options.state === 'loaf') return buildBoule(options);
  throw new Error(`Bread: the "${options.state}" form is not built yet.`);
};
