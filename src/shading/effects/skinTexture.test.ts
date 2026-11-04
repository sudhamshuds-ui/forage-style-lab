import { describe, expect, it } from 'vitest';
import { ShaderMaterial, Vector4 } from 'three';
import { REGISTRY } from '../../ingredients/registry';
import { UNITS_PER_CM } from '../../ingredients/scale';
import { SKIN_KINDS, setSkin, skinUniform } from './skinTexture';

describe('skin texture', () => {
  it('turns a skin into the shader value: kind index, cells per scene unit, amount', () => {
    const material = new ShaderMaterial({ uniforms: { uSkin: skinUniform() } });
    setSkin(material, { kind: 'pores', size_mm: 2, amount: 0.8 });
    const v = material.uniforms.uSkin.value as Vector4;
    expect(v.x).toBe(SKIN_KINDS.indexOf('pores'));
    // 2 mm pores: 5 per cm.
    expect(v.y).toBeCloseTo(5 / UNITS_PER_CM, 5);
    expect(v.z).toBe(0.8);
  });

  it('gives every ingredient its own skin, so they never all look the same', () => {
    for (const { spec, skin } of REGISTRY) {
      expect(SKIN_KINDS, spec.id).toContain(skin.kind);
      expect(skin.amount, spec.id).toBeGreaterThanOrEqual(0);
      expect(skin.amount, spec.id).toBeLessThanOrEqual(1);
    }
    const looks = REGISTRY.map(({ skin }) => `${skin.kind}/${skin.size_mm}`);
    expect(new Set(looks).size).toBe(looks.length);
  });
});
