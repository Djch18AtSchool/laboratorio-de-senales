export interface BarOptions {
  readonly values: readonly number[];
  readonly color: string;
  readonly gridColor: string;
  readonly labelColor: string;
  readonly yMax: number;
  /** Etiqueta bajo cada cuántas barras (para no amontonar los números). */
  readonly labelEvery: number;
}

const LABEL_FONT = '10px ui-sans-serif, system-ui, sans-serif';
const LABEL_SPACE = 14;
const GAP_RATIO = 0.3;

/** Diagrama de barras simple: una barra por armónico k = 1, 2, … */
export const drawBars = (canvas: HTMLCanvasElement, opts: BarOptions): void => {
  const ctx = canvas.getContext('2d');
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!ctx || w === 0 || h === 0) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const base = h - LABEL_SPACE;
  ctx.strokeStyle = opts.gridColor;
  ctx.beginPath();
  ctx.moveTo(0, base + 0.5);
  ctx.lineTo(w, base + 0.5);
  ctx.stroke();

  const n = opts.values.length;
  const slot = w / Math.max(n, 1);
  const barW = Math.max(1, slot * (1 - GAP_RATIO));
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  opts.values.forEach((v, i) => {
    const bh = (Math.min(Math.abs(v), opts.yMax) / opts.yMax) * (base - 4);
    const x = i * slot + (slot - barW) / 2;
    ctx.fillStyle = opts.color;
    ctx.fillRect(x, base - bh, barW, bh);
    const k = i + 1;
    if (k === 1 || k % opts.labelEvery === 0) {
      ctx.fillStyle = opts.labelColor;
      ctx.fillText(String(k), x + barW / 2, h);
    }
  });
};
