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
 * A pinwheel, so the group is balanced from every side as you orbit, not
 * just from the front:
 *   1. the members sit on spokes round a shared centre (three at about 120
 *      degrees, two at about 140), each a little off, so it is never stiff,
 *   2. the hero's spoke points at the camera (turned by the entry's `turn`),
 *      so from the front it sits in front with its best side showing,
 *   3. every member lies along its spoke, stem end (calyx, leaves) pointing
 *      out and tip toward the middle, with its own size and a little twist,
 *   4. each slides in along its spoke until its body just touches what is
 *      already there (no gap you can see, no overlap; sepals and stems may
 *      brush each other but never sink into a body),
 *   5. the whole group is centred on its footprint.
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
 * The spokes, as angles on the table from the hero's spoke (radians). Angles
 * on the table: 0 = +X (right), PI / 2 = +Z (toward the camera).
 */
const SPOKES: Record<number, number[]> = {
  1: [0],
  2: [0, (140 * Math.PI) / 180],
  3: [0, (120 * Math.PI) / 180, (240 * Math.PI) / 180],
};

/** How many surface points stand in for each member when checking for touch. */
const SAMPLES = 600;

export interface ClusterOptions {
  /** Seeded dice, so the arrangement is the same on every reload. */
  random: () => number;
  /** Gap between neighbours, in scene units (they should just touch). */
  gap: number;
  /** Turns the pinwheel (radians): 0 points the hero's stem end straight at the camera. */
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

  const spokes = SPOKES[Math.min(members.length, 3)] ?? SPOKES[3];
  const heroSpoke = Math.PI / 2 + heroTurn;

  members.forEach((member, index) => {
    const scale = 1 + signed(random) * 0.06;
    member.scale.setScalar(scale);
    // This member's spoke: evenly round the centre, each a little off (the hero barely).
    const angle = heroSpoke + spokes[index % spokes.length] + signed(random) * (index === 0 ? 0.05 : 0.2);
    const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    // Lie along the spoke, stem end pointing out, with a little twist of its own.
    const out = partsDirection(member);
    const turn = out ? Math.atan2(out.z, out.x) - angle + signed(random) * 0.3 : signed(random) * Math.PI;
    member.rotation.set(0, turn, 0);

    if (index === 0) {
      member.position.set(0, 0, 0);
    } else {
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
