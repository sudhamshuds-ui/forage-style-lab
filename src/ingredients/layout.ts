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
  const bodies = members.map((member) => samplePoints(member, 'body'));
  const parts = members.map((member) => samplePoints(member, 'parts'));
  const placedBodies: Vector3[][] = [];
  const placedParts: Vector3[][] = [];
  const placed = placedBodies;

  members.forEach((member, index) => {
    const scale = 1 + signed(random) * 0.06;
    member.scale.setScalar(scale);

    if (index === 0) {
      // Hero: its designed turn (best side to the camera), give or take.
      member.rotation.set(0, heroTurn + signed(random) * 0.1, 0);
      member.position.set(0, 0, 0);
    } else {
      const angle = SPOTS[(index - 1) % SPOTS.length] + signed(random) * 0.25;
      const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
      // Turn it so its stem end (calyx, leaves) faces out, away from the group, give or take:
      // the berries meet tip and side first, like fruit tumbled into a bowl.
      const out = partsDirection(member);
      const turn = out ? Math.atan2(out.z, out.x) - angle + signed(random) * 0.5 : signed(random) * Math.PI;
      member.rotation.set(0, turn, 0);
      const otherBodies = placedBodies.flat();
      const otherParts = placedParts.flat();
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
