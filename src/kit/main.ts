import { EASE, gsap, prefersReducedMotion } from '../motion';
import '../style.css';
import '../ui/styleBar.css';
import '../kitchen/kitchen.css';
import './kit.css';
import { Color, Group, Mesh, Vector2, Vector3, type IUniform, type ShaderMaterial } from 'three';
import { DEFAULTS, defaultSettings } from '../params';
import { applyPalette, findPalette } from '../palettes';
import { Stage } from '../scene/stage';
import { Background, roomHorizonUv } from '../scene/background';
import { Ground } from '../scene/ground';
import { cameraAzimuth, contactHeight, frameSubject, outlinePoints } from '../scene/framing';
import { StylizedLook } from '../shading/stylizedMaterial';
import { EFFECT_STACK } from '../shading/effects';
import type { FrameContext } from '../shading/effect';
import { GLAZE_SKIN, NO_SKIN } from '../shading/effects/skinTexture';
import { FAMILIES, type FamilyId } from '../ingredients/families';
import { findIngredient, type IngredientEntry } from '../ingredients/registry';
import { createSubject, type Subject } from '../ingredients/subject';
import { finishPieces, type FormPiece } from '../ingredients/forms/kit/piece';
import { seedFromId } from '../ingredients/forms/kit/random';
import { cmToUnits } from '../ingredients/scale';
import { Painter, type PaintFrame } from '../painting/painter';
import { REVEAL_STARTS, ShuffleTransition, TRANSITION_SECONDS } from '../painting/transition';
import { mountStyleBar } from '../ui/styleBar';
import { paintLike } from '../randomize';
import { mixHex } from '../utils/colour';
import { CUTS, buildCut, type Cut } from './cuts';
import { HEATS, heatLook, heated, type Heat } from './heat';
import { SIZES, VESSELS, buildVessel, type Vessel, type VesselKind, type VesselSize } from './vessels';
import { mountKitPanel } from './panel';

/**
 * The Forage kit: the parts a dish is built from, tried out one ingredient at a time.
 *
 * One ingredient sits on a vessel. The side panel changes four things:
 *   vessel  a plate, a bowl or a board (vessels.ts)
 *   size    small, medium or large: a bigger vessel holds more
 *   cut     whole, sliced, diced, chopped or puree: the ingredient's form (cuts.ts)
 *   heat    frozen, raw, roasted, caramelized or burnt: its colour and surface (heat.ts)
 *
 * The page itself is the Style Lab's (the same room, painter and transition), and the card
 * carries the Style Lab's controls: New ingredient and the brush with its painters.
 *
 * Two things are on stage, like two layers in a pre-comp: the vessel, and the food resting on it.
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
  vessel: VesselKind;
  size: VesselSize;
  cut: Cut;
  heat: Heat;
}
const DEFAULT_STATE = { vessel: 'Plate', size: 'Medium', cut: 'Whole', heat: 'Raw' } as const;
const state: KitState = { ingredient: 0, ...DEFAULT_STATE };

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

/** One thing on stage (the vessel, or the food), with its own highlight spot and shadow settings. */
interface Part {
  subject: Subject;
  own: { anchor: IUniform<Vector3>; rimGlints: IUniform<number>; shadowMix: IUniform<number>; size: IUniform<number> };
  worldCentre: Vector3;
}
interface Scene {
  vessel: Part;
  food: Part;
}
let scene: Scene;

/** Give a subject its own copies of the values the shader shares between everything on stage. */
function asPart(subject: Subject): Part {
  const own: Part['own'] = { anchor: { value: new Vector3() }, rimGlints: { value: 1 }, shadowMix: { value: 1 }, size: { value: 1 } };
  subject.group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const material = object.material as ShaderMaterial;
    material.uniforms = { ...material.uniforms, uHighlightAnchor: own.anchor, uRimGlints: own.rimGlints, uShadowMix: own.shadowMix, uObjectSize: own.size };
  });
  return { subject, own, worldCentre: new Vector3() };
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

/** Build the vessel and the food for the current choices. */
function build(): Scene {
  const kit = KIT_INGREDIENTS[state.ingredient];
  const entry = findIngredient(kit.id)!;
  const def: Vessel = buildVessel(state.vessel, state.size);

  // The vessel: a bowl is painted by the glaze skin (pooled colour, a warm rim); a plate is plain
  // white china with a shine; a board is plain wood.
  const vesselSubject = createSubject(
    entryFor(`kit-${state.vessel}`, def.family, ['bowl'], () => finishPieces([{ role: 'bowl', geometry: def.geometry }]), {
      skin: def.glaze ? GLAZE_SKIN : NO_SKIN,
      matte: !def.glazed,
      shadowTint: 0.3,
    }),
    look,
  );
  if (def.glaze) {
    // The glaze's warm, unglazed rim.
    vesselSubject.group.traverse((object) => {
      if (object instanceof Mesh) ((object.material as ShaderMaterial).uniforms.uMelonPale.value as Color).set('#d98a3c');
    });
  }

  // The ingredient's colours after the heat: its skin, its flesh, and the two stirred together
  // (a puree). They are written into the kit's own working families just before building.
  const skinColours = heated(FAMILIES[entry.spec.family].colours, state.heat);
  const fleshColours = heated(FAMILIES[kit.flesh].colours, state.heat);
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
  const { crust, glossy } = heatLook(state.heat);
  const radius = Math.min(entry.spec.size_cm[0], entry.spec.size_cm[2]) / 2;

  let foodSubject: Subject;
  let lift = def.surface;
  if (state.cut === 'Whole') {
    // Whole: the pantry's own ingredient, one on a small vessel, two or three on bigger ones.
    // (A bowl takes one: two or three side by side pushed out through its wall.)
    const count = def.inner || state.size === 'Small' ? 1 : state.size === 'Medium' ? 2 : 3;
    if (entry.form === 'procedural-apple') {
      // The apple reads its colours from the settings (it is the hand-tuned one).
      Object.assign(settings.colour, heated(DEFAULTS.colour, state.heat));
      foodSubject = createSubject(entry, look);
    } else {
      const layout = count === 1 ? 'solo' : count === 2 ? 'cluster-2' : 'cluster-3';
      foodSubject = createSubject({ ...entry, spec: { ...entry.spec, family: 'kit-skin', layout }, matte: glossy ? false : entry.matte }, look);
    }
    // In a bowl a round thing settles down against the wall, not on the food line.
    if (def.inner) {
      let y = 1.2;
      while (y < def.surface && def.inner(y) < radius * 0.8) y += 0.2;
      lift = Math.max(1.15, y - radius * 0.28);
    }
  } else {
    const cut = state.cut;
    const seed = seedFromId(`${kit.id}-${cut}-${state.size}`);
    const family: FamilyId = cut === 'Puree' ? 'kit-mix' : 'kit-flesh';
    foodSubject = createSubject(
      entryFor(
        `kit-${kit.id}-${cut}`,
        family,
        ['flesh', 'skin@kit-skin'],
        () => {
          const shape = buildCut(cut, { radius, room: def.radius, holds: def.holds, seed });
          const pieces: FormPiece[] = [{ role: 'flesh', geometry: shape.flesh }];
          if (shape.skin) pieces.push({ role: 'skin', geometry: shape.skin });
          return finishPieces(pieces);
        },
        {
          // Cooked surfaces take the baked, blotchy texture; raw and frozen ones stay clean.
          skin: crust > 0 ? { kind: 'crust', size_mm: 3, amount: crust } : NO_SKIN,
          matte: !glossy && cut !== 'Puree',
          shadowTint: 0.45,
        },
      ),
      look,
    );
  }
  vesselSubject.update(settings, true);
  foodSubject.update(settings, true);
  foodSubject.group.position.set(0, cmToUnits(lift), 0);
  foodSubject.group.rotation.y = (foodSubject.turn * Math.PI) / 180;
  return { vessel: asPart(vesselSubject), food: asPart(foodSubject) };
}

function put(next: Scene): void {
  if (scene) {
    framed.remove(scene.vessel.subject.group, scene.food.subject.group);
    scene.vessel.subject.dispose();
    scene.food.subject.dispose();
  }
  scene = next;
  framed.add(scene.vessel.subject.group, scene.food.subject.group);
  // The room is the ingredient's own, whatever is done to it.
  const room = findPalette(FAMILIES[findIngredient(KIT_INGREDIENTS[state.ingredient].id)!.spec.family].rooms[0]);
  if (room) applyPalette(settings, room);
  needsFraming = true;
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

/** Scale the layer so the vessel and its food fill the card's subject zone. */
function reframe(): void {
  framed.position.set(0, 0, 0);
  framed.rotation.set(0, cameraAzimuth(stage.homeCamera), 0);
  framed.scale.setScalar(1);
  framed.updateMatrixWorld(true);
  // Measured one at a time, each with plenty of points: sampled together, a detailed food left
  // the plate only a handful of points, its rim was missed and the view zoomed in too far.
  const points = [...outlinePoints(scene.vessel.subject.group, 1200), ...outlinePoints(scene.food.subject.group, 600)];
  const framing = frameSubject(points, stage.framingCamera);
  viewScale = framing.scale;
  groundY = contactHeight(stage.framingCamera);
}

function update(): void {
  const parts = [scene.vessel, scene.food];
  for (const part of parts) part.subject.update(settings, false);
  if (needsFraming) {
    reframe();
    needsFraming = false;
  }
  framed.scale.setScalar(viewScale);
  framed.position.set(0, groundY, 0);
  framed.updateMatrixWorld(true);
  ground.setHeight(groundY);

  // The two together: their middle and size, for the room's light and the paint pass.
  context.groundY = groundY;
  for (const part of parts) part.worldCentre.copy(part.subject.centre).applyMatrix4(part.subject.group.matrixWorld);
  context.objectCentre.copy(scene.vessel.worldCentre).add(scene.food.worldCentre).multiplyScalar(0.5);
  context.objectRadius = Math.max(
    ...parts.map((part) => part.worldCentre.distanceTo(context.objectCentre) + part.subject.radius * viewScale),
    0.2,
  );
  // Only the vessel touches the table.
  context.contacts = scene.vessel.subject.contacts.map(({ centre, radius }) => {
    const spot = centre.clone().applyMatrix4(scene.vessel.subject.group.matrixWorld);
    return new Vector3(spot.x, spot.z, radius * viewScale);
  });
  context.objectColours = scene.food.subject.colours(settings);
  context.lightDirection.copy(stage.updateLight(settings.light.direction));
  context.cameraPosition.copy(stage.camera.position);
  context.cameraRight.setFromMatrixColumn(stage.camera.matrixWorld, 0);
  context.rimGlints = true;
  context.shadowTint = 1;
  look.update(settings, context);
  for (const part of parts) {
    const radius = part.subject.radius * viewScale;
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

/** New ingredient: the Style Lab's painted transition to the next one, keeping the choices. */
const busyListeners = new Set<(busy: boolean) => void>();
function newIngredient(): void {
  if (swapping) return;
  state.ingredient = (state.ingredient + 1) % KIT_INGREDIENTS.length;
  if (prefersReducedMotion()) return crossfade(() => put(build()));
  swapping = true;
  for (const listener of busyListeners) listener(true);
  update();
  transition.begin(stage.renderer, painter.strokeCell(settings), settings.brush.type === 'round' ? 1 : 0, paintFrame.objectUv);
  let swapped = false;
  stage.takeOver((delta) => {
    if (!swapped && transition.progress >= REVEAL_STARTS) {
      swapped = true;
      put(build());
    }
    update();
    painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame, swapped ? transition.stillTo : transition.stillFrom);
    transition.setCentre(swapped ? 'to' : 'from', paintFrame.objectUv);
    if (transition.step(stage.renderer, delta)) {
      swapping = false;
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

mountKitPanel(
  document.getElementById('kit-panel') as HTMLElement,
  [
    { key: 'vessel', label: 'Vessel', options: VESSELS },
    { key: 'size', label: 'Size', options: SIZES },
    { key: 'cut', label: 'Cut', options: CUTS },
    { key: 'heat', label: 'Heat', options: HEATS },
  ],
  DEFAULT_STATE,
  (values) => {
    if (swapping) return;
    Object.assign(state, values);
    crossfade(() => put(build()));
  },
);

put(build());
stage.start(update, draw);
window.setTimeout(() => transition.warmUp(stage.renderer), 800);
reducedMotion.addEventListener('change', () => stage.invalidate());

// Handy while developing and for the render checks.
Object.assign(window, {
  kit: {
    state,
    stage,
    set: (values: Partial<KitState>) => {
      Object.assign(state, values);
      put(build());
    },
    snapshot: () => {
      update();
      draw();
      return stage.renderer.domElement.toDataURL('image/png');
    },
  },
});
