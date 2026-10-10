/** A página coordena entradas e histórico sem reimplementar as regras de vitória. */
import { describe, expect, it } from 'vitest';
import { JogoLab } from './jogo-lab';

describe('JogoLab', () => {
  it('evaluates then supports inspection and restart', () => {
    const page = new JogoLab();
    page.play();
    expect(page.history.state().result).toBeNull();
    page.history.finish();
    expect(page.history.state().result).toBe('win');
    page.restart();
    expect(page.history.length()).toBe(1);
  });
  it('adds moves only in the extended design', () => {
    const page = new JogoLab();
    page.changeVariant('rulesExtended');
    expect(page.moves()).toHaveLength(5);
    page.player.set('lizard');
    page.opponent.set('spock');
    expect(page.comparison()).toEqual({ conditions: 'invalid', rules: 'invalid' });
    page.play();
    page.history.finish();
    expect(page.history.state().result).toBe('win');
    page.changeVariant('rulesClassic');
    expect(page.moves()).toHaveLength(3);
    expect(page.player()).toBe('rock');
    page.runChecks();
    expect(page.checks().every((check) => check.passed)).toBe(true);
  });
  it.each(['tie', 'win', 'lose', 'invalid'] as const)('runs scenario %s', (kind) => {
    const page = new JogoLab();
    page.scenario(kind);
    page.history.finish();
    expect(page.history.state().result).toBe(kind);
  });
});
