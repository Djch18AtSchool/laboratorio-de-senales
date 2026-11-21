import { describe, test, expect } from 'vitest';
import { N, SAMPLE_RATE, sinBasis, cosBasis, channelVector, harmonicFrequency } from './signal';
import { dot } from './linalg';

describe('signal', () => {
  test('un vector de V tiene 480 componentes: 10 ms a 48 000 muestras/s', () => {
    expect(N).toBe(480);
    expect(N / SAMPLE_RATE).toBeCloseTo(0.01, 12);
    expect(channelVector(3, 0)).toHaveLength(N);
  });

  test('el armónico k suena a k·100 Hz', () => {
    expect(harmonicFrequency(1)).toBe(100);
    expect(harmonicFrequency(4)).toBe(400);
  });

  test('s = cos φ · senₖ + sen φ · cosₖ (identidad del seno de una suma)', () => {
    const k = 5;
    const phi = 37;
    const rad = (phi * Math.PI) / 180;
    const s = channelVector(k, phi);
    const sk = sinBasis(k);
    const ck = cosBasis(k);
    for (let n = 0; n < N; n++) {
      expect(s[n]).toBeCloseTo(Math.cos(rad) * sk[n] + Math.sin(rad) * ck[n], 12);
    }
  });

  test('senₖ y cosₖ son ortogonales dentro y entre armónicos, con ⟨b,b⟩ = 240', () => {
    for (const j of [1, 3, 7, 20]) {
      for (const k of [1, 3, 7, 20]) {
        expect(dot(sinBasis(j), cosBasis(k))).toBeCloseTo(0, 9);
        if (j !== k) {
          expect(dot(sinBasis(j), sinBasis(k))).toBeCloseTo(0, 9);
          expect(dot(cosBasis(j), cosBasis(k))).toBeCloseTo(0, 9);
        }
      }
      expect(dot(sinBasis(j), sinBasis(j))).toBeCloseTo(240, 9);
      expect(dot(cosBasis(j), cosBasis(j))).toBeCloseTo(240, 9);
    }
  });
});
