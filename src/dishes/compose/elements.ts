import { BufferAttribute, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { relaxOnSurface, surfaceNets } from '../../ingredients/forms/kit/surfaceNets';
import { roundedIntersection } from '../../ingredients/forms/kit/wedge';
import { leafPiece } from '../../ingredients/forms/kit/stemLeaf';
import { signed } from '../../ingredients/forms/kit/random';
import type { FormPiece } from '../../ingredients/forms/kit/piece';
import type { FamilyId } from '../../ingredients/families';
import { salmonFillet } from '../../ingredients/forms/salmon';
import { mushroomUpright } from '../../ingredients/forms/mushroom';
import { oneBlueberry } from '../../ingredients/forms/blueberries';
import { buildChicken } from '../../ingredients/forms/chicken';
import { buildPotato } from '../../ingredients/forms/potato';
import { buildBroccoli } from '../../ingredients/forms/broccoli';
import { buildCheese } from '../../ingredients/forms/cheese';
import { CERAMIC_SKIN, FLESH_SKIN, NO_SKIN, SAUCE_SKIN, type Skin } from '../../shading/effects/skinTexture';
import { cutPieces, knife, withFrame } from '../kit/cut';
import { inCm, posed } from '../kit/place';
import { pool, wobble } from '../kit/pool';
import { COOKED_PORTION } from '../forms/salmonPeach';
import { BODY, type Part } from './layout';
import { componentLooks, isComponent, makeComponent } from './components';

/**
 * The composer's element library: every `ingredient:form` a catalogue dish asks for, built in
 * code from the pantry's own forms where one fits (a drumstick, a broccoli head, a cheese wedge, a
 * mushroom, a blueberry, the cooked salmon) and otherwise from one recipe: a smooth body cut with
 * flat knives whose edges are rounded (DESIGN.md: cut fruit comes from a smooth body, cut pieces
 * have soft edges), meshed whole, and painted as one piece from its core out to its skin (the
 * watermelon treatment: no seam where skin meets flesh).
 *
 * Each element comes back in centimetres, its middle over (0, 0), resting on y = 0, laid the way
 * its plan shape is drawn at no turn: a rectangle's long side along z, a half circle's flat side
 * toward -z (up the page).
 */

export type Look = Skin & { pale?: string; green?: string };

/** One role a dish uses: its family, its skin, and whether it keeps a glossy highlight. */
export interface RoleLook {
  role: string;
  family: FamilyId;
  skin?: Look;
  glossy?: boolean;
}

/** What each skewer threads, in order along the stick. */
export const SKEWERS: Record<string, Part[]> = {
  chicken: [{ ingredient: 'chicken', form: 'cube', count: 1 }, { ingredient: 'pepper', form: 'slice', count: 1 }, { ingredient: 'grapes', form: 'berry', count: 1 }],
  steak: [{ ingredient: 'steak', form: 'cube', count: 1 }, { ingredient: 'mushroom', form: 'half', count: 1 }, { ingredient: 'pepper', form: 'slice', count: 1 }],
  salmon: [{ ingredient: 'salmon', form: 'cube', count: 1 }, { ingredient: 'peach', form: 'cube', count: 1 }],
};

/** The colour of each ingredient's flesh: the family, its core colour and its skin's colour. */
const FLESH: Record<string, { family: FamilyId; core: string; skin: string; segments?: number }> = {
  apple: { family: 'apple-flesh', core: '#f2e2a6', skin: '#c8303a' },
  pear: { family: 'pear-flesh', core: '#ece0a4', skin: '#b4b84a' },
  peach: { family: 'peach-flesh', core: '#e8783a', skin: '#c8384a' },
  orange: { family: 'orange-flesh', core: '#ffd27a', skin: '#f0821e', segments: 10 },
  lemon: { family: 'lemon-flesh', core: '#fff3a8', skin: '#f2c81e', segments: 9 },
  lime: { family: 'lime-flesh', core: '#f4f1c4', skin: '#6ea42c', segments: 10 },
  tomato: { family: 'tomato-flesh', core: '#f8c08a', skin: '#d8301e', segments: 4 },
  onion: { family: 'onion-flesh', core: '#fbeef4', skin: '#9a2a6a' },
  potato: { family: 'potato-flesh', core: '#ffe9a8', skin: '#b07a3c' },
  avocado: { family: 'avocado-flesh', core: '#f8ee7a', skin: '#2f5420' },
  strawberry: { family: 'berry-flesh', core: '#ffd8d2', skin: '#c8203c' },
  garlic: { family: 'garlic-roast', core: '#fff0c4', skin: '#e8d8bc', segments: 8 },
  pepper: { family: 'pepper-flesh', core: '#ffd2a0', skin: '#ee6a14' },
  cabbage: { family: 'cabbage-flesh', core: '#fbfbe4', skin: '#8eb45a', segments: 12 },
  eggs: { family: 'egg-white', core: '#f6b62a', skin: '#fffaf0' },
  watermelon: { family: 'melon', core: '#ff8a96', skin: '#ff5a6e' },
  peachCube: { family: 'peach-flesh', core: '#ffb05a', skin: '#f6a040' },
  steak: { family: 'rare', core: '#e0606a', skin: '#7a3a22' },
  chicken: { family: 'poultry', core: '#fff0e0', skin: '#d8904a' },
  baguette: { family: 'crumb', core: '#fff6e0', skin: '#b06a2c' },
  rice: { family: 'cooked-rice', core: '#fffaea', skin: '#d8a050' },
  salmon: { family: 'salmon', core: '#ff9a6a', skin: '#f07848' },
  cheese: { family: 'cheese', core: '#fff0b0', skin: '#f2c460' },
  butter: { family: 'butter', core: '#fff4c0', skin: '#f6e08a' },
};

/** Cooked elements take a sear (the DESIGN rule: seared, not charred). */
const SEARED: Record<string, number> = {
  // Potatoes roast golden, not brown (the user, 2026-11-25: "golden brown bright").
  potato: 0.45, chicken: 0.5, steak: 0.9, baguette: 0.7, rice: 0.8, peach: 0.5, pear: 0.4, garlic: 0.5, cabbage: 0.85, mushroom: 0.6, pepper: 0.4,
};

/** The roles an element needs, decided from the idea alone (the entry lists its parts before building). */
export function elementLooks(part: Part, seared: boolean): RoleLook[] {
  const { ingredient, form } = part;
  if (isComponent(ingredient)) return componentLooks(ingredient, form as FamilyId);
  const id = `${ingredient}${form[0].toUpperCase()}${form.slice(1)}`;
  const sear = seared ? (SEARED[ingredient] ?? 0) : 0;
  const flesh = FLESH[ingredient];
  switch (`${ingredient}:${form}`) {
    case 'salmon:fillet':
      return [{ role: id, family: 'cooked-salmon', skin: { kind: 'salmon', size_mm: 4, amount: 0.9, seared: 0.95, pale: '#fffaf6', green: '#efc0b0' } }];
    case 'salmon:slice':
    case 'salmon:cube':
      // Raw salmon cut small: the flesh skin in the salmon's own colours (its fillet skin needs a whole fillet's map).
      return [{ role: id, family: 'salmon', skin: { ...FLESH_SKIN, pale: '#ff8a5a', green: '#ff7448' }, glossy: true }];
    case 'steak:steak':
      // Saturated pink inside, a thinner crust, so the slices read pink (the user, 2026-11-25).
      return [{ role: id, family: 'rare', skin: { ...FLESH_SKIN, pale: '#f2587a', green: '#8a3a2a', seared: 0.55 } }];
    case 'chicken:drumstick':
      return [
        { role: 'chicken_meat_glow', family: 'poultry', skin: { kind: 'poultry', size_mm: 3, amount: 0.5, seared: 0.97, pale: '#c8501e', green: '#e09040' } },
        { role: 'knuckle', family: 'bone-roast' },
      ];
    case 'potato:whole':
      return [{ role: id, family: 'potato', skin: { kind: 'potato', size_mm: 2.2, amount: 0.9, seared: 0.6 } }];
    case 'broccoli:whole':
      return [
        { role: 'broccoli_florets', family: 'green', skin: { kind: 'florets', size_mm: 4, amount: 0.9, seared: 0.35 } },
        { role: 'broccoli_stalk', family: 'pale-green' },
        { role: 'broccoli_leaf', family: 'leaf' },
      ];
    case 'cheese:wedge':
      return [
        { role: 'cheese_body', family: 'cheese', skin: { kind: 'pores', size_mm: 1.6, amount: 0.35 } },
        { role: 'cheese_rind', family: 'rind' },
      ];
    case 'eggs:egg':
      return [
        { role: 'white', family: 'albumen', skin: { ...SAUCE_SKIN, amount: 0.6 } },
        { role: 'yolk', family: 'yolk', glossy: true },
      ];
    case 'blueberries:berry':
      return [{ role: id, family: 'blueberry', skin: { kind: 'blueberry', size_mm: 1.5, amount: 0.9 } }];
    case 'grapes:berry':
      return [{ role: id, family: 'grape', skin: { kind: 'grape', size_mm: 2, amount: 0.9 }, glossy: true }];
    case 'mushroom:half':
    case 'mushroom:slice':
      return [
        { role: 'mushroom', family: 'mushroom', skin: { kind: 'mushroom', size_mm: 2, amount: 0.9, seared: 0.6 } },
        { role: 'mushroomCut', family: 'garlic', skin: { ...FLESH_SKIN, pale: '#f2e2c4', green: '#a87a5a', seared: 0.6 } },
      ];
    case 'spinach:leaf':
      return [{ role: id, family: 'spinach' }];
    case 'cabbage:leaf':
      return [{ role: id, family: 'cabbage' }];
    case 'onion:wheel':
      return [{ role: id, family: 'onion-flesh', skin: { ...FLESH_SKIN, pale: '#fbeef4', green: '#9a2a6a' } }];
    case 'pepper:slice':
      return [{ role: id, family: 'pepper', skin: { kind: 'pepper', size_mm: 4, amount: 0.8, seared: sear }, glossy: true }];
    case 'pepper:strip':
    case 'pepper:half': {
      // Roasted pepper: its glossy skin, blistered and touched with char (the fix list: lobes and a
      // little char, never a smooth ovoid).
      // Bright and glossy with only a touch of char on a strip (more read as bacon); a half chars more.
      const roast: RoleLook = { role: id, family: 'pepper', skin: { kind: 'pepper', size_mm: 4, amount: 0.8, seared: form === 'strip' ? 0.2 : 0.45 }, glossy: true };
      return form === 'half' ? [roast, { role: 'pepperStem', family: 'leaf' }] : [roast];
    }
    case 'cheese:crumble':
    case 'cheese:slice':
      return [{ role: id, family: 'cheese', skin: { kind: 'pores', size_mm: 1.2, amount: 0.3 } }];
    case 'potato:fries':
      // Thick-cut fries, golden brown and bright (the user, 2026-11-25), toasted a little at the ends.
      return [{ role: id, family: 'fries', skin: { kind: 'potato', size_mm: 2, amount: 0.3, seared: 0.25 } }];
    case 'garlic:chip':
      // Garlic shows only as crisp golden chips, never a bulb (the user, 2026-11-25).
      return [{ role: id, family: 'garlic-chip' }];
    case 'butter:cube':
    case 'butter:crumble':
      return [{ role: id, family: 'butter', skin: { kind: 'pores', size_mm: 1.1, amount: 0.18 }, glossy: true }];
    case 'potato:mash':
      return [{ role: id, family: 'mash', skin: { ...SAUCE_SKIN, amount: 0.4, seared: seared ? 0.7 : 0 } }];
    case 'milk:mash':
      return [{ role: id, family: 'cream', skin: { ...SAUCE_SKIN, amount: 0.4 } }];
    case 'avocado:half':
      return [
        { role: id, family: 'avocado-flesh', skin: { ...FLESH_SKIN, pale: flesh.core, green: flesh.skin } },
        { role: 'pit', family: 'pit', glossy: true },
      ];
    // Bakes and folds: one piece each, a pale inside (where cut or folded) and a golden outside.
    case 'butter:cake':
      return [{ role: id, family: 'baked', skin: { ...FLESH_SKIN, pale: '#fff1cc', green: '#d9973e' } }];
    case 'butter:pastry':
      return [{ role: id, family: 'baked', skin: { ...FLESH_SKIN, pale: '#f6d48c', green: '#c98a3c' } }];
    case 'cheese:cake':
      return [{ role: id, family: 'cheese', skin: { ...FLESH_SKIN, pale: '#fff8e0', green: '#c99a5a' } }];
    case 'eggs:omelette':
      return [{ role: id, family: 'yolk', skin: { ...FLESH_SKIN, pale: '#ffe58a', green: '#f0c040' } }];
    case 'milk:pancake':
      return [{ role: id, family: 'baked', skin: { ...FLESH_SKIN, pale: '#c98a3c', green: '#f2d8a0' } }];
    case 'cabbage:roll':
      return [{ role: id, family: 'cabbage', skin: { ...FLESH_SKIN, pale: '#e8f0b0', green: '#b8d070' } }];
    // Skewers: the stick and the pieces threaded on it, each piece its own role.
    case 'chicken:skewer':
    case 'steak:skewer':
    case 'salmon:skewer':
      return [
        { role: 'skewer', family: 'wood' },
        ...SKEWERS[ingredient].flatMap((p) => elementLooks(p, seared)),
      ];
    default: {
      // A cut body (wheel, half, wedge, slice, cube, toast): one piece, flesh to skin.
      const f = (ingredient === 'peach' && form === 'cube' ? FLESH.peachCube : flesh) ?? { family: 'crumb' as FamilyId, core: '#fff6e0', skin: '#c08040' };
      return [{ role: id, family: f.family, skin: { ...FLESH_SKIN, pale: f.core, green: f.skin, seared: sear }, glossy: ['tomato', 'peach', 'orange', 'lemon', 'lime', 'strawberry', 'watermelon'].includes(ingredient) }];
    }
  }
}

// ---- The cut-body recipe ----------------------------------------------------------------------

/** A body's distance field (cm): negative inside. Each ingredient has its own soft silhouette. */
function bodyField(ingredient: string, random: () => number, scaleR = 1): (x: number, y: number, z: number) => number {
  const b = BODY[ingredient] ?? { r: 2.5, h: 2.5 };
  const R = b.r * scaleR;
  const H = (b.long ?? b.h) * scaleR;
  const lump = random() * 6;
  return (x, y, z) => {
    const t = Math.max(-1, Math.min(1, y / H));
    const angle = Math.atan2(z, x + 1e-6);
    let k = 1 + 0.025 * Math.sin(2 * angle + lump) + 0.02 * Math.sin(3 * y + lump);
    if (ingredient === 'pear') k *= 1 - 0.38 * Math.max(0, t + 0.1) ** 1.3;
    if (ingredient === 'avocado') k *= 1 - 0.22 * Math.max(0, t + 0.2);
    if (ingredient === 'strawberry') k *= 0.45 + 0.55 * Math.min(1, (t + 1.15) / 1.6);
    if (ingredient === 'eggs') k *= 1 - 0.12 * t;
    if (ingredient === 'garlic' || ingredient === 'onion') k *= 1 - 0.3 * Math.max(0, t) ** 2;
    if (ingredient === 'pepper') k *= 1 + 0.07 * Math.cos(4 * angle + lump);
    if (ingredient === 'tomato') k *= 1 + 0.03 * Math.cos(6 * angle + lump);
    if (ingredient === 'potato') k *= 1 + 0.05 * Math.sin(x * 1.3 + lump) * Math.sin(z * 1.1 + y);
    const q = Math.hypot(x / (R * k), y / H, z / (R * k));
    return (q - 1) * Math.min(R * k, H);
  };
}

/** Round off a shape's edges by `r` (cm): shrink, then grow back as a smooth shell. */
function roundBox(d: number, r: number): number {
  return d - r;
}

/** A rounded box's distance field (cm), half sizes. */
function boxField(hx: number, hy: number, hz: number, round: number): (x: number, y: number, z: number) => number {
  return (x, y, z) => {
    const qx = Math.abs(x) - hx + round;
    const qy = Math.abs(y) - hy + round;
    const qz = Math.abs(z) - hz + round;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - round;
  };
}

export type Field = (x: number, y: number, z: number) => number;

/**
 * Cut a body with flat knives (each a plane `n . p <= d` kept), rounded where they meet, meshed whole.
 * Its map: on the cut faces x runs 0 at the deepest point to 1 at the skin (the flesh skin paints
 * the core colour deep in, the skin's colour at the rim), and past 1 over the skin itself, blended
 * across the rounded edge; y counts segments round the middle (citrus, garlic, tomato).
 */
export function cutBody(body: Field, cuts: [Vector3, number][], o: { reach: number; depth: number; rounding: number; segments?: number; turn?: number }): BufferGeometry {
  const planes = cuts.map(([n, d]) => (x: number, y: number, z: number) => x * n.x + y * n.y + z * n.z - d);
  const shape: Field = (x, y, z) => (planes.length ? roundedIntersection([body(x, y, z), ...planes.map((p) => p(x, y, z))], o.rounding) : body(x, y, z));
  const cell = Math.max(0.06, o.reach / 24);
  const m = o.reach + cell * 3;
  const geometry = relaxOnSurface(surfaceNets(shape, new Vector3(-m, -m, -m), new Vector3(m, m, m), cell), shape, cell);
  const pos = geometry.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const own = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const toSkin = Math.abs(body(x, y, z));
    const toCut = planes.length ? Math.min(...planes.map((p) => Math.abs(p(x, y, z)))) : Infinity;
    const t = Math.min(1, Math.max(0, (toCut - toSkin + 0.25) / 0.5));
    const skinness = t * t * (3 - 2 * t);
    const inside = Math.max(0, -body(x, y, z));
    const r = 1 - Math.min(1, inside / o.depth);
    uv[2 * i] = r * (1 - skinness) + 1.3 * skinness;
    uv[2 * i + 1] = o.segments ? ((Math.atan2(z, x + 1e-4) + Math.PI) / (2 * Math.PI)) * o.segments + (o.turn ?? 0) + 0.001 : 0;
    own.set([x, y, z], 3 * i);
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setAttribute('ownPos', new BufferAttribute(own, 3));
  return geometry;
}

/** Turn and move a geometry so its lowest point is at y = 0 and its middle over the origin. */
export function settle(pieces: FormPiece[]): FormPiece[] {
  let minY = Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of pieces) {
    const pos = p.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      minY = Math.min(minY, pos.getY(i));
      minX = Math.min(minX, pos.getX(i));
      maxX = Math.max(maxX, pos.getX(i));
      minZ = Math.min(minZ, pos.getZ(i));
      maxZ = Math.max(maxZ, pos.getZ(i));
    }
  }
  for (const p of pieces) p.geometry.translate(-(minX + maxX) / 2, -minY, -(minZ + maxZ) / 2);
  return pieces;
}

/** A rotation turning one direction onto another. */
function turnOnto(from: Vector3, to: Vector3): Matrix4 {
  return new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize()));
}

/** Turn pieces round the upright axis so their bulk lies toward +z (a wedge's round back, a half moon's curve). */
function bulgeToFront(pieces: FormPiece[]): FormPiece[] {
  let sx = 0;
  let sz = 0;
  let n = 0;
  for (const p of pieces) {
    const pos = p.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 3) {
      sx += pos.getX(i);
      sz += pos.getZ(i);
      n++;
    }
  }
  const a = Math.atan2(sx / n, sz / n);
  return posed(pieces, { turn: -a });
}

/** A cut piece of fruit or vegetable: wheel, half, wedge, slice or cube, by the recipe above. */
function cutElement(part: Part, role: string, random: () => number): FormPiece[] {
  const { ingredient, form } = part;
  const b = BODY[ingredient] ?? { r: 2.5, h: 2.5 };
  const flesh = FLESH[ingredient];
  const segments = flesh?.segments;
  const body = bodyField(ingredient, random);
  const R = b.r;
  const H = b.long ?? b.h;
  const reach = Math.max(R, H) * 1.08;
  const depth = Math.min(R, H) * 0.9;
  const rounding = Math.min(0.3, Math.min(R, H) * 0.12);
  const up = new Vector3(0, 1, 0);
  const lengthwise = ['pear', 'avocado', 'pepper', 'strawberry', 'eggs', 'garlic', 'potato'].includes(ingredient);
  let geometry: BufferGeometry;
  let pieces: FormPiece[];
  switch (form) {
    case 'wheel': {
      const t = ingredient === 'potato' ? 0.45 : ['tomato', 'orange'].includes(ingredient) ? 0.6 : 0.3;
      const y = signed(random) * R * 0.15;
      // A wheel of a long fruit is cut across its long axis: here the body's axis is y, so cut across y.
      geometry = cutBody(body, [[up, y + t / 2], [up.clone().negate(), -(y - t / 2)]], { reach, depth, rounding: Math.min(rounding, t * 0.3), segments, turn: random() * 6 });
      pieces = [{ role, geometry }];
      break;
    }
    case 'half': {
      if (lengthwise) {
        // Halved through its long axis, lying on its back with the cut face up.
        geometry = cutBody(body, [[new Vector3(0, 0, 1), 0]], { reach, depth, rounding, segments: ingredient === 'garlic' ? 8 : undefined });
        pieces = posed([{ role, geometry }], turnOnto(new Vector3(0, 0, 1), up));
      } else {
        // Halved across its middle, the cut face up.
        geometry = cutBody(body, [[up, 0]], { reach, depth, rounding, segments, turn: random() * 6 });
        pieces = [{ role, geometry }];
      }
      break;
    }
    case 'wedge': {
      const angle = 0.75 + random() * 0.3;
      const a = random() * Math.PI * 2;
      const n1 = new Vector3(Math.sin(a), 0, -Math.cos(a));
      const n2 = new Vector3(-Math.sin(a + angle), 0, Math.cos(a + angle));
      geometry = cutBody(body, [[n1, 0], [n2, 0]], { reach, depth, rounding, segments: segments ? segments : undefined, turn: random() * 6 });
      const flip = random() < 0.5;
      // Lying on a cut face: that face's outward direction turned down.
      pieces = posed([{ role, geometry }], turnOnto(flip ? n2 : n1, new Vector3(0, -1, 0)));
      pieces = bulgeToFront(pieces);
      if (ingredient === 'potato') pieces = posed(pieces, { turn: Math.PI / 2 });
      break;
    }
    case 'slice': {
      const t = 0.35;
      // A half-moon slice through the middle, laid flat.
      const cuts: [Vector3, number][] = [[new Vector3(1, 0, 0), t / 2], [new Vector3(-1, 0, 0), t / 2]];
      if (!['strawberry', 'cheese'].includes(ingredient)) cuts.push([new Vector3(0, 0, -1), 0]);
      geometry = cutBody(body, cuts, { reach, depth, rounding: t * 0.3 });
      pieces = posed([{ role, geometry }], turnOnto(new Vector3(1, 0, 0), up));
      if (ingredient === 'avocado') pieces = posed(pieces, { turn: Math.PI / 2 });
      pieces = bulgeToFront(pieces);
      if (ingredient === 'avocado') pieces = posed(pieces, { turn: Math.PI / 2 });
      break;
    }
    case 'cube':
    default: {
      // A cube cut from the flesh: a rounded box, its edges softly caught by the sear or the skin's colour.
      const s = ['steak', 'chicken'].includes(ingredient) ? 1.4 : ingredient === 'rice' ? 0 : 1.1;
      const field = ingredient === 'rice' ? boxField(2.1, 0.7, 3, 0.45) : boxField(s, s * 0.92, s, s * 0.28);
      const lumpy: Field = (x, y, z) => field(x, y, z) + 0.04 * Math.sin(x * 4.1 + y * 2.3) * Math.sin(z * 3.7 - y);
      geometry = cutBody(lumpy, [], { reach: ingredient === 'rice' ? 3.4 : s * 1.3, depth: ingredient === 'rice' ? 0.7 : s, rounding: 0 });
      // A cube's map from its own middle: the edges and corners reach the skin's band.
      const pos = geometry.getAttribute('position');
      const uv = geometry.getAttribute('uv') as BufferAttribute;
      const hx = ingredient === 'rice' ? 2.1 : s;
      const hz = ingredient === 'rice' ? 3 : s;
      for (let i = 0; i < pos.count; i++) {
        const e = Math.max(Math.abs(pos.getX(i)) / hx, Math.abs(pos.getZ(i)) / hz, Math.abs(pos.getY(i)) / (ingredient === 'rice' ? 0.7 : s * 0.92));
        const corners = (Math.abs(pos.getX(i)) / hx) * (Math.abs(pos.getZ(i)) / hz) + (Math.abs(pos.getY(i)) / (ingredient === 'rice' ? 0.7 : s)) * 0.5;
        const crust = ['steak', 'chicken', 'baguette', 'rice'].includes(ingredient);
        uv.setX(i, crust ? Math.min(1.1, 0.8 + 0.3 * e) : Math.min(1.05, 0.35 + 0.45 * e * e + 0.35 * corners));
      }
      pieces = posed([{ role, geometry }], { turn: random() * 0.6 });
      break;
    }
  }
  return pieces;
}

/**
 * A long strip of roasted pepper (NEW, the fix list 2026-11-25): a band cut from the pepper's
 * curved wall, about 1.6 cm wide and 6 to 8 cm long, lying skin up, its edges a little wavy and its
 * length gently curled the way roasted strips slump.
 */
function pepperStrip(random: () => number): BufferGeometry {
  const half = 3 + random() * 1;
  const wall = 2.4 + random() * 0.6; // the pepper's radius where the strip was cut
  const width = 0.4 + random() * 0.08; // half the strip's angle (radians)
  const curl = signed(random) * 0.08;
  const ph = random() * 6;
  const field: Field = (x0, y, z) => {
    const x = x0 - curl * z * z;
    const cy = y + wall - 0.45; // the wall's centre, below the strip
    const r = Math.hypot(x, cy);
    const a = Math.atan2(x, cy);
    const edge = width * (1 + 0.05 * Math.sin(z * 1.7 + ph));
    const shell = Math.abs(r - wall) - 0.16;
    const sides = (Math.abs(a) - edge) * wall;
    const ends = Math.abs(z) - half * (1 - 0.08 * Math.abs(Math.sin(x * 3 + ph)));
    return Math.max(shell, sides, ends);
  };
  return cutBody(field, [], { reach: half + 0.6, depth: 0.3, rounding: 0 });
}

/**
 * Half a roasted pepper, lengthwise (NEW): a hollow boat lying on its back, its lobed wall thin, the
 * inside open to the camera, a short green stem stub at its shoulder. Never a solid blob.
 */
function pepperHalf(role: string, random: () => number): FormPiece[] {
  const body = bodyField('pepper', random);
  // Squarer and lobed, like the pantry's pepper; a little slumped from roasting.
  const lobed: Field = (x, y, z) => body(x * 0.95, y * 1.05, z * 0.95);
  const shell: Field = (x, y, z) => {
    const d = lobed(x, y, z);
    return Math.max(d, -d - 0.32);
  };
  const g = cutBody(shell, [[new Vector3(0, 0, 1), 0.2]], { reach: 4.8, depth: 0.32, rounding: 0.12 });
  const stem = new CylinderGeometry(0.32, 0.42, 1.6, 10);
  stem.translate(0, 4.6, -0.6);
  const pieces = posed(
    [
      { role, geometry: g },
      { role: 'pepperStem', geometry: withFrame(stem, false) },
    ],
    turnOnto(new Vector3(0, 0, 1), new Vector3(0, 1, 0)),
  );
  return posed(pieces, { turn: Math.PI / 2 });
}

/**
 * A roast chicken breast carved into slices (NEW): pale inside, golden at the crust, laid as a
 * short fan of five slices leaning on each other so their faces show, like the carved steak.
 */
function slicedBreast(role: string, random: () => number): FormPiece[] {
  const L = 6.2;
  const body: Field = (x, y, z) => {
    const t = Math.max(-1, Math.min(1, z / L));
    const w = 3.1 * (1 - 0.28 * Math.max(0, t)) * (1 - 0.12 * t * t);
    const h = 1.5 * (1 - 0.35 * Math.max(0, t)) * (1 - 0.1 * t * t);
    const q = Math.hypot(x / w, Math.max(0, y) / h, Math.min(0, y) / (h * 0.55), z / L);
    return (q - 1) * Math.min(w, h) + 0.05 * Math.sin(x * 1.7 + z * 0.9);
  };
  const n = 5;
  const pieces: FormPiece[] = [];
  const width = (2 * L) / n;
  for (let k = 0; k < n; k++) {
    const z0 = -L + k * width;
    const z1 = z0 + width - 0.12;
    const g = cutBody(body, [[new Vector3(0, 0, 1), z1], [new Vector3(0, 0, -1), -z0]], { reach: L + 0.6, depth: 1.4, rounding: 0.15 });
    g.translate(0, 0, -(z0 + z1) / 2);
    g.rotateX(-0.8 + signed(random) * 0.08);
    g.translate(signed(random) * 0.25, 0, -4.6 + k * (width + 0.2));
    pieces.push({ role, geometry: g });
  }
  return pieces;
}

/**
 * A piece of torn roast chicken (NEW): an irregular pulled strip about 4 cm long, ridged along its
 * fibres, golden where the crust was and pale where it was torn open (the flat top).
 */
function tornChicken(random: () => number): BufferGeometry {
  const half = 1.6 + random() * 0.6;
  const fat = 0.55 + random() * 0.15;
  const ph = random() * 6;
  const bend = signed(random) * 0.12;
  const field: Field = (x0, y, z) => {
    const x = x0 - bend * z * z;
    const along = Math.max(0, Math.abs(z) - half);
    const taper = 1 - 0.35 * (Math.abs(z) / (half + fat)) ** 2;
    const a = Math.atan2(y, x);
    const r = fat * taper * (1 + 0.12 * Math.sin(5 * a + z * 1.3 + ph) + 0.06 * Math.sin(11 * a - z * 2 + ph));
    return Math.hypot(Math.hypot(x / 1.25, y), along) - r;
  };
  return cutBody(field, [[new Vector3(0, 1, 0), fat * 0.35]], { reach: half + fat + 0.4, depth: 0.5, rounding: 0.1 });
}

/**
 * A seared steak carved into thick slices, leaning on each other like fallen dominoes so their rosy
 * cut faces show: one rounded slab, cut five times across, each slice tipped a little.
 */
function slicedSteak(role: string, random: () => number): FormPiece[] {
  const slab = boxField(4, 1.4, 6.2, 1.0);
  const body: Field = (x, y, z) => slab(x, y, z) + 0.08 * Math.sin(x * 1.3 + 1) * Math.sin(z * 0.8 + 2);
  const n = 5;
  const pieces: FormPiece[] = [];
  const width = 12.4 / n;
  for (let k = 0; k < n; k++) {
    const z0 = -6.2 + k * width;
    const z1 = z0 + width - 0.12;
    const g = cutBody(body, [[new Vector3(0, 0, 1), z1], [new Vector3(0, 0, -1), -z0]], { reach: 7, depth: 1.3, rounding: 0.18 });
    g.translate(0, 0, -(z0 + z1) / 2);
    // Each slice tipped back so its cut face looks up toward the camera, then set in a row.
    g.rotateX(-0.85 + signed(random) * 0.08);
    g.translate(signed(random) * 0.2, 0, -5 + k * (width + 0.25));
    pieces.push({ role, geometry: g });
  }
  return pieces;
}

/** A toast: a slice of loaf, crumb on top and bottom, crust round its sides. */
function toast(role: string, random: () => number, ingredient: string): FormPiece[] {
  const crumb = ingredient === 'baguette' ? 0 : 0;
  const field = boxField(4, 2.5, 5.5, 1.6);
  const lumpy: Field = (x, y, z) => field(x, y, z) + 0.12 * Math.sin(x * 1.1 + 2) * Math.sin(z * 0.9 + y) + crumb;
  const up = new Vector3(0, 1, 0);
  const geometry = cutBody(lumpy, [[up, 0.85], [up.clone().negate(), 0.85]], { reach: 6.2, depth: 2.5, rounding: 0.25 });
  return posed([{ role, geometry }], { turn: signed(random) * 0.1 });
}

/** A soft mound (mash, a scoop of milk ice, a rösti): a pool with height and soft bumps. */
function mound(role: string, random: () => number, r: number, height: number): FormPiece[] {
  const ph = [random() * 6, random() * 6, random() * 6];
  const geometry = pool({
    outline: wobble(r, [[3, 0.04, ph[0]], [5, 0.025, ph[1]]]),
    at: [0, 0],
    depth: height,
    edge: 0.75,
    floor: () => 0,
    bumps: (x, z, rn) => (0.18 * Math.sin(x * 2.1 + ph[2]) * Math.sin(z * 1.9 + ph[0]) + 0.1 * Math.sin(x * 4.3 + z * 1.7)) * (1 - rn * 0.5),
    rings: 26,
    segments: 80,
  });
  return [{ role, geometry: withFrame(geometry, false) }];
}

/** A fried egg: a round soft white and a domed yolk. */
function friedEgg(random: () => number): FormPiece[] {
  const white = pool({
    outline: wobble(4.2, [[2, 0.05, random() * 6], [3, 0.04, random() * 6], [5, 0.02, random() * 6]]),
    at: [0, 0],
    depth: 0.5,
    edge: 0.55,
    floor: () => 0,
    bumps: (x, z, rn) => 0.12 * Math.sin(x * 1.3 + 1) * Math.sin(z * 1.1 + 2) * (1 - rn),
    rings: 26,
    segments: 80,
  });
  const yolk = new SphereGeometry(1.45, 36, 22);
  yolk.scale(1, 0.62, 1);
  yolk.translate(0.35, 0.95, -0.1);
  return [
    { role: 'white', geometry: withFrame(white, false) },
    { role: 'yolk', geometry: withFrame(yolk, false) },
  ];
}

/** A small crumble (cheese, butter): a lumpy little stone. */
function crumble(role: string, random: () => number): FormPiece[] {
  const g = new IcosahedronGeometry(0.6 + random() * 0.25, 1);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + signed(random) * 0.18;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.75, pos.getZ(i) * k);
  }
  return [{ role, geometry: withFrame(g.toNonIndexed(), false) }];
}

/**
 * A garnish shaving (the user, 2026-11-25: "sprinkle some bits of yellow, golden and white shavings
 * as garnish"): a thin, irregular flake of 3 to 9 mm, lying flat, its foot at y = 0.
 */
export function shaving(role: string, random: () => number): FormPiece {
  const r = 0.16 + random() * 0.28;
  const g = new IcosahedronGeometry(r, 0);
  const pos = g.getAttribute('position');
  const sx = 1 + random() * 0.6;
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + signed(random) * 0.25;
    pos.setXYZ(i, pos.getX(i) * k * sx, pos.getY(i) * 0.22 + r * 0.22, pos.getZ(i) * k * 0.7);
  }
  return { role, geometry: withFrame(g.toNonIndexed(), false) };
}

/** A pantry form at real size, its roles renamed for the dish. */
function pantry(pieces: FormPiece[], names: Record<string, string>): FormPiece[] {
  return inCm(pieces)
    .filter((p) => names[p.role])
    .map((p) => ({ ...p, role: names[p.role] }));
}

/** A herb fleck: a tiny leaf lying flat. */
export function herbLeaf(random: () => number): FormPiece {
  return {
    role: 'herb',
    doubleSided: true,
    geometry: leafPiece({ base: new Vector3(0, 0.02, 0), turn: random() * Math.PI * 2, length: 0.34 + random() * 0.24, width: 0.15 + random() * 0.07, lift: () => 0.02, fold: 0.1, twist: 0, rows: 4, cols: 2 }),
  };
}

/**
 * Build one element. `role` is its first role from `elementLooks` (the others are fixed names).
 * Comes back resting on y = 0, its middle over the origin, at scale 1 (the caller scales it).
 */
export function makeElement(part: Part, random: () => number, seed: number): FormPiece[] {
  const { ingredient, form } = part;
  if (isComponent(ingredient)) return makeComponent(ingredient, form, random);
  const role = elementLooks(part, false)[0].role;
  switch (`${ingredient}:${form}`) {
    case 'salmon:fillet':
      // The approved cooked portion, its long side along z.
      return settle(posed([{ role, geometry: salmonFillet(seed, COOKED_PORTION) }], { turn: Math.PI / 2 }));
    case 'salmon:slice': {
      const field = boxField(1.7, 0.28, 3.75, 0.25);
      const wavy: Field = (x, y, z) => field(x, y - 0.18 * Math.sin(z * 0.9 + x * 0.4), z);
      const g = cutBody(wavy, [], { reach: 4.2, depth: 1, rounding: 0 });
      return settle([{ role, geometry: g }]);
    }
    case 'pepper:slice': {
      const field = boxField(0.65, 0.22, 3, 0.2);
      const bent: Field = (x, y, z) => field(x, y - 0.25 * Math.cos(x * 1.6) - 0.15 * Math.sin(z * 0.6), z);
      return settle([{ role, geometry: cutBody(bent, [], { reach: 3.4, depth: 0.5, rounding: 0 }) }]);
    }
    case 'cheese:slice': {
      const field = boxField(2, 0.25, 2.5, 0.2);
      return settle([{ role, geometry: cutBody(field, [], { reach: 3, depth: 0.5, rounding: 0 }) }]);
    }
    case 'steak:steak':
      return settle(slicedSteak(role, random));
    case 'potato:wedge':
      return settle(posed(cutElement(part, role, random), { scale: 0.68 }));
    case 'pepper:strip':
      return settle([{ role, geometry: pepperStrip(random) }]);
    case 'pepper:half':
      return settle(pepperHalf(role, random));
    case 'chicken:slice':
      return settle(slicedBreast(role, random));
    case 'chicken:torn':
      return settle([{ role, geometry: tornChicken(random) }]);
    case 'chicken:drumstick':
      return settle(pantry(buildChicken({ state: 'whole', seed }), { meat_glow: 'chicken_meat_glow', knuckle: 'knuckle' }));
    case 'potato:whole':
      return settle(pantry(buildPotato({ state: 'whole', seed }), { skin: role }));
    case 'broccoli:whole':
      return settle(posed(pantry(buildBroccoli({ state: 'whole', seed }), { florets: 'broccoli_florets', stalk: 'broccoli_stalk', leaf: 'broccoli_leaf' }), { scale: 0.5 }));
    case 'cheese:wedge':
      return settle(posed(pantry(buildCheese({ state: 'whole', seed }), { cheese: 'cheese_body', rind: 'cheese_rind' }), { scale: 0.75 }));
    case 'eggs:egg':
      return settle(friedEgg(random));
    case 'blueberries:berry':
      return settle([{ role, geometry: withFrame(oneBlueberry(random), false) }]);
    case 'grapes:berry': {
      const g = new SphereGeometry(1, 28, 20);
      g.scale(0.95 + random() * 0.1, 1.15, 0.95);
      g.rotateZ(Math.PI / 2 + signed(random) * 0.4);
      return settle([{ role, geometry: withFrame(g, true) }]);
    }
    case 'mushroom:half':
    case 'mushroom:slice': {
      const { geometry } = mushroomUpright(0.62 + random() * 0.14, seed % 97, random);
      let m: FormPiece[] = [{ role: 'mushroom', geometry }];
      m = cutPieces(m, knife(new Vector3(0, 0, form === 'slice' ? 0.25 : 0), new Vector3(0, 0, 1)), 'mushroomCut', 'radial');
      if (form === 'slice') m = cutPieces(m, knife(new Vector3(0, 0, -0.25), new Vector3(0, 0, -1)), 'mushroomCut', 'radial');
      return settle(posed(m, { tip: -Math.PI / 2 }));
    }
    case 'spinach:leaf':
    case 'cabbage:leaf': {
      const big = ingredient === 'cabbage';
      const g = leafPiece({ base: new Vector3(0, 0.05, -3), turn: Math.PI / 2, length: big ? 7 : 6.2, width: big ? 5.5 : 3.4, lift: (d) => 0.5 * (d / (big ? 7 : 6.2)) ** 2 + 0.08, fold: big ? 0.5 : 0.35, twist: signed(random) * 0.2, rows: 10, cols: 6 });
      return settle([{ role, geometry: g, doubleSided: true }]);
    }
    case 'onion:wheel': {
      // A single ring of red onion: a soft band, paler inside, magenta at its edge.
      const R = 1.6 + random() * 1.1;
      const field: Field = (x, y, z) => Math.hypot(Math.hypot(x, z) - R, y / 0.8) - 0.2;
      const g = cutBody(field, [], { reach: R + 0.4, depth: 0.2, rounding: 0 });
      const pos = g.getAttribute('position');
      const uv = g.getAttribute('uv') as BufferAttribute;
      for (let i = 0; i < pos.count; i++) uv.setX(i, Math.min(1.2, 0.5 + Math.max(0, Math.hypot(pos.getX(i), pos.getZ(i)) - R + 0.2) * 2));
      return settle([{ role, geometry: g }]);
    }
    case 'cheese:crumble':
    case 'butter:crumble':
      return settle(crumble(role, random));
    case 'potato:fries': {
      // One thick-cut fry: a square baton about 1.2 cm across, 6 to 8 cm long, a slight bend.
      const half = 3 + random() * 1;
      const t = 0.55 + random() * 0.1;
      const baton = boxField(t, t, half, 0.22);
      const bend = signed(random) * 0.05;
      const bent: Field = (x, y, z) => baton(x - bend * z * z, y, z);
      return settle([{ role, geometry: cutBody(bent, [], { reach: half + 0.5, depth: 0.6, rounding: 0 }) }]);
    }
    case 'garlic:chip': {
      // A thin slice of a clove, crisp and slightly curled.
      const a2 = 0.75 + random() * 0.2;
      const field: Field = (x, y, z) => Math.max(Math.hypot(x / a2, z / (a2 * 0.72)) - 1, Math.abs(y - 0.12 * (x * x)) - 0.07);
      return settle([{ role, geometry: cutBody(field, [], { reach: 1.1, depth: 0.1, rounding: 0 }) }]);
    }
    case 'butter:cube': {
      const g = cutBody(boxField(1.3, 0.8, 1.3, 0.3), [], { reach: 1.7, depth: 1, rounding: 0 });
      return settle([{ role, geometry: g }]);
    }
    case 'baguette:toast':
      return settle(toast(role, random, ingredient));
    case 'potato:mash':
      return mound(role, random, 4.5, 1.0);
    case 'milk:mash':
      return mound(role, random, 4.2, 2.4);
    case 'avocado:half': {
      const body = bodyField('avocado', random);
      const g = cutBody(body, [[new Vector3(0, 0, 1), 0]], { reach: 5.3, depth: 3, rounding: 0.3 });
      const pit = new SphereGeometry(1.5, 28, 18);
      pit.scale(1, 1.15, 0.85);
      pit.translate(0, -0.6, -0.15);
      const pieces = posed(
        [
          { role, geometry: g },
          { role: 'pit', geometry: withFrame(pit, false) },
        ],
        turnOnto(new Vector3(0, 0, 1), new Vector3(0, 1, 0)),
      );
      return settle(pieces);
    }
    case 'butter:cake': {
      // A round sponge, a little domed, its top a soft golden crust (cut level, so the inside shows pale at the rim).
      const field: Field = (x, y, z) => Math.max(Math.hypot(x, z) - 5, Math.abs(y) - 2.2) + 0.0;
      const soft: Field = (x, y, z) => roundBox(field(x, y, z), 0.5) + 0.06 * Math.sin(x * 1.7) * Math.sin(z * 1.9 + y);
      return settle([{ role, geometry: cutBody(soft, [], { reach: 5.8, depth: 2, rounding: 0 }) }]);
    }
    case 'butter:pastry': {
      // A tart shell: a thin round base and a fluted rim standing round it.
      const base: Field = (x, y, z) => Math.max(Math.hypot(x, z) - 7, Math.abs(y) - 0.35);
      const rim: Field = (x, y, z) => {
        const r = Math.hypot(x, z);
        const flute = 0.12 * Math.cos(Math.atan2(z, x + 1e-6) * 28);
        return Math.hypot(r - 6.7 - flute, Math.max(0, Math.abs(y - 0.5) - 0.6)) - 0.45;
      };
      const shell: Field = (x, y, z) => Math.min(base(x, y, z), rim(x, y, z)) - 0.05;
      return settle([{ role, geometry: cutBody(shell, [], { reach: 7.8, depth: 0.5, rounding: 0 }) }]);
    }
    case 'cheese:cake': {
      // A slice of cheesecake: a tall wedge of a round cake, its cut faces pale, its outside baked.
      const body: Field = (x, y, z) => roundBox(Math.max(Math.hypot(x, z) - 7, Math.abs(y) - 2.4), 0.25);
      const a = 0.55;
      const n1 = new Vector3(Math.sin(a), 0, -Math.cos(a));
      const n2 = new Vector3(Math.sin(a), 0, Math.cos(a));
      const g = cutBody(body, [[n1, 0], [n2, 0]], { reach: 7.6, depth: 2.4, rounding: 0.2 });
      return settle(bulgeToFront([{ role, geometry: g }]));
    }
    case 'eggs:omelette': {
      // A folded omelette: a soft half moon, plump in the middle, thin at its curved edge.
      const field: Field = (x, y, z) => Math.max(Math.hypot(x / 6, y / 1.3, z / 6) - 1, -z - 0.2) * 1.3;
      const g = cutBody(field, [], { reach: 6.5, depth: 1.2, rounding: 0 });
      return settle(posed([{ role, geometry: g }], { turn: Math.PI / 2 }));
    }
    case 'milk:pancake': {
      const field: Field = (x, y, z) => roundBox(Math.max(Math.hypot(x, z) - 6, Math.abs(y) - 0.4), 0.35) + 0.05 * Math.sin(x * 1.3 + z);
      const g = cutBody(field, [], { reach: 6.6, depth: 0.4, rounding: 0 });
      const pos = g.getAttribute('position');
      const uv = g.getAttribute('uv') as BufferAttribute;
      // Golden on top and underneath, pale round its edge.
      for (let i = 0; i < pos.count; i++) uv.setX(i, Math.min(1.2, Math.hypot(pos.getX(i), pos.getZ(i)) / 6));
      return settle([{ role, geometry: g }]);
    }
    case 'cabbage:roll': {
      // A stuffed cabbage leaf, rolled: a plump soft log, its leaf wrinkles running round it.
      const field: Field = (x, y, z) => {
        const along = Math.max(0, Math.abs(z) - 2.4);
        return Math.hypot(x, y, along) - 1.8 - 0.08 * Math.sin(z * 3 + x) - 0.05 * Math.sin(Math.atan2(y, x) * 5);
      };
      return settle([{ role, geometry: cutBody(field, [], { reach: 4.6, depth: 1.5, rounding: 0 }) }]);
    }
    case 'chicken:skewer':
    case 'steak:skewer':
    case 'salmon:skewer': {
      // A wooden skewer with pieces threaded along it, turn about, all at one height.
      const stick = new CylinderGeometry(0.18, 0.18, 24, 10);
      stick.rotateX(Math.PI / 2);
      stick.translate(0, 1.8, 0);
      const pieces: FormPiece[] = [{ role: 'skewer', geometry: withFrame(stick, false) }];
      const order = SKEWERS[ingredient];
      for (let k = 0; k < 6; k++) {
        const p = order[k % order.length];
        let el = makeElement(p, random, seed + k * 31);
        const size = p.form === 'berry' ? 2.8 : p.form === 'slice' ? 3.2 : 3.6;
        let ex = 0;
        for (const q of el) {
          q.geometry.computeBoundingBox();
          const b = q.geometry.boundingBox!;
          ex = Math.max(ex, b.max.x - b.min.x, b.max.z - b.min.z, b.max.y - b.min.y);
        }
        el = posed(el, { scale: size / Math.max(0.1, ex), turn: random() * 6, tip: signed(random) * 0.3 });
        // Centred on the stick: its middle at the stick's height.
        let minY = Infinity, maxY = -Infinity;
        for (const q of el) { q.geometry.computeBoundingBox(); minY = Math.min(minY, q.geometry.boundingBox!.min.y); maxY = Math.max(maxY, q.geometry.boundingBox!.max.y); }
        pieces.push(...posed(el, { at: [0, 1.8 - (minY + maxY) / 2, -9 + k * 3.6] }));
      }
      return settle(pieces);
    }
    case 'pepper:whole':
    case 'tomato:whole':
    case 'apple:whole':
    case 'pear:whole':
    case 'avocado:whole':
    case 'lemon:whole':
    case 'lime:whole': {
      // A whole fruit: its smooth body, painted all in its skin's colour.
      const body = bodyField(ingredient, random);
      const b = BODY[ingredient] ?? { r: 2.5, h: 2.5 };
      const g = cutBody(body, [], { reach: Math.max(b.r, b.long ?? b.h) * 1.1, depth: 1, rounding: 0 });
      const uv = g.getAttribute('uv') as BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, 1.3);
      return settle([{ role, geometry: g }]);
    }
    default:
      return settle(cutElement(part, role, random));
  }
}

/** The whole-plate parts: tableware's looks. */
export const PLATE_LOOK: Record<string, RoleLook> = {
  plate: { role: 'plate', family: 'porcelain', skin: { ...CERAMIC_SKIN, amount: 0.12, pale: '#ece8e2' } },
  bowl: { role: 'plate', family: 'porcelain', skin: { ...CERAMIC_SKIN, amount: 0.12, pale: '#ece8e2' } },
  slate: { role: 'plate', family: 'slate', skin: { ...CERAMIC_SKIN, pale: '#b9b1a4' } },
  board: { role: 'board', family: 'wood', skin: NO_SKIN },
  round: { role: 'board', family: 'wood', skin: NO_SKIN },
};

/** Sauces, bases and drinks: their family. */
export const BASE_FAMILY: Record<string, FamilyId> = {
  'pool:citrus-oil': 'citrus-oil',
  'pool:brown-butter': 'brown-butter',
  'pool:honey': 'honey',
  'pool:chili': 'chili-oil',
  'pool:tomato-sauce': 'tomato-sauce',
  'pool:cream': 'cream',
  'pool:herb-oil': 'herb-oil',
  'pool:berry-sauce': 'berry-sauce',
  'pool:cheese-sauce': 'cheese-sauce',
  'pool:jus': 'jus',
  'soup:potato': 'soup-potato',
  'soup:tomato': 'soup-tomato',
  'soup:pepper': 'drink-orange',
  'mash:potato': 'mash',
  'mash:risotto': 'cooked-rice',
  'leaves:cabbage': 'cabbage',
  'leaves:romaine': 'romaine',
  'leaves:spinach': 'spinach',
  'drink:avocado': 'avocado-flesh',
  'drink:strawberry': 'drink-pink',
  'drink:orange': 'drink-orange',
  'drink:blueberry': 'drink-purple',
  'drink:watermelon': 'drink-pink',
  'drink:tomato': 'drink-red',
  'drink:green': 'drink-green',
  'drink:grape': 'drink-pale',
  // Drinks from any juicable hero, and savoury glasses (the fix list, 2026-11-25).
  'drink:apple': 'drink-gold',
  'drink:pear': 'drink-pale',
  'drink:peach': 'drink-orange',
  'drink:lemon': 'drink-pale',
  'drink:lime': 'drink-green',
  'drink:pepper': 'drink-orange',
  'drink:spinach': 'drink-green',
  'drink:milk': 'cream',
  'drink:horchata': 'cream',
  'drink:consomme': 'drink-gold',
  'drink:bloody': 'drink-red',
  'pool:caramel': 'caramel',
  'pool:maple': 'maple',
  rice: 'cooked-rice',
};
