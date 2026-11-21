export interface ValueRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** Ángulos a los que se imanta el dial de fase, y a cuántos grados empieza a atraer. */
const SNAP_ANGLES = [0, 90, 180, 270, 360] as const;
const SNAP_WIDTH_DEG = 3;
const FULL_TURN = 360;

const decimalsOf = (step: number): number => (String(step).split('.')[1] ?? '').length;

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** Ajusta al paso y al rango, sin errores de coma flotante (0.1 + 0.2 → 0.3). */
export const snapToRange = (v: number, r: ValueRange): number => {
  const stepped = Math.round((v - r.min) / r.step) * r.step + r.min;
  return Number(clamp(stepped, r.min, r.max).toFixed(decimalsOf(r.step))) + 0;
};

/** Fracción 0…1 del recorrido (0 abajo o a la izquierda) → valor. */
export const valueFromFraction = (f: number, r: ValueRange): number => snapToRange(r.min + clamp(f, 0, 1) * (r.max - r.min), r);

export const fractionFromValue = (v: number, r: ValueRange): number => (clamp(v, r.min, r.max) - r.min) / (r.max - r.min);

/** Retén: cerca del centro el control cae justo en él. */
export const applyDetent = (v: number, center: number, width: number): number => (Math.abs(v - center) < width ? center : v);

/** Ángulo del punto (dx, dy) respecto al centro: 0° arriba y sentido horario, en [0, 360). */
export const angleFromPoint = (dx: number, dy: number): number => {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + FULL_TURN) % FULL_TURN;
};

/** Grados enteros, imantados a 0°, 90°, 180° y 270°. */
export const snapAngle = (deg: number): number => {
  const near = SNAP_ANGLES.find((a) => Math.abs(deg - a) <= SNAP_WIDTH_DEG);
  const value = near ?? Math.round(deg);
  return value % FULL_TURN;
};

/** Nuevo valor para una tecla de un control deslizante, o null si la tecla no aplica. */
export const keyboardValue = (key: string, v: number, r: ValueRange, bigStep: number): number | null => {
  const moves: Record<string, () => number> = {
    ArrowUp: () => v + r.step,
    ArrowRight: () => v + r.step,
    ArrowDown: () => v - r.step,
    ArrowLeft: () => v - r.step,
    PageUp: () => v + bigStep,
    PageDown: () => v - bigStep,
    Home: () => r.min,
    End: () => r.max,
  };
  const move = moves[key];
  return move ? snapToRange(move(), r) : null;
};
