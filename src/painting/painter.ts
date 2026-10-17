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
import { glazeFragmentShader, glazeVertexShader } from './glazeShader';
import { paintFragmentShader, paintVertexShader } from './paintShader';

/** Things about the current view the glaze pass needs, besides the settings. */
export interface PaintFrame {
  /** Screen direction toward the light, from the light pad (camera relative), normalised. */
  lightScreen: Vector2;
  /** The apple's centre in 0..1 screen coordinates. */
  objectUv: Vector2;
  /** The apple's radius as a fraction of the screen height. */
  objectRadius: number;
}

/**
 * The Painter turns the 3D render into a painting, in three steps:
 *
 *   1. Underpainting: render the 3D scene (calm tone shapes, glow, marks,
 *      crisp highlights) into a hidden image instead of the screen.
 *   2. Flow: measure which way the edges run in that image (flowShader.ts).
 *   3. Paint, onto the screen, with one of two passes:
 *        - glaze (default, glazeShader.ts): cast shadow, lost edges,
 *          pigment pooling, paper grain
 *        - classic (hidden, Brush > Classic strokes, paintShader.ts): the
 *          older look that repaints everything with brush strokes
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
  private readonly glazeMaterial: ShaderMaterial;
  private readonly paintMesh: Mesh;
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
        uCell: { value: 20 },
        uBackdropCell: { value: 60 },
        uLength: { value: 1.5 },
        uLoose: { value: 0.6 },
        uVariation: { value: 0.45 },
        uTexture: { value: 0.35 },
        uBrush: { value: 0 },
        uPattern: { value: 0 },
        uPatternAmount: { value: 0.5 },
        uHorizon: { value: 0.36 },
        uFrame: { value: 1 },
        uFrameColour: { value: new Color() },
      },
      vertexShader: paintVertexShader,
      fragmentShader: paintFragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.glazeMaterial = new ShaderMaterial({
      uniforms: {
        tColour: { value: this.sceneTarget.texture },
        tFlow: { value: this.flowTarget.texture },
        uResolution: { value: new Vector2() },
        uLightScreen: { value: new Vector2(0, 1) },
        uObjectUv: { value: new Vector2(0.5, 0.5) },
        uObjectRadius: { value: 0.2 },
        uWashBleed: { value: 0.55 },
        uEdgeSoftness: { value: 0.5 },
        uTexture: { value: 0.3 },
        uShadowColour: { value: new Color() },
        uShadowAccent: { value: new Color() },
        uShadowAmount: { value: 0.8 },
        uShadowMix: { value: 0.6 },
        uFrame: { value: 0 },
        uFrameColour: { value: new Color() },
      },
      vertexShader: glazeVertexShader,
      fragmentShader: glazeFragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.flowScene.add(fullScreenTriangle(this.flowMaterial));
    this.paintMesh = fullScreenTriangle(this.glazeMaterial);
    this.paintScene.add(this.paintMesh);
  }

  /** Match the hidden images to the canvas size, in real device pixels. */
  setSize(width: number, height: number): void {
    this.size.set(width, height);
    this.sceneTarget.setSize(width, height);
    this.flowTarget.setSize(Math.max(1, Math.ceil(width / 4)), Math.max(1, Math.ceil(height / 4)));
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, settings: Settings, frame: PaintFrame): void {
    this.updateUniforms(settings);
    this.updateGlaze(settings, frame);
    this.paintMesh.material = settings.brush.classic ? this.paintMaterial : this.glazeMaterial;

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
    const cell = (0.012 + (settings.brush.size / 100) * 0.038) * height;
    const backdropCell = (0.045 + (settings.scene.backdropStrokes / 100) * 0.085) * height;

    const flow = this.flowMaterial.uniforms;
    flow.uTexel.value.set(1 / this.size.x, 1 / this.size.y);
    flow.uRadius.value = cell * 0.5;

    const paint = this.paintMaterial.uniforms;
    paint.uResolution.value.copy(this.size);
    paint.uCell.value = cell;
    paint.uBackdropCell.value = backdropCell;
    paint.uLength.value = 0.9 + (settings.brush.length / 100) * 1.1;
    paint.uLoose.value = settings.paint.painterly / 100;
    paint.uVariation.value = settings.paint.variation / 100;
    paint.uTexture.value = settings.brush.texture / 100;
    paint.uBrush.value = BRUSHES.indexOf(settings.brush.type);
    paint.uPattern.value = PATTERNS.indexOf(settings.brush.pattern);
    paint.uPatternAmount.value = settings.brush.patternAmount / 100;
    paint.uHorizon.value = settings.scene.horizon / 100;
    paint.uFrame.value = settings.scene.frame ? 1 : 0;
    paint.uFrameColour.value.set(settings.scene.frameColour);
  }

  private updateGlaze(settings: Settings, frame: PaintFrame): void {
    const glaze = this.glazeMaterial.uniforms;
    glaze.uResolution.value.copy(this.size);
    glaze.uLightScreen.value.copy(frame.lightScreen);
    glaze.uObjectUv.value.copy(frame.objectUv);
    glaze.uObjectRadius.value = frame.objectRadius;
    glaze.uWashBleed.value = settings.paint.washBleed / 100;
    glaze.uEdgeSoftness.value = settings.paint.edgeSoftness / 100;
    glaze.uTexture.value = settings.paint.texture / 100;
    glaze.uShadowColour.value.set(settings.scene.shadowColour);
    // The apple's own colour, reflected into its shadow.
    glaze.uShadowAccent.value.set(settings.colour.base);
    glaze.uShadowAmount.value = settings.scene.shadowAmount / 100;
    glaze.uShadowMix.value = settings.lighting.shadowColour / 100;
    glaze.uFrame.value = settings.scene.frame ? 1 : 0;
    glaze.uFrameColour.value.set(settings.scene.frameColour);
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
