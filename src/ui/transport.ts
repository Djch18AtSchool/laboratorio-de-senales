import type { Model } from '../state/model';
import { LoopPlayer } from '../audio/player';
import { SAMPLE_RATE } from '../math/signal';
import { h, icon, setText } from './dom';

interface TransportElements {
  readonly play: HTMLButtonElement;
  readonly warning: HTMLElement;
}

/** Elementos en los que la barra espaciadora ya tiene un uso propio. */
const isTypingTarget = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.matches('input, textarea, select, button, [role="slider"], [role="tab"]') || t.isContentEditable);

const EQ_BARS = 4;

const sameSamples = (a: Float64Array | null, b: Float64Array): boolean => {
  if (!a || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

/** Botón Escuchar/Detener, volumen y conexión con el reproductor. */
export const createTransport = (el: TransportElements, getModel: () => Model) => {
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
    const eq = h('span', { class: 'eq-bars', 'aria-hidden': 'true' }, ...Array.from({ length: EQ_BARS }, () => h('i')));
    el.play.replaceChildren(playing ? eq : icon('play', true), h('span', {}, playing ? 'Detener' : 'Escuchar'));
  };

  /** Lleva al reproductor la mezcla y el factor g actuales, si cambiaron. */
  const sync = (model: Model): void => {
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

  const describeRate = (): string | null => {
    const rate = player.contextSampleRate;
    return rate !== null && rate !== SAMPLE_RATE
      ? `Tu dispositivo reproduce a ${rate.toLocaleString('es-CR')} muestras/s: el bucle se remuestrea al sonar. Lo que se calcula y se dibuja sigue siendo exacto.`
      : null;
  };

  const startPlayback = async (): Promise<void> => {
    const model = getModel();
    try {
      await player.start(model.mix, model.gain);
      lastMix = model.mix;
      lastGain = model.gain;
      sync(getModel());
      showWarning(describeRate());
    } catch (err) {
      console.error('No se pudo iniciar el audio', err);
      showWarning('No se pudo iniciar el sonido en este navegador. Las ondas y los números siguen funcionando.');
    }
  };

  let isStarting = false;
  el.play.addEventListener('click', async () => {
    if (isStarting) return;
    if (player.isPlaying) {
      player.stop();
      paintButton();
      return;
    }
    isStarting = true;
    el.play.disabled = true;
    await startPlayback();
    isStarting = false;
    el.play.disabled = false;
    paintButton();
  });
  player.onInterrupted(paintButton);
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || isTypingTarget(e.target)) return;
    e.preventDefault();
    el.play.click();
  });
  paintButton();

  return (model: Model): void => sync(model);
};
