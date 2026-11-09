import { Matrix3, Mesh, Vector3, type BufferAttribute, type Group } from 'three';
import { signed } from './forms/kit/random';
import type { Layout } from './registry';

/**
 * Layouts (board 06, "Three layouts. Every ingredient uses exactly one").
 *
 * Forms are pieces; the Style Lab arranges them. This file does the
 * arranging for clusters: "an odd triangle: one hero in front, one or two
 * behind and to the side, touching. One shared shadow. Never a row."
 *
 * Think of it as placing props on a set:
 *   1. the hero stands at the front centre,
 *   2. each other member gets its own size (a few percent either way) and its
 *      own turn, so no two look copy-pasted,
 *   3. it starts far away, behind and to one side, and slides in toward the
 *      hero until its body just touches what is already there (no gap you
 *      can see, no overlap; sepals and leaves may brush over a neighbour),
 *   4. the whole group is centred on its footprint.
 * The shared shadow comes for free: they stand on the same table.
 *
 * Whole and cut (a cut piece in front of the whole) arrives with the cut forms.
 */

/** How many members each layout shows. */
export const LAYOUT_COUNT: Record<Layout, number> = {
  solo: 1,
  'whole-and-cut': 1,
  'cluster-2': 2,
  'cluster-3': 3,
};

/**
 * Where the second and third members go, as directions on the table from
 * the hero (radians, 0 = +X, the right; -PI / 2 = -Z, straight back). +Z faces
 * the camera, so these are behind left and behind right, at different depths.
 */
const SPOTS = [Math.atan2(-0.85, -0.5), Math.atan2(-0.9, 0.42)];

/** How many surface points stand in for each member when checking for touch. */
const SAMPLES = 600;

export interface ClusterOptions {
  /** Seeded dice, so the arrangement is the same on every reload. */
  random: () => number;
  /** Gap between neighbours, in scene units (they should just touch). */
  gap: number;
  /** The hero's turn (radians): its best side to the camera, like a solo ingredient's `turn`. */
  heroTurn: number;
  /**
   * Which way the stem ends point: 'out', away from the group (berries: tips meet in the
   * middle), or 'front', fanning toward the camera with the heads overlapping behind
   * (broccoli: the stalks are what make it read).
   */
  stemEnds?: 'out' | 'front';
}

/** Arrange the members (real size, bottom centre at their origin) into a cluster, in place. */
export function arrangeCluster(members: Group[], options: ClusterOptions): void {
  const { random, gap, heroTurn } = options;
  const stemEnds = options.stemEnds ?? 'out';
  // Dense enough that a lump between two sample points cannot sink into a neighbour.
  const bodies = members.map((member) => samplePoints(member, 'body', 1500));
  // The same body points with their outward directions, to tell "touching from outside" from
  // "sunk inside" (see BodyGrid).
  const surfaces = members.map((member) => sampleSurface(member, 1500));
  const placedSurfaces: Surface[] = [];
  const parts = members.map((member) => samplePoints(member, 'parts', 800));
  // Broccoli stalks are solid: they may not pass through each other. Strawberry sepals are
  // soft and may brush.
  const solidParts = stemEnds === 'front';
  const placedBodies: Vector3[][] = [];
  const placedParts: Vector3[][] = [];
  const placed = placedBodies;

  members.forEach((member, index) => {
    const scale = 1 + signed(random) * 0.06;
    member.scale.setScalar(scale);

    // 'front': stem ends fan out diagonally toward the camera (+Z on the table), about 45
    // degrees off straight-on, so each stalk shows its length and the heads overlap behind.
    // The hero's goes to one side; each next one picks the side that fans away (below).
    const frontFacing = Math.PI / 2 - 0.8 + signed(random) * 0.15 - heroTurn;
    // Which way the stem end points: for 'front' the very end of the stalk (its cut), since a
    // broccoli's many branches hide under the crown and would pull an average off.
    const out = stemEnds === 'front' ? stemEndDirection(member) : partsDirection(member);

    if (index === 0) {
      // Hero: its designed turn (best side to the camera), give or take.
      const turn = stemEnds === 'front' && out ? Math.atan2(out.z, out.x) - frontFacing : heroTurn + signed(random) * 0.1;
      member.rotation.set(0, turn, 0);
      member.position.set(0, 0, 0);
    } else {
      const angle = SPOTS[(index - 1) % SPOTS.length] + signed(random) * 0.25;
      const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
      const otherBodies = placedBodies.flat();
      const otherParts = placedParts.flat();
      // The bodies already placed, ready to ask "is this point inside one of them?".
      const insideOthers = new BodyGrid(placedSurfaces);
      // Turn the member to face `facing`, then slide it in until it just touches.
      const placeFacing = (facing: number) => {
        member.rotation.set(0, out ? Math.atan2(out.z, out.x) - facing : signed(random) * Math.PI, 0);
        const clear = (distance: number) => {
          member.position.copy(direction).multiplyScalar(distance);
          const body = transformed(bodies[index], member);
          const own = transformed(parts[index], member);
          // Bodies just touch. Parts never sink into a body; soft parts (sepals) may brush each
          // other, solid ones (stalks) may not.
          return (
            !insideOthers.reaches(body, gap) &&
            !closerThan(own, otherBodies, gap * 0.5) &&
            !closerThan(body, otherParts, gap * 0.5) &&
            !(solidParts && closerThan(own, otherParts, gap * 0.5))
          );
        };
        // Slide in from far away until it just touches: halve the range each step.
        let far = 0;
        for (const points of placed) for (const p of points) far = Math.max(far, p.length());
        far = far * 2 + 10 * gap + 1;
        let near = 0;
        for (let i = 0; i < 30; i++) {
          const middle = (near + far) / 2;
          if (clear(middle)) far = middle;
          else near = middle;
        }
        member.position.copy(direction).multiplyScalar(far);
      };

      if (stemEnds === 'front') {
        // Try the stem end fanning to either side, and keep the one whose stalk ends up
        // furthest from the stalks already there: they fan apart and never cross.
        const spread = (facing: number) => {
          placeFacing(facing);
          return stemEnd(transformed(parts[index], member), transformed(bodies[index], member)).distanceTo(
            stemEnd(otherParts, otherBodies),
          );
        };
        const left = Math.PI / 2 + 0.8 - heroTurn + signed(random) * 0.15;
        const right = Math.PI / 2 - 0.8 - heroTurn + signed(random) * 0.15;
        placeFacing(spread(left) >= spread(right) ? left : right);
      } else {
        // Stem end out, away from the group, give or take: the berries meet tip and side
        // first, like fruit tumbled into a bowl.
        placeFacing(angle + signed(random) * 0.5);
      }
    }
    placedBodies.push(transformed(bodies[index], member));
    placedParts.push(transformed(parts[index], member));
    placedSurfaces.push(transformedSurface(surfaces[index], member));
  });

  // Centre the group on its footprint, so the framing sees it as one subject.
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of [...placed.flat(), ...placedParts.flat()]) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  for (const member of members) {
    member.position.x -= (minX + maxX) / 2;
    member.position.z -= (minZ + maxZ) / 2;
  }
}

/**
 * A few hundred points on a member, in its own space: its main body (the
 * first piece) or its small parts (calyx, stem, leaves). Bodies are what
 * touch; parts may brush a neighbour's parts but never sink into its body.
 */
export function samplePoints(member: Group, which: 'body' | 'parts' = 'body', budget = SAMPLES): Vector3[] {
  const meshes = member.children.filter((o): o is Mesh => o instanceof Mesh);
  // The body is the first piece, and any more pieces with its name (the watermelon's two wedges).
  const isBody = (mesh: Mesh) => mesh === meshes[0] || (mesh.name !== '' && mesh.name === meshes[0].name);
  const chosen = which === 'body' ? meshes.filter(isBody) : meshes.filter((m) => !isBody(m));
  let total = 0;
  for (const mesh of chosen) total += mesh.geometry.getAttribute('position').count;
  const step = Math.max(1, Math.floor(total / budget));
  const points: Vector3[] = [];
  for (const mesh of chosen) {
    const position = mesh.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < position.count; i += step) points.push(new Vector3().fromBufferAttribute(position, i));
  }
  return points;
}

/** Points on a member's body with the way the surface faces there (outward). */
export interface Surface {
  points: Vector3[];
  normals: Vector3[];
}

/** Body points with their outward directions, in the member's own space (like samplePoints). */
export function sampleSurface(member: Group, budget = SAMPLES): Surface {
  const meshes = member.children.filter((o): o is Mesh => o instanceof Mesh);
  const isBody = (mesh: Mesh) => mesh === meshes[0] || (mesh.name !== '' && mesh.name === meshes[0].name);
  const chosen = meshes.filter(isBody);
  let total = 0;
  for (const mesh of chosen) total += mesh.geometry.getAttribute('position').count;
  const step = Math.max(1, Math.floor(total / budget));
  const surface: Surface = { points: [], normals: [] };
  for (const mesh of chosen) {
    if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
    const position = mesh.geometry.getAttribute('position') as BufferAttribute;
    const normal = mesh.geometry.getAttribute('normal') as BufferAttribute;
    for (let i = 0; i < position.count; i += step) {
      surface.points.push(new Vector3().fromBufferAttribute(position, i));
      surface.normals.push(new Vector3().fromBufferAttribute(normal, i).normalize());
    }
  }
  return surface;
}

/** A surface moved by a member's turn, size and position (directions only turn). */
export function transformedSurface(surface: Surface, member: Group): Surface {
  member.updateMatrix();
  const turn = new Matrix3().getNormalMatrix(member.matrix);
  return {
    points: surface.points.map((p) => p.clone().applyMatrix4(member.matrix)),
    normals: surface.normals.map((n) => n.clone().applyMatrix3(turn).normalize()),
  };
}

/**
 * The bodies already placed, sorted into a grid of little boxes, so a point can quickly ask
 * whether it has reached one of them: is it closer than the gap to a body's surface, or past
 * it, inside? For each point we find the nearest surface point and check which side of the
 * surface the point is on (its outward direction there).
 *
 * Why not just "closer than the gap to any surface point": once two surfaces cross, no two
 * sample points need to be near each other, so a berry slid in by big steps could end up
 * sunk a centimetre into its neighbour and still count as clear (the user's screenshot,
 * 2026-11-09). Wherever two bodies cross, some points sit just inside the other's surface,
 * and those are caught here.
 */
export class BodyGrid {
  private readonly cells = new Map<string, number[]>();
  private readonly points: Vector3[] = [];
  private readonly normals: Vector3[] = [];
  private readonly cell: number;

  constructor(surfaces: Surface[]) {
    for (const s of surfaces) {
      this.points.push(...s.points);
      this.normals.push(...s.normals);
    }
    // How far apart neighbouring surface points are, roughly: the box's surface shared out.
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const p of this.points) {
      min.min(p);
      max.max(p);
    }
    const size = max.clone().sub(min);
    const area = 2 * (size.x * size.y + size.y * size.z + size.z * size.x);
    const spacing = Math.sqrt(area / Math.max(1, this.points.length));
    // A point further than this from every surface point is clear of the surface.
    this.cell = Math.max(spacing * 3, 1e-6);
    this.points.forEach((p, i) => {
      const key = this.key(p, 0, 0, 0);
      const list = this.cells.get(key);
      if (list) list.push(i);
      else this.cells.set(key, [i]);
    });
  }

  private key(p: Vector3, dx: number, dy: number, dz: number): string {
    return `${Math.floor(p.x / this.cell) + dx},${Math.floor(p.y / this.cell) + dy},${Math.floor(p.z / this.cell) + dz}`;
  }

  /** True if any of `points` is closer than `gap` to a placed body's surface, or inside it. */
  reaches(points: Vector3[], gap: number): boolean {
    if (this.points.length === 0) return false;
    const offset = new Vector3();
    for (const p of points) {
      let best = Infinity;
      let nearest = -1;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const list = this.cells.get(this.key(p, dx, dy, dz));
            if (!list) continue;
            for (const i of list) {
              const d = p.distanceToSquared(this.points[i]);
              if (d < best) {
                best = d;
                nearest = i;
              }
            }
          }
        }
      }
      if (nearest < 0) continue;
      // How far outside the surface the point is (negative: inside).
      const outside = offset.copy(p).sub(this.points[nearest]).dot(this.normals[nearest]);
      if (outside < gap) return true;
    }
    return false;
  }
}

/** Which way (on the table) a member's small parts sit from its body: its stem end. */
function partsDirection(member: Group): Vector3 | null {
  const body = samplePoints(member, 'body', 200);
  const parts = samplePoints(member, 'parts', 200);
  if (parts.length === 0) return null;
  const mean = (ps: Vector3[]) => ps.reduce((s, p) => s.add(p), new Vector3()).divideScalar(ps.length);
  const out = mean(parts).sub(mean(body)).setY(0);
  return out.lengthSq() > 1e-8 ? out.normalize() : null;
}

/** Points moved by a member's turn, size and position (its children have no transforms of their own). */
export function transformed(points: Vector3[], member: Group): Vector3[] {
  member.updateMatrix();
  return points.map((p) => p.clone().applyMatrix4(member.matrix));
}

/**
 * Contact spots for one piece, from its points (in the subject's space): where it meets the
 * table and how wide it is there. The footprint's long direction and narrow width are found
 * from how the points spread on the table (like fitting an oval to them). A round piece gets
 * one spot; a long one gets up to `most` spots along its length, each as wide as the piece.
 */
export function footprintSpots(points: Vector3[], most: number): { centre: Vector3; radius: number }[] {
  if (points.length === 0) return [];
  const middle = centroid(points);
  // How the points spread on the table (x, z): a 2 by 2 covariance.
  let xx = 0;
  let xz = 0;
  let zz = 0;
  for (const p of points) {
    const dx = p.x - middle.x;
    const dz = p.z - middle.z;
    xx += dx * dx;
    xz += dx * dz;
    zz += dz * dz;
  }
  // The long direction: the covariance's main axis.
  const angle = 0.5 * Math.atan2(2 * xz, xx - zz);
  const along = new Vector3(Math.cos(angle), 0, Math.sin(angle));
  const across = new Vector3(-along.z, 0, along.x);
  let minA = Infinity;
  let maxA = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  for (const p of points) {
    const d = p.clone().sub(middle);
    const a = d.dot(along);
    const c = d.dot(across);
    minA = Math.min(minA, a);
    maxA = Math.max(maxA, a);
    minC = Math.min(minC, c);
    maxC = Math.max(maxC, c);
  }
  const length = maxA - minA;
  const width = maxC - minC;
  const radius = (width / 2) * 0.88;
  // Round (or nearly): one spot. Long: a row of spots spaced along it, within its ends.
  const count = Math.max(1, Math.min(most, Math.round(length / width)));
  const spots: { centre: Vector3; radius: number }[] = [];
  const centreAlong = (minA + maxA) / 2;
  const centreAcross = (minC + maxC) / 2;
  for (let k = 0; k < count; k++) {
    let a = count === 1 ? centreAlong : minA + radius + ((length - 2 * radius) * k) / (count - 1);
    let r = count === 1 ? Math.max(radius, (length / 2) * 0.88) : radius;
    let c = centreAcross;
    if (count > 1) {
      // Each spot only as wide as the piece is right there: a tapering piece (a watermelon wedge
      // lying down) put a full-size spot by its narrow tip, which poked out past its outline.
      const reach = length / count / 2;
      let lo = Infinity;
      let hi = -Infinity;
      let aLo = Infinity;
      let aHi = -Infinity;
      for (const p of points) {
        const d = p.clone().sub(middle);
        const pa = d.dot(along);
        if (Math.abs(pa - a) > reach) continue;
        const pc = d.dot(across);
        lo = Math.min(lo, pc);
        hi = Math.max(hi, pc);
        aLo = Math.min(aLo, pa);
        aHi = Math.max(aHi, pa);
      }
      if (hi > lo) {
        r = Math.min(r, ((hi - lo) / 2) * 0.88);
        c = (lo + hi) / 2;
        // Keep the spot inside the piece's ends too.
        a = Math.min(Math.max(a, aLo + r), aHi - r);
      }
    }
    spots.push({ centre: middle.clone().addScaledVector(along, a).addScaledVector(across, c), radius: r });
  }
  return spots;
}

/** The stem end: the part point furthest from the body's middle (a stalk's cut end). */
function stemEnd(parts: Vector3[], body: Vector3[]): Vector3 {
  const middle = centroid(body);
  let best = middle;
  let bestDistance = -1;
  for (const p of parts) {
    const d = p.distanceToSquared(middle);
    if (d > bestDistance) {
      bestDistance = d;
      best = p;
    }
  }
  return best;
}

/** Which way (on the table) a member's stem end points from its body, in its own space. */
function stemEndDirection(member: Group): Vector3 | null {
  const body = samplePoints(member, 'body', 200);
  const parts = samplePoints(member, 'parts', 400);
  if (parts.length === 0) return null;
  const out = stemEnd(parts, body).clone().sub(centroid(body)).setY(0);
  return out.lengthSq() > 1e-8 ? out.normalize() : null;
}

/** The middle of a set of points. */
function centroid(points: Vector3[]): Vector3 {
  const sum = new Vector3();
  for (const p of points) sum.add(p);
  return points.length > 0 ? sum.divideScalar(points.length) : sum;
}

/**
 * True if any point of `a` comes closer than `limit` to any point of `b`. Fast: only points
 * of `a` inside `b`'s box (grown by `limit`) are checked, and it stops at the first hit.
 */
export function closerThan(a: Vector3[], b: Vector3[], limit: number): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const q of b) {
    min.min(q);
    max.max(q);
  }
  min.subScalar(limit);
  max.addScalar(limit);
  const limitSq = limit * limit;
  for (const p of a) {
    if (p.x < min.x || p.y < min.y || p.z < min.z || p.x > max.x || p.y > max.y || p.z > max.z) continue;
    for (const q of b) if (p.distanceToSquared(q) < limitSq) return true;
  }
  return false;
}

/** The closest distance between two sets of points. */
export function minDistance(a: Vector3[], b: Vector3[]): number {
  let best = Infinity;
  for (const p of a) {
    for (const q of b) {
      const d = p.distanceToSquared(q);
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best);
}
