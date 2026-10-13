import { BufferAttribute, BufferGeometry, DynamicDrawUsage, IcosahedronGeometry, Vector3 } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Settings } from '../../params';

/**
 * The apple body, built in code.
 *
 * We start from a finely divided sphere and move every point (vertex) to
 * where the apple's skin should be. Step by step:
 *
 *   1. Roundness: blend from a sphere to a rounded cube.
 *   2. Facets: "carve" the skin with flat knife cuts from fixed directions.
 *      Each cut slices off a cap and leaves a flat plane. Deeper cuts mean
 *      bigger planes, which gives the chunky gem look from the references.
 *   3. Apple profile: shoulders a little wider than the base, then height.
 *   4. Lopsided: lean the top over and make one side fuller.
 *   5. Dimples: press a pit into the top (for the stem) and the bottom.
 *
 * Because every slider just changes these numbers, the shape can be rebuilt
 * many times per second while you drag.
 */

/** Shape sliders (0..100) converted into real units. */
export interface AppleShape {
  /** 2 is a perfect sphere, higher values are boxier. */
  power: number;
  heightScale: number;
  topDepth: number;
  bottomDepth: number;
  lean: number;
  /** Where the knife cuts sit relative to the skin. Below 1 cuts in, above 1 misses. */
  cutDepth: number;
  stemLength: number;
  stemCurve: number;
  stemRadius: number;
  leafScale: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function toAppleShape(s: Settings['shape']): AppleShape {
  return {
    power: lerp(4.2, 2.0, s.roundness / 100),
    heightScale: lerp(0.72, 1.3, s.height / 100),
    topDepth: lerp(0, 0.5, s.topDimple / 100),
    bottomDepth: lerp(0, 0.32, s.bottomDimple / 100),
    lean: s.lopsided / 100,
    cutDepth: lerp(1.12, 0.8, s.facets / 100),
    stemLength: lerp(0.15, 1.3, s.stemLength / 100),
    stemCurve: s.stemCurve / 100,
    stemRadius: lerp(0.016, 0.07, s.stemThickness / 100),
    leafScale: lerp(0.4, 1.15, s.leafSize / 100),
  };
}

/** How finely the sphere is divided. Higher is smoother but slower to rebuild. */
const DETAIL = 56;
/** How soft the edges between facet planes are (a small bevel, like a worn gem). */
const FACET_EDGE_SOFTNESS = 0.05;
/** Turns the rounded cube a little so its corners do not line up with the cuts. */
const BOX_TURN = 0.5;
const BOX_COS = Math.cos(BOX_TURN);
const BOX_SIN = Math.sin(BOX_TURN);

/** A small seeded random generator, so the cuts are the same every time. */
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The knife cut directions: a flat top, a flat base and three loose rings around the sides. */
function makeCutDirections(): Vector3[] {
  const random = seededRandom(7);
  const deg = Math.PI / 180;
  const cuts = [new Vector3(0, 1, 0), new Vector3(0, -1, 0)];
  const ring = (count: number, elevation: number, offset: number) => {
    for (let i = 0; i < count; i++) {
      const azimuth = ((i / count) * 360 + offset + (random() - 0.5) * 16) * deg;
      const el = (elevation + (random() - 0.5) * 10) * deg;
      cuts.push(
        new Vector3(Math.cos(el) * Math.cos(azimuth), Math.sin(el), Math.cos(el) * Math.sin(azimuth)),
      );
    }
  };
  ring(5, 40, 10);
  ring(6, -8, 40);
  ring(4, -48, 0);
  return cuts;
}

const CUTS = makeCutDirections();

/** Distance from the centre to a sphere-to-rounded-cube surface, along a unit direction. */
function boxRadius(x: number, y: number, z: number, power: number): number {
  const rx = x * BOX_COS - z * BOX_SIN;
  const rz = x * BOX_SIN + z * BOX_COS;
  const n = (Math.abs(rx) ** power + Math.abs(y) ** power + Math.abs(rz) ** power) ** (1 / power);
  // Boxier shapes poke out further at the corners, so shrink them a little to keep the size steady.
  return 1 / (n * (1 + (power - 2) * 0.07));
}

/** A "smooth minimum": like Math.min, but rounds off the corner where two surfaces meet. */
function smoothMin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Where the skin is, for one unit direction (dx, dy, dz) from the centre. */
function surfacePoint(
  dx: number,
  dy: number,
  dz: number,
  shape: AppleShape,
  planeDistances: Float32Array,
  out: Vector3,
): Vector3 {
  // 1. Round to boxy.
  let r = boxRadius(dx, dy, dz, shape.power);

  // 2. Knife cuts. Along this direction, each cut plane sits at distance planeDistance / cos(angle).
  for (let i = 0; i < CUTS.length; i++) {
    const c = dx * CUTS[i].x + dy * CUTS[i].y + dz * CUTS[i].z;
    if (c <= 0.05) continue;
    r = smoothMin(r, planeDistances[i] / c, FACET_EDGE_SOFTNESS);
  }

  let x = dx * r;
  let y = dy * r;
  let z = dz * r;

  // 3. Apple profile: shoulders slightly wider than the base, then stretch the height.
  const taper = 1 + 0.12 * y;
  x *= taper;
  z *= taper;
  y *= shape.heightScale;

  // 4. Lopsided: one side fuller, and the top leaning over.
  const fuller = 1 + shape.lean * 0.14 * (dx * 0.8 + dz * 0.6);
  x *= fuller;
  z *= fuller;
  x += shape.lean * 0.2 * y;

  // 5. Dimples: soft pits around the top and bottom.
  const fromTop = Math.acos(Math.min(1, Math.max(-1, dy)));
  const fromBottom = Math.PI - fromTop;
  y -= shape.topDepth * Math.exp(-((fromTop / 0.24) ** 2)) * shape.heightScale;
  y += shape.bottomDepth * Math.exp(-((fromBottom / 0.4) ** 2)) * shape.heightScale;

  return out.set(x, y, z);
}

export class AppleBody {
  readonly geometry: BufferGeometry;
  /** The original sphere directions, kept so we can rebuild from scratch each time. */
  private readonly directions: Float32Array;
  private readonly planeDistances = new Float32Array(CUTS.length);
  private readonly temp = new Vector3();

  constructor() {
    const sphere = new IcosahedronGeometry(1, DETAIL);
    // Remove extra data so points shared by neighbouring triangles can be merged.
    // Merged points give smooth shading instead of a faceted wireframe look.
    sphere.deleteAttribute('normal');
    sphere.deleteAttribute('uv');
    this.geometry = mergeVertices(sphere);
    sphere.dispose();

    const position = this.geometry.getAttribute('position') as BufferAttribute;
    position.setUsage(DynamicDrawUsage);
    this.directions = new Float32Array(position.array);
  }

  update(shape: AppleShape): void {
    for (let i = 0; i < CUTS.length; i++) {
      const cut = CUTS[i];
      this.planeDistances[i] = shape.cutDepth * boxRadius(cut.x, cut.y, cut.z, shape.power);
    }

    const position = this.geometry.getAttribute('position') as BufferAttribute;
    const array = position.array as Float32Array;
    const d = this.directions;
    for (let i = 0; i < array.length; i += 3) {
      surfacePoint(d[i], d[i + 1], d[i + 2], shape, this.planeDistances, this.temp);
      array[i] = this.temp.x;
      array[i + 1] = this.temp.y;
      array[i + 2] = this.temp.z;
    }
    position.needsUpdate = true;

    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
  }

  /** The bottom of the top dimple, where the stem grows from. */
  topCentre(shape: AppleShape, out: Vector3): Vector3 {
    return surfacePoint(0, 1, 0, shape, this.planeDistances, out);
  }
}
