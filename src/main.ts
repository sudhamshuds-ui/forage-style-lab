import './style.css';
import './ui/panel.css';
import { defaultSettings } from './params';
import { Stage } from './scene/stage';
import { Background } from './scene/background';
import { Ground } from './scene/ground';
import { StylizedLook } from './shading/stylizedMaterial';
import { EFFECT_STACK } from './shading/effects';
import { Apple } from './ingredients/apple/apple';
import { createPanel } from './ui/panel';
import { setupActions } from './ui/actions';

/**
 * Entry point: builds the scene, the panel and the buttons, then runs the
 * render loop. Each frame we copy the panel values into the 3D scene.
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
stage.scene.add(background.mesh, ground.mesh, apple.group);

// Rebuilding the shape is the only "heavy" job, so we only do it when a Shape value changed.
let shapeChanged = true;
const pane = createPanel(document.getElementById('pane') as HTMLElement, settings, (group) => {
  if (group === 'shape') shapeChanged = true;
});
setupActions(settings, pane, () => {
  shapeChanged = true;
});

stage.start(() => {
  if (shapeChanged) {
    apple.rebuild(settings.shape);
    ground.setHeight(apple.bottomY);
    shapeChanged = false;
  }

  // Cheap updates: done every frame so everything always matches the panel.
  const lightDirection = stage.updateLight(settings.light.direction);
  look.update(settings, lightDirection);
  apple.applyColours(settings.colour);
  background.update(settings.scene, stage.size);
  ground.update(settings.scene, lightDirection);
  stage.keyLight.castShadow = settings.scene.castShadow;
  stage.setIdleSpin(settings.scene.idleSpin, settings.scene.spinSpeed);
});
