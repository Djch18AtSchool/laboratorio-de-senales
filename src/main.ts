import './style.css';
import { initialState, reduce, type Action, type AppState } from './state/state';
import { computeModel, type Model } from './state/model';
import { byId } from './ui/dom';
import { readTheme } from './ui/theme';
import { createStrips } from './ui/strips';
import { createScope } from './ui/scope';
import { createMaster } from './ui/master';
import { createSamplePanel } from './ui/samplePanel';
import { createDependencePanel } from './ui/dependencePanel';
import { createPresets } from './ui/presets';
import { createTransport } from './ui/transport';
import { createApproxPanel } from './ui/approxPanel';
import { createTabs } from './ui/inspector';
import { createHelp } from './ui/help';

/** Diferencia aceptada entre la suma de la tabla y el punto de la onda (mismo criterio que el panel). */
const MATCH_TOLERANCE = 1e-12;

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

const renderPresets = createPresets(byId('presets'), byId('scope-concept'), dispatch);
const renderStrips = createStrips(byId('strips'), byId<HTMLButtonElement>('add-channel'), dispatch);
const renderScope = createScope(
  {
    canvas: byId<HTMLCanvasElement>('scope-canvas'),
    formula: byId('scope-formula'),
    stats: byId('scope-stats'),
    vector: byId('scope-vector'),
    cursor: byId('scope-cursor'),
    zero: byId('scope-zero'),
    span: byId('scope-span'),
  },
  setSample,
);
const renderMaster = createMaster(
  {
    faderHost: byId('volume-fader'),
    volume: byId('volume-value'),
    gain: byId('g-value'),
    gainFormula: byId('g-formula'),
    meter: byId('meter'),
    meterValue: byId('meter-value'),
  },
  dispatch,
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
const renderTransport = createTransport({ play: byId<HTMLButtonElement>('play'), warning: byId('audio-warning') }, () => model);
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
const setBadge = createTabs(byId('inspector-tabs'), scheduleRender);
createHelp(byId<HTMLButtonElement>('help-open'), byId<HTMLDialogElement>('help'));

const renderBadges = (): void => {
  const n = state.sample;
  const sum = model.active.reduce((acc, c, i) => acc + model.coefficients[i] * (model.vectors.get(c.id) as Float64Array)[n], 0);
  const matches = Math.abs(sum - model.mix[n]) <= MATCH_TOLERANCE;
  setBadge('muestra', `n ${n} ${matches ? '✓' : '✗'}`, matches ? 'ok' : 'warn');
  const p = model.active.length;
  const r = model.dependence.rank;
  setBadge('dependencia', `${r}/${p}`, p > 0 && r < p ? 'warn' : 'ok');
};

function render(): void {
  const theme = readTheme();
  renderPresets(state);
  renderStrips(state, model, theme);
  renderScope(state, model, theme);
  renderMaster(state, model);
  renderSample(state, model);
  renderDependence(state, model);
  renderTransport(model);
  renderApprox(theme);
  renderBadges();
}

new ResizeObserver(scheduleRender).observe(document.body);
render();
