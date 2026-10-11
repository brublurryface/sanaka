/**
 * Coordena eventos do inventário com Signals; os algoritmos vivem em obolo-inventory.ts.
 * Não recebe serviços de Posts: este é um laboratório em memória, não uma oferta real.
 */
// computed deriva a visualização; signal guarda entradas e mensagens do formulário.
import { Component, computed, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatrixStudyFrame } from '../shared/matrix-study-frame';
import { MatrixStudyDefinition, studySource } from '../shared/matrix-study-definition';
import { StudyCheck } from '../shared/study-checks';
import { StudyHistory } from '../shared/study-history';
import { StudyStepViewer } from '../shared/study-step-viewer';
import { StudyWalkthrough } from '../shared/study-walkthrough';
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
  imports: [MatrixStudyFrame, StudyStepViewer, StudyWalkthrough, TranslocoPipe],
  templateUrl: './obolos-lab.html',
})
export class ObolosLab {
  readonly study: MatrixStudyDefinition = {
    id: 'obolos',
    desktopImage: '/images/matrix/obolos/obolos-atmosphere-desktop.webp',
    topics: ['collections', 'search', 'complexity'],
    investigations: ['empty', 'repeated', 'failure', 'newRule'],
  };
  readonly sources = OBOLO_SOURCES;
  readonly lessons = ['read', 'edit', 'search', 'count'] as const;
  readonly lessonIndex = signal(0);
  readonly algorithm = signal<'traverse' | 'nested' | 'set' | null>(null);
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
  readonly lessonComplete = computed(() => {
    const event = this.history.current().explanationKey;
    switch (this.lessonIndex()) {
      case 0:
        return event.endsWith('.lookup') || event.endsWith('.missing');
      case 1:
        return event.endsWith('.add') || event.endsWith('.remove');
      case 2:
        return (
          (this.algorithm() === 'set' || this.algorithm() === 'nested') &&
          !this.history.canGoForward()
        );
      default:
        return event.endsWith('.count');
    }
  });
  readonly stepSource = computed(() => {
    const event = this.history.current().explanationKey.split('.').at(-1);
    const section =
      event === 'add' || event === 'remove'
        ? 'edit-array'
        : event === 'count'
          ? 'map-count'
          : this.algorithm() === 'nested'
            ? 'nested-loops'
            : this.algorithm() === 'set'
              ? 'set-search'
              : this.algorithm() === 'traverse'
                ? 'traversal'
                : 'read-index';
    return studySource(this.sources, section);
  });

  /** Mantém a caixa entre etapas, mas limpa o percurso que já terminou. */
  changeLesson(index: number): void {
    if (!Number.isInteger(index) || !this.lessons[index]) return;
    this.lessonIndex.set(index);
    this.history.replace([traversalSteps(this.items())[0]]);
    this.algorithm.set(null);
    this.messageKey.set('');
  }

  selectIndex(index: number): void {
    this.requestedIndex.set(index);
    if (this.lessonIndex() === 0) this.lookup();
  }

  /** A consulta só é registrada quando a pessoa age, não enquanto digita. */
  lookup(): void {
    const identifier = this.requestedItem();
    this.history.record({
      state: {
        ...inventoryState(this.items()),
        activeIndex: identifier ? this.requestedIndex() : null,
      },
      explanationKey: `matrix.studies.obolos.events.${identifier ? 'lookup' : 'missing'}`,
      parameters: { index: String(this.requestedIndex()), identifier: identifier ?? 'undefined' },
    });
  }

  count(): void {
    this.history.record({
      state: inventoryState(this.items()),
      explanationKey: 'matrix.studies.obolos.events.count',
      parameters: { names: this.quantities().length, total: this.items().length },
    });
  }

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
    this.algorithm.set(null);
  }

  /** Revela a primeira inspeção já no clique; os passos seguintes continuam manuais. */
  execute(kind: 'traverse' | 'nested' | 'set'): void {
    const steps =
      kind === 'traverse'
        ? traversalSteps(this.items())
        : kind === 'nested'
          ? nestedDuplicateSteps(this.items())
          : setDuplicateSteps(this.items());
    this.history.replace(steps);
    this.algorithm.set(kind);
    this.history.next();
    this.messageKey.set('');
  }

  runChecks(): void {
    this.checks.set(runOboloChecks());
  }
}
