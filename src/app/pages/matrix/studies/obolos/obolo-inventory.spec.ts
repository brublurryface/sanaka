/** Testes do domínio: entradas pequenas tornam contagens e transições verificáveis à mão. */
import { describe, expect, it } from 'vitest';
import {
  addObolo,
  countObolos,
  INVENTORY_LIMIT,
  inventoryReport,
  inventoryState,
  nestedDuplicateSteps,
  readObolo,
  removeObolo,
  setDuplicateSteps,
  traversalSteps,
} from './obolo-inventory';
import { runOboloChecks } from './obolo-checks';

describe('Obolo inventory', () => {
  // Índice zero é uma posição real, não um valor falsy que deva ser rejeitado.
  it('reads both boundary indices', () => {
    expect(readObolo(['maya', 'mors'], 0)).toBe('maya');
    expect(readObolo(['maya', 'mors'], 1)).toBe('mors');
  });
  it.each([-1, 2, 0.5, NaN, Infinity])('rejects invalid index %s', (index) => {
    expect(readObolo(['maya', 'mors'], index)).toBeUndefined();
  });
  it('returns undefined for an empty inventory', () => {
    expect(readObolo([], 0)).toBeUndefined();
  });

  it('adds a trimmed identifier without mutating the original', () => {
    const original = Object.freeze(['mors']);
    expect(addObolo(original, ' maya ')).toEqual(['mors', 'maya']);
    expect(original).toEqual(['mors']);
  });
  it('preserves the original for empty input and a full inventory', () => {
    const original = ['mors'];
    const full = Array.from({ length: INVENTORY_LIMIT }, () => 'mors');
    expect(addObolo(original, '  ')).toBe(original);
    expect(addObolo(full, 'maya')).toBe(full);
  });
  it('removes only the requested position and shifts the following indices', () => {
    const original = Object.freeze(['maya', 'mors', 'maya']);
    expect(removeObolo(original, 0)).toEqual(['mors', 'maya']);
    expect(removeObolo(original, 1)).toEqual(['maya', 'maya']);
    expect(removeObolo(original, 8)).toBe(original);
  });
  it('creates a linear visit sequence and a valid empty sequence', () => {
    const steps = traversalSteps(['mors', 'maya']);
    expect(steps.map((item) => item.state.activeIndex)).toEqual([null, 0, 1]);
    expect(steps[2].parameters).toEqual({ identifier: 'maya', index: 1 });
    expect(traversalSteps([])).toHaveLength(1);
    const input = ['mors'];
    expect(inventoryState(input).items).not.toBe(input);
  });

  // A expectativa n(n-1)/2 confere a contagem real do loop, não mede milissegundos.
  it.each([0, 1, 2, 4, 7])('counts comparisons and lookups for %s identifiers', (size) => {
    const items = Array.from({ length: size }, (_, index) => String(index));
    // Para n=0, a fórmula JS produz -0; a contagem do programa é o zero positivo.
    expect(inventoryReport(nestedDuplicateSteps(items)).comparisons).toBe(
      Math.max(0, (size * (size - 1)) / 2),
    );
    expect(inventoryReport(setDuplicateSteps(items)).lookups).toBe(size);
  });
  it.each([
    { input: [] },
    { input: ['mors'] },
    { input: ['mors', 'mors'] },
    { input: ['maya', 'maya', 'maya'] },
    { input: ['mors', 'maya', 'maya', 'mors'] },
    { input: ['maya', 'mors', 'akasha'] },
  ])('both algorithms agree for $input and preserve the input', ({ input }) => {
    const original = Object.freeze([...input]);
    const nested = nestedDuplicateSteps(original);
    const set = setDuplicateSteps(original);
    expect(inventoryReport(nested).duplicates).toEqual(inventoryReport(set).duplicates);
    expect(original).toEqual(input);
    expect(nested[0].state.duplicates).toEqual([]);
    expect(set[0].state.seen).toEqual([]);
  });
  it('associates each identifier with its quantity using Map', () => {
    expect([...countObolos(['mors', 'maya', 'mors']).entries()]).toEqual([
      ['mors', 2],
      ['maya', 1],
    ]);
    expect(countObolos([]).size).toBe(0);
    expect(countObolos(['mors']).get('akasha')).toBeUndefined();
  });
  it('runs all browser demonstration checks successfully', () => {
    expect(runOboloChecks()).toHaveLength(7);
    expect(runOboloChecks().every((check) => check.passed)).toBe(true);
  });
});
