import {
  BufferGeometry,
  Camera,
  Color,
  Float32BufferAttribute,
  GLSL3,
  HalfFloatType,
  Layers,
  Matrix4,
  Mesh,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { BRUSHES, PATTERNS, type Settings } from '../params';
import { MAX_CONTACTS } from '../scene/background';
import { flowFragmentShader, flowVertexShader } from './flowShader';
import { glazeFragmentShader, glazeVertexShader } from './glazeShader';
import { paintFragmentShader, paintVertexShader } from './paintShader';
import { surfaceFragmentShader, surfaceVertexShader } from './surfaceShader';

/**
 * The ingredient's meshes also sit on this layer (set in main.ts), so the surface
 * pass can render the ingredient alone, without the room.
 */
export const SURFACE_LAYER = 1;

/** Things about the current view the glaze pass needs, besides the settings. */
export interface PaintFrame {
  /** Screen direction toward the light, from the light pad (camera relative), normalised. */
  lightScreen: Vector2;
  /** The apple's centre in 0..1 screen coordinates. */
  objectUv: Vector2;
  /** The apple's radius as a fraction of the screen height. */
  objectRadius: number;
  /**
   * Where each piece sits on the card: x, y (0..1) of its contact with the table and its
   * radius (screen heights). One for a solo ingredient, one per member of a cluster.
   */
  pieces: Vector3[];
  /** The ingredient's base colour, reflected into its cast shadow. */
  objectBase: string;
  /**
   * How big one world unit looks from the starting view, in screen heights. The
   * strokes painted on the ingredient are sized with it, so they keep their place
   * on the surface while you zoom (they grow and shrink with the fruit).
   */
  surfaceScale: number;
}

/**
 * The Painter turns the 3D render into a painting, in three steps:
 *
 *   1. Underpainting: render the 3D scene (calm tone shapes, glow, marks,
 *      crisp highlights) into a hidden image instead of the screen.
 *   2. Flow: measure which way the edges run in that image (flowShader.ts).
 *   3. Glaze (glazeShader.ts): cast shadow, lost edges, pigment pooling,
 *      paper grain. This is the refined look, painted straight to the screen.
 *   4. Only with Style > Playful strokes: the glazed painting goes into one
 *      more hidden image, and the stroke pass (paintShader.ts) repaints it
 *      with bold brush strokes. Like putting an effect on top of a finished
 *      pre-comp: everything the refined look does is still underneath.
 *
 * Think of it as a pre-comp in After Effects: the 3D scene is the source
 * layer, and the paint pass is an effect that works on the flattened result.
 */
export class Painter {
  private readonly sceneTarget: WebGLRenderTarget;
  private readonly flowTarget: WebGLRenderTarget;
  /** The finished refined painting, kept so the playful strokes can repaint it. */
  private readonly glazeTarget: WebGLRenderTarget;
  /** The surface pass: where each ingredient pixel sits in the room, and which way it faces. */
  private readonly surfaceTarget: WebGLRenderTarget;
  private readonly surfaceMaterial: ShaderMaterial;
  private readonly savedLayers = new Layers();
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
    this.glazeTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false });
    // No anti-aliasing: positions must never be blended across an edge. Half floats are
    // precise to well under a pixel here, and every graphics chip can render into them.
    this.surfaceTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, count: 2 });
    this.surfaceMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: surfaceVertexShader,
      fragmentShader: surfaceFragmentShader,
    });

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
        tColour: { value: this.glazeTarget.texture },
        tFlow: { value: this.flowTarget.texture },
        uResolution: { value: new Vector2() },
        uCell: { value: 20 },
        uBackdropCell: { value: 60 },
        uLength: { value: 1.5 },
        uLoose: { value: 0.6 },
        uVariation: { value: 0.45 },
        uFollowForm: { value: 1 },
        uSwirl: { value: 0 },
        uTexture: { value: 0.35 },
        uBrush: { value: 0 },
        uPattern: { value: 0 },
        uPatternAmount: { value: 0.5 },
        uHorizon: { value: 0.36 },
        uFrame: { value: 1 },
        uFrameColour: { value: new Color() },
        tSurfacePosition: { value: this.surfaceTarget.textures[0] },
        tSurfaceNormal: { value: this.surfaceTarget.textures[1] },
        uViewProjection: { value: new Matrix4() },
        uSurfacePx: { value: 100 },
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
        uPieces: { value: Array.from({ length: MAX_CONTACTS }, () => new Vector3(0.5, 0.3, 0.2)) },
        uPieceCount: { value: 0 },
        uWashBleed: { value: 0.55 },
        uEdgeSoftness: { value: 0.5 },
        uTexture: { value: 0.3 },
        uShadowColour: { value: new Color() },
        uShadowAccent: { value: new Color() },
        uShadowAmount: { value: 0.8 },
        uShadowMix: { value: 0.6 },
        uFrame: { value: 0 },
        uFrameColour: { value: new Color() },
        uKeepLabel: { value: 0 },
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
    this.glazeTarget.setSize(width, height);
    this.flowTarget.setSize(Math.max(1, Math.ceil(width / 4)), Math.max(1, Math.ceil(height / 4)));
    this.surfaceTarget.setSize(width, height);
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, settings: Settings, frame: PaintFrame): void {
    this.updateUniforms(settings);
    this.updateGlaze(settings, frame);
    const playful = settings.brush.classic;

    // 1. Underpainting
    renderer.setRenderTarget(this.sceneTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    // 2. Flow
    renderer.setRenderTarget(this.flowTarget);
    renderer.render(this.flowScene, camera);

    // 3. Glaze: straight to the screen, or into a hidden image for the strokes.
    this.paintMesh.material = this.glazeMaterial;
    const glaze = this.glazeMaterial.uniforms;
    glaze.uKeepLabel.value = playful ? 1 : 0;
    if (playful) glaze.uFrame.value = 0; // the strokes draw the frame
    renderer.setRenderTarget(playful ? this.glazeTarget : null);
    renderer.render(this.paintScene, camera);

    // 4. Playful strokes on top of the finished painting.
    if (playful) {
      this.renderSurface(renderer, scene, camera, frame);
      this.paintMesh.material = this.paintMaterial;
      renderer.setRenderTarget(null);
      renderer.render(this.paintScene, camera);
    }
  }

  /**
   * The surface pass: render the ingredient alone (its layer), with every material
   * swapped for the position and facing shader, into the two hidden surface images.
   */
  private renderSurface(renderer: WebGLRenderer, scene: Scene, camera: Camera, frame: PaintFrame): void {
    const paint = this.paintMaterial.uniforms;
    (paint.uViewProjection.value as Matrix4).multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    paint.uSurfacePx.value = frame.surfaceScale * this.size.y;

    this.savedLayers.mask = camera.layers.mask;
    camera.layers.set(SURFACE_LAYER);
    const shadowsWereLive = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false; // the shadows were already drawn this frame
    const background = scene.background;
    scene.background = null;
    scene.overrideMaterial = this.surfaceMaterial;

    renderer.setRenderTarget(this.surfaceTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    scene.overrideMaterial = null;
    scene.background = background;
    renderer.shadowMap.autoUpdate = shadowsWereLive;
    camera.layers.mask = this.savedLayers.mask;
  }

  private updateUniforms(settings: Settings): void {
    const height = this.size.y;
    const cell = (0.012 + (settings.brush.size / 100) * 0.038) * height;
    // The painter scales the backdrop strokes: 50 keeps the tuned size, 0 is tiny (Seurat's dots).
    const backdropScale = 0.15 + (settings.brush.backdrop / 100) * 1.7;
    const backdropCell = (0.045 + (settings.scene.backdropStrokes / 100) * 0.085) * height * backdropScale;

    const flow = this.flowMaterial.uniforms;
    flow.uTexel.value.set(1 / this.size.x, 1 / this.size.y);
    flow.uRadius.value = cell * 0.5;

    const paint = this.paintMaterial.uniforms;
    paint.uResolution.value.copy(this.size);
    paint.uCell.value = cell;
    paint.uBackdropCell.value = backdropCell;
    paint.uLength.value = 0.9 + (settings.brush.length / 100) * 1.1;
    // The painter sets looseness and broken colour. The hidden Painterly and Colour
    // variation sliders still scale them (at their defaults, 45, they change nothing).
    paint.uLoose.value = (settings.brush.loose / 100) * (settings.paint.painterly / 45);
    paint.uVariation.value = (settings.brush.colourBreak / 100) * 1.8 * (settings.paint.variation / 45);
    paint.uFollowForm.value = settings.brush.followForm / 100;
    paint.uSwirl.value = settings.brush.swirl / 100;
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
    const pieces = frame.pieces.slice(0, MAX_CONTACTS);
    pieces.forEach((piece, i) => (glaze.uPieces.value as Vector3[])[i].copy(piece));
    glaze.uPieceCount.value = pieces.length;
    glaze.uWashBleed.value = settings.paint.washBleed / 100;
    glaze.uEdgeSoftness.value = settings.paint.edgeSoftness / 100;
    glaze.uTexture.value = settings.paint.texture / 100;
    glaze.uShadowColour.value.set(settings.scene.shadowColour);
    // The ingredient's own colour, reflected into its shadow.
    glaze.uShadowAccent.value.set(frame.objectBase);
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
