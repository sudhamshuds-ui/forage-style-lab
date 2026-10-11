import {
  BufferGeometry,
  Camera,
  Color,
  Float32BufferAttribute,
  HalfFloatType,
  Mesh,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { BRUSHES, PATTERNS, type Settings } from '../params';
import { flowFragmentShader, flowVertexShader } from './flowShader';
import { paintFragmentShader, paintVertexShader } from './paintShader';

/**
 * The Painter turns the 3D render into a painting, in three steps:
 *
 *   1. Underpainting: render the 3D scene (flat tone bands, crisp highlights)
 *      into a hidden image instead of the screen.
 *   2. Flow: measure which way the edges run in that image (flowShader.ts).
 *   3. Paint: repaint it on screen with brush strokes (paintShader.ts).
 *
 * Think of it as a pre-comp in After Effects: the 3D scene is the source
 * layer, and the paint pass is an effect that works on the flattened result.
 */
export class Painter {
  private readonly sceneTarget: WebGLRenderTarget;
  private readonly flowTarget: WebGLRenderTarget;
  private readonly flowScene = new Scene();
  private readonly paintScene = new Scene();
  private readonly flowMaterial: ShaderMaterial;
  private readonly paintMaterial: ShaderMaterial;
  private readonly size = new Vector2(1, 1);

  constructor() {
    // Half-float colours keep smooth dark tones without banding. 4x anti-aliasing keeps edges clean.
    this.sceneTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    this.flowTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false });

    this.flowMaterial = new ShaderMaterial({
      uniforms: {
        tColour: { value: this.sceneTarget.texture },
        uTexel: { value: new Vector2() },
        uRadius: { value: 8 },
        uAspect: { value: 0.75 },
        uFalloff: { value: 0.5 },
        uFrame: { value: 1 },
        uSeed: { value: 0 },
      },
      vertexShader: flowVertexShader,
      fragmentShader: flowFragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.paintMaterial = new ShaderMaterial({
      uniforms: {
        tColour: { value: this.sceneTarget.texture },
        tFlow: { value: this.flowTarget.texture },
        uResolution: { value: new Vector2() },
        uObjectCell: { value: 40 },
        uBackdropCell: { value: 120 },
        uLength: { value: 1.5 },
        uPainterly: { value: 0.5 },
        uVariation: { value: 0.45 },
        uTexture: { value: 0.35 },
        uBrush: { value: 0 },
        uPattern: { value: 0 },
        uPatternAmount: { value: 0.5 },
        uHorizon: { value: 0.36 },
        uFrame: { value: 1 },
        uAccents: { value: 0 },
        uFalloff: { value: 0.5 },
        uCanvasColour: { value: new Color() },
        uFocus: { value: new Vector2(0.5, 0.5) },
        uSeed: { value: 0 },
      },
      vertexShader: paintVertexShader,
      fragmentShader: paintFragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.flowScene.add(fullScreenTriangle(this.flowMaterial));
    this.paintScene.add(fullScreenTriangle(this.paintMaterial));
  }

  /** Match the hidden images to the canvas size, in real device pixels. */
  setSize(width: number, height: number): void {
    this.size.set(width, height);
    this.sceneTarget.setSize(width, height);
    this.flowTarget.setSize(Math.max(1, Math.ceil(width / 4)), Math.max(1, Math.ceil(height / 4)));
  }

  /**
   * Paint one picture. `focus` is where small accent strokes gather, in
   * screen coordinates from 0 to 1 (usually the spot where the highlight sits).
   */
  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, settings: Settings, focus: Vector2): void {
    this.updateUniforms(settings);
    this.paintMaterial.uniforms.uFocus.value.copy(focus);

    // 1. Underpainting
    renderer.setRenderTarget(this.sceneTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    // 2. Flow
    renderer.setRenderTarget(this.flowTarget);
    renderer.render(this.flowScene, camera);

    // 3. Paint, onto the screen
    renderer.setRenderTarget(null);
    renderer.render(this.paintScene, camera);
  }

  private updateUniforms(settings: Settings): void {
    const height = this.size.y;
    // Sizes of the BIG strokes. Medium and small ones are fractions of these (paintShader.ts).
    const objectCell = (0.05 + (settings.brush.size / 100) * 0.07) * height;
    const backdropCell = (0.12 + (settings.scene.backdropStrokes / 100) * 0.14) * height;
    const falloff = settings.scene.backdropFalloff / 100;
    const frame = settings.scene.frame ? 1 : 0;
    // Keep the seed small so the random number maths stays precise.
    const seed = (settings.paint.seed * 7.31) % 211;

    const flow = this.flowMaterial.uniforms;
    flow.uTexel.value.set(1 / this.size.x, 1 / this.size.y);
    flow.uRadius.value = objectCell * 0.25;
    flow.uAspect.value = this.size.x / this.size.y;
    flow.uFalloff.value = falloff;
    flow.uFrame.value = frame;
    flow.uSeed.value = seed;

    const paint = this.paintMaterial.uniforms;
    paint.uResolution.value.copy(this.size);
    paint.uObjectCell.value = objectCell;
    paint.uBackdropCell.value = backdropCell;
    paint.uLength.value = 0.9 + (settings.brush.length / 100) * 1.1;
    paint.uPainterly.value = settings.paint.painterly / 100;
    paint.uVariation.value = settings.paint.variation / 100;
    paint.uTexture.value = settings.brush.texture / 100;
    paint.uBrush.value = BRUSHES.indexOf(settings.brush.type);
    paint.uPattern.value = PATTERNS.indexOf(settings.brush.pattern);
    paint.uPatternAmount.value = settings.brush.patternAmount / 100;
    paint.uHorizon.value = settings.scene.horizon / 100;
    paint.uFrame.value = frame;
    paint.uAccents.value = settings.scene.scratchLines ? 1 : 0;
    paint.uFalloff.value = falloff;
    paint.uCanvasColour.value.set(settings.scene.frameColour);
    paint.uSeed.value = seed;
  }
}

/** One triangle big enough to cover the whole screen. Its shader ignores the camera. */
function fullScreenTriangle(material: ShaderMaterial): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
