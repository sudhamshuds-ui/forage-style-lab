import { BufferAttribute, type BufferGeometry } from 'three';

/**
 * Maps for the skin shader, worked out from a finished body (in centimetres, before it is placed).
 *
 * `bodyMap` gives every point of an upright, round body two things a skin often needs:
 *   uv:     x its height as a share of the body (0 at the foot, 1 at the top), y its angle round
 *           the upright axis (0 to 1), or a value of your own (`flag`),
 *   ownPos: where it sits in the body's own frame (cm), so painted marks stay on the body when it
 *           is turned, tipped or laid in a group (the onion's lesson).
 */
export function bodyMap(geometry: BufferGeometry, flag?: (x: number, y: number, z: number) => number): BufferGeometry {
  const p = geometry.getAttribute('position');
  let low = Infinity;
  let high = -Infinity;
  for (let i = 0; i < p.count; i++) {
    low = Math.min(low, p.getY(i));
    high = Math.max(high, p.getY(i));
  }
  const uv = new Float32Array(p.count * 2);
  const own = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    uv[2 * i] = (y - low) / Math.max(1e-6, high - low);
    uv[2 * i + 1] = flag ? flag(x, y, z) : Math.atan2(z, x) / (2 * Math.PI) + 0.5;
    own.set([x, y, z], 3 * i);
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setAttribute('ownPos', new BufferAttribute(own, 3));
  return geometry;
}

/** Move every point of a geometry (cm): a small sculpting pass after a kit recipe. */
export function sculpt(geometry: BufferGeometry, move: (x: number, y: number, z: number) => [number, number, number]): BufferGeometry {
  const p = geometry.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = move(p.getX(i), p.getY(i), p.getZ(i));
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true;
  return geometry;
}

/** Rest a body on the table: lift it so its lowest point sits at y = 0. Returns how far it moved. */
export function rest(geometry: BufferGeometry): number {
  const p = geometry.getAttribute('position');
  let low = Infinity;
  for (let i = 0; i < p.count; i++) low = Math.min(low, p.getY(i));
  geometry.translate(0, -low, 0);
  return -low;
}
