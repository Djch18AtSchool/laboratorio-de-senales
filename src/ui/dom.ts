type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | false;

/** Crea un elemento con atributos e hijos. Los atributos `false`/`undefined` se omiten. */
export const h = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === false || v === undefined) return;
    el.setAttribute(k, v === true ? '' : String(v));
  });
  children.forEach((c) => {
    if (c !== null && c !== undefined && c !== false) el.append(c);
  });
  return el;
};

export const byId = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id}`);
  return el as T;
};

/** Pinta la parte recorrida de un deslizador; bipolar: desde el centro. */
export const paintRange = (input: HTMLInputElement, bipolar = false): void => {
  const min = Number(input.min);
  const max = Number(input.max);
  const pos = ((Number(input.value) - min) / (max - min)) * 100;
  const from = bipolar ? Math.min(50, pos) : 0;
  const to = bipolar ? Math.max(50, pos) : pos;
  input.style.setProperty('--from', `${from}%`);
  input.style.setProperty('--to', `${to}%`);
};

export const setText = (el: Element, text: string): void => {
  if (el.textContent !== text) el.textContent = text;
};

/** Lee los colores de los tokens de CSS para dibujar en el lienzo. */
export const cssVar = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS: Record<string, string> = {
  play: 'M7 5.5v13l11-6.5z',
  stop: 'M7 7h10v10H7z',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  minus: 'M5 12h14',
};

export const icon = (name: keyof typeof ICONS & string, filled = false): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'icon');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICONS[name]);
  if (filled) path.setAttribute('fill', 'currentColor');
  else {
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
  }
  svg.append(path);
  return svg;
};
