import type { AppState } from '../state/state';
import type { Model } from '../state/model';
import { scale } from '../math/linalg';
import { N, SAMPLE_RATE } from '../math/signal';
import { drawWave, sampleFromPointer, type WaveLayer } from '../draw/wave';
import { h, setText } from './dom';
import { fmt, fmtNearZero } from './format';
import { activeLabels } from './labels';
import { channelColorVar, type Theme } from './theme';

export interface ScopeElements {
  readonly canvas: HTMLCanvasElement;
  readonly formula: HTMLElement;
  readonly stats: HTMLElement;
  readonly vector: HTMLElement;
  readonly cursor: HTMLElement;
  readonly zero: HTMLElement;
  readonly span: HTMLElement;
}

/** 10 divisiones de 1 ms: el periodo completo de 10 ms. */
const DIVISIONS = 10;
const MS_PER_S = 1000;
const CURSOR_EDGE_PX = 8;
/** Espacio reservado arriba y abajo para las lecturas superpuestas. */
const PAD_TOP_PX = 78;
const PAD_BOTTOM_PX = 62;
const NARROW_PX = 560;
const PAD_NARROW_PX = 64;

const readout = (label: string, value: string, title?: string): HTMLElement =>
  h('div', { class: 'readout', title }, h('span', { class: 'readout-label' }, label), h('span', { class: 'readout-value' }, value));

/** Osciloscopio de la mezcla m = Σ aᵢsᵢ con sus lecturas. Tocar o arrastrar elige la muestra n. */
export const createScope = (el: ScopeElements, onSample: (n: number) => void) => {
  const pick = (e: PointerEvent): void => onSample(sampleFromPointer(el.canvas, e.clientX, N));
  el.canvas.addEventListener('pointerdown', (e) => {
    el.canvas.setPointerCapture(e.pointerId);
    pick(e);
  });
  el.canvas.addEventListener('pointermove', (e) => {
    if (el.canvas.hasPointerCapture(e.pointerId)) pick(e);
  });

  return (state: AppState, model: Model, theme: Theme): void => {
    const labels = activeLabels(state, model);
    const names = labels.map((l) => l.name);
    setText(el.formula, names.length ? `m = ${names.map((n) => `a${n.slice(1)}${n}`).join(' + ')}` : 'm = 0');
    setText(el.span, names.length ? `m ∈ span{${names.join(', ')}}` : 'sin canales activos');

    const norm = fmtNearZero(model.norm);
    el.stats.replaceChildren(
      readout('‖m‖', norm.text, norm.detail ?? undefined),
      readout('pico', fmtNearZero(model.peak).text, 'máx |m[n]|'),
      readout('p', String(labels.length), 'canales activos'),
    );
    el.zero.hidden = norm.text !== '0';

    const coeffs = labels.map((l, i) => h('span', { class: 'coef', style: `--c:${channelColorVar(l.slot)}` }, fmt(model.coefficients[i], 2)));
    el.vector.replaceChildren(
      h('i', { class: 'math' }, 'a'), ' = (',
      ...coeffs.flatMap((c, i) => (i === 0 ? [c] : [', ', c])),
      ')',
    );

    const n = state.sample;
    const x = (n / (N - 1)) * el.canvas.clientWidth;
    const half = el.cursor.offsetWidth / 2;
    const left = Math.min(Math.max(x, half + CURSOR_EDGE_PX), el.canvas.clientWidth - half - CURSOR_EDGE_PX);
    el.cursor.style.left = `${left}px`;
    setText(el.cursor, `n ${n} · ${((n / SAMPLE_RATE) * MS_PER_S).toFixed(2)} ms · m[n] ${fmtNearZero(model.mix[n]).text}`);

    const contributions: WaveLayer[] = labels.map((l, i) => ({
      values: scale(model.coefficients[i], model.vectors.get(l.id) as Float64Array),
      color: theme.channels[l.slot % theme.channels.length],
      width: 1.25,
      alpha: 0.55,
    }));
    drawWave(el.canvas, {
      layers: [...contributions, { values: model.mix, color: theme.ink, width: 2.5, glow: true }],
      yMax: Math.max(1, labels.length),
      marker: n,
      markerColor: theme.marker,
      gridColor: theme.grid,
      labelColor: theme.muted,
      divisions: DIVISIONS,
      showScale: true,
      timeUnit: 'ms',
      dotRing: theme.screen,
      padTop: el.canvas.clientWidth < NARROW_PX ? PAD_NARROW_PX : PAD_TOP_PX,
      padBottom: el.canvas.clientWidth < NARROW_PX ? PAD_NARROW_PX : PAD_BOTTOM_PX,
    });
  };
};
