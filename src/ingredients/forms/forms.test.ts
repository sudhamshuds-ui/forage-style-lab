import { describe, expect, it } from 'vitest';
import { REGISTRY } from '../registry';
import { seedFromId } from './kit/random';
import { TRIANGLE_BUDGET, allFinite, bodyPieces, boundsOf, outwardFraction, signedVolume, sizeInCm, triangleCount } from './kit/checks';

/**
 * Every kit-built form in the registry gets the same checks (board 09,
 * "Checks before saving"). A new ingredient is tested as soon as it is added.
 */
const built = REGISTRY.flatMap((entry) =>
  typeof entry.form === 'function' ? [{ spec: entry.spec, build: entry.form, budget: entry.budget }] : [],
);

describe.each(built)('$spec.name (whole)', ({ spec, build, budget }) => {
  const pieces = build({ state: 'whole', seed: seedFromId(spec.id) });

  it('is its real size, within 10% of size_cm (the body: a leaf or stem may stick out)', () => {
    const size = sizeInCm(bodyPieces(pieces));
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
    // Closed pieces only: an open sheet (a leaf, painted on both sides) has no inside.
    // Faces wound outward enclose a positive volume (works for bent tubes too), and the
    // normals mostly agree with the faces.
    for (const piece of pieces.filter((p) => !p.doubleSided)) {
      expect(signedVolume(piece), piece.role).toBeGreaterThan(0);
    }
    // "Almost all" normals face away from the centre. A wedge asks a little less: the inside
    // of every cheese hole rightly faces inward, and its long point pulls the centre off
    // (the signed volume above still proves the faces are wound outward).
    expect(outwardFraction(pieces[0]), pieces[0].role).toBeGreaterThan(spec.archetype === 'wedge' ? 0.85 : 0.9);
  });

  it('has no floating pieces: every extra piece touches another one (a leaf can hang from its stem)', () => {
    for (const piece of pieces.slice(1)) {
      const box = boundsOf([piece]).expandByScalar(0.02);
      const touches = pieces.some((other) => other !== piece && boundsOf([other]).intersectsBox(box));
      expect(touches, piece.role).toBe(true);
    }
  });

  it(`stays inside its triangle budget (${budget ? 'its own' : spec.archetype})`, () => {
    const [min, max] = budget ?? TRIANGLE_BUDGET[spec.archetype];
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
