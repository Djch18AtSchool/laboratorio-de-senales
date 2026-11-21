/** Pico máximo de lo que suena: |g·m[n]| ≤ 0.9 siempre. */
export const MAX_OUTPUT = 0.9;

/**
 * g = 0.9 / p · volumen. No depende de las amplitudes, así que la salida
 * g·m sigue siendo lineal en los coeficientes.
 */
export const outputGain = (activeChannels: number, volume: number): number =>
  activeChannels > 0 ? (MAX_OUTPUT / activeChannels) * volume : 0;
