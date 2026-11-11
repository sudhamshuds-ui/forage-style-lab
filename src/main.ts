import './style.css';
import './ui/panel.css';
import { Group, Mesh, Vector2, Vector3 } from 'three';
import { defaultSettings } from './params';
import { applyPalette, findPalette } from './palettes';
import { Stage } from './scene/stage';
import { Background, roomHorizonUv } from './scene/background';
import { Ground } from './scene/ground';
import { cameraAzimuth, frameSubject, outlinePoints } from './scene/framing';
import { StylizedLook } from './shading/stylizedMaterial';
import { EFFECT_STACK } from './shading/effects';
import type { FrameContext } from './shading/effect';
import { FAMILIES } from './ingredients/families';
import { REGISTRY, findIngredient, pickFresh, type IngredientEntry } from './ingredients/registry';
import { createSubject, type Subject } from './ingredients/subject';
import { PROPS } from './ingredients/forms/kit/checks';
import { Painter, type PaintFrame } from './painting/painter';
import { REVEAL_STARTS, ShuffleTransition } from './painting/transition';
import { createPanel } from './ui/panel';
import { setupActions } from './ui/actions';

/**
 * Entry point: builds the scene, the painter, the panel and the buttons,
 * then runs the loop. Whenever something changes we copy the panel values
 * into the 3D scene and paint a new picture.
 *
 * One ingredient is on stage at a time (the "subject"). It sits inside a
 * framing layer (`framed`), like a pre-comp: the layer turns the subject to
 * face the light and scales it to fill the card (scene/framing.ts), while
 * the subject itself stays at its real size.
 */

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
let transitioning = false;
stage.scene.add(background.mesh, ground.mesh, framed);
stage.onResize = (width, height) => {
  painter.setSize(width, height);
  transition.setSize(width, height);
  // Resizing mid-transition clears its images: jump straight to the live view.
  if (transitioning) finishTransition();
  needsFraming = true;
};

// Rebuilding the shape is the only "heavy" job, so we only do it when a Shape value changed.
let shapeChanged = true;
let needsFraming = true;
const onSettingsChanged = (group?: string) => {
  if (!group || group === 'shape') shapeChanged = true;
  stage.invalidate();
};
const pane = createPanel(
  document.getElementById('palette') as HTMLElement,
  document.getElementById('pane') as HTMLElement,
  settings,
  onSettingsChanged,
  () => actions.randomize(),
);
const actions = setupActions(settings, pane, () => onSettingsChanged(), {
  // Reset brings back the default style, but the room stays the one that suits this ingredient.
  afterReset: () => applyRoom(subject.entry),
});

let subject: Subject = createSubject(REGISTRY[0], look);
framed.add(subject.group);

const context: FrameContext = {
  lightDirection: new Vector3(),
  cameraPosition: new Vector3(),
  cameraRight: new Vector3(),
  objectCentre: new Vector3(),
  objectRadius: 1,
  groundY: -1,
  objectColours: subject.colours(settings),
  contacts: [],
};

const paintFrame: PaintFrame = {
  lightScreen: new Vector2(0, 1),
  objectUv: new Vector2(0.5, 0.5),
  objectRadius: 0.2,
  objectBase: context.objectColours.base,
  pieces: [],
  horizonUv: null,
};

/** Switch the room combo to the one the ingredient's colour family suggests (board 04). */
function applyRoom(entry: IngredientEntry): void {
  const room = findPalette(FAMILIES[entry.spec.family].rooms[0]);
  if (room) applyPalette(settings, room);
}

/** The ingredients shown lately, oldest first (Shuffle holds these back so they don't repeat soon). */
const shownRecently: string[] = [subject.entry.spec.id];

/**
 * The ingredient the first Shuffle goes to, for previews only: the preview page is built with
 * VITE_PREVIEW_NEXT set to the ingredient being worked on, so one click shows it. Vercel builds
 * main without it, so the main link always shuffles at random.
 */
let previewNext: string | undefined = import.meta.env.VITE_PREVIEW_NEXT || undefined;

/** The next ingredient for Shuffle: the preview's one first (once), then one not seen lately. */
function pickNext(): IngredientEntry {
  const wanted = previewNext ? findIngredient(previewNext) : undefined;
  previewNext = undefined;
  if (wanted && wanted.spec.id !== subject.entry.spec.id) return wanted;
  return pickFresh(shownRecently);
}

/**
 * Put an ingredient on stage: build its form, paint it with its family,
 * switch the room, and frame it from the starting view.
 *
 * The light cases from board 05 (cut-juicy, wet, pale, dark...) are not built
 * yet. When they are, `entry.spec.light_case` is read here, as small nudges
 * to glow, sheen, room and bounce.
 */
function showIngredient(
  entry: IngredientEntry,
  options: { nameLater?: boolean; keepView?: boolean; built?: Subject; disposeLater?: boolean } = {},
): void {
  // Remember it, so Shuffle won't bring it back until several others have been shown.
  shownRecently.push(entry.spec.id);
  if (shownRecently.length > 20) shownRecently.shift();
  framed.remove(subject.group);
  // Mid-transition, the old ingredient is only set aside: deleting its shapes and
  // materials can make the graphics chip stop and catch up (on Macs especially), which
  // paused the strokes and the spin. It is cleared away once the transition is over.
  if (options.disposeLater) retired.push(subject);
  else subject.dispose();
  // The Shuffle transition builds the next ingredient early and hands it over here.
  subject = options.built ?? createSubject(entry, look);
  framed.add(subject.group);
  // A prepared ingredient is already built to the current shape settings.
  shapeChanged = !options.built;
  needsFraming = true;

  applyRoom(entry);
  pane.refresh();
  if (!options.nameLater) setName(entry.spec.name);
  canvas.setAttribute('aria-label', `3D view of the stylized ${entry.spec.name.toLowerCase()}`);
  // The transition keeps the camera where the spin has taken it, so the turn never jumps.
  if (!options.keepView) stage.resetView();
  stage.invalidate();
}

/**
 * Shuffle ingredient. The painting is un-painted (smudged by brush strokes), then the
 * next card is painted in with big strokes (painting/transition.ts). The same in both
 * styles, since it works on the finished painting. The idle spin never stops: both
 * cards are painted live while they are on stage, and the new ingredient goes on
 * stage as the reveal begins, so the turn carries straight through.
 *
 * With reduced motion it is a short fade instead: out, swap, back in.
 * Clicks during a swap are ignored, so swaps never stack.
 */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const FADE_MS = 200;
let swapping = false;

/** The panel's ingredient name. */
const nameLabel = document.getElementById('ingredient-name');
function setName(text: string): void {
  if (nameLabel) nameLabel.textContent = text;
}

/**
 * Change the name with the picture: a quick soft fade out (100 ms), the new name,
 * and a fade back in, so the panel never names a card that is not on screen yet.
 */
function swapName(text: string): void {
  if (!nameLabel) return;
  nameLabel.classList.add('is-changing');
  window.setTimeout(() => {
    setName(text);
    nameLabel.classList.remove('is-changing');
  }, 100);
}

/** The swap in progress: the next ingredient (built at the click) and whether it is on stage yet. */
interface Swap {
  next: IngredientEntry;
  built: Subject;
  onStage: boolean;
}
let swap: Swap | null = null;

/**
 * A quick, invisible rehearsal: paint the next ingredient once into a hidden image, then
 * put the current one straight back. Everything that happens only the first time an
 * ingredient is drawn (compiling its materials for the graphics chip, uploading its
 * shape, its first shadows, measuring its framing) is paid here, at the click, instead
 * of halfway through the transition, where it froze the strokes and the spin.
 */
function rehearse(built: Subject): void {
  const leaving = subject;
  framed.remove(leaving.group);
  framed.add(built.group);
  subject = built;
  needsFraming = true;
  update();
  painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame, transition.stillTo);
  framed.remove(built.group);
  framed.add(leaving.group);
  subject = leaving;
  needsFraming = true;
  update();
}

/**
 * The next ingredient, prepared in the background while the current card just sits
 * spinning: picked, built, its materials compiled and rehearsed. A click on Shuffle
 * then starts at once, with nothing heavy left to do. Like pre-rendering the next shot.
 */
interface Prepared {
  next: IngredientEntry;
  built: Subject;
  /** True once the rehearsal has run (everything first-time is done). */
  ready: boolean;
}
let prepared: Prepared | null = null;
let preparing = false;
/** Dev only: how long the last background preparation took, step by step (ms). */
const prepTimes = { build: 0, compile: 0, rehearse: 0 };

/** Run a job when the browser is idle (between frames), or soon if it never is. */
function whenIdle(job: () => void, timeout = 1500): void {
  // Safari has no idle callback: a short timer is the next best thing.
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(job, { timeout });
  else window.setTimeout(job, 200);
}

/**
 * Prepare the next ingredient in the background, in small steps between frames:
 * 1. pick and build it, 2. compile its materials (without blocking the screen, where
 * the graphics driver allows), 3. the invisible rehearsal.
 */
function prepareNext(delay = 1000): void {
  if (preparing || prepared) return;
  preparing = true;
  window.setTimeout(() => {
    whenIdle(() => {
      if (transitioning) return void (preparing = false);
      let t = performance.now();
      const next = pickNext();
      const built = createSubject(next, look);
      built.update(settings, true);
      prepTimes.build = performance.now() - t;
      const job: Prepared = { next, built, ready: false };
      prepared = job;
      t = performance.now();
      stage.renderer
        .compileAsync(built.group, stage.camera, stage.scene)
        .catch(() => undefined)
        .then(() => {
          prepTimes.compile = performance.now() - t;
          whenIdle(() => {
            preparing = false;
            if (transitioning || prepared !== job) return;
            t = performance.now();
            rehearse(built);
            prepTimes.rehearse = performance.now() - t;
            job.ready = true;
          });
        });
    });
  }, delay);
}

/** Take the prepared ingredient if it is still a valid pick, otherwise build one now. */
function takePrepared(): { next: IngredientEntry; built: Subject; ready: boolean } {
  const job = prepared;
  prepared = null;
  if (job && job.next.spec.id !== subject.entry.spec.id) return job;
  job?.built.dispose();
  const next = pickNext();
  const built = createSubject(next, look);
  built.update(settings, true);
  return { next, built, ready: false };
}

/** Start a swap with the next ingredient (prepared in the background when possible). */
function beginSwap(next: IngredientEntry, built: Subject, ready: boolean): Swap {
  if (!ready) rehearse(built);
  update();
  transition.begin(stage.renderer, painter.strokeCell(settings), settings.brush.type === 'round' ? 1 : 0, paintFrame.objectUv);
  swap = { next, built, onStage: false };
  return swap;
}

/** Ingredients taken off stage mid-transition, waiting to be cleared away. */
const retired: Subject[] = [];
function clearRetired(): void {
  whenIdle(() => {
    if (transitioning) return clearRetired();
    retired.splice(0).forEach((old) => old.dispose());
  });
}

/** Put the next ingredient on stage (as the reveal begins), keeping the camera turning. */
function putOnStage(current: Swap): void {
  if (current.onStage) return;
  current.onStage = true;
  showIngredient(current.next, { nameLater: true, keepView: true, built: current.built, disposeLater: true });
}

/**
 * One frame of the transition: paint whichever card is on stage, live (so it keeps
 * spinning), into its hidden image, then let the transition mix the two.
 * Returns true once the transition has finished.
 */
/** Dev only: how long each transition frame took to prepare (ms), to spot stalls. */
const swapFrameTimes: number[] = [];

/**
 * The frame meter: add #perf to the page address, press Shuffle, and the card shows the
 * longest real frame of the transition (time between two painted frames, so it also
 * catches the graphics chip catching up) and where in the transition it happened.
 */
const perfMeter = location.hash === '#perf';
/**
 * Show the meter's readout on the card. Off (the user, 2026-11-05): with #perf the
 * result goes to the browser's developer console instead. Set true to see it on the card.
 */
const SHOW_FRAME_METER = false;
let lastFrameAt = 0;
let longestFrame = { ms: 0, at: 0 };

function swapFrame(current: Swap, delta: number): boolean {
  const began = performance.now();
  if (perfMeter) {
    if (lastFrameAt > 0 && began - lastFrameAt > longestFrame.ms) {
      longestFrame = { ms: began - lastFrameAt, at: transition.progress };
    }
    lastFrameAt = began;
  }
  if (!current.onStage && transition.progress >= REVEAL_STARTS) {
    putOnStage(current);
    swapName(current.next.spec.name);
  }
  update();
  const leaving = !current.onStage;
  painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame, leaving ? transition.stillFrom : transition.stillTo);
  transition.setCentre(leaving ? 'from' : 'to', paintFrame.objectUv);
  const finished = transition.step(stage.renderer, delta);
  if (import.meta.env.DEV) swapFrameTimes.push(performance.now() - began);
  return finished;
}

const shuffleButton = document.getElementById('btn-shuffle-ingredient');
/** While a swap plays the button looks busy, so an ignored click is never a mystery. */
function setBusy(busy: boolean): void {
  shuffleButton?.classList.toggle('is-busy', busy);
  shuffleButton?.setAttribute('aria-busy', String(busy));
}

function finishTransition(): void {
  // If the swap was cut short (a resize), the new ingredient still goes on stage.
  if (swap) putOnStage(swap);
  swap = null;
  transitioning = false;
  swapping = false;
  setName(subject.entry.spec.name);
  setBusy(false);
  stage.release();
  clearRetired();
  if (perfMeter) showFrameMeter();
  // Start preparing the one after, once this card has settled.
  prepareNext();
}

/** The frame meter's result (only with #perf): in the console, and on the card if switched on. */
function showFrameMeter(): void {
  const where = Math.round(longestFrame.at * 100);
  const text = `Longest frame: ${Math.round(longestFrame.ms)} ms, at ${where}% (swap at ${Math.round(REVEAL_STARTS * 100)}%)`;
  longestFrame = { ms: 0, at: 0 };
  lastFrameAt = 0;
  console.info(`[Shuffle] ${text}`);
  if (!SHOW_FRAME_METER) return;
  let readout = document.getElementById('frame-meter');
  if (!readout) {
    readout = document.createElement('p');
    readout.id = 'frame-meter';
    card.appendChild(readout);
  }
  readout.textContent = text;
}

shuffleButton?.addEventListener('click', () => {
  if (swapping) return;
  swapping = true;
  const { next, built, ready } = takePrepared();

  if (reducedMotion.matches) {
    card.classList.add('is-swapping');
    window.setTimeout(() => {
      showIngredient(next, { built });
      // Wait one painted frame, so the new ingredient is there before the fade back in.
      requestAnimationFrame(() => {
        card.classList.remove('is-swapping');
        swapping = false;
        prepareNext();
      });
    }, FADE_MS);
    return;
  }

  setBusy(true);
  const current = beginSwap(next, built, ready);
  // Play it; the name changes as the reveal begins, and the live view carries on from
  // the last frame, still spinning.
  transitioning = true;
  stage.takeOver((delta) => {
    if (swapFrame(current, delta)) finishTransition();
  });
});

/** Scale and place the framing layer so the subject fills the card's subject zone. */
function reframe(): void {
  // The registry's turn is measured from the camera: 0 shows the subject's front.
  const turn = cameraAzimuth(stage.homeCamera) + (subject.turn * Math.PI) / 180;
  // Measure the subject at its real size, turned as it will be: undo the rest of the framing first.
  framed.position.set(0, 0, 0);
  framed.rotation.set(0, turn, 0);
  framed.scale.setScalar(1);
  framed.updateMatrixWorld(true);
  // A prop (the butter's paper sheet) is not the subject: it only has to stay inside the card.
  const isProp = (mesh: Mesh) => PROPS.includes(mesh.name);
  const { scale, groundY } = frameSubject(
    outlinePoints(subject.group, 600, (mesh) => !isProp(mesh)),
    stage.homeCamera,
    outlinePoints(subject.group, 400, isProp),
  );
  framed.scale.setScalar(scale);
  framed.position.y = groundY;
  framed.updateMatrixWorld(true);
  ground.setHeight(groundY);
  context.groundY = groundY;
  context.objectCentre.copy(subject.centre).applyMatrix4(framed.matrixWorld);
  context.objectRadius = subject.radius * scale;
  // Each piece's contact spot on the floor: x, z and its radius, after the framing.
  context.contacts = subject.contacts.map(({ centre, radius }) => {
    const spot = centre.clone().applyMatrix4(framed.matrixWorld);
    return new Vector3(spot.x, spot.z, radius * scale);
  });
}

const projected = new Vector3();
const projectedTop = new Vector3();
const projectedLight = new Vector3();

/** Where the ingredient sits on screen, and which way the light comes from, for the glaze pass. */
function updatePaintFrame(): void {
  const centre = context.objectCentre;
  const radius = context.objectRadius;
  projected.copy(centre).project(stage.camera);
  // Which way the light comes from on screen: project a point a little toward the light.
  projectedLight.copy(centre).addScaledVector(context.lightDirection, radius).project(stage.camera);
  const aspect = stage.camera.aspect;
  paintFrame.lightScreen.set((projectedLight.x - projected.x) * aspect, projectedLight.y - projected.y);
  // Light straight toward or away from the camera has no clear screen direction: assume from above.
  if (paintFrame.lightScreen.lengthSq() < 1e-6) paintFrame.lightScreen.set(0, 1);
  paintFrame.lightScreen.normalize();

  projectedTop.copy(centre).addScaledVector(stage.camera.up, radius).project(stage.camera);
  paintFrame.objectUv.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
  // In screen heights: the NDC y range is 2 units tall.
  paintFrame.objectRadius = Math.abs(projectedTop.y - projected.y) * 0.5;
  paintFrame.objectBase = context.objectColours.base;
  // Where the wall meets the table on the card, found from the room (the strokes lie level there).
  paintFrame.horizonUv = roomHorizonUv(stage.camera, centre, radius, context.groundY);

  // Where each piece meets the table, on the card: its contact point and its size on screen.
  paintFrame.pieces = context.contacts.map((spot) => {
    const floor = new Vector3(spot.x, context.groundY, spot.y).project(stage.camera);
    const above = new Vector3(spot.x, context.groundY, spot.y).addScaledVector(stage.camera.up, spot.z).project(stage.camera);
    return new Vector3(floor.x * 0.5 + 0.5, floor.y * 0.5 + 0.5, Math.abs(above.y - floor.y) * 0.5);
  });
}

function update(): void {
  if (subject.update(settings, shapeChanged)) needsFraming = true;
  shapeChanged = false;
  if (needsFraming) {
    reframe();
    needsFraming = false;
  }

  context.lightDirection.copy(stage.updateLight(settings.light.direction));
  context.cameraPosition.copy(stage.camera.position);
  context.cameraRight.setFromMatrixColumn(stage.camera.matrixWorld, 0);
  context.objectColours = subject.colours(settings);
  context.rimGlints = subject.entry.rimGlints;
  context.shadowTint = subject.entry.shadowTint;

  look.update(settings, context);
  background.update(settings, context);
  // Label mode in both styles: the playful strokes repaint the glazed painting.
  ground.update(settings.scene, context.lightDirection, true);
  stage.keyLight.castShadow = settings.scene.castShadow;
  stage.setIdleSpin(settings.scene.idleSpin, settings.scene.spinSpeed);
  updatePaintFrame();
}

stage.start(update, () => painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame));
// Once the first frames are up, compile the Shuffle transition's shaders in the background.
window.setTimeout(() => {
  if (transitioning) return;
  transition.warmUp(stage.renderer);
  // The painter's "paint into a hidden image" versions, compiled now too (once), so the
  // first background rehearsal is light.
  update();
  painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame, transition.stillFrom);
  // Repaint the live picture over the warm-up frame at once, before the screen updates.
  update();
  painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame);
  prepareNext();
}, 500);

// Handy while developing: type `styleLab.settings` in the browser console to inspect values.
if (import.meta.env.DEV) {
  const snapshot = () => {
    update();
    painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame);
    return stage.renderer.domElement.toDataURL('image/png');
  };
  void import('./dev/checks').then(({ devChecks }) => {
    Object.assign(window, {
      styleLab: {
        settings,
        stage,
        redraw: () => onSettingsChanged(),
        /** Paint one frame right now and return it as an image URL (for comparing looks). */
        snapshot,
        /** The ingredient on stage now. */
        ingredient: () => subject.entry.spec,
        /**
         * Play the Shuffle transition frame by frame at a steady 60 fps (to the next
         * ingredient, or the one named) and return stills at the given seconds.
         */
        /** Milliseconds each frame of the last transition took to prepare (spot stalls). */
        swapFrameTimes: () => swapFrameTimes.slice(),
        /** How long the last background preparation took (ms), and whether one is ready. */
        prepared: () => ({ ...prepTimes, next: prepared?.next.spec.id ?? null, ready: prepared?.ready ?? false }),
        filmstrip: (times = [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4], to?: string) => {
          const next = (to && findIngredient(to)) || pickNext();
          swapFrameTimes.length = 0;
          const fresh = createSubject(next, look);
          fresh.update(settings, true);
          const current = beginSwap(next, fresh, false);
          const shots: string[] = [];
          let done = false;
          let index = 0;
          while (!done) {
            done = swapFrame(current, 1 / 60);
            while (index < times.length && transition.elapsed >= times[index] - 1e-6) {
              shots.push(stage.renderer.domElement.toDataURL('image/png'));
              index++;
            }
          }
          swap = null;
          setName(subject.entry.spec.name);
          stage.invalidate();
          return shots;
        },
        /** Put an ingredient on stage by id, e.g. styleLab.show('lemon'). */
        show: (id: string) => {
          const entry = findIngredient(id);
          if (!entry) throw new Error(`No ingredient "${id}". Try: ${REGISTRY.map((e) => e.spec.id).join(', ')}`);
          showIngredient(entry);
          return snapshot();
        },
        ...devChecks(stage, look, settings, () => subject, snapshot),
      },
    });
  });
}

/**
 * A small handle for the UI prototypes page (prototypes/ui.html): the live settings and a
 * redraw, so a prototype's own buttons can switch the style and the painter. The main page
 * never imports it.
 */
export const app = {
  settings,
  /** Pick the Shuffle transition's style (0 is the approved dry brush; see transition.ts). */
  setTransitionStyle: (style: number) => transition.setStyle(style),
  redraw: () => {
    pane.refresh();
    onSettingsChanged();
  },
};
