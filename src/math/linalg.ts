import type { Vector } from './signal';

export type Matrix = number[][];

/** Umbral de dependencia: un pivote es cero si es menor que 10⁻⁹ veces el mayor. */
export const PIVOT_TOLERANCE = 1e-9;

export const dot = (u: Vector, v: Vector): number => {
  let s = 0;
  for (let i = 0; i < u.length; i++) s += u[i] * v[i];
  return s;
};

export const norm = (v: Vector): number => Math.sqrt(dot(v, v));

export const peak = (v: Vector): number => {
  let p = 0;
  for (let i = 0; i < v.length; i++) p = Math.max(p, Math.abs(v[i]));
  return p;
};

export const scale = (a: number, v: Vector): Vector => v.map((x) => a * x);

export const add = (u: Vector, v: Vector): Vector => u.map((x, i) => x + v[i]);

export const subtract = (u: Vector, v: Vector): Vector => u.map((x, i) => x - v[i]);

/** a₁v₁ + a₂v₂ + … + aₚvₚ. Sin vectores devuelve el vector cero de largo `length`. */
export const linearCombination = (vectors: Vector[], coefficients: number[], length = vectors[0]?.length ?? 0): Vector => {
  const out = new Float64Array(length);
  vectors.forEach((v, j) => {
    const a = coefficients[j];
    for (let i = 0; i < length; i++) out[i] += a * v[i];
  });
  return out;
};

/** SᵀS, donde las columnas de S son los vectores dados. */
export const gram = (vectors: Vector[]): Matrix => vectors.map((u) => vectors.map((v) => dot(u, v)));

export interface RankResult {
  rank: number;
  pivots: number[];
  tolerance: number;
}

const maxAbsEntry = (a: Matrix): number => a.reduce((m, row) => row.reduce((r, x) => Math.max(r, Math.abs(x)), m), 0);

/**
 * Rango por eliminación gaussiana con pivoteo parcial. Un pivote se toma como
 * cero si es menor que `relTol` veces la mayor entrada de la matriz.
 */
export const rank = (input: Matrix, relTol = PIVOT_TOLERANCE): RankResult => {
  const a = input.map((row) => [...row]);
  const rows = a.length;
  const cols = rows ? a[0].length : 0;
  const tolerance = relTol * maxAbsEntry(a);
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let best = r;
    for (let i = r + 1; i < rows; i++) if (Math.abs(a[i][c]) > Math.abs(a[best][c])) best = i;
    if (Math.abs(a[best][c]) <= tolerance || tolerance === 0) continue;
    [a[r], a[best]] = [a[best], a[r]];
    pivots.push(a[r][c]);
    for (let i = r + 1; i < rows; i++) {
      const f = a[i][c] / a[r][c];
      for (let j = c; j < cols; j++) a[i][j] -= f * a[r][j];
    }
    r++;
  }
  return { rank: r, pivots, tolerance };
};

/** Resuelve A x = b (A cuadrada e invertible) por eliminación gaussiana con pivoteo parcial. */
export const solve = (input: Matrix, b: number[]): number[] => {
  const n = input.length;
  const a = input.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let best = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(a[i][c]) > Math.abs(a[best][c])) best = i;
    if (a[best][c] === 0) throw new Error('solve: matriz singular');
    [a[c], a[best]] = [a[best], a[c]];
    for (let i = c + 1; i < n; i++) {
      const f = a[i][c] / a[c][c];
      for (let j = c; j <= n; j++) a[i][j] -= f * a[c][j];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = a[i][n];
    for (let j = i + 1; j < n; j++) s -= a[i][j] * x[j];
    x[i] = s / a[i][i];
  }
  return x;
};
