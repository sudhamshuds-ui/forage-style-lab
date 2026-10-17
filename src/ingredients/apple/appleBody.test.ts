import { describe, expect, it } from 'vitest';
import { DEFAULTS } from '../../params';
import { toAppleShape } from './appleBody';

describe('Faceted switch', () => {
  it('turned off gives the soft, rounded apple whatever the hidden shape values are', () => {
    const soft = toAppleShape({ ...DEFAULTS.shape, faceted: false });
    const softOther = toAppleShape({ ...DEFAULTS.shape, faceted: false, roundness: 10, facets: 95 });
    expect(soft).toEqual(softOther);
  });

  it('turned on uses the facet values, so the planes show', () => {
    const faceted = toAppleShape({ ...DEFAULTS.shape, faceted: true });
    const soft = toAppleShape({ ...DEFAULTS.shape, faceted: false });
    expect(faceted.cutDepth).toBeLessThan(soft.cutDepth);
  });
});
