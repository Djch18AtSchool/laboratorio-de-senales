import { describe, test, expect } from 'vitest';
import { dot, norm, scale, add, linearCombination, gram, rank, peak } from './linalg';

describe('operaciones de V', () => {
  test('suma y producto por escalar componente a componente', () => {
    const u = Float64Array.from([1, 2, 3]);
    const v = Float64Array.from([4, -1, 0]);
    expect(Array.from(add(u, v))).toEqual([5, 1, 3]);
    expect(Array.from(scale(-2, u))).toEqual([-2, -4, -6]);
    expect(Array.from(u)).toEqual([1, 2, 3]);
  });

  test('combinación lineal, norma, pico y producto interno', () => {
    const u = Float64Array.from([1, 0]);
    const v = Float64Array.from([0, 1]);
    const m = linearCombination([u, v], [3, -4]);
    expect(Array.from(m)).toEqual([3, -4]);
    expect(norm(m)).toBe(5);
    expect(peak(m)).toBe(4);
    expect(dot(u, v)).toBe(0);
  });

  test('combinación lineal sin vectores es el vector cero del largo pedido', () => {
    expect(Array.from(linearCombination([], [], 3))).toEqual([0, 0, 0]);
  });

  test('gram calcula SᵀS', () => {
    const g = gram([Float64Array.from([1, 2]), Float64Array.from([3, 4])]);
    expect(g).toEqual([
      [5, 11],
      [11, 25],
    ]);
  });
});

describe('rango con eliminación gaussiana con pivoteo', () => {
  test('matriz identidad tiene rango completo', () => {
    expect(rank([[1, 0], [0, 1]]).rank).toBe(2);
  });

  test('filas proporcionales dan rango 1', () => {
    expect(rank([[1, 2], [2, 4]]).rank).toBe(1);
  });

  test('matriz vacía o nula tiene rango 0', () => {
    expect(rank([]).rank).toBe(0);
    expect(rank([[0, 0], [0, 0]]).rank).toBe(0);
  });

  test('necesita pivoteo cuando el primer pivote es cero', () => {
    expect(rank([[0, 1], [1, 0]]).rank).toBe(2);
  });

  test('no modifica la matriz de entrada', () => {
    const a = [[2, 1], [4, 2]];
    rank(a);
    expect(a).toEqual([[2, 1], [4, 2]]);
  });
});
