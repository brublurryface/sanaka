/**
 * Página de Kālikā. Signals guardam escolhas, computed deriva as jogadas permitidas.
 * O template envia eventos; a lógica pura/classe de domínio decide cada resultado.
 */
import { Component, computed, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatrixStudyFrame } from '../shared/matrix-study-frame';
import { MatrixStudyDefinition, studySource } from '../shared/matrix-study-definition';
import { StudyCheck } from '../shared/study-checks';
import { StudyHistory } from '../shared/study-history';
import { StudyStepViewer } from '../shared/study-step-viewer';
import { StudyWalkthrough } from '../shared/study-walkthrough';
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
  imports: [MatrixStudyFrame, StudyStepViewer, StudyWalkthrough, TranslocoPipe],
  templateUrl: './jogo-lab.html',
})
export class JogoLab {
  readonly study: MatrixStudyDefinition = {
    id: 'jogo',
    topics: ['conditions', 'composition', 'extension'],
    investigations: ['invalid', 'tie', 'newRule', 'cost'],
  };
  readonly sources = GAME_SOURCES;
  readonly lessons = ['play', 'rules', 'extend'] as const;
  readonly lessonIndex = signal(0);
  readonly variants: readonly GameVariant[] = ['conditions', 'rulesClassic', 'rulesExtended'];
  readonly scenarios = ['tie', 'win', 'lose', 'invalid'] as const;
  readonly variant = signal<GameVariant>('conditions');
  // Strings são entradas de formulário. Somente o domínio pode aceitá-las como Move.
  readonly player = signal('rock');
  readonly opponent = signal('scissors');
  readonly moves = computed(() =>
    this.variant() === 'rulesExtended' ? EXTENDED_MOVES : CLASSIC_MOVES,
  );
  readonly validPlayer = computed(() => this.moves().some((move) => move === this.player()));
  readonly checks = signal<readonly StudyCheck[]>([]);
  readonly history = new StudyHistory(playGameSteps('rock', 'scissors', 'conditions')[0]);
  readonly lessonComplete = computed(() => this.history.state().result !== null);
  readonly stepSource = computed(() => {
    const rule = this.history.state().inspectedRule;
    const section =
      this.variant() === 'conditions'
        ? 'classic-function'
        : rule === 'tie'
          ? 'rule-contract'
          : rule === 'dominance'
            ? 'dominance-rule'
            : 'composed-game';
    return studySource(this.sources, section);
  });

  // A comparação clássica aceita exatamente as mesmas entradas nos dois desenhos.
  readonly comparison = computed(() => ({
    conditions: playClassic(this.player(), this.opponent()),
    rules: playGameSteps(this.player(), this.opponent(), 'rulesClassic').at(-1)!.state.result,
  }));

  /** Cada etapa troca a estratégia; a pessoa segue controlando os dois gestos. */
  changeLesson(index: number): void {
    if (!Number.isInteger(index) || !this.lessons[index]) return;
    this.lessonIndex.set(index);
    this.changeVariant(this.variants[index]);
  }

  choosePlayer(move: string): void {
    this.player.set(move);
    this.restart();
  }

  chooseOpponent(move: string): void {
    this.opponent.set(move);
    this.restart();
  }

  changeVariant(variant: GameVariant): void {
    // set substitui o valor guardado; readonly na propriedade não proíbe essa operação.
    this.variant.set(variant);
    this.player.set('rock');
    this.opponent.set('scissors');
    this.restart();
  }

  /** O clique já revela o primeiro passo; regras compostas continuam sob controle manual. */
  play(): void {
    this.history.replace(playGameSteps(this.player(), this.opponent(), this.variant()));
    this.history.next();
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
