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
      expect(lab.history.index()).toBe(1);
      expect(lab.history.canGoForward()).toBe(true);
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
  it('completes each guided activity from its actual action', () => {
    const lab = new ObolosLab();
    expect(lab.lessonComplete()).toBe(false);
    lab.lookup();
    expect(lab.lessonComplete()).toBe(true);
    lab.changeLesson(1);
    expect(lab.lessonComplete()).toBe(false);
    lab.add();
    expect(lab.lessonComplete()).toBe(true);
    const inventory = lab.items();
    lab.changeLesson(2);
    expect(lab.items()).toEqual(inventory);
    lab.execute('set');
    expect(lab.lessonComplete()).toBe(false);
    lab.history.finish();
    expect(lab.lessonComplete()).toBe(true);
    lab.changeLesson(3);
    lab.count();
    expect(lab.lessonComplete()).toBe(true);
    expect(lab.stepSource()!.text).toContain('countObolos');
  });
  it('handles a missing lookup and an empty search without trapping the next step', () => {
    const lab = new ObolosLab();
    lab.requestedIndex.set(100);
    lab.lookup();
    expect(lab.history.current().explanationKey).toContain('missing');
    expect(lab.lessonComplete()).toBe(true);
    lab.changeLesson(2);
    lab.scenario('empty');
    lab.execute('set');
    expect(lab.lessonComplete()).toBe(true);
    lab.changeLesson(-1);
    expect(lab.lessonIndex()).toBe(2);
  });
});
