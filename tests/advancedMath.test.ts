import { describe, it, expect } from 'vitest';
import { chunkNumbers } from '../src/advancedMath';
describe('chunkNumbers', () => {
  it('should split an array of numbers into pairs', () => {
    const numbers = [1, 2, 3, 4, 5];
    const result = chunkNumbers(numbers);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });
});