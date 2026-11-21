import { describe, test, expect } from 'vitest';
import { fmt, sci, fmtNearZero, channelName, joinEs } from './format';

describe('formato de números', () => {
  test('usa el signo menos tipográfico y evita −0', () => {
    expect(fmt(-0.5)).toBe('−0.500');
    expect(fmt(-0.0001)).toBe('0.000');
  });
  test('notación científica con superíndices', () => {
    expect(sci(2.1e-15)).toBe('2.1 × 10⁻¹⁵');
  });
  test('valores que deben ser cero', () => {
    expect(fmtNearZero(0)).toEqual({ text: '0', detail: 'exacto' });
    expect(fmtNearZero(3e-16).text).toBe('0');
    expect(fmtNearZero(0.25).text).toBe('0.250');
  });
  test('nombres y listas', () => {
    expect(channelName(0)).toBe('s₁');
    expect(channelName(11)).toBe('s₁₂');
    expect(joinEs(['a', 'b', 'c'])).toBe('a, b y c');
  });
});
