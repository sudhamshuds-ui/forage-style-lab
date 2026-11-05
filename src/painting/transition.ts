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

/**
 * The whole transition, in seconds. 1.6 felt too fast (the user, 2026-11-05); every
 * phase is a share of this one number, so it can be retuned here alone.
 */
export const TRANSITION_SECONDS = 2.4;

/** When the reveal begins (share of the whole): the panel's name changes here too. */
export const REVEAL_STARTS = 0.45;

/**
 * The Shuffle ingredient transition: the painting is un-painted, then the next
 * card is painted in.
 *
 *   0%      The spin keeps turning throughout: each card is painted live while it
 *           is on stage (the next one goes on stage as the reveal begins).
 *   0-55%   Smudge. Big brush strokes sweep out from the ingredient in a wave,
 *           crossing each other, each dragging the paint along its path, until the
 *           ingredient melts into a smear of its own colours. The card softens.
 *   45-100% Reveal. The next card is painted in from the middle outward with
 *           crossing strokes, then smaller ones that fill the gaps. It arrives
 *           soft and sharpens over the last third.
 *   100%    The last frame is exactly the live picture, so the hand-back to the
 *           3D view is invisible and the spin simply carries on.
 * Each brush stroke eases in and out as it travels (it is movement on screen) and
 * takes about half a second, so it reads as a hand, not a snap.
 *
 * Both cards are painted by the Painter (whatever the style: refined or Playful
 * strokes), so the transition looks the same in both. It works only on flat
 * images, like a comp on two live plates.
 */
export class ShuffleTransition {
  /**
   * The painting we leave, and the one we arrive at. Both are repainted every frame
   * while their ingredient is on stage, so they keep spinning with the camera.
   */
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
        uT: { value: 0 },
        uSeconds: { value: TRANSITION_SECONDS },
        uCentre: { value: new Vector2(0.5, 0.5) },
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
        tFrom: { value: this.stillFrom.texture },
        tNext: { value: this.stillTo.texture },
        uResolution: { value: new Vector2(1, 1) },
        uT: { value: 0 },
        uSeconds: { value: TRANSITION_SECONDS },
        uCentre: { value: new Vector2(0.5, 0.5) },
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

  /**
   * Compile the transition's shaders ahead of time (once, after the app loads), so the
   * first Shuffle never stalls on its first frame while the graphics chip compiles them.
   */
  warmUp(renderer: WebGLRenderer): void {
    // Each pass exactly where it will really draw: the smudge into its hidden image, the
    // final mix onto the screen (a screen version is compiled separately, with the colour
    // conversion). The caller must repaint the live picture straight after, in the same
    // step, so this throwaway frame never shows.
    this.quad.material = this.smudgeMaterial;
    renderer.setRenderTarget(this.smudge[0]);
    renderer.render(this.scene, this.camera);
    this.quad.material = this.compositeMaterial;
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
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
   * painter on screen. The centres (0..1 screen) are where each card's ingredient
   * sits: the smudge and the reveal both spread out from there.
   */
  begin(renderer: WebGLRenderer, cell: number, round: number, centre: Vector2): void {
    this.setCentre('from', centre);
    this.setCentre('to', centre);
    // Start with an empty smear layer (no paint, no coverage).
    for (const target of this.smudge) {
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
    }
    this.time = 0;
    this.flip = 0;
    this.firstFrame = true;
    this.smudgeMaterial.uniforms.uCell.value = cell;
    this.smudgeMaterial.uniforms.uRound.value = round;
  }

  /** Where the ingredient sits on screen (0..1): the smudge and the reveal spread out from there. */
  setCentre(which: 'from' | 'to', centre: Vector2): void {
    const material = which === 'from' ? this.smudgeMaterial : this.compositeMaterial;
    (material.uniforms.uCentre.value as Vector2).copy(centre);
  }

  /** Seconds since the transition began. */
  get elapsed(): number {
    return this.time;
  }

  /** How far through the transition we are, 0..1. */
  get progress(): number {
    return Math.min(this.time / TRANSITION_SECONDS, 1);
  }

  /** Paint the next frame to the screen. Returns true once the transition has finished. */
  step(renderer: WebGLRenderer, delta: number): boolean {
    // The first frame may carry the time it took to build the next ingredient: skip it.
    this.time += this.firstFrame ? 0 : delta;
    const smudge = this.smudgeMaterial.uniforms;
    smudge.tPrev.value = this.smudge[this.flip].texture;
    smudge.uT.value = this.progress;
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
    composite.uT.value = this.progress;
    this.quad.material = this.compositeMaterial;
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);

    return this.time >= TRANSITION_SECONDS;
  }
}
