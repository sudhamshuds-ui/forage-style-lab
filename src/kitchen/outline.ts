import { Color, Mesh, MeshBasicMaterial, WebGLRenderTarget, type Camera, type Material, type Object3D, type Scene, type WebGLRenderer } from 'three';

/**
 * The selection outline: the exact silhouette of one ingredient on the card, as a vector path.
 *
 * How it works, like making a matte in a comp:
 *   1. Matte: the scene is drawn once more into a small hidden image, with the chosen ingredient
 *      in flat white and everything else in black (other ingredients in front of it still cover
 *      it, so the matte is only what you really see).
 *   2. Trace: the edge of the white shape is followed point by point ("marching squares", the
 *      same idea as Illustrator's image trace), landing between pixels where the edge really
 *      is, so the line hugs every bump, stem and leaf.
 *   3. The points become an SVG path, which the page strokes with dashes and fills with a light
 *      overlay (kitchen.css animates both).
 */

const WHITE = new MeshBasicMaterial({ color: 0xffffff });
const BLACK = new MeshBasicMaterial({ color: 0x000000 });
const CLEAR = new Color(0x000000);

export interface Traced {
  /** SVG path data, in matte pixels (use `width` and `height` as the viewBox). */
  path: string;
  width: number;
  height: number;
  /** The shape's box in matte pixels (for placing the remove button). */
  box: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

export class OutlineTracer {
  private readonly target = new WebGLRenderTarget(1, 1, { samples: 4, depthBuffer: true });
  private pixels = new Uint8Array(4);
  private readonly previousClear = new Color();

  /** The matte's size in pixels (the card's size on the page is plenty: the trace is sub-pixel). */
  setSize(width: number, height: number): void {
    const w = Math.max(2, Math.round(width));
    const h = Math.max(2, Math.round(height));
    if (this.target.width === w && this.target.height === h) return;
    this.target.setSize(w, h);
    this.pixels = new Uint8Array(w * h * 4);
  }

  /**
   * Trace `chosen` as seen by `camera`. `solids` are the other ingredients (they hide what is
   * behind them); `hidden` is everything that must not show in the matte (the room, the floor).
   */
  trace(renderer: WebGLRenderer, scene: Scene, camera: Camera, chosen: Object3D, solids: Object3D[], hidden: Object3D[]): Traced {
    const { width, height } = this.target;
    // Swap every mesh's material for flat white or black, remembering the real ones.
    const swapped: { mesh: Mesh; material: Material | Material[] }[] = [];
    const paint = (root: Object3D, material: Material) =>
      root.traverse((o) => {
        if (o instanceof Mesh) {
          swapped.push({ mesh: o, material: o.material });
          o.material = material;
        }
      });
    for (const solid of solids) paint(solid, BLACK);
    paint(chosen, WHITE);
    const wasVisible = hidden.map((o) => o.visible);
    hidden.forEach((o) => (o.visible = false));

    const shadows = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.getClearColor(this.previousClear);
    const previousAlpha = renderer.getClearAlpha();
    const previousTarget = renderer.getRenderTarget();
    renderer.setClearColor(CLEAR, 1);
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(this.target, 0, 0, width, height, this.pixels);
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(this.previousClear, previousAlpha);
    renderer.shadowMap.autoUpdate = shadows;

    for (const { mesh, material } of swapped) mesh.material = material;
    hidden.forEach((o, i) => (o.visible = wasVisible[i]));

    return traceMatte(this.pixels, width, height);
  }

  dispose(): void {
    this.target.dispose();
  }
}

/**
 * Follow the edge of the white shape in a matte (RGBA bytes, rows bottom to top as WebGL reads
 * them) and return it as closed SVG loops, y flipped so it matches the page.
 */
export function traceMatte(pixels: Uint8Array, width: number, height: number): Traced {
  // The matte's value at a pixel, 0..1 (outside the image counts as empty, so shapes that
  // run off the card still close).
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : pixels[(y * width + x) * 4] / 255);
  const LEVEL = 0.5;
  /** Where the edge crosses between two neighbouring pixels (0..1 from a to b). */
  const cross = (a: number, b: number) => (LEVEL - a) / (b - a || 1e-6);

  // Each crossing point sits on a grid edge; give it a key so segments can be chained.
  // Horizontal edge (x..x+1, y): key 2 * (y * W + x); vertical edge (x, y..y+1): that + 1.
  const W = width + 2;
  const points = new Map<number, [number, number]>();
  const next = new Map<number, number>();
  const hKey = (x: number, y: number) => 2 * ((y + 1) * W + (x + 1));
  const vKey = (x: number, y: number) => hKey(x, y) + 1;
  const link = (from: number, to: number) => next.set(from, to);

  for (let y = -1; y < height; y++) {
    for (let x = -1; x < width; x++) {
      const a = at(x, y); // bottom left
      const b = at(x + 1, y); // bottom right
      const c = at(x + 1, y + 1); // top right
      const d = at(x, y + 1); // top left
      const code = (a > LEVEL ? 1 : 0) | (b > LEVEL ? 2 : 0) | (c > LEVEL ? 4 : 0) | (d > LEVEL ? 8 : 0);
      if (code === 0 || code === 15) continue;
      // The four possible crossing points of this cell.
      const bottom = hKey(x, y);
      const top = hKey(x, y + 1);
      const left = vKey(x, y);
      const right = vKey(x + 1, y);
      if (!points.has(bottom) && a > LEVEL !== b > LEVEL) points.set(bottom, [x + cross(a, b), y]);
      if (!points.has(top) && d > LEVEL !== c > LEVEL) points.set(top, [x + cross(d, c), y + 1]);
      if (!points.has(left) && a > LEVEL !== d > LEVEL) points.set(left, [x, y + cross(a, d)]);
      if (!points.has(right) && b > LEVEL !== c > LEVEL) points.set(right, [x + 1, y + cross(b, c)]);
      // Segments run with the shape on their left, so loops chain in one direction.
      switch (code) {
        case 1: link(left, bottom); break;
        case 2: link(bottom, right); break;
        case 3: link(left, right); break;
        case 4: link(right, top); break;
        case 5: link(left, top); link(right, bottom); break;
        case 6: link(bottom, top); break;
        case 7: link(left, top); break;
        case 8: link(top, left); break;
        case 9: link(top, bottom); break;
        case 10: link(top, right); link(bottom, left); break;
        case 11: link(top, right); break;
        case 12: link(right, left); break;
        case 13: link(right, bottom); break;
        case 14: link(bottom, left); break;
      }
    }
  }

  // Chain the segments into loops.
  const loops: [number, number][][] = [];
  const seen = new Set<number>();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop: [number, number][] = [];
    let key = start;
    while (!seen.has(key)) {
      seen.add(key);
      const p = points.get(key);
      if (p) loop.push(p);
      const to = next.get(key);
      if (to === undefined) break;
      key = to;
    }
    // Specks of a few pixels (a stray sample at an edge) are not part of the outline.
    if (loop.length >= 12) loops.push(loop);
  }

  let box: Traced['box'] = null;
  let path = '';
  for (const raw of loops) {
    const loop = smooth(raw);
    // Start each loop at its topmost point, so the dashes do not jump about between frames.
    let first = 0;
    for (let i = 1; i < loop.length; i++) if (loop[i][1] > loop[first][1]) first = i;
    for (let i = 0; i < loop.length; i++) {
      const [x, yUp] = loop[(first + i) % loop.length];
      const y = height - 1 - yUp;
      if (!box) box = { minX: x, minY: y, maxX: x, maxY: y };
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
      path += `${i === 0 ? 'M' : 'L'}${(x + 0.5).toFixed(2)} ${(y + 0.5).toFixed(2)}`;
    }
    path += 'Z';
  }
  return { path, width, height, box };
}

/** Take the pixel stair-steps out of a loop: each point becomes the average of itself and its neighbours, twice. */
function smooth(loop: [number, number][]): [number, number][] {
  let current = loop;
  for (let pass = 0; pass < 2; pass++) {
    const n = current.length;
    const out: [number, number][] = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = current[(i + n - 1) % n];
      const b = current[i];
      const c = current[(i + 1) % n];
      out[i] = [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
    }
    current = out;
  }
  return current;
}
