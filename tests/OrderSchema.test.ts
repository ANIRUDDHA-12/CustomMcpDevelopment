import { describe, expect, it } from '@vitest/vitest';
import { OrderSchema } from './OrderSchema';
describe('OrderSchema', () => {
  it('should parse valid data', () => {
    const validData = {
      status: 'pending',
      customerId: '123',
    };
    const result = OrderSchema.parse(validData);
    expect(result).toEqual(validData);
  });
  it('should throw on invalid data', () => {
    const invalidData = {
      status: 'invalid-status',
      customerId: '123',
    };
    expect(() => OrderSchema.parse(invalidData)).toThrow();
  });
});