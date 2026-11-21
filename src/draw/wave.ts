export interface WaveLayer {
  readonly values: ArrayLike<number>;
  readonly color: string;
  readonly width?: number;
  readonly alpha?: number;
  /** Resplandor suave, como el trazo de un osciloscopio. */
  readonly glow?: boolean;
}

export interface WaveOptions {
  readonly layers: readonly WaveLayer[];
  /** La escala vertical va de −yMax a yMax. */
  readonly yMax: number;
  readonly marker?: number;
  readonly markerColor: string;
  readonly gridColor: string;
  readonly labelColor?: string;
  /** Divisiones verticales de la retícula (10 → una por milisegundo). */
  readonly divisions?: number;
  /** Líneas horizontales en cada entero entre −yMax y yMax, con etiquetas. */
  readonly showScale?: boolean;
  /** Etiquetas de tiempo bajo las divisiones (p. ej. «ms»). */
  readonly timeUnit?: string;
  /** Capa que recibe el punto en la muestra marcada (por defecto la última). */
  readonly markerLayer?: number;
  /** Color del aro del punto marcado (el fondo del lienzo). */
  readonly dotRing?: string;
  /** Márgenes verticales para que la onda no pase bajo textos superpuestos. */
  readonly padTop?: number;
  readonly padBottom?: number;
}

const PADDING_Y = 8;
const LABEL_FONT = '10.5px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const GLOW_BLUR = 10;
const MAX_INTEGER_LINES = 8;

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
const crisp = (v: number): number => Math.round(v) + 0.5;

const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, yOf: (v: number) => number, opts: WaveOptions): void => {
  ctx.lineWidth = 1;
  ctx.strokeStyle = opts.gridColor;
  const divisions = opts.divisions ?? 0;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  for (let i = 1; i < divisions; i++) {
    const x = crisp((i / divisions) * w);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  if (opts.showScale && opts.yMax <= MAX_INTEGER_LINES) {
    for (let v = 1; v <= opts.yMax; v++) {
      for (const s of [v, -v]) {
        ctx.moveTo(0, crisp(yOf(s)));
        ctx.lineTo(w, crisp(yOf(s)));
      }
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(0, crisp(yOf(0)));
  ctx.lineTo(w, crisp(yOf(0)));
  ctx.stroke();
  drawLabels(ctx, w, h, yOf, opts);
};

const drawLabels = (ctx: CanvasRenderingContext2D, w: number, h: number, yOf: (v: number) => number, opts: WaveOptions): void => {
  if (!opts.labelColor) return;
  ctx.fillStyle = opts.labelColor;
  ctx.font = LABEL_FONT;
  if (opts.showScale) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${opts.yMax}`, w - 6, yOf(opts.yMax) + 8);
    ctx.fillText('0', w - 6, yOf(0) - 8);
    ctx.fillText(`−${opts.yMax}`, w - 6, yOf(-opts.yMax) - 8);
  }
  const divisions = opts.divisions ?? 0;
  if (opts.timeUnit && divisions > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 1; i < divisions; i += 1) {
      if (i % 2 === 1) continue;
      ctx.fillText(`${i}`, (i / divisions) * w, h - 4);
    }
    ctx.textAlign = 'left';
    ctx.fillText(`0 ${opts.timeUnit}`, 6, h - 4);
  }
};

const drawLayer = (ctx: CanvasRenderingContext2D, w: number, yOf: (v: number) => number, layer: WaveLayer): void => {
  const n = layer.values.length;
  ctx.globalAlpha = layer.alpha ?? 1;
  ctx.strokeStyle = layer.color;
  ctx.lineWidth = layer.width ?? 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (layer.glow) {
    ctx.shadowColor = layer.color;
    ctx.shadowBlur = GLOW_BLUR;
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xOf(i, n, w);
    const y = yOf(layer.values[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
};

const drawMarker = (ctx: CanvasRenderingContext2D, w: number, h: number, yOf: (v: number) => number, opts: WaveOptions): void => {
  const layer = opts.layers[opts.markerLayer ?? opts.layers.length - 1];
  if (opts.marker === undefined || !layer) return;
  const x = crisp(xOf(opts.marker, layer.values.length, w));
  ctx.strokeStyle = opts.markerColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, h);
  ctx.stroke();
  ctx.setLineDash([]);
  const y = yOf(layer.values[opts.marker]);
  ctx.fillStyle = layer.color;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = opts.dotRing ?? opts.gridColor;
  ctx.stroke();
};

/** Dibuja una o varias ondas de V en un lienzo, con la muestra marcada. */
export const drawWave = (canvas: HTMLCanvasElement, opts: WaveOptions): void => {
  const fit = fitCanvas(canvas);
  if (!fit) return;
  const { ctx, w, h } = fit;
  const top = opts.padTop ?? PADDING_Y;
  const bottom = opts.padBottom ?? PADDING_Y;
  const yOf = (v: number): number => top + ((opts.yMax - v) / (2 * opts.yMax)) * (h - top - bottom);
  drawGrid(ctx, w, h, yOf, opts);
  opts.layers.forEach((layer) => drawLayer(ctx, w, yOf, layer));
  drawMarker(ctx, w, h, yOf, opts);
};

/** Convierte una posición horizontal del puntero en un índice de muestra 0…count−1. */
export const sampleFromPointer = (canvas: HTMLCanvasElement, clientX: number, count: number): number => {
  const rect = canvas.getBoundingClientRect();
  const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.round(t * (count - 1));
};
