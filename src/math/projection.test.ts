import { describe, test, expect } from 'vitest';
import { targetWave, projectOntoHarmonics, TARGETS } from './projection';
import { cosBasis, sinBasis, N } from './signal';
import { dot, subtract } from './linalg';

describe('ondas objetivo', () => {
  test.each(TARGETS.map((t) => t.id))('%s tiene media cero y 480 componentes', (id) => {
    const y = targetWave(id);
    expect(y).toHaveLength(N);
    expect(y.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 9);
  });
});

describe('mejor aproximación en W = span{sen₁, cos₁, …, senₖ, cosₖ}', () => {
  test('cada coeficiente es ⟨y, b⟩/⟨b, b⟩', () => {
    const y = targetWave('cuadrada');
    const r = projectOntoHarmonics(y, 3);
    expect(r.sin[0]).toBeCloseTo(dot(y, sinBasis(1)) / dot(sinBasis(1), sinBasis(1)), 12);
    expect(r.cos[2]).toBeCloseTo(dot(y, cosBasis(3)) / dot(cosBasis(3), cosBasis(3)), 12);
  });

  test('el error y − p es ortogonal a cada vector de la base', () => {
    const y = targetWave('sierra');
    const r = projectOntoHarmonics(y, 5);
    const e = subtract(y, r.projection);
    for (let k = 1; k <= 5; k++) {
      expect(dot(e, sinBasis(k))).toBeCloseTo(0, 9);
      expect(dot(e, cosBasis(k))).toBeCloseTo(0, 9);
    }
  });

  test('el error ‖y − p‖ no crece cuando K aumenta', () => {
    for (const { id } of TARGETS) {
      const y = targetWave(id);
      let prev = Infinity;
      for (let k = 1; k <= 40; k++) {
        const err = projectOntoHarmonics(y, k).error;
        expect(err).toBeLessThanOrEqual(prev + 1e-9);
        prev = err;
      }
    }
  });

  test('una onda que ya está en W se reproduce exactamente', () => {
    const y = sinBasis(2).map((x, n) => 0.5 * x - 0.25 * cosBasis(4)[n]);
    expect(projectOntoHarmonics(y, 4).error).toBeLessThan(1e-12);
  });
});
