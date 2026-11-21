export const MAX_CHANNELS = 6;
export const MIN_CHANNELS = 1;
export const HARMONIC_MIN = 1;
export const HARMONIC_MAX = 20;
export const PHASE_MAX = 359;
export const DEFAULT_SAMPLE = 137;
export const SAMPLE_MAX = 479;
export const DEFAULT_VOLUME = 0.8;

export interface Channel {
  readonly id: number;
  readonly harmonic: number;
  readonly phase: number;
  readonly amplitude: number;
  readonly active: boolean;
}

export interface AppState {
  readonly channels: readonly Channel[];
  readonly sample: number;
  readonly volume: number;
  readonly nextId: number;
  /** Cambia cada vez que la lista de canales se reemplaza entera (ejemplos). */
  readonly revision: number;
  readonly example: ExampleId | null;
}

export type ExampleId = 'cancelacion' | 'faseOpuesta' | 'mismaNota' | 'tresArmonicos';

type ChannelSpec = Pick<Channel, 'harmonic' | 'phase' | 'amplitude'>;

export interface Example {
  readonly id: ExampleId;
  readonly label: string;
  readonly concept: string;
  readonly channels: readonly ChannelSpec[];
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'cancelacion',
    label: 'Cancelación',
    concept: 'Inverso aditivo: s + (−1)s = 0. Silencio y ‖m‖ = 0.',
    channels: [
      { harmonic: 4, phase: 0, amplitude: 0.8 },
      { harmonic: 4, phase: 0, amplitude: -0.8 },
    ],
  },
  {
    id: 'faseOpuesta',
    label: 'Fase opuesta',
    concept: 'Desfasar 180° es multiplicar por −1: también se cancela.',
    channels: [
      { harmonic: 5, phase: 0, amplitude: 0.7 },
      { harmonic: 5, phase: 180, amplitude: 0.7 },
    ],
  },
  {
    id: 'mismaNota',
    label: 'Misma nota, otra fase',
    concept: 'Tres vectores en un plano: rango 2, el tercero es redundante.',
    channels: [
      { harmonic: 3, phase: 0, amplitude: 0.7 },
      { harmonic: 3, phase: 90, amplitude: 0.5 },
      { harmonic: 3, phase: 60, amplitude: 0.4 },
    ],
  },
  {
    id: 'tresArmonicos',
    label: 'Tres armónicos',
    concept: '400, 500 y 600 Hz, un acorde mayor: rango 3, ninguno redundante.',
    channels: [
      { harmonic: 4, phase: 0, amplitude: 0.6 },
      { harmonic: 5, phase: 0, amplitude: 0.6 },
      { harmonic: 6, phase: 0, amplitude: 0.6 },
    ],
  },
];

const INITIAL_CHANNELS: readonly ChannelSpec[] = [
  { harmonic: 3, phase: 0, amplitude: 0.8 },
  { harmonic: 3, phase: 90, amplitude: -0.5 },
  { harmonic: 5, phase: 0, amplitude: 0.4 },
];

const toChannels = (specs: readonly ChannelSpec[], firstId: number): Channel[] =>
  specs.map((s, i) => ({ ...s, id: firstId + i, active: true }));

export const initialState = (): AppState => ({
  channels: toChannels(INITIAL_CHANNELS, 1),
  sample: DEFAULT_SAMPLE,
  volume: DEFAULT_VOLUME,
  nextId: INITIAL_CHANNELS.length + 1,
  revision: 0,
  example: null,
});

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** Las amplitudes se guardan con los mismos 2 decimales con que se muestran. */
export const AMPLITUDE_DECIMALS = 2;
const roundTo = (x: number, decimals: number): number => {
  const f = 10 ** decimals;
  return Math.round(x * f) / f + 0;
};

const sanitize = (patch: Partial<ChannelSpec & { active: boolean }>): Partial<Channel> => ({
  ...patch,
  ...(patch.harmonic !== undefined && { harmonic: clamp(Math.round(patch.harmonic), HARMONIC_MIN, HARMONIC_MAX) }),
  ...(patch.phase !== undefined && { phase: ((Math.round(patch.phase) % 360) + 360) % 360 }),
  ...(patch.amplitude !== undefined && { amplitude: roundTo(clamp(patch.amplitude, -1, 1), AMPLITUDE_DECIMALS) }),
});

export type Action =
  | { type: 'updateChannel'; id: number; patch: Partial<ChannelSpec & { active: boolean }> }
  | { type: 'addChannel' }
  | { type: 'removeChannel'; id: number }
  | { type: 'setSample'; sample: number }
  | { type: 'setVolume'; volume: number }
  | { type: 'loadExample'; id: ExampleId };

const isFiniteNumbers = (patch: object): boolean =>
  Object.values(patch).every((v) => typeof v === 'boolean' || Number.isFinite(v));

/** Devuelve un estado nuevo; nunca modifica el anterior. */
export const reduce = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'updateChannel': {
      if (!isFiniteNumbers(action.patch)) return state;
      const patch = sanitize(action.patch);
      return {
        ...state,
        example: null,
        channels: state.channels.map((c) => (c.id === action.id ? { ...c, ...patch } : c)),
      };
    }
    case 'addChannel': {
      if (state.channels.length >= MAX_CHANNELS) return state;
      const last = state.channels[state.channels.length - 1];
      const harmonic = last ? clamp(last.harmonic + 1, HARMONIC_MIN, HARMONIC_MAX) : 3;
      const channel: Channel = { id: state.nextId, harmonic, phase: 0, amplitude: 0.5, active: true };
      return { ...state, example: null, channels: [...state.channels, channel], nextId: state.nextId + 1 };
    }
    case 'removeChannel':
      if (state.channels.length <= MIN_CHANNELS) return state;
      return { ...state, example: null, channels: state.channels.filter((c) => c.id !== action.id) };
    case 'setSample':
      return Number.isFinite(action.sample) ? { ...state, sample: clamp(Math.round(action.sample), 0, SAMPLE_MAX) } : state;
    case 'setVolume':
      return Number.isFinite(action.volume) ? { ...state, volume: clamp(action.volume, 0, 1) } : state;
    case 'loadExample': {
      const ex = EXAMPLES.find((e) => e.id === action.id);
      if (!ex) return state;
      return {
        ...state,
        channels: toChannels(ex.channels, state.nextId),
        nextId: state.nextId + ex.channels.length,
        revision: state.revision + 1,
        example: ex.id,
      };
    }
  }
};
