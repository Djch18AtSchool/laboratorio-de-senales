import { describe, test, expect } from 'vitest';
import { valueFromFraction, fractionFromValue, applyDetent, angleFromPoint, snapAngle, keyboardValue } from './scale';

const AMP = { min: -1, max: 1, step: 0.01 };

describe('escala de controles', () => {
  test('fracción ↔ valor, con paso y límites', () => {
    expect(valueFromFraction(0.5, AMP)).toBe(0);
    expect(valueFromFraction(1, AMP)).toBe(1);
    expect(valueFromFraction(1.4, AMP)).toBe(1);
    expect(valueFromFraction(0.9001, AMP)).toBe(0.8);
    expect(fractionFromValue(-1, AMP)).toBe(0);
    expect(fractionFromValue(0.5, AMP)).toBe(0.75);
  });

  test('retén en el centro', () => {
    expect(applyDetent(0.015, 0, 0.02)).toBe(0);
    expect(applyDetent(0.05, 0, 0.02)).toBe(0.05);
  });

  test('ángulo desde el centro: 0° arriba, sentido horario', () => {
    expect(angleFromPoint(0, -10)).toBeCloseTo(0, 9);
    expect(angleFromPoint(10, 0)).toBeCloseTo(90, 9);
    expect(angleFromPoint(0, 10)).toBeCloseTo(180, 9);
    expect(angleFromPoint(-10, 0)).toBeCloseTo(270, 9);
  });

  test('el dial de fase se imanta a 0°, 90°, 180° y 270°', () => {
    expect(snapAngle(88.4)).toBe(90);
    expect(snapAngle(357.5)).toBe(0);
    expect(snapAngle(61.6)).toBe(62);
    expect(snapAngle(359.6)).toBe(0);
  });

  test('teclado: flechas, página, inicio y fin', () => {
    expect(keyboardValue('ArrowUp', 0.5, AMP, 0.1)).toBe(0.51);
    expect(keyboardValue('ArrowLeft', -1, AMP, 0.1)).toBe(-1);
    expect(keyboardValue('PageDown', 0, AMP, 0.1)).toBe(-0.1);
    expect(keyboardValue('Home', 0.3, AMP, 0.1)).toBe(-1);
    expect(keyboardValue('End', 0.3, AMP, 0.1)).toBe(1);
    expect(keyboardValue('a', 0.3, AMP, 0.1)).toBeNull();
  });
});
