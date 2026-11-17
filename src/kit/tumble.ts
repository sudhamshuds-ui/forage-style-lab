import * as CANNON from 'cannon-es';
import { seededRandom } from '../ingredients/forms/kit/random';

/**
 * Tumble: a heap of small pieces that falls and settles with real physics (the `cannon-es`
 * library, added 2026-11-17 with the user's go-ahead).
 *
 * Placing cubes by rules always looked arranged, or balanced on edges no cube could stand on.
 * So a heap is made the way a real one is: pieces are let go above the table and fall, knock
 * into each other and come to rest, each on the table or on its neighbours at whatever tilt it
 * landed.
 *
 * A `Heap` is a small physics world that stays alive while its ingredient is on the page:
 *   Heap.settled(count)  a heap already at rest (worked out in one go, and remembered)
 *   add(n)               n more pieces are held above it, ready to drop
 *   remove(n)            the last n pieces are taken away (what leaned on them will fall)
 *   step(times)          let time pass; true once everything is at rest again
 * The page calls `step` every frame after a quantity change, so you watch the new pieces drop
 * in and tumble onto the heap (the user, 2026-11-17).
 *
 * Pieces come in two shapes, measured in units of one piece's size (the caller scales them):
 *   box    a block, each of its three sides a little different (not a perfect cube)
 *   wedge  half a block cut corner to corner: a triangular piece
 */
export interface HeapPiece {
  kind: 'box' | 'wedge';
  /** Half its size along its own three directions. */
  half: [number, number, number];
  body: CANNON.Body;
}

/** A wedge's six corners (half sizes a, b, c), set so its balance point is at its own middle. */
export function wedgeCorners(a: number, b: number, c: number): [number, number, number][] {
  const corners: [number, number, number][] = [[-a, -b, -c], [a, -b, -c], [-a, b, -c], [-a, -b, c], [a, -b, c], [-a, b, c]];
  return corners.map(([x, y, z]) => [x + a / 3, y + b / 3, z]);
}
/** A wedge's five faces, each a loop of corners, wound so it faces outward. */
export const WEDGE_FACES = [[0, 2, 1], [3, 4, 5], [0, 1, 4, 3], [0, 3, 5, 2], [1, 2, 5, 4]];

/** Where a piece came to rest: its place and its turn (kept so the same heap is not worked out twice). */
type Pose = [number, number, number, number, number, number, number];
const remembered = new Map<string, Pose[]>();

export class Heap {
  readonly pieces: HeapPiece[] = [];
  private readonly world: CANNON.World;
  private readonly random = seededRandom(0x7ab1e);
  /** Unseen walls round the heap while pieces fall (see `ring`); taken away once they have landed. */
  private walls: CANNON.Body[] = [];

  constructor(private readonly wedges: number) {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -25, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    (this.world.solver as CANNON.GSSolver).iterations = 7;
    // Grippy and dead: pieces of fruit do not slide far or bounce.
    this.world.defaultContactMaterial.friction = 0.8;
    this.world.defaultContactMaterial.restitution = 0;
    const table = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    table.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(table);
  }

  /** A heap of `count` pieces, already at rest. The same count always gives the same heap. */
  static settled(count: number, wedges: number): Heap {
    const heap = new Heap(wedges);
    const key = `${count}:${wedges}`;
    const known = remembered.get(key);
    if (known) {
      // Put every piece straight where it came to rest last time.
      for (const pose of known) {
        const piece = heap.make();
        piece.body.position.set(pose[0], pose[1], pose[2]);
        piece.body.quaternion.set(pose[3], pose[4], pose[5], pose[6]);
        piece.body.sleep();
      }
      return heap;
    }
    heap.fill(count);
    remembered.set(key, heap.pieces.map(({ body: b }) => [b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w]));
    return heap;
  }

  /** One more piece in the world (not placed yet). Its shape depends only on its number, so piece 12 is the same in every heap. */
  private make(): HeapPiece {
    const random = seededRandom(this.pieces.length * 7919 + 13);
    const s = 0.85 + random() * 0.3;
    const half: [number, number, number] = [(s * (0.78 + random() * 0.4)) / 2, (s * (0.78 + random() * 0.4)) / 2, (s * (0.78 + random() * 0.4)) / 2];
    const kind = random() < this.wedges ? 'wedge' : 'box';
    const shape =
      kind === 'box'
        ? new CANNON.Box(new CANNON.Vec3(...half))
        : new CANNON.ConvexPolyhedron({ vertices: wedgeCorners(...half).map((p) => new CANNON.Vec3(...p)), faces: WEDGE_FACES });
    const body = new CANNON.Body({ mass: s * s * s, shape, sleepSpeedLimit: 0.3, sleepTimeLimit: 0.25, linearDamping: 0.3, angularDamping: 0.4 });
    this.world.addBody(body);
    const piece: HeapPiece = { kind, half, body };
    this.pieces.push(piece);
    return piece;
  }

  /** Hold a piece above the table: somewhere within `radius` of the middle, at `height`, turned any way round. */
  private hold(piece: HeapPiece, radius: number, height: number): void {
    const a = this.random() * Math.PI * 2;
    const r = Math.sqrt(this.random()) * radius;
    piece.body.position.set(Math.cos(a) * r, height + this.random() * 0.3, Math.sin(a) * r);
    piece.body.quaternion.setFromEuler(this.random() * 6.28, this.random() * 6.28, this.random() * 6.28);
    piece.body.velocity.setZero();
    piece.body.angularVelocity.setZero();
    piece.body.wakeUp();
  }

  /** The first heap: everything dropped at once inside a ring of unseen walls, and let settle. */
  private fill(count: number): void {
    // The ring keeps the pieces together while they fall, like cupped hands; it is taken away
    // afterwards so the heap can relax and its edge is not pressed flat.
    const radius = 0.34 * Math.sqrt(count) + 0.5;
    this.ring(radius * 1.25);
    const perLayer = Math.max(3, Math.round(radius * radius * 1.9));
    for (let i = 0; i < count; i++) this.hold(this.make(), radius, 0.9 + Math.floor(i / perLayer) * 1.45);
    for (let step = 0; step < 380; step++) {
      this.world.step(1 / 60);
      if (step > 60 && this.atRest) break;
    }
    // The hands open: the heap relaxes a little on its own.
    this.open(true);
    for (let step = 0; step < 140; step++) {
      this.world.step(1 / 60);
      if (step > 20 && this.atRest) break;
    }
  }

  /** Stand twelve unseen walls in a ring of this radius (replacing any that are there). */
  private ring(radius: number): void {
    for (const wall of this.walls) this.world.removeBody(wall);
    this.walls = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
      wall.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      // A plane faces along its own z: turn it to face the middle.
      wall.quaternion.setFromEuler(0, -a - Math.PI / 2, 0);
      this.world.addBody(wall);
      this.walls.push(wall);
    }
  }

  /** Take the walls away. `wake` also stirs every piece, so the heap relaxes without them. */
  private open(wake: boolean): void {
    for (const wall of this.walls) this.world.removeBody(wall);
    this.walls = [];
    if (wake) for (const piece of this.pieces) piece.body.wakeUp();
  }

  /** `n` more pieces, held in loose layers just above the heap, ready to fall onto it. */
  add(n: number): void {
    let top = 0;
    for (const { body } of this.pieces) top = Math.max(top, body.position.y);
    // Over the middle of the heap, so they land on it and tumble down its sides.
    const radius = 0.26 * Math.sqrt(this.pieces.length + n) + 0.3;
    const perLayer = Math.max(3, Math.round(radius * radius * 1.9));
    for (let i = 0; i < n; i++) this.hold(this.make(), radius, top + 1.6 + Math.floor(i / perLayer) * 1.45);
    // A wide ring keeps pieces that bounce off the heap from rolling far across the table.
    this.ring((0.34 * Math.sqrt(this.pieces.length) + 0.5) * 1.35);
  }

  /** Take the last `n` pieces away. Whatever leaned on them wakes up and will fall. */
  remove(n: number): void {
    for (const piece of this.pieces.splice(Math.max(0, this.pieces.length - n))) this.world.removeBody(piece.body);
    for (const piece of this.pieces) piece.body.wakeUp();
  }

  /** Let time pass (`times` sixtieths of a second). Returns true once every piece is at rest. */
  step(times: number): boolean {
    for (let i = 0; i < times; i++) this.world.step(1 / 60);
    if (times === 0 || !this.atRest) return false;
    // Landed: the ring is taken away quietly. (Waking the heap here made it settle a second
    // time after a pause, "a delayed settle", the user, 2026-11-17. The ring is wide, so
    // hardly anything leans on it.)
    this.open(false);
    return true;
  }

  get atRest(): boolean {
    return this.pieces.every((piece) => piece.body.sleepState === CANNON.Body.SLEEPING);
  }
}
