import { angleFromPoint, keyboardValue, snapAngle, type ValueRange } from './scale';

export interface Knob {
  readonly el: HTMLElement;
  setValue(deg: number): void;
  setLabel(label: string): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 48;
const RADIUS = 19;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PHASE_RANGE: ValueRange = { min: 0, max: 359, step: 1 };
const BIG_STEP_DEG = 15;
const FULL_TURN = 360;

const svgEl = (tag: string, attrs: Record<string, string | number>): SVGElement => {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
};

/**
 * Dial de fase: el ángulo del dial es la fase φ (0° arriba, sentido horario).
 * Se gira arrastrando alrededor del centro o con el teclado; se imanta a 0°, 90°, 180° y 270°.
 */
export const createPhaseKnob = (onInput: (deg: number) => void): Knob => {
  const c = SIZE / 2;
  const ring = svgEl('circle', { cx: c, cy: c, r: RADIUS, class: 'knob-ring' });
  const arc = svgEl('circle', {
    cx: c, cy: c, r: RADIUS, class: 'knob-arc',
    transform: `rotate(-90 ${c} ${c})`, 'stroke-dasharray': `0 ${CIRCUMFERENCE}`,
  });
  const ticks = [0, 90, 180, 270].map((a) => {
    const rad = (a * Math.PI) / 180;
    const r1 = RADIUS + 4;
    const r2 = RADIUS + 6.5;
    return svgEl('line', {
      x1: c + r1 * Math.sin(rad), y1: c - r1 * Math.cos(rad),
      x2: c + r2 * Math.sin(rad), y2: c - r2 * Math.cos(rad), class: 'knob-tick',
    });
  });
  const pointer = svgEl('line', { x1: c, y1: c, x2: c, y2: c - RADIUS + 5, class: 'knob-pointer' });
  const hub = svgEl('circle', { cx: c, cy: c, r: 3, class: 'knob-hub' });
  const svg = svgEl('svg', { viewBox: `-4 -4 ${SIZE + 8} ${SIZE + 8}`, 'aria-hidden': 'true' });
  svg.append(ring, ...ticks, arc, pointer, hub);

  const el = document.createElement('div');
  el.className = 'knob';
  el.tabIndex = 0;
  el.setAttribute('role', 'slider');
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '359');
  el.append(svg);

  let value = Number.NaN;
  const emit = (v: number): void => {
    if (v !== value) onInput(v);
  };
  const fromPointer = (e: PointerEvent): number => {
    const rect = el.getBoundingClientRect();
    return snapAngle(angleFromPoint(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2)));
  };

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.focus();
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
    emit(fromPointer(e));
  });
  el.addEventListener('pointermove', (e) => {
    if (el.hasPointerCapture(e.pointerId)) emit(fromPointer(e));
  });
  const release = (): void => el.classList.remove('is-dragging');
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('dblclick', () => emit(0));
  el.addEventListener('keydown', (e) => {
    // La fase da la vuelta: 359° + 1° = 0°.
    const wrapped = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? (value + 1) % FULL_TURN
      : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? (value + FULL_TURN - 1) % FULL_TURN
        : keyboardValue(e.key, value, PHASE_RANGE, BIG_STEP_DEG);
    if (wrapped === null) return;
    e.preventDefault();
    emit(wrapped);
  });

  return {
    el,
    setValue(deg: number): void {
      if (deg === value) return;
      value = deg;
      arc.setAttribute('stroke-dasharray', `${(deg / FULL_TURN) * CIRCUMFERENCE} ${CIRCUMFERENCE}`);
      pointer.setAttribute('transform', `rotate(${deg} ${c} ${c})`);
      el.setAttribute('aria-valuenow', String(deg));
      el.setAttribute('aria-valuetext', `${deg} grados`);
    },
    setLabel(label: string): void {
      el.setAttribute('aria-label', label);
    },
  };
};
