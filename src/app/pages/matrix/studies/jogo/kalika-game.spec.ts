/** Testes de todas as combinações, extensão e isolamento da configuração. */
import { describe, expect, it } from 'vitest';
import {
  CLASSIC_MOVES,
  createRuleGame,
  DominanceRule,
  EXTENDED_MOVES,
  Move,
  playClassic,
  playGameSteps,
  RoundRule,
  RuleGame,
  TieRule,
} from './kalika-game';
import { runGameChecks } from './game-checks';

// Oráculo explícito nos testes: não chamamos a função testada para calcular sua expectativa.
const victories: Record<Move, readonly Move[]> = {
  rock: ['scissors', 'lizard'],
  paper: ['rock', 'spock'],
  scissors: ['paper', 'lizard'],
  lizard: ['paper', 'spock'],
  spock: ['rock', 'scissors'],
};
const combinations = EXTENDED_MOVES.flatMap((player) =>
  EXTENDED_MOVES.map((opponent) => ({ player, opponent })),
);

describe('Kalika game', () => {
  it.each(combinations)('evaluates extended $player × $opponent', ({ player, opponent }) => {
    const expected =
      player === opponent ? 'tie' : victories[player].includes(opponent) ? 'win' : 'lose';
    expect(createRuleGame(true).steps(player, opponent, 'rulesExtended').at(-1)!.state.result).toBe(
      expected,
    );
  });
  it.each(
    CLASSIC_MOVES.flatMap((player) => CLASSIC_MOVES.map((opponent) => ({ player, opponent }))),
  )('preserves both classic implementations for $player × $opponent', ({ player, opponent }) => {
    const expected =
      player === opponent ? 'tie' : victories[player].includes(opponent) ? 'win' : 'lose';
    expect(playClassic(player, opponent)).toBe(expected);
    expect(playGameSteps(player, opponent, 'rulesClassic').at(-1)!.state.result).toBe(expected);
    expect(playGameSteps(player, opponent, 'conditions').at(-1)!.state.result).toBe(expected);
  });
  it.each(['', 'banana', 'ROCK', 'lizard', 'spock'])(
    'rejects classic input %s on either side',
    (invalid) => {
      expect(playClassic(invalid, 'rock')).toBe('invalid');
      expect(playClassic('rock', invalid)).toBe('invalid');
      expect(playGameSteps('rock', invalid, 'rulesClassic').at(-1)!.state.result).toBe('invalid');
      expect(playGameSteps(invalid, 'rock', 'rulesClassic').at(-1)!.state.result).toBe('invalid');
    },
  );
  it('inspects tie then dominance and stops after a decision', () => {
    const win = playGameSteps('rock', 'scissors', 'rulesClassic');
    expect(win.map((step) => step.state.result)).toEqual([null, null, null, 'win']);
    expect(win.at(-1)!.state.inspectedRules).toEqual(['tie', 'dominance']);
    const tie = playGameSteps('spock', 'spock', 'rulesExtended');
    expect(tie.at(-1)!.state.inspectedRules).toEqual(['tie']);
  });
  it('does not mistake an unhandled policy for a loss', () => {
    const incomplete = new RuleGame(CLASSIC_MOVES, [new TieRule()]);
    expect(incomplete.steps('rock', 'paper', 'rulesClassic').at(-1)!.state.result).toBe('invalid');
    expect(new DominanceRule([]).evaluate('rock', 'paper')).toBeNull();
  });
  it('accepts another compatible policy without changing the engine', () => {
    const alternative: RoundRule = { id: 'always-tie', evaluate: () => 'tie' };
    expect(
      new RuleGame(CLASSIC_MOVES, [alternative]).steps('rock', 'scissors', 'rulesClassic').at(-1)!
        .state.result,
    ).toBe('tie');
  });
  it('copies configuration so outside mutation cannot alter its rules', () => {
    const targets: Move[] = ['scissors'];
    const dominance = new DominanceRule([['rock', targets]]);
    targets.length = 0;
    expect(dominance.evaluate('rock', 'scissors')).toBe('win');
    const rules: RoundRule[] = [new TieRule(), dominance];
    const moves: Move[] = [...CLASSIC_MOVES];
    const engine = new RuleGame(moves, rules);
    rules.length = 0;
    moves.length = 0;
    expect(engine.steps('rock', 'scissors', 'rulesClassic').at(-1)!.state.result).toBe('win');
  });
  it('runs fixed browser checks successfully', () => {
    expect(runGameChecks().every((check) => check.passed)).toBe(true);
  });
});
