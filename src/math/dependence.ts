import type { Vector } from './signal';
import { gram, linearCombination, norm, rank, solve, subtract, PIVOT_TOLERANCE, type Matrix } from './linalg';

/** sᵢ = c₁·s_b₁ + c₂·s_b₂ + …, con su comprobación ‖sᵢ − (…)‖. Índices dentro de la lista dada. */
export interface DependenceRelation {
  index: number;
  basis: number[];
  coefficients: number[];
  residualNorm: number;
}

export interface DependenceResult {
  rank: number;
  gram: Matrix;
  tolerance: number;
  relations: DependenceRelation[];
}

const subMatrix = (m: Matrix, idx: number[]): Matrix => idx.map((i) => idx.map((j) => m[i][j]));

const isInSpan = (g: Matrix, basis: number[], j: number): boolean => {
  if (basis.length === 0) return false;
  const candidate = [...basis, j];
  return rank(subMatrix(g, candidate)).rank < candidate.length;
};

const relationFor = (vectors: Vector[], g: Matrix, basis: number[], j: number): DependenceRelation => {
  const coefficients = solve(subMatrix(g, basis), basis.map((i) => g[i][j]));
  const approx = linearCombination(basis.map((i) => vectors[i]), coefficients, vectors[j].length);
  return { index: j, basis: [...basis], coefficients, residualNorm: norm(subtract(vectors[j], approx)) };
};

/**
 * Rango de S (columnas = vectores) calculado como el rango de SᵀS. Recorre los
 * vectores en orden: si uno pertenece al subespacio generado por los
 * anteriores independientes, es redundante y se escribe como combinación lineal
 * de ellos.
 */
export const analyzeDependence = (vectors: Vector[]): DependenceResult => {
  const g = gram(vectors);
  const { rank: r, tolerance } = rank(g);
  const { basis, relations } = vectors.reduce<{ basis: number[]; relations: DependenceRelation[] }>(
    (acc, _v, j) =>
      isInSpan(g, acc.basis, j)
        ? { basis: acc.basis, relations: [...acc.relations, relationFor(vectors, g, acc.basis, j)] }
        : { basis: [...acc.basis, j], relations: acc.relations },
    { basis: [], relations: [] },
  );
  if (basis.length !== r) {
    console.warn(`analyzeDependence: rango ${r} y base de ${basis.length} vectores no coinciden`);
  }
  return { rank: r, gram: g, tolerance: tolerance || PIVOT_TOLERANCE, relations };
};
