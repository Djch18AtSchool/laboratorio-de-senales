/** V = ℝ⁴⁸⁰: un periodo de 10 ms muestreado a 48 000 muestras por segundo. */
export const SAMPLE_RATE = 48_000;
export const N = 480;
export const FUNDAMENTAL_HZ = SAMPLE_RATE / N;

export type Vector = Float64Array;

const DEG_TO_RAD = Math.PI / 180;

export const harmonicFrequency = (k: number): number => k * FUNDAMENTAL_HZ;

const sampled = (f: (n: number) => number): Vector => {
  const v = new Float64Array(N);
  for (let n = 0; n < N; n++) v[n] = f(n);
  return v;
};

/** senₖ[n] = sen(2πkn/480) */
export const sinBasis = (k: number): Vector => sampled((n) => Math.sin((2 * Math.PI * k * n) / N));

/** cosₖ[n] = cos(2πkn/480) */
export const cosBasis = (k: number): Vector => sampled((n) => Math.cos((2 * Math.PI * k * n) / N));

/** Canal de armónico k y fase φ (grados): s[n] = sen(2πkn/480 + φ) */
export const channelVector = (k: number, phaseDeg: number): Vector =>
  sampled((n) => Math.sin((2 * Math.PI * k * n) / N + phaseDeg * DEG_TO_RAD));
