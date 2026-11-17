import * as CANNON from 'cannon-es';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { seededRandom } from '../ingredients/forms/kit/random';

/**
 * Tumble: drop a handful of small pieces onto the table and let them come to rest, with real
 * physics (the `cannon-es` library, added 2026-11-17 with the user's go-ahead).
 *
 * Placing cubes by rules always looked arranged, or balanced on edges no cube could stand on.
 * So the heap is made the way a real one is: the pieces are held above the table in a loose
 * column, let go, and fall, knock into each other and settle. Then the result is frozen. Every
 * piece ends up resting on the table or on its neighbours at whatever tilt it landed.
 *
 * This runs once, when the heap is built (it is never animated), and the result is remembered,
 * so the same heap is not worked out twice.
 *
 * Pieces come in two shapes, in units of one piece's size (the caller scales them):
 *   box    a block, each of its three sides a little different (not a perfect cube)
 *   wedge  half a block cut corner to corner: a triangular piece
 */
export interface TumbledPiece {
  kind: 'box' | 'wedge';
  /** Half its size along its own three directions. */
  half: [number, number, number];
  /** Where it came to rest: its middle and its turn. */
  matrix: Matrix4;
}

/** A wedge's six corners (half sizes a, b, c), set so its balance point is at its own middle. */
export function wedgeCorners(a: number, b: number, c: number): [number, number, number][] {
  const corners: [number, number, number][] = [[-a, -b, -c], [a, -b, -c], [-a, b, -c], [-a, -b, c], [a, -b, c], [-a, b, c]];
  return corners.map(([x, y, z]) => [x + a / 3, y + b / 3, z]);
}
/** A wedge's five faces, each a loop of corners, wound so it faces outward. */
export const WEDGE_FACES = [[0, 2, 1], [3, 4, 5], [0, 1, 4, 3], [0, 3, 5, 2], [1, 2, 5, 4]];

const remembered = new Map<string, TumbledPiece[]>();

/**
 * Drop `count` pieces and return where each came to rest. `wedges` is the share of wedge
 * shapes (0 to 1). The same count and share always give the same heap.
 */
export function tumble(count: number, wedges: number): TumbledPiece[] {
  const key = `${count}:${wedges}`;
  const known = remembered.get(key);
  if (known) return known;

  const random = seededRandom((count * 977) ^ Math.round(wedges * 1000));
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -25, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  (world.solver as CANNON.GSSolver).iterations = 7;
  // Grippy and dead: pieces of fruit do not slide far or bounce.
  world.defaultContactMaterial.friction = 0.8;
  world.defaultContactMaterial.restitution = 0;

  const table = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  table.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(table);

  // A ring of unseen walls keeps the pieces together while they fall, like cupped hands; it is
  // taken away afterwards so the heap can relax and its edge is not pressed flat.
  const radius = 0.34 * Math.sqrt(count) + 0.5;
  const walls: CANNON.Body[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    wall.position.set(Math.cos(a) * radius * 1.25, 0, Math.sin(a) * radius * 1.25);
    // A plane faces along its own z: turn it to face the middle.
    wall.quaternion.setFromEuler(0, -a - Math.PI / 2, 0);
    world.addBody(wall);
    walls.push(wall);
  }

  const pieces: { body: CANNON.Body; kind: 'box' | 'wedge'; half: [number, number, number] }[] = [];
  const perLayer = Math.max(3, Math.round(radius * radius * 1.9));
  for (let i = 0; i < count; i++) {
    const s = 0.85 + random() * 0.3;
    const half: [number, number, number] = [(s * (0.78 + random() * 0.4)) / 2, (s * (0.78 + random() * 0.4)) / 2, (s * (0.78 + random() * 0.4)) / 2];
    const kind = random() < wedges ? 'wedge' : 'box';
    const shape =
      kind === 'box'
        ? new CANNON.Box(new CANNON.Vec3(...half))
        : new CANNON.ConvexPolyhedron({ vertices: wedgeCorners(...half).map((p) => new CANNON.Vec3(...p)), faces: WEDGE_FACES });
    const body = new CANNON.Body({ mass: s * s * s, shape, sleepSpeedLimit: 0.3, sleepTimeLimit: 0.25, linearDamping: 0.3, angularDamping: 0.4 });
    // Held in loose layers above the table, each turned any way round.
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * radius;
    body.position.set(Math.cos(a) * r, 0.9 + Math.floor(i / perLayer) * 1.45 + random() * 0.3, Math.sin(a) * r);
    body.quaternion.setFromEuler(random() * 6.28, random() * 6.28, random() * 6.28);
    world.addBody(body);
    pieces.push({ body, kind, half });
  }

  const asleep = () => pieces.every((p) => p.body.sleepState === CANNON.Body.SLEEPING);
  // Fall and settle inside the ring.
  for (let step = 0; step < 380; step++) {
    world.step(1 / 60);
    if (step > 60 && asleep()) break;
  }
  // The hands open: the heap relaxes a little on its own.
  for (const wall of walls) world.removeBody(wall);
  for (const p of pieces) p.body.wakeUp();
  for (let step = 0; step < 140; step++) {
    world.step(1 / 60);
    if (step > 20 && asleep()) break;
  }

  const result = pieces.map(({ body, kind, half }) => ({
    kind,
    half,
    matrix: new Matrix4().compose(
      new Vector3(body.position.x, body.position.y, body.position.z),
      new Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w),
      new Vector3(1, 1, 1),
    ),
  }));
  remembered.set(key, result);
  return result;
}
