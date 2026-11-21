import './style.css';
import { initialState, reduce, type Action, type AppState } from './state/state';
import { computeModel, type Model } from './state/model';
import { byId } from './ui/dom';
import { readTheme } from './ui/theme';
import { createChannelList } from './ui/channels';
import { createMixPanel } from './ui/mixPanel';
import { createSamplePanel } from './ui/samplePanel';
import { createDependencePanel } from './ui/dependencePanel';
import { createExamples } from './ui/examples';
import { createTransport } from './ui/transport';
import { createApproxPanel } from './ui/approxPanel';

let state: AppState = initialState();
let model: Model = computeModel(state);
let frame = 0;

const scheduleRender = (): void => {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    render();
  });
};

const dispatch = (action: Action): void => {
  const next = reduce(state, action);
  // Aunque el estado no cambie (p. ej. un valor no válido), se vuelve a pintar
  // para que las cajas de número muestren el valor vigente.
  const needsModel = next.channels !== state.channels || next.volume !== state.volume;
  state = next;
  if (needsModel) model = computeModel(state);
  scheduleRender();
};

const setSample = (sample: number): void => dispatch({ type: 'setSample', sample });

const renderChannels = createChannelList(byId('channels'), byId<HTMLButtonElement>('add-channel'), dispatch);
const renderMix = createMixPanel(
  {
    formula: byId('mix-formula'),
    canvas: byId<HTMLCanvasElement>('mix-canvas'),
    vector: byId('coef-vector'),
    stats: byId('mix-stats'),
    zero: byId('mix-zero'),
    span: byId('mix-span'),
  },
  setSample,
);
const renderSample = createSamplePanel(
  {
    range: byId<HTMLInputElement>('sample'),
    number: byId<HTMLInputElement>('sample-number'),
    time: byId('sample-time'),
    body: byId('sample-body'),
    sum: byId('sample-sum'),
    wave: byId('sample-wave'),
    check: byId('sample-check'),
  },
  setSample,
);
const renderDependence = createDependencePanel({
  rank: byId('rank'),
  summary: byId('rank-summary'),
  body: byId('dependence-body'),
  gram: byId('gram'),
});
const renderExamples = createExamples(byId('examples'), byId('example-concept'), dispatch);
const renderTransport = createTransport(
  {
    play: byId<HTMLButtonElement>('play'),
    volume: byId<HTMLInputElement>('volume'),
    volumeValue: byId('volume-value'),
    warning: byId('audio-warning'),
  },
  dispatch,
  () => model,
);

const renderApprox = createApproxPanel(
  {
    targets: byId('approx-targets'),
    k: byId<HTMLInputElement>('approx-k'),
    kNumber: byId<HTMLInputElement>('approx-k-number'),
    dim: byId('approx-dim'),
    canvas: byId<HTMLCanvasElement>('approx-canvas'),
    spectrum: byId<HTMLCanvasElement>('approx-spectrum'),
    stats: byId('approx-stats'),
  },
  scheduleRender,
);

function render(): void {
  const theme = readTheme();
  renderExamples(state);
  renderChannels(state, model, theme);
  renderMix(state, model, theme);
  renderSample(state, model);
  renderDependence(state, model);
  renderTransport(state, model);
  renderApprox(theme);
}

new ResizeObserver(scheduleRender).observe(document.body);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', scheduleRender);
render();
