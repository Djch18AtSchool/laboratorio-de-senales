import { HARMONIC_MAX, HARMONIC_MIN, MAX_CHANNELS, PHASE_MAX, type Action, type AppState, type Channel } from '../state/state';
import type { Model } from '../state/model';
import { harmonicFrequency, N, type Vector } from '../math/signal';
import { scale } from '../math/linalg';
import { drawWave, sampleFromPointer } from '../draw/wave';
import { h, icon, paintRange, setText } from './dom';
import { channelName, fmtHz } from './format';
import { channelColorVar, type Theme } from './theme';

type Dispatch = (action: Action) => void;

interface Card {
  readonly id: number;
  readonly root: HTMLElement;
  readonly name: HTMLElement;
  readonly freq: HTMLElement;
  readonly tag: HTMLElement;
  readonly formula: HTMLElement;
  readonly active: HTMLInputElement;
  readonly remove: HTMLButtonElement;
  readonly harmonic: HTMLInputElement;
  readonly dec: HTMLButtonElement;
  readonly inc: HTMLButtonElement;
  readonly phase: HTMLInputElement;
  readonly phaseNum: HTMLInputElement;
  readonly amp: HTMLInputElement;
  readonly ampNum: HTMLInputElement;
  readonly canvas: HTMLCanvasElement;
}

const field = (label: string, ...controls: HTMLElement[]): HTMLElement =>
  h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), h('div', { class: 'field-controls' }, ...controls));

const numberInput = (attrs: Record<string, string | number>): HTMLInputElement =>
  h('input', { type: 'number', inputmode: 'decimal', class: 'num', ...attrs });

/** Conecta un control: `input` para deslizadores, `change` para cajas de número. */
const bind = (el: HTMLInputElement, event: 'input' | 'change', fn: (value: number) => void): void =>
  el.addEventListener(event, () => fn(Number(el.value)));

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

const createCard = (channel: Channel, dispatch: Dispatch): Card => {
  const id = channel.id;
  const update = (patch: Partial<Channel>): void => dispatch({ type: 'updateChannel', id, patch });

  const name = h('span', { class: 'ch-name math' });
  const freq = h('span', { class: 'ch-freq' });
  const tag = h('span', { class: 'tag tag-warn', hidden: true }, 'redundante');
  const active = h('input', { type: 'checkbox', class: 'switch', role: 'switch' });
  const remove = h('button', { type: 'button', class: 'icon-btn', title: 'Quitar canal' }, icon('close'));
  const formula = h('p', { class: 'ch-formula math' });

  const dec = h('button', { type: 'button', class: 'step', 'aria-label': 'Bajar armónico' }, icon('minus'));
  const inc = h('button', { type: 'button', class: 'step', 'aria-label': 'Subir armónico' }, icon('plus'));
  const harmonic = numberInput({ min: HARMONIC_MIN, max: HARMONIC_MAX, step: 1, 'aria-label': 'Armónico k' });
  const phase = h('input', { type: 'range', min: 0, max: PHASE_MAX, step: 1, 'aria-label': 'Fase en grados' });
  const phaseNum = numberInput({ min: 0, max: PHASE_MAX, step: 1, 'aria-label': 'Fase en grados' });
  const amp = h('input', { type: 'range', min: -1, max: 1, step: 0.01, class: 'bipolar', 'aria-label': 'Amplitud' });
  const ampNum = numberInput({ min: -1, max: 1, step: 0.01, 'aria-label': 'Amplitud' });
  const canvas = h('canvas', { class: 'wave wave-sm', 'aria-hidden': 'true' });

  active.addEventListener('change', () => update({ active: active.checked }));
  remove.addEventListener('click', () => dispatch({ type: 'removeChannel', id }));
  dec.addEventListener('click', () => update({ harmonic: Number(harmonic.value) - 1 }));
  inc.addEventListener('click', () => update({ harmonic: Number(harmonic.value) + 1 }));
  bind(harmonic, 'change', (v) => update({ harmonic: v }));
  bind(phase, 'input', (v) => update({ phase: v }));
  bind(phaseNum, 'change', (v) => update({ phase: v }));
  bind(amp, 'input', (v) => update({ amplitude: v }));
  bind(ampNum, 'change', (v) => update({ amplitude: v }));
  amp.addEventListener('dblclick', () => update({ amplitude: 0 }));
  bindSamplePointer(canvas, dispatch);

  const root = h(
    'article',
    { class: 'channel' },
    h('header', { class: 'ch-head' },
      h('span', { class: 'dot' }), name, freq, tag,
      h('div', { class: 'ch-actions' }, h('label', { class: 'switch-wrap', title: 'Activar o desactivar' }, active), remove)),
    formula,
    h('div', { class: 'ch-controls' },
      field('Armónico k', h('div', { class: 'stepper' }, dec, harmonic, inc)),
      field('Fase φ', phase, h('span', { class: 'num-wrap' }, phaseNum, h('span', { class: 'unit' }, '°'))),
      field('Amplitud', amp, ampNum)),
    canvas,
  );
  return { id, root, name, freq, tag, formula, active, remove, harmonic, dec, inc, phase, phaseNum, amp, ampNum, canvas };
};

/** Escribe un valor en un control salvo que la persona lo esté editando. */
const syncInput = (el: HTMLInputElement, value: string): void => {
  if (document.activeElement !== el && el.value !== value) el.value = value;
};

const updateCard = (card: Card, c: Channel, index: number, ctx: RenderContext): void => {
  const label = channelName(index);
  card.root.style.setProperty('--c', channelColorVar(index));
  card.root.classList.toggle('is-off', !c.active);
  setText(card.name, label);
  setText(card.freq, `${fmtHz(harmonicFrequency(c.harmonic))}`);
  card.tag.hidden = !ctx.redundant.has(c.id);
  setText(card.formula, `${label}[n] = sen(2π·${c.harmonic}n/480 + ${c.phase}°)`);
  card.active.checked = c.active;
  card.active.setAttribute('aria-label', `Activar ${label}`);
  card.remove.disabled = ctx.state.channels.length <= 1;
  card.remove.setAttribute('aria-label', `Quitar ${label}`);
  syncInput(card.harmonic, String(c.harmonic));
  card.dec.disabled = c.harmonic <= HARMONIC_MIN;
  card.inc.disabled = c.harmonic >= HARMONIC_MAX;
  syncInput(card.phase, String(c.phase));
  syncInput(card.phaseNum, String(c.phase));
  syncInput(card.amp, c.amplitude.toFixed(2));
  syncInput(card.ampNum, c.amplitude.toFixed(2));
  paintRange(card.phase);
  paintRange(card.amp, true);
  drawChannel(card.canvas, ctx.model.vectors.get(c.id) as Vector, c, index, ctx);
};

const drawChannel = (canvas: HTMLCanvasElement, v: Vector, c: Channel, index: number, ctx: RenderContext): void => {
  const color = c.active ? ctx.theme.channels[index % ctx.theme.channels.length] : ctx.theme.muted;
  drawWave(canvas, {
    layers: [
      { values: v, color, width: 1, alpha: 0.28 },
      { values: scale(c.amplitude, v), color, width: 1.75 },
    ],
    yMax: 1,
    marker: ctx.state.sample,
    markerColor: ctx.theme.marker,
    gridColor: ctx.theme.grid,
  });
};

interface RenderContext {
  readonly state: AppState;
  readonly model: Model;
  readonly theme: Theme;
  readonly redundant: ReadonlySet<number>;
}

/** Lista de tarjetas de canal. Se reconstruye solo cuando cambia qué canales hay. */
export const createChannelList = (container: HTMLElement, addButton: HTMLButtonElement, dispatch: Dispatch) => {
  let cards: Card[] = [];
  let structureKey = '';
  addButton.addEventListener('click', () => dispatch({ type: 'addChannel' }));

  return (state: AppState, model: Model, theme: Theme): void => {
    const key = `${state.revision}|${state.channels.map((c) => c.id).join(',')}`;
    if (key !== structureKey) {
      const previous = new Map(cards.map((c) => [c.id, c]));
      cards = state.channels.map((c) => previous.get(c.id) ?? createCard(c, dispatch));
      container.replaceChildren(...cards.map((c) => c.root));
      structureKey = key;
    }
    const activeIds = model.active.map((c) => c.id);
    const redundant = new Set(model.dependence.relations.map((r) => activeIds[r.index]));
    const ctx: RenderContext = { state, model, theme, redundant };
    state.channels.forEach((c, i) => updateCard(cards[i], c, i, ctx));
    addButton.disabled = state.channels.length >= MAX_CHANNELS;
    setText(addButton.querySelector('.label') as HTMLElement, state.channels.length >= MAX_CHANNELS ? 'Máximo 6 canales' : 'Agregar canal');
  };
};
