import './style.css';
import './ui/panel.css';
import { Vector2, Vector3 } from 'three';
import { defaultSettings } from './params';
import { Stage } from './scene/stage';
import { Background } from './scene/background';
import { Ground } from './scene/ground';
import { StylizedLook } from './shading/stylizedMaterial';
import { EFFECT_STACK } from './shading/effects';
import type { FrameContext } from './shading/effect';
import { Apple } from './ingredients/apple/apple';
import { Painter } from './painting/painter';
import { createPanel } from './ui/panel';
import { setupActions } from './ui/actions';

/**
 * Entry point: builds the scene, the painter, the panel and the buttons,
 * then runs the loop. Whenever something changes we copy the panel values
 * into the 3D scene and paint a new picture.
 */

const settings = defaultSettings();

const stage = new Stage(
  document.getElementById('canvas') as HTMLCanvasElement,
  document.getElementById('card') as HTMLElement,
);
const look = new StylizedLook(EFFECT_STACK);
const background = new Background();
const ground = new Ground();
const apple = new Apple(look);
const painter = new Painter();
stage.scene.add(background.mesh, ground.mesh, apple.group);
stage.onResize = (width, height) => painter.setSize(width, height);

// Rebuilding the shape is the only "heavy" job, so we only do it when a Shape value changed.
let shapeChanged = true;
const onSettingsChanged = (group?: string) => {
  if (!group || group === 'shape') shapeChanged = true;
  stage.invalidate();
};
const pane = createPanel(
  document.getElementById('palette') as HTMLElement,
  document.getElementById('pane') as HTMLElement,
  settings,
  onSettingsChanged,
);
setupActions(settings, pane, () => onSettingsChanged());

const context: FrameContext = {
  lightDirection: new Vector3(),
  cameraPosition: new Vector3(),
  cameraRight: new Vector3(),
  objectCentre: apple.centre,
  objectRadius: 1,
};

// The focal point: where the highlight sits, in screen coordinates (0..1).
// Small accent strokes gather around it.
const focus = new Vector2(0.5, 0.5);
const focusPoint = new Vector3();
const toCamera = new Vector3();

function update(): void {
  if (shapeChanged) {
    apple.rebuild(settings.shape);
    ground.setHeight(apple.bottomY);
    shapeChanged = false;
  }

  context.lightDirection.copy(stage.updateLight(settings.light.direction));
  context.cameraPosition.copy(stage.camera.position);
  context.cameraRight.setFromMatrixColumn(stage.camera.matrixWorld, 0);
  context.objectRadius = apple.radius;

  look.update(settings, context);

  toCamera.copy(context.cameraPosition).sub(apple.centre).normalize();
  focusPoint
    .copy(context.lightDirection)
    .add(toCamera)
    .normalize()
    .multiplyScalar(apple.radius)
    .add(apple.centre)
    .project(stage.camera);
  focus.set(focusPoint.x * 0.5 + 0.5, focusPoint.y * 0.5 + 0.5);

  apple.applyColours(settings.colour);
  background.update(settings.scene, stage.size);
  ground.update(settings.scene, context.lightDirection);
  stage.keyLight.castShadow = settings.scene.castShadow;
  stage.setIdleSpin(settings.scene.idleSpin, settings.scene.spinSpeed);
}

stage.start(update, () => painter.render(stage.renderer, stage.scene, stage.camera, settings, focus));

// Handy while developing: type `styleLab.settings` in the browser console to inspect values.
if (import.meta.env.DEV) {
  Object.assign(window, { styleLab: { settings, stage, redraw: () => onSettingsChanged() } });
}
