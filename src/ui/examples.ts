import { EXAMPLES, type Action, type AppState } from '../state/state';
import { h, setText } from './dom';

const DEFAULT_CONCEPT = 'Cada ejemplo carga una configuración que demuestra un concepto. Todo se comprueba también sin sonido.';

export const createExamples = (container: HTMLElement, concept: HTMLElement, dispatch: (a: Action) => void) => {
  const buttons = EXAMPLES.map((ex) => {
    const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false' }, ex.label);
    b.addEventListener('click', () => dispatch({ type: 'loadExample', id: ex.id }));
    return { ex, b };
  });
  container.replaceChildren(...buttons.map(({ b }) => b));

  return (state: AppState): void => {
    buttons.forEach(({ ex, b }) => b.setAttribute('aria-pressed', String(state.example === ex.id)));
    const current = EXAMPLES.find((e) => e.id === state.example);
    setText(concept, current ? current.concept : DEFAULT_CONCEPT);
    concept.classList.toggle('is-active', Boolean(current));
  };
};
