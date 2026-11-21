import { channelVector, N, type Vector } from '../math/signal';
import { linearCombination, norm, peak } from '../math/linalg';
import { analyzeDependence, type DependenceResult } from '../math/dependence';
import { outputGain } from '../math/output';
import type { AppState, Channel } from './state';

/** Todo lo que se dibuja, se muestra y se oye sale de aquí. */
export interface Model {
  readonly vectors: ReadonlyMap<number, Vector>;
  readonly active: readonly Channel[];
  readonly coefficients: readonly number[];
  readonly mix: Vector;
  readonly norm: number;
  readonly peak: number;
  readonly gain: number;
  readonly dependence: DependenceResult;
}

const vectorCache = new Map<string, Vector>();

const cachedChannelVector = (k: number, phase: number): Vector => {
  const key = `${k}:${phase}`;
  const hit = vectorCache.get(key);
  if (hit) return hit;
  const v = channelVector(k, phase);
  vectorCache.set(key, v);
  return v;
};

export const computeModel = (state: AppState): Model => {
  const vectors = new Map(state.channels.map((c) => [c.id, cachedChannelVector(c.harmonic, c.phase)]));
  const active = state.channels.filter((c) => c.active);
  const activeVectors = active.map((c) => vectors.get(c.id) as Vector);
  const coefficients = active.map((c) => c.amplitude);
  const mix = linearCombination(activeVectors, coefficients, N);
  return {
    vectors,
    active,
    coefficients,
    mix,
    norm: norm(mix),
    peak: peak(mix),
    gain: outputGain(active.length, state.volume),
    dependence: analyzeDependence(activeVectors),
  };
};
