import type { AppState } from '../state/state';
import type { Model } from '../state/model';
import type { DependenceRelation } from '../math/dependence';
import { h } from './dom';
import { fmt, fmtNearZero, joinEs, sci } from './format';
import { activeLabels, type ActiveLabel } from './labels';
import { channelColorVar } from './theme';

interface DependenceElements {
  readonly rank: HTMLElement;
  readonly summary: HTMLElement;
  readonly body: HTMLElement;
  readonly gram: HTMLElement;
}

const named = (l: ActiveLabel): HTMLElement => h('span', { class: 'math named', style: `--c:${channelColorVar(l.slot)}` }, l.name);

const combination = (rel: DependenceRelation, labels: ActiveLabel[]): (Node | string)[] =>
  rel.basis.flatMap((b, i) => {
    const c = rel.coefficients[i];
    const sign = i === 0 ? (c < 0 ? '−' : '') : c < 0 ? ' − ' : ' + ';
    return [sign, fmt(Math.abs(c)), '·', named(labels[b])];
  });

/** c₁s₁ + … + cₚsₚ = 0 con el canal redundante con coeficiente −1. */
const nullRelation = (rel: DependenceRelation, labels: ActiveLabel[]): (Node | string)[] => [
  ...combination(rel, labels), ' − 1·', named(labels[rel.index]), ' = 0',
];

const relationItem = (rel: DependenceRelation, labels: ActiveLabel[]): HTMLElement => {
  const target = labels[rel.index];
  const residual = rel.residualNorm === 0 ? '0 (exacto)' : `${sci(rel.residualNorm)} ≈ 0`;
  const others = joinEs(rel.basis.map((b) => labels[b].name));
  return h('li', { class: 'relation' },
    h('p', { class: 'eq' }, named(target), ' = ', ...combination(rel, labels)),
    h('p', { class: 'check' }, 'Relación no trivial: ', ...nullRelation(rel, labels)),
    h('p', { class: 'check' },
      'Comprobación: ‖', target.name, ' − (', ...combination(rel, labels), ')‖ = ',
      h('b', {}, residual)),
    h('p', { class: 'note' }, `${target.name} pertenece al subespacio generado por ${others}: es redundante.`),
  );
};

const gramTable = (model: Model, labels: ActiveLabel[]): HTMLElement => {
  const head = h('tr', {}, h('th', {}, ''), ...labels.map((l) => h('th', {}, named(l))));
  const rows = model.dependence.gram.map((row, i) =>
    h('tr', {}, h('th', {}, named(labels[i])), ...row.map((x) => h('td', { class: 'n' }, fmtNearZero(x, 1).text))));
  return h('table', { class: 'matrix' }, h('thead', {}, head), h('tbody', {}, ...rows));
};

export const createDependencePanel = (el: DependenceElements) => (state: AppState, model: Model): void => {
  const labels = activeLabels(state, model);
  const p = labels.length;
  const { rank, relations } = model.dependence;
  const names = labels.map((l) => l.name);
  const dependent = rank < p;

  el.rank.textContent = String(rank);
  el.summary.replaceChildren(
    h('p', { class: 'rank-line' }, `rango de S con ${p} ${p === 1 ? 'canal activo' : 'canales activos'}`),
    p === 0
      ? h('span', { class: 'tag' }, 'sin canales')
      : h('span', { class: `tag ${dependent ? 'tag-warn' : 'tag-ok'}` }, dependent ? 'linealmente dependientes' : 'linealmente independientes'),
  );

  const spanLine = p === 0 ? null : h('p', {}, `El subespacio generado por ${joinEs(names)} tiene dimensión ${rank}.`);
  const verdict = dependent
    ? h('p', { class: 'muted' }, 'El rango es menor que el número de canales, así que hay una relación no trivial. Cada canal redundante se escribe como combinación lineal de los anteriores:')
    : p > 0
      ? h('p', { class: 'muted' }, 'Ningún canal es combinación lineal de los otros: forman una base del subespacio que generan.')
      : null;
  el.body.replaceChildren(
    ...[spanLine, verdict].filter((x): x is HTMLParagraphElement => x !== null),
    ...(dependent ? [h('ol', { class: 'relations' }, ...relations.map((r) => relationItem(r, labels)))] : []),
  );
  el.gram.replaceChildren(...(p > 0 ? [gramTable(model, labels)] : [h('p', { class: 'muted' }, 'Sin canales activos.')]));
};
