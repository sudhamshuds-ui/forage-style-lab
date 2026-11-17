import { EASE, gsap, prefersReducedMotion } from '../motion';
import '../style.css';
import '../ui/styleBar.css';
import '../kitchen/kitchen.css';
import './kit.css';
import { BoxGeometry, Group, Mesh, Vector2, Vector3, type IUniform, type ShaderMaterial } from 'three';
import { DEFAULTS, defaultSettings } from '../params';
import { applyPalette, findPalette } from '../palettes';
import { Stage } from '../scene/stage';
import { Background, roomHorizonUv } from '../scene/background';
import { Ground } from '../scene/ground';
import { cameraAzimuth, contactHeight, frameSubject, outlinePoints } from '../scene/framing';
import { StylizedLook, type Palette } from '../shading/stylizedMaterial';
import { EFFECT_STACK } from '../shading/effects';
import type { FrameContext } from '../shading/effect';
import { NO_SKIN, setSkin, type Skin } from '../shading/effects/skinTexture';
import { FAMILIES, type FamilyId } from '../ingredients/families';
import { findIngredient, type IngredientEntry } from '../ingredients/registry';
import { createSubject, type Subject } from '../ingredients/subject';
import { finishPieces, type FormPiece } from '../ingredients/forms/kit/piece';
import { seedFromId } from '../ingredients/forms/kit/random';
import { cmToUnits } from '../ingredients/scale';
import { MAX_CONTACTS } from '../scene/background';
import { Painter, type PaintFrame } from '../painting/painter';
import { REVEAL_STARTS, ShuffleTransition, TRANSITION_SECONDS } from '../painting/transition';
import { mountStyleBar } from '../ui/styleBar';
import { paintLike } from '../randomize';
import { mixHex } from '../utils/colour';
import { CUTS, HEAPS, cupSpots, cupUnit, heapCount, heapMesh, isHeap, sliceCount, sliceLayout, sliceUnit, type Cut, type HeapMesh } from './cuts';
import { Heap } from './tumble';
import { footprintSpots } from '../ingredients/layout';
import { UNITS_PER_CM } from '../ingredients/scale';
import { RAW, heatLook, heatName, heated } from './heat';
import { mountKitPanel } from './panel';

/**
 * The Forage kit: the parts a dish is built from, tried out one ingredient at a time.
 *
 * One ingredient sits on the table. Three things change it:
 *   prep      whole, sliced, diced, chopped or puree: its form (cuts.ts), in the side panel
 *   heat      a slider from frozen to burnt: its colour and surface (heat.ts), in the side panel
 *   quantity  less and more, on the card: a small stepper that shows above the ingredient
 *             while the pointer is over the card
 *
 * The page itself is the Style Lab's (the same room, painter and transition), and the card
 * carries the Style Lab's controls: New ingredient (which also puts the parameters back to
 * their starting values) and the brush with its painters.
 *
 * (Vessels, plates, bowls and boards, are built in vessels.ts and wait there: the user took
 * them off the page for now, "lets just have it on the floor", 2026-11-16.)
 */

/** The ingredients the kit starts with (round fruit and vegetables), and each one's flesh colour. */
const KIT_INGREDIENTS: { id: string; flesh: FamilyId }[] = [
  { id: 'apple', flesh: 'crumb' },
  { id: 'tomato', flesh: 'melon' },
  { id: 'orange', flesh: 'orange' },
  { id: 'pear', flesh: 'crumb' },
  { id: 'potato', flesh: 'butter' },
  { id: 'lemon', flesh: 'butter' },
  { id: 'peach', flesh: 'pear' },
  { id: 'onion', flesh: 'garlic' },
  { id: 'pepper', flesh: 'pepper' },
];

interface KitState {
  ingredient: number;
  prep: Cut;
  /** 0 to 100, frozen to burnt (25 is raw). */
  heat: number;
  /** How much: 1 to 3 whole ones, 1 to 5 helpings of a cut. */
  quantity: number;
}
const DEFAULT_STATE = { prep: 'Whole' as Cut, heat: RAW, quantity: 1 };
const state: KitState = { ingredient: 0, ...DEFAULT_STATE };
/** The most there can be, for the current prep. */
const mostOf = (prep: Cut) => (prep === 'Whole' ? 3 : 5);
/** How much a helping of a cut is, as a share of the middle one. */
const HELPINGS = [0.55, 1, 1.6, 2.3, 3.1];

const settings = defaultSettings();
const card = document.getElementById('card') as HTMLElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const stage = new Stage(canvas, card);
const look = new StylizedLook(EFFECT_STACK);
const background = new Background();
const ground = new Ground();
const framed = new Group();
const painter = new Painter();
const transition = new ShuffleTransition();
stage.scene.add(background.mesh, ground.mesh, framed);
let needsFraming = true;
let swapping = false;
stage.onResize = (width, height) => {
  painter.setSize(width, height);
  transition.setSize(width, height);
  needsFraming = true;
};

/** One thing on stage, with its own highlight spot and shadow settings. */
interface Part {
  subject: Subject;
  own: { anchor: IUniform<Vector3>; rimGlints: IUniform<number>; shadowMix: IUniform<number>; size: IUniform<number> };
  worldCentre: Vector3;
  /** Its own scale on the table (whole apples come in slightly different sizes). */
  scale: number;
  /**
   * For the heat: each of its painted layers as it is raw (its colours and its name), so heat
   * can recolour it in place without building anything again. `cut` marks a cut form (its
   * flesh also changes texture and shine with heat); `fixed` one that heat leaves alone.
   */
  layers: { name: string; raw: Palette; paint: { palette: Palette }; material: ShaderMaterial }[];
  cut: boolean;
  fixed: boolean;
  /**
   * Where it stands on the table, for a piece the page moves on its own (a whole fruit, a
   * slice, a cup). `lift` is how far above that spot it is right now: a piece dropping in or
   * lifting out. A heap has no pose (its pieces are moved by the physics).
   */
  pose?: Pose;
}

/** A piece's place on the table (scene units, real size): where, how far up, its turn, lean and size. */
interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  lean: number;
  scale: number;
  lift: number;
}
/** Everything on the table now: usually one subject; two or three for whole apples. */
let scene: Part[] = [];

/** Give a subject its own copies of the values the shader shares between everything on stage. */
function asPart(subject: Subject): Part {
  const own: Part['own'] = { anchor: { value: new Vector3() }, rimGlints: { value: 1 }, shadowMix: { value: 1 }, size: { value: 1 } };
  subject.group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const material = object.material as ShaderMaterial;
    material.uniforms = { ...material.uniforms, uHighlightAnchor: own.anchor, uRimGlints: own.rimGlints, uShadowMix: own.shadowMix, uObjectSize: own.size };
  });
  // The subject's own list of painted layers (one per mesh, in the same order).
  const painted = (subject as unknown as { painted?: { material: ShaderMaterial; palette: Palette }[] }).painted ?? [];
  const names: string[] = [];
  subject.group.traverse((object) => {
    if (object instanceof Mesh) names.push(object.name);
  });
  const layers = painted.map((paint, i) => ({ name: names[i] ?? '', raw: { ...paint.palette }, paint, material: paint.material }));
  return { subject, own, worldCentre: new Vector3(), scale: 1, layers, cut: false, fixed: false };
}

/** A made-up entry for something that is not a pantry ingredient (a vessel, a cut form). */
function entryFor(id: string, family: FamilyId, parts: string[], form: () => FormPiece[], extra: Partial<IngredientEntry>): IngredientEntry {
  return {
    spec: { id, name: id, archetype: 'contained', family, layout: 'solo', show: '', forms: ['whole'], scale: 'M', size_cm: [10, 10, 10], parts, notes: '' },
    form,
    turn: 0,
    skin: NO_SKIN,
    rimGlints: false,
    ...extra,
  };
}

/** The painted texture of raw cut flesh (dice, chopped, slices): never one flat colour. */
// (The peach's soft washes and blush: tried beside the potato's, the pear's, the crumb's and the
// apple's streaks, it gave the most colour without changing what the flesh is.)
let fleshSkin: Skin = { kind: 'peach', size_mm: 2, amount: 0.8 };

/*
 * The heap (diced or chopped): a small physics world that lives as long as its ingredient and
 * prep stay on the page, so adding to it drops new pieces onto the ones already lying there.
 * `heapShape` is the same heap as shapes to draw; while pieces are falling it is rewritten
 * every frame (`dropping`).
 */
let heap: Heap | null = null;
let heapShape: HeapMesh | null = null;
let dropping = false;
let dropFrames = 0;
/** True for the next re-framing only: ease to the new zoom instead of jumping. */
let easeFraming = false;

/** The heat the picture shows: it eases toward the slider's value (see the panel's onChange). */
const heatShown = { v: RAW };

/**
 * Heat, applied in place: every painted layer is recoloured from its raw colours, and cut
 * flesh also takes the baked texture and loses or gains its shine. Nothing is built again, so
 * moving the heat slider is instant (rebuilding three apples for every stop took half a second).
 */
function applyHeat(parts: Part[], heat: number = heatShown.v): void {
  const { crust, glossy } = heatLook(heat);
  // The apple reads its colours from the settings (it is the hand-tuned one).
  Object.assign(settings.colour, heated(DEFAULTS.colour, heat));
  for (const part of parts) {
    if (part.fixed) continue;
    for (const layer of part.layers) {
      // A cup or a board is not cooked.
      if (layer.name === 'cup') continue;
      const palette = heated(layer.raw, heat);
      if (part.cut && layer.name === 'flesh') {
        // Cut flesh: matte unless the heat makes it shine; baked and blotchy once it is cooked.
        if (!glossy) palette.highlight = mixHex(palette.highlight, palette.base, 0.65);
        // (Only a change of texture kind rebuilds the shader; the amount is just a value.)
        setSkin(layer.material, crust > 0.04 ? { kind: 'crust', size_mm: 3, amount: crust } : fleshSkin);
      }
      layer.paint.palette = palette;
    }
    part.subject.update(settings, false);
  }
}

/** Write the kit's working families (the ingredient's raw skin, flesh, and the two stirred together). */
function setKitFamilies(): { skin: Palette; flesh: Palette } {
  const kit = KIT_INGREDIENTS[state.ingredient];
  const skinColours = FAMILIES[findIngredient(kit.id)!.spec.family].colours;
  const fleshColours = FAMILIES[kit.flesh].colours;
  FAMILIES['kit-skin'] = { name: 'Kit skin', colours: skinColours, rooms: [] };
  FAMILIES['kit-flesh'] = { name: 'Kit flesh', colours: fleshColours, rooms: [] };
  FAMILIES['kit-mix'] = {
    name: 'Kit mix',
    colours: {
      lit: mixHex(fleshColours.lit, skinColours.lit, 0.3),
      base: mixHex(fleshColours.base, skinColours.base, 0.3),
      shadow: mixHex(fleshColours.shadow, skinColours.shadow, 0.3),
      glow: mixHex(fleshColours.glow, skinColours.glow, 0.3),
      highlight: fleshColours.highlight,
    },
    rooms: [],
  };
  return { skin: skinColours, flesh: fleshColours };
}

/** The ingredient now on the kit, its pantry entry, and half its width (cm). */
function ingredientNow() {
  const kit = KIT_INGREDIENTS[state.ingredient];
  const entry = findIngredient(kit.id)!;
  return { kit, entry, radius: Math.min(entry.spec.size_cm[0], entry.spec.size_cm[2]) / 2, seed: seedFromId(kit.id) };
}

/** Scale finished shapes from cm to scene units, keeping their middle where it is. */
function centred(pieces: FormPiece[]): FormPiece[] {
  for (const piece of pieces) {
    piece.geometry.scale(UNITS_PER_CM, UNITS_PER_CM, UNITS_PER_CM);
    piece.geometry.computeVertexNormals();
    piece.geometry.computeBoundingBox();
    piece.geometry.computeBoundingSphere();
  }
  return pieces;
}

/* ---------- Pieces that move on their own: whole fruit, slices, cups ---------- */

/** The preps whose pieces are moved one by one (the heaps move with the physics instead). */
type UnitPrep = 'Whole' | 'Sliced' | 'Puree';
const isUnits = (prep: Cut): prep is UnitPrep => prep === 'Whole' || prep === 'Sliced' || prep === 'Puree';

/** How many pieces a prep and quantity is: whole fruit, slices or cups. */
function unitCount(prep: UnitPrep, quantity: number): number {
  if (prep === 'Whole') return Math.min(3, quantity);
  if (prep === 'Sliced') return sliceCount(HELPINGS[Math.min(HELPINGS.length, quantity) - 1]);
  return quantity;
}

/**
 * Every piece made so far for this ingredient, by prep, in order: one, two or three apples are
 * the same first apples, just moved. Building a piece is the slow part (an apple takes about a
 * seventh of a second to carve), so each is made once and kept until the ingredient changes.
 */
const pools = new Map<UnitPrep, Part[]>();
const isPooled = (part: Part) => [...pools.values()].some((pool) => pool.includes(part));

/** Make piece number `index` of a prep, raw (heat is applied when it goes on the table). */
function makeUnit(prep: UnitPrep, index: number): Part {
  const { kit, entry, radius, seed } = ingredientNow();
  setKitFamilies();
  let part: Part;
  if (prep === 'Whole') {
    // The first is the pantry's own; the others are its variants (another seed, so another shape).
    const solo = { ...entry, spec: { ...entry.spec, id: index === 0 ? entry.spec.id : `${entry.spec.id}~${index}`, layout: 'solo' as const } };
    part = asPart(createSubject(solo, look));
  } else if (prep === 'Sliced') {
    const shape = sliceUnit(radius, index, seed);
    part = asPart(
      createSubject(
        entryFor(`kit-${kit.id}-slice-${index}`, 'kit-flesh', ['flesh', 'skin@kit-skin'], () => centred([{ role: 'flesh', geometry: shape.flesh }, { role: 'skin', geometry: shape.skin }]), {
          // Built raw and shiny: heat sets its texture and shine afterwards (applyHeat).
          skin: fleshSkin,
          matte: false,
          shadowTint: 0.45,
        }),
        look,
      ),
    );
    part.cut = true;
  } else {
    const shape = cupUnit(index, seed);
    part = asPart(
      createSubject(
        entryFor(`kit-${kit.id}-cup-${index}`, 'kit-mix', ['flesh', 'cup@milk'], () => finishPieces([{ role: 'flesh', geometry: shape.sauce }, { role: 'cup', geometry: shape.cup }]), {
          skin: NO_SKIN,
          matte: false,
          glossy: ['cup'],
          shadowTint: 0.45,
        }),
        look,
      ),
    );
    // A puree in its cup is left as it is by the heat (the user, 2026-11-16).
    part.fixed = true;
  }
  part.subject.update(settings, true);
  part.pose = { x: 0, y: 0, z: 0, yaw: 0, lean: 0, scale: 1, lift: 0 };
  return part;
}

/** The first `count` pieces of a prep, making any that are missing. */
function unitsFor(prep: UnitPrep, count: number): Part[] {
  let pool = pools.get(prep);
  if (!pool) pools.set(prep, (pool = []));
  while (pool.length < count) pool.push(makeUnit(prep, pool.length));
  return pool.slice(0, count);
}

/** Where each of `count` pieces of a prep stands (scene units). */
function posesFor(prep: UnitPrep, count: number): Omit<Pose, 'lift'>[] {
  const { entry, radius, seed } = ingredientNow();
  if (prep === 'Sliced') {
    return sliceLayout(radius, count, HELPINGS[Math.min(HELPINGS.length, state.quantity) - 1], seed).map((p) => ({
      x: cmToUnits(p.x),
      y: cmToUnits(p.y),
      z: cmToUnits(p.z),
      yaw: p.yaw,
      lean: p.lean,
      scale: 1,
    }));
  }
  if (prep === 'Puree') return cupSpots(count).map(([x, z]) => ({ x: cmToUnits(x), y: 0, z: cmToUnits(z), yaw: 0, lean: 0, scale: 1 }));
  // Whole: a loose triangle, far enough apart that they just touch, each turned and sized a
  // little differently.
  const r = cmToUnits((Math.max(entry.spec.size_cm[0], entry.spec.size_cm[2]) / 2) * 1.04);
  const spots: [number, number, number, number][][] = [
    [[0, 0, 0, 1]],
    [[-r, r * 0.25, 0.5, 1], [r, -r * 0.25, -1.9, 0.94]],
    [[-r, r * 0.9, 0.5, 1], [r, r * 0.7, -1.9, 0.94], [r * 0.1, -r * 0.95, 2.6, 1.04]],
  ];
  return spots[count - 1].map(([x, z, yaw, scale]) => ({ x, y: 0, z, yaw, lean: 0, scale }));
}

/** Put a piece where its pose says (called every frame). */
function setPose(part: Part): void {
  const pose = part.pose;
  if (!pose) return;
  const group = part.subject.group;
  group.position.set(pose.x, pose.y + pose.lift, pose.z);
  // A slice lies on its side: its turn round the table, then its lean toward its neighbour.
  group.rotation.order = 'YZX';
  group.rotation.set(0, (part.subject.turn * Math.PI) / 180 + pose.yaw, -pose.lean);
  group.scale.setScalar(pose.scale);
  part.scale = pose.scale;
}

/**
 * The heap (diced or chopped) as one piece; its pieces come from the physics, merged into two
 * shapes. Switching to a heap starts from the first helping (worked out ahead and remembered),
 * and any more of it is dropped in live, so the choice never waits for a settle.
 */
let heapExtra = 0;
function heapPart(prep: 'Diced' | 'Chopped', quantity: number): Part {
  const { kit } = ingredientNow();
  setKitFamilies();
  const kind = HEAPS[prep];
  if (!heap) {
    heap = Heap.settled(heapCount(prep, HELPINGS[0]), kind.wedges);
    heapExtra = heapCount(prep, HELPINGS[Math.min(HELPINGS.length, quantity) - 1]) - heap.pieces.length;
    if (heapExtra > 0) heap.add(heapExtra);
  }
  const shape = (heapShape = heapMesh(heap, kind.side));
  const part = asPart(
    createSubject(
      entryFor(
        `kit-${kit.id}-${prep}`,
        'kit-flesh',
        ['flesh', 'skin@kit-skin'],
        () => {
          const pieces: FormPiece[] = [{ role: 'flesh', geometry: shape.flesh }];
          if (shape.skin) pieces.push({ role: 'skin', geometry: shape.skin });
          return pieces;
        },
        // Built raw and shiny: heat sets its texture and shine afterwards (applyHeat).
        { skin: fleshSkin, matte: false, shadowTint: 0.45 },
      ),
      look,
    ),
  );
  // Its outline changes while pieces fall: never let the renderer skip it as "off screen".
  part.subject.group.traverse((object) => (object.frustumCulled = false));
  part.cut = true;
  part.subject.update(settings, true);
  return part;
}

/** Everything for a prep and quantity, at rest in its place. */
function partsFor(prep: Cut = state.prep, quantity: number = state.quantity): Part[] {
  if (!isUnits(prep)) return [heapPart(prep, quantity)];
  const units = unitsFor(prep, unitCount(prep, quantity));
  posesFor(prep, units.length).forEach((pose, i) => Object.assign(units[i].pose!, pose, { lift: 0 }));
  units.forEach(setPose);
  return units;
}

/** Make the next piece up in an idle moment, so pressing "more" does not have to wait. */
function prepareNext(): void {
  const prep = state.prep;
  const ingredient = state.ingredient;
  if (!isUnits(prep) || state.quantity >= mostOf(prep)) return;
  const want = unitCount(prep, state.quantity + 1);
  const job = () => {
    if (swapping || state.ingredient !== ingredient || state.prep !== prep) return;
    const pool = pools.get(prep) ?? [];
    if (pool.length >= want) return;
    unitsFor(prep, Math.min(want, pool.length + 2));
    // More still to make: carry on in the next idle moment.
    prepareNext();
  };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(job, { timeout: 2000 });
  else window.setTimeout(job, 400);
}

/** Another ingredient: every piece kept for the last one is thrown away (once off the table). */
function forgetReady(): void {
  for (const pool of pools.values()) for (const part of pool) if (!scene.includes(part)) part.subject.dispose();
  pools.clear();
}

/**
 * After the heap has moved (pieces fell, or were taken away): measure it again, so its
 * highlight, its contact shadows and the framing fit where it now lies.
 */
function refitHeap(): void {
  const part = scene[0];
  if (!part || !heapShape) return;
  const geometry = heapShape.flesh;
  const sphere = geometry.boundingSphere!;
  part.subject.centre.copy(sphere.center);
  part.subject.radius = sphere.radius * 0.88;
  // Contact shadows under what touches the table: the points of the heap lying lowest.
  const position = geometry.getAttribute('position');
  const low: Vector3[] = [];
  const reach = (HEAPS[state.prep as 'Diced' | 'Chopped']?.side ?? 1) * UNITS_PER_CM * 0.2;
  for (let i = 0; i < position.count; i += 3) if (position.getY(i) < reach) low.push(new Vector3().fromBufferAttribute(position, i));
  if (low.length >= 6) part.subject.contacts.splice(0, part.subject.contacts.length, ...footprintSpots(low, MAX_CONTACTS));
}

/**
 * One frame of a drop: let the physics run for as long as the frame took (a touch faster than
 * real time, 1.4 times), redraw, and stop once everything is at rest. (Four physics steps a
 * frame was "very fast", the user, 2026-11-17; time-based, it is the same pace on any screen.)
 */
const DROP_PACE = 1.4;
let dropClock = 0;
function dropTick(_time: number, deltaMs: number): void {
  if (!dropping || !heap || !heapShape) return;
  dropClock += Math.min(deltaMs, 50) / 1000 * DROP_PACE;
  let steps = 0;
  while (dropClock >= 1 / 60 && steps < 4) {
    dropClock -= 1 / 60;
    steps++;
  }
  const rested = heap.step(steps);
  heapShape.write();
  stage.invalidate();
  if (rested || ++dropFrames > 900) {
    dropping = false;
    refitHeap();
    // The view eases to fit the heap as it now is.
    easeFraming = true;
    needsFraming = true;
  }
}
function startDrop(): void {
  dropping = true;
  dropFrames = 0;
  dropClock = 0;
}

function put(next: Part[], keepFraming = false): void {
  // Anything still moving stops: the new arrangement is set at rest.
  for (const part of scene) if (part.pose) gsap.killTweensOf(part.pose);
  gsap.killTweensOf(viewTween);
  moving = 0;
  for (const part of scene) {
    framed.remove(part.subject.group);
    // (Pieces kept for this ingredient are only taken off the table, not thrown away.)
    if (!next.includes(part) && !isPooled(part)) part.subject.dispose();
  }
  scene = next;
  applyHeat(scene);
  for (const part of scene) framed.add(part.subject.group);
  // The room is the ingredient's own, whatever is done to it.
  const room = findPalette(FAMILIES[findIngredient(KIT_INGREDIENTS[state.ingredient].id)!.spec.family].rooms[0]);
  if (room) applyPalette(settings, room);
  // (While pieces are still in the air the view stays as it is; it re-frames once they land.)
  if (!keepFraming) needsFraming = true;
  stage.invalidate();
  prepareNext();
  // A heap just chosen with more than one helping: the rest drops in now.
  if (heapExtra > 0) {
    heapExtra = 0;
    startDrop();
  }
}

/*
 * How many pieces are moving right now (gliding, dropping in, lifting out): while any are,
 * the card is painted every frame.
 */
let moving = 0;
const moved = () => (moving = Math.max(0, moving - 1));

/** The zoom that fits these pieces at these poses (measured with them put there for a moment). */
function scaleFor(parts: Part[], poses: Omit<Pose, 'lift'>[]): number {
  const saved = parts.map((part) => ({ ...part.pose! }));
  parts.forEach((part, i) => {
    Object.assign(part.pose!, poses[i], { lift: 0 });
    setPose(part);
  });
  framed.position.set(0, 0, 0);
  framed.rotation.set(0, cameraAzimuth(stage.homeCamera), 0);
  framed.scale.setScalar(1);
  framed.updateMatrixWorld(true);
  const scale = frameSubject(
    parts.flatMap((part) => outlinePoints(part.subject.group, 900)),
    stage.framingCamera,
  ).scale;
  parts.forEach((part, i) => {
    Object.assign(part.pose!, saved[i]);
    setPose(part);
  });
  return scale;
}

/**
 * More or fewer whole fruit, slices or cups, as one movement (the choreograph skill: the
 * pieces are the lead, the zoom follows them):
 *   staying  glide to their new places (ease-in-out, 520 ms: they move across the table)
 *   new      drop in from above the card, one after another when there are several (a fruit or
 *            a slice falls, gravity's ease-in; a cup is set down, slowing as it lands)
 *   leaving  lift up and out, all together and quicker than the rest (exits are short)
 *   zoom     eases to fit what will be there, at the same time
 */
function changeUnits(prep: UnitPrep, prevQuantity: number, nextQuantity: number): void {
  const before = unitCount(prep, prevQuantity);
  const after = unitCount(prep, nextQuantity);
  const all = unitsFor(prep, Math.max(before, after));
  const staying = all.slice(0, Math.min(before, after));
  const entering = all.slice(before, after);
  const leaving = all.slice(after, before);
  const targets = posesFor(prep, after);
  const zoom = scaleFor(all.slice(0, after), targets);

  // Anything still moving from the last change stops where it is and carries on from there.
  for (const part of all) gsap.killTweensOf(part.pose!);
  moving = 0;

  // The new pieces start above the card: about two and a half of their own sizes up.
  const lift = (part: Part) => (part.subject.radius * 2.6 + 1.2) / (viewScale || 1);
  for (const part of entering) {
    Object.assign(part.pose!, targets[all.indexOf(part)], { lift: lift(part) });
    setPose(part);
    framed.add(part.subject.group);
  }
  applyHeat(entering);
  scene = [...staying, ...entering, ...leaving];
  placePill = false;

  const fall = prep === 'Puree' ? { ease: 'power2.out', duration: 0.6 } : { ease: 'power2.in', duration: 0.5 };
  staying.forEach((part, i) => {
    moving++;
    gsap.to(part.pose!, { ...targets[i], lift: 0, duration: 0.52, ease: 'power2.inOut', onComplete: moved });
  });
  entering.forEach((part, i) => {
    moving++;
    // Several (slices): one after another, 70 ms apart, the gaps shortening as they go.
    gsap.to(part.pose!, { lift: 0, duration: fall.duration, ease: fall.ease, delay: 0.08 + 0.07 * i * (1 - i * 0.03), onComplete: moved });
  });
  leaving.forEach((part) => {
    moving++;
    gsap.to(part.pose!, {
      lift: lift(part),
      duration: 0.36,
      ease: 'power2.in',
      onComplete: () => {
        moved();
        framed.remove(part.subject.group);
        scene = scene.filter((other) => other !== part);
      },
    });
  });
  // The zoom follows, the same length as the glide.
  gsap.killTweensOf(viewTween);
  viewTween.k = viewScale;
  moving++;
  gsap.to(viewTween, {
    k: zoom,
    duration: 0.6,
    ease: 'power2.inOut',
    onUpdate: () => (viewScale = viewTween.k),
    onComplete: () => {
      moved();
      // Settled: put the quantity pill where the new arrangement needs it.
      placePill = true;
    },
  });
  stage.invalidate();
  prepareNext();
}
/** The zoom while it eases (see `changeUnits`). */
const viewTween = { k: 1 };

/* ---------- Each frame ---------- */

const context: FrameContext = {
  lightDirection: new Vector3(),
  cameraPosition: new Vector3(),
  cameraRight: new Vector3(),
  objectCentre: new Vector3(),
  objectRadius: 1,
  groundY: -1,
  objectColours: DEFAULTS.colour,
  contacts: [],
};
const paintFrame: PaintFrame = { lightScreen: new Vector2(0, 1), objectUv: new Vector2(0.5, 0.5), objectRadius: 0.2, objectBase: DEFAULTS.colour.base, pieces: [], horizonUv: null };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const projected = new Vector3();
const projectedTop = new Vector3();
const projectedLight = new Vector3();
const view3 = new Vector3();
const half3 = new Vector3();
let viewScale = 1;
let groundY = 0;
/** True after a re-framing: the quantity pill is placed once, then stays put. */
let placePill = true;

/** Scale the layer so the ingredient fills the card's subject zone. */
function reframe(): void {
  framed.position.set(0, 0, 0);
  framed.rotation.set(0, cameraAzimuth(stage.homeCamera), 0);
  framed.scale.setScalar(1);
  framed.updateMatrixWorld(true);
  const points = scene.flatMap((part) => outlinePoints(part.subject.group, 900));
  const framing = frameSubject(points, stage.framingCamera);
  groundY = contactHeight(stage.framingCamera);
  placePill = true;
  gsap.killTweensOf(viewTween);
  if (easeFraming && !prefersReducedMotion()) {
    // After a drop: glide to the new zoom (a jump would undo the calm of the landing).
    easeFraming = false;
    const zoom = { k: viewScale };
    gsap.to(zoom, { k: framing.scale, duration: 0.6, ease: EASE.out, onUpdate: () => ((viewScale = zoom.k), stage.invalidate()) });
  } else {
    easeFraming = false;
    viewScale = framing.scale;
  }
}

function update(): void {
  const parts = scene;
  for (const part of parts) {
    setPose(part);
    part.subject.update(settings, false);
  }
  if (needsFraming) {
    reframe();
    needsFraming = false;
  }
  framed.scale.setScalar(viewScale);
  framed.position.set(0, groundY, 0);
  framed.updateMatrixWorld(true);
  ground.setHeight(groundY);

  // Everything together: its middle and size, for the room's light and the paint pass.
  context.groundY = groundY;
  context.objectCentre.set(0, 0, 0);
  for (const part of parts) {
    part.worldCentre.copy(part.subject.centre).applyMatrix4(part.subject.group.matrixWorld);
    context.objectCentre.add(part.worldCentre);
  }
  context.objectCentre.divideScalar(parts.length);
  context.objectRadius = Math.max(
    ...parts.map((part) => part.worldCentre.distanceTo(context.objectCentre) + part.subject.radius * viewScale * part.scale),
    0.2,
  );
  // Contact shadows: the floor takes four spots in all, shared out.
  const each = Math.max(1, Math.floor(MAX_CONTACTS / parts.length));
  context.contacts = parts.flatMap((part) =>
    [...part.subject.contacts]
      .sort((a, b) => b.radius - a.radius)
      .slice(0, each)
      .map(({ centre, radius }) => {
        const spot = centre.clone().applyMatrix4(part.subject.group.matrixWorld);
        // A piece in the air has no contact shadow; it grows back as the piece comes down.
        const grounded = part.pose ? Math.max(0, 1 - part.pose.lift / Math.max(0.05, part.subject.radius * 0.6)) : 1;
        return new Vector3(spot.x, spot.z, radius * viewScale * part.scale * grounded);
      }),
  );
  context.objectColours = parts[0].subject.colours(settings);
  context.lightDirection.copy(stage.updateLight(settings.light.direction));
  context.cameraPosition.copy(stage.camera.position);
  context.cameraRight.setFromMatrixColumn(stage.camera.matrixWorld, 0);
  context.rimGlints = true;
  context.shadowTint = 1;
  look.update(settings, context);
  for (const part of parts) {
    const radius = part.subject.radius * viewScale * part.scale;
    view3.copy(context.cameraPosition).sub(part.worldCentre).normalize();
    half3.copy(context.lightDirection).add(view3).normalize();
    part.own.anchor.value.copy(part.worldCentre).addScaledVector(half3, radius);
    part.own.rimGlints.value = settings.highlight.rimGlints && part.subject.entry.rimGlints !== false ? 1 : 0;
    part.own.shadowMix.value = (settings.lighting.shadowColour / 100) * (part.subject.entry.shadowTint ?? 1);
    part.own.size.value = radius;
  }
  background.update(settings, context);
  ground.update(settings.scene, context.lightDirection, true);
  stage.keyLight.castShadow = settings.scene.castShadow;
  stage.setIdleSpin(settings.scene.idleSpin && !reducedMotion.matches, settings.scene.spinSpeed);

  const centre = context.objectCentre;
  const radius = context.objectRadius;
  projected.copy(centre).project(stage.camera);
  projectedLight.copy(centre).addScaledVector(context.lightDirection, radius).project(stage.camera);
  paintFrame.lightScreen.set((projectedLight.x - projected.x) * stage.camera.aspect, projectedLight.y - projected.y);
  if (paintFrame.lightScreen.lengthSq() < 1e-6) paintFrame.lightScreen.set(0, 1);
  paintFrame.lightScreen.normalize();
  projectedTop.copy(centre).addScaledVector(stage.camera.up, radius).project(stage.camera);
  paintFrame.objectUv.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
  paintFrame.objectRadius = Math.abs(projectedTop.y - projected.y) * 0.5;
  paintFrame.objectBase = context.objectColours.base;
  paintFrame.horizonUv = roomHorizonUv(stage.camera, centre, radius, context.groundY);
  paintFrame.pieces = context.contacts.map((spot) => {
    const floor = new Vector3(spot.x, context.groundY, spot.y).project(stage.camera);
    const above = new Vector3(spot.x, context.groundY, spot.y).addScaledVector(stage.camera.up, spot.z).project(stage.camera);
    return new Vector3(floor.x * 0.5 + 0.5, floor.y * 0.5 + 0.5, Math.abs(above.y - floor.y) * 0.5);
  });

  // The quantity stepper sits just above the ingredient. It is placed once, when the ingredient
  // is framed, and then stays where it is: following the ingredient every frame made it
  // tremble as the view turned (the user, 2026-11-17: "it vibrates on rotation").
  if (placePill && moving === 0) {
    placePill = false;
    qty.style.left = '50%';
    qty.style.top = `${Math.min(0.8, Math.max(0.14, 1 - paintFrame.objectUv.y - paintFrame.objectRadius * 1.3)) * 100}%`;
  }
}

const draw = () => painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame);

/* ---------- Changing things ---------- */

/** A short dissolve from the picture as it was to the new one (the Style Lab's look change). */
const crossfadeLayer = document.createElement('canvas');
crossfadeLayer.className = 'card-crossfade';
crossfadeLayer.setAttribute('aria-hidden', 'true');
canvas.after(crossfadeLayer);
function crossfade(change: () => void, seconds = 0.26): void {
  if (!swapping && !prefersReducedMotion()) {
    update();
    draw();
    const source = stage.renderer.domElement;
    crossfadeLayer.width = source.width;
    crossfadeLayer.height = source.height;
    crossfadeLayer.getContext('2d')?.drawImage(source, 0, 0);
    gsap.killTweensOf(crossfadeLayer);
    gsap.fromTo(crossfadeLayer, { opacity: 1 }, { opacity: 0, duration: seconds, ease: EASE.fade });
  }
  change();
  stage.invalidate();
}

/** Forget the heap (another ingredient or prep is coming): the next one starts fresh. */
function dropHeap(): void {
  dropping = false;
  heap = null;
  heapShape = null;
}

/* The quantity stepper on the card. */
const qty = document.getElementById('qty') as HTMLElement;
const qtyLess = document.getElementById('qty-less') as HTMLButtonElement;
const qtyMore = document.getElementById('qty-more') as HTMLButtonElement;
const qtyCount = document.getElementById('qty-count') as HTMLElement;
function showQuantity(): void {
  qtyCount.textContent = String(state.quantity);
  qtyLess.disabled = state.quantity <= 1;
  qtyMore.disabled = state.quantity >= mostOf(state.prep);
}
function changeQuantity(by: number): void {
  if (swapping) return;
  const next = Math.min(mostOf(state.prep), Math.max(1, state.quantity + by));
  if (next === state.quantity) return;
  const more = next > state.quantity;
  state.quantity = next;
  showQuantity();
  // A heap (diced, chopped): the new pieces are let go above it and you watch them drop in and
  // tumble onto the ones already there (the user, 2026-11-17). Fewer: the last ones are taken
  // away and whatever leaned on them settles.
  if (isHeap(state.prep) && heap) {
    const change = heapCount(state.prep, HELPINGS[next - 1]) - heap.pieces.length;
    if (change === 0) return;
    if (prefersReducedMotion()) {
      // No falling: work the settle out at once and dissolve to it.
      if (change > 0) heap.add(change);
      else heap.remove(-change);
      for (let i = 0; i < 500 && !heap.step(1); i++);
      return crossfade(() => put(partsFor()));
    }
    if (change > 0) {
      heap.add(change);
      put(partsFor(), true);
    } else {
      crossfade(() => {
        heap!.remove(-change);
        put(partsFor(), true);
      }, 0.24);
    }
    return startDrop();
  }
  // Whole fruit, slices, cups: they move (changeUnits). With reduced motion, a short dissolve.
  if (prefersReducedMotion() || !isUnits(state.prep)) return crossfade(() => put(partsFor()), 0.24);
  changeUnits(state.prep, more ? next - 1 : next + 1, next);
}
qtyLess.addEventListener('click', () => changeQuantity(-1));
qtyMore.addEventListener('click', () => changeQuantity(1));

/**
 * New ingredient: the Style Lab's painted transition to the next one. The parameters go back
 * to their starting values with it (the user, 2026-11-16), as the next one is painted in.
 */
const busyListeners = new Set<(busy: boolean) => void>();
function resetChoices(): void {
  dropHeap();
  forgetReady();
  Object.assign(state, DEFAULT_STATE);
  gsap.killTweensOf(heatShown);
  heatShown.v = state.heat;
  panel.set({ prep: state.prep, heat: state.heat });
  showQuantity();
}
function newIngredient(): void {
  if (swapping) return;
  state.ingredient = (state.ingredient + 1) % KIT_INGREDIENTS.length;
  if (prefersReducedMotion()) {
    resetChoices();
    return crossfade(() => put(partsFor()));
  }
  swapping = true;
  card.toggleAttribute('data-busy', true);
  for (const listener of busyListeners) listener(true);
  update();
  transition.begin(stage.renderer, painter.strokeCell(settings), settings.brush.type === 'round' ? 1 : 0, paintFrame.objectUv);
  let swapped = false;
  stage.takeOver((delta) => {
    if (!swapped && transition.progress >= REVEAL_STARTS) {
      swapped = true;
      resetChoices();
      put(partsFor());
    }
    update();
    painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame, swapped ? transition.stillTo : transition.stillFrom);
    transition.setCentre(swapped ? 'to' : 'from', paintFrame.objectUv);
    if (transition.step(stage.renderer, delta)) {
      swapping = false;
      card.toggleAttribute('data-busy', false);
      for (const listener of busyListeners) listener(false);
      stage.release();
    }
  });
}

mountStyleBar(document.getElementById('bar-root') as HTMLElement, {
  shuffle: newIngredient,
  onBusy: (listener) => {
    busyListeners.add(listener);
    return () => busyListeners.delete(listener);
  },
  painterly: () => settings.brush.classic,
  painter: () => settings.brush.painter,
  setPainterly: (on) => crossfade(() => (settings.brush.classic = on), 0.22),
  setPainter: (id) =>
    crossfade(() => {
      Object.assign(settings.brush, paintLike(id));
      settings.brush.classic = true;
    }, 0.22),
  swapSeconds: TRANSITION_SECONDS,
});

const panel = mountKitPanel(document.getElementById('kit-panel') as HTMLElement, {
  preps: CUTS,
  defaults: { prep: DEFAULT_STATE.prep, heat: DEFAULT_STATE.heat },
  heatStep: 25,
  heatName,
  onChange: (values, what) => {
    if (swapping) return;
    // Another prep, or back to the start: any heap is forgotten. (Heat keeps it, still falling
    // if it was: the same pieces, only their colour changes.)
    if (what !== 'heat') dropHeap();
    state.prep = values.prep as Cut;
    state.heat = values.heat;
    if (what === 'reset') state.quantity = DEFAULT_STATE.quantity;
    // A prep with a lower limit (whole: three) brings the quantity down with it.
    state.quantity = Math.min(state.quantity, mostOf(state.prep));
    showQuantity();
    if (what !== 'heat') {
      gsap.killTweensOf(heatShown);
      heatShown.v = state.heat;
      return crossfade(() => put(partsFor()));
    }
    // Heat only recolours what is there: the colours ease from the old heat to the new over
    // a third of a second, through the stops between (raw, roasted, caramelized...), so you
    // see it cook. No copy of the painting is needed, so it costs nothing extra to show.
    if (prefersReducedMotion()) {
      heatShown.v = state.heat;
      applyHeat(scene);
      return stage.invalidate();
    }
    gsap.killTweensOf(heatShown);
    gsap.to(heatShown, {
      v: state.heat,
      duration: 0.34,
      ease: EASE.out,
      onUpdate: () => {
        applyHeat(scene);
        stage.invalidate();
      },
    });
  },
});

showQuantity();
put(partsFor());
stage.start(update, draw);
// While pieces are falling, the physics moves on every frame.
gsap.ticker.add(dropTick);
// While pieces glide, drop in or lift out, the card is painted every frame.
gsap.ticker.add(() => {
  if (moving > 0) stage.invalidate();
});
/*
 * The paint programs the kit switches between (cut flesh raw, baked, and plain), built ahead
 * in an idle moment. Each is built by the graphics chip the first time it is drawn, and that
 * took over half a second: it was the pause on the first slice and on moving the heat slider.
 * The small hidden meshes are kept (never disposed), so their programs stay ready for reuse.
 */
const warmed: Mesh[] = [];
function warmShaders(): void {
  const skins: Skin[] = [fleshSkin, { kind: 'crust', size_mm: 3, amount: 1 }, NO_SKIN];
  const group = new Group();
  for (const skin of skins) {
    const material = look.createMaterial();
    setSkin(material, skin);
    const mesh = new Mesh(new BoxGeometry(0.01, 0.01, 0.01), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    warmed.push(mesh);
  }
  framed.add(group);
  const before = stage.renderer.getRenderTarget();
  stage.renderer.setRenderTarget(painter.underpainting);
  const compiling = stage.renderer.compileAsync(group, stage.camera, stage.scene);
  stage.renderer.setRenderTarget(before);
  compiling.catch(() => undefined).then(() => framed.remove(group));
}
window.setTimeout(() => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(warmShaders, { timeout: 2000 });
  else warmShaders();
}, 900);

// The first heaps are worked out ahead, in idle moments after the page has settled, so
// choosing Diced or Chopped does not have to wait for the pieces to fall.
window.setTimeout(() => {
  const warm = (cut: 'Diced' | 'Chopped') => () => Heap.settled(heapCount(cut, HELPINGS[0]), HEAPS[cut].wedges);
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(warm('Diced'), { timeout: 3000 });
    window.requestIdleCallback(warm('Chopped'), { timeout: 5000 });
  }
}, 1500);
window.setTimeout(() => transition.warmUp(stage.renderer), 800);
reducedMotion.addEventListener('change', () => stage.invalidate());

// Handy while developing and for the render checks.
Object.assign(window, {
  kit: {
    state,
    stage,
    setFleshSkin: (skin: Skin) => (fleshSkin = skin),
    heat: (value: number) => {
      state.heat = heatShown.v = value;
      applyHeat(scene);
    },
    set: (values: Partial<KitState>) => {
      if (values.ingredient !== undefined && values.ingredient !== state.ingredient) forgetReady();
      if (values.prep !== undefined || values.ingredient !== undefined) dropHeap();
      Object.assign(state, values);
      heatShown.v = state.heat;
      showQuantity();
      put(partsFor());
    },
    snapshot: () => {
      update();
      draw();
      return stage.renderer.domElement.toDataURL('image/png');
    },
  },
});
