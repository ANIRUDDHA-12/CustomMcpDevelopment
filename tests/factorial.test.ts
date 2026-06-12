import { describe, expect, it } from '@vitest/vitest';
import { factorial } from './factorial';

describe('factorial', () => {
  it('computes the factorial', () => {
    expect(factorial(5)).toBe(120);
  });
  it('throws on negative numbers', () => {
    expect(() => factorial(-1)).toThrowError('Factorial is not defined for negative numbers');
  });
});