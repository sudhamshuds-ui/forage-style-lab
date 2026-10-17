import { DirectionalLight, PCFShadowMap, PerspectiveCamera, Quaternion, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Vec2 } from '../params';

/**
 * The stage: everything needed to show a 3D scene in the card.
 *
 *  - renderer: draws into the <canvas>
 *  - camera:   our point of view (a narrow lens, so the apple looks less distorted)
 *  - controls: drag to orbit, scroll to zoom, optional idle spin
 *  - keyLight: only used to cast the shadow on the floor. Our stylized shader
 *              does its own lighting from the same direction.
 *
 * The light stays in the room, like a window: its direction is set on the
 * light pad as seen from the starting view, and stays put as you orbit. Walk
 * round the apple and you see its shadow side, or the light coming from
 * behind it (backlit), and the shadow and window light stay on the table.
 *
 * Painting every frame is costly, so the stage only redraws when something
 * changed: the camera moved, the panel changed (invalidate) or the size changed.
 */
export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly keyLight: DirectionalLight;
  /** Current light direction in world space (points toward the light). */
  readonly lightDirection = new Vector3(0, 1, 0);
  /** Canvas size in CSS pixels. */
  readonly size = { width: 1, height: 1 };
  /** Called with the real pixel size whenever the canvas is resized. */
  onResize: (width: number, height: number) => void = () => {};

  private needsRender = true;
  /** The starting view's orientation. The light pad is read in this frame. */
  private readonly roomFrame = new Quaternion();
  private readonly bufferSize = new Vector2();

  constructor(canvas: HTMLCanvasElement, private readonly frame: HTMLElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;

    this.camera = new PerspectiveCamera(28, 3 / 4, 0.1, 150);
    this.camera.position.setFromSphericalCoords(8.6, (75 * Math.PI) / 180, (24 * Math.PI) / 180);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.2, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 5;
    // Stay inside the room (the sweep reaches 14 units out, see background.ts).
    this.controls.maxDistance = 11;
    this.controls.minPolarAngle = 0.08 * Math.PI;
    // Stop just above table height, so we never look up through the table.
    this.controls.maxPolarAngle = 0.49 * Math.PI;
    this.controls.update();
    this.camera.updateMatrixWorld();
    this.roomFrame.copy(this.camera.quaternion);

    this.keyLight = new DirectionalLight(0xffffff, 1);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.radius = 2;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.02;
    const shadowCamera = this.keyLight.shadow.camera;
    // Big enough for the long shadows of a low light.
    shadowCamera.left = -6;
    shadowCamera.right = 6;
    shadowCamera.top = 6;
    shadowCamera.bottom = -6;
    shadowCamera.near = 0.5;
    shadowCamera.far = 20;
    this.scene.add(this.keyLight, this.keyLight.target);

    new ResizeObserver(() => this.resize()).observe(frame);
  }

  private resize(): void {
    const width = Math.max(1, this.frame.clientWidth);
    const height = Math.max(1, this.frame.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.size.width = width;
    this.size.height = height;
    this.renderer.getDrawingBufferSize(this.bufferSize);
    this.onResize(this.bufferSize.x, this.bufferSize.y);
    this.invalidate();
  }

  /** Ask for a redraw on the next frame (call after any setting changes). */
  invalidate(): void {
    this.needsRender = true;
  }

  /**
   * Turn the light pad (x: left to right, y: down to up, as seen from the
   * starting view) into a world direction, and move the shadow light to match.
   */
  updateLight(pad: Vec2): Vector3 {
    // 0.5 = how much the light also comes from in front. Lower means more side light.
    this.lightDirection.set(pad.x, pad.y, 0.5).normalize().applyQuaternion(this.roomFrame);
    this.keyLight.position.copy(this.controls.target).addScaledVector(this.lightDirection, 8);
    this.keyLight.target.position.copy(this.controls.target);
    return this.lightDirection;
  }

  setIdleSpin(enabled: boolean, speed: number): void {
    this.controls.autoRotate = enabled;
    this.controls.autoRotateSpeed = (speed / 100) * 4;
  }

  /**
   * Start the loop. Each frame, if anything changed, `update` copies the
   * settings into the scene and `draw` paints the picture.
   */
  start(update: () => void, draw: () => void): void {
    this.resize();
    let last = performance.now();
    this.renderer.setAnimationLoop((now) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      const cameraMoved = this.controls.update(delta);
      if (!cameraMoved && !this.needsRender) return;
      this.needsRender = false;
      update();
      draw();
    });
  }
}
