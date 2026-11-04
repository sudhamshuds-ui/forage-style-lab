import { describe, expect, it } from 'vitest';
import { REGISTRY } from '../registry';
import { seedFromId } from './kit/random';
import { TRIANGLE_BUDGET, allFinite, boundsOf, outwardFraction, sizeInCm, triangleCount } from './kit/checks';

/**
 * Every kit-built form in the registry gets the same checks (board 09,
 * "Checks before saving"). A new ingredient is tested as soon as it is added.
 */
const built = REGISTRY.flatMap((entry) =>
  typeof entry.form === 'function' ? [{ spec: entry.spec, build: entry.form }] : [],
);

describe.each(built)('$spec.name (whole)', ({ spec, build }) => {
  const pieces = build({ state: 'whole', seed: seedFromId(spec.id) });

  it('is its real size, within 10% of size_cm', () => {
    const size = sizeInCm(pieces);
    size.forEach((cm, i) => {
      expect(Math.abs(cm - spec.size_cm[i]) / spec.size_cm[i], `axis ${'xyz'[i]}: ${cm.toFixed(2)} cm`).toBeLessThan(0.1);
    });
  });

  it('sits on the table at y = 0, centred on its footprint', () => {
    const box = boundsOf(pieces);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 5);
  });

  it('has finite positions and normals, facing outward', () => {
    expect(allFinite(pieces)).toBe(true);
    for (const piece of pieces) expect(outwardFraction(piece), piece.role).toBeGreaterThan(0.97);
  });

  it(`stays inside the ${spec.archetype} triangle budget`, () => {
    const [min, max] = TRIANGLE_BUDGET[spec.archetype];
    const count = triangleCount(pieces);
    expect(count).toBeGreaterThanOrEqual(min);
    expect(count).toBeLessThanOrEqual(max);
  });

  it('names every piece after a part in the spec', () => {
    const roles = spec.parts.map((part) => part.split('@')[0].replace(':glow', '_glow'));
    for (const piece of pieces) expect(roles).toContain(piece.role);
  });

  it('looks the same on every reload (seeded from the id)', () => {
    const again = build({ state: 'whole', seed: seedFromId(spec.id) });
    const a = pieces[0].geometry.getAttribute('position').array;
    const b = again[0].geometry.getAttribute('position').array;
    expect(Array.from(b)).toEqual(Array.from(a));
  });
});
