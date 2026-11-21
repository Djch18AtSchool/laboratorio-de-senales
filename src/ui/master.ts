import type { Action, AppState } from '../state/state';
import type { Model } from '../state/model';
import { MAX_OUTPUT } from '../math/output';
import { setText } from './dom';
import { fmt, fmtNearZero } from './format';
import { createFader } from './controls/fader';

export interface MasterElements {
  readonly faderHost: HTMLElement;
  readonly volume: HTMLElement;
  readonly gain: HTMLElement;
  readonly gainFormula: HTMLElement;
  readonly meter: HTMLElement;
  readonly meterValue: HTMLElement;
}

const PERCENT = 100;
const DEFAULT_VOLUME_PERCENT = 80;
const VOLUME_BIG_STEP = 10;

/** Tira de salida: volumen, factor g = 0.9/p · vol y medidor del pico de g·m. */
export const createMaster = (el: MasterElements, dispatch: (a: Action) => void) => {
  const fader = createFader({
    range: { min: 0, max: PERCENT, step: 1 },
    label: 'Volumen general',
    resetValue: DEFAULT_VOLUME_PERCENT,
    bigStep: VOLUME_BIG_STEP,
    ticks: ['100', '50', '0'],
    format: (v) => `${v}%`,
    onInput: (v) => dispatch({ type: 'setVolume', volume: v / PERCENT }),
  });
  fader.setLabel('Volumen general');
  el.faderHost.replaceChildren(fader.el);

  return (state: AppState, model: Model): void => {
    const volume = Math.round(state.volume * PERCENT);
    fader.setValue(volume);
    setText(el.volume, `${volume}%`);
    setText(el.gain, fmt(model.gain, 3));
    setText(el.gainFormula, model.active.length ? `0.9 / ${model.active.length} · ${fmt(state.volume, 2)}` : 'sin canales');
    const out = model.gain * model.peak;
    el.meter.style.setProperty('--level', String(Math.min(1, out)));
    el.meter.style.setProperty('--ceiling', String(MAX_OUTPUT));
    setText(el.meterValue, fmtNearZero(out).text);
  };
};
