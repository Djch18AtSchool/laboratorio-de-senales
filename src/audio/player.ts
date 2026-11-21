import { N, SAMPLE_RATE } from '../math/signal';

/** Duración del fundido entre el bucle anterior y el nuevo. */
const CROSSFADE_S = 0.03;
/** Margen para programar el cambio un poco en el futuro del reloj de audio. */
const LOOKAHEAD_S = 0.01;
/** Constante de tiempo para cambios suaves del factor de salida. */
const GAIN_SMOOTHING_S = 0.015;
const LOOP_S = N / SAMPLE_RATE;
/** Intervalo mínimo entre fuentes nuevas mientras se arrastra un control. */
const MIN_UPDATE_INTERVAL_MS = 30;

interface Voice {
  readonly source: AudioBufferSourceNode;
  readonly fade: GainNode;
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

const createContext = (): AudioContext => {
  try {
    return new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: 'interactive' });
  } catch (err) {
    console.warn('No se pudo fijar 48 000 muestras/s; se usa la frecuencia del dispositivo.', err);
    return new AudioContext({ latencyHint: 'interactive' });
  }
};

/**
 * Reproduce en bucle un arreglo de 480 muestras (un periodo de 10 ms) y lo
 * multiplica por un factor de salida g fijo. Cada cambio crea una fuente nueva
 * alineada con el punto del bucle en que va la anterior y hace un fundido corto.
 */
export class LoopPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voice: Voice | null = null;
  private epoch = 0;
  private pending: Float64Array | null = null;
  private timer: number | null = null;
  private lastUpdate = 0;

  get isPlaying(): boolean {
    return this.voice !== null;
  }

  /** Frecuencia de muestreo real del contexto, o null si aún no existe. */
  get contextSampleRate(): number | null {
    return this.ctx?.sampleRate ?? null;
  }

  async start(samples: Float64Array, gain: number): Promise<void> {
    if (!this.ctx) {
      const nav = navigator as AudioSessionNavigator;
      if (nav.audioSession) nav.audioSession.type = 'playback';
      this.ctx = createContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    await this.ctx.resume();
    if (!this.master) throw new Error('LoopPlayer: falta el nodo de ganancia');
    this.master.gain.setValueAtTime(gain, this.ctx.currentTime);
    this.epoch = this.ctx.currentTime;
    this.voice = this.spawn(samples, this.epoch, 0);
  }

  /** Cambia el arreglo que suena. Agrupa los cambios rápidos para no crear una fuente por cuadro. */
  update(samples: Float64Array): void {
    if (!this.ctx || !this.voice) return;
    this.pending = samples;
    if (this.timer !== null) return;
    const wait = Math.max(0, MIN_UPDATE_INTERVAL_MS - (performance.now() - this.lastUpdate));
    this.timer = window.setTimeout(() => this.flush(), wait);
  }

  private flush(): void {
    this.timer = null;
    const samples = this.pending;
    this.pending = null;
    if (!samples || !this.ctx || !this.voice) return;
    this.lastUpdate = performance.now();
    const t0 = this.ctx.currentTime + LOOKAHEAD_S;
    const offset = (((t0 - this.epoch) % LOOP_S) + LOOP_S) % LOOP_S;
    const previous = this.voice;
    this.voice = this.spawn(samples, t0, offset);
    this.fadeOut(previous, t0);
  }

  setGain(gain: number): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(gain, this.ctx.currentTime, GAIN_SMOOTHING_S);
  }

  stop(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    if (!this.ctx || !this.voice) return;
    this.fadeOut(this.voice, this.ctx.currentTime);
    this.voice = null;
  }

  private spawn(samples: Float64Array, when: number, offset: number): Voice {
    const ctx = this.ctx as AudioContext;
    const buffer = ctx.createBuffer(1, N, SAMPLE_RATE);
    buffer.copyToChannel(Float32Array.from(samples), 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const fade = ctx.createGain();
    fade.gain.setValueAtTime(0, when);
    fade.gain.linearRampToValueAtTime(1, when + CROSSFADE_S);
    source.connect(fade).connect(this.master as GainNode);
    source.start(when, offset);
    return { source, fade };
  }

  private fadeOut(voice: Voice, when: number): void {
    const g = voice.fade.gain;
    if (typeof g.cancelAndHoldAtTime === 'function') {
      g.cancelAndHoldAtTime(when);
    } else {
      g.cancelScheduledValues(when);
      g.setValueAtTime(g.value, when);
    }
    g.linearRampToValueAtTime(0, when + CROSSFADE_S);
    voice.source.stop(when + CROSSFADE_S + LOOKAHEAD_S);
    voice.source.onended = () => voice.fade.disconnect();
  }
}
