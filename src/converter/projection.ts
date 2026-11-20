import {
  DepthTexture,
  LinearMipmapLinearFilter,
  Matrix4,
  MeshStandardMaterial,
  PerspectiveCamera,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { colourGLSL } from '../shading/chunks/colour.glsl';
import { cameraPose, pixelToLevel, type CameraFit } from './camera';
import type { DishTrace } from './trace';

/**
 * Step 4: the painting projected onto the built dish, like a slide projector standing where the
 * painter stood.
 *
 * Every surface the painter could see takes the painting's colour at that spot, but only its hue
 * and saturation (its OKLab a and b). Its brightness comes from our own light, so the lit side
 * stays lit as the dish turns: the broad light baked into the painting is taken out (the painting
 * blurred is its light; the painting minus its blur is its detail: crust, flecks, rings), and the
 * detail is laid over the piece's own average brightness. Surfaces the painter never saw (the
 * back, undersides) take the piece's average colour from the painting, so the back matches.
 *
 * "Seen" is checked with a depth picture from the painter's camera (a shadow map, but for the
 * projector): a spot hidden behind another piece does not take its colour.
 */

/** A colour in OKLab: lightness, then green-red, then blue-yellow. */
export type Lab = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export function srgbToOklab(r: number, g: number, b: number): Lab {
  const [R, G, B] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function inside(px: number, py: number, poly: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * The average colour of each kind of thing in the painting: every traced label (salmon, peach,
 * lime, foam), the plate (inside the rim, outside the outlines), the table and the wall.
 */
export function referenceColours(pixels: ImageData, trace: DishTrace, fit: CameraFit, rimOutline: [number, number][]): Record<string, Lab> {
  const sums = new Map<string, [number, number, number, number]>();
  const add = (key: string, lab: Lab) => {
    const s = sums.get(key) ?? [0, 0, 0, 0];
    s[0] += lab[0];
    s[1] += lab[1];
    s[2] += lab[2];
    s[3] += 1;
    sums.set(key, s);
  };
  const { width, height, data } = pixels;
  const sx = trace.picture.width / width;
  const sy = trace.picture.height / height;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const lab = srgbToOklab(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
      const px = x * sx, py = y * sy;
      const piece = trace.pieces.find((p) => inside(px, py, p.outline));
      if (piece) add(piece.label, lab);
      else if (inside(px, py, rimOutline)) add('plate', lab);
      else {
        const hit = pixelToLevel(fit, trace.picture, px, py, 0);
        add(hit && Math.hypot(hit.x, hit.z) < 90 ? 'table' : 'wall', lab);
      }
    }
  }
  const out: Record<string, Lab> = {};
  for (const [k, [l, a, b, n]] of sums) out[k] = [l / n, a / n, b / n];
  return out;
}

/** The projector: the painter's camera, the painting and the depth picture of what it sees. */
export class Projector {
  readonly camera = new PerspectiveCamera(30, 0.8, 10, 400);
  readonly target: WebGLRenderTarget;
  readonly painting: Texture;
  /** Shared by every projected material, so one update moves them all. */
  readonly uniforms = {
    uPainting: { value: null as Texture | null },
    uDepth: { value: null as DepthTexture | null },
    uDepthSize: { value: new Vector2(1, 1) },
    uProjView: { value: new Matrix4() },
    uProjPos: { value: new Vector3() },
    uNear: { value: 10 },
    uFar: { value: 400 },
    uOn: { value: 1 },
    /** How much of the painting's own light to keep: 0 our light only, 1 the painting as painted. */
    uPaintLight: { value: 0 },
  };

  constructor(image: HTMLImageElement, picture: { width: number; height: number }) {
    this.painting = new Texture(image);
    this.painting.colorSpace = SRGBColorSpace;
    // Mipmaps give the blurred painting (its broad light) for free.
    this.painting.generateMipmaps = true;
    this.painting.minFilter = LinearMipmapLinearFilter;
    this.painting.needsUpdate = true;
    const w = 1024;
    const h = Math.round((w * picture.height) / picture.width);
    this.target = new WebGLRenderTarget(w, h, { depthTexture: new DepthTexture(w, h) });
    this.camera.aspect = picture.width / picture.height;
    this.uniforms.uPainting.value = this.painting;
    this.uniforms.uDepth.value = this.target.depthTexture;
    this.uniforms.uDepthSize.value.set(w, h);
  }

  /** Stand the projector where the painter stood and take its depth picture of `receivers`. */
  update(renderer: WebGLRenderer, scene: Scene, fit: CameraFit, receivers: Object3D[]) {
    const { position, quaternion } = cameraPose(fit);
    this.camera.fov = fit.fov;
    this.camera.position.copy(position);
    this.camera.quaternion.copy(quaternion);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.uniforms.uProjView.value.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.uniforms.uProjPos.value.copy(position);
    // Only the things that take the painting go in the depth picture.
    const hidden: Object3D[] = [];
    for (const child of scene.children) {
      if (child.visible && !receivers.includes(child)) {
        child.visible = false;
        hidden.push(child);
      }
    }
    const background = scene.background;
    scene.background = null;
    renderer.setRenderTarget(this.target);
    renderer.render(scene, this.camera);
    renderer.setRenderTarget(null);
    scene.background = background;
    for (const child of hidden) child.visible = true;
  }

  /**
   * A material that takes the painting: `plain` is its colour with the projection off, `ref` its
   * average colour in the painting (for the sides the painter never saw).
   */
  material(plain: string, ref: Lab, options: { roughness?: number; doubleSided?: boolean } = {}): MeshStandardMaterial {
    const material = new MeshStandardMaterial({ color: plain, roughness: options.roughness ?? 0.75 });
    if (options.doubleSided) material.side = 2;
    const uRef = { value: new Vector3(...ref) };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms, { uRef });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;\nvarying vec3 vWorldN;')
        .replace(
          '#include <project_vertex>',
          '#include <project_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWorldN = normalize(mat3(modelMatrix) * objectNormal);',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vWorldP;
varying vec3 vWorldN;
uniform sampler2D uPainting;
uniform sampler2D uDepth;
uniform vec2 uDepthSize;
uniform mat4 uProjView;
uniform vec3 uProjPos;
uniform float uNear;
uniform float uFar;
uniform float uOn;
uniform float uPaintLight;
uniform vec3 uRef;
${colourGLSL}
// Distance from the projector, from a depth value (-1 near to 1 far).
float projDistance(float ndcZ) {
  return (2.0 * uNear * uFar) / (uFar + uNear - ndcZ * (uFar - uNear));
}`,
        )
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          `vec4 diffuseColor = vec4( diffuse, opacity );
if (uOn > 0.5) {
  vec3 backLin = max(oklabToLinear(uRef), 0.0);
  vec3 paintLin = backLin;
  float seen = 0.0;
  vec4 clip = uProjView * vec4(vWorldP, 1.0);
  if (clip.w > 0.0) {
    vec3 ndc = clip.xyz / clip.w;
    vec2 uv = ndc.xy * 0.5 + 0.5;
    if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
      // Seen by the painter? Compared with the depth picture, softened over 3 x 3 texels.
      float here = projDistance(ndc.z);
      float vis = 0.0;
      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          float d = texture(uDepth, uv + vec2(float(i), float(j)) / uDepthSize).r;
          vis += here - projDistance(d * 2.0 - 1.0) < 0.35 ? 1.0 : 0.0;
        }
      }
      vis /= 9.0;
      // Surfaces seen edge-on take little of it (the painting is stretched thin there).
      float facing = smoothstep(0.05, 0.4, dot(normalize(vWorldN), normalize(uProjPos - vWorldP)));
      seen = vis * facing;
      vec3 p = linearToOklab(texture(uPainting, uv).rgb);
      vec3 broad = linearToOklab(textureLod(uPainting, uv, 4.5).rgb);
      // The painting's detail laid over the piece's own brightness; its broad light left out.
      float L = mix(uRef.x + (p.x - broad.x), p.x, uPaintLight);
      paintLin = max(oklabToLinear(vec3(L, p.y, p.z)), 0.0);
    }
  }
  diffuseColor.rgb = mix(backLin, paintLin, seen);
}`,
        );
    };
    // A distinct program per setting is not needed: the same code for every projected material.
    material.customProgramCacheKey = () => 'projected';
    return material;
  }
}

/** An OKLab colour as a hex string (for the room's wall behind the dish). */
export function labToHex([L, a, b]: Lab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  const enc = (c: number) => {
    const v = Math.min(1, Math.max(0, c));
    return Math.round((v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255);
  };
  return '#' + lin.map((c) => enc(c).toString(16).padStart(2, '0')).join('');
}
