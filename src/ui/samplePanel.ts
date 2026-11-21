import type { AppState } from '../state/state';
import type { Model } from '../state/model';
import { N, SAMPLE_RATE } from '../math/signal';
import { h, paintRange, setText } from './dom';
import { fmt, fmtNearZero } from './format';
import { activeLabels } from './labels';
import { channelColorVar } from './theme';

interface SampleElements {
  readonly range: HTMLInputElement;
  readonly number: HTMLInputElement;
  readonly time: HTMLElement;
  readonly body: HTMLElement;
  readonly sum: HTMLElement;
  readonly wave: HTMLElement;
  readonly check: HTMLElement;
}

/** Diferencia aceptada entre la suma de la tabla y el punto de la onda. */
const MATCH_TOLERANCE = 1e-12;
const MS_PER_S = 1000;

const cell = (text: string, cls = 'n'): HTMLTableCellElement => h('td', { class: cls }, text);

export const createSamplePanel = (el: SampleElements, onSample: (n: number) => void) => {
  el.range.max = String(N - 1);
  el.number.max = String(N - 1);
  el.range.addEventListener('input', () => onSample(Number(el.range.value)));
  el.number.addEventListener('change', () => {
    const v = Math.round(Number(el.number.value));
    onSample(Number.isFinite(v) ? Math.min(N - 1, Math.max(0, v)) : 0);
  });

  return (state: AppState, model: Model): void => {
    const n = state.sample;
    if (document.activeElement !== el.number) el.number.value = String(n);
    el.range.value = String(n);
    paintRange(el.range);
    setText(el.time, `t = n / 48 000 = ${((n / SAMPLE_RATE) * MS_PER_S).toFixed(3)} ms`);

    const labels = activeLabels(state, model);
    const products = labels.map((l, i) => model.coefficients[i] * (model.vectors.get(l.id) as Float64Array)[n]);
    el.body.replaceChildren(
      ...labels.map((l, i) => {
        const s = (model.vectors.get(l.id) as Float64Array)[n];
        return h('tr', { style: `--c:${channelColorVar(l.slot)}` },
          h('td', { class: 'ch' }, h('span', { class: 'dot' }), h('span', { class: 'math' }, l.name)),
          cell(fmt(s)), cell(fmt(model.coefficients[i], 2)), cell(fmt(products[i])));
      }),
    );
    const sum = products.reduce((a, b) => a + b, 0);
    const wave = model.mix[n];
    setText(el.sum, fmtNearZero(sum).text);
    setText(el.wave, fmtNearZero(wave).text);
    const ok = Math.abs(sum - wave) <= MATCH_TOLERANCE;
    el.check.classList.toggle('is-bad', !ok);
    setText(el.check, ok ? '✓ coinciden' : `difieren en ${Math.abs(sum - wave).toExponential(1)}`);
  };
};
