import { describe, test, expect } from 'vitest';
import { analyzeDependence } from './dependence';
import { channelVector } from './signal';

const vectors = (specs: Array<[number, number]>) => specs.map(([k, phi]) => channelVector(k, phi));

describe('dependencia lineal de canales', () => {
  test('hecho 1: mismo armónico con fases que difieren en 0° es dependiente', () => {
    const r = analyzeDependence(vectors([[3, 40], [3, 40]]));
    expect(r.rank).toBe(1);
    expect(r.relations).toHaveLength(1);
    expect(r.relations[0].index).toBe(1);
    expect(r.relations[0].coefficients[0]).toBeCloseTo(1, 9);
  });

  test('hecho 1: mismo armónico con fases que difieren en 180° es dependiente', () => {
    const r = analyzeDependence(vectors([[4, 10], [4, 190]]));
    expect(r.rank).toBe(1);
    expect(r.relations[0].coefficients[0]).toBeCloseTo(-1, 9);
  });

  test('hecho 1: mismo armónico con fases 0° y 1° es independiente', () => {
    const r = analyzeDependence(vectors([[3, 0], [3, 1]]));
    expect(r.rank).toBe(2);
    expect(r.relations).toHaveLength(0);
  });

  test('hecho 1: cualquier otra diferencia de fase da independencia', () => {
    for (const d of [1, 45, 90, 179, 181, 359]) {
      expect(analyzeDependence(vectors([[6, 0], [6, d]])).rank).toBe(2);
    }
  });

  test('hecho 2: tres canales del mismo armónico siempre son dependientes', () => {
    const r = analyzeDependence(vectors([[3, 0], [3, 90], [3, 60]]));
    expect(r.rank).toBe(2);
    expect(r.relations).toHaveLength(1);
    const rel = r.relations[0];
    expect(rel.index).toBe(2);
    expect(rel.basis).toEqual([0, 1]);
    expect(rel.coefficients[0]).toBeCloseTo(0.5, 9);
    expect(rel.coefficients[1]).toBeCloseTo(Math.sqrt(3) / 2, 9);
    expect(rel.residualNorm).toBeLessThan(1e-9);
  });

  test('hecho 3: armónicos distintos son independientes', () => {
    const r = analyzeDependence(vectors([[4, 0], [5, 0], [6, 0]]));
    expect(r.rank).toBe(3);
    expect(r.relations).toHaveLength(0);
  });

  test('hecho 3: seis canales de armónicos distintos y fases cualesquiera tienen rango 6', () => {
    const r = analyzeDependence(vectors([[3, 10], [4, 200], [7, 33], [11, 90], [17, 300], [20, 1]]));
    expect(r.rank).toBe(6);
  });

  test('hecho 4: el rango de S se obtiene de SᵀS, a lo sumo 6×6', () => {
    const r = analyzeDependence(vectors([[3, 0], [3, 90], [3, 60], [5, 0], [5, 180], [8, 12]]));
    expect(r.gram).toHaveLength(6);
    expect(r.rank).toBe(4);
    expect(r.relations.map((x) => x.index)).toEqual([2, 4]);
    for (const rel of r.relations) expect(rel.residualNorm).toBeLessThan(1e-9);
  });

  test('sin canales activos el rango es 0', () => {
    const r = analyzeDependence([]);
    expect(r.rank).toBe(0);
    expect(r.relations).toEqual([]);
  });
});
