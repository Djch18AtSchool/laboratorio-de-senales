import { projectOntoHarmonics, targetWave, TARGETS, type TargetId } from '../math/projection';
import { norm } from '../math/linalg';
import { drawWave } from '../draw/wave';
import { drawBars } from '../draw/bars';
import { h, paintRange, setText, syncInput, trackEditing } from './dom';
import { fmt } from './format';
import type { Theme } from './theme';

export const K_MIN = 1;
export const K_MAX = 40;
const SPECTRUM_LABEL_EVERY = 5;
const SPECTRUM_ALL_LABELS_UP_TO = 12;
const PERCENT = 100;
const WAVE_Y_MAX = 1.5;

interface ApproxElements {
  readonly targets: HTMLElement;
  readonly k: HTMLInputElement;
  readonly kNumber: HTMLInputElement;
  readonly dim: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly spectrum: HTMLCanvasElement;
  readonly stats: HTMLElement;
}

interface ApproxState {
  readonly target: TargetId;
  readonly K: number;
}

const stat = (label: string, value: string, note?: string): HTMLElement =>
  h('div', { class: 'stat' }, h('dt', {}, label), h('dd', {}, value, note ? h('small', {}, note) : null));

const clampK = (k: number): number => Math.min(K_MAX, Math.max(K_MIN, Math.round(k)));

/** Panel de la ampliación: mejor aproximación de una onda en el subespacio de los armónicos 1…K. */
export const createApproxPanel = (el: ApproxElements, requestRender: () => void) => {
  let state: ApproxState = { target: 'cuadrada', K: 5 };
  const set = (patch: Partial<ApproxState>): void => {
    state = { ...state, ...patch };
    requestRender();
  };

  const chips = TARGETS.map((t) => {
    const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false' }, t.label);
    b.addEventListener('click', () => set({ target: t.id }));
    return { t, b };
  });
  el.targets.replaceChildren(...chips.map(({ b }) => b));
  el.k.min = el.kNumber.min = String(K_MIN);
  el.k.max = el.kNumber.max = String(K_MAX);
  trackEditing(el.kNumber);
  el.k.addEventListener('input', () => set({ K: clampK(Number(el.k.value)) }));
  el.kNumber.addEventListener('change', () => {
    const k = Number(el.kNumber.value);
    set(Number.isFinite(k) ? { K: clampK(k) } : {});
  });

  // La proyección solo se recalcula cuando cambian la onda o K, no en cada cuadro del mezclador.
  let cache: { key: string; y: Float64Array; r: ReturnType<typeof projectOntoHarmonics> } | null = null;
  const compute = (): { y: Float64Array; r: ReturnType<typeof projectOntoHarmonics> } => {
    const key = `${state.target}:${state.K}`;
    if (cache?.key !== key) {
      const y = targetWave(state.target);
      cache = { key, y, r: projectOntoHarmonics(y, state.K) };
    }
    return cache;
  };

  return (theme: Theme): void => {
    chips.forEach(({ t, b }) => b.setAttribute('aria-pressed', String(t.id === state.target)));
    syncInput(el.k, String(state.K));
    syncInput(el.kNumber, String(state.K));
    paintRange(el.k);
    setText(el.dim, `dim W = 2K = ${2 * state.K}`);

    const { y, r } = compute();
    const ny = norm(y);
    el.stats.replaceChildren(
      stat('‖y‖', fmt(ny, 3)),
      stat('error ‖y − p‖', fmt(r.error, 3)),
      stat('error relativo', `${fmt((r.error / ny) * PERCENT, 2)}%`),
    );
    drawWave(el.canvas, {
      layers: [
        { values: y, color: theme.muted, width: 1.25, alpha: 0.7 },
        { values: r.projection, color: theme.channels[0], width: 2 },
      ],
      yMax: WAVE_Y_MAX,
      markerColor: theme.marker,
      gridColor: theme.grid,
    });
    const amplitudes = r.sin.map((a, i) => Math.hypot(a, r.cos[i]));
    drawBars(el.spectrum, {
      values: amplitudes,
      color: theme.channels[0],
      gridColor: theme.grid,
      labelColor: theme.muted,
      yMax: Math.max(...amplitudes, 1e-12),
      labelEvery: state.K <= SPECTRUM_ALL_LABELS_UP_TO ? 1 : SPECTRUM_LABEL_EVERY,
    });
  };
};
