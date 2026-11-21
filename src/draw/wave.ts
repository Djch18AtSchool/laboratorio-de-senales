export interface WaveLayer {
  readonly values: ArrayLike<number>;
  readonly color: string;
  readonly width?: number;
  readonly alpha?: number;
}

export interface WaveOptions {
  readonly layers: readonly WaveLayer[];
  /** La escala vertical va de −yMax a yMax. */
  readonly yMax: number;
  readonly marker?: number;
  readonly markerColor: string;
  readonly gridColor: string;
  readonly labelColor?: string;
  readonly showScale?: boolean;
  /** Capa que recibe el punto en la muestra marcada (por defecto la última). */
  readonly markerLayer?: number;
}

const PADDING_Y = 6;
const LABEL_FONT = '11px ui-sans-serif, system-ui, sans-serif';

/** Ajusta el tamaño interno del lienzo a su tamaño en pantalla y la densidad de píxeles. */
const fitCanvas = (canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return null;
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
};

const xOf = (n: number, count: number, w: number): number => (n / (count - 1)) * w;

const drawGrid = (ctx: CanvasRenderingContext2D, w: number, yOf: (v: number) => number, opts: WaveOptions): void => {
  ctx.strokeStyle = opts.gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, Math.round(yOf(0)) + 0.5);
  ctx.lineTo(w, Math.round(yOf(0)) + 0.5);
  ctx.stroke();
  if (!opts.showScale) return;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  for (const v of [opts.yMax, -opts.yMax]) {
    ctx.moveTo(0, Math.round(yOf(v)) + 0.5);
    ctx.lineTo(w, Math.round(yOf(v)) + 0.5);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = opts.labelColor ?? opts.gridColor;
  ctx.font = LABEL_FONT;
  ctx.textBaseline = 'top';
  ctx.fillText(`+${opts.yMax}`, 4, yOf(opts.yMax) + 3);
  ctx.textBaseline = 'bottom';
  ctx.fillText(`−${opts.yMax}`, 4, yOf(-opts.yMax) - 3);
};

const drawLayer = (ctx: CanvasRenderingContext2D, w: number, yOf: (v: number) => number, layer: WaveLayer): void => {
  const n = layer.values.length;
  ctx.globalAlpha = layer.alpha ?? 1;
  ctx.strokeStyle = layer.color;
  ctx.lineWidth = layer.width ?? 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xOf(i, n, w);
    const y = yOf(layer.values[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
};

const drawMarker = (ctx: CanvasRenderingContext2D, w: number, h: number, yOf: (v: number) => number, opts: WaveOptions): void => {
  const layer = opts.layers[opts.markerLayer ?? opts.layers.length - 1];
  if (opts.marker === undefined || !layer) return;
  const x = Math.round(xOf(opts.marker, layer.values.length, w)) + 0.5;
  ctx.strokeStyle = opts.markerColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, h);
  ctx.stroke();
  const y = yOf(layer.values[opts.marker]);
  ctx.fillStyle = layer.color;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = opts.gridColor;
  ctx.stroke();
};

/** Dibuja una o varias ondas de V en un lienzo, con la muestra marcada. */
export const drawWave = (canvas: HTMLCanvasElement, opts: WaveOptions): void => {
  const fit = fitCanvas(canvas);
  if (!fit) return;
  const { ctx, w, h } = fit;
  const yOf = (v: number): number => h / 2 - (v / opts.yMax) * (h / 2 - PADDING_Y);
  drawGrid(ctx, w, yOf, opts);
  opts.layers.forEach((layer) => drawLayer(ctx, w, yOf, layer));
  drawMarker(ctx, w, h, yOf, opts);
};

/** Convierte una posición horizontal del puntero en un índice de muestra 0…count−1. */
export const sampleFromPointer = (canvas: HTMLCanvasElement, clientX: number, count: number): number => {
  const rect = canvas.getBoundingClientRect();
  const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.round(t * (count - 1));
};
