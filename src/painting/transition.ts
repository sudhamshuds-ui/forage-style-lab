import {
  BufferGeometry,
  Float32BufferAttribute,
  HalfFloatType,
  Mesh,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { compositeFragmentShader, smudgeFragmentShader, transitionVertexShader } from './transitionShader';

/** The whole transition, in seconds (chosen by the user, 2026-11-05). */
export const TRANSITION_SECONDS = 1.6;

/**
 * The Shuffle ingredient transition: the painting is un-painted, then the next
 * card is painted in.
 *
 *   0.0 s   Freeze. The spin stops and the finished painting is kept as a still.
 *   0.0-1.0 Smudge. Brush strokes land on the still, a few at first and then
 *           faster, dragging the paint around until the ingredient melts into a
 *           smear of its own colours. The picture softens as it goes.
 *   0.8-1.6 Reveal. The next card is painted in with big sweeping strokes, then
 *           smaller ones that fill the gaps. It arrives soft and sharpens.
 *   1.6 s   The last frame is exactly the live picture, so the hand-back to the
 *           3D view is invisible, and the spin eases back in.
 *
 * Both stills are made by the Painter (whatever the style: refined or Playful
 * strokes), so the transition looks the same in both. It works only on flat
 * images, like a comp on two pre-rendered plates.
 */
export class ShuffleTransition {
  /** The painting we leave, and the one we arrive at. */
  readonly stillFrom: WebGLRenderTarget;
  readonly stillTo: WebGLRenderTarget;
  /** The smudge feedback loop: two images, read one while writing the other. */
  private readonly smudge: [WebGLRenderTarget, WebGLRenderTarget];
  private readonly smudgeMaterial: ShaderMaterial;
  private readonly compositeMaterial: ShaderMaterial;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera();
  private readonly quad: Mesh;
  private time = 0;
  private flip = 0;
  private firstFrame = true;

  constructor() {
    const make = () => new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false });
    this.stillFrom = make();
    this.stillTo = make();
    this.smudge = [make(), make()];

    this.smudgeMaterial = new ShaderMaterial({
      uniforms: {
        tPrev: { value: null },
        tStill: { value: this.stillFrom.texture },
        uResolution: { value: new Vector2(1, 1) },
        uTime: { value: 0 },
        uStep: { value: 1 },
        uCell: { value: 20 },
        uRound: { value: 0 },
      },
      vertexShader: transitionVertexShader,
      fragmentShader: smudgeFragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.compositeMaterial = new ShaderMaterial({
      uniforms: {
        tSmudge: { value: null },
        tNext: { value: this.stillTo.texture },
        uResolution: { value: new Vector2(1, 1) },
        uTime: { value: 0 },
      },
      vertexShader: transitionVertexShader,
      fragmentShader: compositeFragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.quad = new Mesh(geometry, this.smudgeMaterial);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Match the canvas, in real device pixels. */
  setSize(width: number, height: number): void {
    for (const target of [this.stillFrom, this.stillTo, ...this.smudge]) target.setSize(width, height);
    (this.smudgeMaterial.uniforms.uResolution.value as Vector2).set(width, height);
    (this.compositeMaterial.uniforms.uResolution.value as Vector2).set(width, height);
  }

  /**
   * Start, once both stills are painted. `cell` is the painter's stroke size (pixels),
   * `round` is 1 for round brushes (shorter dabs), so the smudge feels like the
   * painter on screen.
   */
  begin(cell: number, round: number): void {
    this.time = 0;
    this.flip = 0;
    this.firstFrame = true;
    this.smudgeMaterial.uniforms.uCell.value = cell;
    this.smudgeMaterial.uniforms.uRound.value = round;
  }

  /** Seconds since the transition began. */
  get elapsed(): number {
    return this.time;
  }

  /** Paint the next frame to the screen. Returns true once the transition has finished. */
  step(renderer: WebGLRenderer, delta: number): boolean {
    // The first frame may carry the time it took to build the next ingredient: skip it.
    this.time += this.firstFrame ? 0 : delta;
    const smudge = this.smudgeMaterial.uniforms;
    smudge.tPrev.value = this.firstFrame ? this.stillFrom.texture : this.smudge[this.flip].texture;
    smudge.uTime.value = this.time;
    smudge.uStep.value = this.firstFrame ? 1 : delta * 60;
    this.firstFrame = false;

    // 1. Smudge: read last frame, write this one.
    const write = this.smudge[1 - this.flip];
    this.quad.material = this.smudgeMaterial;
    renderer.setRenderTarget(write);
    renderer.render(this.scene, this.camera);
    this.flip = 1 - this.flip;

    // 2. Reveal, straight to the screen.
    const composite = this.compositeMaterial.uniforms;
    composite.tSmudge.value = write.texture;
    composite.uTime.value = Math.min(this.time, TRANSITION_SECONDS);
    this.quad.material = this.compositeMaterial;
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);

    return this.time >= TRANSITION_SECONDS;
  }
}
