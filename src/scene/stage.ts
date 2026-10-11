import { DirectionalLight, PCFShadowMap, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Vec2 } from '../params';

/**
 * The stage: everything needed to show a 3D scene in the card.
 *
 *  - renderer: draws the scene into the <canvas>
 *  - camera:   our point of view (a narrow lens, so the apple looks less distorted)
 *  - controls: drag to orbit, scroll to zoom, optional idle spin
 *  - keyLight: only used to cast the shadow on the floor. Our stylized shader
 *              does its own lighting from the same direction.
 *
 * The light direction is defined relative to the camera, like a lamp fixed
 * to the painter's easel: as you orbit, the light stays on the same side of
 * the picture, so the composition always reads like the reference.
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

  constructor(canvas: HTMLCanvasElement, private readonly frame: HTMLElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;

    this.camera = new PerspectiveCamera(28, 3 / 4, 0.1, 100);
    this.camera.position.setFromSphericalCoords(10.5, (76 * Math.PI) / 180, (28 * Math.PI) / 180);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.15, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 18;
    this.controls.minPolarAngle = 0.08 * Math.PI;
    this.controls.maxPolarAngle = 0.53 * Math.PI;
    this.controls.update();

    this.keyLight = new DirectionalLight(0xffffff, 1);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.radius = 3;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.02;
    const shadowCamera = this.keyLight.shadow.camera;
    shadowCamera.left = -3;
    shadowCamera.right = 3;
    shadowCamera.top = 3;
    shadowCamera.bottom = -3;
    shadowCamera.near = 0.5;
    shadowCamera.far = 20;
    this.scene.add(this.keyLight, this.keyLight.target);

    new ResizeObserver(() => this.resize()).observe(frame);
    this.resize();
  }

  private resize(): void {
    const width = Math.max(1, this.frame.clientWidth);
    const height = Math.max(1, this.frame.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.size.width = width;
    this.size.height = height;
  }

  /**
   * Turn the panel's light pad (x: left to right, y: down to up) into a world
   * direction, and move the shadow light to match.
   */
  updateLight(pad: Vec2): Vector3 {
    // 0.5 = how much the light also comes from in front. Lower means more side light.
    this.lightDirection.set(pad.x, pad.y, 0.5).normalize().applyQuaternion(this.camera.quaternion);
    this.keyLight.position.copy(this.controls.target).addScaledVector(this.lightDirection, 8);
    this.keyLight.target.position.copy(this.controls.target);
    return this.lightDirection;
  }

  setIdleSpin(enabled: boolean, speed: number): void {
    this.controls.autoRotate = enabled;
    this.controls.autoRotateSpeed = (speed / 100) * 4;
  }

  /** Start the render loop. `onFrame` runs once per frame, before drawing. */
  start(onFrame: (deltaSeconds: number) => void): void {
    let last = performance.now();
    this.renderer.setAnimationLoop((now) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      this.controls.update(delta);
      onFrame(delta);
      this.renderer.render(this.scene, this.camera);
    });
  }
}
