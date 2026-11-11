import { BufferAttribute, Vector3, type BufferGeometry } from 'three';
import { smoothMax, smoothMin, smoothstep } from './kit/lathe';
import { finishPieces, type FormBuilder } from './kit/piece';
import { seededRandom } from './kit/random';
import { relaxOnSurface, surfaceNets } from './kit/surfaceNets';

/**
 * Chicken (archetype: long), the whole form is one raw drumstick. Board 08's card: "Raw: pale
 * pink skin, bone tip showing. The reference is cooked, use it for shape only."
 *
 * What makes it a drumstick, not a club or a bulb on a stick:
 *   - a full, rounded bulb of meat at one end (an egg, fattest about a quarter of the way in),
 *     a little lopsided, with a soft groove between its two big muscles,
 *   - a concave taper into a slim shank (the muscle runs out, the shank is mostly tendon),
 *   - the bone coming out of the shank: a short bare stretch, then the knuckle, two rounded
 *     knobs side by side with a shallow dip between them,
 *   - it lies the way a real one does: the bulb rests on the table (soft meat settles a little
 *     flat), the axis dips so the knuckle rests on the table too, the shank between in the air.
 *
 * Pieces, like layers in a pre-comp (the Style Lab paints each one):
 *   meat_glow  the meat and its skin, one piece (a distance field meshed with surface nets). The
 *              skin, its edge, the exposed meat and the tendons on the shank are painted by the
 *              shader (the `poultry` skin) from a map on the piece, never separate layers: an
 *              edge between layers reads as a crisp line (the steak's lesson).
 *   knuckle    the bone and its knuckle (bone family, the `knuckle` skin: cartilage at the end).
 *
 * Built along an axis first (u: along the drumstick from the bulb's end, cm; v: up; w: across),
 * then tipped so both ends rest on the table.
 */

/** The bulb: where it is fattest along the axis (cm) and its radius there. */
const BULB_AT = 3.6;
const BULB_RADIUS = 2.75;
/** How far the bulb reaches toward the shank before the shank takes over (cm). */
const BULB_TAIL = 6.0;
/** The meat runs out round the bone here (cm along the axis). */
const MEAT_END = 12.9;
/** The bone: its radius, where the knuckle's knobs sit, and the knuckle's end (cm). */
const BONE_RADIUS = 0.5;
const KNOB_AT = 14.25;
const KNUCKLE_END = 14.95;
/** Lying down, the meat settles: its cross-section is a little lower than it is wide. */
const SETTLE = 0.88;
/** How far the bulb sinks into the table (cm): the soft meat's flat contact patch. */
const SINK = 0.12;
/** The skin is a hair thicker than the meat it covers; at its edge the surface steps down softly. */
const SKIN = 0.08;
const CELL = 0.19;

/** A soft bump: 0 outside [a, d], 1 between b and c, eased in between. */
const band = (x: number, a: number, b: number, c: number, d: number) => smoothstep(a, b, x) * (1 - smoothstep(c, d, x));

export const buildChicken: FormBuilder = ({ state, seed }) => {
  if (state !== 'whole') throw new Error(`Chicken: the "${state}" form is not built yet (the drumstick only for now).`);

  const random = seededRandom(seed ^ 0xc41c4e);
  // A few gentle lumps round the bulb (never a perfect egg), seeded so it is the same every reload.
  const lumps = Array.from({ length: 3 }, (_, i) => ({ k: i + 2, a: 0.03 / (1 + i * 0.6), phase: random() * Math.PI * 2, drift: 0.2 + random() * 0.3 }));
  /** Where the skin ends along the axis (cm), round the drumstick: pulled back further on one side. */
  const skinEdge = (angle: number) => 10.4 + 0.6 * Math.cos(angle - 2.1) + 0.25 * Math.cos(2 * angle + 0.7) + 0.1 * Math.cos(5 * angle + 2.0);

  /** The axis bends a little (a real drumstick is never straight): its centre at u (v, w). */
  const centreV = (u: number) => 0.18 * Math.sin((Math.PI * u) / 13);
  const centreW = (u: number) => 0.32 * Math.sin((Math.PI * u) / 14) - 0.1;

  /** The meat's radius at u, before the cross-section's lumps: the bulb and the shank, filleted. */
  const radiusAt = (u: number) => {
    // The bulb: an egg, rounder at the end, long and tapering toward the shank.
    const t = u < BULB_AT ? (u - BULB_AT) / (BULB_AT + 0.05) : (u - BULB_AT) / BULB_TAIL;
    const bulb = BULB_RADIUS * Math.sqrt(Math.max(0, 1 - t * t)) * (u < BULB_AT ? 1 : 1 - 0.25 * t * t);
    // The shank: slim and tapering, then thinning round the bone where the meat runs out
    // (it ends inside the bone, so the bone grows out of the meat, never out of a flat cut).
    const s = Math.min(1, Math.max(0, (u - 4) / (MEAT_END - 4)));
    // Well below zero where there is no shank, so the smooth maximum never adds a nub at the bulb's end.
    let shank = u < 3.5 ? -2 : 1.08 - 0.36 * s;
    if (u > 11.6) shank *= Math.sqrt(Math.max(0, 1 - ((u - 11.6) / (MEAT_END - 11.6)) ** 2)) * 0.45 + 0.55 * (1 - smoothstep(11.6, MEAT_END, u));
    // A smooth maximum: the bulb flows into the shank with a soft, concave fillet.
    return smoothMax(bulb, shank, 1.1);
  };

  // The radius along the axis, looked up from a table (worked out once, like a baked curve):
  // asked for at every grid point, it was the slowest part of the build.
  const LUT_STEP = 0.01;
  const LUT_START = -0.7;
  const radiusLut = Float32Array.from({ length: Math.ceil((MEAT_END + 0.5 - LUT_START) / LUT_STEP) + 2 }, (_, i) => radiusAt(LUT_START + i * LUT_STEP));
  const radiusFast = (u: number) => {
    const f = (u - LUT_START) / LUT_STEP;
    const i = Math.max(0, Math.min(radiusLut.length - 2, Math.floor(f)));
    const t = Math.min(1, Math.max(0, f - i));
    return radiusLut[i] * (1 - t) + radiusLut[i + 1] * t;
  };

  /** The meat in the axis frame (cm, negative inside). */
  const meatAxis = (u: number, v: number, w: number) => {
    if (u < -0.6 || u > MEAT_END + 0.4) return 1;
    const dv = v - centreV(u);
    const dw = w - centreW(u);
    let r = radiusFast(u);
    // Quick answers far from the surface (the lumps, seams and folds below change the radius by
    // at most a fifth or so): surface nets only needs the right side there, so the slow part runs
    // only near the skin. This made the build about twice as quick.
    const reach = Math.hypot(dv / SETTLE, dw);
    if (reach > r * 1.25 + SKIN + 0.45) return reach - r * 1.25 - SKIN;
    if (reach < r * 0.68 - 0.45) return reach - r * 0.68;
    const angle = Math.atan2(dv, dw);
    // Lumps round the bulb, drifting a little along it (fading out down the shank).
    const onBulb = 1 - smoothstep(6, 9, u);
    let shape = 1;
    for (const l of lumps) shape += l.a * onBulb * Math.sin(l.k * angle + l.phase + l.drift * u);
    // A soft three-cornered section (the muscle masses), never a round tube.
    shape += 0.035 * onBulb * Math.cos(3 * angle - 0.6 + 0.08 * u);
    // The seam between the two big muscles, spiralling gently along the bulb on the side facing up
    // and toward the camera, and a fainter one underneath.
    shape -= 0.11 * Math.exp((Math.cos(angle - 0.85 - 0.11 * u) - 1) / 0.045) * band(u, 0.6, 2.4, 6.5, 9.5);
    shape -= 0.045 * Math.exp((Math.cos(angle + 2.4 - 0.08 * u) - 1) / 0.05) * band(u, 1.5, 3.2, 6, 8.5);
    // A slightly fuller muscle on the underside (it hangs under its own weight).
    shape += 0.03 * Math.exp((Math.cos(angle + 1.9) - 1) / 0.4) * band(u, 1, 3, 5, 8);
    // Tendons on the bare shank: soft lengthwise ridges, gentle.
    shape += 0.025 * Math.cos(5 * angle + 0.5 * u) * band(u, 10.2, 11.2, 12, 12.7);
    // Loose skin gathers in a few soft folds running round the drumstick just before its edge.
    const toEdge = skinEdge(angle) - u;
    shape += 0.022 * Math.sin(toEdge * 4.2 + 0.8 * Math.cos(angle)) * band(toEdge, 0.2, 0.7, 2.2, 3.2);
    // The skin: a hair thicker than the meat under it, stepping down softly where it ends.
    // (Only where there is meat to cover: past the bulb's rounded end it would carry on as a thread.)
    r = r * shape + SKIN * (1 - smoothstep(-0.35, 0.35, u - skinEdge(angle))) * smoothstep(0.05, 0.6, r);
    return reach - r;
  };

  /** The bone and its knuckle in the axis frame (cm, negative inside). */
  const boneAxis = (u: number, v: number, w: number) => {
    if (u < 10.4 || u > KNUCKLE_END + 0.5) return 1;
    const dv = v - centreV(u);
    const dw = w - centreW(u);
    // The shaft: a capsule, a touch wider toward the knuckle.
    const along = Math.min(Math.max(u, 11), KNOB_AT - 0.3);
    const shaft = Math.hypot(u - along, dv, dw) - BONE_RADIUS * (1 + 0.12 * smoothstep(12, 14, u));
    // The knuckle: two rounded knobs side by side (turned a little off level), a shallow dip
    // between them, and a low boss on top where the tendons attach.
    const tilt = 0.4;
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const kv = dv * c - dw * s;
    const kw = dv * s + dw * c;
    const knob = (offset: number, size: number) =>
      Math.hypot((u - KNOB_AT) / 0.9, (kv + 0.02) / 0.8, (kw - offset) / 0.95) * size - size;
    const knobs = smoothMin(knob(0.4, 0.58), knob(-0.38, 0.54), 0.16);
    const boss = Math.hypot((u - (KNOB_AT - 0.5)) / 1.2, kv - 0.28, kw * 0.9) - 0.42;
    return smoothMin(smoothMin(shaft, knobs, 0.55), boss, 0.35);
  };

  // Tip it so both ends rest on the table: the bulb sinks a little (soft meat), the knuckle just
  // touches. Find the angle from points inside each shape (measured once, then turned).
  // Only the underside matters: in each column, the lowest point inside the shape (found by
  // stepping up, then halving the step), so this stays quick.
  const underside = (field: (u: number, v: number, w: number) => number, uMin: number, uMax: number, step: number, across: number) => {
    const points: [number, number][] = [];
    for (let u = uMin; u <= uMax; u += step)
      for (let w = -across; w <= across; w += step) {
        let v = -3.4;
        while (v < 1 && field(u, v, w) >= 0) v += 0.2;
        if (v >= 1) continue;
        let low = v - 0.2;
        let high = v;
        for (let i = 0; i < 8; i++) {
          const mid = (low + high) / 2;
          if (field(u, mid, w) < 0) high = mid;
          else low = mid;
        }
        points.push([u, high]);
      }
    return points;
  };
  const meatPoints = underside(meatAxis, -0.6, 8, 0.15, 3.4);
  const bonePoints = underside(boneAxis, 13, KNUCKLE_END + 0.2, 0.04, 1.4);
  const lowest = (points: [number, number][], tip: number) => {
    const c = Math.cos(tip);
    const s = Math.sin(tip);
    let low = Infinity;
    for (const [u, v] of points) low = Math.min(low, -u * s + v * c);
    return low;
  };
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 30; i++) {
    const tip = (lo + hi) / 2;
    // Too little tip: the bulb sits deeper than it should, so tip it further.
    if (lowest(meatPoints, tip) - lowest(bonePoints, tip) < -SINK) lo = tip;
    else hi = tip;
  }
  const tip = (lo + hi) / 2;
  const floor = lowest(bonePoints, tip);
  const cosT = Math.cos(tip);
  const sinT = Math.sin(tip);
  /** From the table's frame (x, y, z) to the axis frame (u, v, w). */
  const toAxis = (x: number, y: number) => [x * cosT - y * sinT, x * sinT + y * cosT] as const;

  const meat = (x: number, y: number, z: number) => {
    const [u, v] = toAxis(x, y);
    // The soft meat settles flat where it rests: the table cuts it flush (the steak's lesson). A
    // rounded rim there faced down and caught the bounce light as a pale sliver along the contact.
    return smoothMax(meatAxis(u, v, z), floor - y, 0.04);
  };
  const bone = (x: number, y: number, z: number) => {
    const [u, v] = toAxis(x, y);
    return boneAxis(u, v, z);
  };

  // The grids start at odd offsets (the surface-nets lesson), each just round its own shape.
  const meatMin = new Vector3(-1.013, floor - 0.317, -3.409);
  const meatMax = new Vector3(13.6, 3.4, 3.6);
  const meatMesh = relaxOnSurface(surfaceNets(meat, meatMin, meatMax, CELL), meat, CELL);
  const boneMin = new Vector3(10.313, floor - 0.211, -1.509);
  const boneMax = new Vector3(15.6, floor + 3.0, 1.6);
  const boneCell = CELL * 0.7;
  const boneMesh = relaxOnSurface(surfaceNets(bone, boneMin, boneMax, boneCell), bone, boneCell);

  // Rest both exactly on one table: the bone's lowest point meets the meat's flat patch.
  const lowY = (g: BufferGeometry) => {
    const p = g.getAttribute('position');
    let low = Infinity;
    for (let i = 0; i < p.count; i++) low = Math.min(low, p.getY(i));
    return low;
  };
  boneMesh.translate(0, lowY(meatMesh) - lowY(boneMesh), 0);

  // The skin's map, for the shader (the `poultry` skin): x is how far along the drumstick (cm, from
  // the bulb's end), y how far inside the skin's edge (cm: positive under the skin, negative on the
  // bare shank). The shader fades the skin into the meat over a wide, soft band from it.
  const mapAlong = (geometry: BufferGeometry, y: (u: number, angle: number) => number) => {
    const pos = geometry.getAttribute('position');
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const [u, v] = toAxis(pos.getX(i), pos.getY(i));
      const angle = Math.atan2(v - centreV(u), pos.getZ(i) - centreW(u));
      uv[2 * i] = u;
      uv[2 * i + 1] = y(u, angle);
    }
    geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  };
  mapAlong(meatMesh, (u, angle) => skinEdge(angle) - u);
  // The knuckle's map: x how far back from its end (cm), so the shader can paint the cartilage cap.
  mapAlong(boneMesh, (u) => KNUCKLE_END - u);
  const boneUv = boneMesh.getAttribute('uv') as BufferAttribute;
  for (let i = 0; i < boneUv.count; i++) boneUv.setX(i, KNUCKLE_END - boneUv.getX(i));

  return finishPieces([
    { role: 'meat_glow', geometry: meatMesh },
    { role: 'knuckle', geometry: boneMesh },
  ]);
};
