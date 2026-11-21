import { EXAMPLES, type Action, type AppState } from '../state/state';
import { h } from './dom';

/** Presets: cada uno carga una configuración que demuestra un concepto. */
export const createPresets = (container: HTMLElement, concept: HTMLElement, dispatch: (a: Action) => void) => {
  const buttons = EXAMPLES.map((ex) => {
    const b = h('button', { type: 'button', class: 'preset', 'aria-pressed': 'false', title: ex.concept }, ex.label);
    b.addEventListener('click', () => dispatch({ type: 'loadExample', id: ex.id }));
    return { ex, b };
  });
  container.replaceChildren(...buttons.map(({ b }) => b));

  return (state: AppState): void => {
    buttons.forEach(({ ex, b }) => b.setAttribute('aria-pressed', String(state.example === ex.id)));
    const current = EXAMPLES.find((e) => e.id === state.example);
    concept.hidden = !current;
    if (current) concept.replaceChildren(h('b', {}, current.label), h('span', {}, current.concept));
  };
};
