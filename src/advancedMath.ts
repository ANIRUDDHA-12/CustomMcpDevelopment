import _ from 'lodash';
export function chunkNumbers(numbers: number[]): number[][] {
  return _.chunk(numbers, 2);
}