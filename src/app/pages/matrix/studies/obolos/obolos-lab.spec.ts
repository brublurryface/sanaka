/** Testamos as ações da página sem duplicar os algoritmos do inventário. */
import { describe, expect, it } from 'vitest';
import { ObolosLab } from './obolos-lab';

describe('ObolosLab actions', () => {
  it('adds, removes and exposes Map quantities from the same state', () => {
    const lab = new ObolosLab();
    lab.scenario('empty');
    lab.draft.set('mors');
    lab.add();
    expect(lab.items()).toEqual(['mors']);
    expect(lab.requestedItem()).toBe('mors');
    expect(lab.quantities()).toEqual([['mors', 1]]);
    lab.remove();
    expect(lab.items()).toEqual([]);
  });
  it('keeps errors explicit instead of mutating invalid input', () => {
    const lab = new ObolosLab();
    lab.draft.set(' ');
    lab.add();
    expect(lab.messageKey()).toBe('emptyInput');
    lab.requestedIndex.set(-1);
    lab.remove();
    expect(lab.messageKey()).toBe('invalidIndex');
    lab.scenario('empty');
    for (let count = 0; count <= lab.limit; count += 1) {
      lab.draft.set('mors');
      lab.add();
    }
    expect(lab.messageKey()).toBe('limit');
    expect(lab.items()).toHaveLength(lab.limit);
  });
  it.each(['initial', 'empty', 'equal', 'unique'] as const)(
    'restarts deterministically with %s',
    (kind) => {
      const lab = new ObolosLab();
      lab.requestedIndex.set(8);
      lab.scenario(kind);
      expect(lab.history.index()).toBe(0);
      expect(lab.history.length()).toBe(1);
      expect(lab.requestedIndex()).toBe(0);
    },
  );
  it.each(['traverse', 'nested', 'set'] as const)(
    'executes and inspects %s without waiting',
    (kind) => {
      const lab = new ObolosLab();
      lab.execute(kind);
      expect(lab.history.index()).toBe(0);
      expect(lab.history.canGoForward()).toBe(true);
      lab.history.next();
      expect(lab.history.state().activeIndex).toBe(0);
      lab.history.finish();
      if (kind !== 'traverse') {
        expect(lab.history.state().duplicates).toEqual(['maya', 'mors']);
      }
      expect(lab.nestedReport().duplicates).toEqual(lab.setReport().duplicates);
      lab.runChecks();
      expect(lab.checks().every((check) => check.passed)).toBe(true);
    },
  );
});
