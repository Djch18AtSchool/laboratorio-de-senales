import { cosBasis, N, sinBasis, type Vector } from './signal';
import { dot, linearCombination, norm, subtract } from './linalg';

export type TargetId = 'cuadrada' | 'sierra' | 'triangular';

export const TARGETS: readonly { id: TargetId; label: string }[] = [
  { id: 'cuadrada', label: 'Cuadrada' },
  { id: 'sierra', label: 'Diente de sierra' },
  { id: 'triangular', label: 'Triangular' },
];

const HALF = N / 2;

const RAW: Record<TargetId, (n: number) => number> = {
  cuadrada: (n) => (n === 0 || n === HALF ? 0 : n < HALF ? 1 : -1),
  sierra: (n) => (n === 0 ? 0 : (n - HALF) / HALF),
  triangular: (n) => (n < N / 4 ? n / (N / 4) : n < (3 * N) / 4 ? 2 - n / (N / 4) : n / (N / 4) - 4),
};

/** Onda objetivo y ∈ V con media cero, para que el vector constante no haga falta en la base. */
export const targetWave = (id: TargetId): Vector => {
  const raw = Float64Array.from({ length: N }, (_, n) => RAW[id](n));
  const mean = raw.reduce((a, b) => a + b, 0) / N;
  return raw.map((x) => x - mean);
};

export interface Projection {
  readonly sin: number[];
  readonly cos: number[];
  readonly projection: Vector;
  readonly error: number;
}

/**
 * Proyección ortogonal de y sobre W = span{sen₁, cos₁, …, senₖ, cosₖ}. Como la
 * base es ortogonal, cada coeficiente es ⟨y, b⟩/⟨b, b⟩.
 */
export const projectOntoHarmonics = (y: Vector, K: number): Projection => {
  const ks = Array.from({ length: K }, (_, i) => i + 1);
  const sins = ks.map(sinBasis);
  const coss = ks.map(cosBasis);
  const coef = (b: Vector): number => dot(y, b) / dot(b, b);
  const sin = sins.map(coef);
  const cos = coss.map(coef);
  const projection = linearCombination([...sins, ...coss], [...sin, ...cos], N);
  return { sin, cos, projection, error: norm(subtract(y, projection)) };
};
