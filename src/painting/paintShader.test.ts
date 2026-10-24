import { describe, expect, it } from 'vitest';
import { colourGLSL } from '../shading/chunks/colour.glsl';
import { noiseGLSL } from '../shading/chunks/noise.glsl';
import { frameGLSL } from './frame.glsl';
import { paintFragmentShader } from './paintShader';

describe('playful strokes shader', () => {
  // Plain backdrop has no edge direction, so the flow pass stores exactly (0, 0).
  // atan(0, 0) is NaN on some GPUs (Macs), which turned the backdrop black and
  // scattered stray slabs after Randomize. Every angle must go through safeAtan.
  it('never calls atan directly, only the safe version that handles (0, 0)', () => {
    const ownCode = paintFragmentShader
      .replace(colourGLSL, '')
      .replace(noiseGLSL, '')
      .replace(frameGLSL, '')
      .replace(/\/\/.*$/gm, ''); // comments may mention atan
    const rawCalls = ownCode.match(/(?<![A-Za-z_])atan\(/g) ?? [];
    expect(ownCode).toMatch(/float safeAtan\(float y, float x\) \{\s*return abs\(x\) \+ abs\(y\) < 1e-8 \? 0\.0 : atan\(y, x\);/);
    expect(rawCalls).toHaveLength(1); // the one inside safeAtan
  });
});
