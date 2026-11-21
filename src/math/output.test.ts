import { describe, test, expect } from 'vitest';
import { outputGain, MAX_OUTPUT } from './output';
import { channelVector } from './signal';
import { linearCombination, peak, scale } from './linalg';

describe('salida de audio lineal y sin saturación', () => {
  test('g = 0.9/p por el volumen', () => {
    expect(outputGain(4, 1)).toBeCloseTo(0.225, 12);
    expect(outputGain(3, 0.5)).toBeCloseTo(0.15, 12);
    expect(outputGain(0, 1)).toBe(0);
  });

  test('con todas las amplitudes al máximo |g·m[n]| ≤ 0.9', () => {
    const channels = [channelVector(3, 0), channelVector(3, 0), channelVector(3, 0)];
    const m = linearCombination(channels, [1, 1, 1]);
    const g = outputGain(channels.length, 1);
    expect(peak(scale(g, m))).toBeLessThanOrEqual(MAX_OUTPUT + 1e-12);
  });

  test('g no depende de las amplitudes: duplicar las amplitudes duplica la salida', () => {
    const channels = [channelVector(4, 0), channelVector(5, 30)];
    const g = outputGain(channels.length, 1);
    const out1 = scale(g, linearCombination(channels, [0.3, -0.2]));
    const out2 = scale(g, linearCombination(channels, [0.6, -0.4]));
    for (let n = 0; n < out1.length; n++) expect(out2[n]).toBeCloseTo(2 * out1[n], 12);
  });
});
