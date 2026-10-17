// Estes testes verificam o executor de cenários fixos, não um interpretador de código.
import { describe, expect, it } from 'vitest';
import { runStudyChecks } from './study-checks';

describe('runStudyChecks', () => {
  it('compares the actual result with the declared expectation', () => {
    const result = runStudyChecks([
      { key: 'equal', expected: [1, 2], run: () => [1, 2] },
      { key: 'different', expected: 0, run: () => 1 },
      { key: 'missing', expected: undefined, run: () => undefined },
    ]);
    expect(result.map((item) => item.passed)).toEqual([true, false, true]);
  });

  it('reports thrown Errors and non-Error failures without aborting the other checks', () => {
    const result = runStudyChecks([
      {
        key: 'error',
        expected: 0,
        run: () => {
          throw new Error('falha');
        },
      },
      {
        key: 'unknown',
        expected: 0,
        run: () => {
          throw 'falha sem Error';
        },
      },
      { key: 'last', expected: 4, run: () => 2 + 2 },
    ]);
    expect(result[0].actual).toBe('falha');
    expect(result[1].actual).toBe('falha sem Error');
    expect(result[2].passed).toBe(true);
  });
});
