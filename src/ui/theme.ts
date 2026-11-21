import { cssVar } from './dom';

export interface Theme {
  readonly ink: string;
  readonly muted: string;
  readonly grid: string;
  readonly marker: string;
  readonly surface: string;
  readonly screen: string;
  readonly channels: readonly string[];
}

const CHANNEL_COUNT = 6;

/** Colores actuales, leídos de los tokens de CSS (cambian con el modo oscuro). */
export const readTheme = (): Theme => ({
  ink: cssVar('--ink'),
  muted: cssVar('--muted'),
  grid: cssVar('--grid'),
  marker: cssVar('--marker'),
  surface: cssVar('--surface'),
  screen: cssVar('--screen'),
  channels: Array.from({ length: CHANNEL_COUNT }, (_, i) => cssVar(`--ch-${i}`)),
});

export const channelColorVar = (index: number): string => `var(--ch-${index % CHANNEL_COUNT})`;
