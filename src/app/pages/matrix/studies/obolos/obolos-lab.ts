/**
 * Coordena eventos do inventário com Signals; os algoritmos vivem em obolo-inventory.ts.
 * Não recebe serviços de Posts: este é um laboratório em memória, não uma oferta real.
 */
// computed deriva a visualização; signal guarda entradas e mensagens do formulário.
import { Component, computed, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatrixStudyFrame } from '../shared/matrix-study-frame';
import { MatrixStudyDefinition } from '../shared/matrix-study-definition';
import { StudyCheck } from '../shared/study-checks';
import { StudyHistory } from '../shared/study-history';
import { StudyStepViewer } from '../shared/study-step-viewer';
import { runOboloChecks } from './obolo-checks';
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
import { OBOLO_SOURCES } from './obolos-source.generated';

// Os cenários são determinísticos: voltar e reiniciar sempre permitem repetir o estudo.
const INITIAL_INVENTORY = ['maya', 'mors', 'akasha', 'mors', 'nandini', 'maya'];

@Component({
  selector: 'app-obolos-lab',
  host: { class: 'matrix-study-host' },
  imports: [MatrixStudyFrame, StudyStepViewer, TranslocoPipe],
  templateUrl: './obolos-lab.html',
})
export class ObolosLab {
  readonly study: MatrixStudyDefinition = {
    id: 'obolos',
    topics: ['collections', 'search', 'complexity'],
    investigations: ['empty', 'repeated', 'failure', 'newRule'],
  };
  readonly sources = OBOLO_SOURCES;
  readonly limit = INVENTORY_LIMIT;
  readonly scenarios = ['initial', 'empty', 'equal', 'unique'] as const;
  readonly history = new StudyHistory(traversalSteps(INITIAL_INVENTORY)[0]);
  readonly items = computed(() => this.history.state().items);
  readonly draft = signal('mors');
  readonly requestedIndex = signal(0);
  readonly messageKey = signal('');
  readonly checks = signal<readonly StudyCheck[]>([]);

  // Os dois relatórios são calculados pelas funções reais, não por fórmulas falsas no HTML.
  readonly nestedReport = computed(() => inventoryReport(nestedDuplicateSteps(this.items())));
  readonly setReport = computed(() => inventoryReport(setDuplicateSteps(this.items())));
  readonly quantities = computed(() => [...countObolos(this.items()).entries()]);
  readonly requestedItem = computed(() => readObolo(this.items(), this.requestedIndex()));

  /** this é a instância desta página; não é um estado global compartilhado com outras abas. */
  add(): void {
    const next = addObolo(this.items(), this.draft());
    if (next === this.items()) {
      this.messageKey.set(this.items().length >= this.limit ? 'limit' : 'emptyInput');
      return;
    }
    this.history.record({
      state: inventoryState(next),
      explanationKey: 'matrix.studies.obolos.events.add',
      parameters: { identifier: this.draft().trim() },
    });
    this.messageKey.set('');
  }

  remove(): void {
    const index = this.requestedIndex();
    const next = removeObolo(this.items(), index);
    if (next === this.items()) {
      this.messageKey.set('invalidIndex');
      return;
    }
    this.history.record({
      state: inventoryState(next),
      explanationKey: 'matrix.studies.obolos.events.remove',
      parameters: { index },
    });
    this.messageKey.set('');
  }

  /** [] é um cenário válido, não ausência do estado; a leitura retorna undefined. */
  scenario(kind: 'initial' | 'empty' | 'equal' | 'unique'): void {
    const items =
      kind === 'initial'
        ? INITIAL_INVENTORY
        : kind === 'empty'
          ? []
          : kind === 'equal'
            ? ['mors', 'mors', 'mors', 'mors']
            : ['maya', 'mors', 'akasha', 'nandini'];
    this.history.replace(traversalSteps(items).slice(0, 1));
    this.requestedIndex.set(0);
    this.messageKey.set('');
  }

  /** Gerar o percurso não pula os passos: eles continuam sob controle da pessoa. */
  execute(kind: 'traverse' | 'nested' | 'set'): void {
    const steps =
      kind === 'traverse'
        ? traversalSteps(this.items())
        : kind === 'nested'
          ? nestedDuplicateSteps(this.items())
          : setDuplicateSteps(this.items());
    this.history.replace(steps);
    this.messageKey.set('');
  }

  runChecks(): void {
    this.checks.set(runOboloChecks());
  }
}
