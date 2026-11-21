import { describe, test, expect } from 'vitest';
import { initialState, reduce, EXAMPLES, MAX_CHANNELS } from './state';
import { computeModel } from './model';

describe('estado del mezclador', () => {
  test('actualizar un canal devuelve un estado nuevo y no toca el anterior', () => {
    const s0 = initialState();
    const s1 = reduce(s0, { type: 'updateChannel', id: 1, patch: { amplitude: 2 } });
    expect(s1).not.toBe(s0);
    expect(s0.channels[0].amplitude).toBe(0.8);
    expect(s1.channels[0].amplitude).toBe(1);
  });

  test('la fase se normaliza a 0…359 y el armónico a 1…20', () => {
    const s = reduce(initialState(), { type: 'updateChannel', id: 1, patch: { phase: 370, harmonic: 99 } });
    expect(s.channels[0].phase).toBe(10);
    expect(s.channels[0].harmonic).toBe(20);
  });

  test('la amplitud se guarda con 2 decimales, como se muestra', () => {
    const s = reduce(initialState(), { type: 'updateChannel', id: 1, patch: { amplitude: 0.333 } });
    expect(s.channels[0].amplitude).toBe(0.33);
  });

  test('la muestra se limita a 0…479', () => {
    expect(reduce(initialState(), { type: 'setSample', sample: 999 }).sample).toBe(479);
  });

  test('ignora valores no numéricos', () => {
    const s0 = initialState();
    expect(reduce(s0, { type: 'updateChannel', id: 1, patch: { phase: Number.NaN } })).toBe(s0);
  });

  test('entre uno y seis canales', () => {
    let s = initialState();
    for (let i = 0; i < 10; i++) s = reduce(s, { type: 'addChannel' });
    expect(s.channels).toHaveLength(MAX_CHANNELS);
    for (const c of [...s.channels]) s = reduce(s, { type: 'removeChannel', id: c.id });
    expect(s.channels).toHaveLength(1);
  });
});

describe('cada ejemplo da el resultado que anuncia', () => {
  const load = (id: (typeof EXAMPLES)[number]['id']) => computeModel(reduce(initialState(), { type: 'loadExample', id }));

  test('cancelación: silencio, ‖m‖ = 0, rango 1', () => {
    const m = load('cancelacion');
    expect(m.norm).toBe(0);
    expect(m.dependence.rank).toBe(1);
  });

  test('fase opuesta: ‖m‖ ≈ 0 dentro del redondeo, rango 1', () => {
    const m = load('faseOpuesta');
    expect(m.norm).toBeLessThan(1e-12);
    expect(m.dependence.rank).toBe(1);
    expect(m.dependence.relations[0].coefficients[0]).toBeCloseTo(-1, 9);
  });

  test('misma nota, otra fase: rango 2 y s₃ = 0.5·s₁ + 0.866·s₂', () => {
    const m = load('mismaNota');
    expect(m.dependence.rank).toBe(2);
    expect(m.dependence.relations[0].coefficients[0]).toBeCloseTo(0.5, 9);
    expect(m.dependence.relations[0].coefficients[1]).toBeCloseTo(0.866, 3);
  });

  test('tres armónicos: rango 3', () => {
    expect(load('tresArmonicos').dependence.rank).toBe(3);
  });

  test('canales inactivos no entran en la mezcla ni en p', () => {
    const s = reduce(initialState(), { type: 'updateChannel', id: 3, patch: { active: false } });
    const m = computeModel(s);
    expect(m.active).toHaveLength(2);
    expect(m.gain).toBeCloseTo((0.9 / 2) * s.volume, 12);
  });
});
