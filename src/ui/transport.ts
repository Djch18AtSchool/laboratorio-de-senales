import type { Action, AppState } from '../state/state';
import type { Model } from '../state/model';
import { LoopPlayer } from '../audio/player';
import { SAMPLE_RATE } from '../math/signal';
import { icon, paintRange, setText } from './dom';

interface TransportElements {
  readonly play: HTMLButtonElement;
  readonly volume: HTMLInputElement;
  readonly volumeValue: HTMLElement;
  readonly warning: HTMLElement;
}

const PERCENT = 100;

const sameSamples = (a: Float64Array | null, b: Float64Array): boolean => {
  if (!a || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

/** Botón Escuchar/Detener, volumen y conexión con el reproductor. */
export const createTransport = (el: TransportElements, dispatch: (a: Action) => void, getModel: () => Model) => {
  const player = new LoopPlayer();
  let lastMix: Float64Array | null = null;
  let lastGain = -1;

  const showWarning = (text: string | null): void => {
    el.warning.hidden = text === null;
    if (text) setText(el.warning, text);
  };

  const paintButton = (): void => {
    const playing = player.isPlaying;
    el.play.classList.toggle('is-playing', playing);
    el.play.setAttribute('aria-pressed', String(playing));
    el.play.replaceChildren(icon(playing ? 'stop' : 'play', true), playing ? 'Detener' : 'Escuchar');
  };

  el.play.addEventListener('click', async () => {
    if (player.isPlaying) {
      player.stop();
      paintButton();
      return;
    }
    const model = getModel();
    try {
      await player.start(model.mix, model.gain);
      lastMix = model.mix;
      lastGain = model.gain;
      const rate = player.contextSampleRate;
      showWarning(rate !== null && rate !== SAMPLE_RATE
        ? `Tu dispositivo reproduce a ${rate.toLocaleString('es-CR')} muestras/s: el bucle se remuestrea al sonar. Lo que se calcula y se dibuja sigue siendo exacto.`
        : null);
    } catch (err) {
      console.error('No se pudo iniciar el audio', err);
      showWarning('No se pudo iniciar el sonido en este navegador. Las ondas y los números siguen funcionando.');
    }
    paintButton();
  });
  el.volume.addEventListener('input', () => dispatch({ type: 'setVolume', volume: Number(el.volume.value) / PERCENT }));
  paintButton();

  return (state: AppState, model: Model): void => {
    el.volume.value = String(Math.round(state.volume * PERCENT));
    paintRange(el.volume);
    setText(el.volumeValue, `${Math.round(state.volume * PERCENT)}%`);
    if (!player.isPlaying) return;
    if (!sameSamples(lastMix, model.mix)) {
      player.update(model.mix);
      lastMix = model.mix;
    }
    if (model.gain !== lastGain) {
      player.setGain(model.gain);
      lastGain = model.gain;
    }
  };
};
