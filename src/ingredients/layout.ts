import { Mesh, Vector3, type BufferAttribute, type Group } from 'three';
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
  const bodies = members.map((member) => samplePoints(member, 'body'));
  const parts = members.map((member) => samplePoints(member, 'parts'));
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
      // Turn the member to face `facing`, then slide it in until it just touches.
      const placeFacing = (facing: number) => {
        member.rotation.set(0, out ? Math.atan2(out.z, out.x) - facing : signed(random) * Math.PI, 0);
        const clear = (distance: number) => {
          member.position.copy(direction).multiplyScalar(distance);
          const body = transformed(bodies[index], member);
          // Bodies just touch. Leaves and sepals may brush each other, but never sink into a body.
          return (
            minDistance(body, otherBodies) >= gap &&
            minDistance(transformed(parts[index], member), otherBodies) >= gap * 0.5 &&
            minDistance(body, otherParts) >= gap * 0.5
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
  const chosen = which === 'body' ? meshes.slice(0, 1) : meshes.slice(1);
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
