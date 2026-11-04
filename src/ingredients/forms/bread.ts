import { BufferAttribute, Vector2, Vector3 } from 'three';
import { smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom, signed } from './kit/random';
import { roundBody } from './kit/round';

/**
 * Bread: the round loaf (a boule). Board 08: "Round loaf (default), a slice lying flat, a
 * baguette with two cut slices. Variants pick their own archetype: loaf round, slice block,
 * baguette long." This is the loaf, built with the round recipe; the slice and the baguette
 * come later.
 *
 * What makes it a loaf of bread, not a bun, a mushroom cap or a stone:
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

export const buildBread: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole' && state !== 'loaf') throw new Error(`Bread: the "${state}" form is not built yet (the round loaf only for now).`);

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
