/** A página deve coordenar os modos sem misturar retirada com confirmação. */
import { describe, expect, it } from 'vitest';
import { EntregasLab } from './entregas-lab';

describe('EntregasLab actions', () => {
  it('completes removal immediately only in structure mode', () => {
    const lab = new EntregasLab();
    lab.process();
    expect(lab.history.state().processing).toBeNull();
    expect(lab.history.state().delivered).toHaveLength(1);
    expect(lab.history.length()).toBe(3);
    lab.history.previous();
    expect(lab.history.state().processing?.label).toBe('volume-01');
    lab.history.next();
    expect(lab.history.state().processing).toBeNull();
  });
  it('separates processing, arrival, failure, retry and acknowledgement', () => {
    const lab = new EntregasLab();
    lab.changeMode('messaging');
    lab.process();
    expect(lab.history.state().processing?.label).toBe('volume-01');
    lab.draft.set('volume-04');
    lab.enqueue();
    expect(lab.waiting()).toHaveLength(3);
    lab.fail();
    expect(lab.waiting().at(-1)?.label).toBe('volume-01');
    lab.process();
    lab.confirm();
    expect(lab.history.state().delivered[0].label).toBe('volume-02');
    lab.runChecks();
    expect(lab.checks().every((item) => item.passed)).toBe(true);
  });
  it('restarts when changing discipline or mode', () => {
    const lab = new EntregasLab();
    lab.restart('stack');
    lab.process();
    expect(lab.history.state().delivered[0].label).toBe('volume-03');
    lab.changeMode('messaging');
    expect(lab.history.state().discipline).toBe('stack');
    expect(lab.history.length()).toBe(1);
    expect(lab.history.state().delivered).toEqual([]);
    expect(lab.comparison().fifo).toEqual(['volume-01', 'volume-02', 'volume-03']);
    expect(lab.comparison().lifo).toEqual(['volume-03', 'volume-02', 'volume-01']);
  });
  it('leaves an exhausted structure empty without creating an acknowledgement', () => {
    const lab = new EntregasLab();
    for (let count = 0; count < 4; count += 1) {
      lab.process();
    }
    expect(lab.waiting()).toEqual([]);
    expect(lab.history.state().delivered).toHaveLength(3);
  });
});
