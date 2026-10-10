/**
 * Página de Kālikā. Signals guardam escolhas, computed deriva as jogadas permitidas.
 * O template envia eventos; a lógica pura/classe de domínio decide cada resultado.
 */
import { Component, computed, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatrixStudyFrame } from '../shared/matrix-study-frame';
import { MatrixStudyDefinition } from '../shared/matrix-study-definition';
import { StudyCheck } from '../shared/study-checks';
import { StudyHistory } from '../shared/study-history';
import { StudyStepViewer } from '../shared/study-step-viewer';
import { runGameChecks } from './game-checks';
import {
  CLASSIC_MOVES,
  EXTENDED_MOVES,
  GameVariant,
  playClassic,
  playGameSteps,
} from './kalika-game';
import { GAME_SOURCES } from './jogo-source.generated';

@Component({
  selector: 'app-jogo-lab',
  host: { class: 'matrix-study-host' },
  imports: [MatrixStudyFrame, StudyStepViewer, TranslocoPipe],
  templateUrl: './jogo-lab.html',
})
export class JogoLab {
  readonly study: MatrixStudyDefinition = {
    id: 'jogo',
    topics: ['conditions', 'composition', 'extension'],
    investigations: ['invalid', 'tie', 'newRule', 'cost'],
  };
  readonly sources = GAME_SOURCES;
  readonly variants: readonly GameVariant[] = ['conditions', 'rulesClassic', 'rulesExtended'];
  readonly scenarios = ['tie', 'win', 'lose', 'invalid'] as const;
  readonly variant = signal<GameVariant>('conditions');
  // Strings são entradas de formulário. Somente o domínio pode aceitá-las como Move.
  readonly player = signal('rock');
  readonly opponent = signal('scissors');
  readonly moves = computed(() =>
    this.variant() === 'rulesExtended' ? EXTENDED_MOVES : CLASSIC_MOVES,
  );
  readonly checks = signal<readonly StudyCheck[]>([]);
  readonly history = new StudyHistory(playGameSteps('rock', 'scissors', 'conditions')[0]);

  // A comparação clássica aceita exatamente as mesmas entradas nos dois desenhos.
  readonly comparison = computed(() => ({
    conditions: playClassic(this.player(), this.opponent()),
    rules: playGameSteps(this.player(), this.opponent(), 'rulesClassic').at(-1)!.state.result,
  }));

  changeVariant(variant: GameVariant): void {
    // set substitui o valor guardado; readonly na propriedade não proíbe essa operação.
    this.variant.set(variant);
    this.player.set('rock');
    this.opponent.set('scissors');
    this.restart();
  }

  /** replace coloca o cursor no início. Avançar revela a decisão real, regra por regra. */
  play(): void {
    this.history.replace(playGameSteps(this.player(), this.opponent(), this.variant()));
  }

  restart(): void {
    this.history.replace([playGameSteps(this.player(), this.opponent(), this.variant())[0]]);
  }

  scenario(kind: 'tie' | 'win' | 'lose' | 'invalid'): void {
    this.player.set(kind === 'invalid' ? 'banana' : 'rock');
    this.opponent.set(kind === 'tie' ? 'rock' : kind === 'lose' ? 'paper' : 'scissors');
    this.play();
  }

  runChecks(): void {
    this.checks.set(runGameChecks());
  }
}
