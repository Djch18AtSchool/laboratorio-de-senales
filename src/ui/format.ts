const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
const SUPERSCRIPTS: Record<string, string> = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

/** Por debajo de esto un número mostrado se considera cero dentro del redondeo. */
export const ZERO_DISPLAY = 1e-9;
const MINUS = '−';

export const sub = (n: number): string => String(n).split('').map((d) => SUBSCRIPTS[Number(d)]).join('');

/** Nombre de canal por posición: s₁, s₂, … */
export const channelName = (index: number): string => `s${sub(index + 1)}`;

/** Número con signo tipográfico y sin “−0.000”. */
export const fmt = (x: number, digits = 3): string => {
  const s = x.toFixed(digits);
  return Number(s) === 0 ? (0).toFixed(digits) : s.replace('-', MINUS);
};

/** Notación científica legible: 2.1 × 10⁻¹⁵. */
export const sci = (x: number, digits = 1): string => {
  if (x === 0) return '0';
  const [mant, exp] = x.toExponential(digits).split('e');
  const e = String(Number(exp)).split('').map((c) => SUPERSCRIPTS[c] ?? c).join('');
  return `${mant.replace('-', MINUS)} × 10${e}`;
};

/** Un valor que debería ser cero: “0” y, si no lo es exactamente, su tamaño de redondeo. */
export const fmtNearZero = (x: number, digits = 3): { text: string; detail: string | null } => {
  if (Math.abs(x) >= ZERO_DISPLAY) return { text: fmt(x, digits), detail: null };
  return { text: '0', detail: x === 0 ? 'exacto' : `≈ ${sci(x)}, redondeo` };
};

export const fmtHz = (hz: number): string => `${hz.toLocaleString('es-CR')} Hz`;

/** Lista en español: “s₁, s₂ y s₃”. */
export const joinEs = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
