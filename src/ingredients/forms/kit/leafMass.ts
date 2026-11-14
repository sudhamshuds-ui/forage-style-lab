import { BufferAttribute, Float32BufferAttribute, Vector3, type BufferGeometry } from 'three';
import { smoothMax, smoothMin } from './lathe';
import { surfaceNets } from './surfaceNets';

/**
 * Kit recipe for a **leafy mass** (a bunch of spinach, later a head of romaine or napa cabbage):
 * the whole bunch is ONE surface, like a single sculpted piece of clay, never a pile of separate
 * paper-thin leaves (the user, 2026-11-13: "think of this whole thing as one unit, use textures,
 * colours to differentiate ... the huge gaps between them to be minimal").
 *
 * What goes into the clay (a distance field, turned into a mesh with surface nets):
 *   - a **core**: a few soft blobs that fill the inside of the bunch, so there are no gaps to see
 *     through (it is hidden under the leaves, only showing as deep crevices between them);
 *   - **leaves**: each a thick, rounded lobe (an egg-shaped slab) lying on the core like a
 *     shingle, curving with it, its rim lifting a little; each sits at its own height, so where two
 *     overlap one is clearly on top and its rim makes a soft step onto the leaf below;
 *   - **stems**: round tubes, cut flat at their ends, flowing into the core.
 * Everything is blended with soft fillets, so where leaves cross or meet the core the join is a
 * soft valley: no blatant intersections, no crisp cut lines.
 *
 * The leaves are told apart by colour and texture, not by gaps: every point of the mesh remembers
 * which leaf (or stem) it belongs to and where on it it sits (attributes below), and the shader
 * paints each leaf its own green, its midrib and veins, a lighter rim, and cool deep crevices.
 *
 * Attributes (read by the skin):
 *   uv:     x along the leaf, 0 at its base to 1 at its tip (a stem: -1 at its cut end to 0);
 *           y across it, 0.5 on the midrib. The core: (0.5, 0.5).
 *   ownPos: x: the piece's own random number (0..1), y: how deep in a crevice (0 open, 1 deep),
 *           z: how near its own rim (1 at the edge of a leaf, 0 inside it).
 * All sizes in centimetres.
 */

export interface MassBlob {
  centre: Vector3;
  /** The blob's radii along x, y and z (an ellipsoid). */
  radii: Vector3;
}

export interface MassLeaf {
  /** Where the leaf's base sits. */
  base: Vector3;
  /** From base to tip (unit). */
  along: Vector3;
  /** Out of the leaf's top face (unit, square to `along`). */
  normal: Vector3;
  length: number;
  /** Full width at its widest. */
  width: number;
  /** Where along it is widest (0..1). */
  widest: number;
  /** Half its thickness (also the radius of its rounded rim). */
  thickness: number;
  /** The radius it curves round along its length, and across it (it hugs the core): smaller curves more. */
  bend: number;
  bendAcross: number;
  /** Savoy puckers: how high the crinkles stand (cm), and how close together (per cm). */
  crinkle: number;
  crinkleScale: number;
  /** How far its outline wobbles in and out (0..0.2): an irregular, lobed rim. */
  lobes: number;
  /** How far its rim lifts off (cm), and its tip curls (cm, + up, - down). */
  rimLift: number;
  tipCurl: number;
  /** A gentle wave round its rim (cm) and how many waves, and where they start. */
  wave: number;
  waves: number;
  phase: number;
  /** A fold along its midrib (cm at the rim, + makes a V opening up). */
  fold: number;
  /** Its own random number (0..1). */
  id: number;
}

export interface MassStem {
  /** The stem's path from its cut end: straight runs between these points. */
  points: Vector3[];
  radius: number;
  id: number;
}

export interface LeafMassOptions {
  core: MassBlob[];
  leaves: MassLeaf[];
  stems: MassStem[];
  /** The fillet softness: between the core blobs, leaf to the mass, and stem to stem. */
  coreSoftness: number;
  leafSoftness: number;
  stemSoftness: number;
  /** How the stems blend into the rest. */
  joinSoftness: number;
  /** The table (y), cut off softly so the bunch rests flat on it. */
  table: number;
  /**
   * Flat cuts, each a plane (a point on it and the way out of the shape): a head of lettuce cut
   * across its base. Optional; softened a little so the cut's rim is not a knife edge.
   */
  cuts?: { point: Vector3; out: Vector3; soft?: number }[];
  /** Grid size (cm). */
  cell: number;
  /**
   * Rounds of gentle smoothing after meshing (Taubin: a step toward the neighbours, then a step
   * back, so it smooths without shrinking). Softens the stair steps surface nets leave on thin
   * leaf rims (the user, romaine: "jagged and rough and edgy"). Default 0.
   */
  smoothRounds?: number;
}

/** An ellipsoid's distance (approximate, good near its surface). */
function blobDistance(p: Vector3, blob: MassBlob): number {
  const x = (p.x - blob.centre.x) / blob.radii.x;
  const y = (p.y - blob.centre.y) / blob.radii.y;
  const z = (p.z - blob.centre.z) / blob.radii.z;
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt((x / blob.radii.x) ** 2 + (y / blob.radii.y) ** 2 + (z / blob.radii.z) ** 2);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(blob.radii.x, blob.radii.y, blob.radii.z);
}

/** A leaf's own frame, worked out once. */
interface LeafFrame {
  leaf: MassLeaf;
  side: Vector3;
  centre: Vector3;
  reach: number;
  /** How far the leaf's surface can stray from its plane (its curve, lifts, waves and thickness). */
  depth: number;
}

interface LeafLocal {
  /** Distance to the leaf. */
  d: number;
  /** Along (0 base, 1 tip) and across (-1..1 at the widest). */
  u: number;
  v: number;
  /** How far inside its outline (negative inside). */
  outline: number;
}

const tmp = new Vector3();

function leafLocal(p: Vector3, f: LeafFrame): LeafLocal {
  const { leaf } = f;
  tmp.subVectors(p, leaf.base);
  const x = tmp.dot(leaf.along);
  const y = tmp.dot(f.side);
  const z = tmp.dot(leaf.normal);
  const L = leaf.length;
  const half = leaf.width / 2;
  // The outline: an egg, widest at `widest`, round at both ends (spinach leaves are round-tipped).
  const m = leaf.widest * L;
  const ax = x < m ? m : L - m;
  const ex = (x - m) / ax;
  const ey = y / half;
  const angle = Math.atan2(ey, ex);
  const wobble = 1 + leaf.lobes * Math.sin(angle * (leaf.waves + 1) + leaf.phase * 1.7) * (0.6 + 0.4 * Math.sin(angle * 2.3 + leaf.phase));
  const r = Math.sqrt(ex * ex + ey * ey) / wobble;
  const outline = (r - 1) * Math.min(ax, half);
  const u = x / L;
  const e = Math.min(1, r);
  // The surface: curving round the core (a sphere of radius `bend` through the base's middle),
  // the rim lifting, the tip curling, a fold along the midrib, a gentle wave round the rim.
  const cx = x - L * 0.5;
  let zc = -(cx * cx) / (2 * leaf.bend) - (y * y) / (2 * leaf.bendAcross);
  // Savoy puckers: soft bumps between the veins, fading out toward the rim.
  const s = leaf.crinkleScale;
  zc += leaf.crinkle * Math.sin(x * s + leaf.phase) * Math.sin(y * s * 1.15 + leaf.phase * 2.1 + x * 0.4) * (1 - e * e);
  zc += leaf.rimLift * e * e * e;
  zc += leaf.tipCurl * Math.max(0, u - 0.45) ** 2 * 3.3;
  zc += leaf.fold * Math.abs(ey) * Math.min(1, Math.abs(ey));
  zc += leaf.wave * e ** 4 * Math.sin(angle * leaf.waves + leaf.phase);
  const dz = Math.abs(z - zc);
  // A slab with a rounded rim (the rim's radius is the thickness).
  const t = leaf.thickness;
  const qx = outline + t;
  const d = Math.hypot(Math.max(qx, 0), Math.max(dz, 0)) + Math.min(Math.max(qx, dz), 0) - t;
  return { d, u, v: ey, outline };
}

/** A stem: distance to its path, and how far along it is (0 at the cut end, 1 at its other end). */
function stemLocal(p: Vector3, stem: MassStem): { d: number; t: number } {
  let best = Infinity;
  let bestT = 0;
  let travelled = 0;
  let total = 0;
  for (let i = 1; i < stem.points.length; i++) total += stem.points[i].distanceTo(stem.points[i - 1]);
  for (let i = 1; i < stem.points.length; i++) {
    const a = stem.points[i - 1];
    const b = stem.points[i];
    const ab = tmp.subVectors(b, a);
    const len = ab.length();
    const h = Math.min(1, Math.max(0, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y + (p.z - a.z) * ab.z) / (len * len)));
    const dx = p.x - (a.x + ab.x * h);
    const dy = p.y - (a.y + ab.y * h);
    const dz = p.z - (a.z + ab.z * h);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < best) {
      best = dist;
      bestT = (travelled + h * len) / total;
    }
    travelled += len;
  }
  // Cut flat at the first point (the cut end), with a slightly softened rim.
  const a = stem.points[0];
  const dir = tmp.subVectors(stem.points[1], a).normalize();
  const behind = -((p.x - a.x) * dir.x + (p.y - a.y) * dir.y + (p.z - a.z) * dir.z);
  return { d: smoothMax(best - stem.radius, behind, 0.12), t: bestT };
}

/** How far a point is outside a box (0 inside). */
function boxGap(p: Vector3, min: Vector3, max: Vector3): number {
  const dx = Math.max(min.x - p.x, 0, p.x - max.x);
  const dy = Math.max(min.y - p.y, 0, p.y - max.y);
  const dz = Math.max(min.z - p.z, 0, p.z - max.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** A lower bound on the distance to a leaf: how far outside its own box (length, width, and how far its surface can stray from its plane). */
function leafBoxGap(p: Vector3, f: LeafFrame): number {
  const { leaf } = f;
  const dx = p.x - leaf.base.x;
  const dy = p.y - leaf.base.y;
  const dz = p.z - leaf.base.z;
  const x = dx * leaf.along.x + dy * leaf.along.y + dz * leaf.along.z;
  const y = dx * f.side.x + dy * f.side.y + dz * f.side.z;
  const z = dx * leaf.normal.x + dy * leaf.normal.y + dz * leaf.normal.z;
  const half = leaf.width / 2 + 0.6;
  const gx = Math.max(-0.6 - x, 0, x - leaf.length - 0.6);
  const gy = Math.max(Math.abs(y) - half, 0);
  const gz = Math.max(Math.abs(z) - f.depth, 0);
  return Math.hypot(gx, gy, gz);
}

/** Taubin smoothing: rounds of shrink-free smoothing over the mesh's own neighbours. */
function taubin(geometry: BufferGeometry, rounds: number): void {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.getIndex()!;
  const n = position.count;
  const neighbours: number[][] = Array.from({ length: n }, () => []);
  for (let k = 0; k < index.count; k += 3) {
    const a = index.getX(k);
    const b = index.getX(k + 1);
    const c = index.getX(k + 2);
    neighbours[a].push(b, c);
    neighbours[b].push(a, c);
    neighbours[c].push(a, b);
  }
  const p = position.array as Float32Array;
  const next = new Float32Array(p.length);
  for (let round = 0; round < rounds * 2; round++) {
    const step = round % 2 === 0 ? 0.5 : -0.53;
    for (let i = 0; i < n; i++) {
      const list = neighbours[i];
      let x = 0;
      let y = 0;
      let z = 0;
      for (const j of list) {
        x += p[3 * j];
        y += p[3 * j + 1];
        z += p[3 * j + 2];
      }
      const m = list.length || 1;
      next[3 * i] = p[3 * i] + (x / m - p[3 * i]) * step;
      next[3 * i + 1] = p[3 * i + 1] + (y / m - p[3 * i + 1]) * step;
      next[3 * i + 2] = p[3 * i + 2] + (z / m - p[3 * i + 2]) * step;
    }
    p.set(next);
  }
  position.needsUpdate = true;
}

export class LeafMass {
  private frames: LeafFrame[];
  private stemBoxes: { min: Vector3; max: Vector3 }[];

  constructor(private options: LeafMassOptions) {
    this.frames = options.leaves.map((leaf) => {
      const side = new Vector3().crossVectors(leaf.normal, leaf.along).normalize();
      const centre = leaf.base.clone().addScaledVector(leaf.along, leaf.length / 2);
      const reach = Math.hypot(leaf.length * Math.max(leaf.widest, 1 - leaf.widest), leaf.width / 2) * 1.2 + Math.abs(leaf.rimLift) + Math.abs(leaf.tipCurl) + Math.abs(leaf.fold) + leaf.wave + leaf.thickness + 1;
      const half = leaf.width / 2;
      const along = leaf.length / 2;
      const bendDrop = (along * along) / (2 * Math.abs(leaf.bend)) + (half * half) / (2 * Math.abs(leaf.bendAcross));
      const depth = bendDrop + Math.abs(leaf.rimLift) + Math.abs(leaf.tipCurl) * 1.5 + Math.abs(leaf.fold) + leaf.wave + leaf.crinkle + leaf.thickness + 0.5;
      return { leaf, side, centre, reach, depth };
    });
    this.stemBoxes = options.stems.map((stem) => {
      const min = new Vector3(Infinity, Infinity, Infinity);
      const max = new Vector3(-Infinity, -Infinity, -Infinity);
      for (const point of stem.points) {
        min.min(point);
        max.max(point);
      }
      return { min: min.subScalar(stem.radius), max: max.addScalar(stem.radius) };
    });
  }

  /** The whole bunch's distance: negative inside. */
  distance(p: Vector3): number {
    const o = this.options;
    let d = Infinity;
    for (const blob of o.core) {
      const one = blobDistance(p, blob);
      d = d === Infinity ? one : smoothMin(d, one, o.coreSoftness);
    }
    for (const f of this.frames) {
      // Skip leaves too far away to matter: a quick bounding sphere, then the leaf's own box (long
      // leaves round a head all overlap one sphere, so the box does most of the work).
      const far = p.distanceTo(f.centre) - f.reach;
      if (far > d + o.leafSoftness) continue;
      if (leafBoxGap(p, f) > d + o.leafSoftness) continue;
      d = smoothMin(d, leafLocal(p, f).d, o.leafSoftness);
    }
    let s = Infinity;
    o.stems.forEach((stem, i) => {
      // Skip stems too far away to matter.
      const box = this.stemBoxes[i];
      if (boxGap(p, box.min, box.max) > Math.min(s, d) + o.joinSoftness + o.stemSoftness) return;
      const one = stemLocal(p, stem).d;
      s = s === Infinity ? one : smoothMin(s, one, o.stemSoftness);
    });
    if (s !== Infinity) d = smoothMin(d, s, o.joinSoftness);
    for (const cut of o.cuts ?? []) {
      const beyond = (p.x - cut.point.x) * cut.out.x + (p.y - cut.point.y) * cut.out.y + (p.z - cut.point.z) * cut.out.z;
      d = smoothMax(d, beyond, cut.soft ?? 0.25);
    }
    return smoothMax(d, o.table - p.y, 0.3);
  }

  /** The mesh, with its own attributes (see the top of this file) and smooth normals. */
  geometry(): BufferGeometry {
    const o = this.options;
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const blob of o.core) {
      min.min(blob.centre.clone().sub(blob.radii));
      max.max(blob.centre.clone().add(blob.radii));
    }
    for (const f of this.frames) {
      min.min(f.centre.clone().subScalar(f.reach));
      max.max(f.centre.clone().addScalar(f.reach));
    }
    for (const stem of o.stems)
      for (const point of stem.points) {
        min.min(point.clone().subScalar(stem.radius + 0.5));
        max.max(point.clone().addScalar(stem.radius + 0.5));
      }
    min.y = Math.max(min.y, o.table - o.cell * 2);
    // A coarse pass first (one sample per 4 x 4 x 4 cells): far from the surface the coarse value
    // is enough (surface nets only needs to know inside or outside there), so the exact field is
    // only worked out near the surface. About ten times faster.
    const p = new Vector3();
    const coarse = o.cell * 4;
    const cx = Math.ceil((max.x - min.x) / coarse) + 2;
    const cy = Math.ceil((max.y - min.y) / coarse) + 2;
    const cz = Math.ceil((max.z - min.z) / coarse) + 2;
    const grid = new Float32Array(cx * cy * cz);
    for (let k = 0; k < cz; k++)
      for (let j = 0; j < cy; j++)
        for (let i = 0; i < cx; i++) grid[i + cx * (j + cy * k)] = this.distance(p.set(min.x + i * coarse, min.y + j * coarse, min.z + k * coarse));
    // (A coarse point is at most 0.87 of a coarse step from any grid point, so 0.9 is safe.)
    const band = coarse * 0.9;
    const geometry = surfaceNets(
      (x, y, z) => {
        const i = Math.min(cx - 1, Math.round((x - min.x) / coarse));
        const j = Math.min(cy - 1, Math.round((y - min.y) / coarse));
        const k = Math.min(cz - 1, Math.round((z - min.z) / coarse));
        const c = grid[i + cx * (j + cy * k)];
        return Math.abs(c) > band ? c : this.distance(p.set(x, y, z));
      },
      min,
      max,
      o.cell,
    );
    // The coarse samples, blended smoothly between them (for the crevice measure).
    const smooth = (x: number, y: number, z: number) => {
      const fx = Math.min(cx - 1.001, Math.max(0, (x - min.x) / coarse));
      const fy = Math.min(cy - 1.001, Math.max(0, (y - min.y) / coarse));
      const fz = Math.min(cz - 1.001, Math.max(0, (z - min.z) / coarse));
      const i = Math.floor(fx);
      const j = Math.floor(fy);
      const k = Math.floor(fz);
      const tx = fx - i;
      const ty = fy - j;
      const tz = fz - k;
      const g = (a: number, b: number, c: number) => grid[i + a + cx * (j + b + cy * (k + c))];
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      return lerp(
        lerp(lerp(g(0, 0, 0), g(1, 0, 0), tx), lerp(g(0, 1, 0), g(1, 1, 0), tx), ty),
        lerp(lerp(g(0, 0, 1), g(1, 0, 1), tx), lerp(g(0, 1, 1), g(1, 1, 1), tx), ty),
        tz,
      );
    };
    if (o.smoothRounds) taubin(geometry, o.smoothRounds);
    this.paint(geometry, smooth);
    return geometry;
  }

  /** Normals, and each point's leaf, place on it, crevice and rim. */
  private paint(geometry: BufferGeometry, roughDistance: (x: number, y: number, z: number) => number): void {
    const position = geometry.getAttribute('position') as BufferAttribute;
    const n = position.count;
    const uv = new Float32Array(n * 2);
    const own = new Float32Array(n * 3);
    const p = new Vector3();
    const q = new Vector3();
    const normal = new Vector3();
    // Smooth normals from the mesh itself (the field's own were no better, and far slower).
    geometry.computeVertexNormals();
    const normalAttribute = geometry.getAttribute('normal') as BufferAttribute;
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(position, i);
      normal.fromBufferAttribute(normalAttribute, i).normalize();

      // Crevices: how much of the mass crowds in just outside the surface (ambient occlusion),
      // from the coarse samples (a soft measure, so they are plenty, and far quicker).
      let occlusion = 0;
      for (let k = 1; k <= 3; k++) {
        const h = 0.5 * k;
        q.copy(p).addScaledVector(normal, h);
        occlusion += Math.max(0, h - roughDistance(q.x, q.y, q.z)) / 2 ** k;
      }
      const crevice = Math.min(1, occlusion * 1.5);

      // Which piece is this point on: the nearest leaf or stem (the core if neither is close).
      let best = 0.45;
      let owner: { u: number; v: number; id: number; rim: number } = { u: 0.5, v: 0.5, id: 0.5, rim: 0 };
      for (const f of this.frames) {
        if (p.distanceTo(f.centre) - f.reach > best || leafBoxGap(p, f) > best) continue;
        const local = leafLocal(p, f);
        if (local.d < best) {
          best = local.d;
          owner = {
            u: Math.min(1, Math.max(0, local.u)),
            v: Math.min(1, Math.max(0, local.v * 0.5 + 0.5)),
            id: f.leaf.id,
            rim: 1 - Math.min(1, Math.max(0, -local.outline / 0.9)),
          };
        }
      }
      for (const [k, stem] of this.options.stems.entries()) {
        const box = this.stemBoxes[k];
        if (boxGap(p, box.min, box.max) > best) continue;
        const local = stemLocal(p, stem);
        if (local.d < best) {
          best = local.d;
          owner = { u: local.t - 1, v: 0.5, id: stem.id, rim: 0 };
        }
      }
      uv[i * 2] = owner.u;
      uv[i * 2 + 1] = owner.v;
      own[i * 3] = owner.id;
      own[i * 3 + 1] = crevice;
      own[i * 3 + 2] = owner.rim;
    }
    geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    geometry.setAttribute('ownPos', new Float32BufferAttribute(own, 3));
  }
}
