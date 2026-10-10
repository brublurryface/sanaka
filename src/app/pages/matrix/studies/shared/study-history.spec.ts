// Testamos navegação e ramificação do histórico sem navegador ou requisições.
import { describe, expect, it } from 'vitest';
import { StudyHistory, StudyStep } from './study-history';

const step = (state: number): StudyStep<number> => ({
  state,
  explanationKey: 'step',
  parameters: { state },
});

describe('StudyHistory', () => {
  it('starts with a readable first snapshot and disabled navigation', () => {
    const history = new StudyHistory(step(0));
    expect(history.state()).toBe(0);
    expect(history.before()).toBe(0);
    expect(history.length()).toBe(1);
    expect(history.canGoBack()).toBe(false);
    expect(history.canGoForward()).toBe(false);
  });

  it('moves one step at a time and stays inside the sequence', () => {
    const history = new StudyHistory(step(0));
    history.replace([step(0), step(1), step(2)]);
    history.previous();
    expect(history.index()).toBe(0);
    history.next();
    expect(history.state()).toBe(1);
    expect(history.before()).toBe(0);
    history.finish();
    history.next();
    expect(history.state()).toBe(2);
    history.previous();
    expect(history.canGoForward()).toBe(true);
  });

  it('discards the old future after an action at an earlier snapshot', () => {
    const history = new StudyHistory(step(0));
    history.record(step(1));
    history.record(step(2));
    history.previous();
    history.record(step(7));
    expect(history.length()).toBe(3);
    expect(history.before()).toBe(1);
    expect(history.state()).toBe(7);
  });

  it('caps retained snapshots without losing the current one', () => {
    const history = new StudyHistory(step(0));
    for (let index = 1; index <= 120; index += 1) {
      history.record(step(index));
    }
    expect(history.length()).toBe(100);
    expect(history.state()).toBe(120);
    expect(history.index()).toBe(99);
  });

  it('rejects an empty sequence and preserves its existing state', () => {
    const history = new StudyHistory(step(3));
    expect(() => history.replace([])).toThrow('estado inicial');
    expect(history.state()).toBe(3);
  });
});
