import { describe, expect, it } from 'vitest';
import { Group, Matrix3, Mesh, Vector3, type BufferAttribute } from 'three';
import { buildStrawberry } from './forms/strawberry';
import { buildChicken } from './forms/chicken';
import { feetSpots } from './subject';
import { seedFromId, seededRandom } from './forms/kit/random';
import { LAYOUT_COUNT, arrangeCluster, closerThan, minDistance, samplePoints, transformed } from './layout';
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

  it('never sinks one berry into another (checked on every vertex, from inside too)', () => {
    // Points that are close is not enough: once two surfaces cross, sample points can all be
    // far apart while a berry sits a centimetre inside its neighbour (the user saw this).
    const { members } = cluster();
    const body = (g: Group) => {
      g.updateMatrix();
      const mesh = g.children[0] as Mesh;
      const pos = mesh.geometry.getAttribute('position') as BufferAttribute;
      const nor = mesh.geometry.getAttribute('normal') as BufferAttribute;
      const turn = new Matrix3().getNormalMatrix(g.matrix);
      const points: Vector3[] = [];
      const normals: Vector3[] = [];
      for (let i = 0; i < pos.count; i++) {
        points.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(g.matrix));
        normals.push(new Vector3().fromBufferAttribute(nor, i).applyMatrix3(turn).normalize());
      }
      return { points, normals };
    };
    const bodies = members.map(body);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = 0; j < bodies.length; j++) {
        if (i === j) continue;
        let deepest = 0;
        for (const p of bodies[i].points) {
          let best = Infinity;
          let k = -1;
          bodies[j].points.forEach((q, n) => {
            const d = p.distanceToSquared(q);
            if (d < best) {
              best = d;
              k = n;
            }
          });
          // Only near the other's surface (its far side faces away and would read as inside).
          if (Math.sqrt(best) > cmToUnits(1)) continue;
          deepest = Math.max(deepest, -p.clone().sub(bodies[j].points[k]).dot(bodies[j].normals[k]));
        }
        expect(deepest, `berry ${i} into ${j}`).toBeLessThan(cmToUnits(0.03));
      }
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

describe('broccoli bunch (stem ends to the front)', () => {
  it('never passes one head through the other: crowns, stalks and leaves all stay apart', async () => {
    const { buildBroccoli } = await import('./forms/broccoli');
    const seed = seedFromId('broccoli');
    const members = [0, 1].map((m) => {
      const group = new Group();
      for (const piece of buildBroccoli({ state: 'whole', seed: (seed + m * 7919) >>> 0 })) group.add(new Mesh(piece.geometry));
      return group;
    });
    const gap = cmToUnits(0.03);
    arrangeCluster(members, { random: seededRandom(seed ^ 0x9e3779b9), gap, heroTurn: 0, stemEnds: 'front' });
    const [a, b] = members;
    const all = (m: Group) => [...transformed(samplePoints(m, 'body', 1500), m), ...transformed(samplePoints(m, 'parts', 800), m)];
    expect(closerThan(all(a), all(b), gap * 0.49)).toBe(false);
  });
});

describe('contact spots for an ingredient resting on a few places (the drumstick)', () => {
  it('puts spots only under the bulb and the knuckle, none under the shank in the air', () => {
    const pieces = buildChicken({ state: 'whole', seed: seedFromId('chicken') });
    const member = new Group();
    for (const piece of pieces) {
      const mesh = new Mesh(piece.geometry);
      mesh.name = piece.role;
      member.add(mesh);
    }
    member.updateMatrix();
    const spots = feetSpots(member, 4);
    expect(spots.length).toBeGreaterThanOrEqual(2);
    // Every spot sits right under a point of the drumstick that touches the table.
    const low: { x: number; z: number }[] = [];
    for (const piece of pieces) {
      const position = piece.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) if (position.getY(i) < 0.01) low.push({ x: position.getX(i), z: position.getZ(i) });
    }
    for (const spot of spots) {
      const nearest = Math.min(...low.map((p) => Math.hypot(p.x - spot.centre.x, p.z - spot.centre.z)));
      expect(nearest, `spot at ${spot.centre.x.toFixed(2)}`).toBeLessThan(spot.radius);
    }
  });
});
