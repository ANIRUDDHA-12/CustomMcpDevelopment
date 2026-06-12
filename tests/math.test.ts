import { describe, it, expect } from 'vitest';
import { factorial } from '../src/math';

describe('math', () => {
  describe('factorial', () => {
    it('should calculate the factorial of 0', () => {
      expect(factorial(0)).toBe(1);
    });

    it('should calculate the factorial of 1', () => {
      expect(factorial(1)).toBe(1);
    });

    it('should calculate the factorial of 5', () => {
      expect(factorial(5)).toBe(120);
    });
  });
});