import { describe, expect, it } from 'vitest';
import { Group, Mesh } from 'three';
import { buildStrawberry } from './forms/strawberry';
import { seedFromId, seededRandom } from './forms/kit/random';
import { LAYOUT_COUNT, arrangeCluster, minDistance, samplePoints, transformed } from './layout';
import { cmToUnits } from './scale';

/** Three strawberries, each its own seeded variant, arranged as on stage. */
function cluster() {
  const seed = seedFromId('strawberry');
  const members = [0, 1, 2].map((m) => {
    const group = new Group();
    for (const piece of buildStrawberry({ state: 'whole', seed: (seed + m * 7919) >>> 0 })) group.add(new Mesh(piece.geometry));
    return group;
  });
  const gap = cmToUnits(0.03);
  arrangeCluster(members, { random: seededRandom(seed ^ 0x9e3779b9), gap, heroTurn: 0 });
  return {
    members,
    gap,
    points: members.map((m) => transformed(samplePoints(m, 'body'), m)),
    parts: members.map((m) => transformed(samplePoints(m, 'parts'), m)),
  };
}

describe('cluster layout', () => {
  it('shows three for a cluster of three, two for a pair, one for a solo', () => {
    expect([LAYOUT_COUNT['cluster-3'], LAYOUT_COUNT['cluster-2'], LAYOUT_COUNT.solo]).toEqual([3, 2, 1]);
  });

  it('places every member so it touches its neighbours without overlapping', () => {
    const { points, gap } = cluster();
    for (let i = 1; i < points.length; i++) {
      // Nearest earlier member: no closer than the gap, and no further than a hair beyond it.
      const nearest = Math.min(...points.slice(0, i).map((other) => minDistance(points[i], other)));
      expect(nearest).toBeGreaterThanOrEqual(gap * 0.999);
      expect(nearest).toBeLessThan(gap + cmToUnits(0.05));
    }
  });

  it('never lets a sepal or stem sink into a neighbouring berry', () => {
    const { points, parts, gap } = cluster();
    for (let i = 0; i < points.length; i++) {
      for (let j = 0; j < points.length; j++) {
        if (i !== j) expect(minDistance(parts[i], points[j]), `parts of ${i} into ${j}`).toBeGreaterThanOrEqual(gap * 0.49);
      }
    }
  });

  it('keeps everyone on the table, the hero in front, and the group centred', () => {
    const { members, points, parts } = cluster();
    for (const m of members) expect(m.position.y).toBe(0);
    // +Z faces the camera: the hero is the frontmost.
    const depth = (ps: typeof points[number]) => ps.reduce((s, p) => s + p.z, 0) / ps.length;
    expect(depth(points[0])).toBeGreaterThan(depth(points[1]));
    expect(depth(points[0])).toBeGreaterThan(depth(points[2]));
    const all = [...points.flat(), ...parts.flat()];
    const xs = all.map((p) => p.x);
    const zs = all.map((p) => p.z);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(0, 5);
    expect((Math.min(...zs) + Math.max(...zs)) / 2).toBeCloseTo(0, 5);
  });

  it('is never a row: the three members make a triangle', () => {
    const { members } = cluster();
    const [a, b, c] = members.map((m) => m.position);
    // Twice the triangle's area on the table: clearly more than zero.
    const area = Math.abs((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z));
    expect(area).toBeGreaterThan(cmToUnits(1) ** 2);
  });

  it('arranges them the same way on every reload', () => {
    const one = cluster().members.map((m) => m.position.toArray());
    const two = cluster().members.map((m) => m.position.toArray());
    expect(two).toEqual(one);
  });
});
