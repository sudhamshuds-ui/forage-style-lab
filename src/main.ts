import './style.css';
import './ui/panel.css';
import { Group, Vector2, Vector3 } from 'three';
import { defaultSettings } from './params';
import { applyPalette, findPalette } from './palettes';
import { Stage } from './scene/stage';
import { Background } from './scene/background';
import { Ground } from './scene/ground';
import { cameraAzimuth, frameSubject, outlinePoints } from './scene/framing';
import { StylizedLook } from './shading/stylizedMaterial';
import { EFFECT_STACK } from './shading/effects';
import type { FrameContext } from './shading/effect';
import { FAMILIES } from './ingredients/families';
import { REGISTRY, findIngredient, pickOther, type IngredientEntry } from './ingredients/registry';
import { createSubject, type Subject } from './ingredients/subject';
import { Painter, type PaintFrame } from './painting/painter';
import { ShuffleTransition } from './painting/transition';
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
};

/** Switch the room combo to the one the ingredient's colour family suggests (board 04). */
function applyRoom(entry: IngredientEntry): void {
  const room = findPalette(FAMILIES[entry.spec.family].rooms[0]);
  if (room) applyPalette(settings, room);
}

/**
 * Put an ingredient on stage: build its form, paint it with its family,
 * switch the room, and frame it from the starting view.
 *
 * The light cases from board 05 (cut-juicy, wet, pale, dark...) are not built
 * yet. When they are, `entry.spec.light_case` is read here, as small nudges
 * to glow, sheen, room and bounce.
 */
function showIngredient(entry: IngredientEntry): void {
  framed.remove(subject.group);
  subject.dispose();
  subject = createSubject(entry, look);
  framed.add(subject.group);
  shapeChanged = true;
  needsFraming = true;

  applyRoom(entry);
  pane.refresh();
  const name = document.getElementById('ingredient-name');
  if (name) name.textContent = entry.spec.name;
  canvas.setAttribute('aria-label', `3D view of the stylized ${entry.spec.name.toLowerCase()}`);
  stage.resetView();
  stage.invalidate();
}

/**
 * Shuffle ingredient. The painting is un-painted (smudged by brush strokes), then the
 * next card is painted in with big strokes: 1.6 seconds, see painting/transition.ts.
 * The same in both styles, since it works on the finished painting.
 *
 * With reduced motion it is a short fade instead: out, swap, back in.
 * Clicks during a swap are ignored, so swaps never stack.
 */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const FADE_MS = 200;
let swapping = false;

/** Paint the two stills (the card we leave, the card we arrive at) and get ready. */
function prepareTransition(next: IngredientEntry): void {
  // 1. A still of the painting on screen now (exactly what you see).
  update();
  painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame, transition.stillFrom);
  const strokeCell = painter.strokeCell(settings);
  const round = settings.brush.type === 'round' ? 1 : 0;
  // 2. Build, frame and paint the next ingredient behind the curtain. (Any pause while it
  //    builds is invisible: the screen still shows the last frame, the same as the still.)
  showIngredient(next);
  update();
  painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame, transition.stillTo);
  transition.begin(strokeCell, round);
}

function finishTransition(): void {
  transitioning = false;
  swapping = false;
  stage.unfreeze();
}

document.getElementById('btn-shuffle-ingredient')?.addEventListener('click', () => {
  if (swapping) return;
  swapping = true;
  const next = pickOther(subject.entry.spec.id);

  if (reducedMotion.matches) {
    card.classList.add('is-swapping');
    window.setTimeout(() => {
      showIngredient(next);
      // Wait one painted frame, so the new ingredient is there before the fade back in.
      requestAnimationFrame(() => {
        card.classList.remove('is-swapping');
        swapping = false;
      });
    }, FADE_MS);
    return;
  }

  prepareTransition(next);
  // 3. Play the transition; the live view comes back on its last frame.
  transitioning = true;
  stage.freeze((delta) => {
    if (transition.step(stage.renderer, delta)) finishTransition();
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
  const { scale, groundY } = frameSubject(outlinePoints(subject.group), stage.homeCamera);
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

  look.update(settings, context);
  background.update(settings, context);
  // Label mode in both styles: the playful strokes repaint the glazed painting.
  ground.update(settings.scene, context.lightDirection, true);
  stage.keyLight.castShadow = settings.scene.castShadow;
  stage.setIdleSpin(settings.scene.idleSpin, settings.scene.spinSpeed);
  updatePaintFrame();
}

stage.start(update, () => painter.render(stage.renderer, stage.scene, stage.camera, settings, paintFrame));

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
        filmstrip: (times = [0, 0.25, 0.5, 0.75, 0.95, 1.1, 1.25, 1.4, 1.6], to?: string) => {
          const next = (to && findIngredient(to)) || pickOther(subject.entry.spec.id);
          prepareTransition(next);
          const shots: string[] = [];
          let done = false;
          let index = 0;
          while (!done) {
            done = transition.step(stage.renderer, 1 / 60);
            while (index < times.length && transition.elapsed >= times[index] - 1e-6) {
              shots.push(stage.renderer.domElement.toDataURL('image/png'));
              index++;
            }
          }
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
