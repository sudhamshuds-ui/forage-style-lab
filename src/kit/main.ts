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
import { CUTS, HEAPS, buildCut, heapCount, heapMesh, isHeap, type Cut, type HeapMesh } from './cuts';
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

/** Build the ingredient for the current choices. */
function build(): Part[] {
  const kit = KIT_INGREDIENTS[state.ingredient];
  const entry = findIngredient(kit.id)!;

  // The ingredient's raw colours: its skin, its flesh, and the two stirred together (a puree).
  // They are written into the kit's own working families just before building. Heat is put on
  // afterwards, in place (applyHeat), so moving the heat slider never builds anything again.
  const skinColours = FAMILIES[entry.spec.family].colours;
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
  const radius = Math.min(entry.spec.size_cm[0], entry.spec.size_cm[2]) / 2;
  const parts: Part[] = [];

  if (state.prep === 'Whole') {
    // Whole: the pantry's own ingredient, one, two or three of it.
    const count = Math.min(3, state.quantity);
    if (entry.form === 'procedural-apple') {
      // The apple reads its colours from the settings (it is the hand-tuned one), and there is
      // only one of it: more are copies, each turned and sized a little differently, set in a
      // loose triangle so they just touch.
      const r = cmToUnits(radius * 1.04);
      const spots: [number, number, number, number][][] = [
        [[0, 0, 0, 1]],
        [[-r, r * 0.25, 0.5, 1], [r, -r * 0.25, -1.9, 0.94]],
        [[-r, r * 0.9, 0.5, 1], [r, r * 0.7, -1.9, 0.94], [r * 0.1, -r * 0.95, 2.6, 1.04]],
      ];
      for (const [x, z, turn, scale] of spots[count - 1]) {
        const part = asPart(createSubject(entry, look));
        part.subject.update(settings, true);
        part.subject.group.position.set(x, 0, z);
        part.subject.group.rotation.y = (part.subject.turn * Math.PI) / 180 + turn;
        part.subject.group.scale.setScalar(scale);
        part.scale = scale;
        parts.push(part);
      }
      return parts;
    }
    const layout = count === 1 ? 'solo' : count === 2 ? 'cluster-2' : 'cluster-3';
    parts.push(asPart(createSubject({ ...entry, spec: { ...entry.spec, family: 'kit-skin', layout }, }, look)));
  } else if (isHeap(state.prep)) {
    // Diced or chopped: the heap's pieces come from the physics, merged into two shapes.
    const kind = HEAPS[state.prep];
    if (!heap) heap = Heap.settled(heapCount(state.prep, HELPINGS[Math.min(HELPINGS.length, state.quantity) - 1]), kind.wedges);
    const shape = (heapShape = heapMesh(heap, kind.side));
    const part = asPart(
      createSubject(
        entryFor(
          `kit-${kit.id}-${state.prep}`,
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
    parts.push(part);
  } else {
    const cut = state.prep;
    const holds = HELPINGS[Math.min(HELPINGS.length, state.quantity) - 1];
    const seed = seedFromId(`${kit.id}-${cut}-${state.quantity}`);
    const family: FamilyId = cut === 'Puree' ? 'kit-mix' : 'kit-flesh';
    const part = asPart(
        createSubject(
          entryFor(
            `kit-${kit.id}-${cut}`,
            family,
            ['flesh', 'skin@kit-skin', 'cup@milk'],
            () => {
              // On the open table there is as much room as the helping needs.
              const shape = buildCut(cut, { radius, room: 5 + 5 * Math.sqrt(holds), holds, count: state.quantity, seed });
              const pieces: FormPiece[] = [{ role: 'flesh', geometry: shape.flesh }];
              if (shape.skin) pieces.push({ role: 'skin', geometry: shape.skin });
              if (shape.bottle) pieces.push({ role: 'cup', geometry: shape.bottle });
              return finishPieces(pieces);
            },
            {
              // Built raw and shiny: heat sets its texture and shine afterwards (applyHeat).
              // (A puree in its cup is smooth and shiny, and heat leaves it alone.)
              skin: cut === 'Puree' ? NO_SKIN : fleshSkin,
              matte: false,
              glossy: ['cup'],
              shadowTint: 0.45,
            },
          ),
          look,
        ),
      );
    // A puree in its cup is left as it is by the heat (the user, 2026-11-16).
    if (cut === 'Puree') part.fixed = true;
    else part.cut = true;
    parts.push(part);
  }
  for (const part of parts) {
    part.subject.update(settings, true);
    part.subject.group.rotation.y = (part.subject.turn * Math.PI) / 180;
  }
  return parts;
}

/** The heat the picture shows: it eases toward the slider's value (see the panel's onChange). */
const heatShown = { v: RAW };

/**
 * Heat, applied in place: every painted layer is recoloured from its raw colours, and cut
 * flesh also takes the baked texture and loses or gains its shine. Nothing is built again, so
 * moving the heat slider is instant (rebuilding everything for every stop was the lag).
 */
function applyHeat(parts: Part[], heat: number = heatShown.v): void {
  const { crust, glossy } = heatLook(heat);
  // The apple reads its colours from the settings (it is the hand-tuned one).
  Object.assign(settings.colour, heated(DEFAULTS.colour, heat));
  for (const part of parts) {
    if (part.fixed) continue;
    for (const layer of part.layers) {
      // A cup is not cooked.
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
 * How fast the drop plays against real time. Four physics steps a frame (four times real
 * time) read as "very fast" (the user, 2026-11-17); a touch quicker than real stays lively,
 * since real dice this small fall in a blink.
 */
const DROP_PACE = 1.4;
let dropClock = 0;
/** One frame of a drop: let the physics catch up with the clock, redraw, and stop once everything is at rest. */
function dropTick(_time: number, deltaMs: number): void {
  if (!dropping || !heap || !heapShape) return;
  // (A long frame counts as at most 50 ms, so a hiccup never makes the pieces jump.)
  dropClock += (Math.min(deltaMs, 50) / 1000) * DROP_PACE;
  let steps = 0;
  while (dropClock >= 1 / 60 && steps < 4) {
    dropClock -= 1 / 60;
    steps++;
  }
  const rested = heap.step(steps);
  if (steps > 0) heapShape.write();
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
  for (const part of scene) {
    framed.remove(part.subject.group);
    part.subject.dispose();
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
}

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
/**
 * A small swell when the quantity changes: the group eases up to its size from a little
 * smaller (more) or settles down from a little bigger (less).
 */
const swell = { k: 1 };

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
  for (const part of parts) part.subject.update(settings, false);
  if (needsFraming) {
    reframe();
    needsFraming = false;
  }
  framed.scale.setScalar(viewScale * swell.k);
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
        return new Vector3(spot.x, spot.z, radius * viewScale * part.scale);
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
  if (placePill && swell.k === 1) {
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
      return crossfade(() => put(build()));
    }
    if (change > 0) {
      heap.add(change);
      put(build(), true);
    } else {
      crossfade(() => {
        heap!.remove(-change);
        put(build(), true);
      }, 0.24);
    }
    return startDrop();
  }
  // More or less: the old picture dissolves into the new one over a third of a second, while
  // the group swells up to its size (more) or settles down to it (less). One motion, ease-out,
  // so it answers the click at once and lands softly. (A plain quick dissolve read as an
  // instant swap, the user, 2026-11-17.)
  crossfade(() => put(build()), 0.34);
  if (prefersReducedMotion()) return;
  gsap.killTweensOf(swell);
  gsap.fromTo(swell, { k: more ? 0.93 : 1.06 }, { k: 1, duration: 0.5, ease: EASE.out, onUpdate: () => stage.invalidate(), onComplete: () => stage.invalidate() });
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
    return crossfade(() => put(build()));
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
      put(build());
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
      return crossfade(() => put(build()));
    }
    // Heat only recolours what is there: the colours ease from the old heat to the new over
    // a third of a second, through the stops between, so you see it cook. Nothing is built.
    gsap.killTweensOf(heatShown);
    if (prefersReducedMotion()) {
      heatShown.v = state.heat;
      applyHeat(scene);
      return stage.invalidate();
    }
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
put(build());
stage.start(update, draw);
// While pieces are falling, the physics moves on every frame.
gsap.ticker.add(dropTick);
/*
 * The paint programs the kit switches between (cut flesh raw, baked, and plain), built ahead
 * in an idle moment. Each is built by the graphics chip the first time it is drawn, which took
 * over half a second: the pause on the first slice or dice and on the first move of the heat
 * slider. The tiny hidden meshes are kept, so their programs stay ready for reuse.
 */
function warmShaders(): void {
  const group = new Group();
  for (const skin of [fleshSkin, { kind: 'crust', size_mm: 3, amount: 1 }, NO_SKIN] as Skin[]) {
    const material = look.createMaterial();
    setSkin(material, skin);
    const mesh = new Mesh(new BoxGeometry(0.01, 0.01, 0.01), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  framed.add(group);
  // Compiled for the hidden image the scene is painted into (not the screen), as it is drawn.
  const before = stage.renderer.getRenderTarget();
  stage.renderer.setRenderTarget(painter.underpainting);
  const compiling = stage.renderer.compileAsync(group, stage.camera, stage.scene);
  stage.renderer.setRenderTarget(before);
  compiling.catch(() => undefined).then(() => framed.remove(group));
}
const whenIdle = (work: () => void, timeout: number) =>
  typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(work, { timeout }) : window.setTimeout(work, 0);
window.setTimeout(() => whenIdle(warmShaders, 2000), 900);
// The first heaps are worked out ahead, in idle moments, so choosing Diced or Chopped does not
// wait for the pieces to fall (Heap.settled remembers them).
window.setTimeout(() => {
  for (const cut of ['Diced', 'Chopped'] as const) whenIdle(() => Heap.settled(heapCount(cut, HELPINGS[0]), HEAPS[cut].wedges), 4000);
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
      if (values.prep !== undefined || values.ingredient !== undefined) dropHeap();
      Object.assign(state, values);
      heatShown.v = state.heat;
      showQuantity();
      put(build());
    },
    snapshot: () => {
      update();
      draw();
      return stage.renderer.domElement.toDataURL('image/png');
    },
  },
});
