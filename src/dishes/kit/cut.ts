import { BufferAttribute, BufferGeometry, Plane, ShapeUtils, Vector2, Vector3 } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FormPiece } from '../../ingredients/forms/kit/piece';

/**
 * The knife: cut any closed form with a flat plane and close the cut with a flat face (a "cap").
 *
 * Like a boolean in a 3D app. Everything on the far side of the plane is thrown away, and where
 * the knife went through, a new flat face fills the hole: the flesh of a halved peach, the face
 * of a lime wheel, the pink inside of a sliced steak. The cap is its own piece, so it takes its
 * own colours and skin (flesh, not peel).
 *
 * Every attribute the shape carries (its map for the skin, its own frame) is carried along the
 * cut, so the peel still paints like the whole ingredient. The cap gets a map of its own, from a
 * function the caller gives (a lime wheel's map runs from the middle out to the peel).
 *
 * Several cuts in a row make wedges and slices: each cut also trims the faces earlier cuts made.
 */

/** Values for a cap's other attributes at a point on it (cm): its map, its own frame... */
export type CapAttributes = (point: Vector3) => Record<string, number[]>;

interface Vertex {
  /** One array per attribute, in the shape's attribute order. */
  values: number[][];
  position: Vector3;
}

const KEY = 1e4;
const keyOf = (p: Vector3) => `${Math.round(p.x * KEY)},${Math.round(p.y * KEY)},${Math.round(p.z * KEY)}`;

/** The same point on an edge, worked out the same way from either side (so the edges meet exactly). */
function along(a: Vertex, b: Vertex, da: number, db: number): Vertex {
  const flip = a.position.x > b.position.x || (a.position.x === b.position.x && (a.position.y > b.position.y || (a.position.y === b.position.y && a.position.z > b.position.z)));
  const [p, q, dp, dq] = flip ? [b, a, db, da] : [a, b, da, db];
  const t = dp / (dp - dq);
  const values = p.values.map((value, k) => value.map((v, i) => v + (q.values[k][i] - v) * t));
  return { values, position: new Vector3(values[0][0], values[0][1], values[0][2]) };
}

interface Clipped {
  kept: BufferGeometry | null;
  /** The pieces of the cut line through this shape: pairs of points. */
  segments: [Vector3, Vector3][];
}

/** Keep the part of one shape behind the plane (where the plane's distance is zero or less). */
function clip(source: BufferGeometry, plane: Plane): Clipped {
  const g = source.index ? source.toNonIndexed() : source;
  const names = Object.keys(g.attributes);
  // Position first: the clipping reads it from values[0].
  names.sort((a, b) => (a === 'position' ? -1 : b === 'position' ? 1 : 0));
  const attrs = names.map((name) => g.getAttribute(name) as BufferAttribute);
  const out: number[][] = names.map(() => []);
  const segments: [Vector3, Vector3][] = [];
  const read = (i: number): Vertex => {
    const values = attrs.map((a) => {
      const v: number[] = [];
      for (let c = 0; c < a.itemSize; c++) v.push(a.array[i * a.itemSize + c] as number);
      return v;
    });
    return { values, position: new Vector3(values[0][0], values[0][1], values[0][2]) };
  };
  const emit = (v: Vertex) => v.values.forEach((value, k) => out[k].push(...value));
  const count = g.getAttribute('position').count;
  for (let t = 0; t < count; t += 3) {
    const tri = [read(t), read(t + 1), read(t + 2)];
    const d = tri.map((v) => plane.distanceToPoint(v.position));
    if (d.every((x) => x <= 0)) {
      tri.forEach(emit);
      continue;
    }
    if (d.every((x) => x > 0)) continue;
    // A triangle the knife goes through: keep the polygon behind the plane.
    const polygon: Vertex[] = [];
    const cuts: Vector3[] = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (d[i] <= 0) polygon.push(tri[i]);
      if ((d[i] <= 0) !== (d[j] <= 0)) {
        const v = along(tri[i], tri[j], d[i], d[j]);
        polygon.push(v);
        cuts.push(v.position);
      }
    }
    if (cuts.length === 2 && cuts[0].distanceToSquared(cuts[1]) > 1e-12) segments.push([cuts[0], cuts[1]]);
    for (let i = 1; i + 1 < polygon.length; i++) [polygon[0], polygon[i], polygon[i + 1]].forEach(emit);
  }
  if (out[0].length === 0) return { kept: null, segments };
  const kept = new BufferGeometry();
  names.forEach((name, k) => kept.setAttribute(name, new BufferAttribute(new Float32Array(out[k]), attrs[k].itemSize)));
  // Shared corners joined again, so the shading stays smooth across the old triangles.
  return { kept: mergeVertices(kept, 1e-5), segments };
}

/** Join the pieces of the cut line into closed loops (open ends, from an open shape, are dropped). */
function loops(segments: [Vector3, Vector3][]): Vector3[][] {
  const next = new Map<string, { point: Vector3; links: string[] }>();
  const node = (p: Vector3) => {
    const key = keyOf(p);
    if (!next.has(key)) next.set(key, { point: p, links: [] });
    return key;
  };
  for (const [a, b] of segments) {
    const ka = node(a);
    const kb = node(b);
    if (ka === kb) continue;
    next.get(ka)!.links.push(kb);
    next.get(kb)!.links.push(ka);
  }
  const used = new Set<string>();
  const result: Vector3[][] = [];
  for (const [start] of next) {
    if (used.has(start)) continue;
    const loop: Vector3[] = [];
    let previous = '';
    let current = start;
    let closed = false;
    for (let guard = 0; guard < 100000; guard++) {
      used.add(current);
      const here = next.get(current)!;
      loop.push(here.point);
      const onward = here.links.find((k) => k !== previous && !used.has(k)) ?? here.links.find((k) => k === start && previous !== start && loop.length > 2);
      if (!onward) break;
      if (onward === start) {
        closed = true;
        break;
      }
      previous = current;
      current = onward;
    }
    if (closed && loop.length >= 3) result.push(loop);
  }
  return result;
}

/** The centre of a polygon's area. */
function centroid(poly: Vector2[]): Vector2 {
  let area = 0;
  const c = new Vector2();
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const cross = poly[j].x * poly[i].y - poly[i].x * poly[j].y;
    area += cross;
    c.x += (poly[j].x + poly[i].x) * cross;
    c.y += (poly[j].y + poly[i].y) * cross;
  }
  return Math.abs(area) < 1e-9 ? poly[0].clone() : c.multiplyScalar(1 / (3 * area));
}

/** True when every edge of the polygon can be seen from its centre (the fan from it has no fold). */
function starShaped(poly: Vector2[]): boolean {
  const c = centroid(poly);
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x);
    if (Math.abs(cross) < 1e-10) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

/** A flat face filling the loops, facing along the plane's normal. */
function capFor(found: Vector3[][], plane: Plane, names: { name: string; size: number }[], extra?: CapAttributes): BufferGeometry | null {
  if (found.length === 0) return null;
  const n = plane.normal.clone().normalize();
  const u = new Vector3(1, 0, 0);
  if (Math.abs(n.dot(u)) > 0.9) u.set(0, 1, 0);
  u.sub(n.clone().multiplyScalar(n.dot(u))).normalize();
  const v = new Vector3().crossVectors(n, u);
  const flat = found.map((loop) => loop.map((p) => new Vector2(p.dot(u), p.dot(v))));
  // Which loops are holes in others: a loop inside an odd number of others is a hole.
  const inside = (pt: Vector2, poly: Vector2[]) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      if (poly[i].y > pt.y !== poly[j].y > pt.y && pt.x < ((poly[j].x - poly[i].x) * (pt.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x) c = !c;
    }
    return c;
  };
  const depth = flat.map((loop, i) => flat.filter((other, j) => j !== i && inside(loop[0], other)).length);
  const positions: number[] = [];
  const index: number[] = [];
  flat.forEach((outer, i) => {
    if (depth[i] % 2 === 1) return;
    const holes = flat.filter((hole, j) => depth[j] === depth[i] + 1 && inside(hole[0], outer));
    const holeLoops = found.filter((_, j) => depth[j] === depth[i] + 1 && inside(flat[j][0], outer));
    const base = positions.length / 3;
    // A face with no holes, round its middle (every edge seen from its centre): rings from the
    // middle out, so the face has points inside it too. A skin that paints from the core to the
    // peel (a lime wheel) needs them: with points only round the edge, the middle never got its
    // colour.
    if (holes.length === 0 && starShaped(outer)) {
      const loop = found[i];
      const c2 = centroid(outer);
      const centre = loop.reduce((sum, p) => sum.add(p), new Vector3()).multiplyScalar(1 / loop.length);
      // The centre in 3D: on the plane, at the 2D centroid.
      centre.addScaledVector(u, c2.x - centre.dot(u)).addScaledVector(v, c2.y - centre.dot(v));
      const reach = Math.max(...loop.map((p) => p.distanceTo(centre)));
      const rings = Math.max(2, Math.min(14, Math.ceil(reach / 0.35)));
      positions.push(centre.x, centre.y, centre.z);
      const m = loop.length;
      for (let k = 1; k <= rings; k++) {
        const t = k / rings;
        for (const p of loop) positions.push(centre.x + (p.x - centre.x) * t, centre.y + (p.y - centre.y) * t, centre.z + (p.z - centre.z) * t);
      }
      const at = (k: number, j: number) => base + 1 + (k - 1) * m + (j % m);
      for (let j = 0; j < m; j++) {
        index.push(base, at(1, j), at(1, j + 1));
        for (let k = 1; k < rings; k++) index.push(at(k, j), at(k + 1, j), at(k + 1, j + 1), at(k, j), at(k + 1, j + 1), at(k, j + 1));
      }
      return;
    }
    const all = [found[i], ...holeLoops].flat();
    for (const p of all) positions.push(p.x, p.y, p.z);
    for (const face of ShapeUtils.triangulateShape(outer, holes)) index.push(base + face[0], base + face[1], base + face[2]);
  });
  if (index.length === 0) return null;
  // Facing out of the cut (along the plane's normal).
  const a = new Vector3().fromArray(positions, index[0] * 3);
  const b = new Vector3().fromArray(positions, index[1] * 3);
  const c = new Vector3().fromArray(positions, index[2] * 3);
  if (new Vector3().crossVectors(b.sub(a), c.sub(a)).dot(n) < 0) {
    for (let t = 0; t < index.length; t += 3) [index[t + 1], index[t + 2]] = [index[t + 2], index[t + 1]];
  }
  const cap = new BufferGeometry();
  cap.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  const count = positions.length / 3;
  for (const { name, size } of names) {
    if (name === 'position') continue;
    const data = new Float32Array(count * size);
    for (let i = 0; i < count; i++) {
      const p = new Vector3().fromArray(positions, i * 3);
      const given = extra?.(p)[name];
      const value = name === 'normal' ? [n.x, n.y, n.z] : given ?? (name === 'ownPos' ? [p.x, p.y, p.z] : new Array(size).fill(0));
      data.set(value.slice(0, size), i * size);
    }
    cap.setAttribute(name, new BufferAttribute(data, size));
  }
  cap.setIndex(index);
  return cap;
}

/**
 * Cut a set of pieces (one ingredient: its peel, its stem, the faces of earlier cuts) with a plane,
 * keeping what lies behind it (the plane's normal points out of the cut face). The new face is
 * added as a piece named `capRole`; if a piece by that name already exists, it is added to it.
 */
export function cutPieces(pieces: FormPiece[], plane: Plane, capRole: string, extra?: CapAttributes | 'radial'): FormPiece[] {
  // Every piece carries a map and its own frame, so the faces the knife makes get them too. A cut
  // face with no frame of its own read as a zero point in the shader, and on Mac graphics cards
  // the flesh skin's angle round that point came out "not a number": the face painted black
  // (the user's screenshots, 2026-11-18: steak slices, strawberry slices, grapes, melon cubes).
  for (const piece of pieces) withFrame(piece.geometry);
  const kept: FormPiece[] = [];
  const segments: [Vector3, Vector3][] = [];
  let names: { name: string; size: number }[] = [];
  for (const piece of pieces) {
    const result = clip(piece.geometry, plane);
    segments.push(...result.segments);
    if (result.kept) kept.push({ ...piece, geometry: result.kept });
    if (names.length === 0) {
      names = Object.entries(piece.geometry.attributes).map(([name, a]) => ({ name, size: (a as BufferAttribute).itemSize }));
    }
  }
  const cap = capFor(loops(segments), plane, names, typeof extra === 'function' ? extra : undefined);
  if (cap && extra === 'radial') radialMap(cap);
  if (cap) kept.push({ role: capRole, geometry: cap });
  return kept;
}

/** A plane through a point, its normal pointing out of the face the cut leaves. */
export function knife(point: Vector3, normal: Vector3): Plane {
  return new Plane().setFromNormalAndCoplanarPoint(normal.clone().normalize(), point);
}

/**
 * A face's map from its own middle: uv.x 0 at the centre of the face, 1 at its edge (a steak
 * slice: rare at the heart, browned at the crust). Measured along each spoke from the middle, so
 * an uneven outline still reaches 1 all round its edge.
 */
export function radialMap(cap: BufferGeometry): void {
  const position = cap.getAttribute('position') as BufferAttribute;
  const uv = cap.getAttribute('uv') as BufferAttribute | undefined;
  if (!uv) return;
  const centre = new Vector3();
  for (let i = 0; i < position.count; i++) centre.add(new Vector3().fromBufferAttribute(position, i));
  centre.multiplyScalar(1 / position.count);
  // The edge's distance in each direction round the middle (in 64 sectors).
  const sectors = 64;
  const reach = new Array(sectors).fill(0);
  const p = new Vector3();
  const index = cap.getIndex();
  const normal = new Vector3();
  if (index && index.count >= 3) {
    const a = new Vector3().fromBufferAttribute(position, index.getX(0));
    const b = new Vector3().fromBufferAttribute(position, index.getX(1));
    const c = new Vector3().fromBufferAttribute(position, index.getX(2));
    normal.crossVectors(b.sub(a), c.sub(a)).normalize();
  }
  const u = new Vector3(1, 0, 0);
  if (Math.abs(normal.dot(u)) > 0.9) u.set(0, 1, 0);
  u.sub(normal.clone().multiplyScalar(normal.dot(u))).normalize();
  const v = new Vector3().crossVectors(normal, u);
  const sector = (q: Vector3) => {
    const d = q.clone().sub(centre);
    return Math.floor(((Math.atan2(d.dot(v), d.dot(u)) + Math.PI) / (2 * Math.PI)) * sectors) % sectors;
  };
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    const k = sector(p);
    reach[k] = Math.max(reach[k], p.distanceTo(centre));
  }
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    const k = sector(p);
    const edge = Math.max(1e-3, Math.max(reach[k], reach[(k + 1) % sectors] * 0.98, reach[(k + sectors - 1) % sectors] * 0.98));
    uv.setX(i, Math.min(1, p.distanceTo(centre) / edge));
  }
  uv.needsUpdate = true;
}

/** Give a shape the attributes skins read, if it has none: its own frame (where it is now) and a blank map. */
export function withFrame(geometry: BufferGeometry, map = true): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute;
  if (!geometry.getAttribute('ownPos')) geometry.setAttribute('ownPos', new BufferAttribute(Float32Array.from(position.array as ArrayLike<number>), 3));
  if (map && !geometry.getAttribute('uv')) geometry.setAttribute('uv', new BufferAttribute(new Float32Array(position.count * 2), 2));
  return geometry;
}
