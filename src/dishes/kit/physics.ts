import { BufferAttribute, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import type { FormPiece } from '../../ingredients/forms/kit/piece';
import { drain } from '../../ingredients/forms/kit/slices';

/**
 * Real physics for plating (the user, 2026-11-22: "the dish should obey real world physics and
 * centre of gravity"). Like dropping each piece onto the plate by hand and letting it settle: every
 * piece is a solid body (its convex outline), the plate, the sauce and the board are the ground,
 * gravity pulls, friction holds; a piece leans on its neighbour, slides off what cannot hold it,
 * and stops where its weight is supported. Nothing floats, nothing passes through anything.
 *
 * Rapier (a physics engine, WebAssembly) is loaded only where dishes are built (the dish review, the
 * kitchen, the tests): `loadPhysics()` once at start. Without it the composer falls back to the
 * height-map `Table.rest`.
 *
 * Built in centimetres; the engine works in metres (so its tolerances fit food: about a millimetre).
 */
type Rapier = typeof import('@dimforge/rapier3d-compat');
let RAPIER: Rapier | null = null;

export async function loadPhysics(): Promise<void> {
  if (RAPIER) return;
  const module = (await import('@dimforge/rapier3d-compat')).default as unknown as Rapier;
  await module.init();
  RAPIER = module;
}

export function physicsReady(): boolean {
  return RAPIER !== null;
}

// Centimetres as the engine's unit: food is 1 to 10 cm, the size its tolerances suit (in metres a
// strawberry is 0.03 and slipped through the ground).
const M = 1;

/** Points of a geometry (cm), a few hundred at most, for a body's outline. */
function samplePoints(geometries: BufferGeometry[], most = 300): Float32Array {
  let total = 0;
  for (const g of geometries) total += g.getAttribute('position').count;
  const step = Math.max(1, Math.floor(total / most));
  const out: number[] = [];
  let k = 0;
  for (const g of geometries) {
    const pos = g.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < pos.count; i++, k++) if (k % step === 0) out.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  }
  return Float32Array.from(out);
}

/**
 * A settled piece's solid for the next layer to land on. Its convex outline when that is close to
 * the piece (cubes, wedges, fries, toast): a few dozen faces, so a layer settles in a fraction of a
 * second (with every settled piece as its full triangle mesh, a rice bowl took up to 100 s to
 * build). Its exact triangles only when the outline would be far off (a curled leaf, a hollow cup),
 * judged by how much of the outline the piece fills.
 */
function heldShape(geometry: BufferGeometry) {
  const points = samplePoints([geometry], 200);
  const hull = RAPIER!.ColliderDesc.convexHull(points);
  geometry.computeBoundingBox();
  const b = geometry.boundingBox!;
  const boxVolume = Math.max(1e-6, (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z));
  // A cheap fullness test: the piece's own volume against its box (a cube fills about all of it,
  // a curled leaf or a cup very little).
  const fill = Math.abs(signedVolume(geometry)) / boxVolume;
  return hull && fill > 0.35 ? hull : trimeshOf(geometry);
}

function signedVolume(geometry: BufferGeometry): number {
  const pos = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.index ? (geometry.index.array as ArrayLike<number>) : null;
  const n = index ? index.length : pos.count;
  let v = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    const a = index ? index[i] : i, b = index ? index[i + 1] : i + 1, c = index ? index[i + 2] : i + 2;
    const ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a);
    const bx = pos.getX(b), by = pos.getY(b), bz = pos.getZ(b);
    const cx = pos.getX(c), cy = pos.getY(c), cz = pos.getZ(c);
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
}

/** A geometry as a two-sided triangle mesh collider (cm). */
function trimeshOf(geometry: BufferGeometry) {
  const pos = geometry.getAttribute('position') as BufferAttribute;
  const vertices = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) vertices.set([pos.getX(i) * M, pos.getY(i) * M, pos.getZ(i) * M], i * 3);
  const one = geometry.index ? Array.from(geometry.index.array as ArrayLike<number>) : Array.from({ length: pos.count }, (_, i) => i);
  const both: number[] = [...one];
  for (let i = 0; i + 2 < one.length; i += 3) both.push(one[i], one[i + 2], one[i + 1]);
  return RAPIER!.ColliderDesc.trimesh(vertices, Uint32Array.from(both));
}

export interface PhysicsReport {
  /** Pieces held up by nothing at the end. */
  floating: number;
  /** The deepest overlap between two pieces (cm). */
  deepest: number;
  /** Pieces still moving when the time ran out. */
  restless: number;
}

/**
 * A plate in the physics world. Add the ground (static shapes), then drop pieces tier by tier;
 * each drop settles before the next, like plating by hand.
 */
export class PhysicsPlate {
  private readonly world: import('@dimforge/rapier3d-compat').World;
  private readonly bodies: { body: import('@dimforge/rapier3d-compat').RigidBody; pieces: FormPiece[]; centre: Vector3; collider: number; baked: boolean }[] = [];
  /** How far each settled piece turned from the way it was laid (degrees): 0 still flat, 90 on its edge. */
  private readonly tilts = new Map<FormPiece[], number>();
  /** The fixed solid each settled piece became, so a badly placed one can be lifted out again. */
  private readonly held = new Map<FormPiece[], import('@dimforge/rapier3d-compat').RigidBody>();

  constructor() {
    if (!RAPIER) throw new Error('Physics is not loaded: call loadPhysics() first.');
    this.world = new RAPIER.World({ x: 0, y: -981, z: 0 });
    this.world.timestep = 1 / 120;
    // (R8: the world is in centimetres, so the engine's tolerances are too: its contact margin was
    // set for metres, 0.002 cm here, and thin pieces slipped through the plate between two steps,
    // and pieces resting on others buzzed.)
    this.world.lengthUnit = 100;
  }

  /** A fixed surface (the plate, a sauce pool, the board), as its exact triangles. */
  addGround(geometry: BufferGeometry): void {
    const R = RAPIER!;
    const g = geometry.index ? geometry : geometry;
    const pos = g.getAttribute('position') as BufferAttribute;
    const vertices = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) vertices.set([pos.getX(i) * M, pos.getY(i) * M, pos.getZ(i) * M], i * 3);
    const one = g.index ? Array.from(g.index.array as ArrayLike<number>) : Array.from({ length: pos.count }, (_, i) => i);
    // Both faces of every triangle: a ground built facing the other way (the rice's mound) would
    // otherwise let pieces fall straight through it.
    const back: number[] = [];
    for (let i = 0; i + 2 < one.length; i += 3) back.push(one[i], one[i + 2], one[i + 1]);
    const indices = Uint32Array.from([...one, ...back]);
    const body = this.world.createRigidBody(R.RigidBodyDesc.fixed());
    this.world.createCollider(R.ColliderDesc.trimesh(vertices, indices).setFriction(0.9), body);
  }

  /**
   * The ground as a height field (a grid of heights, like a game's terrain): the plate, its sauce,
   * a bed of leaves, the rice, all at once, from a height at each point (cm). A grid has no gaps,
   * so nothing slips through it.
   */
  addHeightfield(heightAt: (x: number, z: number) => number, half = 16, cell = 0.25): void {
    const R = RAPIER!;
    // Built as a mesh of triangles over the grid, facing up (the engine's own height field let
    // detailed shapes fall through it).
    const n = Math.round((half * 2) / cell);
    const vertices = new Float32Array((n + 1) * (n + 1) * 3);
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const x = -half + i * cell;
        const z = -half + j * cell;
        vertices.set([x * M, heightAt(x, z) * M, z * M], (j * (n + 1) + i) * 3);
      }
    }
    const indices = new Uint32Array(n * n * 6);
    let k = 0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a0 = j * (n + 1) + i;
        const a1 = a0 + 1;
        const b0 = a0 + (n + 1);
        const b1 = b0 + 1;
        indices.set([a0, b0, a1, a1, b0, b1], k);
        k += 6;
      }
    }
    const body = this.world.createRigidBody(R.RigidBodyDesc.fixed());
    this.world.createCollider(R.ColliderDesc.trimesh(vertices, indices).setFriction(1.4), body);
  }

  /** A fixed box (cm): a board's top. */
  addBox(centre: [number, number, number], half: [number, number, number]): void {
    const R = RAPIER!;
    const body = this.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(centre[0] * M, centre[1] * M, centre[2] * M));
    this.world.createCollider(R.ColliderDesc.cuboid(half[0] * M, half[1] * M, half[2] * M).setFriction(0.9), body);
  }

  /** Drop one piece (its parts move together): a solid of its convex outline, at its current place. */
  drop(pieces: FormPiece[], options: { lift?: number; straightDown?: boolean; noTurn?: boolean } = {}): void {
    const R = RAPIER!;
    const points = samplePoints(pieces.map((p) => p.geometry), 120);
    // A piece with a broken vertex would crash the engine deep inside its step: refuse it here.
    if (!points.every(Number.isFinite)) throw new Error(`physics: a piece with a non-finite vertex (${pieces.map((p) => p.role).join(', ')})`);
    const centre = new Vector3();
    for (let i = 0; i < points.length; i += 3) centre.x += points[i], centre.y += points[i + 1], centre.z += points[i + 2];
    centre.multiplyScalar(3 / points.length);
    const local = new Float32Array(points.length);
    for (let i = 0; i < points.length; i += 3) local.set([(points[i] - centre.x) * M, (points[i + 1] - centre.y) * M, (points[i + 2] - centre.z) * M], i);
    const desc = R.RigidBodyDesc.dynamic()
      .setTranslation(centre.x * M, (centre.y + (options.lift ?? 0.15)) * M, centre.z * M)
      .setLinearDamping(4)
      .setAngularDamping(2)
      // Never put to sleep early: a heavily damped piece moves so slowly while it tips that the
      // engine took it for at rest and left fried eggs and a steak balanced on their edges.
      .setCanSleep(false)
      .setCcdEnabled(false);
    // Where it goes comes from the reference: strong damping lets gravity settle its height and
    // tilt (it leans, tips onto its side, slips off a peak) while it moves only a little across the
    // plate. Holding it to straight down made pieces balance on an edge, like a fried egg standing up.
    if (options.straightDown) desc.enabledTranslations(false, true, false);
    // A leaf keeps the way it was laid: it falls until it touches, never tumbling onto its edge.
    if (options.noTurn) desc.lockRotations();
    const body = this.world.createRigidBody(desc);
    const shape = R.ColliderDesc.convexHull(local);
    if (!shape) return;
    const collider = this.world.createCollider(shape.setFriction(1.6).setRestitution(0).setDensity(0.001), body);
    this.bodies.push({ body, pieces, centre, collider: collider.handle, baked: false });
  }

  /**
   * A soft piece laid in place by hand (a leaf draped over what is under it): held still as its
   * exact surface, so the next pieces land on it. Leaves are not dropped: a stiff curled leaf
   * tumbled onto its edge and leaned on its neighbours like a card.
   */
  hold(pieces: FormPiece[]): void {
    const fixed = this.world.createRigidBody(RAPIER!.RigidBodyDesc.fixed());
    for (const p of pieces) this.world.createCollider(trimeshOf(p.geometry).setFriction(1.6), fixed);
  }

  /** Let everything fall and come to rest (at most `seconds`). */
  settle(seconds = 4): void {
    drain(this.settleSteps(seconds));
  }

  /** The same, as steps (R10: a cook builds in slices, a pause after every step of the engine). */
  *settleSteps(seconds = 4): Generator<void, void> {
    const steps = Math.round(seconds / this.world.timestep);
    // At rest only when every piece the engine is moving has fallen asleep (a piece pausing at the
    // top of a bounce is slow for a moment, but not at rest).
    let still = 0;
    for (let i = 0; i < steps; i++) {
      this.world.step();
      yield;
      if (i < 120 || i % 10 !== 0) continue;
      const calm = this.bodies.every((b) => {
        if (b.baked) return true;
        const v = b.body.linvel();
        const w = b.body.angvel();
        return Math.hypot(v.x, v.y, v.z) < 0.3 && Math.hypot(w.x, w.y, w.z) < 0.03;
      });
      still = calm ? still + 1 : 0;
      // Still for a quarter of a second: truly at rest, not pausing at the top of a tip.
      if (still >= 3) return;
    }
    // (R8: still falling when the time is up, off a toast's edge or the plate's rim: up to three
    // seconds more to land, before any steadying.)
    for (let i = 0, quiet = 0; i < Math.round(3 / this.world.timestep); i++) {
      this.world.step();
      yield;
      if (i % 10 !== 0) continue;
      const calm = this.bodies.every((b) => {
        if (b.baked) return true;
        const v = b.body.linvel();
        const w = b.body.angvel();
        return Math.hypot(v.x, v.y, v.z) < 0.3 && Math.hypot(w.x, w.y, w.z) < 0.03;
      });
      quiet = calm ? quiet + 1 : 0;
      if (quiet >= 3) return;
    }
    // Still sliding when the time is up (a thin wheel on a slope of sauce, R7): it is steadied as a
    // cook's hand would, heavier damping on what still moves, and given a moment more to come to rest.
    const moving = this.bodies.filter((b) => {
      if (b.baked) return false;
      const v = b.body.linvel();
      return Math.hypot(v.x, v.y, v.z) >= 0.3 || Math.hypot(b.body.angvel().x, b.body.angvel().y, b.body.angvel().z) >= 0.03;
    });
    if (!moving.length) return;
    // (R8: on a crowded plate a piece wedged between others can buzz on: the hold firms up, round
    // by round, until it is still, the way a cook presses a jittery piece down.)
    const atRest = (b: (typeof moving)[number]) => {
      const v = b.body.linvel();
      const w = b.body.angvel();
      return Math.hypot(v.x, v.y, v.z) < 0.3 && Math.hypot(w.x, w.y, w.z) < 0.03;
    };
    for (const [lin, ang] of [[14, 10], [40, 30], [120, 90]]) {
      const left = moving.filter((b) => !atRest(b));
      if (!left.length) break;
      for (const b of left) b.body.setLinearDamping(lin), b.body.setAngularDamping(ang);
      for (let i = 0; i < Math.round(1.5 / this.world.timestep); i++) {
        this.world.step();
        yield;
      }
      yield;
    }
    for (const b of moving) b.body.setLinearDamping(4), b.body.setAngularDamping(2);
  }

  /**
   * Move the pieces dropped since the last call to where their bodies came to rest, then hold them
   * there (like a piece already plated: the next ones lean on it, they do not shove it).
   */
  bakeNew(): void {
    for (const b of this.bodies) {
      if (b.baked) continue;
      this.measure(b);
      const v0 = b.body.linvel();
      if (Math.hypot(v0.x, v0.y, v0.z) > 2) this.restless++;
      if ((globalThis as { DEBUG_REST?: boolean }).DEBUG_REST && Math.hypot(v0.x, v0.y, v0.z) > 2) { const t0 = b.body.translation(); console.log('restless', b.pieces[0]?.role, v0.x.toFixed(1), v0.y.toFixed(1), v0.z.toFixed(1), 'at', (t0.x / M).toFixed(1), (t0.y / M).toFixed(1), (t0.z / M).toFixed(1)); }
      const t = b.body.translation();
      const r = b.body.rotation();
      const m = new Matrix4()
        .makeTranslation(t.x / M, t.y / M, t.z / M)
        .multiply(new Matrix4().makeRotationFromQuaternion(new Quaternion(r.x, r.y, r.z, r.w)))
        .multiply(new Matrix4().makeTranslation(-b.centre.x, -b.centre.y, -b.centre.z));
      for (const p of b.pieces) p.geometry.applyMatrix4(m);
      b.baked = true;
      const up = new Vector3(0, 1, 0).applyQuaternion(new Quaternion(r.x, r.y, r.z, r.w));
      this.tilts.set(b.pieces, (Math.acos(Math.min(1, Math.max(-1, up.y))) * 180) / Math.PI);
      // Held where it came to rest: the moving body is replaced by a fixed solid of the piece's
      // final shape, so the next layer leans on it but never moves it. (Switching the body itself
      // to fixed let the next pieces fall straight through it.)
      this.world.removeRigidBody(b.body);
      const fixed = this.world.createRigidBody(RAPIER!.RigidBodyDesc.fixed());
      // Its exact surface as triangles (a falling piece is caught reliably by triangles; two convex
      // outlines let thin and detailed pieces slip through each other).
      for (const p of b.pieces) this.world.createCollider(heldShape(p.geometry).setFriction(1.6), fixed);
      this.held.set(b.pieces, fixed);
    }
  }

  /** The pieces dropped since the last bake that are still moving (faster than 2 cm/s). */
  unsettled(): FormPiece[][] {
    return this.bodies
      .filter((b) => {
        if (b.baked) return false;
        const v = b.body.linvel();
        return Math.hypot(v.x, v.y, v.z) / M > 2;
      })
      .map((b) => b.pieces);
  }

  /** Take a dropped piece that has not been baked back out of the world (it is laid again). */
  retract(pieces: FormPiece[]): void {
    const i = this.bodies.findIndex((b) => b.pieces === pieces && !b.baked);
    if (i < 0) return;
    this.world.removeRigidBody(this.bodies[i].body);
    this.bodies.splice(i, 1);
  }

  /** How far a settled piece turned from the way it was laid (degrees; 0 when it was never dropped). */
  tiltOf(pieces: FormPiece[]): number {
    return this.tilts.get(pieces) ?? 0;
  }

  /**
   * Lift a settled piece back out (a piece left on its edge or on top of another, about to be laid
   * again): its solid leaves the world and nothing rests on it any more. Its count as restless, if
   * it was, stays.
   */
  remove(pieces: FormPiece[]): void {
    const fixed = this.held.get(pieces);
    if (fixed) this.world.removeRigidBody(fixed);
    this.held.delete(pieces);
    this.tilts.delete(pieces);
  }

  /** The physics QA: pieces held by nothing, the deepest overlap, pieces still moving (measured as each layer settles). */
  check(): PhysicsReport {
    return { floating: this.floating, deepest: this.deepest, restless: this.restless };
  }

  /** Measure one body against everything it touches, before it is held still. */
  private measure(b: (typeof this.bodies)[number]): void {
    let touching = false;
    const mine = this.world.getCollider(b.collider);
    this.world.contactPairsWith(mine, (other) => {
      this.world.contactPair(mine, other, (manifold) => {
        for (let i = 0; i < manifold.numContacts(); i++) {
          const d = manifold.contactDist(i);
          if (d < 0.2) touching = true;
          this.deepest = Math.max(this.deepest, -d / M);
        }
      });
    });
    if (!touching) this.floating++;
    if (!touching && (globalThis as { DEBUG_REST?: boolean }).DEBUG_REST) console.log('floating', b.pieces[0]?.role, b.body.linvel().y.toFixed(2), b.body.translation().y.toFixed(2));
  }

  private floating = 0;
  private deepest = 0;
  private restless = 0;

  free(): void {
    this.world.free();
  }
}
