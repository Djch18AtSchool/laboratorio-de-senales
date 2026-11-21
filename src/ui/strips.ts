import { HARMONIC_MAX, HARMONIC_MIN, MAX_CHANNELS, PHASE_MAX, type Action, type AppState, type Channel } from '../state/state';
import type { Model } from '../state/model';
import { harmonicFrequency, N, type Vector } from '../math/signal';
import { scale } from '../math/linalg';
import { drawWave, sampleFromPointer } from '../draw/wave';
import { h, icon, setText, syncInput, trackEditing } from './dom';
import { channelName, fmt, fmtHz } from './format';
import { channelColorVar, type Theme } from './theme';
import { createFader, type Fader } from './controls/fader';
import { createPhaseKnob, type Knob } from './controls/knob';

type Dispatch = (action: Action) => void;

const AMPLITUDE_RANGE = { min: -1, max: 1, step: 0.01 } as const;
const AMPLITUDE_BIG_STEP = 0.1;

interface Strip {
  readonly id: number;
  readonly root: HTMLElement;
  readonly name: HTMLElement;
  readonly freq: HTMLElement;
  readonly led: HTMLElement;
  readonly power: HTMLButtonElement;
  readonly powerText: HTMLElement;
  readonly remove: HTMLButtonElement;
  readonly harmonic: HTMLInputElement;
  readonly dec: HTMLButtonElement;
  readonly inc: HTMLButtonElement;
  readonly knob: Knob;
  readonly phaseNum: HTMLInputElement;
  readonly fader: Fader;
  readonly ampNum: HTMLInputElement;
  readonly ampLabel: HTMLElement;
  readonly canvas: HTMLCanvasElement;
}

const numberInput = (attrs: Record<string, string | number>): HTMLInputElement => {
  const el = h('input', { type: 'number', class: 'lcd', ...attrs });
  trackEditing(el);
  return el;
};

const onCommit = (el: HTMLInputElement, fn: (value: number) => void): void =>
  el.addEventListener('change', () => fn(Number(el.value)));

const bindSamplePointer = (canvas: HTMLCanvasElement, dispatch: Dispatch): void => {
  const set = (e: PointerEvent): void => dispatch({ type: 'setSample', sample: sampleFromPointer(canvas, e.clientX, N) });
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    set(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (canvas.hasPointerCapture(e.pointerId)) set(e);
  });
};

const createStrip = (channel: Channel, dispatch: Dispatch): Strip => {
  const id = channel.id;
  const update = (patch: Partial<Channel>): void => dispatch({ type: 'updateChannel', id, patch });

  const name = h('span', { class: 'strip-name math' });
  const powerText = h('span', {}, 'ON');
  const power = h('button', { type: 'button', class: 'power', 'aria-pressed': 'true', title: 'Incluir en la mezcla' },
    h('span', { class: 'power-led' }), powerText);
  const remove = h('button', { type: 'button', class: 'icon-btn', title: 'Quitar canal' }, icon('close'));
  const freq = h('span', { class: 'strip-freq' });
  const canvas = h('canvas', { class: 'strip-wave', 'aria-hidden': 'true' });

  const dec = h('button', { type: 'button', class: 'step', 'aria-label': 'Bajar armónico' }, icon('minus'));
  const inc = h('button', { type: 'button', class: 'step', 'aria-label': 'Subir armónico' }, icon('plus'));
  const harmonic = numberInput({ min: HARMONIC_MIN, max: HARMONIC_MAX, step: 1, inputmode: 'numeric', 'aria-label': 'Armónico k' });

  const knob = createPhaseKnob((v) => update({ phase: v }));
  const phaseNum = numberInput({ min: 0, max: PHASE_MAX, step: 1, inputmode: 'numeric', 'aria-label': 'Fase en grados' });

  const fader = createFader({
    range: AMPLITUDE_RANGE,
    label: 'Amplitud',
    bipolar: true,
    resetValue: 0,
    bigStep: AMPLITUDE_BIG_STEP,
    ticks: ['+1', '0', '−1'],
    format: (v) => fmt(v, 2),
    onInput: (v) => update({ amplitude: v }),
  });
  const ampNum = numberInput({ min: -1, max: 1, step: 0.01, 'aria-label': 'Amplitud' });
  const ampLabel = h('span', { class: 'param-label' });
  const led = h('span', { class: 'led', title: 'Pertenece al subespacio generado por los canales anteriores' }, 'redundante');

  power.addEventListener('click', () => update({ active: power.getAttribute('aria-pressed') !== 'true' }));
  remove.addEventListener('click', () => dispatch({ type: 'removeChannel', id }));
  dec.addEventListener('click', () => update({ harmonic: Number(harmonic.value) - 1 }));
  inc.addEventListener('click', () => update({ harmonic: Number(harmonic.value) + 1 }));
  onCommit(harmonic, (v) => update({ harmonic: v }));
  onCommit(phaseNum, (v) => update({ phase: v }));
  onCommit(ampNum, (v) => update({ amplitude: v }));
  bindSamplePointer(canvas, dispatch);

  const root = h('article', { class: 'strip' },
    h('header', { class: 'strip-head' }, name, h('div', { class: 'strip-actions' }, power, remove)),
    h('div', { class: 'strip-sub' }, freq, led),
    canvas,
    h('div', { class: 'strip-param param-k' },
      h('span', { class: 'param-label' }, h('i', { class: 'math' }, 'k')),
      h('div', { class: 'stepper' }, dec, harmonic, inc)),
    h('div', { class: 'strip-param param-phase' },
      knob.el,
      h('div', { class: 'param-side' },
        h('span', { class: 'param-label' }, 'fase ', h('i', { class: 'math' }, 'φ')),
        h('span', { class: 'lcd-wrap' }, phaseNum, h('span', { class: 'unit' }, '°')))),
    h('div', { class: 'strip-param param-amp' },
      fader.el,
      h('div', { class: 'param-side' }, ampLabel, ampNum)),
  );
  return { id, root, name, freq, led, power, powerText, remove, harmonic, dec, inc, knob, phaseNum, fader, ampNum, ampLabel, canvas };
};

interface RenderContext {
  readonly state: AppState;
  readonly model: Model;
  readonly theme: Theme;
  readonly redundant: ReadonlySet<number>;
}

const drawStripWave = (strip: Strip, c: Channel, index: number, ctx: RenderContext): void => {
  const v = ctx.model.vectors.get(c.id) as Vector;
  const color = c.active ? ctx.theme.channels[index % ctx.theme.channels.length] : ctx.theme.muted;
  drawWave(strip.canvas, {
    layers: [
      { values: v, color, width: 1, alpha: 0.25 },
      { values: scale(c.amplitude, v), color, width: 1.75 },
    ],
    yMax: 1,
    marker: ctx.state.sample,
    markerColor: ctx.theme.marker,
    gridColor: ctx.theme.grid,
    dotRing: ctx.theme.screen,
  });
};

const updateStrip = (s: Strip, c: Channel, index: number, ctx: RenderContext): void => {
  const label = channelName(index);
  s.root.style.setProperty('--c', channelColorVar(index));
  s.root.classList.toggle('is-off', !c.active);
  setText(s.name, label);
  setText(s.freq, fmtHz(harmonicFrequency(c.harmonic)));
  s.led.classList.toggle('is-on', ctx.redundant.has(c.id));
  s.root.title = `${label}[n] = sen(2π·${c.harmonic}n/480 + ${c.phase}°)`;
  s.power.setAttribute('aria-pressed', String(c.active));
  s.power.setAttribute('aria-label', `${c.active ? 'Quitar de' : 'Incluir en'} la mezcla ${label}`);
  setText(s.powerText, c.active ? 'ON' : 'OFF');
  s.remove.disabled = ctx.state.channels.length <= 1;
  s.remove.setAttribute('aria-label', `Quitar ${label}`);
  syncInput(s.harmonic, String(c.harmonic));
  s.dec.disabled = c.harmonic <= HARMONIC_MIN;
  s.inc.disabled = c.harmonic >= HARMONIC_MAX;
  s.knob.setValue(c.phase);
  s.knob.setLabel(`Fase de ${label}`);
  syncInput(s.phaseNum, String(c.phase));
  s.fader.setValue(c.amplitude);
  s.fader.setLabel(`Amplitud a${label.slice(1)}`);
  setText(s.ampLabel, `amplitud a${label.slice(1)}`);
  s.ampNum.setAttribute('aria-label', `Amplitud a${label.slice(1)}`);
  syncInput(s.ampNum, c.amplitude.toFixed(2));
  drawStripWave(s, c, index, ctx);
};

/** Mesa de canales. Las tiras se reconstruyen solo cuando cambia qué canales hay. */
export const createStrips = (container: HTMLElement, addButton: HTMLButtonElement, dispatch: Dispatch) => {
  let strips: Strip[] = [];
  let structureKey = '';
  addButton.addEventListener('click', () => dispatch({ type: 'addChannel' }));

  return (state: AppState, model: Model, theme: Theme): void => {
    const key = `${state.revision}|${state.channels.map((c) => c.id).join(',')}`;
    if (key !== structureKey) {
      const previous = new Map(strips.map((s) => [s.id, s]));
      strips = state.channels.map((c) => previous.get(c.id) ?? createStrip(c, dispatch));
      container.replaceChildren(...strips.map((s) => s.root), addButton);
      structureKey = key;
    }
    const activeIds = model.active.map((c) => c.id);
    const redundant = new Set(model.dependence.relations.map((r) => activeIds[r.index]));
    const ctx: RenderContext = { state, model, theme, redundant };
    state.channels.forEach((c, i) => updateStrip(strips[i], c, i, ctx));
    addButton.hidden = state.channels.length >= MAX_CHANNELS;
  };
};
