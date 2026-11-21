import type { AppState } from '../state/state';
import type { Model } from '../state/model';
import { MAX_OUTPUT } from '../math/output';
import { scale } from '../math/linalg';
import { N } from '../math/signal';
import { drawWave, sampleFromPointer, type WaveLayer } from '../draw/wave';
import { h, setText } from './dom';
import { fmt, fmtNearZero, joinEs } from './format';
import { activeLabels } from './labels';
import { channelColorVar, type Theme } from './theme';

interface MixElements {
  readonly formula: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly vector: HTMLElement;
  readonly stats: HTMLElement;
  readonly zero: HTMLElement;
  readonly span: HTMLElement;
}

const stat = (label: string, value: string, note?: string | null): HTMLElement =>
  h('div', { class: 'stat' }, h('dt', {}, label), h('dd', {}, value, note ? h('small', {}, note) : null));

const termList = (names: string[], symbol: (i: number) => string): string =>
  names.length === 0 ? '0' : names.map((n, i) => `${symbol(i)}${n}`).join(' + ');

export const createMixPanel = (el: MixElements, onSample: (n: number) => void) => {
  el.canvas.addEventListener('pointerdown', (e) => {
    el.canvas.setPointerCapture(e.pointerId);
    onSample(sampleFromPointer(el.canvas, e.clientX, N));
  });
  el.canvas.addEventListener('pointermove', (e) => {
    if (el.canvas.hasPointerCapture(e.pointerId)) onSample(sampleFromPointer(el.canvas, e.clientX, N));
  });

  return (state: AppState, model: Model, theme: Theme): void => {
    const labels = activeLabels(state, model);
    const names = labels.map((l) => l.name);
    setText(el.formula, `m = ${termList(names, (i) => `a${names[i].slice(1)}`)}`);

    const coeffs = labels.map((l, i) =>
      h('span', { class: 'coef', style: `--c:${channelColorVar(l.slot)}` }, fmt(model.coefficients[i], 2)));
    const sep = (): Text => document.createTextNode(', ');
    el.vector.replaceChildren(
      h('span', { class: 'math' }, 'a'), ' = (',
      ...coeffs.flatMap((c, i) => (i === 0 ? [c] : [sep(), c])),
      ')',
    );

    const p = labels.length;
    const n = fmtNearZero(model.norm);
    const isSilent = n.text === '0';
    el.zero.hidden = !isSilent;
    el.stats.replaceChildren(
      stat('‖m‖', n.text, n.detail),
      stat('pico máx |m[n]|', fmtNearZero(model.peak).text),
      stat('p canales', String(p)),
      stat('g = 0.9/p · vol.', fmt(model.gain, 3)),
      stat('salida máx |g·m|', fmtNearZero(model.gain * model.peak).text, `≤ ${MAX_OUTPUT}`),
    );
    setText(el.span, p === 0
      ? 'No hay canales activos: la mezcla es el vector cero.'
      : `m pertenece al subespacio generado por ${joinEs(names)}.`);

    const contributions: WaveLayer[] = labels.map((l, i) => ({
      values: scale(model.coefficients[i], model.vectors.get(l.id) as Float64Array),
      color: theme.channels[l.slot % theme.channels.length],
      width: 1,
      alpha: 0.4,
    }));
    drawWave(el.canvas, {
      layers: [...contributions, { values: model.mix, color: theme.ink, width: 2.25 }],
      yMax: Math.max(1, p),
      marker: state.sample,
      markerColor: theme.marker,
      gridColor: theme.grid,
      labelColor: theme.muted,
      showScale: true,
    });
  };
};
