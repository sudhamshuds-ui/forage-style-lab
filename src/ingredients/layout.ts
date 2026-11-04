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
}

/** Arrange the members (real size, bottom centre at their origin) into a cluster, in place. */
export function arrangeCluster(members: Group[], options: ClusterOptions): void {
  const { random, gap, heroTurn } = options;
  const local = members.map((member) => samplePoints(member));
  const placed: Vector3[][] = [];

  members.forEach((member, index) => {
    // Hero: its designed turn, give or take. The others: a clear turn of their own, either way.
    const side = random() < 0.5 ? -1 : 1;
    const turn = index === 0 ? heroTurn + signed(random) * 0.1 : heroTurn + side * (0.6 + random() * 0.7);
    const scale = 1 + signed(random) * 0.06;
    member.rotation.set(0, turn, 0);
    member.scale.setScalar(scale);

    if (index === 0) {
      member.position.set(0, 0, 0);
    } else {
      const angle = SPOTS[(index - 1) % SPOTS.length] + signed(random) * 0.25;
      const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
      const others = placed.flat();
      const clear = (distance: number) => {
        member.position.copy(direction).multiplyScalar(distance);
        return minDistance(transformed(local[index], member), others) >= gap;
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
    }
    placed.push(transformed(local[index], member));
  });

  // Centre the group on its footprint, so the framing sees it as one subject.
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of placed.flat()) {
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
 * A few hundred points on a member's main body (its first piece), in its own
 * space. Only the body counts for touching: soft parts like sepals and leaves
 * may brush over a neighbour, as they do in a real bowl of berries, instead of
 * holding the bodies apart.
 */
export function samplePoints(member: Group, budget = SAMPLES): Vector3[] {
  const body = member.children.find((o): o is Mesh => o instanceof Mesh);
  if (!body) return [];
  const position = body.geometry.getAttribute('position') as BufferAttribute;
  const step = Math.max(1, Math.floor(position.count / budget));
  const points: Vector3[] = [];
  for (let i = 0; i < position.count; i += step) points.push(new Vector3().fromBufferAttribute(position, i));
  return points;
}

/** Points moved by a member's turn, size and position (its children have no transforms of their own). */
export function transformed(points: Vector3[], member: Group): Vector3[] {
  member.updateMatrix();
  return points.map((p) => p.clone().applyMatrix4(member.matrix));
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
