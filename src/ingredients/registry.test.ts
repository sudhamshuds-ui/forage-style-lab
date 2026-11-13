import { describe, expect, it } from 'vitest';
import { findPalette } from '../palettes';
import { hexToOklch } from '../utils/colour';
import { FAMILIES } from './families';
import { REGISTRY, ShuffleDeck, findIngredient, parsePart, pickOther, roomOf } from './registry';
import { seededRandom } from './forms/kit/random';

const hueGap = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

describe('ingredient registry', () => {
  it('keeps the build order: apple, lemon, orange, strawberry, broccoli, baguette (the egg was skipped)', () => {
    expect(REGISTRY.map((e) => e.spec.id).slice(0, 6)).toEqual(['apple', 'lemon', 'orange', 'strawberry', 'broccoli', 'baguette']);
    expect(REGISTRY[0].form).toBe('procedural-apple');
  });

  it('has unique ids and every spec field filled in', () => {
    const ids = REGISTRY.map((e) => e.spec.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { spec } of REGISTRY) {
      expect(spec.name.length, spec.id).toBeGreaterThan(0);
      expect(spec.forms.length, spec.id).toBeGreaterThan(0);
      expect(spec.size_cm.every((cm) => cm > 0), spec.id).toBe(true);
      expect(spec.parts.length, spec.id).toBeGreaterThan(0);
      expect(spec.notes.length, spec.id).toBeGreaterThan(0);
      expect(FAMILIES[spec.family], spec.id).toBeDefined();
    }
  });

  it('suggests real rooms at least 70 degrees round the wheel (up to straight opposite)', () => {
    for (const [id, family] of Object.entries(FAMILIES)) {
      const subject = hexToOklch(family.colours.base);
      for (const roomId of family.rooms) {
        const room = findPalette(roomId);
        expect(room, `${id}: ${roomId}`).toBeDefined();
        const gap = hueGap(hexToOklch(room!.colours.wall).h, subject.h);
        expect(gap, `${id} in ${roomId}: ${gap.toFixed(0)} degrees`).toBeGreaterThanOrEqual(70);
      }
    }
  });

  it('Shuffle never shows the same room twice in a row (rooms may repeat from round 2)', () => {
    const deck = new ShuffleDeck(seededRandom(3));
    let now = REGISTRY[0].spec.id;
    for (let i = 0; i < 300; i++) {
      const next = deck.next(now);
      expect(roomOf(next), `${now} then ${next.spec.id}`).not.toBe(roomOf(findIngredient(now)!));
      now = next.spec.id;
    }
  });

  it('Shuffle ingredient always picks a different one', () => {
    const random = seededRandom(1);
    for (let i = 0; i < 200; i++) {
      for (const { spec } of REGISTRY) expect(pickOther(spec.id, random).spec.id).not.toBe(spec.id);
    }
  });

  it('Shuffle shows every ingredient once before any comes back, in a new order each cycle', () => {
    const deck = new ShuffleDeck(seededRandom(7));
    const start = REGISTRY[0].spec.id;
    const n = REGISTRY.length;
    const shown = [start];
    for (let i = 0; i < n * 5 - 1; i++) shown.push(deck.next(shown[shown.length - 1]).spec.id);
    // Each full cycle (the first one counts the ingredient on stage at load) holds every ingredient once.
    const cycles = [shown.slice(0, n), shown.slice(n, 2 * n), shown.slice(2 * n, 3 * n), shown.slice(3 * n, 4 * n)];
    for (const cycle of cycles) expect(new Set(cycle).size, cycle.join(' ')).toBe(n);
    // The order changes from cycle to cycle, and from one page load (another random) to the next.
    expect(cycles[1].join()).not.toBe(cycles[2].join());
    const other = new ShuffleDeck(seededRandom(8));
    const again = [start];
    for (let i = 0; i < n - 1; i++) again.push(other.next(again[again.length - 1]).spec.id);
    expect(again.join()).not.toBe(shown.slice(0, n).join());
  });

  it('reads part names: glow parts and parts in another family', () => {
    expect(parsePart('peel')).toEqual({ role: 'peel', family: undefined });
    expect(parsePart('flesh:glow')).toEqual({ role: 'flesh_glow', family: undefined });
    expect(parsePart('rind@green')).toEqual({ role: 'rind', family: 'green' });
  });
});
