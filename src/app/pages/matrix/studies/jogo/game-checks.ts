/** Cenários fixos do painel; a suíte Vitest testa todas as combinações separadamente. */
import { runStudyChecks, StudyCheck } from '../shared/study-checks';
import { playClassic, playGameSteps } from './kalika-game';

export function runGameChecks(): readonly StudyCheck[] {
  const result = (player: string, opponent: string) =>
    playGameSteps(player, opponent, 'rulesExtended').at(-1)!.state.result;
  return runStudyChecks([
    {
      key: 'matrix.studies.jogo.checks.tie',
      expected: 'tie',
      run: () => playClassic('rock', 'rock'),
    },
    {
      key: 'matrix.studies.jogo.checks.win',
      expected: 'win',
      run: () => playClassic('paper', 'rock'),
    },
    {
      key: 'matrix.studies.jogo.checks.lose',
      expected: 'lose',
      run: () => playClassic('paper', 'scissors'),
    },
    {
      key: 'matrix.studies.jogo.checks.invalid',
      expected: 'invalid',
      run: () => playClassic('banana', 'rock'),
    },
    {
      key: 'matrix.studies.jogo.checks.extension',
      expected: 'win',
      run: () => result('lizard', 'spock'),
    },
    {
      key: 'matrix.studies.jogo.checks.compatible',
      expected: 'win',
      run: () => result('rock', 'scissors'),
    },
  ]);
}
