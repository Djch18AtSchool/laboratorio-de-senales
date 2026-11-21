import { h } from '../dom';
import { applyDetent, fractionFromValue, keyboardValue, valueFromFraction, type ValueRange } from './scale';

export interface FaderOptions {
  readonly range: ValueRange;
  readonly label: string;
  /** Bipolar: el relleno sale del centro (amplitud de −1 a 1). */
  readonly bipolar?: boolean;
  /** Valor al que vuelve con doble clic. */
  readonly resetValue: number;
  readonly bigStep: number;
  readonly ticks: readonly string[];
  readonly format: (v: number) => string;
  readonly onInput: (v: number) => void;
}

export interface Fader {
  readonly el: HTMLElement;
  setValue(v: number): void;
  setLabel(label: string): void;
}

/** Ancho de la zona de retén alrededor del centro, como fracción del rango. */
const DETENT_FRACTION = 0.015;
/** Alto de la tapa del fader en px (igual que --cap en CSS): su centro recorre la pista menos la tapa. */
const CAP_PX = 14;
/** Dos toques dentro de este intervalo cuentan como doble toque (iOS no siempre emite dblclick). */
const DOUBLE_TAP_MS = 300;

/** Fader vertical tipo consola: arrastrar, clic en la pista, teclado y doble clic para reiniciar. */
export const createFader = (opts: FaderOptions): Fader => {
  const { range } = opts;
  const fill = h('div', { class: 'fader-fill' });
  const cap = h('div', { class: 'fader-cap' });
  const track = h('div', { class: 'fader-track' }, fill, cap);
  const scale = h('div', { class: 'fader-scale', 'aria-hidden': 'true' }, ...opts.ticks.map((t) => h('span', {}, t)));
  const el = h(
    'div',
    {
      class: `fader${opts.bipolar ? ' is-bipolar' : ''}`,
      role: 'slider',
      tabindex: 0,
      'aria-orientation': 'vertical',
      'aria-valuemin': range.min,
      'aria-valuemax': range.max,
    },
    scale,
    track,
  );
  // `value` es el valor lógico (se adelanta al emitir, para teclas repetidas antes de redibujar);
  // `shown` es lo que está pintado.
  let value = Number.NaN;
  let shown = Number.NaN;
  const center = (range.min + range.max) / 2;
  const detent = DETENT_FRACTION * (range.max - range.min);

  const fromPointer = (clientY: number): number => {
    const rect = track.getBoundingClientRect();
    const travel = Math.max(1, rect.height - CAP_PX);
    const raw = valueFromFraction(1 - (clientY - rect.top - CAP_PX / 2) / travel, range);
    return opts.bipolar ? applyDetent(raw, center, detent) : raw;
  };
  const emit = (v: number): void => {
    if (v === value) return;
    value = v;
    opts.onInput(v);
  };

  let lastTap = 0;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.focus();
    if (e.pointerType === 'touch') {
      const isDoubleTap = e.timeStamp - lastTap < DOUBLE_TAP_MS;
      lastTap = e.timeStamp;
      if (isDoubleTap) {
        emit(opts.resetValue);
        return;
      }
    }
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
    emit(fromPointer(e.clientY));
  });
  el.addEventListener('pointermove', (e) => {
    if (el.hasPointerCapture(e.pointerId)) emit(fromPointer(e.clientY));
  });
  const release = (): void => el.classList.remove('is-dragging');
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('dblclick', () => emit(opts.resetValue));
  el.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const next = keyboardValue(e.key, value, range, opts.bigStep);
    if (next === null) return;
    e.preventDefault();
    emit(next);
  });

  return {
    el,
    setValue(v: number): void {
      value = v;
      if (v === shown) return;
      shown = v;
      const f = fractionFromValue(v, range);
      const from = opts.bipolar ? Math.min(0.5, f) : 0;
      const to = opts.bipolar ? Math.max(0.5, f) : f;
      el.style.setProperty('--pos', String(f));
      el.style.setProperty('--from', String(from));
      el.style.setProperty('--to', String(to));
      el.setAttribute('aria-valuenow', String(v));
      el.setAttribute('aria-valuetext', opts.format(v));
    },
    setLabel(label: string): void {
      el.setAttribute('aria-label', label);
    },
  };
};
