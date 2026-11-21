import type { AppState } from '../state/state';
import type { Model } from '../state/model';
import { channelName } from './format';

/** Para cada canal activo (en orden), su nombre sᵢ y su posición de color en la lista completa. */
export interface ActiveLabel {
  readonly id: number;
  readonly name: string;
  readonly slot: number;
}

export const activeLabels = (state: AppState, model: Model): ActiveLabel[] =>
  model.active.map((c) => {
    const slot = state.channels.findIndex((x) => x.id === c.id);
    return { id: c.id, name: channelName(slot), slot };
  });
