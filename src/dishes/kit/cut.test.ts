import { describe, expect, it } from 'vitest';
import { SphereGeometry, Vector3 } from 'three';
import { cutPieces, knife } from './cut';

describe('the knife', () => {
  it('cuts a ball in half and closes the cut with a flat face', () => {
    const ball = new SphereGeometry(2, 32, 16);
    const pieces = cutPieces([{ role: 'peel', geometry: ball }], knife(new Vector3(0, 0.3, 0), new Vector3(0, 1, 0)), 'flesh');
    expect(pieces.map((p) => p.role)).toEqual(['peel', 'flesh']);
    const cap = pieces[1].geometry;
    cap.computeBoundingBox();
    expect(cap.boundingBox!.max.y).toBeCloseTo(0.3, 3);
    expect(cap.boundingBox!.max.x).toBeGreaterThan(1.9);
  });

  it('makes a slice with two cuts, a face on each side', () => {
    const ball = new SphereGeometry(2, 32, 16);
    let pieces = cutPieces([{ role: 'peel', geometry: ball }], knife(new Vector3(0, 0.3, 0), new Vector3(0, 1, 0)), 'flesh');
    pieces = cutPieces(pieces, knife(new Vector3(0, -0.3, 0), new Vector3(0, -1, 0)), 'flesh');
    const faces = pieces.filter((p) => p.role === 'flesh');
    expect(faces.length).toBe(2);
  });
});
